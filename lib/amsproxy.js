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
 * @param {Object}		config		- The settings to configure this object
 *                      Required settiong: amsBaseUrl - The root part of the url
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

	var cachingEnabled = (config.amsCaching === undefined) ? true : config.amsCaching;
	var redisClient = null;
	if (cachingEnabled) {
		redisClient = redis.createClient();
		// Redis error check
		redisClient.on("error", function(err) {
			console.log("Error" + err);
		});
	}

	var logger = config.logger || function(){};

	var schemaRootDir =  __dirname + '/../schema/';
	var messageSchema = JSON.parse(fs.readFileSync(schemaRootDir + 'reqseqnode.schema.json', 'utf8'));

	/* **************************************************************************
	 *
	 * Returns the Sequence node information. It accesses a remote AMS server 
	 * to obtain the sequence node.
	 * The sequence node is returned as object thgourhg the callback's second
	 * parameter.
	 * Shall an error occur validating the input or accessing remote server, 
	 * the first parameter of the callback will be assigned accordingly.
	 * 
	 * When caching is enabled, it checks the cache (Redis) prior trying
	 * to obtaining from AMS.
	 *
	 * @param {string} reqPrams   The request parameters in stringified JSON.
	 *                            as sent by the ActivityManager.
	 * @param {Function} callback Callback function when operation is completed
	 *                            with signature fn(error, body)
	 *                            When successful, the body contains
	 *                            {sequenceNodeKey: <sequenceNodeKey>, body: <seq node content>}
	 */
	this.getSequenceNode = function(reqParams, callback) {

		// @todo validate reqParams
		var jsonParams = JSON.parse(reqParams);
		
		ZSchema.validate(jsonParams, messageSchema, function(validationRpt) {
	        if (validationRpt.valid === true) {

	        	// @todo if cachingEnabled try to retrieve from Redis
	        	var sequenceNodeKey = null;
	        	if (cachingEnabled) {
		        	sequenceNodeKey = crypto.createHash('md5').update(reqParams).digest("hex");
	        		redisClient.get(sequenceNodeKey, function(err, reply){
						var seqNode = null;
					});
	        	}

				var url = config.amsBaseUrl + '/seqnode';

				var options = {
					uri:url,
					json:true,
					body: jsonParams
				};
				request.post(options, function (error, response, body) {
					if (error != null) {
						var errorBody ={};
						errorBody.statusCode = 500;
						errorBody.error = error;
						logger('error', 'Unable to GET ' + url, error);
						callback(error, errorBody);
					}
					else 
					{
						// Remote call was OK, pass the response body and error back to the callback
						// @todo if cachingEnabled cache it in Redis

						if (cachingEnabled) {
							redisClient.set(sequenceNodeKey, JSON.stringify(body));
						}

						callback(error, {sequenceNodeKey: sequenceNodeKey, body: body});
					}
				});

	        } 
	        else
	        {
	        	var body = {errors: validationRpt.errors};
	        	callback("Input validation error", body);
	        } 
	    });
		
	};

	function requestPost() {

	}


	// URL:  http://<amserver>/ams/health
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
