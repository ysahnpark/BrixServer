/* **************************************************************************
 * $Workfile:: ips.js                                                       $
 * *********************************************************************/ /**
 *
 * @fileoverview ips contains the handlers for the controller routes.
 *               It manages:
 *               1. retrieveSequenceNodes
 *               2. postInteraction
 *               3. postSequence
 *
 * Created on		Sept 9, 2013
 * @author			Young-Suk Ahn Park
 *                  Seann Ives
 *
 * @copyright (c) 2013 Pearson, All rights reserved.
 *
 * **************************************************************************/
var utils = require('./utils');
var Q = require('q');
var SequenceNodeProvider = require('./sequencenodeprovider');
var HubProxy = require('./hubproxy');


/* **************************************************************************
 * IPS module                                                          */ /**
 *
 * Constructor.
 *
 * @constructor
 *
 * @param {Object}	config - The settings to configure this object
 *
 * @classdesc
 * The IPS implements three methods: 
 *  1) retrieve the sequence node
 *  2) deal with interaction messages
 *  3) deal with submission messages
 *
 ****************************************************************************/
module.exports.Ips = function(config) {

	if(!config) {
		throw new Error('No config was supplied');
	}
	var logger = utils.getLogger(config, 'ips');

	this.hubProxy = new HubProxy(config);

	this.sequenceNodeProvider = new SequenceNodeProvider(config);

	var that_ = this;

	/**
	 * Receives a payload from the controller containing sequenceNodeIdentifier
	 * information which it hands off to the sequenceNodeProvider, receives
	 * sequenceNode information in return, sanitizes it, splits it by target if
	 * necessary, and returns the sanitized node and sequenceNodeKey to the client.
	 * 
	 * @param  {object}   payload  An object containing a sequenceNodeIdentifier,
	 *                             timestamp, type (of 'initialization'), and
	 *                             body potentially containing a target.
	 * @param  {Function} callback Callback with signature fn(error, results),
	 *                             where results will contain the sanitized
	 *                             sequenceNode to return to the client
	 */
	this.retrieveSequenceNode = function(payload, callback) {
		var sequenceNodeIdentifier = payload.sequenceNodeIdentifier;
		var targetID = payload.body.targetID;

		this.sequenceNodeProvider.getSequenceNode(sequenceNodeIdentifier, function(err, body)  {
			if (err !== null) {
				callback(err, body);
			} else {
				var targetActivity = body.sequenceNodeContent.targetActivity;
				var sequenceNodeKey = body.sequenceNodeKey;

				// @todo - sanitize (ECOURSES-555)
				// @todo - split by target (ECOURSES-555)
				// payload.body.targetId

				var sanitizedBrixConfig = {
					sequenceNodeKey: sequenceNodeKey,
					brixConfig: targetActivity
				};
				callback(null, sanitizedBrixConfig);
			}
		});

/*
		// Q.ninvoke(seqNodeProvider, "getSequenceNode", sequenceNodeIdentifier)) // perhaps?
		Q.ninvoke(seqNodeProvider.getSequenceNode(sequenceNodeIdentifier))
			.then(sanitizeNode(data))
			.then(sanitizeTarget(data,targetID))
			.then(function (sanitizedNode) {
				callback(null, sanitizedNode);
			})
			.catch(function (error) {
				// error handling from getSequenceNode
				callback(error);
			})
			.done();*/
	};

    /**
	 * Posts interaction data to Hub. 
	 * Not providing the optional callback function will make this operation async.
	 * 
	 * @param  {object}   payload  An object containing a sequenceNodeKey,
	 *                             timestamp, type (of 'initialization'), and
	 *                             body potentially containing a target.
	 * @param  {Function=} opt_callback Callback with signature fn(error, results),
	 *                             where results will contain the sanitized
	 *                             sequenceNode to return to the client
	 */
	this.postInteraction = function(data, opt_callback)
	{
		this.sequenceNodeProvider.getSequenceNodeByKey(data.sequenceNodeKey, function(gsnError, gsnResult){
			// Hmmm, maybe I should use promise for the getSequenceNodeByKey
			if (gsnError)
			{
				opt_callback(gsnError, null);
			}
			else
			{
				data.hubSession = gsnResult.hubSession;
				// Using that_ instead of this, as we are in context of callback.
				that_.hubProxy.sendInteraction(data, function(error, result) {
					// @todo: Do whatever is required (logging?)
					handlerError_(error);

					updateCache_(data, result);

					// Call back if callback method was provided
					if (opt_callback)
					{
						opt_callback(error, result);
					}
				});
			}
			
		});

	};

    /**
	 * Posts assessment submission data to Hub. The post to Hub is synchronous 
	 * and the caller should appropriately handle the response through by 
	 * providing callback function as second argument.
	 * 
	 * @param  {object}   payload  An object containing a sequenceNodeKey,
	 *                             timestamp, type (of 'initialization'), and
	 *                             body potentially containing a target.
	 * @param  {Function} callback Callback with signature fn(error, results),
	 *                             where results will contain the sanitized
	 *                             sequenceNode to return to the client
	 */
	this.postSubmission = function(data, callback)
	{
		var that = this;
		this.sequenceNodeProvider.getSequenceNodeByKey(data.sequenceNodeKey, function(gsnError, gsnResult){

			// Hmmm, maybe I should use promise for the getSequenceNodeByKey
			if (gsnError)
			{
				callback(gsnError, null);
			}
			else
			{
				// @todo: Go to CorrectnessEngine and create message (ECOURSES-584)

				that_.hubProxy.sendSubmission(data, function(error, result) {
					// @todo: Do whatever is required (logging?)
					handlerError_(error);

					updateCache_(data, result);
					// @todo: We are not returning the NodeResult.
					//        Change return value accordingly.
					callback(error, result);
				});
			}
			
		});
		
	};


    /**
	 * Checks the error returned from the server and handle them appropriately.
	 * The primary error handled is the invalid Hub-Session, 
	 * @private
	 * 
	 * @param  {object} error  The error message.
	 */
	function handlerError_(error)
	{
		if (error)
		{
			// @todo:
			// If the error is Hub-Session invalid, then all the sequence nodes
			// in stored in the cache should be removed.
			// We may need to maintain another cache entry with hub-session as key 
			// That returns all the sequenceNodeKeys associated with that hub-session. 
		}
	}

	/**
	 * Updates the cached sequence node content to contain the latest state. 
	 * @private
	 * 
	 * @param  {Object} data    The input data passed form the UI client.
	 * @param  {Object} result  The result obtained from PAF.
	 */
	function updateCache_(data, result)
	{
		if (data && result)
		{
			// Using that_ instead of this, as we are in context of callback.
			that_.sequenceNodeProvider.updateSequenceNodeInCache(data.sequenceNodeKey, data, function(err, updateResult)  {
				if (err !== null) {
					logger.error('updateSequenceNodeInCache returned error.', error);
				} else {
					logger.debug('updateSequenceNodeInCache completed', updateResult);
				}
			});
		}
	}

};