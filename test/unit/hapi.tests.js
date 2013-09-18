/**
 * This UnitTest exemplifies a simple REST server with Hapi.
 * The HTTP request is done through Supertest
 */

var  Hapi = require('hapi');
var request = require('supertest');  // HTTP testing  

describe('Sample Hapi app: GET /hello', function () {

	var resultData = '{"result":"hello world"}';
	// Create a Hapi (HTTP) server with a host and port
	var server = Hapi.createServer('localhost', 8080);


	before(function () {
		// Add the test route with the handler
		server.route({
            method: 'POST',
            path: '/hello',
			handler: function (request) {
				console.log(request.payload);
			    request.reply(resultData).type("application/json");;
			}
		});

		server.start();
    });

	// Notice that we are using done parameter for asynchronous test.
    it('Respond with hello world', function (done) {
		request(server.listener)
			.post('/hello')
			.send({"test":"data"})
			.set('Accept', 'application/json')
			.expect('Content-Type', /json/) // Verify the content type
			.expect(resultData) // Verify the body
			.expect(200) // Verify the result code (200=OK)
			.end(function(err, result){
                if (err) return done(err);
                console.log('result:' + JSON.stringify(result.body));
                done();
            });
    });
});