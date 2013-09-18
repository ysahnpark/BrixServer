/**
 * File that contains common utility methods.
 */
var Q = require('q'); // Promise pattern library

/**
 * Clones a JSON object
 * 
 * @param {Object} obj      The JSON object to clone.
 */
module.exports.cloneObject = function(obj)
{
    return JSON.parse(JSON.stringify(obj));
};

/***************************************************************************
 * Does a HTTP POST request (i.e. access the REST service)
 * @private
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

    if (isJson === undefined)
    {
        opt_isJson = true;
    }

	// Notice that the json=true converts the response body's literal JSON into object
	var options = {
		method: method,
		uri:url,
		json:isJson,
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