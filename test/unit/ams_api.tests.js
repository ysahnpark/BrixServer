/**
 * Test Hapi Simple REST server with Supertest
 */

// Supertest is for HTTP testing  
var fs = require('fs'),
    nock = require('nock'),
    AmsProxy = require('../../lib/amsproxy.js'),
    expect = require('chai').expect;


var seqNodeBody = {
        "guid": "course1::a8bbad4b-73e6-4713-a00c-ae9b938e1aa5::user1::http%3A%2F%2Frepo.paf.dev.pearsoncmg.com%2Fpaf-repo%2Fresources%2Factivities%2F42d2b4f4-46bd-49ee-8f06-47b4421f599b%2Fbindings%2F0",
        "player": {
            "guid": null,
            "contentType": "application/vnd.pearson.qti.v2p1.asi+xml",
            "widgetFrontend": null,
            "toolProxy": null,
            "frameFrontend": {
                "guid": null,
                "frameURI": "placeholder"
            },
            "preprocessor": null,
            "postprocessor": null,
            "@context": null,
            "@id": null,
            "@type": null
        },
        "startTime": 1376949443403,
        "nodeIndex": 1,
        "targetActivityXML": "PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiIHN0YW5kYWxvbmU9InllcyI/Pjxhc3Nlc3NtZW50SXRlbSB4bWxucz0iaHR0cDovL3d3dy5pbXNnbG9iYWwub3JnL3hzZC9pbXNxdGlfdjJwMSIgeG1sbnM6bnMyPSJodHRwOi8vd3d3LnczLm9yZy8yMDAxL1hJbmNsdWRlIiB4bWxuczpuczM9Imh0dHA6Ly93d3cuaW1zZ2xvYmFsLm9yZy94c2QvaW1zbGlwX3YxcDAiIHRpdGxlPSJNQSAxLjEwLjMiIGFkYXB0aXZlPSJmYWxzZSIgdGltZURlcGVuZGVudD0iZmFsc2UiPjxyZXNwb25zZURlY2xhcmF0aW9uIGlkZW50aWZpZXI9IlJFU1BPTlNFIiBjYXJkaW5hbGl0eT0ic2luZ2xlIiBiYXNlVHlwZT0iaWRlbnRpZmllciI+PGNvcnJlY3RSZXNwb25zZT48dmFsdWU+NDwvdmFsdWU+PC9jb3JyZWN0UmVzcG9uc2U+PC9yZXNwb25zZURlY2xhcmF0aW9uPjxpdGVtQm9keT48Y2hvaWNlSW50ZXJhY3Rpb24gc2h1ZmZsZT0iZmFsc2UiIG1heENob2ljZXM9IjEiIHJlc3BvbnNlSWRlbnRpZmllcj0iUkVTUE9OU0UiPjxwcm9tcHQ+VGhlIHRleHQgb2YgJmx0O0kmZ3Q7VGhlIFNlY3JldCZsdDsvSSZndDsgaXMgcXVvdGVkIGluIHRoZSB2aWRlbyBhcyBzYXlpbmcgdGhhdCB3aGVuIHlvdSB0aGluayBvZiB0aGUgdGhpbmdzIHRoYXQgeW91IHdhbnQsIGFuZCB5b3UgZm9jdXMgb24gdGhlbSB3aXRoIGFsbCB5b3VyIGF0dGVudGlvbiwgeW91IHdpbGwgZ2V0IHdoYXQgeW91IHdhbnQsIGV2ZXJ5IHRpbWUuIFRoZSBhdXRob3IncyB0ZXJtIGZvciB0aGlzIGlkZWEgb2YgYnJpbmdpbmcgdGhpbmdzIGludG8geW91ciBsaWZlIGlzICZxdW90O19fX19fLiZxdW90OzwvcHJvbXB0PjxzaW1wbGVDaG9pY2UgaWRlbnRpZmllcj0iMSI+cHJpbmNpcGxlIG9mIHNlY3JlY3k8L3NpbXBsZUNob2ljZT48c2ltcGxlQ2hvaWNlIGlkZW50aWZpZXI9IjIiPnJ1bGUgb2YgdGhlIHVuY29uc2Npb3VzPC9zaW1wbGVDaG9pY2U+PHNpbXBsZUNob2ljZSBpZGVudGlmaWVyPSIzIj50aGVvcnkgb2YgbWluZDwvc2ltcGxlQ2hvaWNlPjxzaW1wbGVDaG9pY2UgaWRlbnRpZmllcj0iNCI+bGF3IG9mIGF0dHJhY3Rpb248L3NpbXBsZUNob2ljZT48L2Nob2ljZUludGVyYWN0aW9uPjwvaXRlbUJvZHk+PC9hc3Nlc3NtZW50SXRlbT4=",
        "targetActivity": "<ActivityConfigJson here>",
        "aggregateResult": {
            "guid": null,
            "attempt": null,
            "correctOnFirstTry": null,
            "incorrectSubmissionCount": null,
            "numLearningAidsUsed": null,
            "activityBinding": null,
            "startTime": 1376949443403,
            "duration": null,
            "score": null,
            "numAttempts": null,
            "endTime": null
        },
        "prevNode": null,
        "targetBinding": null,
        "parentSequence": {
            "guid": null,
            "user": null,
            "learningContext": "urn:udson:pearson.com/sms/prod:course/jsmith38271",
            "overallActivity": "OverallActiviy, DO we need it?",
            "@context": null,
            "@id": "/paf-hub/resources/sequences/course1::a8bbad4b-73e6-4713-a00c-ae9b938e1aa5::user1",
            "@type": null
        },
        "resultCollection": "http://hub.paf.dev.pearsoncmg.com/paf-hub/resources/sequences/course1::a8bbad4b-73e6-4713-a00c-ae9b938e1aa5::user1/nodes/1/results",
        "endTime": null,
        "@context": "http://purl.org/pearson/paf/v1/ctx/core/SequenceNode",
        "@id": "http://hub.paf.dev.pearsoncmg.com/paf-hub/resources/sequences/course1::a8bbad4b-73e6-4713-a00c-ae9b938e1aa5::user1/nodes/1",
        "@type": "SequenceNode",
        "nodeResult": []
    };

function testReqNode(amsProxy, reqParam, expectError, expectBody, done) {
    amsProxy.getSequenceNode(reqParam, function(error, body) {
        
        if (expectError !== null) {
            expect(error).to.equal(expectError);
        } else {
            expect(error).to.equal(null);
        }
        if (expectBody !== null) {
            expect(JSON.stringify(body)).to.equal(expectBody);
        }


        done();
    });
}


describe('IPS->AMS API Test', function () {

    // Create a server with a host and port
    var correctReqMessage = {
         "@context": "http://purl.org/pearson/paf/v1/ctx/core/SequenceNode",
         "@type": "SequenceNode",
         "nodeIndex": 1,
         "targetBinding": "http://repo.paf.dev.pearsoncmg.com/paf-repo/resources/activities/42d2b4f4-46bd-49ee-8f06-47b4421f599b/bindings/0"
        }

    var incorrectReqMessage_wrongType = {
         "@context": "http://purl.org/pearson/paf/v1/ctx/core/SequenceNode",
         "@type": "SequenceNude",
         "nodeIndex": "1",
         "targetBinding": "http://repo.paf.dev.pearsoncmg.com/paf-repo/resources/activities/42d2b4f4-46bd-49ee-8f06-47b4421f599b/bindings/0"
        }
    var incorrectReqMessage_emptyContext = {
         "@context": "",
         "@type": "SequenceNude",
         "nodeIndex": "1",
         "targetBinding": "http://repo.paf.dev.pearsoncmg.com/paf-repo/resources/activities/42d2b4f4-46bd-49ee-8f06-47b4421f599b/bindings/0"
        }
    var incorrectReqMessage_missingType = {
         "@context": "http://purl.org/pearson/paf/v1/ctx/core/SequenceNode",
         "nodeIndex": "1",
         "targetBinding": "http://repo.paf.dev.pearsoncmg.com/paf-repo/resources/activities/42d2b4f4-46bd-49ee-8f06-47b4421f599b/bindings/0"
        }
    var incorrectReqMessage_missingBinding = {
         "@context": "http://purl.org/pearson/paf/v1/ctx/core/SequenceNode",
         "@type": "SequenceNude",
         "nodeIndex": "1",
         }

    var amsProxy = null;
    var config = getConfig();
    var inputValidationErrorMsg = "Input validation error";
    before(function () {
        //Arrange
        amsProxy = new AmsProxy(config);
    });

    it('returns the SequenceNode', function (done) {
        setupNocks(config);
        var strMessage = JSON.stringify(correctReqMessage);
        testReqNode(amsProxy, strMessage, null, null, done);
    });

    it('returns error at wrong type', function (done) {
        // No need to setupNocks because the validation will fail and there will be no HTTP request at all
        var strMessage = JSON.stringify(incorrectReqMessage_wrongType);
        testReqNode(amsProxy, strMessage, inputValidationErrorMsg, null, done);
    });

    it('returns error at empty context', function (done) {
        var strMessage = JSON.stringify(incorrectReqMessage_emptyContext);
        testReqNode(amsProxy, strMessage, inputValidationErrorMsg, null, done);
    });  

    it('returns error at missing type', function (done) {
        var strMessage = JSON.stringify(incorrectReqMessage_missingType);
        testReqNode(amsProxy, strMessage, inputValidationErrorMsg, null, done);
    });  

    it('returns error at missing binding', function (done) {
        var strMessage = JSON.stringify(incorrectReqMessage_missingBinding);
        testReqNode(amsProxy, strMessage, inputValidationErrorMsg, null, done);
    });  
});

function setupNocks(config) {
    
    var amsNock = nock(config.amsBaseUrl);
    amsNock.post('/seqnode')
        .reply(200, JSON.stringify(seqNodeBody));
        
}

function getConfig() {
    return {
        "amsBaseUrl": "http://localhost",
        "hubBaseUrl": "http://localhost"
    };
}