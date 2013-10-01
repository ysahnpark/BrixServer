var bunyan = require('bunyan');
var WebService = require('./lib/webservice');

webservice = new WebService("BrixApp");

var app = webservice.appStartUp(); app.start();
// To use the ProcessManager comment out the line above, and uncomment below
//pMan(pManOptions);

// Handle Ctrl+C
process.on('SIGINT', function() {
    webservice.appShutDown('SIGINT', null);
});