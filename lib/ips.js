/* **************************************************************************
 * $Workfile:: ips.js                                                       $
 * *********************************************************************/ /**
 *
 * @fileoverview ips contains the handlers for the controller routes.
 *               It manages:
 *               1. retrieveSequenceNodes
 *               2. postInteraction
 *               3. postSequence
 *
 * Created on		Sept 9, 2013
 * @author			Young-Suk Ahn Park
 *                  Seann Ives
 *
 * @copyright (c) 2013 Pearson, All rights reserved.
 *
 * **************************************************************************/
var SequenceNodeProvider = require('./sequencenodeprovider.js');


/* **************************************************************************
 * IPS module                                                          */ /**
 *
 * Constructor.
 *
 * @constructor
 *
 * @param {Object}	config - The settings to configure this object
 *
 * @classdesc
 * The IPS implements three methods: 
 *  1) retrieve the sequence node
 *  2) deal with interaction messages
 *  3) deal with submission messages
 *
 ****************************************************************************/
module.exports = function(config) {

	if(!config) {
		throw new Error('No config was supplied');
	}
	var logger = config.logger || function(){};

	/**
	 * Receives a payload from the controller containing sequenceNodeIdentifier
	 * information which it hands off to the sequenceNodeProvider, receives
	 * sequenceNode information in return, sanitizes it, splits it by target if
	 * necessary, and returns the sanitized node and sequenceNodeKey to the client.
	 * 
	 * @param  {object}   payload  An object containing a sequenceNodeIdentifier,
	 *                             timestamp, type (of 'initialization'), and
	 *                             body potentially containing a target.
	 * @param  {Function} callback Callback with signature fn(error, results),
	 *                             where results will contain the sanitized
	 *                             sequenceNode to return to the client
	 */
	this.retrieveSequenceNode = function(payload, callback) {
		var sequenceNodeIdentifier = payload.sequenceNodeIdentifier;
		//var targetID = payload.body.targetID;
		var results = {"yay": "1"};
		var error;
		//var seqNodeProvider = new SequenceNodeProvider(config);
		//seqNodeProvider.getSequenceNode(sequenceNodeIdentifier, function(error, results) {
			callback(error, results);
		//});
	};

	this.postInteraction = function(data, callback) {
		
		// @todo: business logic for interaction (logging to hub)
		var results = "OK";
		error = null;
		callback(error, results);
	};

	this.postSubmission = function(data, callback) {
		
		// @todo: Go to CorrectnessEngine and create ResultNode
		results = "{answer:'myanswer'}";

		error = null;
		callback(error, results);
	};

};