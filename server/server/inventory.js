'use strict';

// var config = require('./config.production.json')
var config = require('./config.local.json')
var etherscan = require('etherscan-api').init(config.etherscan.apiToken, config.etherscan.testnet);
var Web3 = require('web3');

var app = require('./server')

var _web3 = null;

function web3() {
  if (_web3 === null) {
    _web3 = new Web3(new Web3.providers.HttpProvider(config.blockchain.host));
  }
  return _web3
}


/**
 *
 * @param {number} startBlock Start block number
 * @param {number} endBlock End block number
 * @param {Function(Error, any)} callback
 */

function boughtTokensBlockNumbers(startBlock, endBlock, callback) {
  var resString = `uid|email|usernam|addres|documentType|documentNumbe|wallet|boughtToken|bonusToken|otherBonusTokens|\r\n`;

  var users = []
  function addToUser(address, boughtTokens = 0, bonusTokens = 0, allBonusTokens = 0) {
    let finded = users.findIndex(el => el.wallet === address)
    if (finded === -1) {
      let u = {
        wallet: address,
        boughtTokens: boughtTokens,
        bonusTokens: bonusTokens,
        allBonusTokens: allBonusTokens
      }
      users.push(u)
    } else {
      users[finded].boughtTokens += boughtTokens
      users[finded].bonusTokens += bonusTokens
      users[finded].allBonusTokens += allBonusTokens
    }
  }

  // Get contract transactions
  etherscan.account.txlist(config.blockchain.contractAddr, startBlock, endBlock, 'asc').then(txs => {
    Promise.all(txs.result.map(tx => {
      return new Promise(resolve => {
        // Calculate transactions where eth are sended to contract
        if (tx.to.toUpperCase() === config.blockchain.contractAddr.toUpperCase() && tx.txreceipt_status === '1' && parseFloat(tx.value) > 0) {
          web3().eth.getTransactionReceipt(tx.hash).then(async receipt => {
            if (receipt) {
              // Get tokens transfter from logs
              getTokensFromLogs(tx.from, receipt.logs).then(r => {
                addToUser(tx.from, r.bought_tokens, r.bonus_tokens)
                resolve(r)
              })
            }
          })
        } else {
          resolve(null)
        }
      })
    })).then(res => {
      Promise.all(users.map((user, index) => {

        return new Promise(resolve => {
          getBonusTokensByUser(user.wallet, startBlock, endBlock).then(res => {
            addToUser(user.wallet, 0, 0, res)
            // find user with asiggned wallet address
            app.models.User.findOne({ where: { wallet: user.wallet }, include: ['address'] }, (err, userInst) => {
              if (err) {
                resolve({ ...user, ...{ userData: null } })
              } else if (userInst) {
                resolve({ ...user, ...{ userData: userInst.toObject() } })
              } else {
                // if not found user and  seach in wallet addresss table
                app.models.Wallet.findOne({
                  where: {
                    wallet: user.wallet
                  }
                }, (err, walletInst) => {
                  if (!err && walletInst) {
                    app.models.User.findOne({ where: { uid: walletInst.uid }, include: ['address'] }, (err, userInst) => {
                      if (err) {
                        resolve({ ...user, ...{ userData: null } })
                      } else if (userInst) {
                        resolve({ ...user, ...{ userData: userInst.toObject() } })
                      }
                    })
                  } else {
                    resolve({ ...user, ...{ userData: null } })
                  }
                })
              }
            })
          })
        })
        // end promise

      })).then(usersList => {

        function getAddress(u) {
          if (u.userData && u.userData.address_id) {
            var address = u.userData.address
            return `${address.street} ${address.building_no} ${address.apartment_no ? `/${address.apartment_no}` : ''} ${address.postcode} ${address.city} ${address.country_id ? address.country.name : ''}`
          } else return 'null'
        }

        usersList.forEach(u => {
          resString += `${u.userData ? u.userData.uid : 'null'}|${u.userData ? u.userData.email : 'null'}|${u.userData ? u.userData.username : 'null'}|${getAddress(u)}|${u.userData ? u.userData.document_type : 'null'}|${u.userData ? u.userData.document_number : 'null'}|${u.wallet}|${u.boughtTokens}|${u.bonusTokens}|${u.allBonusTokens - u.bonusTokens}|\r\n`;
        })
        callback(null, resString)
      })
    })
  }).catch(err => {
    // console.log(err)
    callback(err);
  })

};

function getTokensFromLogs(from, logs) {
  var objDatas = {
    from: from,
  }

  return new Promise(res => {
    Promise.all(logs.map(log => {
      return new Promise(resolve => {
        if (log.topics[0] === '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef' && log.topics[2].toUpperCase() === ('0x000000000000000000000000' + from.substring(2, from.length)).toUpperCase()) {
          // bought tokens
          objDatas.bought_tokens = parseInt(log.data, 16) / Math.pow(10, 8)
          resolve(objDatas)
        } else if (log.topics[0] === '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef' && log.topics[2].toUpperCase() != ('0x000000000000000000000000' + config.blockchain.contractAddr.substring(2, config.blockchain.contractAddr.length)).toUpperCase()) {
          // partner wallet
          objDatas.bonus_tokens = parseInt(log.data, 16) / Math.pow(10, 8)
          objDatas.wallet_bonus_tokens = '0x' + log.topics[2].substring(26, log.topics[2].length)
          resolve(objDatas)
        }
        resolve(null)
      })
    })).then(obj => {
      res(objDatas)
    })
  })
}

function getBonusTokensByUser(wallet, startBlock, endBlock) {
  return new Promise(resolve => {

    etherscan.account.txlist(wallet, startBlock, endBlock, 'asc').then(txs => {
      Promise.all(txs.result.map(tx => {
        return new Promise(resTx => {
          web3().eth.getTransactionReceipt(tx.hash).then(receipt => {
            if (receipt) {
              // Get tokens transfter from logs
              getTokensFromLogs(tx.from, receipt.logs).then(r => {
                resTx(r)
              })
            }
          })
        })
      })).then(r => {
        resolve(r.reduce((acc, el, index, array) => {
          if (el.bonus_tokens !== undefined) {
            return acc + el.bonus_tokens
          } else {
            return acc
          }
        }, 0))
      })
    }).catch(err => {
      // console.log(err)
      resolve(0)
    })
  })
}


boughtTokensBlockNumbers(4340069, 4345275, str => {
  console.log(str)
})