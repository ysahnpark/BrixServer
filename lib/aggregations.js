var async = require('async');
var config = require('config');

// Load in the app dependencies
var amsproxy = require('./amsproxy');

module.exports = function() {
    var ams = new amsproxy.AmsProxy();

    this.getHealth = function(callback) {
        /*  Sample async parallel call
        * uses the awesome async module https://github.com/caolan/async#parallel
        * In parallel:
        Load health route for dragnet from http://dragnet.ecollege.net/aemonitor
        Load health route for seqNodeProvider-api from http://dragnet.ecollege.net/aemonitor
        Load health route for hub from http://dragnet.ecollege.net/aemonitor
        Returns: Object with the response body and status code of each service call
        */
        async.parallel({
            amsHealth : function (cb) {
                ams.getHealth(cb);
            },
            /*
            hubHealth : function (cb) {
                hub.getHealth(cb);
            }*/
        },
        // check error if you care about handling errors here or let it bubble up
        // results is an object with seqNodeProviderHealth, hubHealth and dragnetHealth properties
        // containing the response body of each call
        function (error, results) {
            callback(error, results);
        });
    };

};