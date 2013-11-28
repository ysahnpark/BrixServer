/* **************************************************************************
 * $Workfile:: utils.js                                                     $
 * *********************************************************************/ /**
 *
 * @fileoverview contains common utility methods
 *
 * Created on       Sept 16, 2013
 * @author          Young-Suk Ahn Park
 *
 * @copyright (c) 2013 Pearson, All rights reserved.
 *
 * **************************************************************************/
var http = require('http');
var bunyan = require('bunyan');
var Q = require('q'); // Promise pattern library
var request = require('request');
var redis = require('redis');

/***************************************************************************
 * Clones a JSON object.
 * 
 * @param {Object} obj      The JSON object to clone.
 ****************************************************************************/
module.exports.cloneObject = function(obj)
{
    return JSON.parse(JSON.stringify(obj));
};

/***************************************************************************
 * Does a HTTP POST request (i.e. access the REST service)
 *
 * @param {string} method      The HTTP method: GET | POST.
 * @param {string} url         The url of the REST service.
 * @param {Object} header      The fields to set in the HTTP header.
 * @param {Object} body        The content body to be sent to the service. In this
 *                             case, the sequence node request JSON.
 * @param {boolean} opt_isJson When set to true, it will parse the result body.
 *
 * @return {Promise} The object that represents the outcome of this asynch 
 *                   operation.
 *                   The successful data of the promise callback contains
 *                   the JSON object representing the sequence node.
 *
 ****************************************************************************/
module.exports.requestHttpDeferred = function (method, url, header, body, opt_isJson) {
    var deferred = Q.defer();

    if (opt_isJson === undefined)
    {
        opt_isJson = true;
    }

    // Notice that the json=true converts the response body's literal JSON into object
    var options = {
        method: method,
        uri:url,
        json:opt_isJson,
        headers: header,
        body: body
    };
    request(options, function (error, response, body) {
        var errorPayload = {};
        // For network error, error is not null
        if (error !== null) {
            errorPayload.errorOrigin = 'Server';
            errorPayload.code = 500;
            errorPayload.message = error;
            errorPayload.body = body;
            deferred.reject(errorPayload);
        }
        // For response with error, error is null but status code is >= 300 
        else if (response.statusCode >= 300)
        {
            errorPayload.errorOrigin = url;
            errorPayload.code = response.statusCode;
            errorPayload.message = http.STATUS_CODES[response.statusCode];
            errorPayload.body = body;
            deferred.reject(errorPayload);
        }
        else
        {
            deferred.resolve(body);
        }
    });

    return deferred.promise;
};

/***************************************************************************
 * Gets the logger.
 * If the config argument contains the logger field, then a child logger is
 * created and returned. Otherwise a new bunyan logger is created.
 *  
 *
 * @param {Object} config        The configuration object that may contain the
 *                               logger field.
 * @param {String} componentName The name of the component.
 *
 * @return {Logger} The reference to the newly created logger
 *
 ****************************************************************************/
module.exports.getLogger = function(config, componentName) {
    var logger = null;
    if (config.logger)
    {
        // The config.logger is reference to the main logger instance
        // Created by the application
        logger = config.logger.child({component: componentName});
    }
    else
    {
        // This condition means that the function was called either for by the 
        // main application or in context of unit test testing
        var logLevel = (config.logLevel) ? config.logLevel : 'info';
        
        var logStreams = [];
        if (config.logToFile)
        {
            logStreams.push(
            {
                level: config.logLevel,
                type: 'rotating-file',
                path: componentName + '.log',
                period: '1d',   // daily rotation
                count: 3        // keep 3 back copies
            });
        }
        if (config.logToScreen)
        {
            logStreams.push(
            {
                level: config.logLevel,
                stream: process.stderr
            });
        }
        logger = bunyan.createLogger({
            name:componentName,
            level: config.logLevel,
            streams: logStreams
        });
    }
    return logger;
};


/***************************************************************************
 * Gets the Redis client connection.
 *  
 *
 * @param {Object} config        The configuration object that contain redis 
 *                               connection info.
 *
 * @return {Logger} The reference to the newly created logger
 *
 ****************************************************************************/
module.exports.getRedisClient = function(config)
{
    var redisClient = null;
    if (config.redisClient)
    {
        redisClient = config.redisClient;
    }
    else
    {
        var redisHost = config.redisHost || null;
        var redisPort = config.redisPort || null;

        redisClient = redis.createClient(redisPort, redisHost);
        
        // Redis error check
        redisClient.on('error', function(err) {
            var logger = module.exports.getLogger(config, 'utils');
            logger.fatal('Redis Error', err);
            // Throwing error will cause the process to die.
            // Just 
        });
        /* @todo [ysap] Refactor creating a generalized DisposableResource that
                        is initialized and disposed uniformly from webservice.
        We get a 
        Error: Error while creating Redis client: Error: Redis connection to 127.0.0.1:6379 failed - connect EMFILE
        error running test-w after a handful of file saves.
        See https://github.com/mranney/node_redis/issues/435
        */
       
        // @todo - assigning redisClient reference to config will cause error when doing
        //         util.cloneObject(config).  controller.tests.js is doing so.
        //config.redisClient = redisClient;
    }
    return redisClient;
};
