/* **************************************************************************
 * $Workfile:: hub.mock.js                                             $
 * *********************************************************************/ /**
 *
 * @fileoverview This file contains Hub Mock module that intercepts HTTP
 *               requests targeted to PAF Hub.
 *               Intercepted paths are:
 *               /seqnode/ - for the sequence node retrieval 
 *
 * Usage:
 * 1. Include the require in the javascript file:
 *   var HubMock = require('../mock/hub.mock.js');
 * 2. Instantiate Nock class and setup nocks with the base url of the remote server:
 *   var hubnock = new HubMock.HubNock();
 *   hubnock.setupNocks('http://hub.pearson.com');
 * 3. Subsequent call to that URL with /seqnode path will be intercepted by the nock.
 *
 * You can also use pre-defined test messages in the module:
 * HubMock.testHubSession        - The session used by the sequence node request message
 * HubMock.testSeqNodeReqMessage - The sequence node request message (aka sequence node identifier)
 * HubMock.testSeqNodeBody       - The sequence node content returned by the mock.
 *
 * If you wantto get the sequence node key, you may call the 
 * SequenceNodeProvider.obtainSequenceNodeKey (HubMock.testSeqNodeReqMessage)
 *
 * Created on       Sept 16, 2013
 * @author          Young-Suk Ahn Park
 *
 * @copyright (c) 2013 Pearson, All rights reserved.
 *
 * **************************************************************************/

var nock = require('nock');
var config = require('config');
var utils = require('../../lib/utils');
var neffTargetActivity = require('../test_messages/neffreactor_config.json');
var mcqTargetActivity = require('../test_messages/SampleMultipleChoiceConfig.json');

/**
 * A test Hub URL: eg. http://hub.paf.dev.pearsoncmg.com
 * @type {String}
 */
// @todo - is this the way we want to do this?
// 
module.exports.testHubBaseUrl = config.hubBaseUrl;

module.exports.testAmsSubmissionPath = config.amsSubmissionPath;


/**
 * A test Hub session
 * @type {String}
 */
module.exports.testHubSession = 'HUB_SESSION';

/**
 * A test (valid) sequence node request message
 * @type {Object}
 */
module.exports.testSeqNodeReqMessage = {
    header : {
        "Hub-Session": this.testHubSession,
        "Content-Type" : "application/vnd.pearson.paf.v1.node+json"
    },
    content : {
         "@context": "http://purl.org/pearson/paf/v1/ctx/core/SequenceNode",
         "@type": "SequenceNode",
         "targetBinding": "http://repo.paf.dev.pearsoncmg.com/paf-repo/resources/activities/42d2b4f4-46bd-49ee-8f06-47b4421f599b/bindings/0"
    },
    url: module.exports.testHubBaseUrl + "/paf-hub/resources/sequences/course",
    method: "POST"
};

/**
 * A test Initialization envelop, containing testSeqNodeReqMessage as the 
 * sequenceNodeIdentifier
 * @type {Object}
 */
module.exports.testInitializationEnvelope = {
    sequenceNodeIdentifier: this.testSeqNodeReqMessage,
    timestamp: "2013-09-17T06:44:32Z",
    type: "initialization",
    body: {
        containerId: "thingy123"
    }
};

module.exports.testInitializationEnvelopeSubmittable = utils.cloneObject(module.exports.testInitializationEnvelope);
module.exports.testInitializationEnvelopeSubmittable.sequenceNodeIdentifier.content.targetBinding = "http://localtest/paf-repo/resources/activities/MCP/bindings/0"; // Some different data to differentiate SequenceNodekey

module.exports.testSeqNodeHeaders = {
    "itemCorrelationToken": "TEST-ITEM-CORREL-TOKEN"
};
/**
 * A test NodeResult based on ce.mock.testAssessmentResponseBody
 * @type {Object}
 */
module.exports.testNodeResult = {
    "@context" : "http://purl.org/pearson/paf/v1/ctx/core/NodeResult",
    "timestamp": "2013-10-25T20:21:21.822Z",
    "doScoreProcessing": true,
    "brixState": {},
    "itemCorrelationToken": module.exports.testSeqNodeHeaders.itemCorrelationToken,
    "correct": true,
    "rawItemScore": 1,
    "studentSubmission": { "key": "option000" },
    "systemResponse": {
        "htmlResponse": "Your answer is correct. Growth rate stays constant."
        //"templateResponse": "Your answer <%= studAnsValue %> is correct. Growth rate stays constant."
    },
    "nodeData": {
      "timestamp": "2013-10-25T20:21:21.822Z",
      "studentSubmission": {
        "key": "option000"
      },
      "correct": true
    }
};

/**
 * A test NodeResult based on ce.mock.testAssessmentWithIncorrectResponseBody
 * @type {Object}
 */
module.exports.testNodeResultIncorrect = {
    "@context" : "http://purl.org/pearson/paf/v1/ctx/core/NodeResult",
    "timestamp": "2013-10-25T20:21:21.822Z",
    "doScoreProcessing": false,
    "brixState": {},
    "itemCorrelationToken": module.exports.testSeqNodeHeaders.itemCorrelationToken,
    "correct": false,
    "rawItemScore": 0,
    "studentSubmission": { "key": "option003" },
    "systemResponse": {
        "htmlResponse": "Does the growth rate change with population size?"
        //"templateResponse": "Your answer <%= studAnsValue %> is correct. Growth rate stays constant."
    },
    "nodeData": {
      "timestamp": "2013-10-25T20:21:21.822Z",
      "studentSubmission": {
        "key": "option003"
      },
      "correct": false
    }
};

/**
 * A test state object ending in a correct choice
 * @type {Array}
 */
module.exports.testMultipleChoiceStateCorrect = {
    submissions: [
        {
            "studentSubmission": { "key": "option003" },
            "correctness": 0,
            "feedback": "Does the growth rate change with population size?",
            "attemptsMade": 1
        },
        {
            "studentSubmission": { "key": "option000" },
            "correctness": 1,
            "feedback": "Your answer is correct. Growth rate stays constant.",
            "attemptsMade": 2
        }
    ]
};

/**
 * A test state object ending in an incorrect choice
 * @type {Array}
 */
module.exports.testMultipleChoiceStateIncorrect = {
    submissions: [
        {
            "studentSubmission": { "key": "option003" },
            "correctness": 0,
            "feedback": "Does the growth rate change with population size?",
            "attemptsMade": 1
        },
        {
            "studentSubmission": { "key": "option002" },
            "correctness": 0,
            "feedback": "No, that's not it.",
            "attemptsMade": 2
        },
        {
            "studentSubmission": { "key": "option001" },
            "correctness": 0,
            "feedback": "No, that's not it either.",
            "correctAnswer": {
                "key": "option000",
                "feedback": "Your answer is correct. Growth rate stays constant."
            },
            "attemptsMade": 3
        }
    ]
};


/**
 * A test targetActivity for the test SequenceNode (module.exports.testSeqNodeBody) below.
 * The default is the MultipleChoceQuestion one.
 * @type {Object}
 */
module.exports.testTargetActivityBody = mcqTargetActivity;
module.exports.neffTargetActivityBody = neffTargetActivity;

/**
 * A test sequence node content
 * @type {Object}
 */
module.exports.seqNodeBodyTemplate = {
        "guid": "course1::a8bbad4b-73e6-4713-a00c-ae9b938e1aa5::user1::http%3A%2F%2Frepo.paf.dev.pearsoncmg.com%2Fpaf-repo%2Fresources%2Factivities%2F42d2b4f4-46bd-49ee-8f06-47b4421f599b%2Fbindings%2F0",
        "player": {
            "guid": null,
            "contentType": "application/vnd.pearson.qti.v2p1.asi+xml",
            "widgetFrontend": null,
            "toolProxy": null,
            "frameFrontend": {
                "guid": null,
                "frameURI": "placeholder"
            },
            "preprocessor": null,
            "postprocessor": null,
            "@context": null,
            "@id": null,
            "@type": null
        },
        "startTime": 1376949443403,
        "nodeIndex": 1,
        "targetActivityXML": "NoXML",
        "targetActivity": exports.neffTargetActivityBody,
        "aggregateResult": {
            "guid": null,
            "attempt": null,
            "correctOnFirstTry": null,
            "incorrectSubmissionCount": null,
            "numLearningAidsUsed": null,
            "activityBinding": null,
            "startTime": 1376949443403,
            "duration": null,
            "score": null,
            "numAttempts": null,
            "endTime": null
        },
        "prevNode": null,
        "targetBinding": null,
        "parentSequence": {
            "guid": null,
            "user": null,
            "learningContext": "urn:udson:pearson.com/sms/prod:course/jsmith38271",
            "overallActivity": "OverallActiviy, DO we need it?",
            "@context": null,
            "@id": "/paf-hub/resources/sequences/course1::a8bbad4b-73e6-4713-a00c-ae9b938e1aa5::user1",
            "@type": null
        },
        "resultCollection": "http://hub.paf.dev.pearsoncmg.com/paf-hub/resources/sequences/course1::a8bbad4b-73e6-4713-a00c-ae9b938e1aa5::user1/nodes/1/results",
        "endTime": null,
        "@context": "http://purl.org/pearson/paf/v1/ctx/core/SequenceNode",
        "@id": "http://hub.paf.dev.pearsoncmg.com/paf-hub/resources/sequences/course1::a8bbad4b-73e6-4713-a00c-ae9b938e1aa5::user1/nodes/1",
        "@type": "SequenceNode",
        "nodeResult": []
    };


/**
 * A test sequence node content (Neff Reactor)
 * @type {Object}
 */
module.exports.testSeqNodeBody = utils.cloneObject(module.exports.seqNodeBodyTemplate);
module.exports.testSeqNodeBody.targetActivity = exports.neffTargetActivityBody;

/**
 * A test sequence node content of Submittable brix.  The same thing as above (testSeqNodeBody) but pointing
 * targetActivity at the multiple choice instead of neffReactor.
 * @type {Object}
 */
module.exports.testSeqNodeBodySubmittable = utils.cloneObject(module.exports.seqNodeBodyTemplate);
// This one is used for the "obtain answer part" test:
mcqTargetActivity.containerConfig.push({
            "containerId": "dummyContainerX",
            "brixConfig": [
                {
                    "bricId": "dummyBric",
                    "bricType": "DummyBricType",
                    "config": "dummyConfig",
                    "configFixup": "configFixup"
                }
                ],
            "mortarConfig":{} ,
            "hookupActions":{}
        });
module.exports.testSeqNodeBodySubmittable.targetActivity = mcqTargetActivity;
module.exports.testSeqNodeBodySubmittable.guid = "course1::abbadabba-dcba-4321-a00c-ae9b938e1aa5::user1::http%3A%2F%2Frepo.paf.dev.pearsoncmg.com%2Fpaf-repo%2Fresources%2Factivities%2F42d2b4f4-abcd-1234-8f06-47b4421f599b%2Fbindings%2F1";



/**
 * A test (successful) node result response message for Submission
 * @todo : Confirm with PAF documentation
 * @type {Object}
 */
module.exports.testSubmissionResponseBody = '';
//{
    //"feedback": "Something" // AMS is returning an empty
//};

/**
 * A test (successful) node result response message for interaction
 * @todo : Confirm with PAF documentation
 * @type {Object}
 */
module.exports.testInteractionResponseBody = '';

/**
 * Message returned from Hub when session was expired 
 * @type {Object}
 */
module.exports.testHubSessionInvalid = {
    "@context" : "http://purl.org/pearson/paf/v1/ctx/core/NodeProcessResponse",
    "@type" : "NodeProcessResponse",
    "error": "Invalid Hub-Session"
};

/**
 * The constructor function that encapsulates the Nock which intercepts HTTP requests
 *
 * @param {boolean=} opt_persist  Setting it to true makes the nock persistent, i.e.  
 *                                It will live after a call. Otherwise the call will
 *                                be used and subsequent calls will produce errors.
 */
module.exports.HubNock = function(opt_persist) {

    var persist_ = (opt_persist) ? opt_persist : false;

    /**
     * Sets an HTTP server mock that intercepts HTTP call and returns as configured.
     * This particular Nock will intercept AMS call and return code 200 with the 
     * body as specified in the global variable seqNodeBody
     *
     * @param {String}  baseUrl             - The url that this nock should listen to.
     * @param {Object=} opt_responseData    - The optional response data to return.
     * @param {Object=} opt_responseHeaders - The optional response headers.
     */
    this.setupSequenceNodeNock = function(baseUrl, opt_responseData, opt_responseHeaders) {

        var responseData = (opt_responseData !== undefined)
                                ? opt_responseData
                                : module.exports.testSeqNodeBody;

        var responseHeaders = (opt_responseHeaders !== undefined)
                                ? opt_responseHeaders
                                : module.exports.testSeqNodeHeaders;

        // Nock for the sequencenode retrieval
        var nockScope = nock(baseUrl);
        if (persist_)
        {
            nockScope.persist();
        }
        //nockScope.cleanAll(); // Why I cannot do this???
        nockScope.filteringPath(function(path) {
                var prefix = '/paf-hub/resources/sequences/course';
                if (path.substring(0, prefix.length) === prefix)
                {
                    return '/paf-hub/resources/sequences/course';
                }
            })
            .post('/paf-hub/resources/sequences/course')
            // @todo: For some reason the headers are not matching
            //        Check that the seqIdentifer sent by AMS is EXACT
            //.matchHeader('Content-Type', 'application/vnd.pearson.paf.v1.node+json')
            //.matchHeader('Hub-Session', module.exports.testHubSession)
            .reply(200, JSON.stringify(responseData), responseHeaders);
        return nockScope;
    };

    /**
     * Sets an HTTP server mock that intercepts HTTP call and returns as configured.
     * This particular Nock will intercept AMS call and return code 200 with the 
     * body as specified in the global variable seqNodeBody
     *
     * @param {String} baseUrl  - The url that this nock should listen to.
     */
    this.setupInteractionNock = function(baseUrl, opt_responseData) {

        var responseData = (opt_responseData !== undefined)
                                ? opt_responseData
                                : module.exports.testInteractionResponseBody;

        // Nock for the interactions retrieval
        var nockScope = nock(baseUrl);
        if (persist_)
        {
            nockScope.persist();
        }
        nockScope.post('/interactions')
            //.matchHeader('Content-Type', 'application/vnd.pearson.paf.v1.node+json')
            //.matchHeader('Hub-Session', module.exports.testHubSession)
            .reply(200, responseData);
        return nockScope;
    };

    /**
     * Sets an HTTP server mock that intercepts HTTP call and returns as configured.
     * This particular Nock will intercept AMS call and return code 200 with the 
     * body as specified in the global variable seqNodeBody
     *
     * @param {String} baseUrl           - The url that this nock should listen to.
     * @param {Object=} opt_responseData - The optional response data to return.
     * @param {Object=} opt_matchBody    - The optional body that should match.
     */
    this.setupSubmissionNock = function(baseUrl, opt_responseData, opt_matchBody) {

        var responseData = (opt_responseData !== undefined)
                                ? opt_responseData
                                : module.exports.testSubmissionResponseBody;
        var matchBody = opt_matchBody ;
        // Nock for the submissions retrieval
        var nockScope = nock(baseUrl); //.log(console.log);
        if (persist_)
        {
            nockScope.persist();
        }
        nockScope.post(module.exports.testAmsSubmissionPath, matchBody)
            //.matchHeader('Content-Type', 'application/vnd.pearson.paf.v1.node+json')
            //.matchHeader('Hub-Session', module.exports.testHubSession)
            .reply(200, responseData);
        return nockScope;
    };

};