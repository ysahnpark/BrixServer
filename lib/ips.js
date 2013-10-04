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
var CEProxy = require('./ceproxy').CEProxy;


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
	this.ceProxy = new CEProxy();

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
		// @todo: Go to CorrectnessEngine and create message (ECOURSES-584)
		/* @todo: si -
			- change this to promise, so if we get an error from ceproxy we can return it to controller right away
				skipping over the amsProxy stuff below
			- pull the answerKey and assessmentType out of seqNodeInfo
			- compute # attempts based on hardcoded value minus either the stuff in aggregateResult or a calculation
				of the total of resultNodes
			- build the payload for the CE {sequenceNodeKey, answerKey, studentSubmission, isLastAttempt}
			- go to CE via ceproxy, return stuff from CE.
				the return stuff will be the entire package back from the CE, {code, data, status}.
			- strip out code and status
			- deal with errors (just make sure result in callback(error, result) has the 'message' from the CE)
			- create a nodeResult (maybe also aggregateResult) from the data if we don't have an error so that
				can be dumped into cache
			Q: do we want to updateCache before or after we receive a successful submission response from the AMS?
		*/
			
		
		var deferred = Q.defer();

		Q.ninvoke(this.sequenceNodeProvider, "getSequenceNodeByKey", data.sequenceNodeKey)
		.then(function(seqNodeInfo){

			// build the initial cePayload: {sequenceNodeKey, answerKey, studentSubmission, isLastAttempt}.
			var cePayload = {};

			// hardcoded numAttemptsAllowed.  This should eventually be in the SequenceNode.
			var numAttemptsAllowed = 3;

			// Calculate isLastAttempt
			var remainingAttempts = calculateRemainingAttempts_(umAttemptsAllowed, seqNodeInfo.sequenceNodeContent);
			if (remainingAttempts > 0) {
				cePayload.isLastAttempt = false;
			} else if (remainingAttempts === 0) {
				cePayload.isLastAttempt = true;
			} else {
				throw new Error("Bad student trying to game us!");
			}
			
			// build the rest of the cePayload
			cePayload.sequenceNodeKey = data.sequenceNodeKey;
			cePayload.answerKey = obtainAnswerPart_(seqNodeInfo.sequenceNodeContent.targetActivity);
			cePayload.studentSubmission = data.body.studentSubmission;

			// post it to the CorrectnessEngine
			that_.ceProxy.sendSubmission(cePayload, function(error, result) {
				//@todo: si - test this
				if (error)
				{
					deferred.reject(new Error(error));
				} else {
					deferred.resolve(result);
				}
				
			});
			return deferred.promise
			// We nest this handler so we can get at the ceProxy result and seqNodeInfo
			.then(function(result){
				// @todo: si 
				// - build the NodeResult
				// - send the NodeResult off to the AMS
				that_.amsProxy.sendSubmission(data, function(error, result) {
					// @todo: Do whatever is required (logging?)
					handlerError_(error);

					// @todo: si - append the NodeResult to the SequenceNode and update the cache with that
					updateCache_(data, result);

					// @todo: si - change this to the proper return value
					callback(error, result);
				});
			});
		})
		.catch(function (error) {
			// @todo: si - are we ok with passing a 'null' back here
			callback(error, null);
		})
		.done();
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

	/**
	 * Calculate how many attempts have already been made by counting NodeResults and compare that to
	 * numAttemptsAllowed
	 * @return {[int]} Number of remaining attempts.  May be negative if someone's trying to be naughty.
	 */
	function calculateRemainingAttempts_(numAttemptsAllowed, sequenceNode)
	{
		// hardcoded.  story to follow
		return 2;
	}

	// Private functions exposed for testing purpose
	// @see: http://philipwalton.com/articles/how-to-unit-test-private-functions-in-javascript/
	// test-code-start
	this.removeFromCache__ = removeFromCache_;
	this.obtainContainerItem__ = obtainContainerItem_;
	this.sanitizeBrixConfig__ = sanitizeBrixConfig_;
	this.obtainAnswerPart__ = obtainAnswerPart_;
	this.calculateRemainingAttempts__ = calculateRemainingAttempts_;
	// test-code-end
};