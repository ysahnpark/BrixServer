/* **************************************************************************
 * $Workfile:: ceproxy.js                                                   $
 * *********************************************************************/ /**
 *
 * @fileoverview ceproxy manages calls to the CorrectnessEngine
 *
 * Created on		Oct 1, 2013
 * @author			Seann Ives
 *
 * @copyright (c) 2013 Pearson, All rights reserved.
 *
 * **************************************************************************/
var request = require('request');
var config = require('config');
var utils = require('./utils');

module.exports.CEProxy = function() {
	
	var logger = utils.getLogger(config, 'ceproxy');

	/**
	 * Sends Assessment submission to the Correctness Engine.
	 * @param  {Object}   param     Contains ...
	 * @param  {Function} callback  Callback function when this async operation is completed
	 *                              First argument is error (if any), second argument is the
	 *                              result data
	 * @return {[type]}
	 */
	this.sendSubmission = function(param, callback)
	{
		var url = config.ceBaseUrl + '/assessments';

		var reqHeader = {
		};

		utils.requestHttpDeferred('POST', url, reqHeader, param.body)
			.then(function(data){
				// @todo: confirm that the business error is returned in error field
				if (data.error === undefined)
				{
					callback(null, data);
				}
				else
				{
					callback(data.error, data);
				}
				
			}, function(error) {
				var errorBody ={};
				errorBody.statusCode = 500;
				errorBody.error = error;
				logger.error('Unable to POST ' + url, error);
				callback(error, errorBody);
			});
	};
	
	// @todo: si - put a comment on this and make sure it's wired up to the rest of the getHealth stuff
	// it requires we put a /health endpoint on our CE.
	this.getHealth = function(callback)
	{
		var url = config.ceBaseUrl + '/health';
		var options = {
			uri:url,
			json:true
		};
		request.get(options, function (error,response,body) {
			if (error !== null) {
				var errorBody = {};
				errorBody.statusCode = 500;
				errorBody.error = error;
				logger.error('Unable to GET ' + url, error);
				callback(error,errorBody);
			}
			else {
				body.statusCode = response.statusCode;
				// pass the response body and error back to the callback
				callback(error,body);
			}
		});
	};
};

