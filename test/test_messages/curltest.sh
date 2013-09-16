#!/bin/sh

curl -iv -H "Content-Type: application/json" -X POST --data @./test_message_req_seq_node2.json http://localhost:8088/sequencenodes
