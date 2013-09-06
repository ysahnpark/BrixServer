/**
 * This UnitTest exemplifies a simple REST server with Hapi.
 * The HTTP request is done through Supertest
 */

var  Hapi = require('hapi');
var request = require('supertest');  // HTTP testing  

describe('GET /hello', function () {

	// Create a Hapi (HTTP) server with a host and port
	var server = Hapi.createServer('localhost', 8080);

	before(function () {
		// Add the test route with the handler
		server.route({
		    method: 'GET',
		    path: '/hello',
		    handler: function () {
		        this.reply('hello world').type("application/json");;
		    }
		});

		server.start();
    });

	// Notice that we are using done parameter for asynchronous test.
    it('Respond with hello world', function (done) {
		request(server.listener)
			.get('/hello')
			.set('Accept', 'application/json')
			.expect('Content-Type', /json/) // Verify the content type
			.expect('hello world') // Verify the body
			.expect(200, done); // Verify the result code (200=OK)
    });
});