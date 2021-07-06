'use strict';
var httpResponse = require('../common/httpResponse');
var ENUMS = require('../common/enums');

var emailService = require('../services/email');
var contract = require('../services/contract');
var app = require('../server')
var config = require('../config')
var Web3 = require('web3');

module.exports = function(Payment) {

  Payment.beforeRemote('getPayment', function(ctx, instance, next) {
    if (!ctx.args.filter) {
      ctx.args.filter = {};
    }

    // limit
    if (ctx.args.filter.limit) {
      var filterLimit = parseInt(ctx.args.filter.limit);
      ctx.args.filter.limit = (filterLimit > 0 && filterLimit < 100) ? filterLimit : 100;
    } else {
      ctx.args.filter.limit = 100;
    }

    // skip
    if (ctx.args.filter.skip) {
      var filterSkip = parseInt(ctx.args.filter.skip);
      ctx.args.filter.skip = (filterSkip > 0) ? filterSkip : 0;
    } else {
      ctx.args.filter.skip = 0;
    }

    next();
  });

  /**
   * Gets list to payment
   *
   * @param filter
   * @param cb
   */
  Payment.getPayment = function(filter, cb) {
    console.log('Invoked endpoint - payment/list filter: ', filter);

    Payment.app.models.Profile.find({
      include: 'user',
      skip: filter.skip,
      limit: filter.limit,
      order: 'modify_date ASC',
      where: {
        payment_status: {inq: [ENUMS.PAYMENT_STATUS.WAITING,ENUMS.PAYMENT_STATUS.IN_PROGRESS]},
        flow_status: ENUMS.FLOW_STATUS.FIAT.PAYMENT_WAITING
      }
    }, function(error, models) {
      if (error) {
        console.error('Error: ', error);
        cb('Can not get list to payment');
        return;
      }

      // count total
      Payment.app.models.Profile.count({
          payment_status: {inq: [ENUMS.PAYMENT_STATUS.WAITING,ENUMS.PAYMENT_STATUS.IN_PROGRESS]},
          flow_status: ENUMS.FLOW_STATUS.FIAT.PAYMENT_WAITING
      }, function(error, count) {
        var items = [];
        models.forEach(function(entry) {
          items.push({
            uid: entry.user().uid,
            username: entry.user().username,
            email: entry.user().email,
            payment_status: entry.payment_status
          });
        });

        var result = {
          items: items,
          meta: {
            skip: filter.skip,
            limit: filter.limit,
            total: count
          }
        };

        cb(null, result);
      });
    });
  };

  /**
   * Gets details to payment
   * in response WHEN THE SECOND time requesting send additional info that has already status IN_PROGRESS but not block.
   *
   * @param uid
   * @param cb
   */
  Payment.getPaymentDetails = function(uid, cb) {

    Payment.app.models.User.getUserAndProfileByUID(uid, function(err, user) {
      if (err) {
        cb(httpResponse.badRequest('User not found'));
        return;
      }

      var response = getPaymentDetailsResponse(user, user.profile());
      // change payment status to IN_PROGRESS
      if (user.profile().payment_status === ENUMS.PAYMENT_STATUS.WAITING) {
        Payment.app.models.Profile.updatePaymentStatus(ENUMS.PAYMENT_STATUS.IN_PROGRESS, user.profile(), function (err, updatedProfile) {
          if (err) {
            cb(err);
            return;
          }
          cb(null, response);
        });
      } else {
        cb(null, response);
      }
    });
  };

  function getPaymentDetailsResponse(user, profile) {
    return {
      uid: user.uid,
      username: user.username,
      email: user.email,
      amount: profile.amount,
      currency: profile.currency,
      address: user.__data.address.__data,
      profile_type: profile.profile_type,
      payment_status: profile.payment_status
    };
  }

  Payment.getEthUsdRate = function(cb) {
    // bitstamp.getETHUSDPrice((err, price) => {
    //   if(!err) {
    //     contract.setEthUsdRate(Math.round(price), (err, data) => {
    //       cb(null, price);
    //     })
    //   }
    // })
    cb(null, app.EthUsdRate)
    return;
  }

  Payment.transactionInfo = function(options, info, cb) {
    Payment.app.models.User.findOne({ where: { uid: options.uid }, include: 'accesskey' }, (err, user) => {
      var transaction = {
        user_id: user.id,
        tx_hash: info.hash,
        tokens_count: parseFloat(info.vdo),
        price: parseFloat(info.value),
        ethusd_rate: parseFloat(info.ethusd),
      }

      Payment.app.models.Transaction.create(transaction, (err, transaction) => {
        if(err) {
          console.error('Create transaction ERROR: ', err.detail)
          return
        }
        console.log(`Transaction ${transaction.tx_hash} created.`)

        Payment.app.models.emailQueue.addEmail({
          to: user.email,
          bcc: config.adminEmail,
          subject: "Value tokens purchase",
          text: "Value tokens purchase"
        }, {
          transaction: info
        }, 'transactionConfirm', "NEEDED_ACTION")

        Payment.app.models.User.findOne({ where: { uid: user.accesskey.uid } }, (err, partner) => {
          if (!err) {

            if(partner.email === config.adminEmail) 
              return

            Payment.app.models.emailQueue.addEmail({
              to: partner.email,
              bcc: config.adminEmail,
              subject: "Value tokens purchase",
              text: "Value tokens purchase"
            }, {
              transaction: info,
              referer: user
            }, 'transactionToPartner', "NEEDED_ACTION")
            
          } else {
            console.error("Error finding partner user: ", err)
          }
        })
      })
      
    })
    // Payment.app.models.User.findOne({where: {uid: app.uid}, include: 'accesskey'}, (err, user) => {
    //   if(!err) {
    //     console.log("User data: ", user)
    //     console.log("bt", typeof(user.bought_tokens))
    //     console.log('vdo', typeof(info.vdo))
    //     Payment.app.models.User.updateAll({uid: user.uid}, {bought_tokens: (parseFloat(user.bought_tokens) + parseFloat(info.vdo))}).then(res => {
    //       console.log("Added tokens to database for user")
    //       console.log(res)
    //       emailService.transactionConfirm(user, {...info});
    //     }).catch(err => {
    //       console.error("ERROR: ", err)
    //     })

    //     Payment.app.models.User.findOne({where: {uid: user.accesskey.uid}}, (err, partner) => {
    //       if(!err) {
    //         emailService.transactionToPartner(partner, user, info)
    //       } else {
    //         console.error("Error finding partner user: ", err)
    //       }
    //     })

    //     checkAndSaveTransactionStatus(user, info)
    //     return cb(null)
    //   }
    //   console.error(err)
    //   return cb(err)
    // })
  }

  /**
   * Received
   *
   * @param uid
   * @param cb
   */
  Payment.received = function(uid, cb) {
    console.log('Invoked endpoint - payment approve uid: ', uid);

    Payment.app.models.User.findOne({
      include: 'profile',
      where: {
        uid: uid,
      },
    }, function(err, user) {
      if (err) {
        console.error('Error: ', err);
        cb('User not found');
        return;
      }

      // user not found
      if (!user) {
        console.error('User not found for given uid: %s', uid);
        cb('User not found');
        return;
      }

      // profile not found
      if (!user.profile()) {
        console.error('Profile does not exist for given user uid: %s', uid);
        cb('User not found');
        return;
      }

      // action not allowed - incorrect Payment status
      if (user.profile().payment_status !== ENUMS.PAYMENT_STATUS.IN_PROGRESS) {
        console.error('Profile has wrong PAYMENT status: %s', user.profile().payment_status);
        cb(httpResponse.badRequest('Payment can not be approved'));
        return;
      }

      // action not allowed - incorrect flow status
      if (user.profile().flow_status !== ENUMS.FLOW_STATUS.FIAT.PAYMENT_WAITING) {
        console.error('Profile has wrong flow status: %s', user.profile().flow_status);
        cb(httpResponse.badRequest('Payment can not be approved'));
        return;
      }

      fiatFlow.fifthStepFIAT(true, user, function(err, result) {
        if (err) {
          cb({'error': 'error'});
          return;
        }
        cb(null, {'message': 'payment status updated'});
      });

    });
  };

  function checkAndSaveTransactionStatus(user, data) {
    setTimeout(checkTransactionStatus, config.blockchain.checkTransactionAfter, user, data);
  }
  
  function checkTransactionStatus(user, data) {
    isNaN(data.count) ? data.count = 0 : data.count++;
    // console.log(data)
    // console.log('tx: ' + data.hash);
    var web3 = new Web3(new Web3.providers.HttpProvider(config.blockchain.host));
    var receipt = web3.eth.getTransactionReceipt(data.hash);
  
    // console.log('receipt: ');
    // console.log(receipt);
  
    // Payment.app.models.User.updateAll({uid: user.uid}, {bought_tokens: (user.bought_tokens + data.vdo)}).then(info => {
    //   console.log("Added tokens to database for user")
    // }).catch(err => {
    //   console.error("ERROR: ", err)
    // })
  
    if (!receipt) {
      if (data.count > config.blockchain.checkTransactionRetryNo) {
      } else {
        checkAndSaveTransactionStatus(user, data);
      }
    } else {
      console.log('receipt: ', receipt)
    }
  }
};

