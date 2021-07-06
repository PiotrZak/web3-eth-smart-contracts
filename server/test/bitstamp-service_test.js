/* Examples
  https://mochajs.org
  https://nodejs.org/docs/latest-v4.x/api/assert.html
 */

'use strict';

var assert = require('assert');
var restUtil = require('./utils/restUtil');
var bitstamp = require('../server/services/bitstamp');

describe('bitstamp service test', function() {

  describe('getBTCUSDPrice', function() {
    this.timeout(15000);
    it('should return last price', function(done) {

      bitstamp.getBTCUSDPrice(function(err, result) {

        console.log(result);
        assert.ok(result);

        if (err) done(err);
        else done();
      });
    });
    it('should return last price from cache', function(done) {

      restUtil.sleep(3000).then(function() {
        bitstamp.getBTCUSDPrice(function(err, result) {

          console.log(result);
          assert.ok(result);

          if (err) done(err);
          else done();
        });
      });
    });
  });

  describe('getEURUSDPrice', function() {
    this.timeout(15000);
    it('should return last price', function(done) {

      bitstamp.getEURUSDPrice(function(err, result) {

        console.log(result);
        assert.ok(result);

        if (err) done(err);
        else done();
      });
    });
  });

  describe('getBTCEURPrice', function() {
    this.timeout(15000);
    it('should return last price', function(done) {

      bitstamp.getBTCEURPrice(function(err, result) {

        console.log(result);
        assert.ok(result);

        if (err) done(err);
        else done();
      });
    });
  });

  describe('getETHEURPrice', function() {
    this.timeout(15000);
    it('should return last price', function(done) {

      bitstamp.getETHEURPrice(function(err, result) {

        console.log(result);
        assert.ok(result);

        if (err) done(err);
        else done();
      });
    });
  });

});
