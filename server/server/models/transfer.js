'use strict';

var config = require('../config');

module.exports = function (Transfer) {
  /**
   *
   * @param {string} from
   * @param {string} to
   * @param {string} hash
   * @param {number} value
   * @param {Function(Error, boolean)} callback
   */

  Transfer.createInst = function (from, to, hash, value, options, callback) {
    var userId = options.user.id;

    Transfer.create({
      from: from,
      to: to,
      hash: hash,
      value: value,
      userId: userId,
    }, (err, inst) => {
      if (err)
        return callback(err, false);
      else {
        Transfer.app.models.emailQueue.addEmail({
          to: options.user.email,
          bcc: config.adminEmail,
          subject: 'Token transfer has been initiated. ',
          text: 'Token transfer has been initiated. ',
        }, {
          hash: hash,
        }, 'tokenTransferInitiated');
        return callback(null, true);
      }
    });
  };
};
