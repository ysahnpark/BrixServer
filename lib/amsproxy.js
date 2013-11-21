// This module is responsible for managing the hub calls
var request = require('request');
var config = require('config');
var utils = require('./utils');

module.exports.AmsProxy = function() {
    
    var logger = utils.getLogger(config, 'amsproxy');


    /**
     * As per October 2013, agreed with SanVan core team that this submission and interaction
     * will use same endpoint.
     * This method was left just in case until IPS->AMS API is stabilized.
     * 
     * Sends student interaction (e.g. changing the value in input field) to the hub.
     * @param  {Object}   param     Contains hubSession, timestamp, type, and body fields
     * @param  {Function} callback  Callback function when this async operation is completed
     *                              First argument is error (if any), second argument is the
     *                              result data
     * @return {None}
     */
    this.sendInteraction = function (param, callback)
    {
        throw new Error("You should invoke sendSubmission() method instead.");
        // @todo check the URL of the interaction
        var url = param.url ? param.url : config.hubBaseUrl + '/interactions';

        var reqHeader = {
            "Hub-Session": param.hubSession, 
            "Content-Type": "application/vnd.pearson.paf.v1.nodeprocess+json"
        };

        utils.requestHttpDeferred('POST', url, reqHeader, param.body)
            .then(function(data){
                // @todo: confirm that the business error is returned in error field
                if (data.error === undefined)
                {
                    callback(null, data);
                }
                else
                {
                    callback(data.error, data);
                }
            }, function(error) {
                var errorBody ={};
                errorBody.statusCode = 500;
                errorBody.error = error;
                logger.error('Unable to POST ' + url, error);
                callback(error, errorBody);
            });
    };

    /**
     * Sends Assessment submission to the hub.
     * @param  {Object}   param     Contains hubSession, timestamp, type, and body fields
     * @param  {Function} callback  Callback function when this async operation is completed
     *                              First argument is error (if any), second argument is the
     *                              result data
     * @return {[type]}
     */
    this.sendSubmission = function(param, callback)
    {
        // @todo check the URL of the submission
        var url = param.url ? param.url : config.hubBaseUrl + '/submissions';

        var reqHeader = {
            "Hub-Session": param.hubSession,
            "Content-Type": "application/vnd.pearson.paf.v1.nodeprocess+json"
        };
//console.log("---param.body:" + JSON.stringify(param));
        utils.requestHttpDeferred('POST', url, reqHeader, param.body)
            .then(function(data){
                // @todo: confirm that the business error is returned in error field
                if (data.error === undefined)
                {
                    callback(null, data);
                }
                else
                {
                    callback(data.error, data);
                }
                
            }, function(error) {
                var errorBody ={};
                errorBody.statusCode = 500;
                errorBody.error = error;
                logger.error('Unable to POST ' + url, error);
                callback(error, errorBody);
            });
    };
    
    // URL:  https://hub.pearsonopenclass.com/api/health
    this.getHealth = function(callback)
    {
        var url = config.hubBaseUrl + '/health';
        var options = {
            uri:url,
            json:true
        };
        request.get(options, function (error,response,body) {
            if (error !== null) {
                var errorBody = {};
                errorBody.statusCode = 500;
                errorBody.error = error;
                logger.error('Unable to GET ' + url, error);
                callback(error,errorBody);
            }
            else {
                body.statusCode = response.statusCode;
                // pass the response body and error back to the callback
                callback(error,body);
            }
        });
    };
};

