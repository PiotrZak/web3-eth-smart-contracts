'use strict';

var MailHelper = require('../services/MailHelper')

module.exports = function(Emailqueue) {

    const EMAIL_STATUS = {
        PENDING: "PENDING",
        SUCCESS: "SUCCESS",
        ERROR: "ERROR"
    }
    const SEND_MAIL_LIMIT = 5;

    /**
     * Add email message to queue
     * @param {string} params params looks like to, subject, bcc
     * @param {string} html Parsed message as HTML or text
     */

    Emailqueue.addEmail = function (params, html, template, status = "PENDING") {
        Emailqueue.create({params: params, html: html, template: template, status: status}, (err, queue) => {
            if(err) {
                console.error(err)
                return
            }
            console.log(`Email queue created!`)
        })
    };

    /**
     * Send email messages in queue
     * @param {Function(Error)} callback
     */

    Emailqueue.sendMails = function () {
        var filter = { where: { status: EMAIL_STATUS.PENDING }, order: 'id ASC', limit: SEND_MAIL_LIMIT }
        Emailqueue.find(filter, (err, mails) => {
            if(err) {
                console.error(err)
                return
            }
            mails.forEach(mail => {
                MailHelper.sendMail(mail.params, mail.html, mail.template).then(s => {
                    UpdateStatus(mail, EMAIL_STATUS.SUCCESS)
                }).catch(err => {
                    console.error(err)
                    UpdateStatus(mail, EMAIL_STATUS.ERROR)
                })
            })
        })
    };

    function UpdateStatus(mail, status) {
        mail.updateAttributes({status: status}, err => {
            if(err)
                console.error(err)
        })
    }

};