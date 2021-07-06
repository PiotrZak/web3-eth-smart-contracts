'use strict';

module.exports = function(Event) {
  /**
  * Get all instances
  * @param {object} filter Filter
  */
  Event.getAll = function(filter = {}, callback) {
    Event.find(filter, (err, events) => {
      if (err) {
        return callback(err);
      }
      return callback(null, events, true);
    });
  };

  /**
   * Create instance
   * @param {string} name Event name
   * @param {date} date Event date
   * @param {string} place Event place
   * @param {string} url Url to event tickets
   * @param {Function(Error, boolean, string)} callback
   */

  Event.createEvent = function(options, name, date, place, url, callback) {
    if (!['ADMIN', 'OPERATOR'].includes(options.user.role().code)) {
      return callback(null, false, 'Method restricted to admin.');
    }

    Event.create({name, date, place, url}, (err, instance) => {
      if (err)
        return callback(err, false, err.message);

      return callback(null, true);
    });
  };

  /**
   * Update event instance
   * @param {object} attributes Object with attributes to change
   * @param {number} id event id
   * @param {Function(Error, boolean, string)} callback
   */

  Event.updateEvent = function(options, attributes, id, callback) {
    if (!['ADMIN', 'OPERATOR'].includes(options.user.role().code)) {
      return callback(null, false, 'Method restricted to admin.');
    }

    Event.findById(id, (err, inst) => {
      if (err)
        return callback(err, false, err.message);
      inst.updateAttributes({ ...attributes, ...{modified: new Date()} }, (err, updatedInst) => {
        if (err)
          return callback(err, false, err.message);
        return callback(null, true);
      });
    });
  };

  /**
   * Remove instance
   * @param {number} id Event id
   * @param {Function(Error, boolean, string)} callback
   */

  Event.removeEvent = function(options, id, callback) {
    if (!['ADMIN', 'OPERATOR'].includes(options.user.role().code)) {
      return callback(null, false, 'Method restricted to admin.');
    }

    Event.destroyById(id, (err) => {
      if (err)
        return callback(err);
      return callback(null, true);
    });
  };
};

// CREATE TABLE dev.vci_event (
// 	id serial NOT NULL,
// 	"name" varchar(256) NOT NULL,
// 	"date" timestamptz NOT NULL,
// 	place varchar(256) NOT NULL,
// 	url varchar(256) NULL,
// 	created timestamptz NOT NULL DEFAULT now(),
// 	modified timestamptz NOT NULL DEFAULT now()
// );

