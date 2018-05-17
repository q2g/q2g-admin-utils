//************************//
//**** Public Modules ****//
//************************//

var events = require('events');
var winston = require('winston');
var os = require('os');
var fs = require('fs');
var https = require('https');

//*********************//
//**** Own Modules ****//
//*********************//

var qrsRoot = require('../qrs');


//******************************//
//**** Initialize Variables ****//
//******************************//

// create event emitter
var eventEmitter = new events.EventEmitter();

var rootConfig;
var rootConfigQlik;

//***************************//
//**** Initialice Object ****//
//***************************//

var fai = function(config, configQlik) {
    winston.log('info', 'File: full-app-import/index.js; Message: fai object created ');
    
    rootConfig = config;
    rootConfigQlik = configQlik;    
//    checkAndCreateRegFolder()
};

module.exports = fai;

var qrs = new qrsRoot(rootConfig, rootConfigQlik);


//****************************//
//**** Creating fai calls ****//
//****************************//

fai.prototype.startFullImport = function() {
    eventEmitter.emit('startFullImport');
};



var helpImport = function(name) {
    
    var newName = name;
    var newNameShort = encodeURI(name.substring(0, name.length-4));
    
    
    
    var options = {
        "rejectUnauthorized": false,
       hostname: os.hostname(),
       path: '/qrs/app/import?xrfkey=0123456789abcdef&name=' + newNameShort,
       method: 'POST',
       port:4242,
        headers: {
          'x-qlik-xrfkey' : '0123456789abcdef',
          'X-Qlik-User' : 'UserDirectory= Internal; UserId= sa_repository',
          'Content-Type': 'application/json'
       },
       key: rootConfigQlik.server_key,
       cert: rootConfigQlik.server_cert,
    };

    var req = https.request(options, function (res) {
        var responseString = "";

        res.on("data", function (data) {
            responseString += data;
        });
        res.on("end", function () {
            console.log(responseString);
        });
    });
    console.log('******** Name ******', newName);
    req.write('"' + newName + '"');
    req.end();
}

//*************************//
//**** creating Events ****//
//*************************//

eventEmitter.on('startFullImport', function() {
   
    
    fs.readdir('D:/testFullExport/NeuerOrdner', function(err, data) {
        
        if(err) {
            console.log('ERROR', err)
        } else {
            for (var i in data) {
//                console.log('******** Name ****** ', data[i]);
                helpImport(data[i]);
            }
        }
        
        console.log('Data: ', data)
    })
    
    
    
    
    
    
    
});