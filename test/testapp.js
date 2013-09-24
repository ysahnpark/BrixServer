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
var bunyan = require('bunyan');
var WebService = require('../lib/webservice');

webservice = new WebService("TESTBrixApp");

// Setting Mocks prior web service startup
var nock = require('nock');
var HubMock = require('./unit/hub.mock');
hubnock = new HubMock.HubNock(true);
hubnock.setupSequenceNodeNock(HubMock.testHubBaseUrl);
hubnock.setupInteractionNock(HubMock.testHubBaseUrl);
hubnock.setupSubmissionNock(HubMock.testHubBaseUrl);
setupHealthNocks(webservice.getConfig());

// Start the server
var app = webservice.appStartUp(); app.start();


/**
 * Function that nocks the AMS and HUB health service
 * @param  {Object} config contains base urls for AMS and Hub
 */
function setupHealthNocks(config) {
    var amsNock = nock(config.amsBaseUrl).persist();
    amsNock.get('/ams/health')
        .reply(200, {"test": "test"});

    var hubNock = nock(config.hubBaseUrl).persist();
    hubNock.get('/health')
        .reply(200, {"test": "test"});
        
}