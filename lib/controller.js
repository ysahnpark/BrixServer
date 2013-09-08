
var Aggregations = require('./aggregations.js'),
	Ips = require('./ips.js');
	Hapi = require('hapi');
   
module.exports = function(config) {

	var aggregations = new Aggregations(config);
	var ips = new Ips(config);
	//campus.init(config.campus_config);

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
		method: 'GET',
		path: '/seqnode',
		handler: function (request) {
			ips.getSequenceNode(request.query.seqNodeRequestParam, function(err, results)  {
				if (err) {
					return request.reply(Hapi.Error.notFound());
				}
				request.reply(results);
			});
		}
	},
	{
		method: 'POST',
		path: '/seqnode/action',
		handler: function (request) {
			ips.getSequenceNode(request.params.actionParam, function(err, results)  {
				if (err) {
					return request.reply(Hapi.Error.notFound());
				}
				request.reply(results);
			});
		}
	},
	{
		method: 'POST',
		path: '/seqnode/submission',
		handler: function (request) {
			ips.getSequenceNode(request.params.submissionParam, function(err, results)  {
				if (err) {
					return request.reply(Hapi.Error.notFound());
				}
				request.reply(results);
			});
		}
	}
	];

};