/* **************************************************************************
 * $Workfile:: testapp.js                                             $
 * *********************************************************************/ /**
 *
 * @fileoverview  Test server that provides Brix IPS service and mocks 
 *                HTTP requests to the external services (Hub).
 *
 *
 * Created on       Sept 23, 2013
 * @author          Young-Suk Ahn Park
 *
 * @copyright (c) 2013 Pearson, All rights reserved.
 *
 * **************************************************************************/
//force test environment
process.env.NODE_ENV = 'testsvr';

var bunyan = require('bunyan');
var config = require('config');
var WebService = require('../lib/webservice');

var APP_NAME = "TESTBrixApp";
webservice = new WebService(APP_NAME);

// Setting Mocks prior web service startup
var nock = require('nock');
var HubMock = require('./mock/hub.mock');
hubnock = new HubMock.HubNock(true);
hubnock.setupSequenceNodeNock(HubMock.testHubBaseUrl, HubMock.testSeqNodeBodySubmittable);
hubnock.setupInteractionNock(HubMock.testHubBaseUrl);
hubnock.setupSubmissionNock(HubMock.testHubBaseUrl);
setupHealthNocks();
console.log('[' + APP_NAME + '] Nock base URL: ' + HubMock.testHubBaseUrl);

// Start the server
var app = webservice.appStartUp(); app.start();

// Handle Ctrl+C
process.on('SIGINT', function() {
    webservice.appShutDown('SIGINT', null);
});

/**
 * Function that nocks the AMS and HUB health service
 * @param  {Object} config contains base urls for AMS and Hub
 */
function setupHealthNocks() {
    var amsNock = nock(config.amsBaseUrl).persist();
    amsNock.get('/ams/health')
        .reply(200, {"test": "test"});

    var hubNock = nock(config.hubBaseUrl).persist();
    hubNock.get('/health')
        .reply(200, {"test": "test"});  
}