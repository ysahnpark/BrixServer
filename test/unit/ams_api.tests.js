/* **************************************************************************
 * $Workfile:: ams_api.tests.js                                             $
 * *********************************************************************/ /**
 *
 * @fileoverview Contains unit tests for the AMS interface, basically amsproxy.js
 *
 * NOTE: You will have to start the Redis server manually prior running the
 *       tests, otherwise you will get ECONNREFUSED error and the test will 
 *       fail.
 *
 * Created on       Sept 9, 2013
 * @author          Young-Suk Ahn Park
 *
 * @copyright (c) 2013 Pearson, All rights reserved.
 *
 * **************************************************************************/

var fs = require("fs");
var nock = require("nock");
var AmsProxy = require("../../lib/amsproxy.js");
var spawn = require("child_process").spawn;
var redis = require("redis");
var expect = require("chai").expect;

// @todo: a more "realistic" value for targetActivity field
var targetActivityBody = {
    "brixConfig":"...bunch of brix config goes here..."
}

/**
 * The test sequence node content.
 */
var seqNodeBody = {
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
        "targetActivity": targetActivityBody,
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
 * Tests the amsProxy's getSequenceNode operation.
 * It sends request messages proxy and validates the response.
 * For successful retrieval, it also validates that the AMS proxy has correctly set the cache. 
 *
 * @param {AMSProxy} amsProxy   - The AMS proxy instance
 * @param {string} reqParam     - The JSON input parameter in string
 * @param {?string} expectError - The expected error message, or null if no error is expected
 * @param {?string} expectBody  - The expected result body (stringified JSON if necessary), or null if error is expected
 * @param {Function} done       - The done callback function for the Mocha's asynch testing
 */
function testReqNode(amsProxy, reqParam, expectError, expectData, done) {

    // Make sure that the cache does not have the key yet (before the proxy call)
    redisClient = redis.createClient();

    seqNodeKey = amsProxy.obtainSequenceNodeKey(reqParam);
    /* Disabled: Need further investigation but it seems del action may not be synchronous,
                producing unwanted side effects as deleting after getSequenceNode operation
     */ 
    //redisClient.del("SEQN:" + seqNodeKey); 

    amsProxy.getSequenceNode(reqParam, function(error, body) {
        
        if (expectError === null) {
            // No error means we should be able to retrieve it from cache as well.
            expect(error).to.equal(null);

            redisClient.get(amsProxy.getCacheKeyPrefix() + seqNodeKey, function(err, reply){
                expect(reply).to.be.a("string");
                redisClient.del(amsProxy.getCacheKeyPrefix() + seqNodeKey);
            });
        } 
        else 
        {
            expect(error).to.equal(expectError);
        }

        if (expectData !== null) {
            expect(JSON.stringify(body.data)).to.equal(expectData);
        }

        done();
    });
}


describe("IPS->AMS API Test", function () {

    // Define different test input messages (sequence node ID as sent from AMS)
    var correctReqMessage = {
            header : {
                "Hub­-Session" : "AmazingHubSession",
                "Content­-Type" : "application/vnd.pearson.paf.v1.node+json"
            },
            content : {
                 "@context": "http://purl.org/pearson/paf/v1/ctx/core/SequenceNode",
                 "@type": "SequenceNode",
                 "targetBinding": "http://repo.paf.dev.pearsoncmg.com/paf-repo/resources/activities/42d2b4f4-46bd-49ee-8f06-47b4421f599b/bindings/0"
            },
            url: "http://localhost/seqnode",
            method: "POST"
        };

    var incorrectReqMessage_missingHubSession = {
            header : {
                "Content­-Type" : "application/vnd.pearson.paf.v1.node+json"
            },
            content : {
                 "@context": "http://purl.org/pearson/paf/v1/ctx/core/SequenceNode",
                 "@type": "SequenceNode",
                 "nodeIndex": 1,
                 "targetBinding": "http://repo.paf.dev.pearsoncmg.com/paf-repo/resources/activities/42d2b4f4-46bd-49ee-8f06-47b4421f599b/bindings/0"
            },
            url: "http://localhost/seqnode",
            method: "POST"
        };

    var incorrectReqMessage_missingUrl = {
            header : {
                "Hub­-Session" : "AmazingHubSession",
                "Content­-Type" : "application/vnd.pearson.paf.v1.node+json"
            },
            content : {
                 "@context": "http://purl.org/pearson/paf/v1/ctx/core/SequenceNode",
                 "@type": "SequenceNude",
                 "nodeIndex": 1,
                 "targetBinding": "http://repo.paf.dev.pearsoncmg.com/paf-repo/resources/activities/42d2b4f4-46bd-49ee-8f06-47b4421f599b/bindings/0"
            },
            method: "POST"
        };

    var incorrectReqMessage_missingMethod = {
            header : {
                "Hub­-Session" : "AmazingHubSession",
                "Content­-Type" : "application/vnd.pearson.paf.v1.node+json"
            },
            content : {
                 "@context": "http://purl.org/pearson/paf/v1/ctx/core/SequenceNode",
                 "@type": "SequenceNude",
                 "nodeIndex": 1,
                 "targetBinding": "http://repo.paf.dev.pearsoncmg.com/paf-repo/resources/activities/42d2b4f4-46bd-49ee-8f06-47b4421f599b/bindings/0"
            },
            url: "http://localhost/seqnode"
        };

    var incorrectReqMessage_illegalMethod = {
            header : {
                "Hub­-Session" : "AmazingHubSession",
                "Content­-Type" : "application/vnd.pearson.paf.v1.node+json"
            },
            content : {
                 "@context": "http://purl.org/pearson/paf/v1/ctx/core/SequenceNode",
                 "@type": "SequenceNude",
                 "nodeIndex": 1,
                 "targetBinding": "http://repo.paf.dev.pearsoncmg.com/paf-repo/resources/activities/42d2b4f4-46bd-49ee-8f06-47b4421f599b/bindings/0"
            },
            url: "http://localhost/seqnode",
            method: "PUST"
        };

    var incorrectReqMessage_wrongType = {
            header : {
                "Hub­-Session" : "AmazingHubSession",
                "Content­-Type" : "application/vnd.pearson.paf.v1.node+json"
            },
            content : {
                 "@context": "http://purl.org/pearson/paf/v1/ctx/core/SequenceNode",
                 "@type": "SequenceNude",
                 "nodeIndex": 1,
                 "targetBinding": "http://repo.paf.dev.pearsoncmg.com/paf-repo/resources/activities/42d2b4f4-46bd-49ee-8f06-47b4421f599b/bindings/0"
            },
            url: "http://localhost/seqnode",
            method: "POST"
        };

    var incorrectReqMessage_missingContext = {
            header : {
                "Hub­-Session" : "AmazingHubSession",
                "Content­-Type" : "application/vnd.pearson.paf.v1.node+json"
            },
            content : {
                 "@type": "SequenceNode",
                 "nodeIndex": 1,
                 "targetBinding": "http://repo.paf.dev.pearsoncmg.com/paf-repo/resources/activities/42d2b4f4-46bd-49ee-8f06-47b4421f599b/bindings/0"
            },
            url: "http://localhost/seqnode",
            method: "POST"
        };

    var incorrectReqMessage_missingType = {
            header : {
                "Hub­-Session" : "AmazingHubSession",
                "Content­-Type" : "application/vnd.pearson.paf.v1.node+json"
            },
            content : {
                 "@context": "http://purl.org/pearson/paf/v1/ctx/core/SequenceNode",
                 "nodeIndex": 1,
                 "targetBinding": "http://repo.paf.dev.pearsoncmg.com/paf-repo/resources/activities/42d2b4f4-46bd-49ee-8f06-47b4421f599b/bindings/0"
            },
            url: "http://localhost/seqnode",
            method: "POST"
        };

    var incorrectReqMessage_missingBinding = {
            header : {
                "Hub­-Session" : "AmazingHubSession",
                "Content­-Type" : "application/vnd.pearson.paf.v1.node+json"
            },
            content : {
                 "@context": "http://purl.org/pearson/paf/v1/ctx/core/SequenceNode",
                 "@type": "SequenceNode",
                 "nodeIndex": 1
            },
            url: "http://localhost/seqnode",
            method: "POST"
        };

    var amsProxy = null;
    var config = getConfig();
    var inputValidationErrorMsg = "Input validation error";

    before(function () {
        amsProxy = new AmsProxy(config);
    });

    it("returns the SequenceNode", function (done) {
        // The nocks will intercept the HTTP call and return without requiring the actual server. 
        setupNocks(config);
        var strMessage = JSON.stringify(correctReqMessage);
        var expectData = JSON.stringify(seqNodeBody);
        testReqNode(amsProxy, strMessage, null, expectData, done);
    });

    it("returns error at missing Hub-session", function (done) {
        // No need to setupNocks because the validation will fail and there will be no HTTP request at all
        var strMessage = JSON.stringify(incorrectReqMessage_missingHubSession);
        testReqNode(amsProxy, strMessage, inputValidationErrorMsg, null, done);
    });

    it("returns error at missing url", function (done) {
        // No need to setupNocks because the validation will fail and there will be no HTTP request at all
        var strMessage = JSON.stringify(incorrectReqMessage_missingUrl);
        testReqNode(amsProxy, strMessage, inputValidationErrorMsg, null, done);
    });

    it("returns error at missing method", function (done) {
        // No need to setupNocks because the validation will fail and there will be no HTTP request at all
        var strMessage = JSON.stringify(incorrectReqMessage_missingMethod);
        testReqNode(amsProxy, strMessage, inputValidationErrorMsg, null, done);
    });

    it("returns error at illegal method", function (done) {
        // No need to setupNocks because the validation will fail and there will be no HTTP request at all
        var strMessage = JSON.stringify(incorrectReqMessage_illegalMethod);
        testReqNode(amsProxy, strMessage, inputValidationErrorMsg, null, done);
    });    

    it("returns error at content wrong type", function (done) {
        // No need to setupNocks because the validation will fail and there will be no HTTP request at all
        var strMessage = JSON.stringify(incorrectReqMessage_wrongType);
        testReqNode(amsProxy, strMessage, inputValidationErrorMsg, null, done);
    });

    it("returns error at content empty context", function (done) {
        var strMessage = JSON.stringify(incorrectReqMessage_missingContext);
        testReqNode(amsProxy, strMessage, inputValidationErrorMsg, null, done);
    });  

    it("returns error at content missing type", function (done) {
        var strMessage = JSON.stringify(incorrectReqMessage_missingType);
        testReqNode(amsProxy, strMessage, inputValidationErrorMsg, null, done);
    });  

    it("returns error at content missing binding", function (done) {
        var strMessage = JSON.stringify(incorrectReqMessage_missingBinding);
        testReqNode(amsProxy, strMessage, inputValidationErrorMsg, null, done);
    });  
});

/**
 * A HTTP server mock that intercepts HTTP call and returns as configured.
 * This particular Nock will intercept AMS call and return code 200 with the 
 * body as specified in the global variable seqNodeBody
 *
 * @param {object} config  - Should contain config.amsBaseUrl.
 */
function setupNocks(config) {
    var amsNock = nock(config.amsBaseUrl);
    amsNock.post("/seqnode")
        .matchHeader('Content­-Type', 'application/vnd.pearson.paf.v1.node+json')
        .matchHeader('Hub­-Session', 'AmazingHubSession')
        .reply(200, JSON.stringify(seqNodeBody));
        
}

/**
 * Returns a config object with only those fields used in this test. 
 */
function getConfig() {
    return {
        "amsBaseUrl": "http://localhost",
    };
}


/**
 * start the Redis server.
 * NOTE: this method is not being used yet.
 *       You will have to run the Redis server manually, otherwise the test 
 *       will fail with ECONNREFUSED error message.
 */
function createRedisServer( callback ) { 
     redisserver = spawn("redis-server", ["test/redis.conf"] );
     redisserver.stderr.setEncoding("utf8");
     redisserver.stderr.on("data", function(data){
         console.log( "stderr: ", data );
     });
     redisserver.stdout.setEncoding("utf8");
     redisserver.stdout.on("data", function(data){
         if (/Server started/.test(data)) {
             if ( "function" == typeof callback ) {
                 callback();
             }
         }
     });
 }