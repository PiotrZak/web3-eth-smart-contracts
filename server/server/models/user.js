/* eslint-disable */

'use strict';

var firebase = require('../common/firebase');
var app = require('../../server/server')
var crypto = require('crypto');
var contract = require('../services/contract');
var email = require('../services/email')
var moment = require('moment')
var base64url = require('base64url');
var config = require('../config');

module.exports = function (User, Session) {

  /**
   * add a user
   * @param {object} json with user data
   * @param {Function(Error, object)} callback
   */
  User.addUser = function (user, callback) {
    var Accesskey = app.models.Accesskey

    if(user.accesskey.length > 0) {
      addUser_create(user.accesskey)
    } else {
      User.findOne({where: {email: config.adminEmail}, include: ['role']}, (err, adminInst) => {
        if(err) {
          callback(err, { 'status': -1, 'message': "Internal error" });
          return;
        }

        Accesskey.addKeys({uid: adminInst.uid, user : adminInst}, 1, (err, obj) => {
          addUser_create(obj.key[0].key)
        })

      })
    }

    function addUser_create(accesskey) {
      Accesskey.findOne({ where: { key: accesskey, activated_date: null } }, (err, accesskey) => {
        if(err){
          callback(null, {status: -1, messasge: err.message})
          return
        }
        if (!accesskey) {
          callback(null, { status: -1, message: "Incorrect access key" })
          return
        }

        firebase.app.auth().createUserWithEmailAndPassword(user.email, user.password).then(data => {
          user.uid = data.user.uid;
          user.role_id = 2;
          user.accesskey_id = accesskey.id
          user.activation_code = base64url(crypto.randomBytes(32));
          user.account_type = 'INACTIVE'

          firebase.app.auth().currentUser.updateProfile({
            displayName: user.username
          })

          User.create(user, error => {
            if (error) {
              callback(error, { 'status': -1, 'message': 'Unable to create a user account' })
              return
            }
            Accesskey.updateAll({
              key: accesskey.key,
              activated_date: null
            }, {
                activated_date: new Date().toGMTString()
              }, (err, info) => {
                firebase.app.auth().signInWithEmailAndPassword(user.email, user.password).then(data => {
                  User.findOne({ include: ['role', 'accesskey'], where: { uid: data.user.uid } }, { include: ['role', 'accesskey'] }, (err, user) => {
                    if (!user) {
                      callback(null, { status: -1, message: 'Invalid user' });
                      return;
                    }
                    user = JSON.parse(JSON.stringify(user))

                    firebase.app.auth().currentUser.getIdToken(true).then(token => {
                      data = JSON.parse(JSON.stringify(data))
                      data.user.token = token
                      data.user.role = user.role_id || 2
                      data.user.id = user.id
                      data.user.accesskey = user.accesskey_id !== null ? user.accesskey.key : null
                      User.app.models.emailQueue.addEmail({
                        to: user.email,
                        bcc: config.adminEmail,
                        subject: "Account activation in Value",
                        text: "Account activation in Value"
                      }, {
                          user: user
                        }, 'activation')

                      callback(null, { 'status': 0, 'data': data });
                      return;
                    })

                  })
                }).catch(err => {
                  callback(err, { 'status': -1, 'message': err.message });
                  return;
                })
              })
          })
        }).catch(error => {
          callback(error, { 'status': -1, 'message': error.message });
        })
      })
    }
  };

  User.activateUser = function (activationCode, callback) {
    if (!activationCode || activationCode === '') {
      callback(null,{status: -1, message: "invalid activation code"});
      return;
    }

    User.findOne({where: {activation_code: activationCode}}, function (err, userFound) {
      if (!userFound) {
        callback(null,{status: -1, message: "user to activate not found"});
        return;
      }

      if (userFound.account_type !== 'INACTIVE' ) {
        callback(null, {status: 0, message: "user already activated"});
        return;
      }

      var updateUser = {};
      updateUser.account_type = 'ACTIVE';
      updateUser.activation_code = null;
      updateUser.email_verified = true;

      userFound.updateAttributes(updateUser, function (err, updatedUser) {
        if (err) {
          callback(err, {status: -1, message: err.message});
          return;
        }
        User.app.models.emailQueue.addEmail({
          to: updatedUser.email,
          bcc: config.adminEmail,
          subject: "Account registration in Value",
          text: "Account registration in Value"
        }, {
            user: updatedUser
          }, 'register')

        User.findOne({ where: { uid: userFound.accesskey.uid } }, (err, partner) => {
          if (!err) {
            User.app.models.emailQueue.addEmail({
              to: partner.email,
              bcc: config.adminEmail,
              subject: "You have a new VCO partner in Value",
              text: "You have a new VCO partner in Value"
            }, {
                referer: updateUser
              }, 'onRegisterPartnerInfo')
          } else {
            console.error("Find partner error: ", err)
          }
        })
        callback(null, {status: 0, message: "User activated."});
        return;
      });
    });
  };

  /**
   * Get all User data
   * @param {Function(Error, array)} callback
   */
  User.getAllUsers = function(options, filter = {}, callback) {
    if (['ADMIN', 'OPERATOR'].includes(options.user.role().code)) {
      filter.include = ['role', 'address', 'partners']
      User.find(filter, function(err, users) {
        if (err) {
          callback(err);
          return;
        }

        const promises = []

        users.forEach(user => {
          const promise = new Promise((resolve, reject) => {
            if(filter.tokensSubtree === 'true') {
              User.getTokensInSubtree(options, user.uid, (err, status) => {
                if (err) {
                  reject(err)
                  return
                }
                let u = user
                u.structureTokens = status.tokens || 0
                resolve(u)
              })
            } else {
              resolve(user)
            }
            // let u = user
            // u.structureTokens = 0
            // resolve(u)
          })
          promises.push(promise)
        })

        Promise.all(promises).then(res => {
          // console.log('return res: ', res)
          callback(null, res);
        }).catch(err => {
          console.error('error: ', err)
          callback(err)
        })

      });
    } else {
      callback(null, { status: -1, message: "Method restricted to admin." })
    }
  };

  /**
   * Get array of partners from user
   * @param {string} uid
   * @param {Function(Error, object)} callback
   */

  User.partnersOfUser = function (options, uid, tokensFromTree = false, callback) {

    var user_id = uid

    User.findOne({ where: { uid: user_id }, include: ['partners'] }, (err, user) => {
      if(!err && user) {

        Promise.all(user.partners().map(partner => new Promise((resolve, reject) => {
          if(partner.activator()) {
            let currentPartner = partner.activator().toJSON()
            currentPartner.partners = []
            currentPartner.structureTokens = 0

            if(tokensFromTree) {
              User.getTokensInSubtree(options, currentPartner.uid, (err, status) => {
                currentPartner.structureTokens = status.tokens

                User.partnersOfUser(options, currentPartner.uid, tokensFromTree, (err, childNode) => {
                  if(!err && childNode) {
                    currentPartner.partners = childNode
                  }
                  resolve(currentPartner)
                })
              })
            } else {
              User.partnersOfUser(options, currentPartner.uid, tokensFromTree, (err, childNode) => {
                if(!err && childNode) {
                  currentPartner.partners = childNode
                }
                resolve(currentPartner)
              })
            }


          } else {
            resolve(null)
          }
        })))
        .then(res => {
          callback(null, res.filter(r => r !== null))
        }).catch(err => {
          callback(null, [])
        })

      } else {
        callback(err, null)
      }
    })

  };

  /**
   * Get count of users in database
   * @param {Function(Error, object)} callback
   */

  User.count = function (filter, callback) {
    User.count(filter).then(totalCount => {
      callback(null, { success: true, count: totalCount })
    })
  };

  User.getProfile = function (options, callback) {
    User.findOne({ include: ['role', 'accesskey', 'address'], where: { uid: options.uid } }, (err, user) => {
      if (!user) {
        callback(null, { status: -1, message: "User not found" })
        return
      }

      if(user.account_type === 'BLOCKED') {
        callback(null, { status: -1, message: 'Accound blocked' })
        return
      }

      reasignWallet(user)

      var partnerwallet = user.accesskey().creator()
      if(partnerwallet) {
        if (user.wallet !== null && partnerwallet.wallet !== null && user.wallet !== partnerwallet.wallet && partnerwallet.role_id !== 1) {
          user.partnerwallet = partnerwallet.wallet
          callback(null, { status: 0, profile: user })
          return
        } else {
          callback(null, { status: 0, profile: user })
          return
        }
      } else {
        callback(null, {status: 0, profile: user})
        return
      }

      // User.findOne({ fields: ['wallet', 'role_id'], where: { uid: user.accesskey().uid } }, (err, partnerwallet) => {
      //   if (partnerwallet) {
      //     if (user.wallet !== null && partnerwallet.wallet !== null && user.wallet !== partnerwallet.wallet && partnerwallet.role_id !== 1) {
      //       user.partnerwallet = partnerwallet.wallet
      //       callback(null, { status: 0, profile: user })
      //     } else {
      //       callback(null, { status: 0, profile: user })
      //     }
      //   } else {
      //     callback(null, { status: 0, profile: user })
      //   }
      // })

      // callback(null, {status: 0, profile: user})
      return
    })
  }

  var usersHistoryReasign = []

  setInterval(() => {
    usersHistoryReasign = []
  }, 2*60*1000)

  function reasignWallet(userInst) {

    if(userInst.kyc_status === 'APPROVED' && userInst.wallet !== null) {


      contract.AllowedWallets(userInst.wallet).then(res => {
        if(!res) {

          let transactionString = userInst.uid
          let indexOfTransaction = usersHistoryReasign.indexOf(userInst.uid)
          if(indexOfTransaction >= 0) {
            console.log("Skip AllowedWallets for uid", userInst.uid)
            return
          }
          usersHistoryReasign.push(transactionString)

          contract.addAllowedWallet(userInst.wallet).then(res => {
            console.log('addAllowedWallet()', res)
          }).catch(err => {
            console.error('reasignWallet() -> addAllowedWallet()', err)
          })
        }
      }).catch(err => {
        console.error('reasignWallet() -> AllowedWallets()', err)
      })

      contract.PartnerWallet(userInst.wallet).then(partner => {
        if(partner === null || userInst.accesskey().creator().wallet === null) {
          return
        }
        if(partner.toUpperCase() !== userInst.accesskey().creator().wallet.toUpperCase()) {

          let transactionString = userInst.uid
          let indexOfTransaction = usersHistoryReasign.indexOf(userInst.uid)
          if(indexOfTransaction >= 0) {
            console.log("Skip PartnerWallet for uid", userInst.uid)
            return
          }
          usersHistoryReasign.push(transactionString)

          if (userInst.wallet !== userInst.accesskey().creator().wallet) { // Security against adding a partner with the same wallet
            // contract.addReferral(userInst, userInst.wallet, userInst.accesskey().creator().wallet, res => { console.log('assignWallet()', res) })
            contract.addInvestorPartner(userInst.wallet, userInst.accesskey().creator().wallet).then(res => {
              console.log('addInvestorPartner()', res)
            }).catch(err => {
              console.error('reasignWallet() -> addInvestorPartner()', err)
            })
          } else {
            console.info('assignWallet()', `User ${userInst.email} trying add this same wallet as his partner!`)
          }
        }
      })

      // if(contract.checkAllowedWallet(userInst.wallet) === false) {
      //   contract.authorizeETHAddress(userInst, userInst.wallet, res => {})
      // }

      // if(contract.checkPartnerWallet(userInst.wallet, userInst.accesskey().creator().wallet) === false) {
      //   if (userInst.accesskey().creator().wallet !== null && userInst.accesskey().creator().role_id !== 1) {// Check if wallet is not null and parent can not be admin
      //     if (userInst.wallet !== userInst.accesskey().creator().wallet) { // Security against adding a partner with the same wallet
      //       contract.addReferral(userInst, userInst.wallet, userInst.accesskey().creator().wallet, res => { console.log('assignWallet()', res) })
      //     } else {
      //       console.info('assignWallet()', `User ${userInst.email} trying add this same wallet as his partner!`)
      //     }
      //   }
      // }

    }
  }

  User.assignWallet = function (options, wallet, browser, callback) {

    User.app.models.Wallet.create({
      uid: options.uid,
      action: "ADD_WALLET",
      wallet: wallet,
      browser: browser + ";" + options.remoteAddress
    });

    User.findOne({ where: { uid: options.uid }, include: ['accesskey'] }, (err, user) => {
      if (!err) {

        // Update wallet
        user.updateAttributes({ wallet: wallet, modify_date: moment().format('YYYY-MM-DD HH:mm:ss') }, (err, inst) => {
          if(!err) {
            User.app.models.emailQueue.addEmail({
              to: inst.email,
              bcc: config.adminEmail,
              subject: "Wallet added in Value",
              text: "Wallet added in Value"
            }, {
              wallet: wallet,
              user: inst,
              datetime: moment(new Date()).format('DD.MM.YYYY HH:mm').toString()
            }, 'addWallet')
            callback(null, { status: 0, message: "Your wallet " + wallet + " was assigned to the account" })
          } else {
            callback(err)
            return
          }
        })
      } else {
        callback(err)
      }
    })

  }

  User.contact = function (options, message, callback) {
    User.findOne({ where: { uid: options.uid }, include: 'accesskey' }, (err, user) => {
      email.contact(user, message)
      callback(null, { status: 0 })
    })
  }

  User.unassignWallet = function (options, wallet, browser, callback) {
    User.app.models.Wallet.create({
      uid: options.uid,
      action: "REMOVE_WALLET",
      wallet: wallet,
      browser: browser + ";" + options.remoteAddress
    });

    User.findOne({ where: { uid: options.uid }, include: 'accesskey' }, (err, user) => {
      if (!user) {
        callback(err)
        return
      }

      User.app.models.emailQueue.addEmail({
        to: user.email,
        bcc: config.adminEmail,
        subject: "Wallet in Value has been removed",
        text: "Wallet in Value has been removed"
      }, {
          wallet: wallet,
          user: user,
          datetime: moment(new Date()).format('DD.MM.YYYY HH:mm').toString()
        }, 'removeWallet')

      callback(null, {status: 0, message: "Your wallett " + wallet + " was unpinned from the account"})

      // User.updateAll({uid: user.uid}, {wallet: null, modify_date: moment().format('YYYY-MM-DD HH:mm:ss')}).then(info => {
      //   contract.removeETHAddress(user, wallet, res => {
      //     email.removeWallet(user, wallet)
      //     // if(user.accesskey.uid !== null) {
      //     //   console.log(user.accesskey().uid)
      //     //   User.findOne({where: {uid: user.accesskey().uid}}, (err, user2) => {
      //     //     if(user2) {
      //     //       if(user2.wallet !== null)
      //     //         contract.removeReferral(user, wallet, res => {console.log(res)});
      //     //     }
      //     //   })
      //     // }
      //     callback(null, {status: 0, message: "Your wallett " + wallet + " was unpinned from the account"})
      //   });
      // }).catch(err => {
      //   callback(err)
      // })
    })
  }

  User.updateProfile = function (options, profile, callback) {
    // console.log(profile)
    // User.updateAll({uid: app.uid}, profile).then(info => {
    //   console.log(info)
    //   callback(null, {status: 0, message: "Profile updated"})
    // }).catch(err => {
    //   console.log(err)
    //   callback(err)
    // })

    // profile.modify_date = new Date().toGMTString()

    callback(null, {status: 1})
    return

    profile.modify_date = moment().format('YYYY-MM-DD HH:mm:ss')

    User.findOne({ where: { uid: options.uid } }, (err, user) => {
      if (err) {
        callback(err, { status: -1, message: "User not found" })
        return
      }

      let Address = app.models.Address

      if (user.address_id === null) {
        Address.create(profile, (err, obj) => {
          if (err) {
            callback(err, { status: -1, message: "Something went wrong" })
            return
          }
          profile.address_id = obj.id
          User.updateAll({ uid: app.uid }, profile, (err, info) => {
            if (err) {
              callback(err, { status: -1, message: 'Something went wrong' })
              return
            }
            callback(null, { status: 0, message: 'Settings have been saved' })
            return
          })
        })
      } else {
        Address.updateAll({ id: user.address_id }, profile, (err, info) => {
          if (err) {
            console.log('update address')
            console.log(err)
            callback(err, { status: -1, message: 'Something went wrong' })
            return
          }
          User.updateAll({ uid: app.uid }, profile, (err, info) => {
            if (err) {
              console.log(err)
              callback(err, { status: -1, message: 'Something went wrong' })
              return
            }
            callback(null, { status: 0, message: 'Settings have been saved' })
            return
          })
        })
      }
    })
  }

  /**
   * user login
   * @param {object} loginInputs json with user login inputs
   * @param {Function(Error, object)} callback
   */
  User.login = function (options, callback) {
    User.findOne({ where: { uid: options.uid }, include: ['role', 'accesskey'] }, (err, user) => {
      if (!user) {
        callback(null, { status: -1, message: 'Invalid user' });
      } else if (user.account_type === 'BLOCKED') {
        callback(null, { status: -1, message: 'Your account is disabled. Please contact Value company for details.' })
      } else if(user.account_type === 'INACTIVE'){
        callback(null, {status : -1, message : 'User not activated.'})
      } else {
        user = JSON.parse(JSON.stringify(user))
        callback(null, { 'status': 0, 'data': user });
      }
    })

    // User.findOne({include: ['role', 'accesskey'], where: {uid: User.app.uid}}, {include: ['role', 'accesskey']}, (err, user) =>{
    //   console.log(user)
    //   if(!user) {
    //     callback(null, {status: -1, message: 'Nieprawidłowy użytkownik'});
    //     return;
    //   }
    //   user = JSON.parse(JSON.stringify(user))
    //   callback(null, {'status': 0, 'data': user});
    // })
    // firebase.app.auth().signInWithEmailAndPassword(loginInputs.email, loginInputs.password).then(data => {
    //   User.findOne({include: ['role', 'accesskey'], where: {uid: data.user.uid}}, {include: ['role', 'accesskey']}, (err, user) =>{
    //     if(!user) {
    //       callback(null, {status: -1, message: 'Nieprawidłowy użytkownik'});
    //       return;
    //     }
    //     user = JSON.parse(JSON.stringify(user))
    //     var additionalClaims = {
    //       role: user.role_id
    //     }
    //     firebase.admin.auth().createCustomToken(data.user.uid, additionalClaims)
    //     .then(customToken => {
    //       data = JSON.parse(JSON.stringify(data))
    //       data.user.token = customToken
    //       data.user.role = user.role_id
    //       data.user.id = user.id
    //       data.user.accesskey = user.accesskey_id !== null ? user.accesskey.key : null
    //       callback(null, {'status': 0, 'data': data});
    //       return;
    //     })
    //   })
    // }).catch(err => {
    //   callback(err, {'status': -1, 'message': err.message});
    //   return;
    // })
  };

  User.loginFirebase = function (data, callback) {
    User.findOne({ include: ['role', 'accesskey'], where: { uid: data.credential.uid } }, { include: ['role', 'accesskey'] }, (err, user) => {
      if (!user) {
        if (!data.credential.key) {
          callback(null, { status: 4, data: data })
          return
        }

        var Accesskey = app.models.Accesskey

        if(data.credential.key.length > 0 && data.credential.key !== 'REGISTER_WITHOUT_KEY') {
          create_loginFirebase(data.credential.key)
        } else {
          User.findOne({where: {email: config.adminEmail}, include: ['role']}, (err, adminInst) => {
            if(err) {
              callback(err, { 'status': -1, 'message': "Internal error" });
              return;
            }

            Accesskey.addKeys({uid: adminInst.uid, user : adminInst}, 1, (err, obj) => {
              create_loginFirebase(obj.key[0].key)
            })

          })
        }

        function create_loginFirebase(akey) {
          Accesskey.updateAll({ key: akey, activated_date: null },
            { activated_date: new Date().toGMTString() }, (err, info) => {
              if (err) {
                cb(err)
                return
              }

              if (info.count === 0) {
                callback(null, {
                  status: -1,
                  message: 'The access key does not exist or has been used',
                  key: akey
                })
                return
              } else {

                Accesskey.findOne({ where: { key: akey } }, (err, key) => {
                  if (err) {
                    callback(err, { status: -1 })
                    return;
                  }
                  user = {}
                  user.uid = data.credential.uid
                  user.username = data.credential.displayName
                  user.email = data.credential.email
                  user.role_id = 2
                  user.accesskey_id = key.id
                  User.create(user)


                  user = JSON.parse(JSON.stringify(user))
                  data = JSON.parse(JSON.stringify(data))
                  data.credential.role = { id: user.role_id }
                  data.credential.id = user.id
                  data.credential.accesskey = user.accesskey !== undefined ? user.accesskey.key : akey

                  User.app.models.emailQueue.addEmail({
                    to: user.email,
                    bcc: config.adminEmail,
                    subject: "Account registration in Value",
                    text: "Account registration in Value"
                  }, {
                      user: user
                    }, 'register')

                  User.findOne({ where: { uid: key.uid } }, (err, partner) => {
                    if (!err) {
                      User.app.models.emailQueue.addEmail({
                        to: partner.email,
                        bcc: config.adminEmail,
                        subject: "You have a new VCO partner in Value",
                        text: "You have a new VCO partner in Value"
                      }, {
                          referer: user
                        }, 'onRegisterPartnerInfo')
                    } else {
                      console.error("Find partner error: ", err)
                      console.info("Uid to find: ", key.uid)
                    }
                  })

                  callback(null, { status: 0, data: data })
                })

              }
            })
        }

      } else {
        if(user.account_type === 'BLOCKED'){
          callback(null, {status: -1, message: 'Your account is disabled. Please contact Value company for details.'})
          return
        }else if(user.account_type === 'INACTIVE'){
          callback(null, {status : -1, message : 'User not activated.'})
          return
        }
        user = JSON.parse(JSON.stringify(user))
        data = JSON.parse(JSON.stringify(data))
        data.user = user
        data.credential.role = { id: user.role_id }
        data.credential.id = user.id
        data.credential.accesskey = user.accesskey !== undefined ? user.accesskey.key : null
        callback(null, { status: 0, data: data })
      }

    })
  }

  User.getTokensInSubtree = function (options, uid, callback) {

    var user_id = uid

    if (!['ADMIN', 'OPERATOR'].includes(options.user.role().code) && options.skip !== true) {
      user_id = options.user.uid
    }

    User.findOne({ where: { uid: user_id }, include: ['partners'] }, (error, userInst) => {
      if (error) {
        callback(error)
        return
      } else if (userInst) {
        if (userInst.partners()) {
          var tokensInGroup = 0
          Promise.all(userInst.partners().map((partner) => {
            return new Promise(resolve => {
              if (partner.activator()) {
                User.getTokensInSubtree({...options, ...{skip: true}}, partner.activator().uid, (error, result) => {
                  if (!error) {
                    resolve(parseFloat(partner.activator().bought_tokens) + parseFloat(result.tokens))
                  } else {
                    resolve(0)
                  }
                })
              } else {
                resolve(0)
              }
            })
          })).then(results => {
            if (results.length > 0) {
              tokensInGroup = results.reduce((acc, a) => {
                return acc + a
              })
            }
            callback(null, { status: 2, tokens: tokensInGroup })
          }).catch(error => {
            console.error(error)
            callback(null, { status: 2, tokens: 0 })
          })
        }
      } else {
        console.log('Not found user by uid: ', uid)
        callback(null, { status: 2, tokens: 0 })
        return
      }
    })

  }

  /**
   * Update datas fro KYC/AML verification
   * @param {object} dataset User params to update in database and create address if not exists
   * @param {Function(Error, object)} callback
   */

  User.UpdateKYCData = function (options, dataset, callback) {
    User.findOne({ where: { uid: options.uid }, include: ['address'] }, (err, userInst) => {
      if (err) {
        callback(err, { success: false, err: err })
        return
      }
      if(userInst !== null) {
        userInst.updateAttributes(dataset, (err, userUpdated) => {
          if (err) {
            callback(err, { success: false, err: err })
            return
          }
          if (userUpdated.address()) {
            userUpdated.address().updateAttributes(dataset, (err, addressInt) => {
              if (err) {
                callback(err, { success: false, err: err })
                return
              }
              callback(null, { success: true })
            })
          } else {
            User.app.models.address.create(dataset, (err, addressInt) => {
              if (err) {
                callback(err, { success: false, err: err })
                return
              }
              callback(null, { success: true })
              userUpdated.updateAttributes({ address_id: addressInt.id })
            })
          }
        })
      }
    })
  };

  User.acceptKYC = function (options, userId, callback) {
    if (['ADMIN', 'OPERATOR'].includes(options.user.role().code)) {
      User.findOne({ where: { id: userId } }, (err, userInst) => {
        if (err) {
          callback(err, { status: -1, message: err })
        } else if (userInst == null) {
          callback(null, { status: -1, message: "User not found." })
        } else {
          userInst.updateAttributes({ kyc_status: 'APPROVED' }, (err, updatedInst) => {
            if (err) {
              callback(err, { status: -1, message: err })
            } else {
              User.app.models.emailQueue.addEmail({
                to: userInst.email,
                bcc: config.adminEmail,
                subject: "Account verification in Value",
                text: "Account verification in Value"
              }, {
                  referer: userInst
                }, 'kycamlAccept')

              callback(null, { status: 0, message: "KYC/AML approved." })
            }
          })
        }
      })
    } else {
      callback(null, { status: -1, message: "Method restricted to admin." })
    }
  }

  User.denyKYC = function (options, userId, callback) {
    if (['ADMIN', 'OPERATOR'].includes(options.user.role().code)) {
      User.findOne({ where: { id: userId } }, (err, userInst) => {
        if (err) {
          callback(err, { status: -1, message: err })
        } else if (userInst == null) {
          callback(null, { status: -1, message: "User not found." })
        } else {
          userInst.updateAttributes({ kyc_status: 'DENY' }, (err, updatedInst) => {
            if (err) {
              callback(err, { status: -1, message: err })
            } else {
              User.app.models.emailQueue.addEmail({
                to: userInst.email,
                bcc: config.adminEmail,
                subject: "Account verification in Value",
                text: "Account verification in Value"
              }, {
                  referer: userInst
                }, 'kycamlReject')
              callback(null, { status: 0, message: "KYC/AML denied." })
            }
          })
        }
      })
    } else {
      callback(null, { status: -1, message: "Method restricted to admin." })
    }
  }

  /**
 * Get all required datas to verify user
 * @param {number} id
 * @param {Function(Error, object)} callback
 */

  User.getDatasToVerify = function (options, id, callback) {
    if(['ADMIN', 'OPERATOR'].includes(options.user.role().code)){
      User.findOne({ where: { id: id }, include: ['role', 'address', 'country_tax', 'files'] }, (err, user) => {
        if(err) {
          callback(err, {status: -1, message: err})
        } else if(!user) {
          callback(null, {status: -1, message: "User not found."})
        } else {
          callback(null, {status: 1, user: user})
        }
      });
    } else {
      callback(null, {status: -1, message: "Method restricted to admin."})
    }
  };
  User.clarifyKYC = function (options, data, callback) {
    if (['ADMIN', 'OPERATOR'].includes(options.user.role().code)) {
      User.findOne({ where: { id: data.user_id } }, (err, userInst) => {
        if (err) {
          callback(err, { status: -1, message: err })
        } else if (userInst == null) {
          callback(null, { status: -1, message: "User not found." })
        } else {
          userInst.updateAttributes({ kyc_status: 'PROCEEDED' }, (err, updatedInst) => {
            if (err) {
              callback(err, { status: -1, message: err })
            } else {
              User.app.models.emailQueue.addEmail({
                to: userInst.email,
                bcc: config.adminEmail,
                subject: data.subject,
                text: data.message
              }, data.message, null)
              callback(null, { status: 0, message: "KYC/AML clarification email sent." })
            }
          })
        }
      })
    } else {
      callback(null, { status: -1, message: "Method restricted to admin." })
    }
  }

  User.deleteMyAccount = function (options, callback) {
    User.destroyAll({ uid: options.uid }, (err, info) => {
      console.log(info)
      console.log(err)
      if (!err) {
        callback(null, { status: 0 })
        return
      }
      callback(err, { status: -1 });
      return
    })
  }

  function createSessionToken(user) {
    // create JWT session token
    const payload = {
      user_id: (user.user_id != null ? user.user_id : user.id),
      role_code: user.role_code,
    };
    var token = jwt.sign(payload, config.tokenSecret, { expiresIn: '8h' });
    return token;
  }

  /**
   * refresh session token
   * @param {object} loginInputs json with expiring session token
   * @param {Function(Error, object)} callback
   */
  User.refreshToken = function (loginInputs, callback) {
    User.findOne({ where: { uid: loginInputs.uid } }, (err, userInst) => {
      if(err){
        callback(err)
      }else if(!userInst){
        callback(null, {satus: -1, message : 'User not found.'})
      }else if(userInst.account_type === 'BLOCKED'){
        callback(null, {satus: -1, message : 'Your account is disabled. Please contact Value company for details.'})
      }else if(userInst.account_type === 'INACTIVE'){
        callback(null, {status : -1, message : 'User not activated.'})
      }else{
        firebase.admin.auth().createCustomToken(loginInputs.uid).then(token => {
          callback(null, { token: token })
          return
        }).catch(err => {
          callback(err, { status: -1, message: err.message })
          return
        })
      }
    })
  };

  /**
   * logout from the app
   * @param {object} logoutInputs json with user logout inputs
   * @param {Function(Error, object)} callback
   */
  User.logout = function (logoutInputs, callback) {
    // invalidate token
    console.log('logout, user_id=', logoutInputs.user_id);
    callback(null, { 'status': '0', 'message': 'logout ok' });
  };

  User.blockUser = function (options, userId, callback) {
    if (!['ADMIN', 'OPERATOR'].includes(options.user.role().code)) {
      callback(null, { status: -1, message: "Method restricted to admin." })
    } else {
      User.findOne({ where: { id: userId } }, (err, userInst) => {
        if (err) {
          callback(err, { status: -1, message: err.message })
        } else {
          userInst.updateAttributes({ account_type: 'BLOCKED' }, (err, updatedInst) => {
            if (err) {
              callback(err, { status: -1, message: err.message })
            } else {
              callback(null, { status: 0, message: 'User blocked.' })
            }
          })
        }
      })
    }
  }

  User.unblockUser = function (options, userId, callback) {
    if (!['ADMIN', 'OPERATOR'].includes(options.user.role().code)) {
      callback(null, { status: -1, message: "Method restricted to admin." })
    } else {
      User.findOne({ where: { id: userId } }, (err, userInst) => {
        if (err) {
          callback(err, { status: -1, message: err.message })
        } else {
          userInst.updateAttributes({ account_type: 'ACTIVE' }, (err, updatedInst) => {
            if (err) {
              callback(err, { status: -1, message: err.message })
            } else {
              callback(null, { status: 0, message: 'User unblocked.' })
            }
          })
        }
      })
    }
  }


  /**
   * Get user details (address, transactionHistory, walletsHistory) by uid
   * @param {string} uid User id from firebase
   * @param {Function(Error, object)} callback
   */

  User.getUserDetails = function (options, uid, callback) {
    var status = {status: 1};

    var user_id = uid;

    if (!['ADMIN', 'OPERATOR'].includes(options.user.role().code)) {
      user_id = options.uid
    }

    User.findOne({ where: { uid: user_id }, include: ['accesskey', 'role', 'address', 'transactions'] }, (err, user) => {
      if(err) {
        callback(err)
        return
      } else if(user) {
        User.getTokensInSubtree(options, user.uid, (err, res) => {
          if(err) {
            callback(err)
            return
          } else {
            user.structureTokens = res.tokens
            status.user = user
            callback(null, status)
          }
        })

      } else {
        status.status = -1
        status.message = "Not found user"
        callback(null, status)
      }
    })

  };

  /**
   * Get top investors by bought tokens
   * @param {number} count Count of investors
   * @param {Function(Error, array)} callback
   */

  User.getTopInvestors = function (count, callback) {
    User.find({fields: ['wallet', 'bought_tokens'], limit: count || 5, order: 'bought_tokens DESC'}, (err, investors) => {
      if(err) {
        return callback(err)
      }
      callback(null, investors);
    })

  };

};
