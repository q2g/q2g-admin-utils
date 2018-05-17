var fs = require('fs');

module.exports = {};

module.exports.certs = function(obj) {
    return {
        server_key: fs.readFileSync(obj + '/server_key.pem'),
	   server_cert: fs.readFileSync(obj + '/server.pem'),
	   key: fs.readFileSync(obj + '/client_key.pem'),
	   cert: fs.readFileSync(obj + '/client.pem'),
	   ca: fs.readFileSync(obj + '/root.pem')
    };
};
