/* **************************************************************************
 * $Workfile:: controller.tests.js                                          $
 * *********************************************************************/ /**
 *
 * @fileoverview Contains unit tests for routes controller.js
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
//force test environment
process.env.NODE_ENV = 'test';

var assert = require('assert');
var nock = require('nock');
var _ = require('underscore');
var Joi = require('joi');
var expect = require('chai').expect;
var config = require('config');
var utils = require('../../lib/utils');
var Controller = require('../../lib/controller');

describe ('IPS Controller', function(){

    describe ('constructor()', function(){

        it ('should return a Controller object', function(done) {

            //Arrange
            
            //Act
            var controller = new Controller();

            //Arrange
            expect(controller).to.not.null;
            expect(controller instanceof Controller).to.be.true;
            done();
        });

    });

    describe ('routes property', function() {

        it ('should return an array of routes', function(done) {

            //Arrange
            var controller = new Controller();

            
            //Act
            var routes = controller.routes;

            // Assert,  'routes should exist'
            expect(routes).to.not.null;
            assert(_.isArray(routes), 'routes should be an array');
            // Routes in here must be in the same order as routes in controller.js for the following to play nicely
            var idx = 0;
            assert.strictEqual(routes[idx++].method, 'GET', '/healthInfo should be a GET');
            assert.strictEqual(routes[idx++].method, 'POST', '/sequenceNodes should be a POST');
            assert.strictEqual(routes[idx++].method, 'POST', '/sequencenodes/{sequenceNodeKey}/interactions should be a POST');
            assert.strictEqual(routes[idx++].method, 'POST', '/sequencenodes/{sequenceNodeKey}/submissions should be a POST');
            assert.strictEqual(routes[idx++].method, 'GET', '/images/{param*} should be a GET');
            assert.strictEqual(routes[idx++].method, 'GET', '/ping should be a GET');
            assert.strictEqual(routes[idx++].method, 'DELETE', '/cache* should be a GET');
            assert.strictEqual(routes[idx++].method, 'GET', '/log/{param*} should be a GET');
            assert.strictEqual(routes.length, idx, 'there should be ' + idx + ' routes in the array');
            
            routes.forEach(function(route) {
                assert(_.isObject(route), 'the route should be an object');
                if (route.handler.directory)
                {
                    assert(_.isObject(route.handler.directory), 'the directory should be an object');
                }
                else
                {
                    assert(_.isFunction(route.handler), 'the route handler should be set correctly');
                }
            });
            
            done();

        });
    });

    // Note: this does an "integration" style test through the /healthInfo route, meaning these tests touch
    // more than just the code in controller.js.  We won't be using this style of test for our 
    // sequenceNode routes here.  Please see the tests in /test/integration for that kind of thing.
    describe ('/healthInfo handler', function() {
        
        // @todo - fix
        // When called like this, the reply() is not returning undefined
        it.skip('/ping should work', function(done) {
            
            //Arrange
            var controller = new Controller();
            var handler = controller.routes[5].handler;
            var request = new RequestMock(onReplyCallback);
            setupNocks(config);
            
            //Act
            handler(request);
            
            //Assert
            function onReplyCallback(replyValue) {
                expect(replyValue).to.not.null;
                done();
            }
        });

        it ('should work', function(done) {
            
            //Arrange
            var controller = new Controller();
            var handler = controller.routes[0].handler;
            var request = new RequestMock(onReplyCallback);
            setupNocks(config);
            
            //Act
            handler(request);
            
            //Assert
            function onReplyCallback(replyValue) {
                assert(replyValue, 'the handler should reply');
                assert.deepEqual(replyValue, getExpectedSuccessResponse());
                //expect(replyValue).to.equal("OK");
                done();
            }
        });

        it.skip ('should handle an error appropriately', function(done) {
            
            //Arrange
            var controller = new Controller();
            var handler = controller.routes[0].handler;
            var request = new RequestMock(onReplyCallback);
            // @todo - refactor this
            var tmpConfig = utils.cloneObject(config);
            tmpConfig.amsBaseUrl = "baddomain.ecollege.net";
            tmpConfig.hubBaseUrl = "http://hub.paf.pearson.com";
            setupNocks(tmpConfig);
            
            //Act
            handler(request);
            
            //Assert
            function onReplyCallback(replyValue) {
                assert(replyValue, 'the handler should reply');
                expect(replyValue).deep.equal(getExpectedFailureResponse());
                done();
            }
            
        });
        
    });

    describe ('joi schema validation', function () {
        //Arrange
        var controller = null;
        before(function () {
            controller = new Controller();
        });

        it ('should accept a proper initialization payload', function(done) {
            var payload = {
                "sequenceNodeIdentifier": {
                    "stuff": "pants"
                },
                "timestamp": "2013-09-17T06:44Z",
                "type": "initialization",
                "body": {
                    "moreStuff": "legs"
                }
            };
            var err = Joi.validate(payload,controller.joiSchema());
            expect(err).to.be.null;
            done();
        });
        it ('should catch missing sequenceNodeIdentifier and sequenceNodeKey', function(done) {
            var payload = {
                "sequenceNodeFantastico": {
                    "stuff": "pants"
                },
                "timestamp": "2013-09-17T06:44Z",
                "type": "initialization",
                "body": {
                    "moreStuff": "legs"
                }
            };
            var err = Joi.validate(payload,controller.joiSchema());
            expect(err.message).to.equal('the key (sequenceNodeFantastico) is not allowed');
            done();
        });
        // @todo - this one's not working.  the .without on sequenceNodeIdentifier in the schema's
        // not doing what I want it to do
        it.skip ('should not allow sequenceNodeIdentifier and sequenceNodeKey', function(done) {
            var payload = {
                "sequenceNodeIdentifier": {
                    "stuff": "pants"
                },
                "sequenceNodeKey": {
                    "stuff2": "pants"
                },
                "timestamp": "2013-09-17T06:44Z",
                "type": "initialization",
                "body": {
                    "moreStuff": "legs"
                }
            };
            var err = Joi.validate(payload,controller.joiSchema());
            //console.log(err);
            expect(err.message).to.equal('the key (sequenceNodeFantastico) is not allowed');
            done();
        });
        it ('should catch a bad type', function(done) {
            var payload = {
                "sequenceNodeKey": "2398473983",
                "timestamp": "2013-09-17T06:44Z",
                "type": "notInitialization",
                "body": {
                    "moreStuff": "legs"
                }
            };
            var err = Joi.validate(payload,controller.joiSchema());
            expect(err.message).to.equal('the value of type must be one of submission, interaction, initialization');
            done();
        });
        it ('should catch a missing body', function(done) {
            var payload = {
                "sequenceNodeKey": "2398473983",
                "timestamp": "2013-09-17T06:44Z",
                "type": "submission"
            };
            var err = Joi.validate(payload,controller.joiSchema());
            expect(err.message).to.equal('the value of body is not allowed to be undefined');
            done();
        });
    });

    
    
});

function setupNocks(tmpConfig) {
    var amsNock = nock(tmpConfig.amsBaseUrl);
    amsNock.get('/ams/health')
        .reply(200, {"test": "test"});

    var hubNock = nock(tmpConfig.hubBaseUrl);
    hubNock.get('/health')
        .reply(200, {"test": "test"});
}

function getExpectedSuccessResponse() {
    return {
        "amsHealth":
        {
            "test":"test",
            "statusCode": 200
        }
    };
}

function getExpectedFailureResponse() {
    return {
        "isBoom":true,
        "response":{
            "code":404,
            "payload":{
                "code":404,
                "error":"Not Found"
                
            },
            "headers":{}
        }
    };
}


function RequestMock(onReplyCallback) {
    this.reply = function(value) {
        onReplyCallback(value);
    };
}

