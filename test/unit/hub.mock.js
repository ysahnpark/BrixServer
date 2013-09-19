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
 *   var HubMock = require('./hub.mock.js');
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

/**
 * A test Hub session
 * @type {String}
 */
module.exports.testHubBaseUrl = 'http://hub.paf.pearson.com';


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
        "Hub­-Session": this.testHubSession,
        "Content­-Type" : "application/vnd.pearson.paf.v1.node+json"
    },
    content : {
         "@context": "http://purl.org/pearson/paf/v1/ctx/core/SequenceNode",
         "@type": "SequenceNode",
         "targetBinding": "http://repo.paf.dev.pearsoncmg.com/paf-repo/resources/activities/42d2b4f4-46bd-49ee-8f06-47b4421f599b/bindings/0"
    },
    url: "http://hub.pearson.com/seqnode",
    method: "POST"
};

/**
 * A test Initialization envelop, containing testSeqNodeReqMessage as the 
 * sequenceNodeIdentifier
 * @type {Object}
 */
module.exports.testInitializationEnvelope = {
    sequenceNodeIdentifier: this.testSeqNodeReqMessage,
    timestamp: "2013-09-17T06:44Z",
    type: "initialization",
    body: {
        targetID: "thingy123"
    }
};

// @todo: a more "realistic" value for targetActivity field
module.exports.testTargetActivityBody = {
        "brixConfig":"...bunch of brix config goes here..."
    };

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
        "targetActivityXML": "PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiIHN0YW5kYWxvbmU9InllcyI/Pjxhc3Nlc3NtZW50SXRlbSB4bWxucz0iaHR0cDovL3d3dy5pbXNnbG9iYWwub3JnL3hzZC9pbXNxdGlfdjJwMSIgeG1sbnM6bnMyPSJodHRwOi8vd3d3LnczLm9yZy8yMDAxL1hJbmNsdWRlIiB4bWxuczpuczM9Imh0dHA6Ly93d3cuaW1zZ2xvYmFsLm9yZy94c2QvaW1zbGlwX3YxcDAiIHRpdGxlPSJNQSAxLjEwLjMiIGFkYXB0aXZlPSJmYWxzZSIgdGltZURlcGVuZGVudD0iZmFsc2UiPjxyZXNwb25zZURlY2xhcmF0aW9uIGlkZW50aWZpZXI9IlJFU1BPTlNFIiBjYXJkaW5hbGl0eT0ic2luZ2xlIiBiYXNlVHlwZT0iaWRlbnRpZmllciI+PGNvcnJlY3RSZXNwb25zZT48dmFsdWU+NDwvdmFsdWU+PC9jb3JyZWN0UmVzcG9uc2U+PC9yZXNwb25zZURlY2xhcmF0aW9uPjxpdGVtQm9keT48Y2hvaWNlSW50ZXJhY3Rpb24gc2h1ZmZsZT0iZmFsc2UiIG1heENob2ljZXM9IjEiIHJlc3BvbnNlSWRlbnRpZmllcj0iUkVTUE9OU0UiPjxwcm9tcHQ+VGhlIHRleHQgb2YgJmx0O0kmZ3Q7VGhlIFNlY3JldCZsdDsvSSZndDsgaXMgcXVvdGVkIGluIHRoZSB2aWRlbyBhcyBzYXlpbmcgdGhhdCB3aGVuIHlvdSB0aGluayBvZiB0aGUgdGhpbmdzIHRoYXQgeW91IHdhbnQsIGFuZCB5b3UgZm9jdXMgb24gdGhlbSB3aXRoIGFsbCB5b3VyIGF0dGVudGlvbiwgeW91IHdpbGwgZ2V0IHdoYXQgeW91IHdhbnQsIGV2ZXJ5IHRpbWUuIFRoZSBhdXRob3IncyB0ZXJtIGZvciB0aGlzIGlkZWEgb2YgYnJpbmdpbmcgdGhpbmdzIGludG8geW91ciBsaWZlIGlzICZxdW90O19fX19fLiZxdW90OzwvcHJvbXB0PjxzaW1wbGVDaG9pY2UgaWRlbnRpZmllcj0iMSI+cHJpbmNpcGxlIG9mIHNlY3JlY3k8L3NpbXBsZUNob2ljZT48c2ltcGxlQ2hvaWNlIGlkZW50aWZpZXI9IjIiPnJ1bGUgb2YgdGhlIHVuY29uc2Npb3VzPC9zaW1wbGVDaG9pY2U+PHNpbXBsZUNob2ljZSBpZGVudGlmaWVyPSIzIj50aGVvcnkgb2YgbWluZDwvc2ltcGxlQ2hvaWNlPjxzaW1wbGVDaG9pY2UgaWRlbnRpZmllcj0iNCI+bGF3IG9mIGF0dHJhY3Rpb248L3NpbXBsZUNob2ljZT48L2Nob2ljZUludGVyYWN0aW9uPjwvaXRlbUJvZHk+PC9hc3Nlc3NtZW50SXRlbT4=",
        "targetActivity": exports.testTargetActivityBody,
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
 */
module.exports.HubNock = function() {

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
        hubNock.post('/seqnode')
            .matchHeader('Content­-Type', 'application/vnd.pearson.paf.v1.node+json')
            .matchHeader('Hub­-Session', module.exports.testHubSession)
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
        hubNock.post('/interactions')
            //.matchHeader('Content­-Type', 'application/vnd.pearson.paf.v1.node+json')
            //.matchHeader('Hub­-Session', module.exports.testHubSession)
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
        var hubNock = nock(baseUrl);
        hubNock.post('/submissions')
            //.matchHeader('Content­-Type', 'application/vnd.pearson.paf.v1.node+json')
            //.matchHeader('Hub­-Session', module.exports.testHubSession)
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