/* **************************************************************************
 * $Workfile:: controller.js                                                $
 * *********************************************************************/ /**
 *
 * @fileoverview Herein contains routes and validation for the data coming
 *               in through those routes.
 *
 * Created on       Sept 9, 2013
 * @author          Young-Suk Ahn Park
 *                  Seann Ives
 *
 * @copyright (c) 2013 Pearson, All rights reserved.
 *
 * **************************************************************************/
var os = require("os");
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
module.exports = function(appName) {

    this.VERSION = '0.9 (20140103)';

    var appName_ = appName;
    var aggregations = new Aggregations();
    var ips = new Ips();

    var logger = utils.getLogger(config, 'controller');
    logger.info('Loading Controller version ' + this.VERSION + '.');

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
            logger.debug('Handling healthInfo');
            aggregations.getHealth(function(err, results) {
                if (err) {
                    logger.warn('Error aggregating health info ', err);
                    return request.reply(Hapi.Error.notFound());
                }
                request.reply(results);
            });
            // Do we need to handle when aggregations.getHealth fails?
        }
    },
    {
        method: 'POST',
        path: '/sequencenodes',
        handler: function (request) {
            // @todo - log the payload
			logger.debug('Handling sequencenodes', request.payload);
            ips.retrieveSequenceNode(request.payload, function(err, results)  {
				logger.debug('SequenceNode retrieved:', err, results);
				var replyPayload = {
					code: 200,
					data: {},
					status: 'success'
				};
                if (err) {
					replyPayload.code = (err.code) ? err.code : 500;
                    replyPayload.message = (err.message) ? (err.message) : err;
                    replyPayload.status = 'failure';
                }
				else
				{
					replyPayload.data = {
                        sequenceNodeKey: results.sequenceNodeKey,
                        bipsSubmission: config.bipsBaseUrl + "/sequencenodes/" + results.sequenceNodeKey + "/submissions",
                        bipsInteraction: config.bipsBaseUrl + "/sequencenodes/" + results.sequenceNodeKey + "/interactions",
                        activityConfig: results.activityConfig
                    };
				}
                logger.debug('Replying sequencenodes with', replyPayload);
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
            logger.debug('Handling sequencenodes/interactions', data);

            var replyPayload = {
                code: 201,
                data: {},
                status: "success"
            };

            logger.debug('Replying sequencenodes/interactions with', replyPayload);
            // Return a success message immediately
            request.reply(replyPayload).code(replyPayload.code);
            // Now go deal with the data.
            // Confirm that the following lines are executed
            logger.debug('Invoking ips.postInteraction()');
            ips.postInteraction(data);

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
            logger.debug('Handling sequencenodes/submissions', data);
            ips.postSubmission(data, function(err, result)  {
                var replyPayload = {
                    code: 201,
                    data: result,
                    status: "success"
                };
                if (err) {
                    // If err is a structured message, override the fields with the err's ones 
                    replyPayload.code = (err.code) ? err.code : 500;
                    replyPayload.message = (err.message) ? (err.message) : err;
                    replyPayload.status = 'failure';
                }
                
                logger.debug('Replying sequencenodes/submissions with', replyPayload);
                request.reply(replyPayload).code(replyPayload.code);
            });
        },
        config: {
            description: "IPC->IPS Submission POST.",
            validate: {
                payload: this.joiSchema()
            }
        }
    },
    {
        method: 'GET',
        path: '/images/{param*}',
        handler:
        {
            directory: { path: config.imgDir, listing: false, index: false }
        }
    },
    /**
     * This route flushes the redis cache.
     * In order to trigger this route, you will have to issue a DELETE method on
     * http://<host>:<port>/cache (e.g. http://localhost:8088/cache)
     * endpoint.
     *
     * @todo - Do proper unit test. =)
     *
     * If you use Chrome, you can install the Advanced Rest Client App.
     */
    {
        method: 'DELETE',
        path: '/cache',
        handler: function (request) {
            if (config.cacheAllowFlush) {
                logger.warn('Flushing Cache');
                var redisClient = utils.getRedisClient(config);
                redisClient.flushall( function(){
                    // The documentation says it never fails.
                });
                request.reply('OK').code(200);
            } else {
                logger.warn('Flushing Cache attempt refused: not allowed.');
                request.reply('Oh no, you cannot do this!').code(403);
            }
        }
    },
    
    ];

};