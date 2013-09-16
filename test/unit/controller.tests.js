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

var assert = require('assert'),
	nock = require('nock'),
	_ = require('underscore'),
	Controller = require('../../lib/controller.js');

describe ('IPS Controller', function(){

	describe ('constructor()', function(){

		it ('should return a Controller object', function(done) {

			//Arrange
			var config = getConfig();
			
			//Act
			var controller = new Controller(config);

			//Arrange
			assert(controller);
			assert(controller instanceof Controller);
			done();
		});

	});

	describe ('routes property', function() {

		it ('should return an array of routes', function(done) {

			//Arrange
			var config = getConfig();
			var controller = new Controller(config);

			
			//Act
			var routes = controller.routes;

			//Assert
			assert(routes, 'routes should exist');
			assert(_.isArray(routes), 'routes should be an array');
			// Routes in here must be in the same order as routes in controller.js for the following to play nicely
			assert.strictEqual(routes.length, 4, 'there should be 4 routes in the array');
			assert.strictEqual(routes[0].method, 'GET', '/healthInfo should be a GET');
			assert.strictEqual(routes[1].method, 'POST', '/sequenceNodes should be a POST');
			assert.strictEqual(routes[2].method, 'POST', '/sequencenodes/{sequenceNodeKey}/interactions should be a POST');
			assert.strictEqual(routes[3].method, 'POST', '/sequencenodes/{sequenceNodeKey}/submissions should be a POST');
			routes.forEach(function(route) {
				assert(_.isObject(route), 'the route should be an object');
				assert(_.isFunction(route.handler), 'the route handler should be set correctly');
			});
			
			done();

		});
	});

	describe ('/healthInfo handler', function() {
		
		it ('should work', function(done) {
			
			//Arrange
			var config = getConfig();
			var controller = new Controller(config);
			var handler = controller.routes[0].handler;
			var request = new RequestMock(onReplyCallback);
			setupNocks(config);
			
			//Act
			handler(request);
			
			//Assert
			function onReplyCallback(replyValue) {
				assert(replyValue, 'the handler should reply');
				assert.deepEqual(replyValue, getExpectedSuccessResponse());
				done();
			}
			
		});

		it ('should handle an error appropriately', function(done) {
			
			//Arrange
			var config = getConfig();
			config.amsBaseUrl = "baddomain.ecollege.net";
			var controller = new Controller(config);
			var handler = controller.routes[0].handler;
			var request = new RequestMock(onReplyCallback);
			setupNocks(config);
			
			//Act
			handler(request);
			
			//Assert
			function onReplyCallback(replyValue) {
				assert(replyValue, 'the handler should reply');
				assert.deepEqual(replyValue, getExpectedFailureResponse());
				done();
			}
			
		});
		
	});

	describe ('/sequenceNodes handler', function() {
		
		it ('should work', function(done) {
			
			//Arrange
			var config = getConfig();
			var controller = new Controller(config);
			var handler = controller.routes[1].handler;
			var request = new RequestMock(onReplyCallback);
			
			//Act
			handler(request);
			
			//Assert
			function onReplyCallback(replyValue) {
				assert(replyValue, 'the handler should reply');

				// @todo I'm honestly not sure how best to handle this here.  Ideally
				// we'd just want to fake both the request and reply...perhaps
				// the above is enough.
				
				//assert.deepEqual(replyValue, getExpectedSuccessResponse());
				done();
			}
		});

		it ('should handle an error appropriately', function(done) {
			
			//Arrange
			var config = getConfig();
			config.amsBaseUrl = "baddomain.ecollege.net";
			var controller = new Controller(config);
			var handler = controller.routes[1].handler;
			var request = new RequestMock(onReplyCallback);
			
			//Act
			handler(request);
			
			//Assert
			function onReplyCallback(replyValue) {
				assert(replyValue, 'the handler should reply');
				//assert.deepEqual(replyValue, getExpectedFailureResponse());
				done();
			}
			
		});
		
	});
	
});

function getConfig() {
	return {
		"amsBaseUrl": "http://127.0.0.1",
		"hubBaseUrl": "http://127.0.0.2",
	};
}

function setupNocks(config) {
	var amsNock = nock(config.amsBaseUrl);
	amsNock.get('/ams/health')
		.reply(200, {"test": "test"});

	var hubNock = nock(config.hubBaseUrl);
	hubNock.get('/health')
		.reply(200, {"test": "test"});
		
}

function setupFnNocks(config) {

	var userNock = nock(config.campus_config.ROOT_URL);
	
	var userNock = nodemock.mock("campus.user.getUserMappingByPersonId").takes(10, [10, 20, 30]).returns(98);
	userNock.get('/eps/berlin/persons')
		.reply(200, {"test": "test"});
				
}

function getExpectedSuccessResponse() {
	return {
		"hubHealth":{
			"test":"test",
			"statusCode":200
			
		},
		"amsHealth":
		{
			"test":"test",
			"statusCode":200
			
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
