'use strict';
// http://expressjs.com/en/guide/using-middleware.html

// Error-handling middleware always takes four arguments. You must provide four arguments to identify it
// as an error-handling middleware function.
// Even if you don’t need to use the next object, you must specify it to maintain the signature.
// Otherwise, the next object will be interpreted as regular middleware and will fail to handle errors.
module.exports = function() {
  return function errorHandler(err, req, res, next) {
    console.log('Error handler catch error: ' + err.name);
    console.log(err);

    if (err.name === 'UnauthorizedError')
      res.status(401).send({error: 'UnauthorizedError', message: 'No session token.'}); else
    if (err.name === 'JsonWebTokenError')
      res.status(401).send({error: 'JsonWebTokenError', message: 'Invalid session token.'}); else
    if (err.name === 'TokenExpiredError')
      res.status(401).send({error: 'TokenExpiredError', message: 'Session token expired.'}); else
    if (err.name === 'BadRequestError')
      res.status(err.status).send({error: 'BadRequestError', message: err.message}); else
    if (err.name === 'ForbiddenError')
      res.status(err.status).send({error: 'ForbiddenError', message: 'forbidden'}); else
    if (err.name === 'UnauthorizedError')
      res.status(err.status).send({error: 'UnauthorizedError', message: 'authorized'}); else
    if (err.name === 'NotFoundError')
      res.status(err.status).send({error: 'NotFoundError', message: 'not found'}); else
    if (err.status < 600 && err.status > 100)
      res.status(err.status).send({error: err.code, message: err.message}); else
    if (err.code)
      res.status(500).send({error: err.code, message: err.message}); else

        res.status(500).send({error: true, message: err.toString()});

    next(); // do not stop req-res cycle - execute next middleware function in the cycle
  };
};
