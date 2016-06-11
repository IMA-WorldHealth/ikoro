/* jshint node:true, esversion:6*/
'use strict';

// @todo - weird bug if DNS starts offline, will remain offline without
// ever switching to 'online'

const dns = require('dns');
const MAX_FAILURES = 3;

// a countdown generator
function* countdown() {
  let i = MAX_FAILURES;
  while (i--) { yield i; }
}

// takes in f - frequency in milliseconds
function Heartbeat(f) {
  const url = 'google.com';
  const frequency = f;

  // this is the maximum number of failures before the
  let counter = countdown();

  // the callback from the heartbeat loop
  const callback = (err) => {

    const finished = counter.next().done;

    // if the counter has expired and an error has occurred,
    // set the state to offline.
    if (err && finished) {
      return offline();
    }

    // reset counter if the counter has expired
    if (finished) {
      counter = countdown();
    }

    // set to online if everything has passed so far
    online();
  };

  const online = () => {
    if (this.offline) { console.log('[Heartbeat] online.'); }
    this.online = true;
    this.offline = false;
  };

  const offline = () => {
    if (this.online) { console.log('[Heartbeat] offline.'); }
    this.online = false;
    this.offline = true;
  };

  // the loop that runs the heartbeat
  const loop = () => dns.resolve(url, callback);

  // start up loop
  setInterval(loop, frequency);

  // set heartbeat state to online
  online();
}

module.exports = Heartbeat;
