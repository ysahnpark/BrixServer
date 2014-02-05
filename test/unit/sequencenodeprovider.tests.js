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
 * @param {Object} sequenceNodeIdentifier     - The JSON input parameter in string
 * @param {?string} expectError - The expected error message, or null if no error is expected
 * @param {?string} expectBody  - The expected result body (stringified JSON if necessary), or null if error is expected
 * @param {Function} done       - The done callback function for the Mocha's asynch testing
 */
function testReqNode(seqNodeProvider, sequenceNodeIdentifier, expectError, expectData, done) {

    // Make sure that the cache does not have the key yet (before the proxy call)
    var redisClient = utils.getRedisClient(config);

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
                        // Check that sequenceNodeKey was added in to brix's targetActivity
                        expect(body.sequenceNodeContent.targetActivity.sequenceNodeKey).to.equal(seqNodeKey);
                        // Remove brix's targetActivity.sequenceNodeKey before comparing returned value with expected
                        delete body.sequenceNodeContent.targetActivity.sequenceNodeKey;
                        expect(JSON.stringify(body.sequenceNodeContent)).to.equal(expectData);
                        expect(body.sequenceNodeKey).to.equal(seqNodeKey);
                        expect(body.fromCache).to.equal(true);
                        expect(body.itemCorrelationToken).to.be.not.null;
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
                    expect(error.message).to.equal(expectError);
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
                    // Check that sequenceNodeKey was added in to brix's targetActivity
                    expect(body.sequenceNodeContent.targetActivity.sequenceNodeKey).to.equal(seqNodeKey);
                    // Remove brix's targetActivity.sequenceNodeKey before comparing returned value with expected
                    delete body.sequenceNodeContent.targetActivity.sequenceNodeKey;
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

    var incorrectReqMessage_missingHubSession = utils.cloneObject(correctReqMessage);
    delete incorrectReqMessage_missingHubSession.header['Hub-Session'];

    var incorrectReqMessage_missingUrl = utils.cloneObject(correctReqMessage);
    delete incorrectReqMessage_missingUrl['url'];
    
    var incorrectReqMessage_missingMethod = utils.cloneObject(correctReqMessage);
    delete incorrectReqMessage_missingMethod['method'];
    
    var incorrectReqMessage_illegalMethod = utils.cloneObject(correctReqMessage);
    incorrectReqMessage_illegalMethod.method = 'PUST';

    var incorrectReqMessage_wrongType = utils.cloneObject(correctReqMessage);
    incorrectReqMessage_wrongType.content["@type"] = "SequenceNude";
    
    var incorrectReqMessage_missingContext = utils.cloneObject(correctReqMessage);
    delete incorrectReqMessage_missingContext.content['@context'];
    
    var incorrectReqMessage_missingType = utils.cloneObject(correctReqMessage);
    delete incorrectReqMessage_missingType.content['@type'];
    
    var incorrectReqMessage_missingBinding = utils.cloneObject(correctReqMessage);
    delete incorrectReqMessage_missingBinding.content['targetBinding'];

    var seqNodeProvider = null;
    var inputValidationErrorMsg = 'Input validation error';

    before(function () {
        seqNodeProvider = new SequenceNodeProvider();
    });

    it('should return the SequenceNode given sequence node identifier', function (done) {
        // The Mocks will intercept the HTTP call and return without requiring the actual server. 
        var hubnock = new HubMock.HubNock();
        hubnock.setupSequenceNodeNock(HubMock.testHubBaseUrl);
        var strMessage = correctReqMessage;
        var expectData = HubMock.testSeqNodeBody;
        expectData.targetActivity.maxAttempts = 3;
        
        testReqNode(seqNodeProvider, strMessage, null, JSON.stringify(expectData), done);
    });

    it('should return the SequenceNode (from cache) given sequence node key', function (done) {
        var hubnock = new HubMock.HubNock();
        var expectData = HubMock.testSeqNodeBody;
        expectData.targetActivity.maxAttempts = 3;

        var seqNodeKey = seqNodeProvider.obtainSequenceNodeKey(correctReqMessage);
        seqNodeProvider.getSequenceNodeByKey(seqNodeKey, function(error, body){
            try {
                expect(error).to.equal(null);
                // Check that sequenceNodeKey was added in to brix's targetActivity
                expect(body.sequenceNodeContent.targetActivity.sequenceNodeKey).to.equal(seqNodeKey);
                // Remove brix's targetActivity.sequenceNodeKey before comparing returned value with expected
                delete body.sequenceNodeContent.targetActivity.sequenceNodeKey;
                expect(JSON.stringify(body.sequenceNodeContent)).to.equal(JSON.stringify(expectData));
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
        // No need to use nock because the validation will fail and there will be no HTTP request at all
        var strMessage = incorrectReqMessage_missingHubSession;
        testReqNode(seqNodeProvider, strMessage, inputValidationErrorMsg, null, done);
    });

    it('should return error at missing url', function (done) {
        // No need to use nock because the validation will fail and there will be no HTTP request at all
        var strMessage = incorrectReqMessage_missingUrl;
        testReqNode(seqNodeProvider, strMessage, inputValidationErrorMsg, null, done);
    });

    it('should return error at missing method', function (done) {
        // No need to use nock because the validation will fail and there will be no HTTP request at all
        var strMessage = incorrectReqMessage_missingMethod;
        testReqNode(seqNodeProvider, strMessage, inputValidationErrorMsg, null, done);
    });

    it('should return error at illegal method', function (done) {
        // No need to use nock because the validation will fail and there will be no HTTP request at all
        var strMessage = incorrectReqMessage_illegalMethod;
        testReqNode(seqNodeProvider, strMessage, inputValidationErrorMsg, null, done);
    });

    it('should return error at content wrong type', function (done) {
        // No need to use nock because the validation will fail and there will be no HTTP request at all
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

    it('should correctly extract itemIds', function () {
        var itemIds = seqNodeProvider.extractItemIds(HubMock.testSeqNodeBody);

        var expected = {
            activity_id: HubMock.seqNodeBodyTemplate.targetBinding.boundActivity,
            assignment_id: HubMock.seqNodeBodyTemplate.parentSequence.toolSettings.assignmentUrl
        };
        expect(itemIds).to.deep.equal(expected);

    });

    it('should itemIds should be null if sequence node content does not contain required fields', function () 
    {
        var message = utils.cloneObject(HubMock.testSeqNodeBody);
        delete message.parentSequence['toolSettings']['assignmentUrl'];
        var itemIds = seqNodeProvider.extractItemIds(message);
        expect(itemIds).to.be.null;

        delete message.parentSequence['toolSettings'];
        itemIds = seqNodeProvider.extractItemIds(message);
        expect(itemIds).to.be.null;

        message = utils.cloneObject(HubMock.testSeqNodeBody);
        delete message.targetBinding['boundActivity'];
        var itemIds = seqNodeProvider.extractItemIds(message);
        expect(itemIds).to.be.null;

        delete message['targetBinding'];
        itemIds = seqNodeProvider.extractItemIds(message);
        expect(itemIds).to.be.null;
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