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
    winston.log('debug', 'Function: createReqObj; Message: Function called');
    var host;
    if (config.hostname=='') {
        host = os.hostname();
        winston.log('debug', 'Function: createReqObj; Message: Using os.hostname "'+host+'"');
    } else {
        host = config.hostname;
        winston.log('debug', 'Function: createReqObj; Message: Using hostname from Config "'+host+'"');
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

var convertUTCDateToLocalDate = function(date) {
    var convertdLocalTime = new Date(date);

        var hourOffset = convertdLocalTime.getTimezoneOffset() / 60;

        convertdLocalTime.setHours( convertdLocalTime.getHours() + hourOffset ); 

        return convertdLocalTime;  
}

//***************************//
//**** initialize Events ****//
//***************************//


// creating the error Event
eventEmitter.on('error', function(error) {
    winston.log('error', 'Error in Location: ' + error.location + '; Message: ' + error.message);
});

// controll if relevant Properties exists on Task
eventEmitter.on('eCheckForRelProp', function(data, controlTaskContent) {
    winston.log('debug', 'Event: eCheckForRelProp; App: ' + data.name + '; Message: Event called');
    for(var i in data.customProperties) {
        if(data.customProperties[i].definition.name == config.properties.exportDirectory) {
            winston.log('debug', 'Event: eCheckForRelProp - relProperties; Task: ' + data.name + '; Message: Event called');
            eventEmitter.emit('eCheckForFileAndInitialRun', data, data.customProperties[i].value);
        };
    };
});

// checks if file for task exist, when not create and run save app
eventEmitter.on('eCheckForFileAndInitialRun', function(data, custPropVal) {
    winston.log('debug', 'Event: eCheckForFileAndInitialRun; App: ' + data.name + '; Message: Event called');
    var controlAppContent;
    try {
        controlAppContent = fs.readFileSync(config.AppJsonFolder + '/controlApp-' + data.id + '.json');
        winston.log('debug', 'Event: eCheckForFileAndInitialRun - readFileSync; App: ' + data.name + '; Message: Content loaded');
        eventEmitter.emit('eCheckForReloadTimestamp', data, JSON.parse(controlAppContent), custPropVal);
    } catch (err) {
        if (err.code == 'ENOENT') {
            try {
                fs.writeFileSync(config.AppJsonFolder + '/controlApp-' + data.id + '.json', JSON.stringify({}))
                winston.log('debug', 'Event: eCheckForFileAndInitialRun - writeFileSync; App: ' + data.name + '; Message: empty Content written');
                controlAppContent = {};
                eventEmitter.emit('eCheckForReloadTimestamp', data, controlAppContent, custPropVal);
            } catch (err) {
                var error = {
                    location: 'eCheckForFileAndInitialRun - writeFileSync; App: ' + data.name + ';',
                    message: err.message
                };
                eventEmitter.emit('error', error);
            }
        } else {
            var error = {
                location: 'eCheckForFileAndInitialRun - readFileSync; App: ' + data.name + ';',
                message: err.message
            };
            eventEmitter.emit('error', error);
        };
    };
});

// checks if saved Timestamp is smaler then reload Timestamp
eventEmitter.on('eCheckForReloadTimestamp', function(data, controlAppContent, custPropVal) {
    winston.log('debug', 'Event: eCheckForReloadTimestamp; App: ' + data.name + '; Message: Event called');
    var obj = {
        'appId': data.id,
        'lastReloadTime': data.lastReloadTime
    };
    var appObject = {
        'id': data.id,
        'name': data.name.replace(' ', '_'),
        'path': custPropVal,
        'reloadTime': data.lastReloadTime
    };
    if(controlAppContent.lastReloadTime==null) {
        winston.log('debug', 'Event: eCheckForReloadTimestamp - if; App: ' + data.name + '; Message: no reloadtim found');
        fs.writeFile(config.AppJsonFolder + '/controlApp-' + data.id + '.json', JSON.stringify(obj), "utf8", function(err, dataWriteFile) {
            winston.log('debug', 'Event: eCheckForReloadTimestamp - fs.writeFile; Message: File controllApp.json written');
            if(err) {
                var error = {
                    location: 'eCheckForReloadTimestamp - writeFileSync; App: ' + data.name + ';',
                    message: err.message
                };
                eventEmitter.emit('error', error);
            };
        });
        eventEmitter.emit('eDownloadApp', appObject);
    } else {
        winston.log('debug', 'Event: eCheckForReloadTimestamp - if; App: ' + data.name + '; Message: reloadtim found');
        if(controlAppContent.lastReloadTime<data.lastReloadTime) {
            fs.writeFile(config.AppJsonFolder + '/controlApp-' + data.id + '.json', JSON.stringify(obj), "utf8", function(err, dataWriteFile) {
                winston.log('debug', 'Event: eCheckForReloadTimestamp - fs.writeFile; Message: File controllApp.json written');
                if(err) {
                    var error = {
                        location: 'eCheckForReloadTimestamp - writeFileSync; App: ' + data.name + ';',
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
            qrs.downloadAppPartTwo(data.id, decodeURI(data.name) + '-' + data.reloadTime.substr(0, 19).replace(':', '-').replace(':', '-') + data.id, dataDown1.value, data.path, (err, dataDown2) => {
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