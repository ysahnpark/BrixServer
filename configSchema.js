var Joi = require('joi');

module.exports = {
    "numWorkers": 			Joi.Types.Number().min(1).required(),
    "maxDeadWorkerSize": 	Joi.Types.Number().required(),
    "host":                 Joi.Types.String().required(),
    "port": 				Joi.Types.Number().required(),
    "maxSockets": 			Joi.Types.Number().min(1).required(),

    "amsBaseUrl":	     	Joi.Types.String().required(),
    "amsCaching":           Joi.Types.Boolean().required(),
    "hubBaseUrl":	     	Joi.Types.String().required(),
    "bipsBaseUrl":          Joi.Types.String().required()
};