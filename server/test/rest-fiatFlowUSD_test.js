'use strict';

var app = require('../server/server');
var assert = require('assert');
var uuid = require('uuid/v4');
var restUtil = require('./utils/restUtil');

var authData = null;

describe('FIAT flow', function () {
  before(function (done) {
    require('./start-server');

    // admin login
    restUtil.invokeLoginAdmin()
      .expect(200)
      .end(function (err, res) {
        authData = res.body;
        done();
      });
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
      restUtil.invokeCreateProfile(uid, 'USD', '5000')
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
            assert.equal(user.profile().currency, 'USD', 'Incorrect profile currency');
            assert.equal(user.profile().amount, 5000, 'Incorrect profile amount');
            // check profile model - status/hash
            assert.equal(user.profile().flow_status, 'FIAT_KYC_LINK_SENT', 'Incorrect profile flow_status');
            assert.equal(user.profile().kyc_status, 'INITIAL', 'Incorrect profile kyc_status');
            assert.notEqual(user.profile().kyc_link, null, 'Profile kyc_link should not be null');
            assert.notEqual(user.profile().kyc_hash, null, 'Profile kyc_hash should not be null');
            assert.equal(user.profile().aml_status, 'NONE', 'Profile aml_status should be null');
            assert.equal(user.profile().aml_link, null, 'Profile aml_link should be null');
            assert.equal(user.profile().aml_hash, null, 'Profile aml_hash should be null');

            done(err);
          });
        });

    });
  });

  describe('Second step', function () {
    it('Should update user, address and profile', function (done) {
      var uid = uuid();

      // first step
      restUtil.invokeCreateProfile(uid, 'USD', '10000.00090001')
        .expect(204)
        .end(function (err, res) {
          app.models.User.findOne({where: {uid: uid}, include: ['role', 'profile']}, function (err, user) {
            // second step
            restUtil.invokeUpdateProfileKYC(uid, user.profile().kyc_hash)
              .expect(204)
              .end(function (err, res) {
                app.models.User.findOne({
                  where: {uid: uid},
                  include: ['role', 'address', 'profile']
                }, function (err, user) {

                  // check user model
                  assert.equal(user.uid, uid, 'Incorrect user UID');
                  assert.equal(user.role().code, 'USER', 'Incorrect user role');
                  assert.equal(user.email, uid + '@email.com', 'Incorrect user email');
                  assert.equal(user.username, 'username', 'Incorrect user username');
                  // check address model
                  assert.equal(user.address().street, 'Grunwaldzka', 'Incorrect address street');
                  assert.equal(user.address().street_prefix, 'ul', 'Incorrect address street_prefix');
                  assert.equal(user.address().building_no, '81A', 'Incorrect address building_no');
                  assert.equal(user.address().apartment_no, '16', 'Incorrect address apartment_no');
                  assert.equal(user.address().city, 'Gdańsk', 'Incorrect address city');
                  assert.equal(user.address().postcode, '99-999', 'Incorrect address postcode');
                  assert.equal(user.address().post_office, 'Post office', 'Incorrect address post_office');
                  assert.equal(user.address().country_id, 1, 'Incorrect address country_id');
                  // check profile model
                  assert.equal(user.profile().currency, 'USD', 'Incorrect profile currency');
                  assert.equal(user.profile().amount, 10000.00090001, 'Incorrect profile amount');
                  assert.equal(user.profile().profile_type, 'PRIVATE', 'Incorrect profile profile_type');
                  assert.equal(user.profile().full_name, 'Sample full name', 'Incorrect profile full_name');
                  assert.equal(user.profile().company_name, 'Sample company name', 'Incorrect profile company_name');
                  assert.equal(user.profile().company_reg_id, '999', 'Incorrect profile company_reg_id');
                  assert.equal(user.profile().country_id, 1, 'Incorrect profile country_id');
                  assert.equal(user.profile().addr_verify_doc, 'sample address verify doc', 'Incorrect profile addr_verify_doc');
                  // check profile model - status/hash
                  assert.equal(user.profile().flow_status, 'FIAT_AML_LINK_SENT', 'Incorrect profile flow_status');
                  assert.equal(user.profile().kyc_status, 'INCOMING', 'Incorrect profile kyc_status');
                  assert.notEqual(user.profile().kyc_link, null, 'Profile kyc_link should not be null');
                  assert.notEqual(user.profile().kyc_hash, null, 'Profile kyc_hash should not be null');
                  assert.equal(user.profile().aml_status, 'INITIAL', 'Incorrect profile aml_status');
                  assert.notEqual(user.profile().aml_link, null, 'Profile aml_link should not be null');
                  assert.notEqual(user.profile().aml_hash, null, 'Profile aml_hash should not be null');

                  done(err);
                });
              });
          });
        });

    });
  });

  describe('Third step', function () {
    this.timeout(50000);
    it('Should update profile', function (done) {
      var uid = uuid();

      // first step
      restUtil.invokeCreateProfile(uid, 'USD', '10000.99')
        .expect(204)
        .end(function (err, res) {
          app.models.User.findOne({where: {uid: uid}, include: ['role', 'profile']}, function (err, user) {
            // second step
            restUtil.invokeUpdateProfileKYC(uid, user.profile().kyc_hash)
              .expect(204)
              .end(function (err, res) {
                app.models.User.findOne({
                  where: {uid: uid},
                  include: ['role', 'address', 'profile']
                }, function (err, user) {
                  // third step
                  restUtil.invokeUpdateProfileAML(uid, user.profile().aml_hash)
                    .expect(204)
                    .end(function (err, res) {
                      app.models.User.findOne({
                        where: {uid: uid},
                        include: ['role', 'address', 'profile']
                      }, function (err, user) {
                        // check user model
                        assert.equal(user.uid, uid, 'Incorrect user UID');
                        assert.equal(user.role().code, 'USER', 'Incorrect user role');
                        assert.equal(user.email, uid + '@email.com', 'Incorrect user email');
                        assert.equal(user.username, 'username', 'Incorrect user username');
                        // check address model
                        assert.equal(user.address().street, 'Grunwaldzka', 'Incorrect address street');
                        assert.equal(user.address().street_prefix, 'ul', 'Incorrect address street_prefix');
                        assert.equal(user.address().building_no, '81A', 'Incorrect address building_no');
                        assert.equal(user.address().apartment_no, '16', 'Incorrect address apartment_no');
                        assert.equal(user.address().city, 'Gdańsk', 'Incorrect address city');
                        assert.equal(user.address().postcode, '99-999', 'Incorrect address postcode');
                        assert.equal(user.address().post_office, 'Post office', 'Incorrect address post_office');
                        assert.equal(user.address().country_id, 1, 'Incorrect address country_id');
                        // check profile model
                        assert.equal(user.profile().currency, 'USD', 'Incorrect profile currency');
                        assert.equal(user.profile().amount, 10000.99, 'Incorrect profile amount');
                        assert.equal(user.profile().profile_type, 'PRIVATE', 'Incorrect profile profile_type');
                        assert.equal(user.profile().full_name, 'Sample full name', 'Incorrect profile full_name');
                        assert.equal(user.profile().company_name, 'Sample company name', 'Incorrect profile company_name');
                        assert.equal(user.profile().company_reg_id, '999', 'Incorrect profile company_reg_id');
                        assert.equal(user.profile().country_id, 1, 'Incorrect profile country_id');
                        assert.equal(user.profile().addr_verify_doc, 'sample address verify doc', 'Incorrect profile addr_verify_doc');
                        assert.equal(user.profile().addr_receive_eth, restUtil.test_addr_receive_eth, 'Incorrect profile addr_receive_eth');
                        assert.equal(user.profile().addr_send_eth, null, 'Profile addr_send_eth should be null');
                        assert.equal(user.profile().addr_send_btc, null, 'Profile addr_send_btc should be null');
                        // check profile model - status/hash
                        assert.equal(user.profile().flow_status, 'FIAT_REVIEW_WAITING', 'Incorrect profile flow_status');
                        assert.equal(user.profile().kyc_status, 'INCOMING', 'Incorrect profile kyc_status');
                        assert.notEqual(user.profile().kyc_link, null, 'Profile kyc_link should not be null');
                        assert.notEqual(user.profile().kyc_hash, null, 'Profile kyc_hash should not be null');
                        if (user.profile().aml_report_cscore <= config.coinfirm.minValidScore) {
                          assert.equal(user.profile().aml_status, 'APPROVED', 'Incorrect profile aml_status');
                        } else {
                          assert.equal(user.profile().aml_status, 'DENIED', 'Incorrect profile aml_status');
                        }
                        assert.notEqual(user.profile().aml_link, null, 'Profile aml_link should not be null');
                        assert.notEqual(user.profile().aml_hash, null, 'Profile aml_hash should not be null');
                        assert.notEqual(user.profile().aml_report_cscore, null, 'Profile aml_report_cscore should not be null');
                        assert.notEqual(user.profile().aml_report_content, null, 'Profile aml_report_content should not be null');

                        done(err);
                      });
                    });
                });
              });
          });
        });
    });
  });

  describe('Fourth step - APPROVED', function () {
    this.timeout(50000);
    it('Should update profile', function (done) {
      var uid = uuid();

      // first step
      restUtil.invokeCreateProfile(uid, 'USD', '10000.99')
        .expect(204)
        .end(function (err, res) {
          app.models.User.findOne({where: {uid: uid}, include: ['role', 'profile']}, function (err, user) {
            // second step
            restUtil.invokeUpdateProfileKYC(uid, user.profile().kyc_hash)
              .expect(204)
              .end(function (err, res) {
                app.models.User.findOne({
                  where: {uid: uid},
                  include: ['role', 'address', 'profile']
                }, function (err, user) {
                  // third step
                  restUtil.invokeUpdateProfileAML(uid, user.profile().aml_hash)
                    .expect(204)
                    .end(function (err, res) {
                      restUtil.invokeReviewDetails(authData.token, uid)
                        .expect(200)
                        .end(function (err, res) {
                          restUtil.invokeReviewApprove(authData.token, uid)
                            .expect(204)
                            .end(function (err, res) {
                              // fourth step
                              app.models.User.findOne({
                                where: {uid: uid},
                                include: ['role', 'address', 'profile']
                              }, function (err, user) {

                                // check user model
                                assert.equal(user.uid, uid, 'Incorrect user UID');
                                assert.equal(user.role().code, 'USER', 'Incorrect user role');
                                assert.equal(user.email, uid + '@email.com', 'Incorrect user email');
                                assert.equal(user.username, 'username', 'Incorrect user username');
                                // check address model
                                assert.equal(user.address().street, 'Grunwaldzka', 'Incorrect address street');
                                assert.equal(user.address().street_prefix, 'ul', 'Incorrect address street_prefix');
                                assert.equal(user.address().building_no, '81A', 'Incorrect address building_no');
                                assert.equal(user.address().apartment_no, '16', 'Incorrect address apartment_no');
                                assert.equal(user.address().city, 'Gdańsk', 'Incorrect address city');
                                assert.equal(user.address().postcode, '99-999', 'Incorrect address postcode');
                                assert.equal(user.address().post_office, 'Post office', 'Incorrect address post_office');
                                assert.equal(user.address().country_id, 1, 'Incorrect address country_id');
                                // check profile model
                                assert.equal(user.profile().currency, 'USD', 'Incorrect profile currency');
                                assert.equal(user.profile().amount, 10000.99, 'Incorrect profile amount');
                                assert.equal(user.profile().profile_type, 'PRIVATE', 'Incorrect profile profile_type');
                                assert.equal(user.profile().full_name, 'Sample full name', 'Incorrect profile full_name');
                                assert.equal(user.profile().company_name, 'Sample company name', 'Incorrect profile company_name');
                                assert.equal(user.profile().company_reg_id, '999', 'Incorrect profile company_reg_id');
                                assert.equal(user.profile().country_id, 1, 'Incorrect profile country_id');
                                assert.equal(user.profile().addr_verify_doc, 'sample address verify doc', 'Incorrect profile addr_verify_doc');
                                assert.equal(user.profile().addr_receive_eth, restUtil.test_addr_receive_eth, 'Incorrect profile addr_receive_eth');
                                assert.equal(user.profile().addr_send_eth, null, 'Profile addr_send_eth should be null');
                                assert.equal(user.profile().addr_send_btc, null, 'Profile addr_send_btc should be null');
                                // check profile model - status/hash
                                assert.equal(user.profile().flow_status, 'FIAT_PAYMENT_WAITING', 'Incorrect profile flow_status');
                                assert.equal(user.profile().kyc_status, 'APPROVED', 'Incorrect profile kyc_status');
                                assert.notEqual(user.profile().kyc_link, null, 'Profile kyc_link should not be null');
                                assert.notEqual(user.profile().kyc_hash, null, 'Profile kyc_hash should not be null');
                                if (user.profile().aml_report_cscore <= config.coinfirm.minValidScore) {
                                  assert.equal(user.profile().aml_status, 'APPROVED', 'Incorrect profile aml_status');
                                } else {
                                  assert.equal(user.profile().aml_status, 'DENIED', 'Incorrect profile aml_status');
                                }
                                assert.notEqual(user.profile().aml_link, null, 'Profile aml_link should not be null');
                                assert.notEqual(user.profile().aml_hash, null, 'Profile aml_hash should not be null');
                                assert.notEqual(user.profile().aml_report_cscore, null, 'Profile aml_report_cscore should not be null');
                                assert.notEqual(user.profile().aml_report_content, null, 'Profile aml_report_content should not be null');

                                done(err);
                              });
                            });
                        });

                    });
                });
              });
          });
        });
    });
  });

  describe('Fourth step - DENIED', function () {
    this.timeout(50000);
    it('Should update profile', function (done) {
      var uid = uuid();

      // first step
      restUtil.invokeCreateProfile(uid, 'USD', '10000.99')
        .expect(204)
        .end(function (err, res) {
          app.models.User.findOne({where: {uid: uid}, include: ['role', 'profile']}, function (err, user) {
            // second step
            restUtil.invokeUpdateProfileKYC(uid, user.profile().kyc_hash)
              .expect(204)
              .end(function (err, res) {
                app.models.User.findOne({
                  where: {uid: uid},
                  include: ['role', 'address', 'profile']
                }, function (err, user) {
                  // third step
                  restUtil.invokeUpdateProfileAML(uid, user.profile().aml_hash)
                    .expect(204)
                    .end(function (err, res) {
                      restUtil.invokeReviewDetails(authData.token, uid)
                        .expect(200)
                        .end(function (err, res) {
                          restUtil.invokeReviewDeny(authData.token, uid)
                            .expect(204)
                            .end(function (err, res) {
                              // fourth step
                              app.models.User.findOne({
                                where: {uid: uid},
                                include: ['role', 'address', 'profile']
                              }, function (err, user) {

                                // check user model
                                assert.equal(user.uid, uid, 'Incorrect user UID');
                                assert.equal(user.role().code, 'USER', 'Incorrect user role');
                                assert.equal(user.email, uid + '@email.com', 'Incorrect user email');
                                assert.equal(user.username, 'username', 'Incorrect user username');
                                // check address model
                                assert.equal(user.address().street, 'Grunwaldzka', 'Incorrect address street');
                                assert.equal(user.address().street_prefix, 'ul', 'Incorrect address street_prefix');
                                assert.equal(user.address().building_no, '81A', 'Incorrect address building_no');
                                assert.equal(user.address().apartment_no, '16', 'Incorrect address apartment_no');
                                assert.equal(user.address().city, 'Gdańsk', 'Incorrect address city');
                                assert.equal(user.address().postcode, '99-999', 'Incorrect address postcode');
                                assert.equal(user.address().post_office, 'Post office', 'Incorrect address post_office');
                                assert.equal(user.address().country_id, 1, 'Incorrect address country_id');
                                // check profile model
                                assert.equal(user.profile().currency, 'USD', 'Incorrect profile currency');
                                assert.equal(user.profile().amount, 10000.99, 'Incorrect profile amount');
                                assert.equal(user.profile().profile_type, 'PRIVATE', 'Incorrect profile profile_type');
                                assert.equal(user.profile().full_name, 'Sample full name', 'Incorrect profile full_name');
                                assert.equal(user.profile().company_name, 'Sample company name', 'Incorrect profile company_name');
                                assert.equal(user.profile().company_reg_id, '999', 'Incorrect profile company_reg_id');
                                assert.equal(user.profile().country_id, 1, 'Incorrect profile country_id');
                                assert.equal(user.profile().addr_verify_doc, 'sample address verify doc', 'Incorrect profile addr_verify_doc');
                                assert.equal(user.profile().addr_receive_eth, restUtil.test_addr_receive_eth, 'Incorrect profile addr_receive_eth');
                                assert.equal(user.profile().addr_send_eth, null, 'Profile addr_send_eth should be null');
                                assert.equal(user.profile().addr_send_btc, null, 'Profile addr_send_btc should be null');
                                // check profile model - status/hash
                                assert.equal(user.profile().flow_status, 'FIAT_REVIEW_WAITING', 'Incorrect profile flow_status');
                                assert.equal(user.profile().kyc_status, 'DENIED', 'Incorrect profile kyc_status');
                                assert.notEqual(user.profile().kyc_link, null, 'Profile kyc_link should not be null');
                                assert.notEqual(user.profile().kyc_hash, null, 'Profile kyc_hash should not be null');
                                if (user.profile().aml_report_cscore <= config.coinfirm.minValidScore) {
                                  assert.equal(user.profile().aml_status, 'APPROVED', 'Incorrect profile aml_status');
                                } else {
                                  assert.equal(user.profile().aml_status, 'DENIED', 'Incorrect profile aml_status');
                                }
                                assert.notEqual(user.profile().aml_link, null, 'Profile aml_link should not be null');
                                assert.notEqual(user.profile().aml_hash, null, 'Profile aml_hash should not be null');
                                assert.notEqual(user.profile().aml_report_cscore, null, 'Profile aml_report_cscore should not be null');
                                assert.notEqual(user.profile().aml_report_content, null, 'Profile aml_report_content should not be null');

                                done(err);
                              });
                            });
                        });
                    });
                });
              });
          });
        });
    });
  });

  describe('Fifth step - RECEIVED', function () {
    this.timeout(50000);
    it('Should update profile', function (done) {
      var uid = uuid();

      // first step
      restUtil.invokeCreateProfile(uid, 'USD', '10000')
        .expect(204)
        .end(function (err, res) {
          app.models.User.findOne({where: {uid: uid}, include: ['role', 'profile']}, function (err, user) {
            // second step
            restUtil.invokeUpdateProfileKYC(uid, user.profile().kyc_hash)
              .expect(204)
              .end(function (err, res) {
                app.models.User.findOne({
                  where: {uid: uid},
                  include: ['role', 'address', 'profile']
                }, function (err, user) {
                  // third step
                  restUtil.invokeUpdateProfileAML(uid, user.profile().aml_hash)
                    .expect(204)
                    .end(function (err, res) {
                      restUtil.invokeReviewDetails(authData.token, uid)
                        .expect(200)
                        .end(function (err, res) {
                          restUtil.invokeReviewApprove(authData.token, uid)
                            .expect(204)
                            .end(function (err, res) {
                              // fourth step
                              restUtil.invokePaymentDetails(authData.token, uid)
                                .expect(200)
                                .end(function (err, res) {
                                  restUtil.invokePaymentReceived(authData.token, uid)
                                    .expect(200)
                                    .end(function (err, res) {
                                      // fifth step

                                      app.models.User.findOne({
                                        where: {uid: uid},
                                        include: ['role', 'address', 'profile']
                                      }, function (err, user) {

                                        // check user model
                                        assert.equal(user.uid, uid, 'Incorrect user UID');
                                        assert.equal(user.role().code, 'USER', 'Incorrect user role');
                                        assert.equal(user.email, uid + '@email.com', 'Incorrect user email');
                                        assert.equal(user.username, 'username', 'Incorrect user username');
                                        // check address model
                                        assert.equal(user.address().street, 'Grunwaldzka', 'Incorrect address street');
                                        assert.equal(user.address().street_prefix, 'ul', 'Incorrect address street_prefix');
                                        assert.equal(user.address().building_no, '81A', 'Incorrect address building_no');
                                        assert.equal(user.address().apartment_no, '16', 'Incorrect address apartment_no');
                                        assert.equal(user.address().city, 'Gdańsk', 'Incorrect address city');
                                        assert.equal(user.address().postcode, '99-999', 'Incorrect address postcode');
                                        assert.equal(user.address().post_office, 'Post office', 'Incorrect address post_office');
                                        assert.equal(user.address().country_id, 1, 'Incorrect address country_id');
                                        // check profile model
                                        assert.equal(user.profile().currency, 'USD', 'Incorrect profile currency');
                                        assert.equal(user.profile().amount, 10000, 'Incorrect profile amount');
                                        assert.equal(user.profile().profile_type, 'PRIVATE', 'Incorrect profile profile_type');
                                        assert.equal(user.profile().full_name, 'Sample full name', 'Incorrect profile full_name');
                                        assert.equal(user.profile().company_name, 'Sample company name', 'Incorrect profile company_name');
                                        assert.equal(user.profile().company_reg_id, '999', 'Incorrect profile company_reg_id');
                                        assert.equal(user.profile().country_id, 1, 'Incorrect profile country_id');
                                        assert.equal(user.profile().addr_verify_doc, 'sample address verify doc', 'Incorrect profile addr_verify_doc');
                                        assert.equal(user.profile().addr_receive_eth, restUtil.test_addr_receive_eth, 'Incorrect profile addr_receive_eth');
                                        assert.equal(user.profile().addr_send_eth, null, 'Profile addr_send_eth should be null');
                                        assert.equal(user.profile().addr_send_btc, null, 'Profile addr_send_btc should be null');
                                        // check profile model - status/hash
                                        assert.equal(user.profile().flow_status, 'FIAT_REQUEST_KROWNS_SENT', 'Incorrect profile flow_status');
                                        assert.equal(user.profile().kyc_status, 'APPROVED', 'Incorrect profile kyc_status');
                                        assert.notEqual(user.profile().kyc_link, null, 'Profile kyc_link should not be null');
                                        assert.notEqual(user.profile().kyc_hash, null, 'Profile kyc_hash should not be null');
                                        if (user.profile().aml_report_cscore <= config.coinfirm.minValidScore) {
                                          assert.equal(user.profile().aml_status, 'APPROVED', 'Incorrect profile aml_status');
                                        } else {
                                          assert.equal(user.profile().aml_status, 'DENIED', 'Incorrect profile aml_status');
                                        }
                                        assert.notEqual(user.profile().aml_link, null, 'Profile aml_link should not be null');
                                        assert.notEqual(user.profile().aml_hash, null, 'Profile aml_hash should not be null');
                                        assert.notEqual(user.profile().aml_report_cscore, null, 'Profile aml_report_cscore should not be null');
                                        assert.notEqual(user.profile().aml_report_content, null, 'Profile aml_report_content should not be null');

                                        done(err);
                                      });
                                    });
                                });
                            });
                        });
                    });
                });
              });
          });
        });
    });
  });

});
