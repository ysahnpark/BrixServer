
var Aggregations = require('./aggregations.js'),
	Ips = require('./ips.js');
	Hapi = require('hapi');
   
module.exports = function(config) {

	var aggregations = new Aggregations(config);
	var ips = new Ips(config);

	this.routes = [
	{
		method: 'GET',
		path: '/healthInfo',
		handler: function (request) {
			aggregations.getHealth(function(err, results) {
				if (err) {
					return request.reply(Hapi.Error.notFound());
				}
				request.reply(results);
			});
		}
	},
	{
		method: 'POST',
		path: '/sequencenodes',
		handler: function (request) {
			ips.retrieveSequenceNode(request, function(err, results)  {
				if (err) {
					return request.reply(Hapi.Error.notFound());
				}
				request.reply(results);
			});
		},
		config: {
			description: "IPC->IPS Initialization POST.",
			validate: {
				payload: true // replace this with joi validation rules object
			}
		}
	},
	{
		method: 'POST',
		path: '/sequencenodes/{sequenceNodeKey}/interactions',
		handler: function (request) {
			ips.postInteraction(request.params.actionParam, function(err, results)  {
				if (err) {
					return request.reply(Hapi.Error.notFound());
				}
				request.reply(results);
			});
		}
	},
	{
		method: 'POST',
		path: '/sequencenodes/{sequenceNodeKey}/submissions',
		handler: function (request) {
			ips.postSubmission(request.params.submissionParam, function(err, results)  {
				if (err) {
					return request.reply(Hapi.Error.notFound());
				}
				request.reply(results);
			});
		}
	}
	];

};