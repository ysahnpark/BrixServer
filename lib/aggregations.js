var async = require('async');

// Load in the app dependencies
var Ams = require('./amsproxy.js');
var Hub = require('./hubproxy.js');

module.exports = function(config) {
	var ams = new Ams(config);
	var hub = new Hub(config);

	this.getHealth = function(callback) {
		/*	Sample async parallel call
		* uses the awesome async module https://github.com/caolan/async#parallel
		* In parallel:
		Load health route for dragnet from http://dragnet.ecollege.net/aemonitor
		Load health route for ams-api from http://dragnet.ecollege.net/aemonitor
		Load health route for hub from http://dragnet.ecollege.net/aemonitor
		Returns: Object with the response body and status code of each service call
		*/
		async.parallel({
			amsHealth : function (cb) {
				ams.getHealth(cb);
			},
			hubHealth : function (cb) {
				hub.getHealth(cb);
			}
		},
		// check error if you care about handling errors here or let it bubble up
		// results is an object with amsHealth, hubHealth and dragnetHealth properties
		// containing the response body of each call
		function (error, results) {
			callback(error, results);
		});
	};

};