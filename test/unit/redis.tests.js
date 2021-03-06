/**
 * This tests Redis
 */

//force test environment
process.env.NODE_ENV = 'test';

var os = require("os");
var expect = require('chai').expect;
var redis = require("redis");
var config = require('config');

var utils = require('../../lib/utils');

describe('Redis', function () {

    var KEY = '_redis_test_key_';
    var VAL = '_redis_test_val_(from: ' + os.hostname() + ')';
    var REDIS_PORT = null;
    var REDIS_SERVER = 'localhost';

    var redisClient;

	before(function (done) {
		redisClient = utils.getRedisClient(config);

        // Add the test route with the handler
        // Redis error check
        redisClient.on("error", function(err) {
            //console.log("Redis client initialization error. " + err);
        });
        done();
    });

	// Notice that we are using done parameter for asynchronous test.
    it('should correctly set, get and delete', function (done) {
		// Retrieving from Cache
        try {
            redisClient.set(KEY, VAL, function(err, reply) {
                expect(err).to.equal(null);

                redisClient.get(KEY, function(err, reply) {
                    expect(err).to.equal(null);
                    expect(reply).to.equal(VAL);

                    redisClient.del(KEY, function(err, reply) {
                        expect(err).to.equal(null);

                        done();
                    });
                });

            });
        } catch (e) {
            done(e);
        }

    });
});
