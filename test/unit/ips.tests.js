/* **************************************************************************
 * $Workfile:: ips.tests.js                                             $
 * *********************************************************************/ /**
 *
 * @fileoverview Contains unit tests for ips.js
 *
 *
 * Created on       Sept 12, 2013
 * @author          Seann Ives
 *
 * @copyright (c) 2013 Pearson, All rights reserved.
 *
 * **************************************************************************/

var Ips = require('../../lib/ips.js'),
    nock = require('nock'),
    expect = require('chai').expect;


describe('IPS General Message Handling Test', function() {
    var ips = null;
    var config = getConfig();

    before(function () {
        var ips = new Ips(config);
    });

    it('returns error: Bad Hub-Session', function (done) {
        done();
    });
    it('returns error: Empty Request Body', function (done) {
        done();
    });
    it('returns error: SequenceNodeKey Not Found', function (done) {
        done();
    });
});

describe('IPS retrieveSequenceNode Test', function () {
    var ips = null;
    var config = getConfig();

    before(function () {
        var ips = new Ips(config);
    });

    it('returns the Sanitized SequenceNode', function (done) {
        done();
    });
});

/**
 * Returns a config object with only those fields used in this test. 
 */
function getConfig() {
    return {
        "amsBaseUrl": "http://localhost",
    };
}