/* **************************************************************************
 * $Workfile:: webservice.js                                             $
 * *********************************************************************/ /**
 *
 * @fileoverview Wrapper around Hapi server. Based on Pearson reference app.
 *
 * This module encapsulates the collection of functions found in the original
 * app.js of the Pearson's reference application.
 * It also add logging
 *
 * Created on       Sept 23, 2013
 * @author          Young-Suk Ahn Park
 *
 * @copyright (c) 2013 Pearson, All rights reserved.
 *
 * **************************************************************************/

var bunyan = require('bunyan');
var http = require('http');
//var pMan = require('prsn.process-manager');
var Hapi = require('hapi');
var Joi = require('joi');
var configSchema = require('../configSchema.js');

module.exports = function(appName, opt_config) {

	var server_;
	var config_;

	if (opt_config === undefined)
	{
		config_ = require('config');
	}
	else if (typeof opt_config === 'string')
	{
		config_ = require(opt_config);
	}
	else
	{
		console.log('Error: config must be a string');
	}

		
	//Validate the config before we start the app
	// @todo - this probably isn't a great way at getting at the config
	var error = Joi.validate(config_.getConfigSources()[0].parsed, configSchema);

	if (!config_.controller)
	{
		config_.controller = './controller.js';
	}

	if(error) {
		throw new Error('Application config did not match the schema: ' + error);
	}

	if (!config_.logLevel)
	{
		config_.logLevel = 'info';
	}

	config_.logger = bunyan.createLogger({
		name: appName,
		level: config_.logLevel,
		streams: [
			{
				level: 'debug',
				stream: process.stdout
			},
			{
				level: config_.logLevel,
				type: 'rotating-file',
				path: appName + '.log',
				period: '1d',   // daily rotation
				count: 3        // keep 3 back copies
			}
		]
	});
	var logger = config_.logger;

	var Controller = require(config_.controller);

	this.getConfig = function ()
	{
		return config_;
	};

	/**
	 * Returns the status of the application.
	 * 
	 * @return {Object} The status of the application
	 */
	this.getAppStatus = function() {
		//return info about the app
		return {};
	};
	
	/**
	 * Sets up the application, a Hapi server.
	 * 
	 * @return {Object} The reference to the http server (created by Hapi)
	 */
	this.appStartUp = function() {
		http.globalAgent.maxSockets = config_.maxSockets;

		var serverOptions = {
			debug: {
				request: ['error', 'uncaught']
			},
			router: {
				isCaseSensitive: false
			},
			cors: true
		};

		server = new Hapi.Server(config_.host, config_.port, serverOptions);

		var controller = new Controller();
		server.route(controller.routes);
		
		logger.info('Starting server on port ' + config_.port);
		return server;
	};
	
	/**
	 * Shuts down the application.
	 * 
	 * @return {Object} The reference to the http server (created by Hapi)
	 */
	this.appShutDown = function(evt, err) {
		// @todo:  shutdown code... logging evt/err, clean up, etc.
		logger.warn('Shutting down server.');
	};

	/**
	 * Starts the http server
	 */
	this.start = function() {
		server.start();
	};

};

/*
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
 */
