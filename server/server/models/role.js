'use strict';

module.exports = function(Role) {

    /**
     * Add a new role
     * @param {object} role json with role params
     * @param {Function(Error, number)} callback
     */
    Role.addRole = function(options, role, callback) {
      if (['ADMIN', 'OPERATOR'].includes(options.user.role().code)) {
        var returnId;
        callback(null, returnId);
      } else {callback(null, { status: -1, message: "Method restricted to admin." })}
    };

  /**
   * get list of roles
   * @param {Function(Error, object)} callback
   */
  Role.getRoles = function(callback) {
    var roles;
    Role.find(function(err, roles) {
      if (err) {
        callback(err);
        return;
      }
    callback(null, roles);
   });
  };
};
