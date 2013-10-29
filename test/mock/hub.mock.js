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
var neffTargetActivity = require('../test_messages/neffreactor_config.json');

/**
 * A test Hub URL: eg. http://hub.paf.dev.pearsoncmg.com
 * @type {String}
 */
// @todo - is this the way we want to do this?
// 
module.exports.testHubBaseUrl = config.hubBaseUrl;


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

/**
 * A test NodeResult based on ce.mock.testAssessmentResponseBody
 * @type {Object}
 */
module.exports.testNodeResult = {
    "@context" : [
        "http://purl.org/pearson/paf/v1/ctx/core/NodeResult"
    ],
    "doScoreProcessing": true,
    "brixState": {},
    "correct": true,
    "rawItemScore": 1,
    "studentSubmission": { "submission": "option000" },
    "systemResponse": {
        "htmlResponse": "Your answer is correct. Growth rate stays constant."
        //"templateResponse": "Your answer <%= studAnsValue %> is correct. Growth rate stays constant."
    },
    "timestamp": "2013-10-25T20:21:21.822Z"
};

/**
 * A test NodeResult based on ce.mock.testAssessmentWithIncorrectResponseBody
 * @type {Object}
 */
module.exports.testNodeResultIncorrect = {
    "@context" : [
        "http://purl.org/pearson/paf/v1/ctx/core/NodeResult"
    ],
    "doScoreProcessing": false,
    "brixState": {},
    "correct": false,
    "rawItemScore": 0,
    "studentSubmission": { "submission": "option003" },
    "systemResponse": {
        "htmlResponse": "Does the growth rate change with population size?"
        //"templateResponse": "Your answer <%= studAnsValue %> is correct. Growth rate stays constant."
    },
    "timestamp": "2013-10-25T20:21:21.822Z"
};

/**
 * A test targetActivity for the test SequenceNode (module.exports.testSeqNodeBody) below.
 * @type {Object}
 */
module.exports.testTargetActivityBody = {
    "containerConfig": [
        {
            "containerId": "assessment25",
            "brixConfig": [
                {
                    "bricId": "mcqQ1",
                    "bricType": "MultipleChoiceQuestion",
                    "config": {
                        "id": "Q1",
                        "questionId": "SanVan001",
                        "question": "Why does it take less and less time to add each additional billion people to the planet?",
                        "choices": [
                            {
                                "content": "Because as the population increases, the absolute number of births increases even though the growth rate stays constant.",
                                "optionKey": "option000"
                            },
                            {
                                "content": "Because the growth rate increases as the population rises.",
                                "optionKey": "option001"
                            },
                            {
                                "content": "Because the total fertility rate increases with population.",
                                "optionKey": "option002"
                            },
                            {
                                "content": "Because social behaviors change and people decide to have more children.",
                                "optionKey": "option003"
                            }
                        ],
                        "order": "randomized",
                        "widget": "RadioGroup",
                        "widgetConfig": {
                            "numberFormat": "latin-upper"
                        }
                    },
                    "configFixup": [],
                    "answerKey": {
                        "assessmentType": "multiplechoice",
                        "answers": {
                            "option000": {
                                "response": "Your answer <%= studAnsValue %> is correct. Growth rate stays constant.",
                                "score": 1
                            },
                            "option001": {
                                "response": "Does the growth rate change with population size?",
                                "score": 0
                            },
                            "option002": {
                                "response": "Does the fertility rate change with population size?",
                                "score": 0
                            },
                            "option003": {
                                "response": "This might happen but is it something is necessarily occurs?",
                                "score": 0
                            }
                        }
                    }
                }
            ],
            "mortarConfig": [
                {
                    "mortarId": "submitMgrQ1",
                    "mortarType": "SubmitManager",
                    "config": {
                        "answerManType": "Default"
                    }
                }
            ],
            "hookupActions": [
                {
                    "actionType": "method-call",
                    "config": {
                        "domain": "mortar",
                        "id": "submitMgrQ1",
                        "methodName": "handleRequestsFrom",
                        "args": [
                            {
                                "type": "ref",
                                "domain": "brix",
                                "id": "mcqQ1"
                            }
                        ]
                    }
                }
            ]
        },
        {
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
        }
    ]
};
module.exports.neffTargetActivityBody = neffTargetActivity;

/**
 * A test sequence node content
 * @type {Object}
 */
module.exports.testSeqNodeBody = {
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
 * A test (successful) node result response message for Submission
 * @todo : Confirm with PAF documentation
 * @type {Object}
 */
module.exports.testSubmissionResponseBody = {
    "feedback": "Something"
};

/**
 * A test (successful) node result response message for interaction
 * @todo : Confirm with PAF documentation
 * @type {Object}
 */
module.exports.testInteractionResponseBody = {
};

/**
 * Message returned from Hub when session was expiired 
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
     * @param {String} baseUrl  - The url that this nock should listen to.
     */
    this.setupSequenceNodeNock = function(baseUrl) {

        // Nock for the sequencenode retrieval
        var hubNock = nock(baseUrl);
        if (persist_)
        {
            hubNock.persist();
        }
        hubNock.filteringPath(function(path) {
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
            .reply(200, JSON.stringify(module.exports.testSeqNodeBody));
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
        var hubNock = nock(baseUrl);
        if (persist_)
        {
            hubNock.persist();
        }
        hubNock.post('/interactions')
            //.matchHeader('Content-Type', 'application/vnd.pearson.paf.v1.node+json')
            //.matchHeader('Hub-Session', module.exports.testHubSession)
            .reply(200, JSON.stringify(responseData));
    };

    /**
     * Sets an HTTP server mock that intercepts HTTP call and returns as configured.
     * This particular Nock will intercept AMS call and return code 200 with the 
     * body as specified in the global variable seqNodeBody
     *
     * @param {String} baseUrl  - The url that this nock should listen to.
     */
    this.setupSubmissionNock = function(baseUrl, opt_responseData) {

        var responseData = (opt_responseData !== undefined)
                                ? opt_responseData
                                : module.exports.testSubmissionResponseBody;
        // Nock for the submissions retrieval
        var hubNock = nock(baseUrl); //.log(console.log);
        if (persist_)
        {
            hubNock.persist();
        }
        hubNock.post('/submissions')
            //.matchHeader('Content-Type', 'application/vnd.pearson.paf.v1.node+json')
            //.matchHeader('Hub-Session', module.exports.testHubSession)
            .reply(200, JSON.stringify(responseData));
    };


    /**
     * Sets an HTTP server mock that intercepts HTTP call and returns as configured.
     * This particular Nock will intercept AMS call and return code 200 with the 
     * body as specified in the global variable seqNodeBody
     *
     * @param {String} baseUrl  - The url that this nock should listen to.
     */

    this.setupNocks = function(baseUrl) {

        this.setupSequenceNodeNock(baseUrl);
    };

};