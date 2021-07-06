'use strict';
var request = require('supertest');
var app = require('../../server/server');
var config = require('../../server/config');

var test_addr_receive_eth = '0xCa7FbCaD5A080aB7BbC7bE1a4E882D9a94bc05a5';
var test_addr_send_eth = '0x68e26ed2ce1b74021ec4f10d1b2f1a19dae127a8';
var test_addr_send_btc = '2MtUd1o27Ag29JkJaKLrTr87fDwWVNrYBvX';

var json = function(verb, url, token) {
  var req = request(app)[verb](url)
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json');

  if (token !== null && token !== undefined && token !== '') {
    return req.set('X-Access-Token', token);
  }

  return req.expect('Content-Type', /json/);
};

var invokeLoginAdmin = function() {
  return json('post', '/api/users/login')
    .send({
      'user': {
        'email': 'admin@admin.pl',
        'password': 'test',
      },
    });
};

var invokeCreateProfile = function(uid, currency, amount) {
  return json('post', '/api/create-profile')
    .send({
      'uid': uid,
      'username': 'username',
      'email': uid + '@email.com',
      'currency': currency,
      'amount': amount,
    });
};

var invokeUpdateProfileKYC = function(uid, hash) {
  return json('put', '/api/update-profile/kyc/' + uid + '/' + hash)
    .send({
      'profile_type': 'PRIVATE',
      'full_name': 'Sample full name',
      'company_name': 'Sample company name',
      'company_reg_id': '999',
      'country_id': 1,
      'addr_verify_doc': 'sample address verify doc',
      'address': {
        'street': 'Grunwaldzka',
        'street_prefix': 'ul',
        'building_no': '81A',
        'apartment_no': '16',
        'city': 'Gdańsk',
        'postcode': '99-999',
        'post_office': 'Post office',
        'country_id': 1,
      },
    });
};

var invokeUpdateProfileAML = function(uid, hash) {
  return json('put', '/api/update-profile/aml/' + uid + '/' + hash)
    .send({
      'addr_receive_eth': test_addr_receive_eth,
      'addr_send_eth': test_addr_send_eth,
      'addr_send_btc': test_addr_send_btc,
    });
};

var invokeBitGoWebhook = function(uid) {
  return json('post', config.bitgo.webhooks.receivedBTCTransfer.url + uid)
    .send({
      'type': 'transaction',
      'walletId': '2MtUd1o27Ag29JkJaKLrTr87fDwWVNrYBvX',
      'hash': 'c9a55f32d4b63d02a617eea58873227e4f011d0dfc836cb2e9cab531c4db0c4a',
    });
};

var invokeReviewDetails = function(token, uid) {
  return json('get', '/api/review/' + uid + '/details', token)
    .send();
};

var invokeReviewApprove = function(token, uid) {
  return json('put', '/api/review/' + uid + '/approve', token)
    .set('X-Access-Token', token)
    .send();
};

var invokeReviewDeny = function(token, uid) {
  return json('put', '/api/review/' + uid + '/deny', token)
    .send();
};

var invokePaymentDetails = function(token, uid) {
  return json('get', '/api/payment/' + uid + '/details', token)
    .send();
};

var invokePaymentReceived = function(token, uid) {
  return json('put', '/api/payment/' + uid + '/received', token)
    .send();
};

var sleep = function(time) {
  return new Promise(function(resolve) {
    setTimeout(resolve, time);
  });
};

module.exports.json = json;
module.exports.invokeLoginAdmin = invokeLoginAdmin;
module.exports.invokeCreateProfile = invokeCreateProfile;
module.exports.invokeUpdateProfileKYC = invokeUpdateProfileKYC;
module.exports.invokeUpdateProfileAML = invokeUpdateProfileAML;
module.exports.invokeBitGoWebhook = invokeBitGoWebhook;
module.exports.invokeReviewDetails = invokeReviewDetails;
module.exports.invokeReviewApprove = invokeReviewApprove;
module.exports.invokeReviewDeny = invokeReviewDeny;
module.exports.invokePaymentDetails = invokePaymentDetails;
module.exports.invokePaymentReceived = invokePaymentReceived;
module.exports.sleep = sleep;

module.exports.test_addr_receive_eth = test_addr_receive_eth;
module.exports.test_addr_send_btc = test_addr_send_btc;
module.exports.test_addr_send_eth = test_addr_send_eth;
