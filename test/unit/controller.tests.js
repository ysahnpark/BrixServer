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
			assert.strictEqual(routes.length, 4, 'there should be 4 routes in the array');
			routes.forEach(function(route) {
				assert(_.isObject(route), 'the route should be an object');
				//assert.strictEqual(route.method, 'GET', 'the route method should be set correctly');
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
	
});

function getConfig() {
	return {
		"amsBaseUrl": "http://127.0.0.1",
		"hubBaseUrl": "http://127.0.0.2",
		"mobileBaseUrl": "http://127.0.0.3",
	};
}

function setupNocks(config) {
	var amsNock = nock(config.amsBaseUrl);
	amsNock.get('/aemonitor')
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
};

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
};


function RequestMock(onReplyCallback) {

	this.reply = function(value) {
		onReplyCallback(value);
	};
}
