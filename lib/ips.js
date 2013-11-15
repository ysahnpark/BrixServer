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
 * Created on       Sept 9, 2013
 * @author          Young-Suk Ahn Park
 *                  Seann Ives
 *
 * @copyright (c) 2013 Pearson, All rights reserved.
 *
 * **************************************************************************/
var Q = require('q');
var config = require('config');
var utils = require('./utils');
var SequenceNodeProvider = require('./sequencenodeprovider');
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

    this.sequenceNodeProvider = new SequenceNodeProvider.SequenceNodeProvider();

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

        this.sequenceNodeProvider.getSequenceNode(sequenceNodeIdentifier, function(err, body)  {
            logger.debug('SequenceNodeProvider.getSequenceNode returned.', err, body);
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

                // Sanitize the targetActivity by removing the answerKey
                // @todo - and add in state
                var sanitizedTargetActivity = sanitizeBrixConfig_(targetActivity);

                // Add in config information
                // @todo
                sanitizedTargetActivity = addConfigInfo_(sanitizedTargetActivity);

                // NOTE: Even non-submission brix will receive maxAttempts for the time being.
                var sanitizedBrixConfig = {
                    sequenceNodeKey: sequenceNodeKey,
                    activityConfig: sanitizedTargetActivity
                };
                callback(null, sanitizedBrixConfig);
            }
        });
    };

    /**
     * Posts interaction data to AMS. 
     * Not providing the optional callback function will make this operation async.
     * 
     * @param  {Object}   data     An object containing a sequenceNodeKey,
     *                             timestamp, type (of 'initialization'), and
     *                             body potentially containing a containerId.
     * @param  {Function=} opt_callback Callback with signature fn(error, results),
     *                             where results will contain the sanitized
     *                             sequenceNode to return to the client
     */
    this.postInteraction = function(data, opt_callback)
    {

        this.sequenceNodeProvider.getSequenceNodeByKey(data.sequenceNodeKey, function(gsnError, seqNodeInfo){
            // Hmmm, maybe I should use promise for the getSequenceNodeByKey
            if (gsnError)
            {
                opt_callback(gsnError, null);
            }
            else
            {
                data.hubSession = seqNodeInfo.hubSession;

                // Build the NodeResult from the CE result
                var nodeResult = buildInteractionNodeResult_(data.body.interactionData);

                // Using that_ instead of this, as we are in context of callback.
                // @todo - we may be able to point this and amsProxy.sendSubmission to the same amsProxy method
                that_.amsProxy.sendInteraction(nodeResult, function(error, result) {

                    // @todo - we can get "errors" back from here reported as results instead of real
                    // errors.  We should look at the result object and make sure it's what we expect
                    // or else throw an error.  The error handling just below the logger statement below
                    // hasn't been tested and should be.

                    // Log the AMS return value
                    logger.debug('AmsProxy.sendInteraction returned.', error, result);

                    if (error) {
                        if (opt_callback)
                        {
                            opt_callback(error, null);
                        }
                        return;
                    }

                    // Replace our new nodeResult in the sequenceNode and update the cache
                    var updatedSeqNodeInfo = replaceResultInSequenceNode_(seqNodeInfo, nodeResult);
                    updateCache_(data.sequenceNodeKey, updatedSeqNodeInfo);

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
     * Handles posted student submissions by calculating # of attempts,
     * routing their submission out to the correctness engine, 
     * and then passing a Result Node to the AMS (where it then goes on to
     * the PAF Hub)
     * The post to AMS is synchronous 
     * and the caller should appropriately handle the response through by 
     * providing callback function as second argument.
     * 
     * @param  {Object}   data     An object containing a sequenceNodeKey,
     *                             timestamp, type (of 'initialization'), and
     *                             body potentially containing a containerId.
     * @param  {Function} callback Callback with signature fn(error, results),
     *                             where results will contain the sanitized
     *                             sequenceNode to return to the client
     */
    this.postSubmission = function(data, callback)
    {
        var deferred = Q.defer();

        var sequenceNodeKey = data.sequenceNodeKey;
        var studentSubmission = data.body.studentSubmission;

        Q.ninvoke(this.sequenceNodeProvider, "getSequenceNodeByKey", sequenceNodeKey)
        .then(function(seqNodeInfo){

            // Stub the initial cePayload: {sequenceNodeKey, answerKey, studentSubmission, isLastAttempt}.
            var cePayload = {};

            // @todo: hardcoded numAttemptsAllowed.  This should eventually be in the SequenceNode.
            var numAttemptsAllowed = seqNodeInfo.sequenceNodeContent.targetActivity.maxAttempts;

            // Calculate isLastAttempt
            //var remainingAttempts = calculateRemainingAttempts_(numAttemptsAllowed, seqNodeInfo.sequenceNodeContent);
            var attemptsMade = calculateAttemptsMade_(seqNodeInfo.sequenceNodeContent);
            var remainingAttempts = numAttemptsAllowed - attemptsMade;
            if (remainingAttempts > 0) {
                cePayload.isLastAttempt = false;
            } else if (remainingAttempts === 0) {
                cePayload.isLastAttempt = true;
            } else {
                callback('You have already used all of your submit attempts.  Your submission was not accepted.', null);
                return;
            }
            
            // Build the rest of the cePayload
            cePayload.sequenceNodeKey = sequenceNodeKey;
            cePayload.answerKey = obtainAnswerPart_(seqNodeInfo.sequenceNodeContent.targetActivity);
            cePayload.studentSubmission = studentSubmission;

            // We nest this handler so we can get at the ceProxy result and seqNodeInfo
            // Post it to the CorrectnessEngine
            Q.ninvoke(that_.ceProxy, "sendSubmission", cePayload)
            .then(function(result){
                // Build the NodeResult from the CE result
                var nodeResult = buildSubmissionNodeResult_(result, studentSubmission);

                // Start building the return value we'd like to send back to the IPS.  To start
                // this is just what the CE returned for data.
                var ipsReturn = result.data;

                // Add attempts remaining
                ipsReturn.attemptsMade = attemptsMade;

                // If we have a nonRecordable problem we create the cached NodeResult and return
                if ('nonRecordable' in cePayload.answerKey && cePayload.answerKey.nonRecordable === true)
                {
                    // Append our new nodeResult to the sequenceNode and update the cache
                    var updatedSeqNodeInfo = appendResultToSequenceNode_(seqNodeInfo, nodeResult);
                    updateCache_(sequenceNodeKey, updatedSeqNodeInfo);

                    // Return, via the controller, to the IPC
                    callback(null, ipsReturn);
                // In most cases we'll have a recordable problem and will want to send the NodeResult to the AMS.
                } else
                {
                    // Send the NodeResult off to the AMS
                    that_.amsProxy.sendSubmission(nodeResult, function(error, result) {

                        // Log the AMS return value
                        logger.debug('AmsProxy.sendSubmission returned.', error, result);

                        // @todo - if we have anything of substance returned back from the AMS 
                        // like assignment-related info deal with that here or in appendResultToSequenceNode_
                        
                        if (error)
                        {
                            callback(error, null);
                            return;
                        }

                        // Append our new nodeResult to the sequenceNode and update the cache
                        var updatedSeqNodeInfo = appendResultToSequenceNode_(seqNodeInfo, nodeResult);
                        updateCache_(sequenceNodeKey, updatedSeqNodeInfo);

                        // Return, via the controller, to the IPC
                        callback(error, ipsReturn);
                    });
                }
            })
            .catch(function (error) {
                callback(error, null);
            })
            .done();
        })
        .catch(function (error)
        {
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
     * @param  {Object} error  The error message.
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
     * Replace the nodeResult in seqNodeInfo.sequenceNodeContent with a new nodeResult
     * @param  {Object} seqNodeInfo {hubSession: <sequenceNodeKey>, seqNodeInfo: {hubSession:<hub sess>, 
     *                              sequenceNodeContent:<value>}}
     * @param  {Object} nodeResult  A NodeResult
     * @return {Object} seqNodeInfo The updated seqNodeInfo
     */
    function replaceResultInSequenceNode_(seqNodeInfo, nodeResult)
    {
        seqNodeInfo.sequenceNodeContent.nodeResult = [ nodeResult ];
        return seqNodeInfo;
    }

    /**
     * Append a nodeResult to seqNodeInfo.sequenceNodeContent
     * @param  {Object} seqNodeInfo {hubSession: <sequenceNodeKey>, seqNodeInfo: {hubSession:<hub sess>, 
     *                              sequenceNodeContent:<value>}}
     * @param  {Object} nodeResult  A NodeResult
     * @return {Object} seqNodeInfo The updated seqNodeInfo
     */
    function appendResultToSequenceNode_(seqNodeInfo, nodeResult)
    {
        // Add the NodeResult to the array or create it if sequenceNodeContent.nodeResult doesn't yet exist.
        // This doesn't account for sequenceNodeContent.nodeResult = null but the PAF team says that shouldn't
        // occur.
        if ('nodeResult' in seqNodeInfo.sequenceNodeContent)
        {
            seqNodeInfo.sequenceNodeContent.nodeResult[seqNodeInfo.sequenceNodeContent.nodeResult.length] = nodeResult;
        } else
        {
            seqNodeInfo.sequenceNodeContent.nodeResult = [ nodeResult ];
        }

        return seqNodeInfo;
    }

    /**
     * Updates the cached sequence node content to contain the latest state.
     *  
     * @private
     * 
     * @param  {string} sequenceNodeKey     Hashed key identifiying a SequenceNode
     * @param  {Object} seqNodeInfo         The updated data to be stored in Redis, containing {hubSession: <sequenceNodeKey>, 
     *                                      seqNodeInfo: {hubSession:<hub sess>, sequenceNodeContent:<value>}}
     */
    function updateCache_(sequenceNodeKey, seqNodeInfo)
    {
        if (sequenceNodeKey && seqNodeInfo)
        {
            // Using that_ instead of this, as we are in context of callback.
            that_.sequenceNodeProvider.updateSequenceNodeInCache(sequenceNodeKey, seqNodeInfo, function(err, updateResult)  {
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
     * @param  {string} sequenceNodeKey    The input data passed form the UI client.
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
     * Adds pertinent server config information to the targetActivity which
     * will end up in the Brix info domain.
     *
     * @param  {Object} targetActivity  The entire value of the target activity
     *                                  property from the sequence node content 
     * @return {Object} The updated activity config 
     */
    function addConfigInfo_(targetActivity)
    {
        return targetActivity;
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
     * Calculate how many attempts have already been made by counting NodeResults and accounting
     * for the submission that was just made that hasn't been turned into a NodeResult
     * @return {int} Number of attempts made.
     */
    function calculateAttemptsMade_(sequenceNode)
    {
        // NOTE - This will fail badly if we put anything but submissions into nodeResults
        if ('nodeResult' in sequenceNode)
        {
            // "number of NodeResults" + "the submission just made"
            return sequenceNode.nodeResult.length +1;
        } else // Hedge in case there's no nodeResult array
        {
            return 1;
        }
    }

    /**
     * Build the Interaction NodeResult based on data passed in from IPC.
     * 
     * @param  {Object} interactionData     Data returned from IPC
     * @return {Object} nodeResult          A nodeResult
     */
    function buildInteractionNodeResult_(interactionData)
    {
        
        var jsonTimestamp = new Date().toJSON();
            
        var nodeResult = {
            // @context - PAF standard type identifier
            "@context" : [
                "http://purl.org/pearson/paf/v1/ctx/core/NodeResult"
            ],
            // doScoreProcessing - brix-specific boolean; always false for interactives
            "doScoreProcessing": false,
            // brixState - brix-specific object used for interactives
            "brixState": interactionData,
            // correct - not used by interactives
            // rawItemScore - not used by interactives
            // studentSubmission - not used by interactives
            // systemResponse.htmlResponse - not used by interactives
            // timestamp - ISO-8601
            "timestamp": jsonTimestamp
        };
        return nodeResult;
    }

    /**
     * Build the Submission NodeResult based on data returned from the Correctness Engine.
     * 
     * @param  {Object} result              Data returned from Correctness Engine
     * @param  {Object} studentSubmission   The student's submission
     * @return {Object} NodeResult
     */
    function buildSubmissionNodeResult_(result, studentSubmission)
    {

        // @todo - compute doScoreProcessing.  ECOURSES-707.  Currently this doesn't compute based on 
        //         # of attempts but just on whether the student is right or wrong. 
        //         Maybe we should change doScoreProcessing to isComplete, which is a more accurate term.
        // doScoreProcessing is true if student is correct or has used up all attempts.
        var doScoreProcessing = result.data.correctness ? true : false;

        // brixState is state for Interactions.  State for submissions is stored in responseVariables (studentSubmission)
        var brixState = {};
        
        var jsonTimestamp = new Date().toJSON();
            
        var nodeResult = {
            // @context - PAF standard type identifier
            // @todo - From Fred, "Technically you are supposed to set the "@context" property in the node result to an array that 
            // contains the standard PAF URI as well as a URI for your extended version".  Unfortunately the purl.org link
            // redirects to the PAF docs on semantic-web but is misconfigured and 404s.  Unless this becomes really important
            // let's not include our own or, if it is important, point it to a confluence doc, or make up something like
            // http://purl.org/pearson/sanvan/v1/ctx/brix/results"
            "@context" : [
                "http://purl.org/pearson/paf/v1/ctx/core/NodeResult"
            ],
            // @todo - @type is referenced as required in the semantic-tools docs but only appears some 
            //         of the time in the NodeResult examples in the confluence documentation.  We may
            //         have to add that here.
            // doScoreProcessing - brix-specific boolean; true if correct or out of tries
            "doScoreProcessing": doScoreProcessing,
            // brixState - brix-specific object used for interactives.  Submission state stored as studentSubmission
            "brixState": brixState,
            // correct -  if student is correct or not
            "correct": result.data.correctness ? true : false,
            // rawItemScore - 0..1.  The AMS should turn this into a grade 
            "rawItemScore": result.data.correctness,
            // studentSubmission - brix-specific object which holds the student submission
            "studentSubmission": studentSubmission,
            // systemResponse.htmlResponse - PAF standard feedback object.  If we want something other than
            // this (ie. jsonResponse) we have to put it elsewhere
            "systemResponse": {
                "htmlResponse": result.data.feedback.text
            },
            // timestamp - ISO-8601
            "timestamp": jsonTimestamp
        };
        return nodeResult;
    }

    // Private functions exposed for testing purpose
    // @see: http://philipwalton.com/articles/how-to-unit-test-private-functions-in-javascript/
    // test-code-start
    this.removeFromCache__ = removeFromCache_;
    this.obtainContainerItem__ = obtainContainerItem_;
    this.sanitizeBrixConfig__ = sanitizeBrixConfig_;
    this.obtainAnswerPart__ = obtainAnswerPart_;
    this.calculateAttemptsMade__ = calculateAttemptsMade_;
    this.buildSubmissionNodeResult__ = buildSubmissionNodeResult_;
    this.appendResultToSequenceNode__ = appendResultToSequenceNode_;
    // test-code-end
};