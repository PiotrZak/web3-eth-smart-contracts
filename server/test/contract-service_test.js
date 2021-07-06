/* Examples
  https://mochajs.org
  https://nodejs.org/docs/latest-v4.x/api/assert.html
 */

'use strict';

var app = require('../server/server');
var assert = require('assert');
var contract = require('../server/services/contract');
var restUtil = require('./utils/restUtil');
var uuid = require('uuid/v4');

describe('contract service testing', function() {
  var uid = uuid();
  var addressAuthorize = '0x5b3284c6b14a2b24ded7451a7e59f980f73413a0';
  var addressToSend = '0xCa7FbCaD5A080aB7BbC7bE1a4E882D9a94bc05a5';
  var amountToSend = 10000000000000000000;
  var ethEurRate = 688;

  before(function(done) {
    require('./start-server');
    restUtil.invokeCreateProfile(uid, 'BTC', '1999.99')
      .expect(204)
      .end(function(err, res) {
        done();
      });
  });

  after(function(done) {
    app.removeAllListeners('started');
    app.removeAllListeners('loaded');
    done();
  });

  describe('authorizeETHAddress', function() {
    this.timeout(25000);

    it('should return txHash', function(done) {
      app.models.User.findOne({where: {uid: uid}, include: ['role', 'profile']}, function(err, user) {
        contract.authorizeETHAddress(user, addressAuthorize, function(err, result) {
          if (err) done(err);

          restUtil.sleep(20000).then(function() {

            console.log(result);

            assert.ok(result.txHash);

            done();
          });
        });
      });
    });
  });

  describe('authorizeETHAddresswhaitForStatusSuccess', function() {
    this.timeout(15000);
    it('should return txHash', function(done) {
      app.models.User.findOne({where: {uid: uid}, include: ['role', 'profile']}, function(err, user) {
        contract.authorizeETHAddress(user, addressAuthorize, function(err, result) {
          if (err) done(err);

          restUtil.sleep(3000).then(function() {
            console.log(result);
            assert.ok(result.txHash);
            done();
          });
        });
      });
    });
  });

  describe('authorizeETHAddresswhaitForStatusFailure', function() {
    this.timeout(15000);
    var addressAuthorize = '0x2c3674c37B014f9735d68653323155080B106293';

    it('should return txHash', function(done) {
      app.models.User.findOne({where: {uid: uid}, include: ['role', 'profile']}, function(err, user) {
        contract.authorizeETHAddress(user, addressAuthorize, function(err, result) {
          if (err) done(err);
          restUtil.sleep(3000).then(function() {
            console.log(result);

            assert.ok(result.txHash);

            done();
          });
        });
      });
    });
  });

  describe('removeETHAddress', function() {
    this.timeout(15000);
    it('should return txHash', function(done) {
      app.models.User.findOne({where: {uid: uid}, include: ['role', 'profile']}, function(err, user) {
        contract.removeETHAddress(user, addressAuthorize, function(err, result) {
          if (err) done(err);
          restUtil.sleep(3000).then(function() {
            console.log(result);

            assert.ok(result.txHash);

            done();
          });
        });
      });
    });
  });

  describe('setEthEurRate', function() {
    this.timeout(15000);
    it('should return txHash', function(done) {
      contract.setEthEurRate(ethEurRate, function(err, result) {
        if (err) done(err);
        console.log(result);

        assert.ok(result.txHash);

        done();
      });
    });
  });

  describe('requestForKrowns', function() {
    this.timeout(15000);
    it('should return txHash', function(done) {
      app.models.User.findOne({where: {uid: uid}, include: ['role', 'profile']}, function(err, user) {
        contract.requestForKrowns(user, amountToSend, addressToSend, function(err, result) {
          if (err) done(err);
          console.log(result);

          assert.ok(result.txHash);

          done();
        });
      });
    });
  });
});

describe('getContractAddressTransactions', function() {
  this.timeout(30000);

  it('should return transactions', function(done) {
    contract.getContractAddressTransactions(null, function(err, result) {
      if (err) done(err);

      console.log(result);

      assert.ok(result);

      done();
    });
  });
});

describe('updateRatesOnContract', function() {
  this.timeout(30000);

  it('should return return tx hash', function(done) {
    contract.updateRatesOnContract(function(err, result) {
      if (err) done(err);

      console.log(result);

      assert.ok(result);

      done();
    });
  });
});
