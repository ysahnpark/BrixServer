/* **************************************************************************
 * $Workfile:: sequencenodeprovider.js                                                 $
 * *********************************************************************/ /**
 *
 * @fileoverview sequencenodeprovider encapsulates the retrieval of sequence
 *               node content.
 *               A specific sequence node is identified either by the sequence
 *               node identifier (a JSON construct sent by the AMS), or by 
 *               the sequence node key (a hash string obtained from the 
 *               sequence node identifier)
 *               The sequence node content can be retrieved by either of two
 *               using getSequenceNode or getSequenceNodeByKey respectively.
 *               This module implements the getSequenceNodeByKey() method by
 *               using Redis as the cache repository.
 *
 * Created on		Sept 9, 2013
 * @author			Young-Suk Ahn Park
 *
 * @copyright (c) 2013 Pearson, All rights reserved.
 *
 * **************************************************************************/

var fs = require('fs');
var Q = require('q'); // Promise pattern library
var request = require('request');
var ZSchema = require('z-schema');
var crypto = require('crypto');
var redis = require('redis'); // double

/* **************************************************************************
 * SequenceNodeProvider module                                         */ /**
 *
 * Constructor.
 *
 * @constructor
 *
 * @param {Object}	config - The settings to configure this object
 *                  Optional settings: redisHost - The Redis host name.
 *                                     redisPort - The Redis port number.
 *
 * @classdesc
 * The AMS proxy implements two methods: 1) the actual operation to retrieve
 * the sequence node, 2) the health check.
 *
 ****************************************************************************/
module.exports = function(config)
{

	if (!config) {
		throw new Error('No config was supplied');
	}
	else if (!config.amsBaseUrl)
	{
		throw new Error('Config is missing amsBaseUrl');
	}

	var logger = config.logger || function(){};

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
			throw new Error('Error while creating Redis client: ' + err);
		});
	}

	var SEQNODE_CACHE_KEY_PREFIX = 'SEQN:';

	var schemaRootDir =  __dirname + '/../schema/';
	var messageSchema = JSON.parse(fs.readFileSync(schemaRootDir + 'reqseqnode.schema.json', 'utf8'));

	this.getCacheKeyPrefix = function() {
		return SEQNODE_CACHE_KEY_PREFIX;
	};

	/***************************************************************************
	 *
	 * Returns the sequenceNodeKey from the parameter
	 * @todo: Factor out to a common library.
	 * 
	 * @param {string} sequenceNodeIdentifier   The request parameters in stringified JSON.
	 *                         as sent by the ActivityManager to retrieve the Sequence Node.
	 *
	 * @return {string}        The hash value that represents the sequenceNode.
	 *                         It is guaranteed to uniquely map to a single sequence Node 
	 ****************************************************************************/
	this.obtainSequenceNodeKey = function(sequenceNodeIdentifier)
	{
		return crypto.createHash('md5').update(sequenceNodeIdentifier).digest('hex');
	};

	/***************************************************************************
	 *
	 * Returns the Sequence node information by sequence node identifier. 
	 * It accesses a remote server, usually AMS but possibly PAF but, to obtain 
	 * the sequence node.
	 * The sequence node is returned as object through the callback's second
	 * parameter.
	 * Shall an error occur validating the input or accessing remote server, 
	 * the first parameter of the callback will be assigned accordingly.
	 * 
	 * @param {Object} sequenceNodeIdentifier   The request parameter in stringified JSON.
	 *                            as sent by the ActivityManager.
	 *                            Refer to "AMS/AMC Usage Document"
	 * @param {Function} callback Callback function when operation is completed
	 *                            with signature fn(error, body)
	 *                            When successful, the body contains
	 *                            {sequenceNodeKey: <sequenceNodeKey>, sequenceNodeContent: <seq node content>}
	 *                            where sequenceNodeContent field is the complete (unmodified) 
	 *                            Sequence Node content obtained from Hub.
	 ****************************************************************************/
	this.getSequenceNode = function(sequenceNodeIdentifier, callback) {

		var sequenceNodeKey = this.obtainSequenceNodeKey(JSON.stringify(sequenceNodeIdentifier));
		
		validateMessage_(sequenceNodeIdentifier, messageSchema)
			.then(function(report){

				var reqContent = sequenceNodeIdentifier.content;

				if (reqContent['@type'] !== 'SequenceNode') {
					callback('Input validation error', 'Wrong type, must be SequenceNode');
					return;
				}

				// Message validation success
				retrieveFromCache_(sequenceNodeKey)
					.then(function(data){
						// Successfully retrieved from Cache
						// We convert it to object first, and return only the seqNodeContent field
						var value = JSON.parse(data);
						callback(null, {sequenceNodeKey: sequenceNodeKey, sequenceNodeContent: value.sequenceNodeContent, fromCache:true});
					}, function(error) {
						// Either key not found or some issue with Cache server: retrieve it from AMS

						// Obtaining all the necessary information to make an HTTP request: 
						var reqHeader = sequenceNodeIdentifier.header;
						var reqUrl = sequenceNodeIdentifier.url || config.amsBaseUrl + '/seqnode';
						var reqMethod = sequenceNodeIdentifier.method;

						requestHttp_(reqMethod, reqUrl, reqHeader, reqContent)
							.then(function(data){
								// Set to the cache
								var cacheData = {hubSession:reqHeader['Hub­-Session'], sequenceNodeContent:data};
								redisClient.set(SEQNODE_CACHE_KEY_PREFIX + sequenceNodeKey, JSON.stringify(cacheData));
								callback(null, {sequenceNodeKey: sequenceNodeKey, sequenceNodeContent: data, fromCache:false});
							}, function(error) {
								var errorBody ={};
								errorBody.statusCode = 500;
								errorBody.error = error;
								logger('error', 'Unable to POST ' + url, error);
								callback(error, errorBody);
							});
					});
			}, function(error){
				// Validation error case
                callback('Input validation error', error);
			});
		
	};

	/***************************************************************************
	 *
	 * Returns the Sequence node information from cache by it's key.
	 * This method retrieves the information from cache, and does not perform 
	 * request to AMS or PAF Hub.
	 * 
	 * @param {string} sequenceNodeKey   The request parameters in stringified JSON.
	 *                            as sent by the ActivityManager.
	 *                            Refer to "AMS/AMC Usage Document"
	 * @param {Function} callback Callback function when operation is completed
	 *                            with signature fn(error, body)
	 *                            When successful, the body contains
	 *                            {hubSession: <sequenceNodeKey>, sequenceNodeContent: <seq node content>}
	 *                            where sequenceNodeContent field is the complete (unmodified) 
	 *                            Sequence Node content cached originally obtained from Hub.
	 *                            Notice that unlike the getSequenceNode, the first parameter
	 *                            is the hubSession and not the sequenceNodeKey.
	 ****************************************************************************/
	this.getSequenceNodeByKey = function(sequenceNodeKey, callback) {
		// Message validation success
		retrieveFromCache_(sequenceNodeKey)
			.then(function(data) {
				// Successfully retrieved from Cache
				// We convert it to object first, and return only the seqNodeContent field
				var value = JSON.parse(data);
				callback(null, value);
			}, function(error) {
				callback('SequenceNodeKey not found', 'Key ' + sequenceNodeKey + ' not in the cache.');
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

		redisClient.get(SEQNODE_CACHE_KEY_PREFIX + key, function(error, reply) {
			if (reply === null) {
				deferred.reject('Key not found');
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
	 * @param {string} url    The url of the REST service.
	 * @param {Object} header The fields to set in the HTTP header.
	 * @param {Object} body   The content body to be sent to the service. In this
	 *                        case, the sequence node request JSON.
	 * @param {string} method The HTTP method: GET | POST.
	 *
	 * @return {Promise} The object that represents the outcome of this asynch 
	 *                   operation.
	 *                   The successful data of the promise callback contains
	 *                   the JSON object representing the sequence node.
	 *
	 ****************************************************************************/
	function requestHttp_(method, url, header, body) {
		var deferred = Q.defer();

		// Notice that the json=true converts the response body's literal JSON into object
		var options = {
			method: method,
			uri:url,
			json:true,
			headers: header,
			body: body
		};
		request(options, function (error, response, body) {
			if (error !== null) {
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
	 * Gets the health status of the AMS server, the first line provider of the
	 * sequence node content.
	 *
	 ****************************************************************************/
	this.getHealth = function(callback) {
		var url = config.amsBaseUrl + '/ams/health';
		var options = {
			uri:url,
			json:true
		};
		request.get(options, function (error,response,body) {
			if (error !== null) {
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
