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
var Q = require('q');
var SequenceNodeProvider = require('./sequencenodeprovider.js');
var HubProxy = require('./hubproxy.js');


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
module.exports = function(config) {

	if(!config) {
		throw new Error('No config was supplied');
	}
	var logger = config.logger || function(){};

	var hubProxy_ = new HubProxy(config);

	var sequenceNodeProvider_ =  new SequenceNodeProvider(config);

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

		var result = {"yay": "1"};
		callback(null, result);
/*
		var targetID = payload.body.targetID;

		var error;
		var seqNodeProvider = new SequenceNodeProvider(config);
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
	this.postInteraction = function(data, opt_callback) {


		sequenceNodeProvider_.getSequenceNodeByKey(data.sequenceNodeKey, function(gsnError, gsnResult){

			// Hmmm, maybe I should use promise for the getSequenceNodeByKey
			if (gsnError)
			{
				
			}
			else 
			{
				// @todo: business logic for interaction (logging to hub)
				hubProxy_.sendInteraction(data, function(error, result) {
					// @todo: Do whatever is required (logging?)
					handlerError_(error);

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
	this.postSubmission = function(data, callback) {
		
		// @todo: Go to CorrectnessEngine and create ResultNode

		hubProxy_.sendInteraction(data, function(error, result) {
			// @todo: Do whatever is required (logging?)
			handlerError_(error);

			callback(error, result);
		});
		
	};


    /**
	 * Checks the error returned from the server and handle them appropriately.
	 * The primary error handled is the invalid Hub-Session, 
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

};