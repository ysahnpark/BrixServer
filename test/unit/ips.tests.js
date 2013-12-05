/* **************************************************************************
 * $Workfile:: ips.tests.js                                             $
 * *********************************************************************/ /**
 *
 * @fileoverview Contains unit tests for ips.js
 *
 *
 * Created on       Sept 12, 2013
 * @author          Seann Ives
 *
 * @copyright (c) 2013 Pearson, All rights reserved.
 *
 * **************************************************************************/
//force test environment
process.env.NODE_ENV = 'test';

var sinon = require('sinon');
var nock = require('nock');
var expect = require('chai').expect;
var config = require('config');

var utils = require('../../lib/utils');
var HubMock = require('../mock/hub.mock');
var CEMock = require('../mock/ce.mock');
var SequenceNodeProvider = require('../../lib/sequencenodeprovider').SequenceNodeProvider;
var Ips = require('../../lib/ips').Ips;

var sampleMcpConfig = HubMock.testSeqNodeBodySubmittable.targetActivity;

var sampleDataConfig = require('../test_messages/SampleMultipleChoiceConfig.json');

/**
 * Correctly formed interaction request message.
 */
var interactionMessage = {
    "sequenceNodeKey": "895af0ae2d8aa5bffba54ab0555d7461",
    "timestamp": "2013-05-25T13:21:22.001Z",
    "type": "interaction",
    "body": {
        "interactionData": "...some stuff..."
    }
};

/**
 * Correctly formed submission request message.
 */
var submissionMessage = {
    "sequenceNodeKey": "895af0ae2d8aa5bffba54ab0555d7461",
    "timestamp": "2013-05-25T13:21:22.001Z",
    "type": "submission",
    "body": {
        "studentSubmission": { "key": "option001" }
    }
};

/**
 * Clones a JSON object
 */
function cloneObject(obj)
{
    return JSON.parse(JSON.stringify(obj));
}

describe('IPS Posting Interaction', function() {
    var ips = null;
    var hubnock = null;
    var seqNodeProvider = null;
    var seqNodeReqMessage = HubMock.testInitializationEnvelope;

    var sequenceNodeKey = null;
    var seqNodeKeyToRemove = null;

    before(function (done) {
        ips = new Ips();
        seqNodeProvider = new SequenceNodeProvider();

        hubnock = new HubMock.HubNock();
        hubnock.setupSequenceNodeNock(HubMock.testHubBaseUrl);
        
        // Retrieving sequence node is pre-requisite in the flow for other
        // operations: post interaction and submission. 
        seqNodeKeyToRemove = seqNodeProvider.obtainSequenceNodeKey(seqNodeReqMessage.sequenceNodeIdentifier);

        ips.removeFromCache__(seqNodeKeyToRemove, function(removeErr, removeRes){
            ips.retrieveSequenceNode(seqNodeReqMessage, function(error, result) {
                // there must be no errors
                //console.log(result);
                sequenceNodeKey = result.sequenceNodeKey;
                done();
            });
        });
        
    });

    after(function (done) {
        // clean up after ourselves
        ips.removeFromCache__(seqNodeKeyToRemove, function(removeErr, removeRes){
            done();
        });
    });

    it('should return non-error empty correct request message', function (done) {
        hubnock.setupSubmissionNock(HubMock.testHubBaseUrl);
        var param = cloneObject(interactionMessage);
        
        param.sequenceNodeKey = sequenceNodeKey;

        ips.postInteraction(param, function(err, result) {
            try {
                expect(err).to.equal(null);
                expect(result).to.equal(HubMock.testInteractionResponseBody); // which is ''
                done();
            }
            catch (e)
            {
                done(e);
            }

        });
    });


    it('should return error at SequenceNodeKey not found', function (done) {
        var param = cloneObject(interactionMessage);
        param.sequenceNodeKey = 'ABC';
        var expectedErrorMessage = 'SequenceNodeKey ' + param.sequenceNodeKey + ' not found.';
        ips.postInteraction(param, function(err, result) {
            try {
                expect(err.message).to.equal(expectedErrorMessage);
                done();
            }
            catch (e)
            {
                done(e);
            }
        });
    });

    it('should return error at invalid Hub-Session (e.g. expired)', function (done) {
        // How can we explicitly expire hub session?
        hubnock.setupSubmissionNock(HubMock.testHubBaseUrl, HubMock.testHubSessionInvalid);
        var param = cloneObject(interactionMessage);
        param.sequenceNodeKey = sequenceNodeKey;
        var expectedErrorMessage = 'Invalid Hub-Session';
        ips.postInteraction(param, function(err, result) {
            try {
                //console.log(JSON.stringify(err));
                expect(err).to.equal(expectedErrorMessage);
                done();
            }
            catch (e)
            {
                done(e);
            }
        });
    });
});

/*
    These test /js/amsproxy.js and /js/ceproxy.js in an "integrationy" kind of way.
 */
describe('IPS Posting Submission using a Nock AMS and Nock CE', function() {
    var ips = null;
    var hubnock = null;
    var seqNodeProvider = null;
    var seqNodeReqMessage = HubMock.testInitializationEnvelopeSubmittable;

    var sequenceNodeKey = null;
    var seqNodeKeyToRemove = null;

    before(function (done) {
        ips = new Ips();
        seqNodeProvider = new SequenceNodeProvider();

        hubnock = new HubMock.HubNock();
        hubnock.setupSequenceNodeNock(HubMock.testHubBaseUrl, HubMock.testSeqNodeBodySubmittable);

        // setup mock to catch calls to CorrectnessEngine
        cenock = new CEMock.CENock();

        // Retrieving sequence node is pre-requisite in the flow for other
        // operations: post interaction and submission. 
        seqNodeKeyToRemove = seqNodeProvider.obtainSequenceNodeKey(seqNodeReqMessage.sequenceNodeIdentifier);
        ips.removeFromCache__(seqNodeKeyToRemove, function(removeErr, removeRes){

            ips.retrieveSequenceNode(seqNodeReqMessage, function(error, result) {
                // there must be no errors
                //console.log(result);
                sequenceNodeKey = result.sequenceNodeKey;
                done();
            });
        });
    });

    afterEach(function (done) {
        // Nocks can bleed from one test to the next, especially if you're testing error conditions.
        // This cleans them up after each 'it'.
        nock.cleanAll();
        done();
    });

    after(function (done) {
        // clean up after ourselves
        ips.removeFromCache__(seqNodeKeyToRemove, function(removeErr, removeRes){
            done();
        });
    });


    // @todo - ECOURSES-707
    it.skip('should calculate isLastAttempt (private func)', function (done) {
        expect(false).to.be.ok;
        done();
    });

    it('should return a valid response given a good request message', function (done) {
        hubnock.setupSubmissionNock(HubMock.testHubBaseUrl);
        cenock.setupAssessmentNock(CEMock.testCEBaseUrl);

        
        var param = cloneObject(submissionMessage);
        // Assign the correct sequenceNodeKey
        param.sequenceNodeKey = sequenceNodeKey;
        
        ips.postSubmission(param, function(err, result) {
            try {
                expect(err).to.equal(null);
                expect(result).to.be.an('object');
                expect(result).to.deep.equal(CEMock.testAssessmentResponseBody.data);
                done();
            }
            catch (e)
            {
                done(e);
            }

        });
    });

    it('should return a valid error response given a bad request message', function (done) {
        hubnock.setupSubmissionNock(HubMock.testHubBaseUrl);
        cenock.setupAssessmentErrorNock(CEMock.testCEBaseUrl);
        
        var param = cloneObject(submissionMessage);
        // Assign the correct sequenceNodeKey
        param.sequenceNodeKey = sequenceNodeKey;
        
        ips.postSubmission(param, function(err, result) {
            try {
                expect(result).to.equal(null);
                // Just the message is being sent via err
                expect(err.body.message).to.equal(CEMock.testErrorAssessmentResponseBody.message);
                done();
            }
            catch (e)
            {
                done(e);
            }

        });
    });


    it('should return error at SequenceNodeKey not found', function (done) {
        var param = cloneObject(submissionMessage);
        cenock.setupAssessmentNock(CEMock.testCEBaseUrl);
        param.sequenceNodeKey = 'ABC';
        var expectedErrorMessage = 'SequenceNodeKey ' + param.sequenceNodeKey + ' not found.';
        ips.postSubmission(param, function(err, result) {
            try
            {
                expect(err.message).to.equal(expectedErrorMessage);
                done();
            }
            catch (e)
            {
                done(e);
            }
            
        });
    });

    it('should return error at invalid Hub-Session (i.e. expired)', function (done) {
        // How can we explicitly expire hub session?
        hubnock.setupSubmissionNock(HubMock.testHubBaseUrl, HubMock.testHubSessionInvalid);
        cenock.setupAssessmentNock(CEMock.testCEBaseUrl);

        var param = cloneObject(submissionMessage);
        param.sequenceNodeKey = sequenceNodeKey;
        var expectedErrorMessage = 'Invalid Hub-Session';
        ips.postSubmission(param, function(err, result) {
            try {
                expect(err).to.equal(expectedErrorMessage);
                done();
            }
            catch (e)
            {
                done(e);
            }
        });
    });

    it('should create a Submission NodeResult for a correct answer', function () {

        var ceResult = CEMock.testAssessmentResponseBody;
        var studentSubmission = { submission: "option000" };

        var nodeResult = ips.buildSubmissionNodeResult__(ceResult, studentSubmission, HubMock.testNodeResult.itemCorrelationToken);
        
        expect(nodeResult.timestamp).to.match(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d*Z/);
        // change timestamp on nodeResult to match test ceResult
        nodeResult.timestamp = "2013-10-25T20:21:21.822Z";
        // check the nodeResult, minus the timestamp part
        nodeResult.nodeData.timestamp = "2013-10-25T20:21:21.822Z";

        expect(nodeResult).to.deep.equal(HubMock.testNodeResult);
    });

    it('should create a Submission NodeResult for an incorrect answer', function () {

        var ceResult = CEMock.testAssessmentWithIncorrectResponseBody;
        var studentSubmission = { submission: "option003" };

        var nodeResult = ips.buildSubmissionNodeResult__(ceResult, studentSubmission, HubMock.testNodeResult.itemCorrelationToken);

        expect(nodeResult.timestamp).to.match(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d*Z/);
        // change timestamp on nodeResult to match test ceResult
        nodeResult.timestamp = "2013-10-25T20:21:21.822Z";
        // check the nodeResult, minus the timestamp part
        nodeResult.nodeData.timestamp = "2013-10-25T20:21:21.822Z";
        
        expect(nodeResult).to.deep.equal(HubMock.testNodeResultIncorrect);
    });

    it('should correctly update the sequenceNode (private func)', function () {
        var seqNodeInfo = {};
        seqNodeInfo.sequenceNodeContent = cloneObject(HubMock.testSeqNodeBody);
        var nodeResult = HubMock.testNodeResultIncorrect;
        
        var updatedSequenceNode = ips.appendResultToSequenceNode__(seqNodeInfo, nodeResult);
        
        expect(updatedSequenceNode).to.be.an('object');
        expect(updatedSequenceNode.sequenceNodeContent.nodeResult[0]).to.deep.equal(nodeResult);
    });

    it('should correctly update the sequenceNode if PAF/AMS returns sequenceNode without an empty nodeResult (private func)', function () {
        var seqNodeInfo = {};
        seqNodeInfo.sequenceNodeContent = cloneObject(HubMock.testSeqNodeBody);
        var nodeResult = HubMock.testNodeResultIncorrect;

        // Remove the nodeResult from our sequenceNode
        delete seqNodeInfo.sequenceNodeContent.nodeResult;

        var updatedSequenceNode = ips.appendResultToSequenceNode__(seqNodeInfo, nodeResult);
        
        expect(updatedSequenceNode).to.be.an('object');
        expect(updatedSequenceNode.sequenceNodeContent.nodeResult[0]).to.deep.equal(nodeResult);
    });

    it('should calculate attempts made with a sequenceNode lacking a nodeResult (private func)', function () {
        var sequenceNode = cloneObject(HubMock.testSeqNodeBody);

        // Normal case, empty array
        expect(sequenceNode.nodeResult).to.be.an('array');
        expect(sequenceNode.nodeResult.length).to.equal(0);
        var attemptsMade = ips.calculateAttemptsMade__(sequenceNode);
        expect(attemptsMade).to.be.equal(1);

        // Remove the nodeResult from our sequenceNode
        delete sequenceNode.nodeResult;

        attemptsMade = ips.calculateAttemptsMade__(sequenceNode);
        expect(attemptsMade).to.be.equal(1);
    });
});

describe('IPS retrieveSequenceNode', function () {
    var ips = null;
    var seqNodeProvider = null;
    var seqNodeReqMessage = HubMock.testInitializationEnvelope;

    var sequenceNodeKey = null;
    var seqNodeKeyToRemove = null;
    var targetActivity = null;

    before(function (done) {
        ips = new Ips();

        seqNodeProvider = new SequenceNodeProvider();
        seqNodeKeyToRemove = seqNodeProvider.obtainSequenceNodeKey(seqNodeReqMessage.sequenceNodeIdentifier);
        ips.removeFromCache__(seqNodeKeyToRemove, function(removeErr, removeRes){
            done();
        });
    });

    after(function (done) {
        // clean up after ourselves
        ips.removeFromCache__(seqNodeKeyToRemove, function(removeErr, removeRes){
            done();
        });
    });

    // We sandbox our sinon stubs within each 'it'.  Otherwise the method wrapper we write in on lasts indefinitely.
    var sandbox;
    beforeEach(function () {
        sandbox = sinon.sandbox.create();
    });
    afterEach(function () {
        sandbox.restore();
    });


    it('should return a sequenceNode', function (done) {

        var stubTargetActivity = {
                "containerConfig": [
                    {
                        "containerId": "assessment25",
                        "brixConfig": [
                            {
                                "bricId": "dummyStubBricId",
                                "bricType": "dummyStubBricType",
                                "config": {},
                                "answerKey": {}
                            }]
                    }]
                };
        var stub = sandbox.stub(ips.sequenceNodeProvider, "getSequenceNode", function (sequenceNodeIdentifier, callback) {
            var sequenceNodeKey = '123';
            var data = {"targetActivity": stubTargetActivity
            };
            
            callback(null, {sequenceNodeKey: sequenceNodeKey, sequenceNodeContent: data, fromCache:false});
        });

        // Expected is sanitized and config added
        var expectedTargetActivity = utils.cloneObject(stubTargetActivity);
        delete expectedTargetActivity.containerConfig[0].brixConfig[0].answerKey;
        expectedTargetActivity.imgBaseUrl = config.imgBaseUrl;

        ips.retrieveSequenceNode(seqNodeReqMessage, function(error, result) {
            sequenceNodeKey = result.sequenceNodeKey;
            targetActivity = result.activityConfig;
            expect(sequenceNodeKey).to.be.not.null;
            expect(sequenceNodeKey).to.be.a('string');
            expect(sequenceNodeKey).to.be.equal('123');
            expect(targetActivity).to.be.an('object');
            expect(targetActivity).to.deep.equal(expectedTargetActivity);
            
            // calledOnce is property of sinon.spy which is super class of sinon.stub.
            expect(ips.sequenceNodeProvider.getSequenceNode.calledOnce).to.be.true;
            done();
        });
    });

    it('should handle an error', function (done) {

        var stub = sandbox.stub(ips.sequenceNodeProvider, "getSequenceNode", function (sequenceNodeIdentifier, callback) {
            var error = "DANGER!  DANGER!  GET ON THE FLOOR...";
            var errorBody ={};
            errorBody.statusCode = 500;
            errorBody.error = error;
            
            callback(error, errorBody);
        });

        ips.retrieveSequenceNode(seqNodeReqMessage, function(error, result) {
            expect(error).to.be.equal('DANGER!  DANGER!  GET ON THE FLOOR...');
            expect(result).to.deep.equal({statusCode: 500, error: 'DANGER!  DANGER!  GET ON THE FLOOR...'});

            // calledOnce is property of sinon.spy which is super class of sinon.stub.
            expect(ips.sequenceNodeProvider.getSequenceNode.calledOnce).to.be.true;
            done();
        });
    });

    it('should correctly sanitize targetActivity', function () {
        var result = ips.sanitizeBrixConfig__(sampleMcpConfig);
        
        // Verify that the original does contain the answerKey
        sampleMcpConfig.containerConfig.forEach(function(containerItem, key){
            containerItem.brixConfig.forEach(function(val, key){
                if(val.bricType === 'MultipleChoiceQuestion')
                    expect(val).to.have.property('answerKey') ;
                expect(val).to.have.property('bricId');
                expect(val).to.have.property('bricType');
                expect(val).to.have.property('config');
                expect(val).to.have.property('configFixup');
            });
        });

        // Verify that the result does NOT contain the answerKey, 
        // but contains the rest of the sections
        result.containerConfig.forEach(function(containerItem, key){

            containerItem.brixConfig.forEach(function(val, key){
                expect(val).to.not.have.property('answerKey');
                // But should retain the rest of the sections 
                expect(val).to.have.property('bricId');
                expect(val).to.have.property('bricType');
                expect(val).to.have.property('config');
                expect(val).to.have.property('configFixup');
            });
        });
    });

    it('should correctly obtain the container by id (private func)', function () {

        var containerId = 'target1';
        var result = ips.obtainContainerItem__(sampleMcpConfig, containerId);
        
        var hasContainer = false;
        // Verify that the original does contain the container
        sampleMcpConfig.containerConfig.forEach(function(containerItem, key){
            if (containerItem.containerId === containerId)
                hasContainer = true;
        });
        expect(hasContainer).to.be.true;

        // Verify that the result does NOT contain the answerKey, 
        // but contains the rest of the sections
        expect(result.containerId).to.equal(containerId);
        expect(result).to.have.property('brixConfig');


    });

    it('should correctly obtain answer part (private func)', function () {

        var containerId = 'target1';

        // omitting second parameter returns first answerKey
        var result = ips.obtainAnswerPart__(sampleMcpConfig);
        
        expect(result).to.deep.equal(sampleMcpConfig.containerConfig[0].brixConfig[0].answerKey);

        result = ips.obtainAnswerPart__(sampleMcpConfig, containerId);
        expect(result).to.deep.equal(sampleMcpConfig.containerConfig[0].brixConfig[0].answerKey);

        result = ips.obtainAnswerPart__(sampleMcpConfig, 'dummyContainerX');
        expect(result).to.be.null;
    });
});

describe('IPS saving to Redis with Interactions using Nock AMS and Nock CE', function() {
    var ips = null;
    var hubnock = null;
    var seqNodeProvider = null;
    var seqNodeReqMessage = HubMock.testInitializationEnvelope;

    var sequenceNodeKey = null;
    var seqNodeKeyToRemove = null;

    before(function (done) {
        ips = new Ips();
        seqNodeProvider = new SequenceNodeProvider();

        hubnock = new HubMock.HubNock();
        hubnock.setupSequenceNodeNock(HubMock.testHubBaseUrl);
        
        // Retrieving sequence node is pre-requisite in the flow for other
        // operations: post interaction and submission. 
        seqNodeKeyToRemove = seqNodeProvider.obtainSequenceNodeKey(seqNodeReqMessage.sequenceNodeIdentifier);
        ips.removeFromCache__(seqNodeKeyToRemove, function(removeErr, removeRes){
            ips.retrieveSequenceNode(seqNodeReqMessage, function(error, result) {
                // there must be no errors
                //console.log(result);
                sequenceNodeKey = result.sequenceNodeKey;
                done();
            });
        });
        
    });

    after(function (done) {
        // clean up after ourselves
        ips.removeFromCache__(seqNodeKeyToRemove, function(removeErr, removeRes){
            done();
        });
    });

    it('should save sequenceNode in cache', function (done) {
        // This same test is in sequencenodeprovider.tests.js but here as a baseline
        var expectData = HubMock.testSeqNodeBody;
        expectData.targetActivity.maxAttempts = 3;

        seqNodeProvider.getSequenceNodeByKey(sequenceNodeKey, function(error, body){
            try {
                expect(error).to.equal(null);
                // Check that sequenceNodeKey was added in to brix's targetActivity
                expect(body.sequenceNodeContent.targetActivity.sequenceNodeKey).to.equal(sequenceNodeKey);
                // Remove brix's targetActivity.sequenceNodeKey before comparing returned value with expected
                delete body.sequenceNodeContent.targetActivity.sequenceNodeKey;
                expect(body.sequenceNodeContent).to.deep.equal(expectData);
                expect(body.hubSession).to.equal('HUB_SESSION');
//console.log(body.sequenceNodeContent.nodeResult);
                //expect(body.sequenceNodeContent.nodeResult[0]).to.be.undefined;
                done();
            }
            catch ( e )
            {
                done(e);
            }
        });
    });

    it('should add a NodeResult with the first Interaction', function (done) {
        hubnock.setupSubmissionNock(HubMock.testHubBaseUrl);
        var param = cloneObject(interactionMessage);
        
        param.sequenceNodeKey = sequenceNodeKey;

        ips.postInteraction(param, function(err, result) {
            try {
                expect(err).to.equal(null);
                expect(result).to.equal(HubMock.testInteractionResponseBody); // which is ''

                var expectData = JSON.stringify(HubMock.testSeqNodeBody);

                seqNodeProvider.getSequenceNodeByKey(sequenceNodeKey, function(error, body){
                    try {
                        expect(error).to.equal(null);
                        // Check that sequenceNodeKey was added in to brix's targetActivity
                        expect(body.sequenceNodeContent.targetActivity.sequenceNodeKey).to.equal(sequenceNodeKey);
                        // Check that there's now a single nodeResult on the content
                        expect(body.sequenceNodeContent.nodeResult).to.be.an('array');
                        expect(body.sequenceNodeContent.nodeResult[0]).to.be.an('object');
                        expect(body.sequenceNodeContent.nodeResult[1]).to.be.undefined;
                        // Check that our saved content's nodeResult matches what was submitted
                        expect(body.sequenceNodeContent.nodeResult[0].brixState).to.deep.equal(param.body.interactionData);
                        done();
                    }
                    catch ( e )
                    {
                        done(e);
                    }
                });


                //done();
            }
            catch (e)
            {
                done(e);
            }

        });
    });

    it('should update the NodeResult with the next Interaction', function (done) {
        hubnock.setupSubmissionNock(HubMock.testHubBaseUrl);
        var param = cloneObject(interactionMessage);
        
        param.sequenceNodeKey = sequenceNodeKey;
        // Change our input
        param.body.interactionData = 'this is my new stuff';

        ips.postInteraction(param, function(err, result) {
            try {
                expect(err).to.equal(null);
                expect(result).to.equal(HubMock.testInteractionResponseBody);

                var expectData = JSON.stringify(HubMock.testSeqNodeBody);

                seqNodeProvider.getSequenceNodeByKey(sequenceNodeKey, function(error, body){
                    try {
                        expect(error).to.equal(null);
                        // Check that sequenceNodeKey was added in to brix's targetActivity
                        expect(body.sequenceNodeContent.targetActivity.sequenceNodeKey).to.equal(sequenceNodeKey);
                        // Check that there's now a single nodeResult on the content
                        expect(body.sequenceNodeContent.nodeResult).to.be.an('array');
                        expect(body.sequenceNodeContent.nodeResult[0]).to.be.an('object');
                        expect(body.sequenceNodeContent.nodeResult[1]).to.be.undefined;
                        // Check that our saved content's nodeResult matches what was submitted
                        expect(body.sequenceNodeContent.nodeResult[0].brixState).to.deep.equal(param.body.interactionData);
                        done();
                    }
                    catch ( e )
                    {
                        done(e);
                    }
                });


                //done();
            }
            catch (e)
            {
                done(e);
            }

        });
    });
});

// NOTE: The tests herein must be run in order and in succession, as they build upon each other.
describe('IPS saving to Redis with Submissions using Nock AMS and Nock CE', function() {
    var ips = null;
    var hubnock = null;
    var seqNodeProvider = null;
    var seqNodeReqMessage = HubMock.testInitializationEnvelopeSubmittable;

    var sequenceNodeKey = null;
    var seqNodeKeyToRemove = null;

    before(function (done) {
        ips = new Ips();
        seqNodeProvider = new SequenceNodeProvider();

        hubnock = new HubMock.HubNock();
        hubnock.setupSequenceNodeNock(HubMock.testHubBaseUrl, HubMock.testSeqNodeBodySubmittable);

        // setup mock to catch calls to CorrectnessEngine
        cenock = new CEMock.CENock();

        // Retrieving sequence node is pre-requisite in the flow for other
        // operations: post interaction and submission. 
        seqNodeKeyToRemove = seqNodeProvider.obtainSequenceNodeKey(seqNodeReqMessage.sequenceNodeIdentifier);

        ips.removeFromCache__(seqNodeKeyToRemove, function(removeErr, removeRes){

            ips.retrieveSequenceNode(seqNodeReqMessage, function(error, result) {
                // there must be no errors
                //console.log(result);
                sequenceNodeKey = result.sequenceNodeKey;
                done();
            });
        });
    });

    afterEach(function (done) {
        // Nocks can bleed from one test to the next, especially if you're testing error conditions.
        // This cleans them up after each 'it'.
        nock.cleanAll();
        done();
    });

    after(function (done) {
        // clean up after ourselves
        ips.removeFromCache__(seqNodeKeyToRemove, function(removeErr, removeRes){
            done();
        });
    });

    it('should save sequenceNode in cache', function (done) {
        // This same test is in sequencenodeprovider.tests.js but here as a baseline
        var expectData = HubMock.testSeqNodeBodySubmittable;
        expectData.targetActivity.maxAttempts = 3;

        seqNodeProvider.getSequenceNodeByKey(sequenceNodeKey, function(error, body){
            try {
                expect(error).to.equal(null);
                // Check that sequenceNodeKey was added in to brix's targetActivity
                expect(body.sequenceNodeContent.targetActivity.sequenceNodeKey).to.equal(sequenceNodeKey);
                // Remove brix's targetActivity.sequenceNodeKey before comparing returned value with expected
                delete body.sequenceNodeContent.targetActivity.sequenceNodeKey;
                expect(body.sequenceNodeContent).to.deep.equal(expectData);

                expect(body.hubSession).to.equal('HUB_SESSION');
                // The cache should have an empty nodeResult array in it coming from PAF (via AMS)
                expect(body.sequenceNodeContent.nodeResult).to.be.an('array');
                expect(body.sequenceNodeContent.nodeResult[0]).to.be.undefined;
                done();
            }
            catch ( e )
            {
                done(e);
            }
        });
    });

    it('should add a NodeResult with the first Submission', function (done) {
        hubnock.setupSubmissionNock(HubMock.testHubBaseUrl);
        cenock.setupAssessmentNock(CEMock.testCEBaseUrl);

        
        var param = cloneObject(submissionMessage);
        // Assign the correct sequenceNodeKey
        param.sequenceNodeKey = sequenceNodeKey;
        
        ips.postSubmission(param, function(err, result) {
            try {
                expect(err).to.equal(null);
                expect(result).to.be.an('object');
                expect(result).to.deep.equal(CEMock.testAssessmentResponseBody.data);
                
                var expectData = JSON.stringify(HubMock.testSeqNodeBody);

                seqNodeProvider.getSequenceNodeByKey(sequenceNodeKey, function(error, body){
                    try {
                        expect(error).to.equal(null);
                        // Check that sequenceNodeKey was added in to brix's targetActivity
                        expect(body.sequenceNodeContent.targetActivity.sequenceNodeKey).to.equal(sequenceNodeKey);
                        // Check that there's now a single nodeResult on the content
                        expect(body.sequenceNodeContent.nodeResult).to.be.an('array');
                        expect(body.sequenceNodeContent.nodeResult[0]).to.be.an('object');
                        expect(body.sequenceNodeContent.nodeResult[1]).to.be.undefined;
                        // Check that our saved content's nodeResult matches what was submitted
                        expect(body.sequenceNodeContent.nodeResult[0].studentSubmission).to.deep.equal(param.body.studentSubmission);
                        done();
                    }
                    catch ( e )
                    {
                        done(e);
                    }
                });
            }
            catch (e)
            {
                done(e);
            }

        });
    });

    it('should append a NodeResult with the next Submission', function (done) {
        hubnock.setupSubmissionNock(HubMock.testHubBaseUrl);
        cenock.setupAssessmentNock(CEMock.testCEBaseUrl);

        // Our previous submission
        var originalParam = cloneObject(submissionMessage);

        // Our return message - we have to doctor the mock a bit as # of attempts made is incremented
        var secondAssessmentResponseBody = cloneObject(CEMock.testAssessmentResponseBody.data);
        secondAssessmentResponseBody.attemptsMade = 2;

        // Make a new submission
        var param = {
            "sequenceNodeKey": "895af0ae2d8aa5bffba54ab0555d7461",
            "timestamp": "2013-05-25T13:23:42.001Z",
            "type": "submission",
            "body": {
                "studentSubmission": { "key": "option002" }
            }
        };

        // Assign the correct sequenceNodeKey
        param.sequenceNodeKey = sequenceNodeKey;
 
        ips.postSubmission(param, function(err, result) {
            try {
                expect(err).to.equal(null);
                expect(result).to.be.an('object');

                expect(result).to.deep.equal(secondAssessmentResponseBody);
                
                var expectData = JSON.stringify(HubMock.testSeqNodeBody);

                seqNodeProvider.getSequenceNodeByKey(sequenceNodeKey, function(error, body){
                    try {
                        expect(error).to.equal(null);
                        // Check that sequenceNodeKey was added in to brix's targetActivity
                        expect(body.sequenceNodeContent.targetActivity.sequenceNodeKey).to.equal(sequenceNodeKey);
                        // Check that there's now a single nodeResult on the content
                        expect(body.sequenceNodeContent.nodeResult).to.be.an('array');
                        expect(body.sequenceNodeContent.nodeResult[0]).to.be.an('object');
                        expect(body.sequenceNodeContent.nodeResult[1]).to.be.an('object');
                        expect(body.sequenceNodeContent.nodeResult[2]).to.be.undefined;
                        // Check that our saved content's nodeResult matches what was originally submitted
                        expect(body.sequenceNodeContent.nodeResult[0].studentSubmission).to.deep.equal(originalParam.body.studentSubmission);
                        // Check that our saved content's nodeResult now also contains the second submission
                        expect(body.sequenceNodeContent.nodeResult[1].studentSubmission).to.deep.equal(param.body.studentSubmission);
                        done();
                    }
                    catch ( e )
                    {
                        done(e);
                    }
                });
            }
            catch (e)
            {
                done(e);
            }

        });
    });

    it('should increment attemptsMade', function (done) {
        hubnock.setupSubmissionNock(HubMock.testHubBaseUrl);
        cenock.setupAssessmentNock(CEMock.testCEBaseUrl);
        // NOTE: this correctness engine mock isn't accounting for the fact that typically
        // the CE will return the "correct answer" when we pass it our last attempt

        // Our previous submission
        var originalParam = cloneObject(submissionMessage);

        // Our return message - we have to doctor the mock a bit as # of attempts is decremented
        var thirdAssessmentResponseBody = cloneObject(CEMock.testAssessmentResponseBody.data);
        thirdAssessmentResponseBody.attemptsMade = 3;

        // Make a new submission
        var param = {
            "sequenceNodeKey": "895af0ae2d8aa5bffba54ab0555d7461",
            "timestamp": "2013-05-25T13:23:42.001Z",
            "type": "submission",
            "body": {
                "studentSubmission": { "key": "option002" }
            }
        };

        // Assign the correct sequenceNodeKey
        param.sequenceNodeKey = sequenceNodeKey;
 
        ips.postSubmission(param, function(err, result) {
            try {
                expect(err).to.equal(null);
                expect(result).to.be.an('object');

                expect(result).to.deep.equal(thirdAssessmentResponseBody);
                
                done();
            }
            catch (e)
            {
                done(e);
            }
        });
    });

    it('should throw an error if you submit after you had 0 attempts remaining', function (done) {
        hubnock.setupSubmissionNock(HubMock.testHubBaseUrl);
        cenock.setupAssessmentNock(CEMock.testCEBaseUrl);

        // Make a new submission
        var param = {
            "sequenceNodeKey": "895af0ae2d8aa5bffba54ab0555d7461",
            "timestamp": "2013-05-25T13:23:42.001Z",
            "type": "submission",
            "body": {
                "studentSubmission": { "key": "option002" }
            }
        };

        // Assign the correct sequenceNodeKey
        param.sequenceNodeKey = sequenceNodeKey;
 
        ips.postSubmission(param, function(err, result) {
            try {
                expect(result).to.equal(null);
                expect(err).to.equal('You have already used all of your submit attempts.  Your submission was not accepted.');
                done();
            }
            catch (e)
            {
                done(e);
            }
        });
    });
});

describe('Submission Posting for Assessments', function() {
    var ips = null;
    var hubnock = null;
    var seqNodeProvider = null;
    var seqNodeReqMessage = utils.cloneObject(HubMock.testInitializationEnvelopeSubmittable);
    // Force generate a different sequenceNodeKey
    // Because this test requires sleep
    seqNodeReqMessage.sequenceNodeIdentifier.content.targetBinding = seqNodeReqMessage.sequenceNodeIdentifier.content.targetBinding + "_subm";


    var sequenceNodeKey = null;
    var seqNodeKeyToRemove = null;

    var stub = null;

    beforeEach(function (done) {
        ips = new Ips();
        seqNodeProvider = new SequenceNodeProvider();

        hubnock = new HubMock.HubNock();
        hubnock.setupSequenceNodeNock(HubMock.testHubBaseUrl, HubMock.testSeqNodeBodySubmittable);

        // setup mock to catch calls to CorrectnessEngine
        cenock = new CEMock.CENock();

        // Retrieving sequence node is pre-requisite in the flow for other
        // operations: post interaction and submission. 
        seqNodeKeyToRemove = seqNodeProvider.obtainSequenceNodeKey(seqNodeReqMessage.sequenceNodeIdentifier);

        ips.removeFromCache__(seqNodeKeyToRemove, function(removeErr, removeRes){
            ips.retrieveSequenceNode(seqNodeReqMessage, function(error, result) {
                // there must be no errors
                //console.log(result);
                sequenceNodeKey = result.sequenceNodeKey;
                done();
            });
        });
    });

    afterEach(function (done) {
        // Nocks can bleed from one test to the next, especially if you're testing error conditions.
        // This cleans them up after each 'it'.
        nock.cleanAll();
        done();
    });

    /**
     * Makes a submission so we can compare the message sent to amsProxy
     */
    var doSubmission = function() {
        //hubnock.setupSubmissionNock(HubMock.testHubBaseUrl);
        
        // Our return message - we have to doctor the mock a bit as # of attempts made is incremented
        var secondAssessmentResponseBody = cloneObject(CEMock.testAssessmentResponseBody.data);
        secondAssessmentResponseBody.attemptsMade = 2;

        // Make a new submission
        var param = {
            "sequenceNodeKey": "895af0ae2d8aa5bffba54ab0555d7461",
            "timestamp": "2013-05-25T13:23:42.001Z",
            "type": "submission",
            "body": {
                "studentSubmission": { "key": "option002" }
            }
        };

        // Assign the correct sequenceNodeKey
        param.sequenceNodeKey = sequenceNodeKey;

        ips.postSubmission(param, function(err, result) {
                // Since we are testing the data passed to AMS,
                // we don't care about the result. 
        });
    };


    it('should set doScoreProcessing to true when correct answer provided PRIOR last attempt', function (done) {
        cenock.setupAssessmentNock(CEMock.testCEBaseUrl);
        var stub = sinon.stub(ips.amsProxy, "sendSubmission", function(param, dummyCallback){
            try {
                expect(param.nodeResult.doScoreProcessing).to.be.true;
                ips.amsProxy.sendSubmission.restore();
                done();
            } catch (e)
            {
                ips.amsProxy.sendSubmission.restore();
                done(e);
            }
        });
        doSubmission();
    });

    it('should set doScoreProcessing to false when INcorrect answer provided PRIOR last attempt', function (done) {
        cenock.setupAssessmentNock(CEMock.testCEBaseUrl, CEMock.testAssessmentWithIncorrectResponseBody);
        sinon.stub(ips.amsProxy, "sendSubmission", function(param, dummyCallback){
            try {
                expect(param.nodeResult.doScoreProcessing).to.be.false;
                ips.amsProxy.sendSubmission.restore();
                done();
            } catch (e)
            {
                ips.amsProxy.sendSubmission.restore();
                done(e);        
            }
        });
        doSubmission();
    });

    it('should set doScoreProcessing to true when correct answer provided at last attempt', function (done) {
        // setup nock so it handles two calls returning response with incorrect 
        var scope = cenock.setupAssessmentNock(CEMock.testCEBaseUrl, CEMock.testAssessmentWithIncorrectResponseBody, {times: 2});
        var submissionCtr = 0;
        sinon.stub(ips.amsProxy, "sendSubmission", function(param, callback){
            expect(param.nodeResult.doScoreProcessing).to.be.false;
            callback(null, {"Test":"OK"});
        });
        // Two submission that returns incorrect 
        doSubmission();

        // Using Timeout to simulate sequential flow so not to interfere with stub
        setTimeout(function(){
            doSubmission();
        },200);

        setTimeout(function(){
            // Last one returns correct 
            ips.amsProxy.sendSubmission.restore();
            sinon.stub(ips.amsProxy, "sendSubmission", function(param, callback){
                try {
                    expect(param.nodeResult.doScoreProcessing).to.be.true;
                    ips.amsProxy.sendSubmission.restore();
                    done();
                } catch (e)
                {
                    ips.amsProxy.sendSubmission.restore();
                    done(e);        
                }
            });
            cenock.setupAssessmentNock(CEMock.testCEBaseUrl);
            doSubmission();
        },400);

    });

    it('should set doScoreProcessing to true when INcorrect answer provided at last attempt', function (done) {
        // setup nock so it handles three calls returning response with incorrect 
        var scope = cenock.setupAssessmentNock(CEMock.testCEBaseUrl, CEMock.testAssessmentWithIncorrectResponseBody, {times: 3});
        var submissionCtr = 0;
        sinon.stub(ips.amsProxy, "sendSubmission", function(param, callback){
            expect(param.nodeResult.doScoreProcessing).to.be.false;
            callback(null, {"Test":"OK"});
        });
        doSubmission();

        // Using Timeout to simulate sequential flow so not to interfere with stub
        setTimeout(function(){
            doSubmission();
        },200);

        setTimeout(function(){
            ips.amsProxy.sendSubmission.restore();
            sinon.stub(ips.amsProxy, "sendSubmission", function(param, callback){
                try {
                    expect(param.nodeResult.doScoreProcessing).to.be.true;
                    ips.amsProxy.sendSubmission.restore();
                    done();
                } catch (e)
                {
                    ips.amsProxy.sendSubmission.restore();
                    done(e);        
                }
            });
            doSubmission();
        },400);
    });
});


describe('Submission Posting for non-recordable Assessments', function() {
    var ips = null;
    var hubnock = null;
    var seqNodeProvider = null;
    var seqNodeReqMessage = HubMock.testInitializationEnvelopeSubmittable;

    var seqNodeKey = null;
    var modifiedCacheNode = null;

    before(function (done) {

        done();
    });

    beforeEach(function (done) {
        // We want to freshly set the sequenceNode with each test so as to avoid # attempts stuff
        ips = new Ips();
        seqNodeProvider = new SequenceNodeProvider();

        hubnock = new HubMock.HubNock();
        //hubnock.setupSequenceNodeNock(HubMock.testHubBaseUrl);
        hubnock.setupSequenceNodeNock(HubMock.testHubBaseUrl, HubMock.testSeqNodeBodySubmittable);

        // setup mock to catch calls to CorrectnessEngine
        cenock = new CEMock.CENock();

        // Fix up our cache node.  This is the sequenceNode we'll modify and use to update redis cache.
        var cacheContent = cloneObject(HubMock.testSeqNodeBodySubmittable);
        modifiedCacheNode = {
            hubSession: 'HUB_SESSION',
            itemCorrelationToken: HubMock.testSeqNodeHeaders.itemCorrelationToken,
            sequenceNodeContent: cacheContent
        };

        // Retrieving sequence node is pre-requisite in the flow for other
        // operations: post interaction and submission.  Make sure our cache is clean
        // and then populate it with a new request to the AMS.
        seqNodeKeyToRemove = seqNodeProvider.obtainSequenceNodeKey(seqNodeReqMessage.sequenceNodeIdentifier);
        seqNodeKey = seqNodeProvider.obtainSequenceNodeKey(HubMock.testSeqNodeReqMessage);
        ips.removeFromCache__(seqNodeKey, function(removeErr, removeRes){

            ips.retrieveSequenceNode(seqNodeReqMessage, function(error, result) {
                // there must be no errors
                seqNodeKey = result.sequenceNodeKey;
                modifiedCacheNode.sequenceNodeContent.targetActivity.maxAttempts = 3;
                modifiedCacheNode.sequenceNodeContent.targetActivity.sequenceNodeKey = seqNodeKey;
                done();
            });
        });
    });

    afterEach(function (done) {
        // Nocks can bleed from one test to the next, especially if you're testing error conditions.
        // This cleans them up after each 'it'.
        nock.cleanAll();
        // clean up after ourselves
        ips.removeFromCache__(seqNodeKey, function(removeErr, removeRes){
            done();
        });
    });


    it('should trigger the AMS nock when nonRecordable is absent from containerConfig', function (done) {
        cenock.setupAssessmentNock(CEMock.testCEBaseUrl);

        seqNodeProvider.getSequenceNodeByKey(seqNodeKey, function(err, result) {
            try {
                var sequenceNode = result;

                // Make sure the sequenceNode in cache is what we expect
                expect(sequenceNode).to.deep.equal(modifiedCacheNode);

                // instead of doing
                // hubnock.setupSubmissionNock(HubMock.testHubBaseUrl);
                // we set it up manually so we can look to see if it fires
                var responseData = HubMock.testSubmissionResponseBody;
                var hubNock = nock(HubMock.testHubBaseUrl);
                hubNock.post(HubMock.testAmsSubmissionPath).reply(200, JSON.stringify(responseData));
                
                var param = cloneObject(submissionMessage);
                // Assign the correct sequenceNodeKey
                param.sequenceNodeKey = seqNodeKey;

                // Our mock should be available
                expect(hubNock.isDone()).to.equal(false);
                
                ips.postSubmission(param, function(err, result) {
                    try {
                        expect(err).to.equal(null);
                        expect(result).to.be.an('object');
                        expect(JSON.stringify(result)).to.equal(JSON.stringify(CEMock.testAssessmentResponseBody.data));
                        // Our mock should now be done (triggered)
                        expect(hubNock.isDone()).to.equal(true);

                        done();
                    }
                    catch (e)
                    {
                        done(e);
                    }

                });

            }
            catch (e)
            {
                done(e);
            }
        });
    });

    it('should trigger the AMS nock when nonRecordable is null within containerConfig', function (done) {
        cenock.setupAssessmentNock(CEMock.testCEBaseUrl);

        // modify the sequenceNode to add nonRecordable: null
        modifiedCacheNode.sequenceNodeContent.targetActivity.containerConfig[0].brixConfig[0].answerKey.nonRecordable = null;
        // update that in cache
        seqNodeProvider.updateSequenceNodeInCache(seqNodeKey, modifiedCacheNode, function(err, result) {
            try {

                // instead of doing
                // hubnock.setupSubmissionNock(HubMock.testHubBaseUrl);
                // we set it up manually so we can look to see if it fires
                var responseData = HubMock.testSubmissionResponseBody;
                var hubNock = nock(HubMock.testHubBaseUrl);
                hubNock.post(HubMock.testAmsSubmissionPath).reply(200, JSON.stringify(responseData));
                
                var param = cloneObject(submissionMessage);
                // Assign the correct sequenceNodeKey
                param.sequenceNodeKey = seqNodeKey;

                // Our mock should be available
                expect(hubNock.isDone()).to.equal(false);
                
                ips.postSubmission(param, function(err, result) {
                    try {
                        expect(err).to.equal(null);
                        expect(result).to.be.an('object');
                        expect(JSON.stringify(result)).to.equal(JSON.stringify(CEMock.testAssessmentResponseBody.data));
                        // Our mock should now be done (triggered)
                        expect(hubNock.isDone()).to.equal(true);

                        done();
                    }
                    catch (e)
                    {
                        done(e);
                    }

                });

            }
            catch (e)
            {
                done(e);
            }
        });

        
    });

    it('should trigger the AMS nock when nonRecordable is false within containerConfig', function (done) {
        cenock.setupAssessmentNock(CEMock.testCEBaseUrl);

        // modify the sequenceNode to add nonRecordable: false
        modifiedCacheNode.sequenceNodeContent.targetActivity.containerConfig[0].brixConfig[0].answerKey.nonRecordable = false;
        // update that in cache
        seqNodeProvider.updateSequenceNodeInCache(seqNodeKey, modifiedCacheNode, function(err, result) {
            try {

                // instead of doing
                // hubnock.setupSubmissionNock(HubMock.testHubBaseUrl);
                // we set it up manually so we can look to see if it fires
                var responseData = HubMock.testSubmissionResponseBody;
                var hubNock = nock(HubMock.testHubBaseUrl);
                hubNock.post(HubMock.testAmsSubmissionPath).reply(200, JSON.stringify(responseData));
                
                var param = cloneObject(submissionMessage);
                // Assign the correct sequenceNodeKey
                param.sequenceNodeKey = seqNodeKey;

                // Our mock should be available
                expect(hubNock.isDone()).to.equal(false);
                
                ips.postSubmission(param, function(err, result) {
                    try {
                        expect(err).to.equal(null);
                        expect(result).to.be.an('object');
                        expect(JSON.stringify(result)).to.equal(JSON.stringify(CEMock.testAssessmentResponseBody.data));
                        // Our mock should now be done (triggered)
                        expect(hubNock.isDone()).to.equal(true);

                        done();
                    }
                    catch (e)
                    {
                        done(e);
                    }

                });

            }
            catch (e)
            {
                done(e);
            }
        });
    });

    it('should not trigger the AMS nock when nonRecordable is true from containerConfig', function (done) {
        cenock.setupAssessmentNock(CEMock.testCEBaseUrl);

        // modify the sequenceNode to add nonRecordable: true
        modifiedCacheNode.sequenceNodeContent.targetActivity.containerConfig[0].brixConfig[0].answerKey.nonRecordable = true;
        // update that in cache
        seqNodeProvider.updateSequenceNodeInCache(seqNodeKey, modifiedCacheNode, function(err, result) {
            try {

                // instead of doing
                // hubnock.setupSubmissionNock(HubMock.testHubBaseUrl);
                // we set it up manually so we can look to see if it fires
                var responseData = HubMock.testSubmissionResponseBody;
                var hubNock = nock(HubMock.testHubBaseUrl);
                hubNock.post(HubMock.testAmsSubmissionPath).reply(200, JSON.stringify(responseData));
                
                var param = cloneObject(submissionMessage);
                // Assign the correct sequenceNodeKey
                param.sequenceNodeKey = seqNodeKey;

                // Our mock should be available
                expect(hubNock.isDone()).to.equal(false);
                
                ips.postSubmission(param, function(err, result) {
                    try {
                        expect(err).to.equal(null);
                        expect(result).to.be.an('object');
                        expect(JSON.stringify(result)).to.equal(JSON.stringify(CEMock.testAssessmentResponseBody.data));
                        // Our mock should NOT be done (triggered) finally proving that we didn't hit the AMS.
                        expect(hubNock.isDone()).to.equal(false);

                        done();
                    }
                    catch (e)
                    {
                        done(e);
                    }

                });

            }
            catch (e)
            {
                done(e);
            }
        });
    });
});
