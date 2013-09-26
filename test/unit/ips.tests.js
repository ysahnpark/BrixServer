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

var nock = require('nock');
var expect = require('chai').expect;
var config = require('config');

var utils = require('../../lib/utils');
var HubMock = require('./hub.mock');
var SequenceNodeProvider = require('../../lib/sequencenodeprovider').SequenceNodeProvider;
var Ips = require('../../lib/ips').Ips;

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
    var sequenceNodeIdentifierString = null;

    before(function (done) {
        ips = new Ips();
        seqNodeProvider = new SequenceNodeProvider();

        hubnock = new HubMock.HubNock();
        hubnock.setupNocks(HubMock.testHubBaseUrl);

        seqNodeReqMessage = HubMock.testInitializationEnvelope;
        sequenceNodeIdentifierString = JSON.stringify(HubMock.testSeqNodeReqMessage);
        
        // Retrieving sequence node is pre-requisite in the flow for other
        // operations: post interaction and submission. 
        ips.retrieveSequenceNode(seqNodeReqMessage, function(error, result) {
            // there must be no errors
            //console.log(result);
            sequenceNodeKey = result.sequenceNodeKey;
            done();
        });
    });

    it('should return an empty object given correct request message', function (done) {
        hubnock.setupInteractionNock(HubMock.testHubBaseUrl);
        var param = cloneObject(interactionMessage);
        
        param.sequenceNodeKey = seqNodeProvider.obtainSequenceNodeKey(HubMock.testSeqNodeReqMessage);
console.log('*1');
        ips.postInteraction(param, function(err, result) {
            try {
console.log('*2');
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
        sequenceNodeIdentifierString = JSON.stringify(HubMock.testSeqNodeReqMessage);
        
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

        ips = new Ips();
        seqNodeProvider = new SequenceNodeProvider();

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
