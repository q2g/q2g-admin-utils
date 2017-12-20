//#region imports
var winston = require('winston');
var https = require('https');
var events = require('events');
var os = require('os');
var fs = require('fs');
var config = require('../../config.json');

var qrsRoot = require('../qrs/index.js');
var configQlikLoad = require('../../config');
//#endregion

var eventEmitter = new events.EventEmitter();
var configQlik = configQlikLoad.certs(config.certPath);
var qrs = new qrsRoot(config, configQlik);

//******************************//
//**** initialize Functions ****//
//******************************//

// creating Object for the request to the repository
var createReqObjAlt = function(path, method, config, configQlik) {
    winston.log('debug', 'File: qrs/index.js; Function: createReqObj; Message: Function called');
    var host;
    if (config.hostname=='') {
        try {
            host = os.hostname();
            winston.log('debug', 'File: qrs/index.js; Function: createReqObj; Message: Using os.hostname "'+host+'"');
        } catch (error) {
            winston.log('error', 'error while getting Host name from os')
            host = 'localhost';
        }
    } else {
        host = config.hostname;
        winston.log('debug', 'File: qrs/index.js; Function: createReqObj; Message: Using hostname from Config "'+host+'"');
    };
    return {
        hostname: host,
        port: config.portQlik,
        path: path + '?xrfkey=abcdefghijklmnop',
        method: method,
        headers: {
            'x-qlik-xrfkey' : 'abcdefghijklmnop',
            'X-Qlik-User' : 'UserDirectory= Internal; UserId= sa_repository'
        },
        key: configQlik.key,
        cert: configQlik.cert,
        ca: configQlik.ca
    };
};


//***************************//
//**** initialize Events ****//
//***************************//

// creating the error Event
eventEmitter.on('error', function(error) {
    winston.log('error', 'Error in Location: ' + error.location + '; Message: ' + error.message);
});

// controll if relevant Properties exists on Task
eventEmitter.on('eCheckForRelProp', function(data, controlTaskContent) {
    winston.log('debug', 'Event: eCheckForRelProp; Task: ' + data.name + '; Message: Event called');
    
    for(var i in data.customProperties) {
        
        if(data.customProperties[i].definition.name == config.properties.exportDirectory) {
            winston.log('debug', 'Event: eCheckForRelProp - relProperties; Task: ' + data.name + '; Message: Event called');
            eventEmitter.emit('eCheckForFileAndInitialRun', data, data.customProperties[i].value);
        };
    };
});

// checks if file for task exist, when not create and run save app
eventEmitter.on('eCheckForFileAndInitialRun', function(data, custPropVal) {
    winston.log('debug', 'Event: eCheckForFileAndInitialRun; Task: ' + data.name + '; Message: Event called');
    
    var controlTaskContent;
    try {
        controlTaskContent = fs.readFileSync(config.TaskJsonFolder + '/controlTask-' + data.id + '.json');
        winston.log('debug', 'Event: eCheckForFileAndInitialRun - readFileSync; Task: ' + data.name + '; Message: Content loaded');
        eventEmitter.emit('eCheckForReloadTimestamp', data, JSON.parse(controlTaskContent), custPropVal);
    } catch (err) {
        if (err.code == 'ENOENT') {
            try {
                fs.writeFileSync(config.TaskJsonFolder + '/controlTask-' + data.id + '.json', JSON.stringify({}))
                winston.log('debug', 'Event: eCheckForFileAndInitialRun - writeFileSync; Task: ' + data.name + '; Message: empty Content written');
                controlTaskContent = {};
                eventEmitter.emit('eCheckForReloadTimestamp', data, controlTaskContent, custPropVal);
            } catch (err) {
                var error = {
                    location: 'eCheckForFileAndInitialRun - writeFileSync; Task: ' + data.name + ';',
                    message: err.message
                };
                eventEmitter.emit('error', error);
            }
        } else {
            var error = {
                location: 'eCheckForFileAndInitialRun - readFileSync; Task: ' + data.name + ';',
                message: err.message
            };
            eventEmitter.emit('error', error);
        };
    };
});

// checks if saved Timestamp is smaler then reload Timestamp
eventEmitter.on('eCheckForReloadTimestamp', function(data, controlTaskContent, custPropVal) {
    winston.log('debug', 'Event: eCheckForReloadTimestamp; Task: ' + data.name + '; Message: Event called');
    var obj = {
        'taskId': data.id,
        'appId': data.app.id,
        'lastExecutionTimestamp': data.operational.lastExecutionResult.stopTime
    };
    var appObject = {
        'id': data.app.id,
        'name': data.app.name,
        'path': custPropVal,
    };
    if(controlTaskContent.lastExecutionTimestamp==null) {
        winston.log('debug', 'Event: eCheckForReloadTimestamp - if; Task: ' + data.name + '; Message: no reloadtim found');
        fs.writeFile(config.TaskJsonFolder + '/controlTask-' + data.id + '.json', JSON.stringify(obj), "utf8", function(err, dataWriteFile) {
            winston.log('debug', 'Event: eCheckForReloadTimestamp - fs.writeFile; Message: File controllTask.json written');
            if(err) {
                var error = {
                    location: 'eCheckForReloadTimestamp - writeFileSync; Task: ' + data.name + ';',
                    message: err.message
                };
                eventEmitter.emit('error', error);
            };
        });
        eventEmitter.emit('eDownloadApp', appObject);
    } else {
        winston.log('debug', 'Event: eCheckForReloadTimestamp - if; Task: ' + data.name + '; Message: reloadtim found');
        if(controlTaskContent.lastExecutionTimestamp<data.operational.lastExecutionResult.stopTime) {
            fs.writeFile(config.TaskJsonFolder + '/controlTask-' + data.id + '.json', JSON.stringify(obj), "utf8", function(err, dataWriteFile) {
                winston.log('debug', 'Event: eCheckForReloadTimestamp - fs.writeFile; Message: File controllTask.json written');
                if(err) {
                    var error = {
                        location: 'eCheckForReloadTimestamp - writeFileSync; Task: ' + data.name + ';',
                        message: err.message
                    };
                    eventEmitter.emit('error', error);
                };
            });
            eventEmitter.emit('eDownloadApp', appObject);
        };
    };
});

// Create Download
eventEmitter.on('eDownloadApp', function(data) {
    var appName = data.name.replace(' ', '');
    qrs.downloadAppPartOne(data.id, appName, (err, dataDown1) => {
        if (err) {
            eventEmitter.emit('error', err);
        } else {
            qrs.downloadAppPartTwo(data.id, appName, dataDown1.value, data.path, (err, dataDown2) => {
                if (err) {
                    winston.log("error", "export was not succesfull for app " + appName);
                } else {
                    winston.log("info", "App " + appName + " succesfully exported");
                }
            });
        }
    })
});


//************************//
//**** Export Moduler ****//
//************************//

exports.runExportApp = function(data, config, configQlik, callback) {

    global.config = config;
    global.configQlik = configQlik;

    eventEmitter.emit('eCheckForRelProp', data);
}