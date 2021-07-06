'use strict'

var firebase = require('firebase');
require('firebase/auth')
var admin = require('firebase-admin');
var serviceAccount = require('./valuedao-firebase-adminsdk-tdyjw-0d5485e15e.json');

var config = {
  apiKey: "AIzaSyCEiYor31H1wFWjUYGHEJrkMHRO5S_wOOQ",
  authDomain: "valuedao.firebaseapp.com",
  databaseURL: "https://valuedao.firebaseio.com",
  projectId: "valuedao",
  storageBucket: "valuedao.appspot.com",
  messagingSenderId: "231081127039"
};

var app = firebase.initializeApp(config);
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://valuedao.firebaseio.com"
});

module.exports = {
  app: app,
  admin: admin
};