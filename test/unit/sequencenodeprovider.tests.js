/* **************************************************************************
 * $Workfile:: ams_api.tests.js                                             $
 * *********************************************************************/ /**
 *
 * @fileoverview Contains unit tests for the sequence node retrieval interface, 
 * basically tests for the behavior of sequencenodeprovider.js
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

var fs = require('fs');
var nock = require('nock');
var SequenceNodeProvider = require('../../lib/sequencenodeprovider.js');
var spawn = require('child_process').spawn;
var redis = require('redis');
var expect = require('chai').expect;

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
 * Encapsulating an assert function (i.e. chai) so it checks
 */
function checkDoneOnException( done, fn ) {
    try {
        fn();
        done();
    } catch( e ) {
        done( e );
    }
}


/**
 * Tests the seqNodeProvider's getSequenceNode operation.
 * It sends request messages proxy and validates the response.
 * For successful retrieval, it also validates that the AMS proxy has correctly set the cache. 
 *
 * Dev Note: If you do not wrap with try/catch the expect() function, the done() will never
 *           be called, and test will fail with timeout instead of the actual assert.
 *
 * @param {SequenceNodeProvider} seqNodeProvider   - The SequenceNodeProvider instance
 * @param {string} sequenceNodeIdentifier     - The JSON input parameter in string
 * @param {?string} expectError - The expected error message, or null if no error is expected
 * @param {?string} expectBody  - The expected result body (stringified JSON if necessary), or null if error is expected
 * @param {Function} done       - The done callback function for the Mocha's asynch testing
 */
function testReqNode(seqNodeProvider, sequenceNodeIdentifier, expectError, expectData, done) {

    // Make sure that the cache does not have the key yet (before the proxy call)
    redisClient = redis.createClient();

    seqNodeKey = seqNodeProvider.obtainSequenceNodeKey(sequenceNodeIdentifier);

    // Delete the cache entry prior calling the getSequenceNode()
    redisClient.del('SEQN:' + seqNodeKey, function(error, body) {

        seqNodeProvider.getSequenceNode(sequenceNodeIdentifier, function(error, body) {
        
            if (expectError === null) {
                // No error means we should be able to retrieve it from cache as well.
                try 
                {
                    expect(error).to.equal(null);
                } 
                catch( e ) 
                {
                    done( e ) // failure: call done with an error Object to indicate that it() failed
                    return;
                } 

                // Check cache as well
                seqNodeProvider.getSequenceNode(sequenceNodeIdentifier, function(error, body){
                    try 
                    {
                        expect(error).to.equal(null);
                        expect(JSON.stringify(body.sequenceNodeContent)).to.equal(expectData);
                        expect(body.sequenceNodeKey).to.equal(seqNodeKey);
                        expect(body.fromCache).to.equal(true);
                    } 
                    catch( e ) 
                    {
                        done( e ) // failure: call done with an error Object to indicate that it() failed
                        return;
                    } 
                });
            } 
            else // An error was expected 
            {
                try 
                {
                    expect(error).to.equal(expectError);
                } 
                catch( e ) 
                {
                    done( e ) // failure: call done with an error Object to indicate that it() failed
                    return;
                } 
                
            }

            // Compare against expected Data
            if (expectData !== null) {
                try 
                {
                    expect(JSON.stringify(body.sequenceNodeContent)).to.equal(expectData);
                }
                catch( e ) 
                {
                    done( e ) // failure: call done with an error Object to indicate that it() failed
                    return;
                } 
            }

            done();
        });
    }); 
}


describe('SequenceNodeProvider', function () {

    var HUB_SESSION = "AmazingHubSession";
    // Define different test input messages (sequence node ID as sent from AMS)
    var correctReqMessage = {
            header : {
                "Hub­-Session" : HUB_SESSION,
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
                "Hub­-Session" : HUB_SESSION,
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
                "Hub­-Session" : HUB_SESSION,
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
                "Hub­-Session" : HUB_SESSION,
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
                "Hub­-Session" : HUB_SESSION,
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
                "Hub­-Session" : HUB_SESSION,
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
                "Hub­-Session" : HUB_SESSION,
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
                "Hub­-Session" : HUB_SESSION,
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

    var seqNodeProvider = null;
    var config = getConfig();
    var inputValidationErrorMsg = 'Input validation error';

    before(function () {
        seqNodeProvider = new SequenceNodeProvider(config);
    });

    it('should return the SequenceNode given sequence node identifier', function (done) {
        // The nocks will intercept the HTTP call and return without requiring the actual server. 
        setupNocks(config);
        var strMessage = JSON.stringify(correctReqMessage);
        var expectData = JSON.stringify(seqNodeBody);
        
        testReqNode(seqNodeProvider, strMessage, null, expectData, done);
    });

    it('should return the SequenceNode (from cache) given sequence node key', function (done) {
        var expectData = JSON.stringify(seqNodeBody);

        var seqNodeKey = seqNodeProvider.obtainSequenceNodeKey(JSON.stringify(correctReqMessage));
        seqNodeProvider.getSequenceNodeByKey(seqNodeKey, function(error, body){
            try {
                expect(error).to.equal(null);
                expect(JSON.stringify(body.sequenceNodeContent)).to.equal(expectData);
                expect(body.hubSession).to.equal(HUB_SESSION);
                done();
            }
            catch ( e )
            {
                done(e);
            }
        });
    });

    it('should return error at missing Hub-session', function (done) {
        // No need to setupNocks because the validation will fail and there will be no HTTP request at all
        var strMessage = JSON.stringify(incorrectReqMessage_missingHubSession);
        testReqNode(seqNodeProvider, strMessage, inputValidationErrorMsg, null, done);
    });

    it('should return error at missing url', function (done) {
        // No need to setupNocks because the validation will fail and there will be no HTTP request at all
        var strMessage = JSON.stringify(incorrectReqMessage_missingUrl);
        testReqNode(seqNodeProvider, strMessage, inputValidationErrorMsg, null, done);
    });

    it('should return error at missing method', function (done) {
        // No need to setupNocks because the validation will fail and there will be no HTTP request at all
        var strMessage = JSON.stringify(incorrectReqMessage_missingMethod);
        testReqNode(seqNodeProvider, strMessage, inputValidationErrorMsg, null, done);
    });

    it('should return error at illegal method', function (done) {
        // No need to setupNocks because the validation will fail and there will be no HTTP request at all
        var strMessage = JSON.stringify(incorrectReqMessage_illegalMethod);
        testReqNode(seqNodeProvider, strMessage, inputValidationErrorMsg, null, done);
    });    

    it('should return error at content wrong type', function (done) {
        // No need to setupNocks because the validation will fail and there will be no HTTP request at all
        var strMessage = JSON.stringify(incorrectReqMessage_wrongType);
        testReqNode(seqNodeProvider, strMessage, inputValidationErrorMsg, null, done);
    });

    it('should return error at content empty context', function (done) {
        var strMessage = JSON.stringify(incorrectReqMessage_missingContext);
        testReqNode(seqNodeProvider, strMessage, inputValidationErrorMsg, null, done);
    });  

    it('should return error at content missing type', function (done) {
        var strMessage = JSON.stringify(incorrectReqMessage_missingType);
        testReqNode(seqNodeProvider, strMessage, inputValidationErrorMsg, null, done);
    });  

    it('should return error at content missing binding', function (done) {
        var strMessage = JSON.stringify(incorrectReqMessage_missingBinding);
        testReqNode(seqNodeProvider, strMessage, inputValidationErrorMsg, null, done);
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
    amsNock.post('/seqnode')
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
     redisserver = spawn('redis-server', ['test/redis.conf'] );
     redisserver.stderr.setEncoding('utf8');
     redisserver.stderr.on('data', function(data){
         console.log( 'stderr: ', data );
     });
     redisserver.stdout.setEncoding('utf8');
     redisserver.stdout.on('data', function(data){
         if (/Server started/.test(data)) {
             if ( 'function' == typeof callback ) {
                 callback();
             }
         }
     });
 }