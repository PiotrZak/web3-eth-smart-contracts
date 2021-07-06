/* Examples
  https://mochajs.org
  https://nodejs.org/docs/latest-v4.x/api/assert.html
 */

'use strict';

var assert = require('assert');
var ENUMS = require('../server/common/enums');
var decision = require('../server/services/decision');

describe('decision service test', function() {

  describe('getAmountOfKROWSByCurrencyUSD', function() {
    this.timeout(15000);
    it('should return KRS amount', function(done) {

      decision.getAmountOfKROWSByCurrency(null, ENUMS.CURRENCY.USD, 1000, function(err, result) {

        console.log(result);
        assert.ok(result);

        if (err) done(err);
        else done();
      });
    });
  });
  describe('getAmountOfKROWSByCurrencyEUR', function() {
    this.timeout(15000);
    it('should return KRS amount', function(done) {

      decision.getAmountOfKROWSByCurrency(null, ENUMS.CURRENCY.EUR, 1000, function(err, result) {

        console.log(result);
        assert.ok(result);

        if (err) done(err);
        else done();
      });
    });
  });
  describe('getAmountOfKROWSByCurrencyBTC', function() {
    this.timeout(15000);
    it('should return KRS amount', function(done) {

      decision.getAmountOfKROWSByCurrency(null, ENUMS.CURRENCY.BTC, 1, function(err, result) {

        console.log(result);
        assert.ok(result);

        if (err) done(err);
        else done();
      });
    });
  });
});
