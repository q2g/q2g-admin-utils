var winston = require('winston');
var events = require('evenst');


var eventEmitter = new events.EventEmitter();


// download the lef File from the Server
eventEmitter.on('getLef', function() {
    console.log('Test der Ausgabe')
});





exports.getLefParameters = function() {
    
    eventEmitter.emit('getLef');
    
//    return lefObject;
    
}


