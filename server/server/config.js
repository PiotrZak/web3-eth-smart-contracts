'use strict';

var config = require('./config.json');
var env = process.env.NODE_ENV || 'development';
var envConfig = require('./config.' + env + '.json');
config.dbConfig = require('./datasources.' + env + '.json');

// one instance jobs
var master = process.env.NODE_MASTER || false;
config.master = master;


Object.assign(config, envConfig);

config.tokenSecret = 'FGCSYWCSbyf27gfbaj432fsu9fy98a7fIUGbcCE34if2b3kwbf8wds9f823hquwfehga8d79w8fyah';

module.exports = config;
