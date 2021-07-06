'use strict';

var httpError = function (message, name, code) {
  var error = new Error(name);
  error.name = name;
  error.status = code;
  if (message !== undefined && message !== null && message != '') {
    error.message = message;
  }

  return error;
};

var ok = function(msg) {
  return {
    message: msg
  };
}

// 400 - Bad Request
var badRequest = function (message) {
  return httpError(message, 'BadRequestError', 400);
};

// 400 - Bad Request
var invalidRequest = function (field, message) {
  var msg = Array.isArray(message) ? message : [message];
  var obj = {};
  obj[field] = msg;
  return httpError(obj, 'BadRequestError', 400);
};

// 401 - Unauthorized
var unauthorized = function (message) {
  return httpError(message, 'UnauthorizedError', 401);
};

// 402 - PaymentRequired
var paymentRequired = function (message) {
  return httpError(message, 'PaymentRequiredError', 402);
};

// 403 - Forbidden
var forbidden = function (message) {
  return httpError(message, 'ForbiddenError', 403);
};

// 404 - NotFound
var notFound = function (message) {
  return httpError(message, 'NotFoundError', 404);
};

module.exports.ok = ok;
module.exports.badRequest = badRequest;
module.exports.invalidRequest = invalidRequest;
module.exports.unauthorized = unauthorized;
module.exports.paymentRequired = paymentRequired;
module.exports.forbidden = forbidden;
module.exports.notFound = notFound;
module.exports.httpError = httpError;
