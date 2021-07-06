/* Examples
  https://mochajs.org
  https://nodejs.org/docs/latest-v4.x/api/assert.html
 */

'use strict';

var passwordhasher = require('password-hasher');
var assert = require('assert');

describe('Hash', function() {
  var pass = 'test';
  var salt, hashpass;

  it('should return pass hash', function(done) {
    var out = passwordhasher.createHashAndSalt('ssha512', pass, 10);
    salt = out.salt.toString('base64');
    hashpass = out.hash.toString('base64');
    console.log(out);
    console.log('salt: ' + salt);
    console.log('hashpass: ' + hashpass);
    done();
  });

  it('should comapre pass hash', function(done) {
    var out = passwordhasher.createHash('ssha512', pass, new Buffer(salt, 'base64'));
    var hashpassToCompare = out.hash.toString('base64');
    console.log(hashpass);
    console.log(hashpassToCompare);

    assert.equal(hashpassToCompare, hashpass, 'should be equal');
    done();
  });
});



