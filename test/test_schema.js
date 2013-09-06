/**
 * Test Hapi Simple REST server with Supertest
 */

// Supertest is for HTTP testing  
var fs = require('fs'),
    ZSchema = require('z-schema'),
    expect = require('chai').expect;

function validateSchema(json, messageSchema, done) {
    var report = ZSchema.validate(json, messageSchema, function(rpt) {
        expect(rpt.valid).to.equal(true);

        done();
    });
}


describe('Brix Remote Message Schema', function () {

    // Create a server with a host and port
    var messageSchema = null;

    before(function () {
        // Add the test route with the handler
        messageSchema = JSON.parse(fs.readFileSync(__dirname + '/../schema/message.schema.json', 'utf8'));
    });

    it('validates schema', function () {
        var zschema = new ZSchema();
        var validationResult = zschema.validateSchema(messageSchema);
        expect(validationResult.valid).to.equal(true);
    });

    it('validates answer-feedback', function (done) {
        var message = JSON.parse(fs.readFileSync(__dirname + '/test_json_messages/test_message_ans_feedback.json', 'utf8'));
        //console.log(message);
        validateSchema(message, messageSchema, done);
        //console.log (JSON.stringify(validationResult));
    });

    it('validates sequence-node request', function (done) {
        var message = JSON.parse(fs.readFileSync(__dirname + '/test_json_messages/test_message_req_seq_node.json', 'utf8'));
        validateSchema(message, messageSchema, done);
    });

    it('validates sequence-node response', function (done) {
        var message = JSON.parse(fs.readFileSync(__dirname + '/test_json_messages/test_message_resp_seq_node.json', 'utf8'));
        validateSchema(message, messageSchema, done);
    });

});
