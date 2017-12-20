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

var fae = function(config, configQlik) {
    winston.log('info', 'File: full-app-export/index.js; Message: fae object created ');
    
    rootConfig = config;
    rootConfigQlik = configQlik;    
    checkAndCreateRegFolder()
};

module.exports = fae;

var qrs = new qrsRoot(rootConfig, rootConfigQlik);


//***************************//
//**** private functions ****//
//***************************//

var checkAndCreateRegFolder = function() {
    fs.mkdir(rootConfig.fullAppExportModule.exportPath+'/regFile', function(err) {
        if (err) {
            if(err.code == 'EEXIST') {
                winston.log('debug', 'File: full-app-export/index.js; Funktion: checkAndCreateRegFolder; Message: Folder already exists');
            } else {
                winston.log('error', 'File: full-app-export/index.js; Funktion: checkAndCreateRegFolder; Message: Logfolder coud no be created; Error: ' + err.message);
            };
        } else {
            winston.log('info', 'File: full-app-export/index.js; Funktion: checkAndCreateRegFolder; Message: Folder created');
        }
    });
};

var checkAndCreateRegFile = function(fileName) {
    var controlTaskContent;
    try {
        controlTaskContent = JSON.parse(fs.readFileSync(rootConfig.fullAppExportModule.exportPath + '/regFile/' + fileName));
        winston.log('debug', 'File: full-app-export/index.js; Function: checkAndCreateRegFile - readFileSync; Message: Content loaded');
        return controlTaskContent;
    } catch (err) {
        if (err.code == 'ENOENT') {            
            try {
                
                controlTaskContent = {
                    writable : true,
                    dateTime : ''
                };
                
                fs.writeFileSync(rootConfig.fullAppExportModule.exportPath + '/regFile/'  + fileName, JSON.stringify(controlTaskContent));
                winston.log('debug', 'File: full-app-export/index.js; Function: checkAndCreateRegFile - writeFileSync; Message: empty Content written');
                
    
                
                return controlTaskContent;
            } catch (err) {
                winston.log('error', 'File: full-app-export/index.js; Function: checkAndCreateRegFile; Message: Error occured; Error: ' + err);
            }
        } else {
            winston.log('error', 'File: full-app-export/index.js; Function: checkAndCreateRegFile; Message: Error occured; Error: ' + err);
            
        };
    };
    
};

//****************************//
//**** Creating fae calls ****//
//****************************//

fae.prototype.startFullExport = function() {
    eventEmitter.emit('startMonthlyExport');
    eventEmitter.emit('startWeeklyExport');
    eventEmitter.emit('startDailyExport');
}

//*************************//
//**** creating Events ****//
//*************************//

eventEmitter.on('startMonthlyExport', function(){
    winston.log('debug', 'File: full-app-export/index.js; Event: startMonthlyExport; Message: Event called');
    
    var fileName = 'monthlyInit.json';
    
    // read in of the Values from the Config
    var runMonthlyBool = rootConfig.fullAppExportModule.automatic.monthly.activate;
    var runMonthlyDayOfMonth = rootConfig.fullAppExportModule.automatic.monthly.dayOfMonth;
    var runMonthlyStartDate = rootConfig.fullAppExportModule.automatic.monthly.startDate;
    var runMonthlyStartTime = rootConfig.fullAppExportModule.automatic.monthly.startTime;
                
    // get current Time Stamp    
    var today = new Date();
    
    // modify Date to readable JavaScript Date
    var helpconfigDate = runMonthlyStartDate.substr(3, 3) + runMonthlyStartDate.substr(0, 3) + runMonthlyStartDate.substr(6, 4);
    
    // Creat formated Timstamp    
    var configDate = new Date(Date.parse(helpconfigDate + ' ' + rootConfig.fullAppExportModule.automatic.monthly.startTime));
    
    // check if monthly ist activatet and date is in path
    if (runMonthlyBool && today>=configDate) {

        // get the init File if existing
        var monthlyInitial = checkAndCreateRegFile(fileName);
        
        // check if init file has the correct properties
        if(monthlyInitial.writable) {
            winston.log('debug', 'File: full-app-export/index.js; Event: startMonthlyExport - if(monthlyInitial.writable); Message: conditions true for run Export');
            
            today.setDate(runMonthlyDayOfMonth);
            today.setHours(runMonthlyStartTime.substr(0,2));
            today.setMinutes(runMonthlyStartTime.substr(3,2));
            today.setSeconds(0);
            
            var nextDate = new Date(today.setMonth(today.getMonth() + 1));
            
            var monthlyInitial = {
                writable : false,
                dateTime : nextDate
            };
            
            fs.writeFileSync(rootConfig.fullAppExportModule.exportPath + '/regFile/'  + fileName, JSON.stringify(monthlyInitial));
            
            eventEmitter.emit('getAllApps')
                    
        } else if (new Date(monthlyInitial.dateTime)<=new Date()) {
            winston.log('debug', 'File: full-app-export/index.js; Event: startMonthlyExport - else if (new Date(monthlyInitial.dateTime)<=new Date()); Message: conditions will be set of true for next run');
                        
            var monthlyInitial = {
                writable : true,
                dateTime : today
            };
            
            fs.writeFileSync(rootConfig.fullAppExportModule.exportPath + '/regFile/'  + fileName, JSON.stringify(monthlyInitial));
                      
        }; 
              
    };
    
});

eventEmitter.on('startWeeklyExport', function(){
    winston.log('debug', 'File: full-app-export/index.js; Event: startWeeklyExport; Message: Event called');
    
    var fileName = 'weeklyInit.json';
    
    // read in of the Values from the Config
    var runWeeklyBool = rootConfig.fullAppExportModule.automatic.weekly.activate;
    var runWeeklyDayOfWeek = rootConfig.fullAppExportModule.automatic.weekly.weekDay;
    var runWeeklyStartDate = rootConfig.fullAppExportModule.automatic.weekly.startDate;
    var runWeeklyStartTime = rootConfig.fullAppExportModule.automatic.weekly.startTime;
                    
    // get current Time Stamp    
    var today = new Date();
    
    // modify Date to readable JavaScript Date
    var helpconfigDate = runWeeklyStartDate.substr(3, 3) + runWeeklyStartDate.substr(0, 3) + runWeeklyStartDate.substr(6, 4);
    
    // Creat formated Timstamp    
    var configDate = new Date(Date.parse(helpconfigDate + ' ' + rootConfig.fullAppExportModule.automatic.weekly.startTime));
    
    // check if monthly ist activatet and date is in path
    if (runWeeklyBool && today>=configDate) {
        // get the init File if existing
        var weeklyInitial = checkAndCreateRegFile(fileName);
        
        // check if init file has the correct properties
        if(weeklyInitial.writable) {
            winston.log('debug', 'File: full-app-export/index.js; Event: startWeeklyExport - if(weeklyInitial.writable); Message: conditions true for run Export');

            var assistTodayDay = today.getDate();
            var assistTodayWeekDay = today.getDay();
            var helpSetDate = 0;
            
            
            if(assistTodayWeekDay == runWeeklyDayOfWeek) {
                helpSetDate = 7;
            } else if (assistTodayWeekDay < runWeeklyDayOfWeek) {
                helpSetDate = runWeeklyDayOfWeek - helpSetDate + 1;
            } else if (assistTodayWeekDay > runWeeklyDayOfWeek) {
                helpSetDate = 6 - assistTodayWeekDay + runWeeklyDayOfWeek + 1;
            }
            
            today.setHours(runWeeklyStartTime.substr(0,2));
            today.setMinutes(runWeeklyStartTime.substr(3,2));
            today.setSeconds(0);
            
            var nextDate = new Date(today.setDate(today.getDate() + helpSetDate));
            
            var weeklyInitial = {
                writable : false,
                dateTime : nextDate
            };
            
            fs.writeFileSync(rootConfig.fullAppExportModule.exportPath + '/regFile/'  + fileName, JSON.stringify(weeklyInitial));
            
            eventEmitter.emit('getAllApps')
                    
        } else if (new Date(weeklyInitial.dateTime)<=new Date()) {
            winston.log('debug', 'File: full-app-export/index.js; Event: startWeeklyExport - else if (new Date(monthlyInitial.dateTime)<=new Date()); Message: conditions will be set of true for next run');
                        
            var weeklyInitial = {
                writable : true,
                dateTime : today
            };
            
            fs.writeFileSync(rootConfig.fullAppExportModule.exportPath + '/regFile/'  + fileName, JSON.stringify(weeklyInitial));
                      
        }; 
              
    };
});

eventEmitter.on('startDailyExport', function(){
    
    winston.log('debug', 'File: full-app-export/index.js; Event: startDailyExport; Message: Event called');
    
    var fileName = 'dailyInit.json';
    
    // read in of the Values from the Config
    var runDailyBool = rootConfig.fullAppExportModule.automatic.daily.activate;
    var runDailyStartDate = rootConfig.fullAppExportModule.automatic.daily.startDate;
    var runDailyStartTime = rootConfig.fullAppExportModule.automatic.daily.startTime;
                    
    // get current Time Stamp    
    var today = new Date();
    
    // modify Date to readable JavaScript Date
    var helpconfigDate = runDailyStartDate.substr(3, 3) + runDailyStartDate.substr(0, 3) + runDailyStartDate.substr(6, 4);
    
    // Creat formated Timstamp    
    var configDate = new Date(Date.parse(helpconfigDate + ' ' + rootConfig.fullAppExportModule.automatic.daily.startTime));
    
    // check if monthly ist activatet and date is in path
    if (runDailyBool && today>=configDate) {
        
        // get the init File if existing
        var dailyInitial = checkAndCreateRegFile(fileName);
        
        // check if init file has the correct properties
        if(dailyInitial.writable) {
            winston.log('debug', 'File: full-app-export/index.js; Event: startDailyExport - if(dailyInitial.writable); Message: conditions true for run Export');


            today.setHours(runDailyStartTime.substr(0,2));
            today.setMinutes(runDailyStartTime.substr(3,2));
            today.setSeconds(0);
            
            var nextDate = new Date(today.setDate(today.getDate() + 1));
            
            var dailyInitial = {
                writable : false,
                dateTime : nextDate
            };
            
            fs.writeFileSync(rootConfig.fullAppExportModule.exportPath + '/regFile/'  + fileName, JSON.stringify(dailyInitial));
            
            eventEmitter.emit('getAllApps')
                    
        } else if (new Date(dailyInitial.dateTime)<=new Date()) {
            winston.log('debug', 'File: full-app-export/index.js; Event: startDailyExport - else if (new Date(dailyInitial.dateTime)<=new Date()); Message: conditions will be set of true for next run');
                        
            var dailyInitial = {
                writable : true,
                dateTime : today
            };
            
            fs.writeFileSync(rootConfig.fullAppExportModule.exportPath + '/regFile/'  + fileName, JSON.stringify(dailyInitial));
                      
        }; 
              
    };
    
});

eventEmitter.on('getAllApps', function(){
    winston.log('debug', 'File: full-app-export/index.js; Event: getAllApps; Message: Event Called');
    qrs.getAllApps(function(err, data) {
        if(err) {
            winston.log('error', 'File: full-app-export/index.js; Event: getAllApps; Message: Error occured; Error: ' + err);           
        } else {
            for (var i in data) {
                eventEmitter.emit('exportApp', data[i]);
            }
        };
    })
});

eventEmitter.on('exportApp', function(data) {
    qrs.downloadAppPartOne(data.id, data.name, function(err, dataCall){
        if(err) {
            winston.log('error', 'File: full-app-export/index.js; Event: exportApp; Message: Error occured; Error: ' + err);
        } else {
            qrs.downloadAppPartTwo(data.id, data.name, dataCall.value, config.fullAppExportModule.exportPath, function(err, data) {
                if(err) {
                    winston.log('error', 'File: full-app-export/index.js; Event: exportApp; Message: Error occured; Error: ' + err);
                } else {
                    winston.log('info', 'File: full-app-export/index.js; Event: exportApp; Message: App with name ' + data.name + ' exported');
               
                };
            });
        };
    })
});


