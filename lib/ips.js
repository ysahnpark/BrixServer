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
                var sanitizedTargetActivity = sanitizeBrixConfig_(targetActivity);

                // @todo: rename brixConfig to containerConfig
                var sanitizedBrixConfig = {
                    sequenceNodeKey: sequenceNodeKey,
                    containerConfig: sanitizedTargetActivity
                };
                callback(null, sanitizedBrixConfig);
            }
        });
    };

    /**
     * Posts interaction data to Hub. 
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

        // @todo - shouldn't we fire the callback immediately at this point?
        
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
                // @todo - confirm that we are sending a NodeResult to AMS for interactions
                that_.amsProxy.sendInteraction(nodeResult, function(error, result) {

                    // Log the AMS return value
                    logger.debug('AmsProxy.sendInteraction returned.', error, result);

                    // @todo - Do we need this anymore, since we aren't using Hub-Session anymore?
                    //         Are there any situations where we'd want to do something (like
                    //         remove stuff from redis) beyond just simply returning the error?
                    //handlerError_(error);
                    if (error) {
                        opt_callback(error, null);
                        return;
                    }

                    // Replace our new nodeResult in the sequenceNode and update the cache
                    replaceResultInSequenceNode_(seqNodeInfo, nodeResult)
                    .then(function(updatedSeqNodeInfo){

                        updateCache_(data.sequenceNodeKey, updatedSeqNodeInfo);

                        // Call back if callback method was provided
                        if (opt_callback)
                        {
                            opt_callback(error, result);
                        }
                    });


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
            var numAttemptsAllowed = 3;

            // Calculate isLastAttempt
            var remainingAttempts = calculateRemainingAttempts_(numAttemptsAllowed, seqNodeInfo.sequenceNodeContent);
            if (remainingAttempts > 0) {
                cePayload.isLastAttempt = false;
            } else if (remainingAttempts === 0) {
                cePayload.isLastAttempt = true;
            } else {
                // @todo: maybe better to send this as callback(error, null) instead of... 
                throw new Error("Bad student trying to game us!");
            }
            
            // Build the rest of the cePayload
            cePayload.sequenceNodeKey = sequenceNodeKey;
            cePayload.answerKey = obtainAnswerPart_(seqNodeInfo.sequenceNodeContent.targetActivity);
            cePayload.studentSubmission = studentSubmission;

            // Post it to the CorrectnessEngine
            that_.ceProxy.sendSubmission(cePayload, function(error, result) {
                if (error)
                {
                    callback(error.message, null);
                } else {
                    // result is {code, data, status}
                    deferred.resolve(result);
                }
                
            });
            return deferred.promise
            // We nest this handler so we can get at the ceProxy result and seqNodeInfo
            .then(function(result){
                // Build the NodeResult from the CE result
                var nodeResult = buildSubmissionNodeResult_(result, studentSubmission);

                // Start building the return value we'd like to send back to the IPS.  To start
                // this is just what the CE returned for data.
                var ipsReturn = result.data;

                // Send the NodeResult off to the AMS
                that_.amsProxy.sendSubmission(nodeResult, function(error, result) {

                    // Log the AMS return value
                    logger.debug('AmsProxy.sendSubmission returned.', error, result);


                    
                    // @todo - if we have anything of substance returned back from the AMS 
                    // like assignment-related info deal with that here or in appendResultToSequenceNode_
                    

                    // @todo - Do we need this anymore, since we aren't using Hub-Session anymore?
                    //         Are there any situations where we'd want to do something (like
                    //         remove stuff from redis) beyond just simply returning the error?
                    //handlerError_(error);
                    if (error) {
                        callback(error, null);
                        return;
                    }

                    // Append our new nodeResult to the sequenceNode and update the cache
                    appendResultToSequenceNode_(seqNodeInfo, nodeResult)
                    .then(function(updatedSeqNodeInfo){
                        updateCache_(sequenceNodeKey, updatedSeqNodeInfo);

                        // Return, via the controller, to the IPC
                        callback(error, ipsReturn);
                    });

                });
            });
        })
        .catch(function (error) {
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
     * @return {Promise}            The updated seqNodeInfo
     */
    function replaceResultInSequenceNode_(seqNodeInfo, nodeResult)
    {
        var deferred = Q.defer();

        seqNodeInfo.sequenceNodeContent.nodeResult = [ nodeResult ];

        deferred.resolve(seqNodeInfo);

        return deferred.promise;
    }

    /**
     * Append a nodeResult to seqNodeInfo.sequenceNodeContent
     * @param  {Object} seqNodeInfo {hubSession: <sequenceNodeKey>, seqNodeInfo: {hubSession:<hub sess>, 
     *                              sequenceNodeContent:<value>}}
     * @param  {Object} nodeResult  A NodeResult
     * @return {Promise}            The updated seqNodeInfo
     */
    function appendResultToSequenceNode_(seqNodeInfo, nodeResult)
    {
        var deferred = Q.defer();

        // @todo - make sure this works if sequenceNode has a nodeResult in it already
        // that's not an array (error handling for a possible bad PAF situation)
        seqNodeInfo.sequenceNodeContent.nodeResult[seqNodeInfo.sequenceNodeContent.nodeResult.length] = nodeResult;

        deferred.resolve(seqNodeInfo);

        return deferred.promise;
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

        // @todo - put this in for new targetActivity.data object (data swap story).
        // ECOURSES-768
        // There's a stub test in ips.tests.js 'should include data object when present'
        // Add back in the data object
        //result['data'] = targetActivity.data;

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
        // @todo - hardcoded.  story to follow, ECOURSES-707
        return 2;
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
            // @todo - we may also need to specify the brix type here.  unknown at this time.
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
            // rawItemScore - 0..1
            "rawItemScore": result.data.correctness,
            // studentSubmission - brix-specific object which holds the student submission
            "studentSubmission": studentSubmission,
            // systemResponse.htmlResponse - PAF standard feedback object
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
    this.calculateRemainingAttempts__ = calculateRemainingAttempts_;
    this.buildSubmissionNodeResult__ = buildSubmissionNodeResult_;
    this.appendResultToSequenceNode__ = appendResultToSequenceNode_;
    // test-code-end
};