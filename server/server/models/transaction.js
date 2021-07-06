'use strict';

var config = require('../config')
var Web3 = require('web3')
var moment = require('moment')
var coinfirm = require('../services/coinfirm')
var contract = require('../services/contract')
var etherscan = require('etherscan-api').init(config.etherscan.apiToken, config.etherscan.testnet);
var request = require('request')

var transactionsWaiting = []

module.exports = function (Transaction) {

  /**
   * Check all pending transactions and summarize all tokens based on transaction to investor and partner if transaction success
   * @param {Function(Error)} callback
   */

  Transaction.checkPending = function (callback) {
    var counter = 0
    var errors = 0
    var web3 = new Web3(new Web3.providers.HttpProvider(config.blockchain.host))

    Transaction.find({ where: { status: "PENDING" }, include: { user: 'accesskey' }, order: 'id ASC', limit: 1 }, (err, transactions) => {
      if (err) {
        console.error(err)
        return
      }

      transactions.forEach(transaction => {
        web3.eth.getTransactionReceipt(transaction.tx_hash).then(receipt => {

          if(receipt) {
            console.log(`Check tx ${transaction.tx_hash} status:`, receipt.status)

            if(receipt.status === false) {
              transaction.updateAttributes({ status: "ERROR", modified: moment().format('YYYY-MM-DD HH:mm:ss') })
              return
            }

            var emailHtmlPattern = '%' + transaction.tx_hash + '%';

            var txDatas = {
              bought_tokens: null, // tokens
              wallet_bonus_tokens: false, // address || false
              bonus_tokens: null, // tokens
            }

            if(transaction.user().id !== 1) {
              receipt.logs.forEach(log => {
                if(log.topics[0] === '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef' && log.topics[2].toUpperCase() === ('0x000000000000000000000000' + receipt.from.substring(2, receipt.from.length)).toUpperCase()) {
                  // bought tokens
                  txDatas.bought_tokens = parseInt(log.data, 16) / Math.pow(10, 8)
                } else if(log.topics[0] === '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef' && log.topics[2].toUpperCase() != ('0x000000000000000000000000' + config.blockchain.contractAddr.substring(2, config.blockchain.contractAddr.length)).toUpperCase()) {
                  // partner wallet
                  txDatas.bonus_tokens = parseInt(log.data, 16) / Math.pow(10, 8)
                  txDatas.wallet_bonus_tokens = '0x' + log.topics[2].substring(26, log.topics[2].length)
                }
              })

              if(txDatas.bought_tokens !== null) {
                transaction.user().updateAttributes({
                  bought_tokens: parseFloat(transaction.user().bought_tokens) + txDatas.bought_tokens,
                  modify_date: moment().format('YYYY-MM-DD HH:mm:ss')
                }, err => {
                  if(!err) {
                    transaction.updateAttributes({ status: "SUCCESS", tokens_count: txDatas.bought_tokens, modified: moment().format('YYYY-MM-DD HH:mm:ss') })
                    Transaction.app.models.emailQueue.findOne({ where: { status: "NEEDED_ACTION", template: "transactionConfirm", html: { like: emailHtmlPattern } } }, (err, email) => {
                      if (email) {
                        email.updateAttributes({ status: "PENDING" })
                      }
                    })
                    console.log(`User ${transaction.user().username} <${transaction.user().email}> bought ${txDatas.bought_tokens}`)
                  }
                  if(!err && txDatas.wallet_bonus_tokens !== false) {
                    Transaction.app.models.accesskey.findOne({where: {id: transaction.user().accesskey_id}}, (err, accesskey) => {
                      if(err) return console.error('Update partner tokens error: ', err)

                      if(accesskey && accesskey.creator()) {
                        accesskey.creator().updateAttributes({
                          bonus_tokens: parseFloat(accesskey.creator().bonus_tokens) + txDatas.bonus_tokens,
                          modify_date: moment().format('YYYY-MM-DD HH:mm:ss')
                        }, err => {
                          if(!err) {
                            Transaction.app.models.emailQueue.findOne({ where: { status: "NEEDED_ACTION", template: "transactionToPartner", html: { like: emailHtmlPattern } } }, (err, email) => {
                              if (email) {
                                email.updateAttributes({ status: "PENDING" })
                              }
                            })
                            console.log(`Partner ${accesskey.creator().username} <${accesskey.creator().email}> receive bonus tokens ${txDatas.bonus_tokens}`)
                          }
                        })
                      } else {
                        console.error('Not found accesskey for user_id ', transaction.user().accesskey_id)
                      }
                    })
                  }
                })
              }

            } else {
              Transaction.app.models.user.findOne({where: {wallet: receipt.from}}, (err, user) => {
                if(err) return console.error('Find partner error: ', err)
                if(user) {
                  transaction.updateAttributes({
                    user_id: user.id
                  })
                  console.log('Updated user')
                } else {
                  console.log("Not found user with wallet ", receipt.from)
                  transaction.updateAttributes({
                    status: "NOT_FOUND_USER"
                  })
                }
              })
            }

          } else {
            const txIndex = transactionsWaiting.findIndex(t => t.hash === transaction.tx_hash)
            if (txIndex < 0) {
              transactionsWaiting.push({
                hash: transaction.tx_hash,
                count: 1
              })
            } else {
              transactionsWaiting[txIndex].count = transactionsWaiting[txIndex].count + 1
            }

            if (txIndex >= 0 && transactionsWaiting[txIndex].count > 50) {
              transaction.updateAttributes({ status: "DROPPED_AND_REPLACED", modified: moment().format('YYYY-MM-DD HH:mm:ss') })
              transactionsWaiting.splice(txIndex, 1)
            }
          }
        }).catch(error => {

          const txIndex = transactionsWaiting.findIndex(t => t.hash === transaction.tx_hash)
          if (txIndex < 0) {
            transactionsWaiting.push({
              hash: transaction.tx_hash,
              count: 1
            })
          } else {
            transactionsWaiting[txIndex].count = transactionsWaiting[txIndex].count + 1
          }

          if (txIndex >= 0 && transactionsWaiting[txIndex].count > 10) {
            console.error('checkPending()', error)
            errors++
            transaction.updateAttributes({ status: "ERROR", modified: moment().format('YYYY-MM-DD HH:mm:ss') })
            transactionsWaiting.splice(txIndex, 1)
          }

          // transaction.updateAttributes({ status: "ERROR", modified: moment().format('YYYY-MM-DD HH:mm:ss') })
          return
        })

      })
      // console.log(`${counter} success and ${errors} errors of ${counter + errors} transactions.`)
      callback(counter);
    })
  };

  /**
   * Get transactions
   * @param {object} filter
   * @param {Function(Error, object)} callback
   */

  Transaction.getTransactions = function (options, filter = {}, callback) {

    if (!['ADMIN', 'OPERATOR'].includes(options.user.role().code)) {
      filter.where = {...filter.where || {}, ...{user_id: options.user.id}} // tx only owner
    }

      Transaction.find(filter, (err, transactions) => {
        if (err) {
          callback(err)
          return
        }

        Transaction.count(filter.where || {}, (err, count) => {
          if (err) {
            callback(err)
            return
          }

          callback(null, { status: 1, transactions: transactions, count: count });
        })
      })
    // }
  };

  Transaction.canBuyTokens = function (options, callback) {
    var uid = options.uid

    Transaction.app.models.User.findOne({ where: { uid: uid }, include: ['accesskey'] }, (err, userInst) => {
      var current = userInst.wallet
      var partner = userInst.accesskey().creator().wallet
      if (err) {
        callback(err)
      } else if (!userInst) {
        callback(null, { status: -1, message: "User not found." })
      } else {
        // var report = JSON.parse(userInst.report)

        if(userInst.wallet == null){
          callback(null, {status: 0, canBuyTokens : false})
        }else if(userInst.kyc_status !== 'APPROVED'){
          callback(null, {status: 0, canBuyTokens : false})
        }else {
          callback(null, {status: 0, canBuyTokens : true})
        }

        // if(userInst.wallet == null){
        //   callback(null, {status: 0, canBuyTokens : false})
        // }else if(userInst.kyc_status !== 'APPROVED'){
        //   callback(null, {status: 0, canBuyTokens : false})
        // }else if (report !== null && report.address == userInst.wallet) {
        //   if(report.cscore >= config.coinfirm.minValidScore){
        //     callback(null, {status: 0, canBuyTokens : true})
        //   }else{
        //     callback(null, {status: 0, canBuyTokens : false})
        //   }
        // } else {
        //   coinfirm.login((err, res) => {
        //     if (err) {
        //       callback(err)
        //     } else {
        //       coinfirm.getBasicReport(uid, userInst.wallet, (err, report) => {
        //         userInst.updateAttributes({ report: JSON.stringify(report) }, (err, updatedUser) => {
        //           if (err) {
        //             callback(err)
        //           }else{
        //             if(report.cscore >= config.coinfirm.minValidScore){
        //               contract.authorizeETHAddress(userInst, current, result => {
        //                 if(partner !== null && userInst.accesskey().creator().role_id !== 1) {
        //                   contract.addReferral(userInst.accesskey().creator(), current, partner, res => {
        //                     callback(null, {status: 0, canBuyTokens : true})
        //                   })
        //                 } else {
        //                   callback(null, {status: 0, canBuyTokens : true})
        //                 }
        //               })
        //             }else{
        //               callback(null, {status: 0, canBuyTokens : false})
        //             }
        //           }
        //         })
        //       })
        //     }
        //   })
        // }


      }
    })

  }

  /**
   * Check if tokens balance on user wallet is this same as in database
   * @param {Function(Error, object)} callback
   */

  Transaction.checkUsersBalance = function (options, callback) {
    var status = { success: true, raport: [] };

    if (['ADMIN', 'OPERATOR'].includes(options.user.role().code)) {

      Transaction.app.models.user.find({}, (error, users) => {
        if (error) return callback(error)
        Promise.all(users.map(user => {
          return new Promise(resolve => {
            if (user.wallet !== null && user.wallet !== undefined) {
              contract.TokenBalance(user.wallet).then(balance => {
                // console.log(`${user.wallet}: ${balance / Math.pow(10, 8)}`)
                const b = balance / Math.pow(10, 8)
                const userBalance = parseFloat(user.bought_tokens) + parseFloat(user.bonus_tokens)
                // console.log(b, userBalance)
                if(userBalance !== b) {
                  resolve(`User ${user.id} ${user.username} <${user.email}> with wallet ${user.wallet} tokens from db: ${userBalance} (${parseFloat(user.bought_tokens)} and bonus ${parseFloat(user.bonus_tokens)}) and tokens from wallet: ${b} Difference db to wallet: ${userBalance - b}`)

                } else {
                  resolve(null)
                }
              }).catch(err => {
                console.error(err)
                resolve(null)
              })
            } else {
              resolve(null)
            }
          })
        })).then(res => {
          status.raport = res.reduce((acc, result) => {
            if(result !== null)
              acc.push(result)
            return acc
          }, [])
          callback(null, status);
        })
      })

    } else { return callback(null, { status: -1, message: "Method restricted to admin." }) }
    // callback(null, status);

  };

  var web3 = new Web3(new Web3.providers.HttpProvider(config.blockchain.host))

  /**
   *
   * @param {object} options
   * @param {number} user_id
   * @param {Function(Error, object)} callback
   */

  Transaction.checkWalletOfUser = function (options, user_id, callback) {
    var status = { success: true };

    if (['ADMIN', 'OPERATOR'].includes(options.user.role().code)) {

      Transaction.app.models.user.findOne({where: {id: user_id}}, (err, user) => {
        if(!err && user) {

          etherscan.account.txlist(user.wallet, 0, 99999999, 'latest', 'asc').then(txs => {
            // console.log('txs', txs.result)

            Promise.all(txs.result.map(tx => {
              return new Promise(resolveTx => {
                if (tx.to.toUpperCase() === config.blockchain.contractAddr.toUpperCase()) {
                  getTokenCount(tx.hash).then(tokensCount => {
                    resolveTx(tokensCount)
                  }).catch(err => {
                    resolveTx(0)
                    console.log(err)
                  })
                } else {
                  resolveTx(0)
                }
              })
            })).then(r => {
              const buyTokens = r.reduce((acc, el) => acc + el)
              const userBalance = parseFloat(user.bought_tokens) + parseFloat(user.bonus_tokens)
              // status.data = `User ${user.username} <${user.email}> with wallet ${user.wallet} tokens from db: ${userBalance} (${parseFloat(user.bought_tokens)} and bonus ${parseFloat(user.bonus_tokens)}) and tokens from wallet: ${b} Difference db to wallet: ${userBalance - b} || BOUGHT_TOKENS_FROM WALLET: ${buyTokens}`
              status.data = `User ${user.username} <${user.email}> with wallet ${user.wallet} tokens from db: ${userBalance} (${parseFloat(user.bought_tokens)} and bonus ${parseFloat(user.bonus_tokens)}) and bought tokens from wallet ${buyTokens}`
              callback(null, status)
            })

          }).catch(err => {
            status.success = false
            status.message = err
            callback(null, status)
            console.error(err)
          })

        } else if(!err && !user) {
          status.success = false
          status.message = 'Not found user'
          return callback(null, status)
        }
      })

    } else {return callback(null, { success: false, message: "Method restricted to admin." })}

    // return callback(null, status);
  };

  function checkWallet(user) {
    return new Promise((resolve, reject) => {
      etherscan.account.txlist(user.wallet, 0, 99999999, 'latest', 'asc').then(txs => {
        // console.log('txs', txs.result)

        Promise.all(txs.result.map(tx => {
          return new Promise(resolveTx => {
            if (tx.to.toUpperCase() === config.blockchain.contractAddr.toUpperCase()) {
              getTokenCount(tx.hash).then(tokensCount => {
                resolveTx(tokensCount)
              }).catch(err => {
                resolveTx(0)
                console.log(err)
              })
            } else {
              resolveTx(0)
            }
          })
        })).then(r => {
          const buyTokens = r.reduce((acc, el) => acc + el)
          resolve(`User ${user.username} <${user.email}> with wallet ${user.wallet} tokens from db: ${userBalance} (${parseFloat(user.bought_tokens)} and bonus ${parseFloat(user.bonus_tokens)}) and tokens from wallet: ${b} Difference db to wallet: ${userBalance - b} || BOUGHT_TOKENS_FROM WALLET: ${buyTokens}`)
        })

      }).catch(err => {
        resolve(null)
        console.error(err)
      })
    })
  }

  function getTokenCount(txHash) {
    return new Promise((resolve, reject) => {
      web3.eth.getTransactionReceipt(txHash).then(res => {
        if (res) {
          const from = res.from
          res.logs.forEach(log => {
            if (log.topics[0] === '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef' && log.topics[2] === '0x000000000000000000000000' + from.substring(2, from.length)) {
              let tokens = parseInt(log.data, 16) / Math.pow(10, 8)
              resolve(tokens)
            }
          })
        } else {
          console.log('return null status', txHash, res)
          resolve(0)
        }
      }).catch(err => {
        reject(err)
      })
    })
  }

  /**
   *
   * @param {number} startBlock Start block number
   * @param {number} endBlock End block number
   * @param {Function(Error, any)} callback
   */

  Transaction.boughtTokensBlockNumbers = function (startBlock, endBlock, callback) {
    var resString = `uid|email|usernam|addres|documentType|documentNumbe|wallet|boughtToken|bonusToken|otherBonusTokens|\r\n`;
    var sumOfTxs = 0;
    var sumEthOfTxs = 0;
    var users = []
    function addToUser(address, boughtTokens = 0, bonusTokens = 0, allBonusTokens = 0) {
      let finded = users.findIndex(el => el.wallet.toUpperCase() === address.toUpperCase())
      if(finded === -1) {
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

    console.log(startBlock, endBlock);

    // Get contract transactions
      etherscan.account.txlist(config.blockchain.contractAddr, startBlock, endBlock, 'asc').then(txs => {
      Promise.all(txs.result.map(tx => {
        return new Promise(resolve => {
          // Calculate transactions where eth are sended to contract
          if (tx.to.toUpperCase() === config.blockchain.contractAddr.toUpperCase() && tx.txreceipt_status === '1' && parseFloat(tx.value) > 0) {

            sumOfTxs++;
            sumEthOfTxs += parseFloat(tx.value);
            web3.eth.getTransactionReceipt(tx.hash).then(async receipt => {
              if(receipt) {
                // Get tokens transfter from logs
                getTokensFromLogs(tx.from, receipt.logs).then(r => {
                  addToUser(tx.from, r.bought_tokens, 0)
                  if(r.wallet_bonus_tokens !== undefined) {
                    addToUser(r.wallet_bonus_tokens, 0, r.bonus_tokens)
                  }
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
            getAllTokensByUser(user.wallet, startBlock, endBlock).then(res => {
              addToUser(user.wallet, 0, 0, res)
              // res.forEach(userTx => {
              //   if(userTx.wallet_bonus_tokens !== undefined && userTx.bonus_tokens !== undefined)
              //     addToUser(userTx.wallet_bonus_tokens, 0, 0, userTx.bonus_tokens)
              // })

              // find user with asiggned wallet address
              Transaction.app.models.User.findOne({where: {wallet: user.wallet}, include: ['address']}, (err, userInst) => {
                if(err) {
                  resolve({...user, ...{userData: null}})
                } else if(userInst) {
                  resolve({...user, ...{userData: userInst.toObject()}})
                } else {
                  // if not found user and  seach in wallet addresss table
                  Transaction.app.models.Wallet.findOne({where: {
                    wallet: user.wallet
                  }}, (err, walletInst) => {
                    if(!err && walletInst) {
                      Transaction.app.models.User.findOne({where: {uid: walletInst.uid}, include: ['address']}, (err, userInst) => {
                        if(err) {
                          resolve({...user, ...{userData: null}})
                        } else if(userInst) {
                          resolve({...user, ...{userData: userInst.toObject()}})
                        }
                      })
                    } else {
                      resolve({...user, ...{userData: null}})
                    }
                  })
                }
              })
            }).catch(err => {
              console.log(err)
            })
          })
          // end promise

        })).then(usersList => {

          function getAddress(u) {
            if(u.userData && u.userData.address_id) {
              var address = u.userData.address
              return `${address.street} ${address.building_no} ${address.apartment_no ? `/${address.apartment_no}` : ''} ${address.postcode} ${address.city} ${address.country_id ? address.country.name : ''}`
            } else return 'null'
          }

          usersList.forEach(u => {
            resString += `${u.userData ? u.userData.uid : 'null'}|${u.userData ? u.userData.email : 'null'}|${u.userData ? u.userData.username : 'null'}|${getAddress(u)}|${u.userData ? u.userData.document_type : 'null'}|${u.userData ? u.userData.document_number : 'null'}|${u.wallet}|${u.boughtTokens}|${u.bonusTokens}|${(u.allBonusTokens - u.boughtTokens - u.bonusTokens).toFixed(8)}|\r\n`;
          })
          // console.log(resString)
          console.log(`sumOfTxs: ${sumOfTxs}\r\nsumETHOfTxs: ${parseFloat(sumEthOfTxs)}`)
          callback(null, resString)
        })
      })
    }).catch(err => {
      // console.log(err)
      console.log('Error request')
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

  function getAllTokensByUser(wallet, startBlock, endBlock) {

    return new Promise(resolve => {
      setTimeout(() => {
      request({
        method: 'GET',
        url: `http://api.etherscan.io/api?module=account&action=tokentx&address=${wallet}&startblock=${startBlock}&endblock=${endBlock}&sort=asc&apikey=${config.etherscan.apiToken}`,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
      }, function(error, response, body) {
        try {
          var txs = JSON.parse(body)
          Promise.all(txs.result.map(tx => {
            return new Promise(resolveLoop => {
              if(tx.contractAddress.toUpperCase() === config.blockchain.tokenAddr.toUpperCase()) {
                if(tx.from.toUpperCase() === wallet.toUpperCase()) {
                  resolveLoop(parseFloat((tx.value / Math.pow(10, 8)) * -1))
                } else {
                  resolveLoop(parseFloat(tx.value / Math.pow(10, 8)))
                }
              }
              else
                resolveLoop(0)
            })
          })).then(tokens => {
            resolve(tokens.reduce((acc, el, index, array) => {
              return acc + el
            }, 0))
          })
        } catch(error) {
          // console.log(error)
          setTimeout(() => {getAllTokensByUser(wallet,startBlock,endBlock).then(resolve)}, 250)
          // resolve(0)
        }
      })
      }, 500)// end timeout
    })
  }

};

