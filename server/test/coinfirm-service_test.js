/* Examples
  https://mochajs.org
  https://nodejs.org/docs/latest-v4.x/api/assert.html
 */

'use strict';

var assert = require('assert');
var coinfirm = require('../server/services/coinfirm');

describe('coinfirm service testing internal methods', function() {
  var uid = 'uid-hgr3j2vj';
  var address = 'uid-hgr3j2vj';
  var token;

  describe('login', function() {
    this.timeout(15000);
    it('should return token', function(done) {
      coinfirm.login(function(err, result) {
        if (err) done(err);

        // DANGER - PRIVATE TOKEN - DON'T DO THIS IN PRODUCTION
        console.log('token: ' + result.token);
        token = result.token;

        console.log(result);

        assert.ok(result);


        done();
      });
    });
  });
});

describe('coinfirm service testing external methods', function() {
  var uid = 'uid-sdfsdfasfg';
  var address = '17YKUhmPriNfrsZTPm1RHWDZLgKBS8dy6j';

  describe('request for basic report', function() {
    this.timeout(15000);
    it('should return basic report', function(done) {
      coinfirm.getBasicReport(uid, address, function(err, result) {
        if (err) done(err);

        console.log(result);

        assert.ok(result);

        done();
      });
    });
  });

  describe('request for standard report', function() {
    this.timeout(15000);
    it('should return standard report', function(done) {
      coinfirm.getStandardReport(uid, '0xc0d9a619aad5f5dd6f7cddbb577b2561cf2e7375', function(err, result) {
        if (err) done(err);

        console.log(result);
        console.log(result.cscore);

        assert.ok(result);


        done();
      });
    });
  });
});
