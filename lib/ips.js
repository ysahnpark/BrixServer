var async = require('async');

// Load in the app dependencies
var SequenceNodeProvider = require('./sequencenodeprovider.js');
var Hub = require('./hubproxy.js');

module.exports = function(config) {

	if(!config) {
		throw new Error('No config was supplied');
	}
	var logger = config.logger || function(){};

	this.retrieveSequenceNode = function(params, callback) {
		
		// @todo: Retrieve Sequence Node from AMS (or Hub)
		//        Put it cache, sanitize and return.
		seqNodeId = params;
		seqNode = {
				id: seqNodeId,
				binding: "http://binding/" + seqNodeId
			};
		results = seqNode;

		error = null;
		callback(error, results);
	};

	this.postInteraction = function(params, callback) {
		
		// @todo: business logic for interaction (logging to hub)
		results = "OK";
		error = null;
		callback(error, results);

	};

	this.postSubmission = function(params, callback) {
		
		// @todo: Go to CorrectnessEngine and create ResultNode
		results = "{answer:'myanswer'}";

		error = null;
		callback(error, results);
	};

};