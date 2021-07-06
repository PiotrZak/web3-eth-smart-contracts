'use strict';

module.exports = function(Address) {

  Address.validatesLengthOf('street', {max: 150, message: {max: 'Length is too long'}});
  // Address.validatesLengthOf('street_prefix', {max: 10, message: {max: 'Length is too long'}});
  Address.validatesLengthOf('building_no', {max: 50, message: {max: 'Length is too long'}});
  // Address.validatesLengthOf('apartment_no', {max: 50, message: {max: 'Length is too long'}});
  Address.validatesLengthOf('city', {max: 100, message: {max: 'Length is too long'}});
  Address.validatesLengthOf('postcode', {max: 100, message: {max: 'Length is too long'}});
  Address.validatesLengthOf('post_office', {max: 100, message: {max: 'Length is too long'}});

  Address.createAddressKYC = function(data, userModel, cb) {
    var address = {
      street: data.address.street,
      building_no: data.address.building_no,
      city: data.address.city,
      postcode: data.address.postcode,
      country_id: data.address.country_id,
    };

    Address.create(address, function(error, addressModel) {
      if (error) {
        console.error('Error: ', error);
        cb('Profile can not be updated');
        return;
      }

      cb(null, {address: addressModel});
    });
  };

};
