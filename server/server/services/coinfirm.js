'use strict';

var request = require('request');
var config = require('../config');

// production: https://api.coinfirm.io/
// mock: https://private-anon-c7b19d3b57-aml.apiary-mock.com

var getStandardReport = function getStandardReport(uid, address, callback) {
  console.log('Requesting for coinfirm standard report for uid: ' + uid + '...');

  request({
    method: 'GET',
    url: config.coinfirm.apiURL + '/v2/reports/aml/standard/' + address,
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': 'Bearer ' + config.coinfirm.token,
    },
  }, function(error, response, body) {
    console.log('Status:', response.statusCode);

    if (error) {
      console.error('Request for coinfirm basic report ERROR for uid: ' + uid);
      callback(error, null);
      return;
    }
    if (response.statusCode < 200 || response.statusCode > 205) {
      console.error('Request for coinfirm basic report ERROR for uid: ' + uid);
      callback(new Error('Wrong status code for coinfirm'), null);
      return;
    }

    try {
      var report = JSON.parse(body);
      console.log('Request for coinfirm basic report SUCCESS for uid: ' + uid);
      callback(null, report);
      return;
    } catch (err) {
      callback(new Error('Wrong message from coinfirm'), null);
      return;
    }
  });
};

var getBasicReport = function getBasicReport(uid, address, callback) {
  console.log('Requesting for coinfirm basic report for uid: ' + uid + '...');

  request({
    method: 'GET',
    url: config.coinfirm.apiURL + '/v2/reports/aml/basic/' + address,
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': 'Bearer ' + config.coinfirm.token,
    },
  }, function(error, response, body) {
    console.log('Status:', response.statusCode);

    if (error) {
      console.error('Request for coinfirm basic report ERROR for uid: ' + uid);
      callback(error, null);
      return;
    }
    if (response.statusCode < 200 || response.statusCode > 205) {
      console.error('Request for coinfirm basic report ERROR for uid: ' + uid);
      callback(new Error('Wrong status code for coinfirm'), null);
      return;
    }

    try {
      var report = JSON.parse(body);
      console.log('Request for coinfirm basic report SUCCESS for uid: ' + uid);
      callback(null, report);
      return;
    } catch (err) {
      console.error('Request for coinfirm basic report ERROR for uid: ' + uid);
      callback(new Error('Wrong message from coinfirm'), null);
      return;
    }
  });
};

/**
 * Logging user and returns json with token in callback
 * @param callback
 */
var login = function login(callback) {
  console.log('Coinfirm try to login');

  request({
    method: 'POST',
    url: config.coinfirm.apiURL + '/v2/auth/login',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: '{ \"email\": \"' + config.coinfirm.loginEmail + '\",  \"password\": \"' + config.coinfirm.pass + '\"}',
  }, function(error, response, body) {
    console.log('Status:', response.statusCode);

    if (error) {
      console.error('Coinfirm login ERROR');
      callback(error, null);
      return;
    }
    if (response.statusCode < 200 || response.statusCode > 205) {
      console.error('Coinfirm login ERROR');
      callback(new Error('Wrong status code for coinfirm'), null);
      return;
    }

    try {
      var report = JSON.parse(body);
      console.log('Coinfirm login SUCCESS');
      callback(null, report);
      return;
    } catch (err) {
      console.error('Coinfirm login ERROR');
      callback(new Error('Wrong message from coinfirm'), null);
      return;
    }
  });
};

module.exports.getBasicReport = getBasicReport;
module.exports.getStandardReport = getStandardReport;
module.exports.login = login;


