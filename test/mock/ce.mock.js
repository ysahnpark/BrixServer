/* **************************************************************************
 * $Workfile:: ce.mock.js                                             $
 * *********************************************************************/ /**
 *
 * @fileoverview This file contains Correctness Engine (CE) Mock module that intercepts HTTP
 *               requests targeted to CE.
 *               Intercepted paths are:
 *               /assess/ - for the assessment 
 *
 * Usage:
 * 1. Include the require in the javascript file:
 *    var CEMock = require('../mock/ce.mock.js');
 * 2. Instantiate Nock class and setup nocks with the base url of the remote server:
 *    var cenock = new CEMock.CENock();
 *    cenock.setupAssessmentNock('http://ce.brix.pearson.com');
 * 3. Subsequent call to that URL with /assessments path will be intercepted by the nock.
 *
 *
 * Created on       Oct 1, 2013
 * @author          Seann Ives
 *
 * @copyright (c) 2013 Pearson, All rights reserved.
 *
 * **************************************************************************/

var nock = require('nock');
var config = require('config');

/**
 * A test CE URL
 * @type {String}
 */
module.exports.testCEBaseUrl = config.ceBaseUrl;

/**
 * A test (successful) assessment response message
 * @type {Object}
 */
module.exports.testAssessmentResponseBody = {
    "code": 200,
    "data": {
        "correctness": 0,
        "feedback": {
            "text": "Does the growth rate change with population size?"
        },
        "correctAnswer": {}
    },
    "status": "success"
};

/**
 * A test (successful) assessment with correct answer response message
 * @type {Object}
 */
module.exports.testAssessmentWithCorrectResponseBody = {
    "code": 200,
    "data": {
        "correctness": 0,
        "feedback": {
            "text": "Does the growth rate change with population size?"
        },
        "correctAnswer": {
            "key": "option000"
        }
    },
    "status": "success"
};

/**
 * A test (error) assessment response message
 * @type {Object}
 */
module.exports.testErrorAssessmentResponseBody = {
    "code": 400,
    "data": "Not Found",
    "message": "Brix assessment type [paintByNumbers] not supported by the Correctness Engine",
    "status": "error"
};


/**
 * The constructor function that encapsulates the Nock which intercepts HTTP requests
 *
 * @param {boolean=} opt_persist  Setting it to true makes the nock persistent, i.e.  
 *                                It will live after a call. Otherwise the call will
 *                                be used and subsequent calls will produce errors.
 */
module.exports.CENock = function(opt_persist) {

    var persist_ = (opt_persist) ? opt_persist : false;

    /**
     * Sets an HTTP server mock that intercepts HTTP call and returns as configured.
     * This particular Nock will intercept CE call and return code 200 with the 
     * body as specified in the global variable seqNodeBody
     *
     * @param {String} baseUrl  - The url that this nock should listen to.
     */
    this.setupAssessmentNock = function(baseUrl, opt_responseData) {

        var responseData = (opt_responseData !== undefined)
                                ? opt_responseData
                                : module.exports.testInteractionResponseBody;

        // Nock for the assessment retrieval
        var ceNock = nock(baseUrl);
        if (persist_)
        {
            ceNock.persist();
        }
        ceNock.post('/assessments')
            //.matchHeader('Content­-Type', 'application/vnd.pearson.paf.v1.node+json')
            //.matchHeader('Hub­-Session', module.exports.testHubSession)
            .reply(200, JSON.stringify(responseData));
    };

    /**
     * Sets an HTTP server mock that intercepts HTTP call and returns as configured.
     * This particular Nock will intercept CE call and return code 200 with the 
     * body as specified in the global variable seqNodeBody
     *
     * @param {String} baseUrl  - The url that this nock should listen to.
     */
    this.setupAssessmentErrorNock = function(baseUrl, opt_responseData) {

        var responseData = (opt_responseData !== undefined)
                                ? opt_responseData
                                : module.exports.testErrorAssessmentResponseBody;

        // Nock for the assessment retrieval
        var ceNock = nock(baseUrl);
        if (persist_)
        {
            ceNock.persist();
        }
        ceNock.post('/assessments')
            //.matchHeader('Content­-Type', 'application/vnd.pearson.paf.v1.node+json')
            //.matchHeader('Hub­-Session', module.exports.testHubSession)
            .reply(400, JSON.stringify(responseData));
    };
};