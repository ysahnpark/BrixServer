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

var nock = require('nock');
var expect = require('chai').expect;

var utils = require('../../lib/utils.js');
var HubMock = require('./hub.mock.js');
var SequenceNodeProvider = require('../../lib/sequencenodeprovider');
var Ips = require('../../lib/ips.js');

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
    var hubnock = null;
    var seqNodeProvider = null;
    var seqNodeReqMessage = null;
    var sequenceNodeIdentifierString = null;

    before(function () {
        ips = new Ips(config);
        seqNodeProvider = new SequenceNodeProvider(config);

        hubnock = new HubMock.HubNock();
        hubnock.setupNocks(HubMock.testSeqNodeReqMessage.url);

        seqNodeReqMessage = HubMock.testInitializationEnvelope;
        sequenceNodeIdentifierString = JSON.stringify(HubMock.testSeqNodeReqMessage);
        
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
        
        param.sequenceNodeKey = seqNodeProvider.obtainSequenceNodeKey(sequenceNodeIdentifierString);
        ips.postInteraction(param, function(err, result) {
            expect(err).to.equal(null);
            expect(result).to.be.an('object');
            expect(result).to.equal({});
            done();
        });
    });


    it('should return error at SequenceNodeKey not found', function (done) {
        var param = cloneObject(interactionMessage);
        param.sequenceNodeKey = 'ABC';
        var expectedErrorMessage = 'SequenceNodeKey not found';
        ips.postInteraction(param, function(err, result) {
            expect(err).to.equal(expectedErrorMessage);

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

            done();
        });
    });
});

describe('IPS Posting Submission', function() {
    var ips = null;
    var config = getConfig();
    var hubnock = null;
    var seqNodeProvider = null;
    var seqNodeReqMessage = null;
    var sequenceNodeIdentifier = null;

    before(function () {
        ips = new Ips(config);
        seqNodeProvider = new SequenceNodeProvider(config);

        hubnock = new HubMock.HubNock();
        hubnock.setupNocks(HubMock.testSeqNodeReqMessage.url);

        seqNodeReqMessage = HubMock.testInitializationEnvelope;
        sequenceNodeIdentifierString = JSON.stringify(HubMock.testSeqNodeReqMessage);
        
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
        
        param.sequenceNodeKey = seqNodeProvider.obtainSequenceNodeKey(sequenceNodeIdentifierString);
        ips.postSubmission(param, function(err, result) {
            expect(err).to.equal(null);
            expect(result).to.be.an('object');
            // @todo validate the result against a ResultNode schema
            done();
        });
    });


    it('should return error at SequenceNodeKey not found', function (done) {
        var param = cloneObject(interactionMessage);
        param.sequenceNodeKey = 'ABC';
        var expectedErrorMessage = 'SequenceNodeKey not found';
        ips.postSubmission(param, function(err, result) {
            expect(err).to.equal(expectedErrorMessage);
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
            done();
        });
    });
     
});

describe('IPS retrieveSequenceNode', function () {
    var ips = null;
    var config = getConfig();
    var hubnock = null;
    var seqNodeProvider = null;
    var seqNodeReqMessage = null;
    var sequenceNodeIdentifier = null;

    var sequenceNodeKey = null;

    before(function () {


        // NOTE: I really wish I could get this to work (using https://github.com/jhnns/rewire 
        // to re-write getSequenceNode) because
        // then I wouldn't have to mock the getSequenceNode API call to the AMS.
/*        Ips.__set__("SequenceNodeProvider", {
            getSequenceNode: function (sequenceNodeIdentifier, callback) {
                var retVal = {"success": "rewire!"};
                callback(null, retVal);
            }
        });
*/

        ips = new Ips(config);
        seqNodeProvider = new SequenceNodeProvider(config);

        hubnock = new HubMock.HubNock();
        hubnock.setupNocks(HubMock.testSeqNodeReqMessage.url);

        seqNodeReqMessage = HubMock.testInitializationEnvelope;
        sequenceNodeIdentifierString = JSON.stringify(HubMock.testSeqNodeReqMessage);

    });

    it('should return a sequenceNode', function (done) {
        ips.retrieveSequenceNode(seqNodeReqMessage, function(error, result) {
            sequenceNodeKey = result.sequenceNodeKey;
            expect(sequenceNodeKey).to.be.not.null;
            expect(sequenceNodeKey).to.be.a('string');
            expect(result.brixConfig).to.be.an('object');

            done();
        });
    });
});

/**
 * Returns a config object with only those fields used in this test. 
 */
function getConfig() {
    return {
        "amsBaseUrl": "http://localhost",
        "hubBaseUrl": "http://localhost"
    };
}