var server = require('../server')
var config = require('../config')
var loopback = require('loopback')
var path = require('path')

const sendMail = (params, body, templateName = null) => {

    return new Promise((resolve, reject) => {
        let html_body = body;

        var mail = params

        if(typeof body === 'object' && templateName !== null) {
            let renderer = loopback.template(path.resolve(__dirname, `../emailTemplates/${templateName}.ejs`))
            html_body = renderer(body)
        }

        mail.html = html_body
        mail.from = "noreply@valuedao.com"

        server.models.Email.send(mail, (err, mail) => {
            if(err) {
                console.error(err)
                reject(err)
            }
            resolve('Email sent!')
        })
    })

}

module.exports = {
    sendMail,
}