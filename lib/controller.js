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
var Aggregations = require('./aggregations.js');
var Ips = require('./ips.js');
var Hapi = require('hapi');

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

	/**
	 * joi (provided via hapi) schema for initialization payload.
	 * @return {object} joi schema for initialization payload
	 */
	this.joiSchema = function()
	{
		return {
			sequenceNodeIdentifier: Hapi.types.Object().without('sequenceNodeKey'),
			sequenceNodeKey: Hapi.types.String(),
			timestamp: Hapi.types.String().date().required(),
			type: Hapi.types.String().valid('initialization','interaction','submission').required(),
			body: Hapi.types.Object().required()
		};
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
					// @todo - wrap this in payload
					return request.reply(Hapi.Error.notFound());
				}
				var replyPayload = {
					code: "200",
					data: {
						sequenceNodeKey: results.sequenceNodeKey,
						bipsSubmission: config.bipsServer + "/sequencenodes/" + results.sequenceNodeKey + "/submissions",
						bipsInteraction: config.bipsServer + "/sequencenodes/" + results.sequenceNodeKey + "/interactions",
						brixConfig: results.brixConfig
					},
					status: "success"
				};
				request.reply(replyPayload);
			});
		},
		config: {
			description: "IPC->IPS Initialization POST.",
			validate: {
				payload: this.joiSchema()
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
		},
		config: {
			description: "IPC->IPS Interaction POST.",
			validate: {
				payload: this.joiSchema()
			}
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
		},
		config: {
			description: "IPC->IPS Submission POST.",
			validate: {
				payload: this.joiSchema()
			}
		}
	}
	];

};