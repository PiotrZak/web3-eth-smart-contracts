'use strict';

var request = require('request');
var config = require('../config');

var cachePrices = {
  'btcusd': {},
  'eurusd': {},
  'btceur': {},
  'etheur': {},
  'ethusd': {},
};

var getBTCUSDPrice = function(cb) {
  if(config.bitstamp.mockedBtcUsd)
  {
    console.log('Using mocked btcusd rate: ' + config.bitstamp.mockedBtcUsd);
    cb(null, config.bitstamp.mockedBtcUsd);
    return;
  }

  getPrice('btcusd', cb);
};

var getEURUSDPrice = function(cb) {
  if(config.bitstamp.mockedEurUsd)
  {
    console.log('Using mocked eurusd rate: ' + config.bitstamp.mockedEurUsd);
    cb(null, config.bitstamp.mockedEurUsd);
    return;
  }

  getPrice('eurusd', cb);
};

var getBTCEURPrice = function(cb) {
  if(config.bitstamp.mockedBtcEur)
  {
    console.log('Using mocked btceur rate: ' + config.bitstamp.mockedBtcEur);
    cb(null, config.bitstamp.mockedBtcEur);
    return;
  }
  
  getPrice('btceur', cb);
};

var getETHEURPrice = function(cb) {
  if(config.bitstamp.mockedEthEur)
  {
    console.log('Using mocked etheur rate: ' + config.bitstamp.mockedEthEur);
    cb(null, config.bitstamp.mockedEthEur);
    return;
  }

  getPrice('etheur', cb);
};

var getETHUSDPrice = function(cb) {
  if(config.bitstamp.mockedEthUsd)
  {
    console.log('Using mocked ethusd rate: ' + config.bitstamp.mockedEthUsd);
    cb(null, config.bitstamp.mockedEthUsd);
    return;
  }

  getPrice('ethusd', cb);
};

var getPrice = function(name, cb) {
  if (cachePrices[name].date && cachePrices[name].value && cachePrices[name].date.getTime() > getMaxTime()) {
    cb(null, cachePrices[name].value);
    return;
  } else {
    request(config.bitstamp.apiUrl + name + '/', function(error, response, body) {
      if (!error && response.statusCode === 200) {
        body = JSON.parse(body);
        if (body.last) {
          console.log('Rate ' + name + ': ' + body.last)
          cachePrices[name].date = new Date();
          cachePrices[name].value = body.last;
          cb(null, body.last);
          return;
        }
        cb(new Error('could not get price ' + name));
      }
      cb(error || response);
    });
  }
};

var getMaxTime = function() {
  return new Date().getTime() - config.bitstamp.maxTime;
};

module.exports.getBTCUSDPrice = getBTCUSDPrice;
module.exports.getEURUSDPrice = getEURUSDPrice;
module.exports.getBTCEURPrice = getBTCEURPrice;
module.exports.getETHEURPrice = getETHEURPrice;
module.exports.getETHUSDPrice = getETHUSDPrice;

