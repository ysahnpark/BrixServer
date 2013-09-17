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

var Ips = require('../../lib/ips.js'),
    nock = require('nock'),
    expect = require('chai').expect;

var SequenceNodeProvider = require('../../lib/sequencenodeprovider.js');
var HubMock = require('./hub.mock.js');

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
    var config = getConfig();
    var hubmock = null;
    var seqNodeProvider = null;
    var seqNodeReqMessage = null;

    before(function () {
        ips = new Ips(config);
        seqNodeProvider = new SequenceNodeProvider(config);

        hubmock = new HubMock();
        hubmock.setupNocks(hubmock.seqNodeReqMessage.url);

        seqNodeReqMessage = JSON.stringify(hubmock.seqNodeReqMessage);
        
        // Retrieving sequence node is pre-requisite in the flow for other
        // operations: post interaction and submission. 
        ips.retrieveSequenceNode(seqNodeReqMessage, function(error, result) {
            // there must be no errors
            //console.log(result);
            sequenceNodeKey = result.sequenceNodeKey;
        });
    });

    it('should return a valid Node Result given correct request message', function (done) {
        var param = cloneObject(interactionMessage);
        // Assign the correct 
        
        param.sequenceNodeKey = seqNodeProvider.obtainSequenceNodeKey(seqNodeReqMessage);
        ips.postInteraction(param, function(err, result) {
            expect(err).to.equal(null);
            expect(result.code).to.equal(201);
            expect(result.data).to.be.an('object');
            expect(result.status).to.equal('success');
            done();
        });
    });

    it('should return error at empty sequenceNodeKey', function (done) {
        var param = cloneObject(interactionMessage);
        param.sequenceNodeKey = '';
        var expectedErrorMessage = 'Invalid SequenceNodeKey';
        ips.postInteraction(param, function(err, result) {
            expect(err).to.equal(expectedErrorMessage);

            expect(result.code).to.equal(400);
            expect(result.message).to.equal('Invalid SequenceNodeKey');
            expect(result.status).to.equal('error');
            done();
        });
    });
    
    it('should return error at Empty Request Body', function (done) {
        var param = cloneObject(interactionMessage);
        param.sequenceNodeKey = sequenceNodeKey;
        param.body = '';
        var expectedErrorMessage = 'Invalid body';
        ips.postInteraction(param, function(err, result) {
            expect(err).to.equal(expectedErrorMessage);

            expect(result.code).to.equal(400);
            expect(result.message).to.equal(expectedErrorMessage);
            expect(result.status).to.equal('error');
            done();
        });
    });

    it('should return error at SequenceNodeKey not found', function (done) {
        var param = cloneObject(interactionMessage);
        param.sequenceNodeKey = 'ABC';
        var expectedErrorMessage = 'SequenceNodeKey not found';
        ips.postInteraction(param, function(err, result) {
            expect(err).to.equal(expectedErrorMessage);

            expect(result.code).to.equal(404);
            expect(result.message).to.equal(expectedErrorMessage);
            expect(result.status).to.equal('error');
            done();
        });
    });

    it('should return error at Hub-Session expired', function (done) {
        // How can we explicitly expire hub session?
        var param = cloneObject(interactionMessage);
        param.sequenceNodeKey = 'ABC';
        var expectedErrorMessage = 'Hub-Session expired';
        ips.postInteraction(param, function(err, result) {
            expect(err).to.equal(expectedErrorMessage);

            expect(result.code).to.equal(400);
            expect(result.message).to.equal(expectedErrorMessage);
            expect(result.status).to.equal('error');
            done();
        });
    });
});

describe('IPS Posting Submission', function() {
    var ips = null;
    var config = getConfig();
    var hubmock = null;
    var seqNodeProvider = null;
    var seqNodeReqMessage = null;

    before(function () {
        ips = new Ips(config);
        seqNodeProvider = new SequenceNodeProvider(config);

        hubmock = new HubMock();
        hubmock.setupNocks(hubmock.seqNodeReqMessage.url);

        seqNodeReqMessage = JSON.stringify(hubmock.seqNodeReqMessage);
        
        // Retrieving sequence node is pre-requisite in the flow for other
        // operations: post interaction and submission. 
        ips.retrieveSequenceNode(seqNodeReqMessage, function(error, result) {
            // there must be no errors
            //console.log(result);
            sequenceNodeKey = result.sequenceNodeKey;
        });
    });

    it('should return a valid Node Result given correct request message', function (done) {
        var param = cloneObject(interactionMessage);
        // Assign the correct 
        
        param.sequenceNodeKey = seqNodeProvider.obtainSequenceNodeKey(seqNodeReqMessage);
        ips.postSubmission(param, function(err, result) {
            expect(err).to.equal(null);
            expect(result.code).to.equal(201);
            expect(result.data).to.be.an('object');
            expect(result.status).to.equal('success');
            // @todo validate the result against a schema
            done();
        });
    });

    it('should return error at empty sequenceNodeKey', function (done) {
        var param = cloneObject(interactionMessage);
        param.sequenceNodeKey = '';
        var expectedErrorMessage = 'Invalid SequenceNodeKey';
        ips.postSubmission(param, function(err, result) {
            expect(err).to.equal(expectedErrorMessage);

            expect(result.code).to.equal(400);
            expect(result.message).to.equal(expectedErrorMessage);
            expect(result.status).to.equal('error');
            done();
        });
    });
    
    it('should return error at Empty Request Body', function (done) {
        var param = cloneObject(interactionMessage);
        param.sequenceNodeKey = sequenceNodeKey;
        param.body = '';
        var expectedErrorMessage = 'Invalid body';
        ips.postSubmission(param, function(err, result) {
            expect(err).to.equal(expectedErrorMessage);

            expect(result.code).to.equal(400);
            expect(result.message).to.equal(expectedErrorMessage);
            expect(result.status).to.equal('error');
            done();
        });
    });

    it('should return error at SequenceNodeKey not found', function (done) {
        var param = cloneObject(interactionMessage);
        param.sequenceNodeKey = 'ABC';
        var expectedErrorMessage = 'SequenceNodeKey not found';
        ips.postSubmission(param, function(err, result) {
            expect(err).to.equal(expectedErrorMessage);

            expect(result.code).to.equal(404);
            expect(result.message).to.equal(expectedErrorMessage);
            expect(result.status).to.equal('error');
            done();
        });
    });

    it('should return error at Hub-Session expired', function (done) {
        // How can we explicitly expire hub session?
        var param = cloneObject(interactionMessage);
        param.sequenceNodeKey = 'ABC';
        var expectedErrorMessage = 'Hub-Session expired';
        ips.postSubmission(param, function(err, result) {
            expect(err).to.equal('Hub-Session expired');

            expect(result.code).to.equal(400);
            expect(result.message).to.equal(expectedErrorMessage);
            expect(result.status).to.equal('error');
            done();
        });
    });
     
});

describe('IPS retrieveSequenceNode Test', function () {
    var ips = null;
    var config = getConfig();

    before(function () {
        var ips = new Ips(config);
    });

    it('returns the Sanitized SequenceNode', function (done) {
        done();
    });
    
    //@todo sequenceNodeIdentifier not found in AMS
});

/**
 * Returns a config object with only those fields used in this test. 
 */
function getConfig() {
    return {
        "amsBaseUrl": "http://localhost",
    };
}