/**
 * This tests Redis
 */
var expect = require('chai').expect;
var redis = require("redis");

describe('Redis', function () {

    var KEY = '_redis_test_key_';
    var VAL = '_redis_test_val_';
    var REDIS_PORT = null;
    var REDIS_SERVER = 'localhost';

    var redisClient;

	before(function (done) {
		redisClient = redis.createClient(REDIS_PORT, REDIS_SERVER);

        // Add the test route with the handler
        // Redis error check
        redisClient.on("error", function(err) {
            console.log("Redis client initialization error. " + err);
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