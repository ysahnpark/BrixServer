clean:
	npm cache clean && rm -rf node_modules/* coverage lib-test

install:
	make clean && npm install

update:
	make clean && rm -rf npm-shrinkwrap.json && npm install . && npm shrinkwrap

# Run test brix server. It runs with mock(nock) for the external servers:  AMS & Hub
testsvr:
	@NODE_ENV=test node ./test/testapp.js

test:
	@NODE_ENV=test ./node_modules/.bin/mocha --recursive --reporter tap --timeout 3000 test/unit
	 
test-spec:
	@NODE_ENV=test ./node_modules/.bin/mocha --recursive --reporter spec --timeout 3000 test/unit

# "Watch" mode runs your tests each time it seems a file change under the base directory.
# The 'tap' reporter seems to play nicest with this and also shows the most complete error messages.
test-w:
	@NODE_ENV=test ./node_modules/.bin/mocha --watch --recursive --reporter tap --timeout 3000 test/unit

test-cov:
	@NODE_ENV=test ./node_modules/.bin/mocha --require blanket --recursive --timeout 3000 -R travis-cov test/unit

test-cov-html:
	@NODE_ENV=test ./node_modules/.bin/mocha --require blanket --recursive --timeout 3000 -R html-cov test/unit > test/coverage.html

test-int:
	@NODE_ENV=test ./node_modules/.bin/mocha --recursive --reporter spec --timeout 3000 test/integration
	 
test-xunit:
	@NODE_ENV=test ./node_modules/.bin/mocha --recursive --reporter xunit --timeout 3000 test/unit > test-reports.log.xml
	 
test-xunit-build:
	@HOST=build ./node_modules/.bin/mocha --recursive --reporter xunit --timeout 3000 test/unit > test-reports.log.xml

.PHONY: test test-cov test-cov-html test-int