// load standard Modules
var events = require('events');
var winston = require('winston');
var https = require('https');
var os = require('os');
var fs = require('fs');


// set Variables
var eventEmitter = new events.EventEmitter();

var rootConfig;
var rootConfigQlik;

//***************************//
//**** Initialice Object ****//
//***************************//

// 
var qrs = function(config, configQlik) {
    winston.log('info', 'File: qrs/index.js; Message: QRS object created ')
    
    rootConfig = config;
    rootConfigQlik = configQlik;
};


module.exports = qrs;

//***************************//
//**** private functions ****//
//***************************//

// creating Object for the request to the repository
var createReqObjAlt = function(path, method) {
    
    var config = rootConfig;
    var configQlik = rootConfigQlik;
    
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

//ey: configQlik.server_key,
//cert: configQlik.server_cert,
//ca: configQlik.ca



//****************************//
//**** Creating QRS calls ****//
//****************************//

// /qrs/app/full - get and format App information
qrs.prototype.getAllApps = function(callback) {
    winston.log('verbose', 'File: qrs/index.js; Function: getAllApps; Message: Function called')
    
    callback = (callback || null);
    
    var path = '/qrs/app/full';
    var method = 'GET';

    console.log(createReqObjAlt(path, method))
    
    https.get(createReqObjAlt(path, method), function(res) {
        winston.log('debug', 'File: qrs/index.js; Function: getAllApps; Message: Function called Method http.get()');
        var chunk = '';
        
        if(res.statusCode == 200) {
            res.on('data', function(data) {
                chunk += data + ' ';
            });

            res.on('end', function() {
                winston.log('debug', 'File: qrs/index.js; Function: getAllApps; Message: get Data from http request');
                
                var transDataRoot = JSON.parse(chunk);
                var transData = [];
                
                for (var i in JSON.parse(chunk)) {
                                        
                    var helpData = {
                        'id' : encodeURI(transDataRoot[i].id),
                        'createdDate' : transDataRoot[i].createdDate,
                        'modifiedDate' : transDataRoot[i].modifiedDate,
                        'customProperties' : transDataRoot[i].customProperties,
                        'name' : encodeURI(transDataRoot[i].name),
                        'lastReloadTime' : transDataRoot[i].lastReloadTime,
                    };
                    transData.push(helpData);
                };
                
                callback(null, transData);
                
                return ;
            });
        } else {
            winston.log('error', 'File: qrs/index.js; Function: getAllApps; Message: No Succesfull Response from Server Code: ' + res.statusCode);
            callback(new Error('https Response Code is not 200'))
        };
    }).on('error', function(error) {
        winston.log('error', 'File: qrs/index.js; Error in Location: qrs.prototype.getAllApps; Message: ' + error.message);
        callback(new Error('https Request sends back a error'))
    });
  
};

qrs.prototype.getAllTasks = function(callback) {
    winston.log('vebose', 'File: qrs/index.js; Function getAllTasks; Message: Function called');

    callback = (callback || null);

    var path = '/qrs/task/full';
    var method = 'GET';
        
    try {
        https.get(createReqObjAlt(path, method), function(res) {
            winston.log('debug', 'File: qrs/index.js; Function: getAllTasks; Message: Function called Method http.get()');
            var chunk = '';
            
            if(res.statusCode == 200) {
                res.on('data', function(data) {
                    chunk += data + ' ';
                });
                
                res.on('end', function() {
                    winston.log('debug', 'File: qrs/index.js; Function: getAllTasks; Message: get Data from http request');
                    
                    var transDataRoot = JSON.parse(chunk);
                    var transData = [];
                    
                    for (var i in JSON.parse(chunk)) {
                        
                        if(transDataRoot[i].app) { 
                        
                            var helpData = {
                                'id' : transDataRoot[i].id,
                                'operational' : transDataRoot[i].operational,
                                'name' : encodeURI(transDataRoot[i].name),
                                'customProperties' : transDataRoot[i].customProperties,
                                'app' : {
                                    'name' : encodeURI(transDataRoot[i].app.name),
                                    'id' : encodeURI(transDataRoot[i].app.id),
                                }
                            };
                        }
                        transData.push(helpData);
                    };
                    callback(null, transData);
                    return ;
                });
            } else {
                winston.log('error', 'File: qrs/index.js; Function: getAllTasks; Message: No Succesfull Response from Server Code: ' + res.statusCode);
                callback(new Error('https Response Code is not 200'));
            };
        }).on('error', function(error) {
            winston.log('error', 'File: qrs/index.js; Error in Location: qrs.prototype.getAllTasks; Message: ' + error.message);
            callback(new Error('https Request sends back a error'));
        });
    } catch (error) {
        winston.log('error', 'error in qrs.prototype.getAllTasks');
    }
};

qrs.prototype.downloadAppPartOne = function(appId, appName, callback) {
    winston.log('vebose', 'File: qrs/index.js; Function downloadAppPartOne; Message: Function called for App: ' + appName);
    
    callback = (callback || null);
    
    var path = '/qrs/app/'+appId+'/export';
    var method = 'GET';
    
    https.get(createReqObjAlt(path, method), function(res) {
        winston.log('debug', 'File: qrs/index.js; Function: downloadAppPartOne; Message: Function called Method http.get() for App: ' + appName);
        var chunk = '';
        if(res.statusCode == 200) {
            res.on('data', function(data){
                chunk += data + ' ';
            });
            
            res.on('end', function() {
                winston.log('debug', 'File: qrs/index.js; Function: downloadAppPartOne; Message: get Data from http request for App: ' + appName);
                var transDataRoot = JSON.parse(chunk);
                
                callback(null, transDataRoot);
                return;
                
            });
        } else {
            winston.log('error', 'File: qrs/index.js; Function: downloadAppPartOne; Message: No Succesfull Response from Server Code: ' + res.statusCode);
            callback(new Error('https Response Code is not 200'));
        };
        
    }).on('error', function(err) {
        winston.log('error', 'File: qrs/index.js; Error in Location: qrs.prototype.downloadAppPartOne; Message: ' + err.message);
        callback(new Error('https Request sends back a error'));
    });
    
};

qrs.prototype.downloadAppPartTwo = function(appId, appName, appExportTicker, writePath, callback) {
    winston.log('vebose', 'File: qrs/index.js; Function downloadAppPartTwo; Message: Function called for App: ' + appName);
    
    callback = (callback || null);
    
    var path = '/qrs/download/app/'+encodeURI(appId)+'/'+encodeURI(appExportTicker)+'/'+encodeURI(appName)+'.qvf';
    var method = 'GET';
    
    try {
        var binaryFile = fs.createWriteStream(writePath +'\\'+appName+'.qvf');
    } catch(err) {
        callback(new Error('fs.createWriteStream creates error'));
        return;
    };
    
    https.get(createReqObjAlt(path, method), function(res) {
        winston.log('debug', 'File: qrs/index.js; Function: downloadAppPartTwo; Message: Function called Method http.get() for App: ' + appName);
        if(res.statusCode == 200) {
            res.on('data', function(data){
                binaryFile.write(data);
            });
            
            res.on('end', function() {
                binaryFile.end();                
                winston.log('info', 'File: qrs/index.js; Function: downloadAppPartTwo; Message: App '+appName+' Createt and close');
                
                callback(null, true);
                return;
                
            });
        } else {
            winston.log('error', 'File: qrs/index.js; Function: downloadAppPartTwo; App: ' + appName + '; Message: No Succesfull Response from Server Code: ' + res.statusCode);
            callback(new Error('https Response Code is not 200'));
        };
        
    }).on('error', function(err) {
        winston.log('error', 'File: qrs/index.js; Error in Location: qrs.prototype.downloadAppPartTwo; App: ' + appName + '; Message: ' + err.message);
        callback(new Error('https Request sends back a error'));
    });
};

qrs.prototype.deleatSingleApp = function(appId, callback) {
     winston.log('verbose', 'File: qrs/index.js; Function: deleatSingleApp; Message: Function called')
    
    callback = (callback || null);
    
    var path = '/qrs/app/'+appId;
    var method = 'DELETE';
    
    https.get(createReqObjAlt(path, method), function(res) {
        winston.log('debug', 'File: qrs/index.js; Function: deleatSingleApp; Message: Function called Method http.get()');
        var chunk = '';
        
        if(res.statusCode == 200) {
            res.on('data', function(data) {
                chunk += data + ' ';
            });

            res.on('end', function() {
                winston.log('debug', 'File: qrs/index.js; Function: deleatSingleApp; Message: get Data from http request');
                
                var transDataRoot = JSON.parse(chunk);
                var transData = [];
                
                callback(null, transData);
                
                return ;
            });
        } else {
            winston.log('error', 'File: qrs/index.js; Function: deleatSingleApp; Message: No Succesfull Response from Server Code: ' + res.statusCode);
            callback(new Error('https Response Code is not 200'))
        };
    }).on('error', function(err) {
        winston.log('error', 'File: qrs/index.js; Error in Location: qrs.prototype.deleatSingleApp; Message: ' + error.message);
        callback(new Error('https Request sends back a error'))
    });
  
    
    
};

// create QRS call to get all custom Properties
qrs.prototype.getAllCustprop = function(callback) {
    winston.log('debug', 'File: qrs/index; Function: getAllCustprop; Message Function Called');
    callback = (callback || null);
    var path = '/qrs/custompropertydefinition/full';
    var method = 'GET';
    https.get(createReqObjAlt(path, method), function(res) {
        winston.log('debug', 'File:qrs/index; Function getAllCustprop->http.get; Message: called Methode http.get()');
        var chunk = '';
        if(res.statusCode == 200) {
            //console.log('if', res.statusCode);
        
            res.on('data', function(data) {
                //console.log('getData');
                chunk += data + ' ';
            });
            res.on('end', function() {
                winston.log('debu', 'File: qrs/index.js; Funktion:getAllCustprop->res.on(end); Message: http request ends');
                var transDataRoot = JSON.parse(chunk);
                var transData = [];
                //console.log(transDataRoot)
                for (var i in JSON.parse(chunk)) {
                    var helpData = {
                        'id' : encodeURI(transDataRoot[i].id),
                        'createdDate' : transDataRoot[i].createdDate,                        
                        'modifiedDate' : transDataRoot[i].modifiedDate,
                        'modifiedByUserName' : transDataRoot[i].modifiedByUserName,
                        'name' : encodeURI(transDataRoot[i].name),
                        'choiceValues' :  transDataRoot[i].choiceValues,
                        'objectTypes' : transDataRoot[i].objectTypes,
                    };
                    transData.push(helpData);
                };
                
                callback(null, transData);
                
                return ;
                
            });
        } else {
        };
    }).on('error', function(err) {
        winston.log('error', 'File: qrs/index.js; Error in Location: qrs.prototype.getAllApps; Message: ' + err.message);
        callback(new Error('https Request sends back a error'))
    });
    
};

// returns the information about one app
qrs.prototype.getApp