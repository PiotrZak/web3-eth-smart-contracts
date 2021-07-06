'use strict';

var app = require('../server');
var ENUMS = require('../common/enums');
var config = require('../config');
var bitstamp = require('./bitstamp');
var ethereumRemote = require('./ethereum-remote');
var etherscan = require('etherscan-api').init(config.etherscan.apiToken, config.etherscan.testnet);
var Web3 = require('web3');
var server = require('../server')
var request = require('request')
var web3Contract = require('./contract')

// load the contract's ABI, e.g. from the build artifact
//var contractBuildArtifact = require('./ValueERC2xxToken.json'); // TODO: Contract 
var contractBuildArtifact = require('./ValueStoContract.json');
var contractABI = contractBuildArtifact.abi;

/**
 * Request contract to send amount krowns to eth address
 * @param user
 * @param amountKRS
 * @param addressETH
 * @param cb (err, result { txHash: 'hash' })
 */
var requestForKrowns = function requestForKrowns(user, amountKRS, addressETH, cb) {
  console.log('Requesting for krowns for uid: ' + user.uid + '...');

  sendTransaction('sendKrs', [addressETH, amountKRS], function(err, result) {
    if (err) {
      console.log('Request for krowns ERROR for uid: ' + user.uid);
      // saveBlockchainError(user, err);
      cb(err, null);
      return;
    }

    console.log('Request for krowns SUCCESS for uid: ' + user.uid);

    checkAndSaveTransactionStatus(user, result);

    cb(null, result);
  });
};

var addReferral = function(user, referred, referrer, cb) {
  console.log('Requesting addInvestorPartner for uid: ' + user.uid + '...');

  sendTransaction('addInvestorPartner', [referred,referrer], function(err, result) {
    if (err) {
      console.log('Request addInvestorPartner ERROR for uid: ' + user.uid);
      // saveBlockchainError(user, err);
      cb(err, null);
      return;
    }

    console.log('Request addInvestorPartner SUCCESS for uid: ' + user.uid);

    result.eth_balance_in_status = ENUMS.ETH_BALANCE_IN_STATUS.WAITING;
    checkAndSaveTransactionStatus(user, result);

    cb(null, result);
  });
};

var removeReferral = function(user, referred, cb) {
  console.log('Requesting removeInvestorPartner for uid: ' + user.uid + '...');

  sendTransaction('removeInvestorPartner', [referred], function(err, result) {
    if (err) {
      console.log('Request removeInvestorPartner ERROR for uid: ' + user.uid);
      // saveBlockchainError(user, err);
      cb(err, null);
      return;
    }

    console.log('Request removeInvestorPartner SUCCESS for uid: ' + user.uid);

    result.eth_balance_in_status = ENUMS.ETH_BALANCE_IN_STATUS.WAITING;
    checkAndSaveTransactionStatus(user, result);

    cb(null, result);
  });
};

var authorizeETHAddress = function(user, addressToAdd, cb) {
  console.log('Requesting authorize ETH address for uid: ' + user.uid + '...');

  sendTransaction('addAllowedWallet', [addressToAdd], function(err, result) {
    if (err) {
      console.log('Request authorize ETH address ERROR for uid: ' + user.uid);
      // saveBlockchainError(user, err);
      cb(err, null);
      return;
    }

    console.log('Request authorize ETH address SUCCESS for uid: ' + user.uid);

    result.eth_balance_in_status = ENUMS.ETH_BALANCE_IN_STATUS.WAITING;
    checkAndSaveTransactionStatus(user, result);

    cb(null, result);
  });
};

var removeETHAddress = function authorizeETHAddress(user, addressToRemove, cb) {
  console.log('Requesting remove authorized ETH address for uid: ' + user.uid + '...');

  sendTransaction('removeAllowedWallet', [addressToRemove], function(err, result) {
    if (err) {
      console.log('Request remove authorized ETH address ERROR for uid: ' + user.uid);
      // saveBlockchainError(user, err);
      cb(err, null);
      return;
    }

    console.log('Request remove authorized ETH address SUCCESS for uid: ' + user.uid);

    checkAndSaveTransactionStatus(user, result);

    cb(null, result);
  });
};

var setEthEurRate = function(ethEur, cb) {
  sendTransaction('setEthEurRate', [ethEur], cb);
};

var setEthUsdRate = function(ethUsd, cb) {
  sendTransaction('setEthUsdRate', [ethUsd], cb);
};

var setKrsUsdRate = function(krsUsd, cb) {
  krsUsd = krsUsd * 100;// contract does't have decimals
  sendTransaction('setKrsUsdRate', [krsUsd], cb);
};

var setAllRates = function(ethEur, ethUsd, krsUsd, cb) {
  krsUsd = krsUsd * 100;// contract does't have decimals
  console.log([ethEur, ethUsd, krsUsd])
  sendTransaction('setAllRates', [ethEur, ethUsd, krsUsd], cb);
};

var updateRatesOnContract = function(cb) {
  console.info('Updating contract rates...');

  // etherscan.stats.ethprice().then(res => {
  //   var ethusd = Math.round(res.result.ethusd * 100)

  //   sendTransaction('setEthUsdRate', [ethusd], (err, result) => {
  //     if (err) {
  //       console.error('Could not update contract rates', err)
  //       return
  //     }
  //     console.info('contract rates update tx hash: ', result.txHash);
  //     return
  //   })
  // })

  // TODO: zapis do kontraktu
  request.get('https://api.bitfinex.com/v1/pubticker/etheur', (error, response, body) => {
    var etheur = 0
    if(error){
      console.error('Could not update contract rates', error)
      return
    }
    etheur = Math.round(JSON.parse(body).last_price * 100)
    console.log(etheur)
    web3Contract.setEthFiatRate(JSON.parse(body).last_price).then(tx => {
      console.log("TRANSACTION:", tx)
      console.log("UPDATE ETH FIAT RATE TO: ", JSON.parse(body).last_price)
    }).catch(err => {
      console.error(err.code)
      console.info(err.txObject)
    })
    // sendTransaction('setEthFiatRate', [etheur], (err, result) => {
    //   if(err){
    //     console.log('Could not update contract rates', err)
    //     return
    //   }
    //   console.info('contract rates update tx hash: ', result.txHash)
    //   return
    // })
  })

};

var getContractAddressTransactions = function(fromBlock, cb) {
  console.info('Get contract address transactions...');
  getETHAddressTransactions(config.blockchain.contractAddr, fromBlock, cb);
};

var checkContractAddressTransactions = function(fromBlock) {
  try {
    console.info('checkContractAddressTransactions ...');
    var Profile = app.models.Profile;
    Profile.getETHProfilesToCheck(function(err, profiles) {

      if (profiles && profiles.length > 0) {
        getContractAddressTransactions(fromBlock, function(err, result) {
          if (result && result.status === '1') {
            var txlist = result.result;

            profiles.forEach(function(profile) {
              var found = txlist.filter(function(o) {
                if (o.from === profile.addr_send_eth && o.value !== '0') return o;
              });
              if (found.length > 0) {
                getETHAddressTransactions(profile.addr_send_eth, fromBlock, function(err, result) {
                  Profile.saveEthTransactions(result, profile, function(err, result) {
                    if (err) {
                      console.error('saveEthTransactions ERROR', err);
                    }
                  });
                });
              }
            });
          }
        });
      }
    });
  } catch (err) {
    console.error(err);
  }
};

const GetTransactions = (address, fromBlock = 0) => new Promise((resolve, reject) => {
  etherscan.account.txlist(address, fromBlock, 'latest', 'asc').then(res => resolve(res.result)).catch(err => {
    resolve([])
    console.error('Get contract address transactions ERROR', err)
  })
})

const checkPartnerWallet = (investorWallet, partnerWallet) => {
  const web3 = new Web3(new Web3.providers.HttpProvider(config.blockchain.host))
  var contractInst = web3.eth.contract(contractABI).at(config.blockchain.contractAddr)

  var res = contractInst.PartnerWallet(investorWallet)
  return res === partnerWallet
}

const checkAllowedWallet = (investorWallet) => {
  const web3 = new Web3(new Web3.providers.HttpProvider(config.blockchain.host))
  var contractInst = web3.eth.contract(contractABI).at(config.blockchain.contractAddr)

  var res = contractInst.AllowedWallets(investorWallet)
  return res
}

var wallets = []
var SoldTokens = 0
var BonusTokens = 0

const AddToWallet = (wallet, tokens = 0, bonus = 0) => {
  var walletIndex = wallets.findIndex(element => element.address === wallet)
  if(walletIndex < 0) {
    wallets.push({address: wallet, tokens: 0, bonus: 0})
    walletIndex = wallets.length-1
  }

  wallets[walletIndex].tokens += parseFloat(tokens)
  wallets[walletIndex].bonus += parseFloat(bonus)

  SoldTokens += tokens
  BonusTokens += bonus

  // console.log(`Updated wallet ${wallets[walletIndex].address} to ${tokens} tokens and ${bonus} bonus tokens. Sum of tokens: ${wallets[walletIndex].tokens}`)
}

var firstBlock = 0
var lastBlock = 0
var numOfTx = null

const checkBlockNumber = () => {
  web3Contract.currentOffer().then(currentOffer => {
    web3Contract.Offers(currentOffer).then(offer => {
      if(offer.offerClosed === false) {
        web3Contract.web3().eth.getBlockNumber().then(blockNumber => {
          const blockToEnd = offer.offerEndBlock - blockNumber
          console.log("Blocks to end current offer:", blockToEnd)
          if(blockToEnd < 0) {
            app.models.emailQueue.addEmail({
              to: config.adminEmail,
              subject: "[UWAGA] Blok ETH został przekroczony",
              text: "[UWAGA] Blok ETH został przekroczony"
            }, "Aktualny blok ETH przekroczył blok końcowy oferty. Proszę przelać 1 wei jako owner kontraktu lub wywołać funkcję closeOfferManually()")
          } else if(blockToEnd < 20000) {
            app.models.emailQueue.addEmail({
              to: config.adminEmail,
              subject: "[UWAGA] Blok ETH dobiega końca",
              text: "[UWAGA] Blok ETH dobiega końca"
            }, `Do końca oferty pozostało ${blockToEnd} bloków.`)
          } 
        }).catch(error => {
          console.error('checkBlockNumber() -> getBlockNumber()', error)
        })
      }
    }).catch(error => {
      console.error('checkBlockNumber() -> Offers()', error)
    })
  }).catch(error => {
    console.error('checkBlockNumber()', error)
  })
}

module.exports.checkBlockNumber = checkBlockNumber;
module.exports.requestForKrowns = requestForKrowns;
module.exports.removeETHAddress = removeETHAddress;
module.exports.authorizeETHAddress = authorizeETHAddress;
module.exports.addReferral = addReferral;
module.exports.removeReferral = removeReferral;
module.exports.setEthEurRate = setEthEurRate;
module.exports.setEthUsdRate = setEthUsdRate;
module.exports.setKrsUsdRate = setKrsUsdRate;
module.exports.setAllRates = setAllRates;
module.exports.updateRatesOnContract = updateRatesOnContract;
module.exports.getContractAddressTransactions = getContractAddressTransactions;
module.exports.checkContractAddressTransactions = checkContractAddressTransactions;
module.exports.checkPartnerWallet = checkPartnerWallet;
module.exports.checkAllowedWallet = checkAllowedWallet;

function getETHAddressTransactions(address, fromBlock, cb) {
  etherscan.account
    .txlist(address, 1, 'latest', 'desc')
    .then(function(result) {
      console.info('Get contract address transactions SUCCESS');
      cb(null, result);
    })
    .catch(function(reason) {
      console.error('Get contract address transactions ERROR', reason);
      cb(reason);
    });
}

function saveBlockchainError(user, err) {
  console.error('blockchain error %s', err.message);
  var Profile = app.models.Profile;
  var profile = user.profile();
  Profile.saveContractTransactionData(
    {
      status: 'ERROR',
      data: {message: err.message},
    },
    profile,
    function(err, result) {
      if (err) {
        console.error('Save status for %s ERROR for uid: %s', err.message, user.uid);
      }
    }
  );
}

function checkAndSaveTransactionStatus(user, data) {
  // setTimeout(checkTransactionStatus, 2000, user, data);
}

function checkTransactionStatus(user, data) {
  isNaN(data.count) ? data.count = 0 : data.count++;

  var web3 = new Web3(new Web3.providers.HttpProvider(config.blockchain.host));
  var receipt = web3.eth.getTransactionReceipt(data.txHash);

  if (!receipt) {
    if (data.count > config.blockchain.checkTransactionRetryNo) {
      server.nonce -= 1;
    } else {
      checkAndSaveTransactionStatus(user, data);
    }
  } else {
    server.nonce -= 1;
    console.log('tx_hash: ', data.txHash)
    console.log('status: ', receipt.status)
  }
}

var transactionsHistory = []

setInterval(() => {
  transactionsHistory = []
}, 1*60*1000)

function sendTransaction(methodName, parameters, cb) {
  
  let transactionString = methodName+JSON.stringify(parameters)
  let indexOfTransaction = transactionsHistory.indexOf(transactionString)
  if(indexOfTransaction >= 0) {
    console.log("Skip method name $s", methodName)
    return
  }
  console.log('Requesting method name %s', methodName);
  transactionsHistory.push(transactionString)

  // switching beetwen mock and real
  var method = config.blockchain.connectToRealContract ? sendTransactionReal : sendTransactionMock;

  method(methodName, parameters, function(err, result) {
    if (err) {
      console.error('Request ' + methodName + ' ERROR', err);
      cb(err, null);
      return;
    }

    console.log('Request ' + methodName + ' SUCCESS');

    return cb(null, result);
  });
}

function sendTransactionMock(method, parameters, cb) {
  var params = getTransactionArgs(method, parameters);
  console.warn('resulting mocked blockchain contract transaction');
  console.warn('Executing %s with parameters: %s and transaction params %s', method, parameters, parameters);
  cb(null, {txHash: '0x515241c92b0d1e1dc9698db8990f5b05bc4aa79d9213309f959470d666f6f16f', config: params});
}

function sendTransactionReal(method, parameters, cb) {
  console.log('Executing %s with parameters: %s', method, parameters);

  ethereumRemote.sendTransaction(getTransactionArgs(method, parameters)).then(function(txHash) {
    // console.log(txHash);
    cb(null, {txHash: txHash});
  })
    .catch(function(err) {
      console.log(err);
      cb(err);
    });
}

function getTransactionArgs(methodName, args) {
  return {
    from: config.blockchain.wallet,
    privateKey: config.blockchain.privateKey,
    contractAddress: config.blockchain.contractAddr,
    abi: contractABI,
    functionName: methodName,
    functionArguments: args,
    provider: config.blockchain.host,
    gasLimit: config.blockchain.gasLimit,
    gasPrice: config.blockchain.gasPrice,
  };
}

function getCallArgs(methodName, args) {
  return {
    contractAddress: config.blockchain.contractAddr,
    abi: contractABI,
    functionName: methodName,
    functionArguments: args,
    provider: config.blockchain.host,
  };
}

