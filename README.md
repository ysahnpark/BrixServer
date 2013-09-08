BrixServer
==========

Brix Server is a REST Service implemented on Node.js with Hapi Framework.

Initial code based on Pearson's nodejs-reference-app.

The project uses make tool. If you are using Mac, you must install Xcode first.

== Directory Structure ==
  lib    - Contains the application source code
  sample - Sample Hapi application
  schema - Message validation schema
  test
    integration   - Integration testing
    test_messages - Messages for unit testing
    unit          - Unit testing

== Running Tests ==
There are two ways of running the tests:
  npm test
or
  make test

== Running the Application ==
node app.js