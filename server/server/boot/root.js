'use strict';

var config = require('../config');
var contract = require('../services/contract-old');
var checkTransactions = require('../services/checkTransactions')
var cron = require('node-cron')

module.exports = function(server) {
  // Install a `/` route that returns server status
  var router = server.loopback.Router();

  server.use(function(req, res, next) {
  	console.log("-------------------------");
  	console.log("%s %s", req.method, req.url);
  	console.log("Query:", req.query);
    if(JSON.stringify(req.body).length <= 1000) {
      console.log("Body:", req.body);
    }
  	console.log(" ");
    console.log("-------------------------");
    next();
  });

  router.get('/', server.loopback.status());
  server.use(router);


  cron.schedule('*/1 * * * *', () => {
    server.models.emailQueue.sendMails()
  })

  // contract.updateRatesOnContract();
  cron.schedule('0 */1 * * *', () => {
    contract.updateRatesOnContract()
  })

  // contract.checkBlockNumber()
  cron.schedule('0 9 * * *', () => {
    contract.checkBlockNumber()
  })

  checkTransactions.checkContractTransactions(0)
  cron.schedule('0 0 * * *', () => {
    checkTransactions.checkContractTransactions()
  })

  // setInterval(contract.updateRatesOnContract, config.blockchain.updateRatesInContractEvery, function() {});

  var checkPending = () => {
    server.models.transaction.checkPending(count => {
      // console.log(`Updated ${count} transactions.`)
    })
  }

  // setTimeout(checkPending, 60 * 1000)
  cron.schedule('*/15 * * * * *', () => {
    checkPending()
  })


  // run this jobs only for master instance
  if (config.master) {
    // check in interval profiles that eht on wallet has changed
    // setInterval(contract.checkContractAddressTransactions, config.blockchain.checkContractAddressEvery, config.blockchain.checkContractAddressFromBlock);
    // once on boot after time
    // setTimeout(contract.checkContractAddressTransactions, config.blockchain.checkContractAddressAfterBoot, config.blockchain.checkContractAddressFromBlock);

    // send rates to contract by intervals
    // setInterval(contract.updateRatesOnContract, config.blockchain.updateRatesInContractEvery, function() {});
    // once on boot after time
    // setTimeout(contract.updateRatesOnContract, config.blockchain.updateRatesInContractAfterBoot, function() {});
  }
};

