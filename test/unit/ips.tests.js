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

var sampleMcpConfig = require('../test_messages/SampleMultipleChoiceConfig.json');

// @todo - change this with data swap story
//var sampleDataConfig = require('../test_messages/SampleDataConfig.json');
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
    var seqNodeReqMessage = null;

    var sequenceNodeKey = null;
    var seqNodeKeyToRemove = null;

    before(function (done) {
        ips = new Ips();
        seqNodeProvider = new SequenceNodeProvider();

        hubnock = new HubMock.HubNock();
        hubnock.setupNocks(HubMock.testHubBaseUrl);

        seqNodeReqMessage = HubMock.testInitializationEnvelope;
        
        // Retrieving sequence node is pre-requisite in the flow for other
        // operations: post interaction and submission. 
        seqNodeKeyToRemove = seqNodeProvider.obtainSequenceNodeKey(HubMock.testSeqNodeReqMessage);

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

    it('should return an empty object given correct request message', function (done) {
        hubnock.setupInteractionNock(HubMock.testHubBaseUrl);
        var param = cloneObject(interactionMessage);
        
        param.sequenceNodeKey = seqNodeProvider.obtainSequenceNodeKey(HubMock.testSeqNodeReqMessage);

        ips.postInteraction(param, function(err, result) {
            try {
                expect(err).to.equal(null);
                expect(result).to.be.an('object');
                expect(JSON.stringify(result)).to.equal(JSON.stringify(HubMock.testInteractionResponseBody));
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
        var expectedErrorMessage = 'SequenceNodeKey not found';
        ips.postInteraction(param, function(err, result) {
            try {
                //console.log("ERR: "+err);
                expect(err).to.equal(expectedErrorMessage);
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
        hubnock.setupInteractionNock(HubMock.testHubBaseUrl, HubMock.testHubSessionInvalid);
        var param = cloneObject(interactionMessage);
        param.sequenceNodeKey = seqNodeProvider.obtainSequenceNodeKey(HubMock.testSeqNodeReqMessage);
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
    var seqNodeReqMessage = null;
    var sequenceNodeIdentifier = null;

    var sequenceNodeKey = null;
    var seqNodeKeyToRemove = null;

    before(function (done) {
        ips = new Ips();
        seqNodeProvider = new SequenceNodeProvider();

        hubnock = new HubMock.HubNock();
        hubnock.setupNocks(HubMock.testHubBaseUrl);

        // setup mock to catch calls to CorrectnessEngine
        cenock = new CEMock.CENock();

        seqNodeReqMessage = HubMock.testInitializationEnvelope;

        // Retrieving sequence node is pre-requisite in the flow for other
        // operations: post interaction and submission. 
        seqNodeKeyToRemove = seqNodeProvider.obtainSequenceNodeKey(HubMock.testSeqNodeReqMessage);

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
        param.sequenceNodeKey = seqNodeProvider.obtainSequenceNodeKey(HubMock.testSeqNodeReqMessage);
        
        ips.postSubmission(param, function(err, result) {
            try {
                expect(err).to.equal(null);
                expect(result).to.be.an('object');
                expect(JSON.stringify(result)).to.equal(JSON.stringify(CEMock.testAssessmentResponseBody.data));
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
        param.sequenceNodeKey = seqNodeProvider.obtainSequenceNodeKey(HubMock.testSeqNodeReqMessage);
        
        ips.postSubmission(param, function(err, result) {
            try {
                expect(result).to.equal(null);
                // Just the message is being sent via err
                expect(JSON.stringify(err)).to.equal(JSON.stringify(CEMock.testErrorAssessmentResponseBody.message));
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
        var expectedErrorMessage = 'SequenceNodeKey not found';
        ips.postSubmission(param, function(err, result) {
            try
            {
                expect(err).to.equal(expectedErrorMessage);
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
        param.sequenceNodeKey = seqNodeProvider.obtainSequenceNodeKey(HubMock.testSeqNodeReqMessage);
        var expectedErrorMessage = 'Invalid Hub-Session';
        ips.postSubmission(param, function(err, result) {
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

    it('should create a Submission NodeResult for a correct answer', function () {

        var ceResult = CEMock.testAssessmentResponseBody;
        var studentSubmission = { submission: "option000" };

        var nodeResult = ips.buildSubmissionNodeResult__(ceResult, studentSubmission);
        
        //console.log(JSON.stringify(nodeResult));
        
        expect(nodeResult.timestamp).to.match(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d*Z/);
        // change timestamp on nodeResult to match test ceResult
        nodeResult.timestamp = "2013-10-25T20:21:21.822Z";
        // check the nodeResult, minus the timestamp part
        expect(nodeResult).to.deep.equal(HubMock.testNodeResult);

    });

    it('should create a Submission NodeResult for an incorrect answer', function () {

        var ceResult = CEMock.testAssessmentWithIncorrectResponseBody;
        var studentSubmission = { submission: "option003" };

        var nodeResult = ips.buildSubmissionNodeResult__(ceResult, studentSubmission);

        expect(nodeResult.timestamp).to.match(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d*Z/);
        // change timestamp on nodeResult to match test ceResult
        nodeResult.timestamp = "2013-10-25T20:21:21.822Z";
        // check the nodeResult, minus the timestamp part
        expect(nodeResult).to.deep.equal(HubMock.testNodeResultIncorrect);
    });

    it('should correctly update the sequenceNode (private func)', function () {
        var seqNodeInfo = {};
        seqNodeInfo.sequenceNodeContent = cloneObject(HubMock.testSeqNodeBody);
        var nodeResult = HubMock.testNodeResultIncorrect;
        
        ips.appendResultToSequenceNode__(seqNodeInfo, nodeResult)
        .then(function(updatedSequenceNode){
            expect(updatedSequenceNode).to.be.an('object');
            expect(updatedSequenceNode.sequenceNodeContent.nodeResult[0]).to.deep.equal(nodeResult);
            done();
        });
    });
     
});

describe('IPS retrieveSequenceNode', function () {
    var ips = null;
    var seqNodeProvider = null;
    var seqNodeReqMessage = null;
    var sequenceNodeIdentifier = null;

    var sequenceNodeKey = null;
    var seqNodeKeyToRemove = null;
    var targetActivity = null;

    before(function (done) {
        ips = new Ips();
        seqNodeReqMessage = HubMock.testInitializationEnvelope;

        seqNodeProvider = new SequenceNodeProvider();
        seqNodeKeyToRemove = seqNodeProvider.obtainSequenceNodeKey(HubMock.testSeqNodeReqMessage);
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

        // Expected is sanitized
        var expectedTargetActivity = utils.cloneObject(stubTargetActivity);
        delete expectedTargetActivity.containerConfig[0].brixConfig[0].answerKey;

        ips.retrieveSequenceNode(seqNodeReqMessage, function(error, result) {
            sequenceNodeKey = result.sequenceNodeKey;
            targetActivity = result.containerConfig;
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

    // @todo - add this for data swap story
    // ECOURSES-768
    it.skip('should include data object when present', function () {
        var resultWithNoData = ips.sanitizeBrixConfig__(sampleMcpConfig);
        
        // Verify that the original does not contain the data object
        expect(sampleMcpConfig).to.not.have.property('data');
        // Verify that the result does not contain the data object 
        expect(resultWithNoData).to.not.have.property('data');

        // @todo - change L32
        var resultWithData = ips.sanitizeBrixConfig__(sampleDataConfig);
        // Verify that the original does contain the data object
        expect(resultWithData).to.have.property('data');
        // Verify that the result does contain the data object 
        expect(resultWithData).to.have.property('data');
    });

    it('should correctly obtain the container by id (private func)', function () {

        var containerId = 'assessment25';
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

        var containerId = 'assessment25';

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
    var seqNodeReqMessage = null;

    var sequenceNodeKey = null;
    var seqNodeKeyToRemove = null;

    before(function (done) {
        ips = new Ips();
        seqNodeProvider = new SequenceNodeProvider();

        hubnock = new HubMock.HubNock();
        hubnock.setupNocks(HubMock.testHubBaseUrl);

        seqNodeReqMessage = HubMock.testInitializationEnvelope;
        
        // Retrieving sequence node is pre-requisite in the flow for other
        // operations: post interaction and submission. 
        seqNodeKeyToRemove = seqNodeProvider.obtainSequenceNodeKey(HubMock.testSeqNodeReqMessage);
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
                expect(JSON.stringify(body.sequenceNodeContent)).to.equal(JSON.stringify(expectData));
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
        hubnock.setupInteractionNock(HubMock.testHubBaseUrl);
        var param = cloneObject(interactionMessage);
        
        param.sequenceNodeKey = seqNodeProvider.obtainSequenceNodeKey(HubMock.testSeqNodeReqMessage);

        ips.postInteraction(param, function(err, result) {
            try {
                expect(err).to.equal(null);
                expect(result).to.be.an('object');
                expect(JSON.stringify(result)).to.equal(JSON.stringify(HubMock.testInteractionResponseBody));

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
        hubnock.setupInteractionNock(HubMock.testHubBaseUrl);
        var param = cloneObject(interactionMessage);
        
        param.sequenceNodeKey = seqNodeProvider.obtainSequenceNodeKey(HubMock.testSeqNodeReqMessage);
        // Change our input
        param.body.interactionData = 'this is my new stuff';

        ips.postInteraction(param, function(err, result) {
            try {
                expect(err).to.equal(null);
                expect(result).to.be.an('object');
                expect(JSON.stringify(result)).to.equal(JSON.stringify(HubMock.testInteractionResponseBody));

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
    var seqNodeReqMessage = null;
    var sequenceNodeIdentifier = null;

    var sequenceNodeKey = null;
    var seqNodeKeyToRemove = null;

    before(function (done) {
        ips = new Ips();
        seqNodeProvider = new SequenceNodeProvider();

        hubnock = new HubMock.HubNock();
        hubnock.setupNocks(HubMock.testHubBaseUrl);

        // setup mock to catch calls to CorrectnessEngine
        cenock = new CEMock.CENock();

        seqNodeReqMessage = HubMock.testInitializationEnvelope;

        // Retrieving sequence node is pre-requisite in the flow for other
        // operations: post interaction and submission. 
        seqNodeKeyToRemove = seqNodeProvider.obtainSequenceNodeKey(HubMock.testSeqNodeReqMessage);

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
        var expectData = HubMock.testSeqNodeBody;
        expectData.targetActivity.maxAttempts = 3;

        seqNodeProvider.getSequenceNodeByKey(sequenceNodeKey, function(error, body){
            try {
                expect(error).to.equal(null);
                // Check that sequenceNodeKey was added in to brix's targetActivity
                expect(body.sequenceNodeContent.targetActivity.sequenceNodeKey).to.equal(sequenceNodeKey);
                // Remove brix's targetActivity.sequenceNodeKey before comparing returned value with expected
                delete body.sequenceNodeContent.targetActivity.sequenceNodeKey;
                expect(JSON.stringify(body.sequenceNodeContent)).to.equal(JSON.stringify(expectData));

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
        param.sequenceNodeKey = seqNodeProvider.obtainSequenceNodeKey(HubMock.testSeqNodeReqMessage);
        
        ips.postSubmission(param, function(err, result) {
            try {
                expect(err).to.equal(null);
                expect(result).to.be.an('object');
                expect(JSON.stringify(result)).to.equal(JSON.stringify(CEMock.testAssessmentResponseBody.data));
                
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

        // Our return message - we have to doctor the mock a bit as # of attempts is decremented
        var secondAssessmentResponseBody = cloneObject(CEMock.testAssessmentResponseBody.data);
        secondAssessmentResponseBody.attemptsRemaining = 1;

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
        param.sequenceNodeKey = seqNodeProvider.obtainSequenceNodeKey(HubMock.testSeqNodeReqMessage);
 
        ips.postSubmission(param, function(err, result) {
            try {
                expect(err).to.equal(null);
                expect(result).to.be.an('object');

                expect(JSON.stringify(result)).to.equal(JSON.stringify(secondAssessmentResponseBody));
                
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

    it('should decrement attemptsRemaining', function (done) {
        hubnock.setupSubmissionNock(HubMock.testHubBaseUrl);
        cenock.setupAssessmentNock(CEMock.testCEBaseUrl);

        // Our previous submission
        var originalParam = cloneObject(submissionMessage);

        // Our return message - we have to doctor the mock a bit as # of attempts is decremented
        var thirdAssessmentResponseBody = cloneObject(CEMock.testAssessmentResponseBody.data);
        thirdAssessmentResponseBody.attemptsRemaining = 0;

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
        param.sequenceNodeKey = seqNodeProvider.obtainSequenceNodeKey(HubMock.testSeqNodeReqMessage);
 
        ips.postSubmission(param, function(err, result) {
            try {
                expect(err).to.equal(null);
                expect(result).to.be.an('object');

                expect(JSON.stringify(result)).to.equal(JSON.stringify(thirdAssessmentResponseBody));
                
                done();
            }
            catch (e)
            {
                done(e);
            }
        });
    });

    it('should throw an error if you submit after you had 0 attemptsRemaining', function (done) {
        hubnock.setupSubmissionNock(HubMock.testHubBaseUrl);
        cenock.setupAssessmentNock(CEMock.testCEBaseUrl);

        // Our previous submission
        var originalParam = cloneObject(submissionMessage);

        // Our return message - we have to doctor the mock a bit as # of attempts is decremented
        var thirdAssessmentResponseBody = cloneObject(CEMock.testAssessmentResponseBody.data);
        thirdAssessmentResponseBody.attemptsRemaining = 0;

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
        param.sequenceNodeKey = seqNodeProvider.obtainSequenceNodeKey(HubMock.testSeqNodeReqMessage);
 
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
