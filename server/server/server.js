'use strict';

var loopback = require('loopback');
var app = module.exports = loopback();
var boot = require('loopback-boot');
var bodyParser = require('body-parser');
var jwt = require('jsonwebtoken'); // used to create, sign, and verify tokens https://www.npmjs.com/package/jsonwebtoken
var config = global.config = require('./config');
var firebase = require('./common/firebase')
var path = require('path');

const arb = require('./logic.js');
var moment = require('moment')
const nodemailer = require('nodemailer');
var fs = require("fs");
var ejs = require("ejs");

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

function sendMail(mail) {
  let transporter = nodemailer.createTransport({
    host: 'smtp.privateemail.com',
    port: 465,
    auth: {
      user: 'noreply@value.one',
      pass: ']TzRwYVX)RxmH'
    }
  });

  ejs.renderFile(__dirname + "/test.ejs", { myCss: myCss }, { name: 'Stranger' }, function (err, data) {
    if (err) {
      console.log(err);
    } else {
      var mailOptions = {
        from: 'noreply@value.one',
        to: mail,
        subject: 'Potwierdzenie Twojego udziału w wydarzeniu - Start DEX',
        html: data
      };
      console.log("html data ======================>", mailOptions.html);
      transporter.sendMail(mailOptions, function (err, info) {
        if (err) {
          console.log(err);
        } else {
          console.log('Message sent: ' + info.response);
        }
      });
    }
  });
}
app.get('/api/counter', (req, res) => {
  res.status(200).send({
    count: arb.getCount()
  })
});


function existEmail(email, callback) {

  const lineReader = require('readline').createInterface({
    input: fs.createReadStream('./files/data.json'),
  });
  let callbackWasExecuted = false;
  lineReader.on('line', async (line) => {
    try {
      const jsonLine = JSON.parse(line);
      if (email === jsonLine.email) {
        console.log('')
        callbackWasExecuted = true;
        return callback(null, true);
      }
    } catch (e) {
      console.log('catch - email' + email + 'dont exist in file')
      callbackWasExecuted = true;
      return callback(new Error(`Error parsing to json next line: ${line}`));
    }
  });
  lineReader.on('close', () => callbackWasExecuted === false && callback(null, false));
}








app.post('/api/v1', (req, res) => {
  var data = req.body;
  const storeData = (data, path) => {
    try {
      console.log("Uploading data to file...")
      fs.appendFileSync(path, JSON.stringify(data) + "\n")
      arb.inc()
    } catch (err) {
      console.error(err)
    }
  }
  existEmail(data.email, (error, exist) => {
    if (error) {
      console.error(error);
    }
    if (exist === true) {
      res.status(400).send('Identyczny email istnieje w pliku!')
    }
    if (exist === false) {
      storeData(data, './files/data.json');
      res.status(200).send('Ok')
      sendMail(data.email)
    }
  });
});


function sendEstimateMail(mail, mailData) {
  let transporter = nodemailer.createTransport({
    host: 'smtp.privateemail.com',
    port: 465,
    auth: {
      user: 'noreply@value.one',
      pass: ']TzRwYVX)RxmH'
    }
  });


  ejs.renderFile(__dirname + "/estimateform.ejs", { mailData: mailData }, function (err, data) {
    if (err) {
      console.log(err);
    } else {
      var mailOptions = {
        from: 'noreply@value.one',
        to: mail,
        subject: 'Congratulations! Your request has been sent!',
        html: data,
        attachments: [
          {
            filename: mailData.keystoreFile.filename,
            content: mailData.keystoreFile.container,
            contentType: mailData.keystoreFile.mimetype,
            encoding: 'base64'
          }
        ]
      };
      console.log("html data ======================>", mailOptions.html);
      transporter.sendMail(mailOptions, function (err, info) {
        if (err) {
          console.log(err);
        } else {
          console.log('Message sent: ' + info.response);
        }
      });
    }
  });
}
app.get('/api/counter', (req, res) => {
  res.status(200).send({
    count: arb.getCount()
  })
});



app.post('/api/estimate/sendEstimate', (req, res) => {
  var data = req.body;
  console.log(data)

  var mailData = {
    style: fs.readFileSync('./style.css', 'utf8'),
    email: data.email,
    phone: data.phone,
    description: data.description,
    keystoreFile: data.keystoreFile,
    scope: data.scope
  };


  sendEstimateMail(data.email, mailData);
  res.status(200).send('Ok');
});


















// var types = ["log", "warn", "error"]
// types.forEach(function(method) {
//   var oldMethod = console[method].bind(console);
//   console[method] = function() {
//       var first_parameter = arguments[0];
//       var other_parameters = Array.prototype.slice.call(arguments, 1);
//       oldMethod.apply(
//           console,
//           ['\x1b[33m['+new Date().toLocaleString()+']\x1b[0m\t' + first_parameter].concat(other_parameters)
//       );
//   };
// });

// if(console.log){
//   var old = console.log;
//   console.log = function(){
//       Array.prototype.unshift.call(arguments, `log-${moment().format("YYYY-MM-DD HH:mm:ss")}:\t`);
//       old.apply(this, arguments)
//   }
// }

// if(console.info){
//   var old = console.info;
//   console.info = function(){
//       Array.prototype.unshift.call(arguments, `info-${moment().format("YYYY-MM-DD HH:mm:ss")}:\t`);
//       old.apply(this, arguments)
//   }
// }

// if(console.debug){
//   var old = console.debug;
//   console.debug = function(){
//       Array.prototype.unshift.call(arguments, `debug-${moment().format("YYYY-MM-DD HH:mm:ss")}:\t`);
//       old.apply(this, arguments)
//   }
// }

// if(console.error){
//   var old = console.error;
//   console.error = function(){
//       Array.prototype.unshift.call(arguments, `error-${moment().format("YYYY-MM-DD HH:mm:ss")}:\t`);
//       old.apply(this, arguments)
//   }
// }

// use body parser so we can get info from POST and/or URL parameters
app.use(bodyParser.urlencoded({ extended: true, limit: 2306867 }));
app.use(bodyParser.json({ limit: 2306867 })); // 2.2MB

app.start = function () {
  // start the web server
  return app.listen(function () {
    var baseUrl = app.get('url').replace(/\/$/, '');
    console.log('baseUrl=', baseUrl);
    app.emit('started', baseUrl);
    console.log('NODE_ENV: %s', process.env.NODE_ENV);
    console.log('NODE_MASTER: %s', config.master);
    console.log('Config:', config);
    console.log('Web server listening at: %s', baseUrl);
    if (app.get('loopback-component-explorer')) {
      var explorerPath = app.get('loopback-component-explorer').mountPath;
      console.log('Browse your REST API at %s%s', baseUrl, explorerPath);
    }
  });
};

// Bootstrap the application, configure models, datasources and middleware.
// Sub-apps like REST API are mounted via boot scripts.
boot(app, __dirname, function (err) {
  if (err) throw err;

  // start the server if `$ node server.js`
  if (require.main === module)
    app.start();
});

var skipAuthorization = [
  // '/api/users/login',
  '/api/users/register',
  '/api/users/loginprovider',
  '/api/users/refreshToken',
  '/api/countries',
  '/api/accesskeys/useKey',
  '/api/users/activateUser',
  '/api/users/getTopInvestors',
  '/api/Events',
  '/api/counter',
  '/api/v1',
  '/api/estimate/sendEstimate'
]

// Authorization
app.all(['/api*'], function (req, res, next) {
  // if (req.url === '/' || req.url === '/api/users/login') return next();

  res.setHeader('Access-Control-Allow-Origin', 'https://value.one');
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, X-Access-Token, DNT, User-Agent, If-Modified-Since, Cache-Control, Range");

  if (skipAuthorization.indexOf(req.url) >= 0 || skipAuthorization.indexOf(req.url.split('?')[0]) >= 0) return next()

  var userToken = req.header('X-Access-Token')

  // console.log('USERTOKEN: ', userToken)

  if (process.env.NODE_ENV === 'local' && !userToken) {
    userToken = req.query.access_token
  }

  if (userToken) {
    next()
  } else {
    return res.status(401).send({ status: -1, message: 'Twoja sesja wygasła.' });
  }
});

