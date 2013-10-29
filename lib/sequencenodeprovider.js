/* **************************************************************************
 * $Workfile:: sequencenodeprovider.js                                                 $
 * *********************************************************************/ /**
 *
 * @fileoverview sequencenodeprovider encapsulates the retrieval of sequence
 *               node content and manipulation of it including sanitization
 *               and answerKey obtention.
 *               A specific sequence node is identified either by the sequence
 *               node identifier (a JSON construct sent by the AMS), or by 
 *               the sequence node key (a hash value, a string, obtained from the 
 *               sequence node identifier)
 *               The sequence node content can be retrieved by either of two
 *               using getSequenceNode or getSequenceNodeByKey respectively.
 *               This module implements the getSequenceNodeByKey() method by
 *               using Redis as the cache repository.
 *
 * Created on       Sept 9, 2013
 * @author          Young-Suk Ahn Park
 *
 * @copyright (c) 2013 Pearson, All rights reserved.
 *
 * **************************************************************************/
var config = require('config');
var fs = require('fs');
var Q = require('q'); // Promise pattern library
var request = require('request');
var ZSchema = require('z-schema');
var crypto = require('crypto');
var redis = require('redis'); // double
var utils = require('./utils');

/* **************************************************************************
 * SequenceNodeProvider module                                         */ /**
 *
 * Constructor.
 *
 * @constructor
 *
 * @classdesc
 * The SequenceNodeProvider encapsulates functionalities to obtain and 
 * manipulate sequence node contents.
 *
 ****************************************************************************/
module.exports.SequenceNodeProvider = function()
{

    var logger = utils.getLogger(config, 'sequencenodeprovider');

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
            logger.error('Redis Error', err);
            throw new Error('Error while creating Redis client: ' + err);
        });
        /* @todo - shall we set config.redisClient = redisClient here?
        //config.redisClient = redisClient;

        We get a 
        Error: Error while creating Redis client: Error: Redis connection to 127.0.0.1:6379 failed - connect EMFILE
        error running test-w after a handful of file saves.
        See https://github.com/mranney/node_redis/issues/435
        */
    }

    var SEQNODE_CACHE_KEY_PREFIX = 'SEQN:';

    var schemaRootDir =  __dirname + '/../schema/';
    var messageSchema = JSON.parse(fs.readFileSync(schemaRootDir + 'reqseqnode.schema.json', 'utf8'));

    this.getCacheKeyPrefix = function() {
        return SEQNODE_CACHE_KEY_PREFIX;
    };

    /***************************************************************************
     *
     * Returns the sequenceNodeKey from the the sequenceNodeIdentifier.
     * The sequenceNodeKey is a hashed value from the sequenceNodeIdentifier used
     * across the Brix components to uniquely identify a sequence node.
     * 
     * @param {Object} sequenceNodeIdentifier   The request parameters in stringified JSON.
     *                         as sent by the ActivityManager to retrieve the Sequence Node.
     *
     * @return {string}        The hash value that represents the sequenceNode.
     *                         It is guaranteed to uniquely map to a single Sequence Node.
     ****************************************************************************/
    this.obtainSequenceNodeKey = function(sequenceNodeIdentifier)
    {
        stringifiedSeNodeIdentifier = JSON.stringify(sequenceNodeIdentifier);
        return crypto.createHash('md5').update(stringifiedSeNodeIdentifier).digest('hex');
    };

    /***************************************************************************
     *
     * Returns the Sequence node information given a sequenceNodeIdentifier. 
     * It accesses a remote server, usually AMS but possibly PAF, to retrieve 
     * the sequence node content.
     * The sequence node content is returned through the callback's as part of 
     * the result object which also contains the 'sequenceNodeKey' and 'fromCache'
     * attributes. The fromCache indicates whether the node content was obtained
     * from cache or not (e.g. remote)
     * 
     * Shall an error occur validating the input or accessing remote server, 
     * the first parameter of the callback will be assigned accordingly.
     * 
     * @param {Object} sequenceNodeIdentifier   The JSON object as sent by the 
     *                            ActivityManager.
     *                            Refer to "AMS/AMC Usage Document"
     * @param {Function} callback Callback function when operation is completed
     *                            with signature fn(error, body)
     *                            When successful, the body contains
     *                            {sequenceNodeKey: <sequenceNodeKey>, sequenceNodeContent: <seq node content>}
     *                            where sequenceNodeContent field is the complete (unmodified) 
     *                            Sequence Node content obtained from Hub.
     ****************************************************************************/
    this.getSequenceNode = function(sequenceNodeIdentifier, callback)
    {

        var sequenceNodeKey = this.obtainSequenceNodeKey(sequenceNodeIdentifier);

        // @todo: [ysahn] For some reason the required field "Content-Type" is causing validation to fail
        //        I had to remove it from the reqseqnode.schema.json
//console.log("SNP-Header:" + JSON.stringify(sequenceNodeIdentifier.header));
        validateMessage_(sequenceNodeIdentifier, messageSchema)
            .then(function(report){

                var reqContent = sequenceNodeIdentifier.content;

                if (reqContent['@type'] !== 'SequenceNode') {
                    callback('Input validation error', 'Wrong type, must be SequenceNode');
                    return;
                }

                // Message validation was successful
                retrieveFromCache_(sequenceNodeKey)
                    .then(function(seqNodeInfo){
                        callback(null, {sequenceNodeKey: sequenceNodeKey, sequenceNodeContent: seqNodeInfo.sequenceNodeContent, fromCache:true});
                    }, function(error) {
                        // Either key not found or some issue with Cache server: retrieve it from remote server (AMS)

                        // Obtaining all the necessary information to make an HTTP request: 
                        var reqHeader = sequenceNodeIdentifier.header;
                        var reqUrl = sequenceNodeIdentifier.url || config.amsBaseUrl + '/seqnode';
                        var reqMethod = sequenceNodeIdentifier.method;

                        requestHttp_(reqMethod, reqUrl, reqHeader, reqContent)
                            .then(function(data){
                                var dataToCache = {hubSession:reqHeader['Hub-Session'], sequenceNodeContent:data};
                                storeInCache_(sequenceNodeKey, dataToCache);
                                callback(null, {sequenceNodeKey: sequenceNodeKey, sequenceNodeContent: data, fromCache:false});
                            }, function(error) {
                                var errorBody ={};
                                errorBody.statusCode = 500;
                                errorBody.error = error;
                                logger.error('error', 'Unable to POST ' + url, error);
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
     * @param {string} sequenceNodeKey   The hashed sequenceNodeIdentifier
     * @param {Function} callback Callback function when operation is completed
     *                            with signature fn(error, body)
     *                            When successful, the body contains
     *                            {hubSession: <sequenceNodeKey>, seqNodeInfo: {hubSession:<hub sess>, sequenceNodeContent:<value>}}
     *                            where sequenceNodeContent field is the complete (unmodified) 
     *                            Sequence Node content cached originally obtained from Hub.
     *                            Notice that unlike the getSequenceNode, the first parameter
     *                            is the hubSession and not the sequenceNodeKey.
     ****************************************************************************/
    this.getSequenceNodeByKey = function(sequenceNodeKey, callback)
    {
        retrieveFromCache_(sequenceNodeKey)
            .then(function(seqNodeInfo) {
                callback(null, seqNodeInfo);
            }, function(error) {
                //logger.error('SequenceNodeKey not found.', 'Key ' + sequenceNodeKey + ' not in the cache.');
                //callback('SequenceNodeKey not found', null);
                callback('SequenceNodeKey not found', 'Key ' + sequenceNodeKey + ' not in the cache.');
            });
    };

    /***************************************************************************
     *
     * Largely a pass through to the private storeInCache_ method.
     * 
     * @param {string} sequenceNodeKey   The hashed sequenceNodeIdentifier
     * @param {Object} seqNodeInfo       The updated sequenceNode
     *                            
     *                            
     * @param {Function} callback Callback function when operation is completed
     *                            with signature fn(error, body)
     *                            
     ****************************************************************************/
    this.updateSequenceNodeInCache = function(sequenceNodeKey, seqNodeInfo, callback)
    {
        storeInCache_(sequenceNodeKey, seqNodeInfo)
            .then(function(reply) {
                callback(null, reply);
            }, function(error) {
                callback('SequenceNodeKey not found', 'Key ' + sequenceNodeKey + ' not in the cache.');
            });
    };

    /***************************************************************************
     *
     * Deletes the sequenceNode entry from the cache.
     * 
     * @param {string} sequenceNodeKey   The hashed sequenceNodeIdentifier  
     *                            
     * @param {Function} callback Callback function when operation is completed
     *                            with signature fn(error, body)
     *                            When successful, the body contains the 
     *                            successfully removed sequenceNodeKey 
     ****************************************************************************/
    this.removeSequenceNodeFromCache = function(sequenceNodeKey, callback)
    {
        removeFromCache_(sequenceNodeKey)
            .then(function(seqNodeInfo) {
                // Successfully removed from Cache
                callback(null, seqNodeInfo);
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
     * Stores either by adding (if new key) or updating (if existing key) entry.
     * @private
     *
     * @param {string} key   The key of the entry to store.
     * @param {Object} sequenceNodeInfo The value of the entry to store.
     *
     * @return {Promise}  The object that represents the outcome of this asynch 
     *                    operation. 
     *                    The successful data of the promise callback contains
     *                    the stringified JSON representing the sequence node.
     *
     ****************************************************************************/
    function storeInCache_(key, sequenceNodeInfo) {
        var deferred = Q.defer();

        if (!sequenceNodeInfo.sequenceNodeContent)
        {
            throw new Exception('Invalid argument: missing sequenceNodeContent field');
        }

        var value = JSON.stringify(sequenceNodeInfo);
        redisClient.set(SEQNODE_CACHE_KEY_PREFIX + key, value, function(error, reply) {
            if (error !== null)
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
     * Removes sequence entry from cache.
     * @private
     *
     * @param {string} key   The key of the entry to store.
     *
     * @return {Promise}  The object that represents the outcome of this asynch 
     *                    operation. 
     *                    The successful data of the promise callback contains
     *                    the stringified JSON representing the sequence node.
     *
     ****************************************************************************/
    function removeFromCache_(key) {
        var deferred = Q.defer();

        if (!key)
        {
            throw new Exception('Invalid argument: empty key');
        }

        redisClient.del(SEQNODE_CACHE_KEY_PREFIX + key, function(error, reply) {
            if (error !== null)
            {
                deferred.reject(error);
            }
            else
            {
                deferred.resolve(key);
            }
        });

        return deferred.promise;
    }

    /***************************************************************************
     * Retrieves the sequence node from cache
     * @private
     *
     * @param {string} key  The key of the entry to retrieve
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
                var seqNodeInfo = JSON.parse(reply);
                deferred.resolve(seqNodeInfo);
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
