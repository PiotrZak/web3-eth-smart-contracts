'use strict';

var app = require('../server/server');
var request = require('supertest');
var assert = require('assert');
var uuid = require('uuid/v4');
var restUtil = require('./utils/restUtil');

describe('ETH flow less than', function () {
  before(function (done) {
    require('./start-server');
    done();
  });

  after(function (done) {
    app.removeAllListeners('started');
    app.removeAllListeners('loaded');
    done();
  });

  describe('First step', function () {
    it('Should create user and profile', function (done) {
      var uid = uuid();

      // first step
      restUtil.invokeCreateProfile(uid, 'ETH', '1.99')
        .expect(204)
        .end(function (err, res) {
          assert(res.body === '');

          app.models.User.findOne({where: {uid: uid}, include: ['role', 'profile']}, function (err, user) {
            // check user model
            assert.equal(user.uid, uid, 'Incorrect user UID');
            assert.equal(user.role().code, 'USER', 'Incorrect user role');
            assert.equal(user.email, uid + '@email.com', 'Incorrect user email');
            assert.equal(user.username, 'username', 'Incorrect user username');
            // check profile model
            assert.equal(user.profile().currency, 'ETH', 'Incorrect profile currency');
            assert.equal(user.profile().amount, 1.99, 'Incorrect profile amount');
            // check profile model - status/hash
            assert.equal(user.profile().flow_status, 'ETH_LESS_AML_LINK_SENT', 'Incorrect profile flow_status');
            assert.equal(user.profile().kyc_status, 'NONE', 'Profile kyc_status should be null');
            assert.equal(user.profile().kyc_link, null, 'Profile kyc_link should be null');
            assert.equal(user.profile().kyc_hash, null, 'Profile kyc_hash should be null');
            assert.equal(user.profile().aml_status, 'INITIAL', 'Profile aml_status should be null');
            assert.notEqual(user.profile().aml_link, null, 'Profile aml_link should not be null');
            assert.notEqual(user.profile().aml_hash, null, 'Profile aml_hash should not be null');

            done(err);
          });
        });
    });
  });


  describe('Second step', function () {
    this.timeout(20000);
    it('Should update user, address and profile', function (done) {
      var uid = uuid();

      // first step
      restUtil.invokeCreateProfile(uid, 'ETH', '1.99')
        .expect(204)
        .end(function (err, res) {
          app.models.User.findOne({where: {uid: uid}, include: ['role', 'profile']}, function (err, user) {
            // second step
            restUtil.invokeUpdateProfileAML(uid, user.profile().aml_hash)
              .expect(204)
              .end(function (err, res) {
                app.models.User.findOne({where: {uid: uid}, include: ['role', 'address', 'profile']}, function (err, user) {

                  // check user model
                  assert.equal(user.uid, uid, 'Incorrect user UID');
                  assert.equal(user.role().code, 'USER', 'Incorrect user role');
                  assert.equal(user.email, uid + '@email.com', 'Incorrect user email');
                  assert.equal(user.username, 'username', 'Incorrect user username');
                  // check address model
                  assert.equal(user.address(), null, 'Address should be null');
                  // check profile model
                  assert.equal(user.profile().currency, 'ETH', 'Incorrect profile currency');
                  assert.equal(user.profile().amount, 1.99, 'Incorrect profile amount');
                  assert.equal(user.profile().profile_type, 'NONE', 'Profile profile_type should be null');
                  assert.equal(user.profile().full_name, null, 'Profile full_name should be null');
                  assert.equal(user.profile().company_name, null, 'Profile company_name should be null');
                  assert.equal(user.profile().company_reg_id, null, 'Profile company_reg_id should be null');
                  assert.equal(user.profile().country_id, null, 'Profile country_id should be null');
                  assert.equal(user.profile().addr_verify_doc, null, 'Profile addr_verify_doc should be null');
                  assert.equal(user.profile().addr_receive_eth, restUtil.test_addr_receive_eth, 'Incorrect profile addr_receive_eth');
                  assert.equal(user.profile().addr_send_eth, restUtil.test_addr_send_eth, 'Incorrect profile addr_send_eth');
                  assert.equal(user.profile().addr_send_btc, null, 'Profile addr_send_btc should be null');
                  // check profile model - status/hash
                  assert.equal(user.profile().flow_status, 'ETH_LESS_ETH_ADDR_CONTRACT', 'Incorrect profile flow_status');
                  assert.equal(user.profile().kyc_status, 'NONE', 'Profile kyc_status should be null');
                  assert.equal(user.profile().kyc_link, null, 'Profile kyc_link should be null');
                  assert.equal(user.profile().kyc_hash, null, 'Profile kyc_hash should be null');
                  assert.equal(user.profile().aml_status, 'APPROVED', 'Incorrect profile aml_status');
                  assert.notEqual(user.profile().aml_link, null, 'Profile aml_link should not be null');
                  assert.notEqual(user.profile().aml_hash, null, 'Profile aml_hash should not be null');

                  done(err);
                });
              });
          });
        });
    });
  });

});
