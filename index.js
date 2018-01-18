"use strict";

//#region imports
var winston = require('winston');
var https = require('https');
var events = require('events');
var os = require('os');
var fs = require('fs');

var config = require('./config.json');
var configQlikLoad = require('./config');
var exportAppByTask = require('./src/export-app-by-task-for-binary-load');
var mailingService = require('./src/mailing_module');
var qrsRoot = require('./src/qrs');
var exportAppByReload = require('./src/export-app-by-success-save-app');
var faeRoot = require('./src/full-app-export');
// var faiRoot = require('./src/full-app-import');
//#endregion

//#region Initialize Variables

// Creating Event Emiter Variable
var eventEmitter = new events.EventEmitter();

// calculating interval time in ms
var interval = config.interval * 60 * 1000;

// getting the Zertificates from Qlik
var configQlik = configQlikLoad.certs(config.certPath);

// create qrs Object to comunicate with the repository
var qrs = new qrsRoot(config, configQlik);

// creating fae Object
var fae = new faeRoot(config, configQlik);

// creating fai Object
// var fai = new faiRoot(config, configQlik);

//#endregion

//#region Initialize Logger

// Possible logging level (silly, debug, verbose, info, warn, error)
winston.level = config.logMode;
var logPath = config.logPath;

// creating log Path when not exists
fs.mkdir(logPath, function(err){
    if(err.code == 'EEXIST'){
        var path = logPath + '/index_js.log';
        winston.add(winston.transports.File, { filename: path });
        winston.log('debug', 'Logfolder exists');
    }else if (err){
      console.log(err);
        winston.add(winston.transports.File, { filename: 'index_js.log' });
        winston.log('error', 'Logfolder coud no be created; Error: ' + err.message);
    } else {
        var path = logPath + '/index_js.log';
        winston.add(winston.transports.File, { filename: path });
        winston.log('info', 'Logfolder created');
    }
});
//#endregion

//#region confirming Hostname
var host;
if (config.hostname=='') {
    try {
        host = os.hostname();
        winston.log('debug', 'Function: get Host Name; Message: Using os.hostname "'+host+'"');
    } catch (error) {
        winston.log('error', 'error while getting Host name from os')
        host = 'localhost';
    }
} else {
    host = config.hostname;
    winston.log('info', 'Function: get Host Name; Message: Using hostname from Config "'+host+'"');
};
//#endregion


//***************************//
//**** initialize Events ****//
//***************************//

// creating the error Event
eventEmitter.on('error', function(error) {
    winston.log('error', 'Error in Location: ' + error.location + '; Message: ' + error.message);
});


// abrufen aller Tasks von dem Server
eventEmitter.on('eGetAllTasks', function() {
    winston.log('debug', 'File: index.js; Event: eGetAllTasks; Message: Event called');
    qrs.getAllTasks(function(err, data) {
        if(err) {
            winston.log('error', 'File: index.js; Event: eGetAllTasks; Message: Error occures; Code: ' + err);
        } else {
            eventEmitter.emit('eGetStatusOfTasks', data);
        }
    });
});


// checks if tasks successfully finiched (status = 7 means success)
eventEmitter.on('eGetStatusOfTasks', function(data) {
    winston.log('debug', 'Event: eGetStatusOfTasks; Message: Event called')
    for(var i in data) {
        var dataErr = {
            receiverMail : config.mailingModule.receiverMail,
            taskData : data[i]
        }
        // 7 ... Erfolgreich; 8 ... Fehler
        if(data[i].operational.lastExecutionResult.status == 7) {
            winston.log('debug', 'MAIN Event: eGetStatusOfTasks - successfuly finished; Message: Task ' + data[i].name + ' successful')
            exportAppByTask.runExportApp(data[i], config, configQlik);
            mailingService.runClearErrorMailFile(dataErr);
        } else if (data[i].operational.lastExecutionResult.status == 8) {
            mailingService.runMailTaskError(dataErr, host, config.mailingModule);
            winston.log('info', 'MAIN Event: eGetStatusOfTasks - failed to finished; Message: Task ' + data[i].name + ' failed');
        }
    };
});


// abrufen aller Aps vom Server
eventEmitter.on('eGetAllApps', function() {
    winston.log('debug', 'File: index.js; Event: eGetAllApps; Message: Event called');
    qrs.getAllApps(function(err, data) {
        if(err) {
            winston.log('error', 'File: index.js; Event: eGetAllApps; Message: Error occures; Code: ' + err);
        } else {
            eventEmitter.emit('eGetStatusOfApps', data);
        }
    });
});


// checks if apps
eventEmitter.on('eGetStatusOfApps', function(data) {
    winston.log('debug', 'Event: eGetStatusOfApps; Message: Event called')
    for(var i in data) {
        winston.log('debug', 'Event: eGetStatusOfApps - successfuly finished; Message: App ' + data[i].name + ' successful')
        exportAppByReload.runExportApp(data[i], config, configQlik);

    };
});



// Start Intervall
// setInterval(function() {

  winston.log('verbose', 'Event: setInterval; Message: New Interval run')

    // eventEmitter.emit('eGetAllTasks');
    eventEmitter.emit('eGetAllApps');
    // fae.startFullExport();

// }, interval);
