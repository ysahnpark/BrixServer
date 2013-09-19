BrixServer
==========

Brix Server is a REST Service implemented on Node.js with Hapi Framework.

Initial code based on Pearson's nodejs-reference-app.

The project uses make tool. If you are using Mac, you must install Xcode first.

Directory Structure
-------------------
- lib    - Contains the application source code
  - aggregation.js - 
  - sequencenodeprovider.js    - The component that provides sequence node (from either AMS or Hub)
  - controller.js  - The controller that includes the routes
  - hubproxy.js    - Hub Proxy
  - ips.js         - The IPS component
  - utils.js       - File that contains utility functions
- sample - Sample REST server application using Hapi and Redis 
- schema - Message validation schema
- test
  - integration   - Integration testing
  - test_messages - Messages for unit testing
  - unit          - Unit testing

Running Tests
-------------
There are two ways of running the tests:  
  'npm test'  
or  
  'make test'

Running 'make test-w' will run tests in "watch" mode, with the directory files will be watched for
file changes and tests re-run.  This is useful during development.

Running the Application
-----------------------
Redis must be running for the application to be started.  Locally, redis can be started using:
'redis-server'.

To run the application:
'node app.js'.
Prior running the server, make sure that the port as defined in config.js is not in use.

Alternately, in development, nodemon can be used to run the application, watch files under the
main directory, and restart the server after every change.  This is useful during development.
'./bin/nm app.js'

Then to check: Start browser and go to URL http://localhost:8088/seqnode?seqNodeRequestParam=123
Should display  
`{"id":"123","binding":"http://binding/123"}`