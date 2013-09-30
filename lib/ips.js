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
var config = require('config');
var utils = require('./utils');
var SequenceNodeProvider = require('./sequencenodeprovider').SequenceNodeProvider;
var AmsProxy = require('./amsproxy').AmsProxy;


/* **************************************************************************
 * Ips class                                                           */ /**
 *
 * @constructor
 *
 * @classdesc
 * The IPS exposes methods to  
 *  1) retrieve the sequence node
 *  2) deal with interaction messages
 *  3) deal with submission messages
 *
 ****************************************************************************/
module.exports.Ips = function() {

	var logger = utils.getLogger(config, 'ips');

	this.amsProxy = new AmsProxy();

	this.sequenceNodeProvider = new SequenceNodeProvider();

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
				// @todo - split by container (ECOURSES-555)
				
				/*
				var containerItem;
				if (payload.body.containerId) {
					// @todo - if containerId is defined retrieve that specific one
					containerItem = 
				}*/
				var sanitizedTargetActivity = sanitizeBrixConfig_(targetActivity);

				// @todo: rename brixConfig to containerConfig
				var sanitizedBrixConfig = {
					sequenceNodeKey: sequenceNodeKey,
					containerConfig: sanitizedTargetActivity
				};
				callback(null, sanitizedBrixConfig);
			}
		});

/*
		// Q.ninvoke(seqNodeProvider, "getSequenceNode", sequenceNodeIdentifier)) // perhaps?
		Q.ninvoke(seqNodeProvider.getSequenceNode(sequenceNodeIdentifier))
			.then(sanitizeNode(data))
			.then(sanitizeTarget(data, containerID))
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
	 *                             body potentially containing a containerId.
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
				that_.amsProxy.sendInteraction(data, function(error, result) {
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
	 *                             body potentially containing a containerId.
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

				that_.amsProxy.sendSubmission(data, function(error, result) {
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
	 * The primary error handled is the invalid Hub-Session, which invalidates 
	 * the sequenceNodeKey's associated with that Hub-Session 
	 * (Unless the sequenceNodeKey becomes persistent across sessions)
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
	 *  
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

	/**
	 * Removes the cached entry that contains the sequenceNodeKey. 
	 * @private
	 * 
	 * @param  {Object} data    The input data passed form the UI client.
	 * @param  {Object} result  The result obtained from PAF.
	 */
	function removeFromCache_(sequenceNodeKey, callback)
	{
		if (sequenceNodeKey)
		{
			// Using that_ instead of this, as we are in context of callback.
			that_.sequenceNodeProvider.removeSequenceNodeFromCache(sequenceNodeKey,
				function(err, result) {
					callback(err, result);
				});
		}
	}


	/**
	 * Extracts and returns a specific container config from the sequence node content.
	 * 
	 * @param  {Object} targetActivity  The entire value of the target activity
	 *                                  property from the sequence node content 
	 * @param  {string} containerId     The id of the container to extract. Aka. 
	 * @return {Object}                 The container config with the id. 
	 *                                  Null if not found
	 */
	function obtainContainerItem_(targetActivity, containerId)
	{
		var containerConfig = targetActivity['containerConfig'];
		// Iterate over all containers and for each container strip out the answerKey
		for (var i=0; i<containerConfig.length; i++)
		{
			if (containerConfig[i].containerId == containerId)
			{
				return utils.cloneObject(containerConfig[i]);
			}
		}

		return null;
	}


	/**
	 * Sanitizes the node content by removing the answerKey section.
	 * We have constrained that there will be only one assessment bric per
	 * sequence node, thus only one anserKey.
	 *
	 * @param  {Object} targetActivity  The entire value of the target activity
	 *                                  property from the sequence node content 
	 * @return {Object} The sanitized activity config 
	 */
	function sanitizeBrixConfig_(targetActivity)
	{

		if (!targetActivity.containerConfig)
			throw new Exception('Required field containerConfig not found');

		var result = utils.cloneObject(targetActivity);

		// Iterate over all containers and for each container strip out the answerKey
		result['containerConfig'].forEach(function(containerItem, ccKey) {

			containerItem['brixConfig'].forEach(function(brixItem, bcKey) {
				delete brixItem['answerKey'];
			});
		});

		return result;
	}

	/**
	 * Extracts and returns the answer part from the Sequence Node Content.
	 * It is used to obtain one of the parameters that is sent to the Correctness Engine,
	 * along with the student answer, to get feedback to an answer.
	 * 
	 * @param  {Object} targetActivity The entire value of the target activity
	 *                                  property from the sequence node content 
	 * 
	 * @return {Object} The answerKey part, null if not found
	 */
	function obtainAnswerPart_(targetActivity, opt_containerId)
	{
		var i, brixConfig;
		if (opt_containerId)
		{
			var containerItem = obtainContainerItem_(targetActivity, opt_containerId);

			brixConfig = containerItem['brixConfig'];
			for (i=0; i < brixConfig.length; i++)
			{
				if (brixConfig[i]['answerKey'])
				{
					return utils.cloneObject(brixConfig[i]['answerKey']);
				}
			}

		}
		else
		{
			// Iterate over all containers and returns the first answerKey
			var containerConfig = targetActivity['containerConfig'];
			for (var j=0; j < containerConfig.length; j++)
			{
				brixConfig = containerConfig[j]['brixConfig'];
				for (i=0; i < brixConfig.length; i++)
				{
					if (brixConfig[i]['answerKey'])
					{
						return utils.cloneObject(brixConfig[i]['answerKey']);
					}
				}
			}
		}
		
		return null;
	}

	// Private functions exposed for testing purpose
	// @see: http://philipwalton.com/articles/how-to-unit-test-private-functions-in-javascript/
	// test-code-start
	this.removeFromCache__ = removeFromCache_;
	this.obtainContainerItem__ = obtainContainerItem_;
	this.sanitizeBrixConfig__ = sanitizeBrixConfig_;
	this.obtainAnswerPart__ = obtainAnswerPart_;
	// test-code-end
};