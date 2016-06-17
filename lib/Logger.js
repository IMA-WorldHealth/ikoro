/* jshint node:true, esversion:6*/

'use strict';

const fs = require('fs');

// defaults
const DELIMITER = '\t';
const LOG_FILE = 'http.log';
const VERBOSE = 0;


function Logger(options = {}) {
  options.delimiter = options.delimiter || DELIMITER;
  options.logFile = options.logFile || LOG_FILE;
  options.verbose = options.verbose || VERBOSE;

  const stream = fs.createWriteStream(options.logFile, {
    encoding: 'utf-8',
    flags: 'w+'
  });

  function log(...params) {
    const row = params.join(options.delimiter);
    if (options.verbose) { console.log(row); }
    stream.write(row.concat('\n'));
    return row;
  }

  return Object.assign(this, {
    log: log,
    close : () => stream.close()
  });
}

module.exports = Logger;
