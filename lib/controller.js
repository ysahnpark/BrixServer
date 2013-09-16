/* **************************************************************************
 * $Workfile:: controller.js                                                $
 * *********************************************************************/ /**
 *
 * @fileoverview Herein contains routes and validation for the data coming
 *               in through those routes.
 *
 * Created on		Sept 9, 2013
 * @author			Young-Suk Ahn Park
 *                  Seann Ives
 *
 * @copyright (c) 2013 Pearson, All rights reserved.
 *
 * **************************************************************************/
var Aggregations = require('./aggregations.js'),
	Ips = require('./ips.js');
	Hapi = require('hapi');

/* **************************************************************************
 * Controller module                                                   */ /**
 *
 * Constructor.
 *
 * @constructor
 *
 * @param {Object}	config - The settings to configure this object
 *
 * @classdesc
 * Routes for /healthInfo, 
 *            /sequencenodes, 
 *            /sequencenodes/{sequenceNodeKey}/interactions
 *            /sequencenodes/{sequenceNodeKey}/submissions
 *
 * Validation for the sequencenodes routes. 
 *            
 *
 ****************************************************************************/
module.exports = function(config) {

	var aggregations = new Aggregations(config);
	var ips = new Ips(config);

	// Sample joi schema.  Here just to illustrate the differences between
	// this and JSONschema so we can have a conversation.
	var joiSchema = {
		sequenceNodeIdentifier: Hapi.types.Object().required(),
		timestamp: Hapi.types.Any(),
		type: Hapi.types.String().required(),
		body: Hapi.types.Object().required()
	};

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
			// @todo - log the payload
			ips.retrieveSequenceNode(request.payload, function(err, results)  {
				if (err) {
					return request.reply(Hapi.Error.notFound());
				}
				request.reply(results);
			});
		},
		config: {
			description: "IPC->IPS Initialization POST.",
			validate: {
				//payload: true // replace this with joi validation rules object
				payload: joiSchema // see schema definition above
			}
		}
	},
	{
		method: 'POST',
		path: '/sequencenodes/{sequenceNodeKey}/interactions',
		handler: function (request) {
			var data = {"sequenceNodeKey": request.params.sequenceNodeKey,
						"payload": request.payload};
			ips.postInteraction(data, function(err, results)  {
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
			var data = {"sequenceNodeKey": request.params.sequenceNodeKey,
						"payload": request.payload};
			ips.postSubmission(data, function(err, results)  {
				if (err) {
					return request.reply(Hapi.Error.notFound());
				}
				request.reply(results);
			});
		}
	}
	];

};