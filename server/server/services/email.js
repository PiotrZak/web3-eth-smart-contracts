'use strict';

var app = require('../server');
var config = require('../config')
var moment = require('moment')

module.exports.transactionConfirm = function (user, transaction) {
  console.log('Sending email with transaction confirm to admin and user');
  app.models.Email.send({
    to: user.email,
    bcc: config.adminEmail,
    from: 'noreply@valuedao.com',
    text: `Value tokens purchase`,
    subject: `Value tokens purchase`,
    html: `<html><p>Hello,<br/><br/>Here is purchase confirmation of Value tokens.</p><span><b>Transaction hash: </b> ${transaction.hash}</span><br/><span><b>Date of operation: </b> ${transaction.datetime} UTC</span><br/><span><b>Wallet: </b> ${transaction.from}</span><br/><span><b>Price: </b> ${transaction.value} ETH</span><br/><span><b>Value tokens amount: </b> ${transaction.vdo} VCO</span><br/><span><b>ETH/EUR rate: </b> ${transaction.ethusd}</span><br/><br/><p>You can find an immutable record of the transaction under the link: <a href="https://etherscan.io/tx/${transaction.hash}">https://etherscan.io/tx/${transaction.hash}</a></p><p>This is an automated message, please do not reply to it.<br/> To contact ValueDAO, please forward this email to <a href="mailto:info@value.one">info@value.one</a></p><p>Greetings, <br/>ValueDAO team</p></html>`
  }, function(err, mail) {
    if(err) {
      console.log('Sending email with transaction confirm ERROR form transaction ' + transaction.hash)
    }
    console.log('Email with transaction confirm sent SUCCESS')
  })
}

module.exports.transactionToPartner  = function (user, referer, transaction) {
  console.log('Sending email with transaction confirm to admin and user');

  app.models.Email.send({
    to: user.email,
    bcc: config.adminEmail,
    from: 'noreply@valuedao.com',
    text: `Value tokens purchase`,
    subject: `Value tokens purchase`,
    html: `<html><p>Hello,<br/><br/>Your partner ${referer.email} just bought tokens. You received ${transaction.vdo * 0.05} VCO on commission.</p><span><b>Transaction hash: </b> ${transaction.hash}</span><br/><span><b>Date of operation: </b> ${transaction.datetime} UTC</span><br/><span><b>Wallet: </b> ${transaction.from}</span><br/><span><b>Price: </b> ${transaction.value} ETH</span><br/><span><b>Value tokens amount: </b> ${transaction.vdo} VCO</span><br/><span><b>ETH/EUR rate: </b> ${transaction.ethusd}</span><br/><br/><p>You can find an immutable record of the transaction under the link: <a href="https://etherscan.io/tx/${transaction.hash}">https://etherscan.io/tx/${transaction.hash}</a></p><p>This is an automated message, please do not reply to it.<br/> To contact ValueDAO, please forward this email to <a href="mailto:info@value.one">info@value.one</a></p><p>Greetings, <br/>ValueDAO team</p></html>`
  }, function(err, mail) {
    if(err) {
      console.log('Sending email with transaction confirm ERROR form transaction ' + transaction.hash)
    }
    console.log('Email with transaction confirm sent SUCCESS')
  })
}

module.exports.onRegisterPartnerInfo = function (to, referer) {
  console.log('Sending email on add partner wallet');

  app.models.Email.send({
    to: to.email,
    bcc: config.adminEmail,
    from: 'noreply@valuedao.com',
    text: `You have a new VCO partner in ValueDAO`,
    subject: `You have a new VCO partner in ValueDAO`,
    html: `<html><p>Hello,<br/><br/>We inform you that ${referer.email} just registered to the ValueDAO from your code. Congratulations and we wish you a sumptuous commission!</p><p>This is an automated message, please do not reply to it. <br/> To contact ValueDAO, please forward this email to <a href="mailto:info@value.one">info@value.one</a></p><p>Greetings, <br/>ValueDAO team</p></html>`
  }, function(err, mail) {
    if(err) {
      console.error('Sending email on add partner wallet ERROR: ', err)
    }
    console.log('Sending email on add partner wallet SUCCESS')
  })
}

module.exports.contact = function (user, message) {
  console.log('Sending email with transaction confirm to admin and user');

  app.models.Email.send({
    to: config.adminEmail,
    from: user.email,
    text: `Formularz kontaktowy od ${config.adminEmail}`,
    subject: `Formularz kontaktowy od ${config.adminEmail}`,
    html: `<html><h1>Kontakt z strony value.one</h1><span><b>Od: </b> ${user.email}</span><br/><p>${message}</p></html>`
  }, function(err, mail) {
    if(err) {
      console.log('Sending email with contact message')
    }
    console.log('Email with contact message sent SUCCESS')
  })
}

module.exports.register = function (user) {
  console.log('Sending email with register info to admin and user');

  app.models.Email.send({
    to: user.email,
    bcc: config.adminEmail,
    from: 'noreply@valuedao.com',
    text: `Account registration in ValueDAO`,
    subject: `Account registration in ValueDAO`,
    html: `<html><p>Hello,<br/><br/>Your account ${user.email} on the ValueDAO platform has been activated.</p><p>The service is available through the website <a href="http://value.one/login">http://value.one/login</a></p><p>This is an automated message, please do not reply to it. <br/> To contact ValueDAO, please forward this email to <a href="mailto:info@value.one">info@value.one</a></p><p>Greetings, <br/>ValueDAO team</p></html>`
  }, function(err, mail) {
    if(err) {
      console.log('Sending email with register message')
    }
    console.log('Email with register message sent SUCCESS')
  })
}


module.exports.addWallet = function (user, wallet) {
  console.log('Sending email with add wallet to admin and user');

  app.models.Email.send({
    to: user.email,
    bcc: config.adminEmail,
    from: 'noreply@valuedao.com',
    text: `Wallet added in ValueDAO`,
    subject: `Wallet added in ValueDAO`,
    html: `<html><p>Hello,<br/><br/>A wallet <b>${wallet}</b> has been added to the ${user.email} account.</p><p>Date of operation: ${moment(new Date()).format('DD.MM.YYYY HH:mm').toString()}</p><p>This is an automated message, please do not reply to it. <br/> To contact ValueDAO, please forward this email to <a href="mailto:info@value.one">info@value.one</a></p><p>Greetings, <br/>ValueDAO team</p></html>`
  }, function(err, mail) {
    if(err) {
      console.log('Sending email with add wallet message')
    }
    console.log('Email with add wallet message sent SUCCESS')
  })
}



module.exports.removeWallet = function (user, wallet) {
  console.log('Sending email with add wallet to admin and user');

  app.models.Email.send({
    to: user.email,
    bcc: config.adminEmail,
    from: 'noreply@valuedao.com',
    text: `Wallet in ValueDAO has been removed`,
    subject: `Wallet in ValueDAO has been removed`,
    html: `<html><p>Hello,<br/><br/>The wallet <b>${wallet}</b> was removed from ${user.email}</p><p>Date of operation: ${moment(new Date()).format('DD.MM.YYYY HH:mm').toString()}</p><p>This is an automated message, please do not reply to it. <br/> To contact ValueDAO, please forward this email to <a href="mailto:info@value.one">info@value.one</a></p><p>Greetings, <br/>ValueDAO team</p></html>`
  }, function(err, mail) {
    if(err) {
      console.log('Sending email with add wallet message')
    }
    console.log('Email with add wallet message sent SUCCESS')
  })
}
