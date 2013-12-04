/* **************************************************************************
 * $Workfile:: utils.tests.js                                             $
 * *********************************************************************/ /**
 *
 * @fileoverview Contains unit tests for the uils.js
 *
 * NOTE: You will have to start the Redis server manually prior running the
 *       tests, otherwise you will get ECONNREFUSED error and the test will 
 *       fail.
 *
 * Created on       Nov 23, 2013
 * @author          Young-Suk Ahn Park
 *
 * @copyright (c) 2013 Pearson, All rights reserved.
 *
 * **************************************************************************/
//force test environment
process.env.NODE_ENV = 'test';

var utils = require('../../lib/utils.js');
var expect = require('chai').expect;

describe('Utils', function () {

    it('should return error on requestHttpDeferred to a dead server', function (done) {
        
        var method = 'POST';
        var url = 'http://baddomain.com';
        var header = {};
        var body = {data:'OK'};

        utils.requestHttpDeferred(method, url, header, body)
        .then(function(data){
            done();
        },function(err){
            expect(err).to.not.null;
            done();
        });

    });

});

