BrixServer
==========

Brix Server is a REST Service implemented on Node.js with Hapi Framework.

Initial code based on Pearson's nodejs-reference-app.

The project uses make tool. If you are using Mac, you must install Xcode first.

Directory Structure
-------------------
- lib    - Contains the application source code
  - aggregation.js - 
  - amsproxy.js    - AMS Proxy
  - controller.js  - The controller that includes the routes
  - hubproxy.js    - Hub Proxy
  - ips.js         - The IPS component
- sample - Sample Hapi application
- schema - Message validation schema
- test
  - integration   - Integration testing
  - test_messages - Messages for unit testing
  - unit          - Unit testing

Running Tests
-------------
There are two ways of running the tests:  
  `npm test`  
or  
  `make test`

Running the Application
-----------------------
To run the application:
`node app.js`.
Prior running the server, make sure that the port as defined in config.js is not in use.

Then to check: Start browser and go to URL http://localhost:8088/seqnode?seqNodeRequestParam=123
Should display  
`{"id":"123","binding":"http://binding/123"}`