var http = require('http'),
	//pMan = require('prsn.process-manager'),
	Hapi = require('hapi'),
	Joi = require('joi'),
	config = require('./config.json'),
	configSchema = require('./configSchema.js'),
	Controller = require('./lib/controller.js'),
	server, routes, serverOptions;

	
//Validate the config before we start the app
var error = Joi.validate(config, configSchema);

if(error) {
	throw new Error('Application config did not match the schema: ' + error);
}

var getAppStatus = function() {
		//return info about the app
		return {};
	},
	
	appStartUp = function() {
		http.globalAgent.maxSockets = config.maxSockets;

		serverOptions = {
			router: {
				isCaseSensitive: false
			}
		};

		server = new Hapi.Server(serverOptions.host, config.port, serverOptions);

		var controller = new Controller(config);
		server.route(controller.routes);
		
		return server;
	},
	
	appShutDown = function(evt, err) {
		// shutdown code... logging evt/err, clean up, etc.
	};

var pManOptions = {
	numWorkers: config.numWorkers,
	maxDeadWorkerSize: config.maxDeadWorkerSize,
	port: config.port,
	logger: null,
	serverType: 'hapi',
	appStartUp: appStartUp,
	appShutDown: appShutDown,
	getAppStatus: getAppStatus
};

// to help debug and only use a single process, uncomment this line:

var app = appStartUp();app.settings.port=config.port;console.log("Listening to port "+app.settings.port);app.start();
// and comment out the line below
//pMan(pManOptions);
