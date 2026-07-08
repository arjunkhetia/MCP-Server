var express = require('express');
var app = express();

// Defining all the routes
var index = require('./routes/index');
var users = require('./routes/users');
var mcp = require('./routes/mcp');

// Linking all the routes
app.use('/', index);
app.use('/users', users);
app.use('/mcp', mcp);

module.exports = app;
