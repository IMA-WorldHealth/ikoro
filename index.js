/* jshint node:true, esversion:6*/
'use strict';

const request = require('request');
const credentials = require('./credentials');
const twilio = require('twilio')(credentials.sid, credentials.token);

const Heartbeat = require('./lib/Heartbeat');

// global constants
const OFFLINE = 'offline';
const AVAILABLE = 'available';
const UNAVAILABLE = 'unavailable';
const THRESHOLD = 70; // threshold to trigger SMS
const DELIMITER = '\t'; // tab-delimited output for readability

function send(url, body) {
  const date = new Date();

  const message = {
    to: credentials.sms.target,
    from: credentials.sms.sender,
    body
  };

  console.log(`[SMS] ${message.body}`);

  /*
  // send the SMS
  twilio.sendMessage(message, (err, res) => {
    if (err) { return console.error(err); }
    console.log(`[SMS] ${message.body}.`);
  });
 */
}

// take a measurement.
function indicator(status) {
  return { status,  timestamp: new Date() };
}

// takes in f - frequency in seconds
function Main(f) {
  const url = credentials.url.trim();
  const ms = 1000;

  console.log('Starting Main Server.');

  // the polling and timeout intervales
  const frequency = f*ms;

  // the heartbeat of the application
  const pulse = new Heartbeat(200);

  // statistics array, to be used for storing results of queries
  const stats = [];

  // we start out assuming the target is unaccessible (behind a firewall)
  let unaccessible = true;

  const callback = (err, res) => {

    // if the heartbeat if offline, the entire application is offline.  Report
    // that result.
    if (pulse.offline) {
      stats.push(indicator(OFFLINE));
      return;
    }

    // checks if the request errored.
    let errored = err || res.statusCode !== 200;

    // an error occurred in reaching the address, and the site was
    // previous accessible, send an SMS of this event.
    if (errored) {
      stats.push(indicator(UNAVAILABLE));
    } else {
      stats.push(indicator(AVAILABLE));
    }
  };

  // the digest loop runs periodically to figure out if we should alter to an accessibility
  // change
  const digest = () => {

    // skip the digest in case of no statistics
    if (!stats.length) { return; }

    // shallow copy of the array to work with
    let cp = [...stats];

    // flatten the stats array
    stats.splice(0, stats.length);

    let failures = 0;
    let success = 0;
    let offline = 0;

    cp.forEach(sample => {
      switch (sample.status) {
        case OFFLINE: return offline++;
        case AVAILABLE: return success++;
        case UNAVAILABLE: return failures++;
        default: return;
      }
    });

    // get the min and max timestamps
    let min = cp[0].timestamp;
    let max = cp[cp.length-1].timestamp;

    let failureRate = (failures / cp.length)*100;
    let successRate = (success / cp.length)*100;
    let offlineRate = (offline / cp.length)*100;

    // log line
    let line =
      `${min.toLocaleTimeString()} - ${max.toLocaleTimeString()}${DELIMITER}` +
      `${url}${DELIMITER}` +
      `${cp.length}${DELIMITER}` +
      `${offlineRate.toFixed(2)}${DELIMITER}` +
      `${successRate.toFixed(2)}${DELIMITER}` +
      `${failureRate.toFixed(2)}${DELIMITER}`;

     // log it to STDOUT
    console.log(line);

    // plug in triggers
    if (successRate < THRESHOLD) {
      send(url, line);
    }
  };

  // initialize log
  let d = DELIMITER;
  console.log(`TIMESTAMP${d}URL${d}SAMPLES${d}OFFLINE RATE (%)${d}SUCCESS RATE (%)${d}FAILURE RATE (%)`);

  // the loop to probe our target URL
  const probe = () => request.get(url, callback);

  // start the probing loop
  setInterval(probe, frequency);

  // start the digest loop
  setInterval(digest, 15*ms);
}

Main(1.2);
