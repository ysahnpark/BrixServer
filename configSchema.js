var Joi = require('joi');

module.exports = {
    "numWorkers":           Joi.Types.Number().min(1).required(),
    "maxDeadWorkerSize":    Joi.Types.Number().required(),
    "host":                 Joi.Types.String().required(),
    "port":                 Joi.Types.Number().required(),
    "maxSockets":           Joi.Types.Number().min(1).required(),

    "redisHost":            Joi.Types.String(),
    "redisPort":            Joi.Types.String(),
    "cacheAllowFlush":      Joi.Types.Boolean().optional(),

    "amsBaseUrl":           Joi.Types.String().required(),
    "amsSubmissionPath":    Joi.Types.String().required(),
    "hubBaseUrl":           Joi.Types.String().required(),
    "bipsBaseUrl":          Joi.Types.String().required(),
    "ceBaseUrl":            Joi.Types.String().required(),

    "logLevel":             Joi.Types.String().optional(),
    "logToScreen":          Joi.Types.Boolean().optional(),
    "logToFile":            Joi.Types.Boolean().optional(),
    "logDir":               Joi.types.String().optional(),
    "logAllowWebAccess":    Joi.types.Boolean().optional(),

    "brixClientBuildAccess":Joi.Types.Boolean().optional(),
    "brixClientBuildDir":   Joi.Types.String().required(),

    "imgDir":               Joi.Types.String().required(),
    "imgBaseUrl":           Joi.Types.String().required()
};
