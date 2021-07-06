var config = require('../config');
var etherscan = require('etherscan-api').init(config.etherscan.apiToken, config.etherscan.testnet);
var app = require('../server')
var Web3 = require('web3')
var contract = require('./contract');

const blocksPerDay = 5760 + 5 // +5 to make sure that we process all the last 24h transactions

function checkContractTransactions(startBlock = null) {
  if(startBlock !== null) {
    etherscan.account.txlist(config.blockchain.contractAddr, startBlock, 'latest', 'asc').then(res => {
      checkTransactionsExists(res.result)
    }).catch(console.error)
  } else {
    etherscan.proxy.eth_blockNumber().then(blockNr => {
      var lastBlock = parseInt(blockNr.result, 16)
      return etherscan.account.txlist(config.blockchain.contractAddr, lastBlock - blocksPerDay, 'latest', 'asc')
    }).then(res => checkTransactionsExists(res.result)).catch(console.error)
  }

}

var lastBlock = 0
var tokensFromContract = 0
var web3 = new Web3(new Web3.providers.HttpProvider(config.blockchain.host))

module.exports.checkContractTransactions = checkContractTransactions

function checkTransactionsExists(txList) {
  console.log('num of tx: ', txList.length)
  var numOfTx = txList.length
  var tokensWithCountsMoreThanOne = 0
  txList.forEach(tx => {

    lastBlock = tx.blockNumber
    // console.log(tx.hash, tx.value)

    if (tx.from !== config.blockchain.wallet && parseFloat(tx.value) > 0) { // check if transaction is not from api wallet
      tokensWithCountsMoreThanOne += 1
      app.models.Transaction.findOne({ where: { tx_hash: tx.hash } }, (err, txInst) => {
        if (err) {
          console.error(err)
        } else if (!txInst) {
          var transaction = {
            user_id: 1,
            status: 'PENDING',
            tx_hash: tx.hash,
            price: tx.value / Math.pow(10, 18),
            ethusd_rate: 0,
            created: new Date(tx.timeStamp * 1000)
          }

          getTokenCount(tx.hash).then(tokenCount => {
            transaction.tokens_count = tokenCount

            contract.currentOffer().then(currentOffer => {
              contract.Offers(currentOffer).then(offer => {
                transaction.ethusd_rate = (transaction.tokens_count * offer.offerTokenFiatValue / transaction.price).toFixed(2);
                console.log('Transaction to create: ', transaction);
                app.models.Transaction.create(transaction, (err, inst) => {
                  if (err) {
                    console.error(err);
                  } else {
                    console.log('checkTransactionsExists()', 'Created transaction for hash ', inst.tx_hash, ' with id: ', inst.id);
                  }
                })
              })
            })

          }).catch(err => {
            console.error(err)
          })
        } else {
          var txtemp = {
            price: tx.value / Math.pow(10, 18),
          }

          getTokenCount(tx.hash).then(tokenCount => {
            tokensFromContract += tokenCount
            // console.log('Tx tokens:', tokensFromContract)
            txtemp.tokens_count = tokenCount
            if(parseFloat(txInst.tokens_count) !== txtemp.tokens_count || parseFloat(txInst.price) !== txtemp.price) {
              // console.log('checkTransactionsExists() -> updateAttributes()', 'from', {tokens_count: txInst.tokens_count, price: txInst.price}, 'to', txtemp)

              // txInst.updateAttributes(tx, err => {
              //   if(err) {
              //     console.error('checkTransactionsExists()', err)
              //   } else {
              //     console.log('checkTransactionsExists() -> updateAttributes()', 'from', {tokens_count: txInst.tokens_count, price: txInst.price}, 'to', txtemp)
              //   }
              // })
            }
          }).catch(err => {
            console.error(err)
          })
        }
      })
    }
  })

  console.log('Tx checked:', tokensWithCountsMoreThanOne)

  if(numOfTx > 1 && lastBlock !== txList[txList.length-1].blockNumber) {
    checkContractTransactions(txList[txList.length-1].blockNumber)
  }
}

function getTokenCount(txHash){
  return new Promise((resolve, reject) => {
    web3.eth.getTransactionReceipt(txHash).then(res => {
      if(res) {
        const from = res.from
        res.logs.forEach(log => {
          if(log.topics[0] === '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef' && log.topics[2] === '0x000000000000000000000000' + from.substring(2, from.length)){
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