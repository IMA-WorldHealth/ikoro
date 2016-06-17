/* jshint node:true, esversion:6*/
'use strict';

const request = require('request');
const credentials = require('./credentials');

// libraries
const Heartbeat = require('./lib/Heartbeat');
const Logger = require('./lib/Logger');
const SMS = require('./lib/SMS');

// global constants
const OFFLINE = 'offline';
const AVAILABLE = 'available';
const UNAVAILABLE = 'unavailable';
const THRESHOLD = 70; // threshold to trigger SMS

// take a measurement.
function indicator(status) {
  return { status,  timestamp: new Date() };
}

// takes in f - frequency in seconds
function Main(f) {
  console.log('Starting Main Server.');

  const url = credentials.url.trim();
  const ms = 1000;

  const logger = new Logger({ verbose: true });
  const sms = new SMS({ verbose: true, maxMessages: 2 });

  // the heartbeat of the application
  const pulse = new Heartbeat(200);

  // the polling and timeout intervales
  const frequency = f*ms;


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
    // previous accessible, record the site as unavailable
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

    let offlineRate = (offline / cp.length)*100;
    let failureRate = (failures / cp.length)*100;
    let successRate = (success / cp.length)*100;

    let report = logger.log(
      min.toLocaleTimeString(),
      url,
      cp.length,
      offlineRate.toFixed(2),
      failureRate.toFixed(2),
      successRate.toFixed(2)
    );

    // plug in triggers
    if (successRate > THRESHOLD) {
      sms.send(url, report);
    }
  };

  // initialize log
  logger.log('TIMESTAMP','URL','SAMPLES','OFFLINE RATE (%)','FAILURE RATE (%)', 'SUCCESS RATE (%)');

  // the loop to probe our target URL
  const probe = () => request.get(url, callback);

  // start the probing loop
  setInterval(probe, frequency);

  // start the digest loop
  setInterval(digest, 15*ms);
}

Main(1.2);
