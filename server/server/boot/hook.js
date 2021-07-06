'use strict';

var firebase = require('../common/firebase')

module.exports = function (app) {
  var remotes = app.remotes();

  var skipAuthorization = [
    // '/api/users/login',
    '/api/users/register',
    '/api/users/loginprovider',
    '/api/users/refreshToken',
    '/api/countries',
    '/api/accesskeys/useKey',
    '/api/users/activateUser',
    '/api/users/getTopInvestors',
    '/api/Events',
  ]

  remotes.phases
    .addBefore('auth', '')
    .use(function (ctx, next) {
      ctx.args.options = {uid: null, user : null}

      console.log(ctx.req.originalUrl)

      if(skipAuthorization.indexOf(ctx.req.originalUrl) >= 0 || skipAuthorization.indexOf(ctx.req.originalUrl.split('?')[0]) >= 0) {
        next()
        return
      }

      if(ctx.req.originalUrl === '/api/Events' && ctx.req.method === "GET") {
        return next();
      }

      var userToken = ctx.req.header('X-Access-Token')
      firebase.admin.auth().verifyIdToken(userToken).then(decodedToken => {
        ctx.args.options.uid = decodedToken.uid
        ctx.args.options.remoteAddress = ctx.req.header('X-Forwarded-For') || ctx.req.connection.remoteAddress

        ctx.req.app.models.User.findOne({ where: { uid: decodedToken.uid }, include: ['role'] }, (err, user) => {
          if (err) {
            return ctx.res.status(401).send({ status: -1, message: err.message });
          } else if (!user) {
            return ctx.res.status(401).send({ status: -1, message: 'User not found.' });
          } else {
            ctx.args.options.user = user
            if (user.account_type === 'BLOCKED') {
              return ctx.res.status(403).send({ status: -1, message: 'Your account is disabled. Please contact Value company for details.' })
            } if (user.account_type === 'INACTIVE') {
              return ctx.res.status(403).send({ status: -1, message: 'User not activated.' })
            } else {
              next()
            }
          }
        })
      }).catch(err => {
        console.error(err)
        return ctx.res.status(401).send({ status: -1, message: 'Twoja sesja wygasła.' });
      })
    });
};
