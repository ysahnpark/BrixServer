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
var expect = require('chai').expect;
var config = require('config');

var utils = require('../../lib/utils.js');

var HubMock = require('../mock/hub.mock');
var amsproxy = require('../../lib/amsproxy');


describe('AmsProxy', function () {

    var amsProxy = null;

    var HUB_SESSION = HubMock.testHubSession;

    var amsSubmissionParam = {
        content : {
             "@context": "http://purl.org/pearson/paf/v1/ctx/core/SequenceNode",
             "@type": "SequenceNode",
             "nodeIndex": 1,
             "targetBinding": "http://repo.paf.dev.pearsoncmg.com/paf-repo/resources/activities/42d2b4f4-46bd-49ee-8f06-47b4421f599b/bindings/0"
        },
        url: "http://localhost/seqnode",
        method: "POST"
    };

    before(function () {
        amsProxy = new amsproxy.AmsProxy();
    });

    it('should do POST request to AMS when sendSubmission is called', function (done) {
        // The Mocks will intercept the HTTP call and return without requiring the actual server. 
        var hubnock = new HubMock.HubNock();
        var nockScope = hubnock.setupSubmissionNock(HubMock.testHubBaseUrl, undefined, HubMock.testNodeResult);
        
        var param = {
            hubSession: HubMock.testHubSession,
            nodeResult: HubMock.testNodeResult
        };
        
        amsProxy.sendSubmission(param, function(err, result){
            try {
                expect(err).to.equal(null);
                expect(result).to.equal(HubMock.testInteractionResponseBody); // which is ''

                expect(nockScope.isDone()).to.be.true;

                done();
            }
            catch (e)
            {
                done(e);
            }
        });


    });

    it('should throw error when sendInteraction is called', function () {
        // The Mocks will intercept the HTTP call and return without requiring the actual server. 
        
        var errorThrown = false;
        try {
            amsProxy.sendInteraction({any:"dummy-data"}, function(){})
        } catch (error) {
            errorThrown = true;
        }
        expect(errorThrown).to.be.true;
    });
});

