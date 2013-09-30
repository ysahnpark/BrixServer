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
var HubMock = require('./hub.mock');
var SequenceNodeProvider = require('../../lib/sequencenodeprovider').SequenceNodeProvider;
var Ips = require('../../lib/ips').Ips;

var sampleMcpConfig = require('../test_messages/SampleMultipleChoiceConfig.json');

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

    before(function (done) {
        ips = new Ips();
        seqNodeProvider = new SequenceNodeProvider();

        hubnock = new HubMock.HubNock();
        hubnock.setupNocks(HubMock.testHubBaseUrl);

        seqNodeReqMessage = HubMock.testInitializationEnvelope;
        
        // Retrieving sequence node is pre-requisite in the flow for other
        // operations: post interaction and submission. 
        var seqNodeKeyToRemove = seqNodeProvider.obtainSequenceNodeKey(HubMock.testSeqNodeReqMessage);

        ips.removeFromCache__(seqNodeKeyToRemove, function(removeErr, removeRes){

            ips.retrieveSequenceNode(seqNodeReqMessage, function(error, result) {

                // there must be no errors
                //console.log(result);
                sequenceNodeKey = result.sequenceNodeKey;
                done();
            });
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

describe('IPS Posting Submission', function() {
    var ips = null;
    var hubnock = null;
    var seqNodeProvider = null;
    var seqNodeReqMessage = null;
    var sequenceNodeIdentifier = null;

    before(function (done) {
        ips = new Ips();
        seqNodeProvider = new SequenceNodeProvider();

        hubnock = new HubMock.HubNock();
        hubnock.setupNocks(HubMock.testHubBaseUrl);

        seqNodeReqMessage = HubMock.testInitializationEnvelope;
        
        // Retrieving sequence node is pre-requisite in the flow for other
        // operations: post interaction and submission. 
        ips.retrieveSequenceNode(seqNodeReqMessage, function(error, result) {
            // there must be no errors
            //console.log(result);
            sequenceNodeKey = result.sequenceNodeKey;
            done();
        });
    });

    it('should return a valid Node Result given correct request message', function (done) {
        hubnock.setupSubmissionNock(HubMock.testHubBaseUrl);
        var param = cloneObject(interactionMessage);
        // Assign the correct 
        
        param.sequenceNodeKey = seqNodeProvider.obtainSequenceNodeKey(HubMock.testSeqNodeReqMessage);
        ips.postSubmission(param, function(err, result) {
            try {
                expect(err).to.equal(null);
                expect(result).to.be.an('object');
                expect(JSON.stringify(result)).to.equal(JSON.stringify(HubMock.testSubmissionResponseBody));
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
        var param = cloneObject(interactionMessage);
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
     
});

describe('IPS retrieveSequenceNode', function () {
    var ips = null;
    var seqNodeReqMessage = null;
    var sequenceNodeIdentifier = null;

    var sequenceNodeKey = null;
    var targetActivity = null;

    before(function (done) {
        ips = new Ips();
        seqNodeReqMessage = HubMock.testInitializationEnvelope;

        var seqNodeProvider = new SequenceNodeProvider();
        var seqNodeKeyToRemove = seqNodeProvider.obtainSequenceNodeKey(HubMock.testSeqNodeReqMessage);
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
