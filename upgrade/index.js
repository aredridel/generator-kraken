/*───────────────────────────────────────────────────────────────────────────*\
│  Copyright (C) 2015 eBay Software Foundation                                │
│                                                                             │
│hh ,'""`.                                                                    │
│  / _  _ \  Licensed under the Apache License, Version 2.0 (the "License");  │
│  |(@)(@)|  you may not use this file except in compliance with the License. │
│  )  __  (  You may obtain a copy of the License at                          │
│ /,'))((`.\                                                                  │
│(( ((  )) ))    http://www.apache.org/licenses/LICENSE-2.0                   │
│ `\ `)(' /'                                                                  │
│                                                                             │
│   Unless required by applicable law or agreed to in writing, software       │
│   distributed under the License is distributed on an "AS IS" BASIS,         │
│   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.  │
│   See the License for the specific language governing permissions and       │
│   limitations under the License.                                            │
\*───────────────────────────────────────────────────────────────────────────*/
'use strict';

var yeoman = require('yeoman-generator');
var upgrader2 = require('kraken-upgrader-2');
var findup = require('findup');

module.exports = yeoman.generators.Base.extend({
    init: function () {
        if (!this.config.existed) {
            this.destinationRoot(findup.sync(this.destinationRoot(), 'package.json'));
        }
    },
    prompting: {
        checkForDisabledMiddleware: function () {
            var done = this.async();

            var gen = this;
            upgrader2(this.destinationRoot(), function (err, results) {
                if (err) {
                    return done(err);
                } else {
                    if (results.length) {
                        gen.log("Steps needed:");
                        results.forEach(function (l) {
                            gen.log(l);
                        });
                    }
                    done();
                }
            });
        },
        maybeContinue: function () {
            var done = this.async();
            this.prompt([{
                message: 'Install the new kraken-js dependencies?',
                type: 'confirm',
                name: 'continue'
            }], function (answers) {
                if (answers.continue) {
                    done();
                } else {
                    done("declined to continue");
                }
            });
        }

    },
    install: function files() {
        this.npmInstall([
            "kraken-js@^2.0.0-rc.1"
        ], { save: true });
    }
});

