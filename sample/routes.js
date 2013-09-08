var Types = require('hapi').types;
var redis = require("redis"),
    redisClient = redis.createClient();

// Redis error check
redisClient.on("error", function(err) {
	console.log("Error" + err);
});

module.exports = [
    { method: 'GET', path: '/seqnode/{nodeId}/target/{targetId}', config: { handler: getSequenceNode } },
    { method: 'GET', path: '/seqnode/{nodeId}', config: { handler: getSequenceNode } },
    { method: 'POST', path: '/seqnode/{nodeId}/action', config: { handler: postAction } },
    { method: 'POST', path: '/seqnode/{nodeId}/answer', config: { handler: postAnswer } },
];

/**
 * Creates the message conforming to the message.schema.json.
 *
 * @param 
 */
function createMessage(session, type, body) 
{
    var timestamp = (new Date()).toISOString();
    var message = {
        session: sesion,
        timestamp: timestamp,
        type: type,
        body: body
    };
    return message;
}

function getSequenceNode(request) 
{

	var seqNodeId = request.params.nodeId;
    var targetId = request.params.targetId;

    // Retrieving from Cache
	redisClient.get(seqNodeId, function(err, reply){
		var seqNode = null;
		if (reply === null) {
			console.log("Sequence " + seqNodeId + " not found. Caching one.");

            // @todo: obtain Sequence Node from either AMS or PAF Hub 
			seqNode = {
				id: seqNodeId,
				binding: "http://binding/" + seqNodeId
			};
			redisClient.set(seqNodeId, JSON.stringify(seqNode));
		} else {
			seqNode = JSON.parse(reply);
			console.log("Sequence " + seqNodeId + " retrieved.");
		}

        // @todo: Sanitize and return the sequence node content
	    request.reply(seqNode).type("application/json");;

	});
}

function postAction(request) 
{
    // If we are not sending token ID, then the token ID must be obtained from
    // the sessionId

    // @todo: Parse action message
    // Log message
    request.reply("OK").type("application/json");
}

function postAnswer(request) 
{
    // If we are not sending token ID, then the token ID must be obtained from
    // the sessionId

    // @todo: Parse answer submission message
    // Invoke the Correctness Engine

    var resultNode = {score: 1};
    var resultBody = createMessage("ABC", "answer-feedback", resultNode);

    request.reply(resultBody).type("application/json");;
}

