/* **************************************************************************
 * $Workfile:: sinon.tests.js                                          $
 * *********************************************************************/ /**
 *
 * @fileoverview Test exemplifying the usage of sinon to stub/mock
 *
 * NOTE: This was largely pilfered from the Pearson node app reference
 * implementation.  At this point it's mainly testing that routes
 * exist, not that they really do stuff.
 * 
 * Created on       Sept 10, 2013
 * @author          Young-Suk Ahn Park
 * @author          Seann Ives
 *
 * @copyright (c) 2013 Pearson, All rights reserved.
 *
 * **************************************************************************/
var sinon = require('sinon');
var expect = require('chai').expect;

var utils = require('../../lib/utils.js');
var HubMock = require('./hub.mock.js');
// No longer overriding the require behavior
//var SequenceNodeProvider = require('../../lib/sequencenodeprovider');
var Ips = require('../../lib/ips.js').Ips;


describe('Sinon for IPS retrieveSequenceNode', function () {
    var config = getConfig();
    var ips = null;
    //var hubnock = null;
    //var seqNodeProvider = null;
    var seqNodeReqMessage = null;
    var sequenceNodeIdentifier = null;

    var sequenceNodeKey = null;

    before(function () {

        ips = new Ips(config);
        // mockery #1 - mocking the function
        var stub = sinon.stub(ips.sequenceNodeProvider, "getSequenceNode", function (sequenceNodeIdentifier, callback) {
                console.log("I'M IN THE SINON STUB");
                var sequenceNodeKey = '123';
                var data = {"targetActivity": {
                    "yay": "100"}
                };
                
                callback(null, {sequenceNodeKey: sequenceNodeKey, sequenceNodeContent: data, fromCache:false});
            });

        // No longer using the Nock
        //hubnock = new HubMock.HubNock();
        //hubnock.setupNocks(HubMock.testSeqNodeReqMessage.url);

        seqNodeReqMessage = HubMock.testInitializationEnvelope;
        sequenceNodeIdentifierString = JSON.stringify(HubMock.testSeqNodeReqMessage);

    });

    it('should return a sequenceNode', function (done) {
        ips.retrieveSequenceNode(seqNodeReqMessage, function(error, result) {
            console.log(result);
            sequenceNodeKey = result.sequenceNodeKey;
            expect(sequenceNodeKey).to.be.not.null;
            expect(sequenceNodeKey).to.be.a('string');
            expect(result.brixConfig).to.be.an('object');

            // calledOnce is property of sinon.spy which is super class of sinon.stub.
            expect(ips.sequenceNodeProvider.getSequenceNode.calledOnce).to.be.true;
            done();
        });
    });

    after(function () {
        
    });
});

/**
 * Returns a config object with only those fields used in this test. 
 */
function getConfig() {
    return {
        "amsBaseUrl": "http://localhost",
        "hubBaseUrl": HubMock.testHubBaseUrl
    };
}