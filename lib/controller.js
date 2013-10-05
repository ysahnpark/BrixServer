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
var Hapi = require('hapi');
var config = require('config');
var utils = require('./utils');
var Aggregations = require('./aggregations');
var Ips = require('./ips').Ips;

/* **************************************************************************
 * Controller module                                                   */ /**
 *
 * Constructor.
 *
 * @constructor
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
module.exports = function() {

	var aggregations = new Aggregations();
	var ips = new Ips();

	var logger = utils.getLogger(config, 'controller');

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
			//request.reply("Alive");
			logger.debug('Handle healthInfo');
			aggregations.getHealth(function(err, results) {
				if (err) {
					logger.warn('Error aggregating health info ', err);
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
			logger.debug('Handle sequencenodes', request.payload);
			ips.retrieveSequenceNode(request.payload, function(err, results)  {
				logger.debug('SequenceNode retrieved:', err, results);
				var replyPayload = {
					code: 200,
					data: {},
					status: "success"
				};
				if (err) {
					replyPayload.code = 400;
					replyPayload.message = err;
					replyPayload.status = 'failure';
				} 
				else
				{
					replyPayload.data = {
						sequenceNodeKey: results.sequenceNodeKey,
						bipsSubmission: config.bipsBaseUrl + "/sequencenodes/" + results.sequenceNodeKey + "/submissions",
						bipsInteraction: config.bipsBaseUrl + "/sequencenodes/" + results.sequenceNodeKey + "/interactions",
						containerConfig: results.containerConfig
					};
				}
				request.reply(replyPayload).code(replyPayload.code);
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
			var data = request.payload;
			logger.debug('Handle sequencenodes/interactions', data);
			ips.postInteraction(data, function(err, result)  {
				var replyPayload = {
					code: 201,
					data: {},
					status: "success"
				};
				if (err) {
					replyPayload.code = 400;
					replyPayload.message = err;
					replyPayload.status = 'failure';
				}
				request.reply(replyPayload).code(replyPayload.code);
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
			var data = request.payload;
			logger.debug('Handle sequencenodes/submissions', data);
			ips.postSubmission(data, function(err, result)  {
				var replyPayload = {
					code: 201,
					data: result,
					status: "success"
				};
				if (err) {
					replyPayload.code = 400;
					replyPayload.message = err;
					replyPayload.status = 'failure';
				}
				
				request.reply(replyPayload).code(replyPayload.code);
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