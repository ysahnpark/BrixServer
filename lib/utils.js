/* **************************************************************************
 * $Workfile:: utils.js                                                     $
 * *********************************************************************/ /**
 *
 * @fileoverview contains common utility methods
 *
 * Created on		Sept 16, 2013
 * @author			Young-Suk Ahn Park
 *
 * @copyright (c) 2013 Pearson, All rights reserved.
 *
 * **************************************************************************/

var bunyan = require('bunyan');
var Q = require('q'); // Promise pattern library
var request = require('request');

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
		if (error !== null) {
			var errorBody ={};
			errorBody.statusCode = 500;
			errorBody.error = error;
			deferred.reject(errorBody);
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
 * @return {Logger} The reference to the logger
 *
 ****************************************************************************/
module.exports.getLogger = function(config, componentName) {
	var logger = null;
	if (config.logger)
	{
		logger = config.logger.child({component: componentName});
	}
	else
	{
		logger = bunyan.createLogger({name:componentName});
	}
	return logger;
};
