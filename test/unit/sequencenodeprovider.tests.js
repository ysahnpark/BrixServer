/* **************************************************************************
 * $Workfile:: sequencenodeprovider.tests.js                                             $
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
//force test environment
process.env.NODE_ENV = 'test';

var fs = require('fs');
var spawn = require('child_process').spawn;
var redis = require('redis');
var expect = require('chai').expect;
var config = require('config');

var utils = require('../../lib/utils.js');
var HubMock = require('../mock/hub.mock.js');

var SequenceNodeProvider = require('../../lib/sequencenodeprovider.js').SequenceNodeProvider;


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
    var redisClient = redis.createClient();

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
                    done( e ); // failure: call done with an error Object to indicate that it() failed
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

    var HUB_SESSION = HubMock.testHubSession;
    // Define different test input messages (sequence node ID as sent from AMS)
    var correctReqMessage = utils.cloneObject(HubMock.testSeqNodeReqMessage);

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
    var inputValidationErrorMsg = 'Input validation error';

    before(function () {
        seqNodeProvider = new SequenceNodeProvider();
    });

    it('should return the SequenceNode given sequence node identifier', function (done) {
        // The Mocks will intercept the HTTP call and return without requiring the actual server. 
        var hubnock = new HubMock.HubNock();
        hubnock.setupNocks('http://hub.pearson.com');
        var strMessage = correctReqMessage;
        var expectData = JSON.stringify(HubMock.testSeqNodeBody);
        
        testReqNode(seqNodeProvider, strMessage, null, expectData, done);
    });

    it('should return the SequenceNode (from cache) given sequence node key', function (done) {
        var hubnock = new HubMock.HubNock();
        var expectData = JSON.stringify(HubMock.testSeqNodeBody);

        var seqNodeKey = seqNodeProvider.obtainSequenceNodeKey(correctReqMessage);
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
        var strMessage = incorrectReqMessage_missingHubSession;
        testReqNode(seqNodeProvider, strMessage, inputValidationErrorMsg, null, done);
    });

    it('should return error at missing url', function (done) {
        // No need to setupNocks because the validation will fail and there will be no HTTP request at all
        var strMessage = incorrectReqMessage_missingUrl;
        testReqNode(seqNodeProvider, strMessage, inputValidationErrorMsg, null, done);
    });

    it('should return error at missing method', function (done) {
        // No need to setupNocks because the validation will fail and there will be no HTTP request at all
        var strMessage = incorrectReqMessage_missingMethod;
        testReqNode(seqNodeProvider, strMessage, inputValidationErrorMsg, null, done);
    });

    it('should return error at illegal method', function (done) {
        // No need to setupNocks because the validation will fail and there will be no HTTP request at all
        var strMessage = incorrectReqMessage_illegalMethod;
        testReqNode(seqNodeProvider, strMessage, inputValidationErrorMsg, null, done);
    });

    it('should return error at content wrong type', function (done) {
        // No need to setupNocks because the validation will fail and there will be no HTTP request at all
        var strMessage = incorrectReqMessage_wrongType;
        testReqNode(seqNodeProvider, strMessage, inputValidationErrorMsg, null, done);
    });

    it('should return error at content empty context', function (done) {
        var strMessage = incorrectReqMessage_missingContext;
        testReqNode(seqNodeProvider, strMessage, inputValidationErrorMsg, null, done);
    });

    it('should return error at content missing type', function (done) {
        var strMessage = incorrectReqMessage_missingType;
        testReqNode(seqNodeProvider, strMessage, inputValidationErrorMsg, null, done);
    });

    it('should return error at content missing binding', function (done) {
        var strMessage = incorrectReqMessage_missingBinding;
        testReqNode(seqNodeProvider, strMessage, inputValidationErrorMsg, null, done);
    });
});


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
         //console.log( 'stderr: ', data );
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