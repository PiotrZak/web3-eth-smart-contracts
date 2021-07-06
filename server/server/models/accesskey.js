'use strict';

var app = require('../../server/server')

var email = require('../services/email')

module.exports = function(Accesskey) {

    Accesskey.addKeys = function(options, numOfKeys, cb) {

        if(options.user.role().code === 'ADMIN' || options.user.kyc_status === 'APPROVED') {
            var keys = [];
            for (let index = 0; index < numOfKeys; index++) {
                var key = Math.random().toString(36).substring(5, 11) + Math.random().toString(36).substring(14, 20)
                keys.push({key: key, uid: options.uid})
            }

            Accesskey.create(keys, err => {
                if(err) {
                    cb(err, {status: -1, message: err.message})
                } else {
                    cb(null, {
                        status: 0,
                        message: `Added ${keys.length} key${keys.length > 1 ? 's' : ''}.`,
                        key: keys
                    })
                }
            })
        } else {
            // not approved error
            cb(null, {status: -1, message: "Before generate keys you must be approved by KYC/AML process"})
        }
    }

    Accesskey.getMyKeys = function(options, cb) {
        var filter = {
            fields: ['key', 'mailed'],
            where: {
                'activated_date': null,
                'uid': options.uid
            },
            order: 'id ASC',
        }

        Accesskey.find(filter, (err, keys) => {
            if(err) {
                cb(err)
                return
            }

            cb(null, {status: 0, keys: keys})
            return
        })
    }

    Accesskey.getAvailableKeys = function(options, filter, cb) {
        if(!['ADMIN', 'OPERATOR'].includes(options.user.role().code)){
            cb(null, {status: -1, message: "Method restricted to admin."})
        }else{
            if(!filter){
                filter = {}
            }
            Accesskey.find(filter, (err, keys) => {
                if(err) {
                    cb(err)
                }else{
                    cb(null, {status: 0, keys: keys})
                }
            })
        }
    }

    /**
     * Get count of accesskey with filter
     * @param {object} filter
     * @param {Function(Error, object)} callback
     */

    Accesskey.count = function (filter = {}, callback) {
        // if(!['ADMIN', 'OPERATOR'].includes(Accesskey.app.user.role().code)){
        //     callback(err, {status: -1, message: "Method restricted to admin."})
        // }else{
            Accesskey.count(filter, (err, keys) => {
                if(err) {
                    cb(err)
                }else{
                    cb(null, {status: 0, count: keys})
                }
            })
        // }
    };

    Accesskey.switchMailed = function(options, key, callback) {
        Accesskey.findOne({where: {key: key}}, (err, key) => {
            if(!err) {
                if(key.uid === options.uid || ['ADMIN', 'OPERATOR'].includes(options.user.role().code)) { // Owner or admin or operator
                    key.updateAttribute('mailed', !key.mailed, (err, inst) => {
                        if(err) {
                            console.error(err)
                            callback(err, {status: -1, message: 'A write error occurred'})
                            return
                        }
                    })
                    callback(null, {status: 2, message: 'ok'})
                    return
                } else {
                    callback(null, {status: -1, message: 'You don\'t have permissions'})
                    return
                }

            }
            console.error(err)
            callback(err, {status: -1, message: 'The access key not exist'})
        })
    }

    Accesskey.useKey = function(key, uid, cb) {
        Accesskey.updateAll({
            key: key,
            activated_date: null
        }, {
            activated_date: new Date().toGMTString()
        }, (err, info) => {
            if(err) {
                cb(err)
                return
            }

            if(info.count === 0) {
                cb(null, {
                    status: -1,
                    message: 'The access key does not exist or has been used',
                    key: key
                })
            } else {
                var User = app.models.User;

                Accesskey.findOne({where: {key: key}}, (err, key) => {
                    User.updateAll({uid: uid}, {accesskey_id: key.id}, (err, info) => {
                        if(err) {
                            cb(err)
                            return
                        }
                        User.findOne({include: ['role', 'accesskey'], where: {uid: uid}}, {include: ['role', 'accesskey']}, (err, user) => {
                            User.app.models.emailQueue.addEmail({
                                to: user.email,
                                bcc: config.adminEmail,
                                subject: "Account registration in Value",
                                text: "Account registration in Value"
                              }, {
                                  user: user
                                }, 'register')
                            cb(null, {
                                status: 0,
                                message: 'The access key is activated',
                                key: key
                            })
                        })
                    })
                })
            }
        })
    }

    Accesskey.getMypartners = function(options, callback) {
        //var sql = `select prod.vci_accesskey.key, prod.vci_accesskey.mailed, prod.vci_accesskey.activated_date, prod.vci_accesskey.uid, a.email as activator, a.bought_tokens as tokens from prod.vci_accesskey left join prod.vci_user a on (a.accesskey_id = prod.vci_accesskey.id) where prod.vci_accesskey.uid = '${app.uid}' and prod.vci_accesskey.activated_date notnull order by prod.vci_accesskey.id asc`

        var sql = "select "+config.dbConfig.db.schema+".vci_accesskey.key, "+
                            config.dbConfig.db.schema+".vci_accesskey.mailed, "+
                            config.dbConfig.db.schema+".vci_accesskey.activated_date, "+
                            config.dbConfig.db.schema+".vci_accesskey.uid, a.email as activator, a.bought_tokens as tokens from "+config.dbConfig.db.schema+".vci_accesskey "+
                            "left join "+config.dbConfig.db.schema+".vci_user a on (a.accesskey_id = "+config.dbConfig.db.schema+".vci_accesskey.id) "+
                            "where "+config.dbConfig.db.schema+".vci_accesskey.uid = '"+options.uid+"' and "+config.dbConfig.db.schema+".vci_accesskey.activated_date notnull "+
                            "order by "+config.dbConfig.db.schema+".vci_accesskey.id asc"

        Accesskey.dataSource.connector.execute(sql, (err, keys) => {
            if(err) {
                console.error(err)
                callback(err)
                return
            }

            callback(null, {status: 2, keys: keys})
            return
        })

        // let filter = {
        //     where: {
        //         'activated_date': {neq: null},
        //         'uid': app.uid
        //     }
        // }

        // Accesskey.find(filter, (err, keys) => {
        //     if(!err) {

        //         console.log('keys: ', keys)
        //         callback(null, {status: 2, keys: keys})
        //         return
        //     }
        //     console.error(err)
        //     callback(err, {status: -1, message: 'Błąd wyszukiwania kluczy'})
        //     return
        // })
    }

    Accesskey.verifyAccess = function(obj, cb) {
        var filter = {
            where: obj
        }
        Accesskey.findOne(filter, (err, key) => {
            if(err) {
                cb(err)
                return
            }
            if(key === null) {
                cb(null, {status: -1, message: "Invaild pair."})
                return
            }
            cb(null, {status: 0, key: key})
            return
        })
    }

};
