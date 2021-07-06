'use strict';

module.exports = function(Country) {

  /**
   * Get all Countries
   * @param {Function(Error, array)} callback
   */
  Country.getAllCountries = function(callback) {
    Country.find(function(err, countries) {
      if (err) {
        callback(err);
        return;
      }

      console.log('Length:', countries.length);
      callback(null, countries);
    });
  };
};
