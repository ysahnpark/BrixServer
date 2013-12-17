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
 * Created on       Dec 13, 2013
 * @author          Young-Suk Ahn Park
 *
 * @copyright (c) 2013 Pearson, All rights reserved.
 *
 * **************************************************************************/
var os = require("os");
var bunyan = require('bunyan');
var http = require('http');
//var pMan = require('prsn.process-manager');
var Hapi = require('hapi');
var Joi = require('joi');
var configSchema = require('../configSchema.js');
var utils = require('./utils');

module.exports = function(appName, opt_config) {
    var appName_ = appName;
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

    if(error) {
        throw new Error('Application config did not match the schema: ' + error);
    }

    if (!config_.controller)
    {
        config_.controller = './controller.js';
    }

    config_.logger = utils.getLogger(config_, appName);
    var logger = config_.logger;

    var Controller = require(config_.controller);

    this.getAppName = function ()
    {
        return appName_;
    };

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

        var controller = new Controller(appName_);
        extendRoutes(this, controller);
        server.route(controller.routes);
        
        logger.info('Starting server on port ' + config_.port);
        return server;
    };

    /**
     * Extends the controller routes to include management routes: /ping /index.html, and /log
     * @param  {Webservice} self       Reference to this.
     * @param  {Controller} controller Reference to the controller that contains the list of routes
     */
    var extendRoutes = function(self, controller) {

        // This endpoint to ping
        controller.routes.push({
            method: 'GET',
            path: '/ping',
            handler: function (request) {
                logger.debug('Handling /ping');
                request.reply(os.hostname()).code(200);
            }
        });

        // This endpoint be used by HA health checker 
        controller.routes.push({
            method: 'GET',
            path: '/index.html',
            handler: function (request) {
                logger.debug('Handling /index.html');
                var nodeEnv = process.env.NODE_ENV ? process.env.NODE_ENV.toUpperCase() : "NODE_ENV undefined";
                var message = "I'm " + self.getAppName() + " with controller version " +controller.VERSION+ " on host " + os.hostname() + " (" + nodeEnv + ").";
                request.reply(message).code(200);
            }
        });

        /**
        * This route displays the log's n last lines.
        * In order to trigger this route, you can use browser to point 
        * http://<host>:<port>/log[&lines=<n>]
        * endpoint.
        *
        * @todo - Do proper unit test. =)
        *
        */
        controller.routes.push({
            method: 'GET',
            path: '/log',
            handler: function (request) {
                if (!config_.logAllowWebAccess) {
                    request.reply('Oh no, you cannot do this!').code(403);
                    return;
                }

                // obtain logFile config.
                if (config_.logToFile) {
                    // http://nodejs.org/api.html#_child_processes
                    var sys = require('sys');
                    var exec = require('child_process').exec;

                    var numLines = (request.query.lines) ? request.query.lines : 10;
                    if (numLines > 200) {
                        request.reply("Please lines < 200").code(200);
                        return;
                    }

                    var logDir = (config_.logDir) ? config_.logDir : './';
                    if (logDir.match('/$') != '/') {
                        logDir = logDir+ '/';
                    }
                    var logFilename = logDir + appName_ + '.log';
                    var commandLine = 'tail -' + numLines + ' ' + logFilename;
                    // 
                    //console.log(commandLine);

                    var fetchLogAndReturn = function (error, stdout, stderr)
                    {
                        if (!error) {
                            request.reply(stdout).code(200);
                        } else {
                            request.reply(JSON.stringify(error)).code(500);
                        }
                    };
                    exec(commandLine, fetchLogAndReturn);

                } else {
                    callback(null, "logToFile disabled");
                }

            }
        });
    };
    
    /**
     * Shuts down the application.
     * 
     */
    this.appShutDown = function(evt, err) {
        // @todo:  release Caches
        server.stop({ timeout: 1 * 1000 }, function () {
            logger.warn('Shutting down server.');
            process.exit(0);
        });
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
