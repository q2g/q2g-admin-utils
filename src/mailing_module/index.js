// load standard Moduls
var nodemailer = require("nodemailer");
var winston = require('winston');
var events = require('events');
var directTransport = require('nodemailer-direct-transport');
var smtpTransport = require('nodemailer-smtp-transport');
var fs = require('fs');

// set Variables
var eventEmitter = new events.EventEmitter();

//***************************//
//**** Initialize Events ****//
//***************************//


// creating the error Event
eventEmitter.on('error', function(error) {
    winston.log('error', 'Error in Location: ' + error.location + '; Message: ' + error.message);
});



// Check if error file already written when not write fil and start mail Event
eventEmitter.on('eCheckIfTaskIsRegistered', function(data, host, configMailingModule) {
    
    var receiverMail = data.receiverMail
    
    winston.log('debug', 'MAILING_MODULE Event: eCheckIfTaskIsRegistered; ' + data.taskData.name + '; Message: Event called');
    
//    console.log(data.taskData.operational.lastExecutionResult.details);
    
    var taskId = data.taskData.id;
    var taskName = data.taskData.name;
    var date = new Date();
    var messageLength = data.taskData.operational.lastExecutionResult.details.length;
    
//    console.log(messageLength);
//    console.log(data.taskData.operational.lastExecutionResult.details[1]);
    
    var failTimeStamp = data.taskData.operational.lastExecutionResult.details[messageLength-1].detailCreatedDate;
    var failMessage = data.taskData.operational.lastExecutionResult.details[messageLength-1].message;
    
    var dataTask = {
        taskId : data.taskData.id,
        taskName :  data.taskData.name,
        saveDate : new Date(),
        failTimeStamp : failTimeStamp,
        failMessage : failMessage,
        receiverMail : receiverMail
    };
    
    function writeFileAndCallSendMailEvent () {
        fs.writeFile(config.TaskErrorJsonFolder + '/errorFile-' + taskId + '.json', JSON.stringify(dataTask), function(err) {
            // Error during writing file
            if(err) {
                console.log('Error: ', err);
                var error = {
                    location: 'eCheckIfTaskIsRegistered - writeFileSync; Task: ' + taskName + '; ',
                    message: err.message
                };
                eventEmitter.emit('error', error);
            // file susseccfull written
            } else {
                winston.log('debug', 'MAILING_MODULE Event: eCheckIfTaskIsRegistered - readFile - writeFile; Task: ' + taskName + '; Message: file succesfull written');
                    // send Mail to admin
                    eventEmitter.emit('eSendMail', dataTask, host, configMailingModule);
            }
        })
    }
    
    fs.readFile(config.TaskErrorJsonFolder + '/errorFile-' + taskId + '.json', function(err, data) {
        // file do not exists
        if (err) {
            if (err.code == 'ENOENT') {
                writeFileAndCallSendMailEvent();
            } else {
                var error = {
                    location: 'eCheckIfTaskIsRegistered - readFileSync; Task: ' + taskName + '; ',
                    message: err.message
                };
                eventEmitter.emit('error', error);

            };
        } else {
            var obj = JSON.parse(data);
            var dateNow = new Date();
            var dateObj = new Date(obj.saveDate);
            
            console.log('dataNow: ', dateNow.getDate());
            console.log('oldDate: ', dateObj.getDate());
            
            if(dateObj.getDate() != dateNow.getDate()) {
                
                writeFileAndCallSendMailEvent()
                
            }
        };
        
    });
    
    
});


//eventEmitter.on('eSendMail', function(data, host, configMailingModule) {
//    winston.log('debug', 'MAILING_MODULE Event: eSendMail; Task: ' + data.taskName + '; Message: Event called');
//    
//    console.log(configMailingModule);
//    
//    if (configMailingModule.directMail) {
//        var transport = nodemailer.createTransport(directTransport({
//            name : 'smtp.' + host + '.com'
//        }));
//        
//    } else {
//        
//        var smtpOptions = { 
//                host: configMailingModule.host,
//                port: configMailingModule.port,
//                auth: { user: configMailingModule.userEmail, pass: configMailingModule.password },
//                secureConnection: 'false'
//            }
//        
//        var transport = nodemailer.createTransport(smtpTransport(smtpOptions));
//    }
//    
//    
//    var mailOptions = {
//        from: 'AAF <akquinet-administration-framework@aaf.com>',
//        to: configMailingModule.receiverMail, // data.receiverMail,
//        subject: 'Task Error detected',
//        html:   '<div><b></b>Hallo,</b></div>' +
//                '<br>' +
//                '<div>an error occured</div>' +
//                '<div>Hostname: ' + host + '</div>' + 
//                '<div>Task: ' + data.taskData + '</div>' +
//                '<div>Time: ' + data.failTimeStamp + '</div>' +
//                '<div>Message: ' + data.failMessage + '</div>'
//    };
//    
//    console.log('mailOptions: ', mailOptions);
//    console.log('smtpOptions: ', smtpOptions);
//    console.log('host: ', host);
//    //    transport.sendMail(mailOptions, function(err, info) {
////       if(err) {
////           console.log(err);
////           var error = {
////                location: 'eSendMail - sendMail; Task: ' + data.taskName + '; ',
////                message: err
////            };
////            eventEmitter.emit('error', error);
////       } else {
////           winston.log('debug', 'MAILING_MODULE Event: eSendMail; Task: ' + data.taskData + '; Message: Mail sended');
////       }
////    });
//    
//});

// Send Mail to reciver
eventEmitter.on('eSendMail', function(data, host, configMailingModule) {
    winston.log('debug', 'MAILING_MODULE Event: eSendMail; Task: ' + data.taskName + '; Message: Event called');
    
    console.log(configMailingModule);
    
    if (configMailingModule.directMail) {
        
        var transport = nodemailer.createTransport(directTransport({
            name : 'smtp.' + host + '.com'
        }));
        
    } else {
        
        var smtpOptions = { 
                host: configMailingModule.host,
                port: configMailingModule.port,
                auth: { user: configMailingModule.userEmail, pass: configMailingModule.password },
                secureConnection: 'false'
            }
        
        var transport = nodemailer.createTransport(smtpTransport(smtpOptions));
    }
    
    
        
    
    
    var mailOptions = {
        from: 'AAF <info@aaf.com>',
        to: configMailingModule.receiverMail, // data.receiverMail,
        subject: 'Task Error detected',
        html:   '<div><b></b>Hallo,</b></div>' +
                '<br>' +
                '<div>an error occured</div>' +
                '<div>Hostname: ' + host + '</div>' + 
                '<div>Task: ' + data.taskName + '</div>' +
                '<div>Time: ' + data.failTimeStamp + '</div>' +
                '<div>Message: ' + data.failMessage + '</div>'
    };
    
    transport.sendMail(mailOptions, function(err, info) {
       if(err) {
           console.log(err);
           var error = {
                location: 'eSendMail - sendMail; Task: ' + data.taskName + '; ',
                message: err
            };
            eventEmitter.emit('error', error);
       } else {
           winston.log('debug', 'MAILING_MODULE Event: eSendMail; Task: ' + data.taskData + '; Message: Mail sended');
       }
    });
    
});


// clean error task files
eventEmitter.on('eClearErrorMailFile', function(data) {
    var taskId = data.taskData.id;
    var taskName = data.taskData.name;
    
    fs.readFile(config.TaskErrorJsonFolder + '/errorFile-' + taskId + '.json', function(err, fileData) {
        if(err) {
            
            if (err.code == "ENOENT") {
                
                // File do not exist, so no Error for this Task
                winston.log('debug', 'MAILING_MODULE Event: eClearErrorMailFile - readFile; Task: ' + taskName + '; Message: No error file detectet on this Task');
            } else {
                var error = {
                    location: 'eClearErrorMailFile - readFileSync; Task: ' + taskName + '; Message: ' + err.message,
                    message: err.message
                };
                eventEmitter.emit('error', error);
            };
            
        } else {
            fs.unlink('Tasks/Error/errorFile-' + taskId + '.json', function(err) {
                
                // error during deleating file
                if (err) {
                    var error = {
                        location: 'eClearErrorMailFile - readFileSync - unlink; Task: ' + taskName + '; Message: ' + err.message,
                        message: err.message
                    };
                    eventEmitter.emit('error', error);
                
                // delete of the Error File was successfull
                } else {
                    winston.log('debug', 'MAILING_MODULE Event: eClearErrorMailFile; Task: ' + taskName + '; Message: Error File successfully deleated');
                }
            })
        }
    })
});


//**************************************//
// **** Initialize Export functions ****//


exports.runMailTaskError = function(data, host, configMailingModule) {
    eventEmitter.emit('eCheckIfTaskIsRegistered', data, host, configMailingModule);
};

exports.runClearErrorMailFile = function(data) {
    eventEmitter.emit('eClearErrorMailFile', data);
}