// This module is responsible for managing the hub calls
var request = require('request');

module.exports = function(config) {
	
	if(!config) {
		throw new Error('No config was supplied');
	}
	else if(!config.hubBaseUrl) {
		throw new Error('Config is missing hubBaseUrl');
	}
	var logger = config.logger || function(){};
	
	// URL:  https://hub.pearsonopenclass.com/api/health
	this.getHealth = function(callback) {
		var url = config.hubBaseUrl + '/health';
		var options = {
			uri:url,
			json:true
		};
		request.get(options, function (error,response,body) {
			if (error != null) {
				var errorBody ={};
				errorBody.statusCode = 500;
				errorBody.error = error;
				logger('error', 'Unable to GET ' + url, error);
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

