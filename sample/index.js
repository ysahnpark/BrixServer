/**
 * Test Hapi REST server
 */
var winston = require('winston');
var Hapi = require('hapi');
var routes = require('./routes');

var listenPort = 8088;

winston.info('Creating Server to listen to port ' + listenPort);

// Create a server with a host and port
var server = Hapi.createServer('localhost', listenPort);

/*
server.pack.require({lout: {endpoint:'/docs'}}, function(err) {
	if (err) {
		console.log('Failed loading plugin');
	}
});
*/

server.addRoutes(routes);

var sequenceNode = {
	handler: function(request) {
		this.reply('hello world '+ request.query.sequenceNodeId);
	},
	validate: {
        query: {
            sequenceNodeId: Hapi.types.String().required()
        }
    }
}

/* Add the route
server.route({
    method: 'GET',
    path: '/sequencenode',
    config: sequenceNode
});
*/

// Start the server
server.start( function() {
	winston.info('Server started on port ' + listenPort)
});