/* jshint node:true, esversion:6*/
'use strict';

const credentials = require('../credentials');
const client = new require('twilio')(credentials.sid, credentials.token);

// global constants
const VERBOSE = 0;
const MAX_MESSAGES = 6; // this could be Infinity, probably should be a round number

function SMS(options={}) {
  options.verbose = options.verbose || VERBOSE;
  options.maxMessages = options.maxMessages || MAX_MESSAGES;

  let counter = 0;
  const message = {
    to: credentials.sms.target,
    from: credentials.sms.sender
  };

  function callback(err, res) {
    if (err) { return console.error(err); }
    if (options.verbose) { console.log(`[SMS] ${message.body}.`); }
  }

  function send(url, body) {
    const date = new Date();

    message.body = body;

    if (counter++ < options.maxMessages) {
      client.sms.messages.post(message, callback);
    }
  }

  return Object.assign(this, { send });
}


module.exports = SMS;
