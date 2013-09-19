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

var Controller = require('../../lib/controller.js');
var expect = require('chai').expect;
var HubMock = require('../unit/hub.mock.js');
var SequenceNodeProvider = require('../../lib/sequencenodeprovider.js');
var request = require('supertest');  // HTTP testing  
var Hapi = require('hapi');

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

var submissionMessage = {
    "sequenceNodeKey": "895af0ae2d8aa5bffba54ab0555d7461",
    "timestamp": "2013-05-25T13:21:22.001Z",
    "type": "submission",
    "body": {
        "submissionData": "...some stuff..."
    }
};

/**
 * Clones a JSON object
 */
function cloneObject(obj)
{
    return JSON.parse(JSON.stringify(obj));
}

describe('IPC -> IPS Posting Interaction', function() {
    var server = null;
    var config = getConfig();
    var hubnock = null;
    var seqNodeKey  = null;
    var url = null;

    before(function (done) {
        server = appStartUp(config);

        hubnock = new HubMock.HubNock();
        hubnock.setupNocks(HubMock.testHubBaseUrl);
        
        // Retrieving sequence node is pre-requisite in the flow for other
        // operations: posting interaction and submission. 
        request(server.listener)
            .post('/sequencenodes')
            .send(HubMock.testInitializationEnvelope)
            .expect('Content-Type', /json/) // Verify the content type
            //.expect(HubMock.testSeqNodeBody) // Verify the body
            .expect(200) // Verify the result code (200=OK)

            .end(function(err, result){
                if (err) return done(err);
                try {
                    seqNodeKey = result.body.data.sequenceNodeKey;
                    url = '/sequencenodes/' + seqNodeKey + '/interactions';
                    done();
                } catch (e) {
                    done(e);
                }
            });
    });

    it('should return a valid Result given correct request message', function (done) {
        hubnock.setupInteractionNock(HubMock.testHubBaseUrl);
        var envelop = cloneObject(interactionMessage);
        
        envelop.sequenceNodeKey = seqNodeKey;

        request(server.listener)
            .post(url)
            .send(envelop)
            .set('Accept', 'application/json')
            .expect('Content-Type', /json/) // Verify the content type
            .expect(201) // Verify the result code (200=OK)
            .end(function(err, result){
                if (err) return done(err);
                try {
                    //console.log("@@@:"+JSON.stringify(result.body));
                    expect(JSON.stringify(result.body.data)).to.equal(JSON.stringify(HubMock.testInteractionResponseBody));
                    expect(result.body.status).to.equal('success');
                    done();
                } catch (e) {
                    done(e);
                }
            });

    });

    it('should return error at empty sequenceNodeKey', function (done) {
        var envelop = cloneObject(interactionMessage);
        envelop.sequenceNodeKey = '';
        var expectedErrorMessage = 'the value of sequenceNodeKey is not allowed to be empty';

        request(server.listener)
            .post(url)
            .send(envelop)
            .set('Accept', 'application/json')
            .expect('Content-Type', /json/) // Verify the content type
            .expect(400) // Verify the result code (400=Error)
            .end(function(err, result){
                if (err) return done(err);
                expect(result.body.message).to.equal(expectedErrorMessage);
                done();
            });
    });
    
    it('should return error at Empty Request Body', function (done) {
        var envelop = cloneObject(interactionMessage);
        envelop.sequenceNodeKey = seqNodeKey;
        envelop.body = '';
        var expectedErrorMessage = 'the value of body must be an object';
        request(server.listener)
            .post(url)
            .send(envelop)
            .set('Accept', 'application/json')
            .expect('Content-Type', /json/) // Verify the content type
            .expect(400) // Verify the result code (400=Error)
            .end(function(err, result){
                if (err) return done(err);
                expect(result.body.message).to.equal(expectedErrorMessage);
                done();
            });
    });

    it('should return error at SequenceNodeKey not found', function (done) {
        var envelop = cloneObject(interactionMessage);
        envelop.sequenceNodeKey = 'UnexistentKey';
        var expectedErrorMessage = 'SequenceNodeKey not found';
        request(server.listener)
            .post(url)
            .send(envelop)
            .set('Accept', 'application/json')
            .expect('Content-Type', /json/) // Verify the content type
            .expect(400) // Verify the result code (404=NOT FOUND)
            .end(function(err, result){
                if (err) return done(err);
                expect(result.body.message).to.equal(expectedErrorMessage);
                done();
            });
    });

    it('should return error at invalid Hub-Session (e.g. expired)', function (done) {
        hubnock.setupInteractionNock(HubMock.testHubBaseUrl, HubMock.testHubSessionInvalid);
        var envelop = cloneObject(interactionMessage);
        envelop.sequenceNodeKey = seqNodeKey;
        var expectedErrorMessage = 'Invalid Hub-Session';
        request(server.listener)
            .post(url)
            .send(envelop)
            .set('Accept', 'application/json')
            .expect('Content-Type', /json/) // Verify the content type
            .expect(400) // Verify the result code (400=Error)
            .end(function(err, result){
                if (err) return done(err);
                expect(result.body.message).to.equal(expectedErrorMessage);
                done();
            });
    });
});


describe('IPC -> IPS Posting Submission', function() {
    var server = null;
    var config = getConfig();
    var hubnock = null;
    var seqNodeKey  = null;
    var url = null;

    before(function (done) {
        server = appStartUp(config);

        hubnock = new HubMock.HubNock();
        hubnock.setupNocks(HubMock.testHubBaseUrl);
        
        // Retrieving sequence node is pre-requisite in the flow for other
        // operations: posting interaction and submission. 
        request(server.listener)
            .post('/sequencenodes')
            .send(HubMock.testInitializationEnvelope)
            .expect('Content-Type', /json/) // Verify the content type
            //.expect(HubMock.testSeqNodeBody) // Verify the body
            .expect(200) // Verify the result code (200=OK)

            .end(function(err, result){
                if (err) return done(err);
                try {
                    seqNodeKey = result.body.data.sequenceNodeKey;
                    url = '/sequencenodes/' + seqNodeKey + '/submissions';
                    done();
                } catch (e) {
                    done(e);
                }
            });
    });

    it('should return a valid Result given correct request message', function (done) {
        hubnock.setupSubmissionNock(HubMock.testHubBaseUrl);
        var envelop = cloneObject(submissionMessage);
        
        envelop.sequenceNodeKey = seqNodeKey;

        request(server.listener)
            .post(url)
            .send(envelop)
            .set('Accept', 'application/json')
            .expect('Content-Type', /json/) // Verify the content type
            .expect(201) // Verify the result code (200=OK)
            .end(function(err, result){
                if (err) return done(err);
                try {
                    //console.log("@@@:"+JSON.stringify(result.body));
                    expect(JSON.stringify(result.body.data)).to.equal(JSON.stringify(HubMock.testSubmissionResponseBody));
                    expect(result.body.status).to.equal('success');
                    done();
                } catch (e) {
                    done(e);
                }
            });

    });

    it('should return error at empty sequenceNodeKey', function (done) {
        var envelop = cloneObject(submissionMessage);
        envelop.sequenceNodeKey = '';
        var expectedErrorMessage = 'the value of sequenceNodeKey is not allowed to be empty';

        request(server.listener)
            .post(url)
            .send(envelop)
            .set('Accept', 'application/json')
            .expect('Content-Type', /json/) // Verify the content type
            .expect(400) // Verify the result code (400=Error)
            .end(function(err, result){
                if (err) return done(err);
                expect(result.body.message).to.equal(expectedErrorMessage);
                done();
            });
    });
    
    it('should return error at Empty Request Body', function (done) {
        var envelop = cloneObject(submissionMessage);
        envelop.sequenceNodeKey = seqNodeKey;
        envelop.body = '';
        var expectedErrorMessage = 'the value of body must be an object';
        request(server.listener)
            .post(url)
            .send(envelop)
            .set('Accept', 'application/json')
            .expect('Content-Type', /json/) // Verify the content type
            .expect(400) // Verify the result code (400=Error)
            .end(function(err, result){
                if (err) return done(err);
                expect(result.body.message).to.equal(expectedErrorMessage);
                done();
            });
    });

    it('should return error at SequenceNodeKey not found', function (done) {
        var envelop = cloneObject(submissionMessage);
        envelop.sequenceNodeKey = 'UnexistentKey';
        var expectedErrorMessage = 'SequenceNodeKey not found';
        request(server.listener)
            .post(url)
            .send(envelop)
            .set('Accept', 'application/json')
            .expect('Content-Type', /json/) // Verify the content type
            .expect(400) // Verify the result code (400=ERROR)
            .end(function(err, result){
                if (err) return done(err);
                expect(result.body.message).to.equal(expectedErrorMessage);
                done();
            });
    });

    it('should return error at invalid Hub-Session (e.g. expired)', function (done) {
        hubnock.setupSubmissionNock(HubMock.testHubBaseUrl, HubMock.testHubSessionInvalid);
        var envelop = cloneObject(submissionMessage);
        envelop.sequenceNodeKey = seqNodeKey;
        var expectedErrorMessage = 'Invalid Hub-Session';
        request(server.listener)
            .post(url)
            .send(envelop)
            .set('Accept', 'application/json')
            .expect('Content-Type', /json/) // Verify the content type
            .expect(400) // Verify the result code (400=Error)
            .end(function(err, result){
                if (err) return done(err);
                expect(result.body.message).to.equal(expectedErrorMessage);
                done();
            });
    });
});

describe('IPC -> IPS retrieveSequenceNode Test', function () {
    
});

/**
 * Returns a config object with only those fields used in this test. 
 */
function getConfig() {
    return {
        "amsBaseUrl": "http://localhost",
        "hubBaseUrl": "http://hub.paf.pearson.com",
    };
}

var appStartUp = function(config) {

    serverOptions = {
        debug: {
            request: ['error', 'uncaught']
        },
        router: {
            isCaseSensitive: false
        }
    };

    server = new Hapi.Server(config.host, config.port, serverOptions);

    var controller = new Controller(config);
    server.route(controller.routes);
    
    return server;
};
