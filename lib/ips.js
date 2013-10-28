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
                logger.debug('AmsProxy.sendInteraction returned.', error, result);
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
     * Handles posted student submissions by calculating # of attempts,
     * routing their submission out to the correctness engine, 
     * and then passing a Result Node to the AMS (where it then goes on to
     * the PAF Hub)
     * The post to AMS is synchronous 
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
        var deferred = Q.defer();
        Q.ninvoke(this.sequenceNodeProvider, "getSequenceNodeByKey", data.sequenceNodeKey)
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
            cePayload.sequenceNodeKey = data.sequenceNodeKey;
            cePayload.answerKey = obtainAnswerPart_(seqNodeInfo.sequenceNodeContent.targetActivity);
            cePayload.studentSubmission = data.body.studentSubmission;

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
                var nodeResult = buildSubmissionNodeResult_(result, data.body.studentSubmission);

                // Start building the return value we'd like to send back to the IPS.  To start
                // this is just what the CE returned for data.
                var ipsReturn = result.data;

                // Send the NodeResult off to the AMS
                that_.amsProxy.sendSubmission(nodeResult, function(error, result) {
                    // Log the AMS return value
                    logger.debug('AmsProxy.sendSubmission returned.', error, result);
                    
                    // @todo - if we have anything of substance returned back from the AMS 
                    // like assignment-related info deal with that here.
                    
                    // FIX THIS - if you've got an error from the AMS, deal with it.  This'll be easier
                    // if we promise this up
                    handlerError_(error);

                    // @todo: append the NodeResult to the SequenceNode and update the cache with that
                    // FIX THIS - send data & nodeResult, not the result from AMS.  Also, make it write to redis
                    updateCache_(data, result);

                    // Return, via the controller, to the IPC
                    callback(error, ipsReturn);
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
     * @param  {Object} data    The input data passed from the UI client.
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
     * Build the NodeResult based on data returned from the Correctness Engine
     * @param  {Object} result Data returned from Correctness Engine
     * @return {Object}        NodeResult
     */
    function buildSubmissionNodeResult_(result, studentSubmission)
    {

        // @todo - compute this.  ECOURSES-707.  Currently this doesn't compute based on 
        // # of attempts but just on whether the student is right or wrong. 
        // Maybe we should change doScoreProcessing to isComplete, which is a more accurate term
        var doScoreProcessing = result.data.correctness ? true : false;

        // state for Submissions is stored in responseVariables (studentSubmission)
        var brixState = {};
        
        var jsonTimestamp = new Date().toJSON();

        // @todo - figure out proper format for responseVariable(s)
            // PAF example from https://hub.pearson.com/confluence/display/AF/SequenceStart+API
            /*
                "responseVariables": [
                    {
                        "@key": "RESPONSE",
                        "value": [
                            "4"
                        ]
                    }
                ]
            */
            // PAF example from https://hub.pearson.com/confluence/display/AF/Activity+Loop
            /*
                "responseVariables" : [
                    { "identifier" : "RESPONSE", "value" : "Choice1" }
                  ]
             */
            // Semantic web example from http://semantic-tools.appspot.com/resources/mediatype/application/vnd/pearson/paf/v1/noderesult/rich+json/index.html#ResponseVariable
            /*
                "responseVariable": {
                      "identifier" : "response",
                      "candidateResponse" : 21
                    }
             */
            
        var nodeResult = {
            "@context" : [
                "http://purl.org/pearson/paf/v1/ctx/core/NodeResult"
            ],
            "doScoreProcessing": doScoreProcessing,
            "brixState": brixState,
            "correct": result.data.correctness ? true : false,
            "rawItemScore": result.data.correctness,
            "responseVariables": [ studentSubmission ],
            "systemResponse": {
                "htmlResponse": result.data.feedback.text
            },
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
    // test-code-end
};