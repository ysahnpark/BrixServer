/* **************************************************************************
 * $Workfile:: amsproxy.js                                                 $
 * *********************************************************************/ /**
 *
 * @fileoverview amsproxy is abstracts the AMS remote service.
 *
 * Created on		Sept 9, 2013
 * @author			Young-Suk Ahn Park
 *
 * @copyright (c) 2013 Pearson, All rights reserved.
 *
 * **************************************************************************/

var fs = require('fs'),
	Q = require('q'), // Promise pattern library
	request = require('request'),
	ZSchema = require('z-schema'),
	crypto = require('crypto'),
	redis = require("redis");

/* **************************************************************************
 * AMSProxy module                                                     */ /**
 *
 * Constructor.
 *
 * @constructor
 *
 * @param {Object}	config - The settings to configure this object
 *                  Required settings: amsBaseUrl - The root part of the url.
 *
 * @classdesc
 * The AMS proxy implements two methods: 1) the actual operation to retrieve
 * the sequence node, 2) the health check.
 *
 ****************************************************************************/
module.exports = function(config) {

	if(!config) {
		throw new Error('No config was supplied');
	}
	else if(!config.amsBaseUrl) 
	{
		throw new Error('Config is missing amsBaseUrl');
	}

	var logger = config.logger || function(){};

	var cachingEnabled = (config.amsCaching === undefined) ? true : config.amsCaching;
	var redisClient = null;
	if (cachingEnabled) {
		redisClient = redis.createClient();
		// Redis error check
		redisClient.on("error", function(err) {
			console.log("Error" + err);
		});

	}

	var schemaRootDir =  __dirname + '/../schema/';
	var messageSchema = JSON.parse(fs.readFileSync(schemaRootDir + 'reqseqnode.schema.json', 'utf8'));


	/***************************************************************************
	 *
	 * Returns the sequenceNodeKey from the parameter
	 * 
	 * When caching is enabled, it checks the cache (Redis) prior trying
	 * to obtain from AMS.
	 *
	 * @param {string} reqParam   The request parameters in stringified JSON.
	 *                            as sent by the ActivityManager.
	 *
	 * @return {string}           The hash value that represents the sequenceNode.
	 *                            It is guaranteed to uniquely map to a single sequence Node 
	 ****************************************************************************/
	this.obtainSequenceNodeKey = function(param)
	{
		return crypto.createHash('md5').update(param).digest("hex");
	}

	/***************************************************************************
	 *
	 * Returns the Sequence node information. It accesses a remote AMS server 
	 * to obtain the sequence node.
	 * The sequence node is returned as object through the callback's second
	 * parameter.
	 * Shall an error occur validating the input or accessing remote server, 
	 * the first parameter of the callback will be assigned accordingly.
	 * 
	 * When caching is enabled, it checks the cache (Redis) prior trying
	 * to obtain from AMS.
	 *
	 * @param {string} reqParam   The request parameters in stringified JSON.
	 *                            as sent by the ActivityManager.
	 * @param {Function} callback Callback function when operation is completed
	 *                            with signature fn(error, body)
	 *                            When successful, the body contains
	 *                            {sequenceNodeKey: <sequenceNodeKey>, data: <seq node content>}
	 *                            where data is Activity Config (parsed JSON) extracted from
	 *                            the sequence node content.
	 ****************************************************************************/
	this.getSequenceNode = function(reqParam, callback) {

		var jsonParam = JSON.parse(reqParam);
		
		var sequenceNodeKey = this.obtainSequenceNodeKey(reqParam);
		validateMessage_(jsonParam, messageSchema)
			.then(function(report){
				// Message validation success
				retrieveFromCache_(sequenceNodeKey)
					.then(function(data){
						// Successfully retrieved from Cache
						// We convert it to object first 
						var value = JSON.parse(data);
						callback(null, {sequenceNodeKey: sequenceNodeKey, data: value});
					}, function(error) {
						// Either key not found or some issue with Cache server: retrieve it from AMS
						requestPost_(config.amsBaseUrl + '/seqnode', jsonParam)
							.then(function(data){
								// Set to the cache
								var activityConfig = data.targetActivity;
								redisClient.set(sequenceNodeKey, JSON.stringify(activityConfig));
								callback(null, {sequenceNodeKey: sequenceNodeKey, data: activityConfig});
							}, function(error) {
								var errorBody ={};
								errorBody.statusCode = 500;
								errorBody.error = error;
								logger('error', 'Unable to POST ' + url, error);
								callback(error, errorBody);
							});
					})
			}, function(error){
				// Validation error case
	        	callback("Input validation error", error);
			});
		
	};

	/***************************************************************************
	 * Validates a message against the schema
	 * @private
	 *
	 * @param {Object} message   The JSON object to validate against the schema.
	 * @param {Object} schema    The JSON object that represents the schema.
	 *
	 * @return {Promise}  The object that represents the outcome of this asynch 
	 *                    operation.
	 *                    The successful data of the promise callback contains
	 *                    the validation report (saying valid = true).
	 *
	 ****************************************************************************/
	function validateMessage_(message, schema) {
		var deferred = Q.defer();

		ZSchema.validate(message, schema, function(validationRpt) {
	        if (validationRpt.valid === true) {
				deferred.resolve(validationRpt);
	        } 
	        else
	        {
	        	var errorBody = {errors: validationRpt.errors};
	        	deferred.reject(errorBody);
	        } 
	    });

		return deferred.promise;
	}

	/***************************************************************************
	 * Retrieves the sequence node from cache
	 * @private
	 *
	 * @param {string} key  The JSON object to validate against the schema.
	 *
	 * @return {Promise}  The object that represents the outcome of this asynch 
	 *                    operation. 
	 *                    The successful data of the promise callback contains
	 *                    the stringified JSON representing the sequence node.
	 *
	 ****************************************************************************/
	function retrieveFromCache_(key) {
		var deferred = Q.defer();

		redisClient.get(key, function(error, reply) {
			if (reply === null) {
				deferred.reject("Key not found");
			}
			else if (error !== null)
			{
				deferred.reject(error);
			} 
			else
			{
				deferred.resolve(reply);
			}
		});

		return deferred.promise;
	}

	/***************************************************************************
	 * Does a HTTP POST request (i.e. access the REST service)
	 * @private
	 *
	 * @param {Object} url   The url of the REST service endpoint.
	 * @param {Object} body  The content body to be sent to the service. In this
	 *                       case, the sequence node request JSON.
	 *
	 * @return {Promise} The object that represents the outcome of this asynch 
	 *                   operation.
	 *                   The successful data of the promise callback contains
	 *                   the JSON object representing the sequence node.
	 *
	 ****************************************************************************/
	function requestPost_(url, body) {
		var deferred = Q.defer();

		// Notice that the json=true converts the response body's literal JSON into object
		var options = {
			uri:url,
			json:true,
			body: body
		};
		request.post(options, function (error, response, body) {
			if (error != null) {
				var errorBody ={};
				errorBody.statusCode = 500;
				errorBody.error = error;
				logger('error', 'Unable to GET ' + url, error);
				deferred.reject(errorBody);
			}
			else 
			{
				deferred.resolve(body);
			}
		});

		return deferred.promise;
	}


	/***************************************************************************
	 * Gets the health status of the AMS server
	 *
	 ****************************************************************************/
	this.getHealth = function(callback) {
		var url = config.amsBaseUrl + '/ams/health';
		var options = {
			uri:url,
			json:true
		};
		request.get(options, function (error,response,body) {
			if (error != null) {
				var errorBody ={};
				errorBody.statusCode = 500;
				errorBody.error = error;
				logger('error', 'Unable to GET ' + url, error);
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
