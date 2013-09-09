/**
 * Test Hapi Simple REST server with Supertest
 */

// Supertest is for HTTP testing  
var fs = require('fs'),
    ZSchema = require('z-schema'),
    expect = require('chai').expect;

function validateMessage(json, messageSchema, done) {
    var report = ZSchema.validate(json, messageSchema, function(rpt) {
        expect(rpt.valid).to.equal(true);
        //if (rpt.errors !== null)
            //console.log(rpt.errors);
        done();
    });
}


describe('Brix Message Schema Validations', function () {

    var schemaRootDir =  __dirname + '/../../schema/';
    describe('Brix IPC-IPS Messages', function () {
        var sampleRootDir =  __dirname + '/../test_messages/';

        var messageSchema = null;

        before(function () {
            // Add the test route with the handler
            messageSchema = JSON.parse(fs.readFileSync(schemaRootDir + 'message.schema.json', 'utf8'));
        });

        it('validates schema', function () {
            var zschema = new ZSchema();
            var validationResult = zschema.validateSchema(messageSchema);
            expect(validationResult.valid).to.equal(true);
        });

        it('validates answer-feedback', function (done) {
            var message = JSON.parse(fs.readFileSync(sampleRootDir + 'test_message_ans_feedback.json', 'utf8'));
            //console.log(message);
            validateMessage(message, messageSchema, done);
            //console.log (JSON.stringify(validationResult));
        });

        it('validates sequence-node request', function (done) {
            var message = JSON.parse(fs.readFileSync(sampleRootDir + 'test_message_req_seq_node.json', 'utf8'));
            validateMessage(message, messageSchema, done);
        });

        it('validates sequence-node response', function (done) {
            var message = JSON.parse(fs.readFileSync(sampleRootDir + 'test_message_resp_seq_node.json', 'utf8'));
            validateMessage(message, messageSchema, done);
        });
    });

    describe('Brix IPS-* Messages', function () {
        var sampleRootDir =  __dirname + '/../test_messages/';

        var messageSchema = null;

        before(function () {
            // Add the test route with the handler
            messageSchema = JSON.parse(fs.readFileSync(schemaRootDir + 'reqseqnode.schema.json', 'utf8'));
        });

        it('validates schema', function () {
            var zschema = new ZSchema();
            var validationResult = zschema.validateSchema(messageSchema);
            expect(validationResult.valid).to.equal(true);
        });

        it('validates AMS sequence-node request', function (done) {
            var correctReqMessage = {
                 "@context": "http://purl.org/pearson/paf/v1/ctx/core/SequenceNode",
                 "@type": "SequenceNode",
                 "nodeIndex": 1,
                 "targetBinding": "http://repo.paf.dev.pearsoncmg.com/paf-repo/resources/activities/42d2b4f4-46bd-49ee-8f06-47b4421f599b/bindings/0"
                }
            validateMessage(correctReqMessage, messageSchema, done);
        });

    });
});
