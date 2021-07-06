/* Examples
  https://mochajs.org
  https://nodejs.org/docs/latest-v4.x/api/assert.html
 */

'use strict';

var app = require('../server/server');
var request = require('supertest');
var assert = require('assert');
var bitgo = require('../server/services/bitgo');

var uuid = require('uuid');


describe('bitgo service', function() {
  var uid = 'uid-hgr3j2vj';
  var walletId;

  describe('creating wallet', function() {
    this.timeout(15000);
    it('should return created wallet', function(done) {
      bitgo.createWallet({uid: uid}, function(err, result) {


        // DANGER - PRIVATE KEYS - DON'T DO THIS IN PRODUCTION
        console.log('wallet password: ' + result.walletPassword);
        console.log('User keychain encrypted xPrv: ' + result.userKeychain.xpub);
        console.log('Backup keychain encrypted xPrv: ' + result.backupKeychain.xpub);
        console.log('Backup keychain encrypted xPrv: ' + result.bitgoKeychain.xpub);
        console.log(result);
        console.log({
          id: result.wallet.id,
          label: result.wallet.label,
          userKeychain: result.userKeychain,
          walletPassword: result.walletPassword,
        });

        assert.ok(result);
        assert.ok(result.walletPassword);
        assert.ok(result.wallet);
        assert.ok(result.wallet.id);
        walletId = result.wallet.id;

        if (err) done(err);
        else done();
      });
    });
  });

  describe('get wallet balance', function() {
    this.timeout(15000);
    it('should return wallet with balance', function(done) {
      bitgo.getWalletBalance(walletId, function(err, result) {

        console.log(result);

        assert.ok(result);

        if (err) done(err);
        else done();
      });
    });
  });
});

function call(verb, url) {
  return request(app)[verb](url);
}

describe('webhook test', function() {
  before(function(done) {
    require('./start-server');
    done();
  });

  after(function(done) {
    app.removeAllListeners('started');
    app.removeAllListeners('loaded');
    done();
  });

  describe('run web hook', function() {
    var uid = uuid();
    it('should create user and profile', function(done) {
      call('post', '/api/webhook/btc/check/' + uid)
        .expect(200)
        .end(function(err, res) {
          console.log(res);
          assert.ok(res);

          done(err);
        });
    });
  });
});

describe('balance test', function() {
  var walletId = '2NCBFyFsC2WWSHSEkh9yW2VxFDGJf2wogCL';
  var walletId2 = '2MtMhsScSsG3XTBD9HHhBLnPGmSX66diJf4';


  describe('get wallet balance', function() {
    this.timeout(15000);
    it('should return wallet with balance', function(done) {
      bitgo.getWalletBalance(walletId, function(err, result) {

        console.log(result);

        assert.ok(result);

        if (err) done(err);
        else done();
      });
    });
  });
});
