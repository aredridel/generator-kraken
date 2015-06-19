 /*───────────────────────────────────────────────────────────────────────────*\
 │  Copyright (C) 2014 eBay Software Foundation                                │
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


var path = require('path'),
    yeoman = require('yeoman-generator'),
    prompts = require('./prompts'),
    dependencies = require('./dependencies'),
    krakenutil = require('../util'),
    pkg = require('../package.json'),
    us = require('underscore.string');

krakenutil.update();

var debug = require('debuglog')('generator-kraken');

module.exports = yeoman.generators.Base.extend({
    init: function () {
        krakenutil.banner();
    },

    prompting: {
        askAppNameEarly: function () {
            // CLI args
            this.argument('appName', { type: String, required: false });

            var next = this.async();

            // Handle setting the root early, so .yo-rc.json ends up the right place.
            this.prompt(prompts(this.config.getAll()).filter(function (e) {
                return e.name === 'appName';
            }), function (props) {
                this.appName = props.appName;
                var oldRoot = this.destinationRoot();
                if (path.basename(oldRoot) !== this.appName) {
                    this.destinationRoot(path.join(oldRoot, this.appName));
                }
                next();
            }.bind(this));
        },

        initConfig: function () {
            // CLI option defaults
            var options = this.options || {};

            this.config.defaults({
                templateModule: options.templateModule,
                componentPackager: options.componentPackager,
                cssModule: options.cssModule,
                jsModule: options.jsModule,
                taskModule: options.taskModule || 'grunt',
                i18n: options.i18n
            });
        },

        askFor: function askFor() {
            var userPrompts = prompts(this);
            var next = this.async();

            this.prompt(userPrompts, function (props) {
                for (var key in props) {
                    this.config.set(key, props[key]);
                }

                next();

            }.bind(this));
        },

        addDependencies: function () {
            this.dependencies = [];
            var conf = this.config.getAll();
            for (var k in conf) {
                var value = conf[k];
                debug("adding dependency '%s' for '%s'", conf[k], k);
                if (value && dependencies[value]) {
                    this.dependencies.push(value);
                }
            }
            this.config.save();
        }
    },

    writing: {
        subGenerators: function subGenerators() {
            this.composeWith('kraken:controller', { args: [ 'index' ] });
            if (this.config.get('templateModule')) {
                this.composeWith('kraken:layout', { args: [ 'layouts/master' ] });
            } else {
                debug("not generating layout");
            }
        },

        files: function app() {
            this.fs.copyTpl(
                this.templatePath('common/**'),
                this.destinationPath(),
                this._getModel()
            );

            this.fs.copyTpl(
                this.templatePath('common/.*'),
                this.destinationPath(),
                this._getModel()
            );

            var deps = this._dependencyResolver('templates');

            var gen = this;

            deps.forEach(function (glob) {
                var parts = glob.split('/');
                var firstWildcard = parts.map(function (e) {
                    return /[*]/.test(e);
                }).indexOf(true);

                debug("copying '%s' to '%s'", path.join('dependencies', glob), parts.slice(1, firstWildcard).join('/') || '.');
                // We assume that each glob given to us includes one path
                // element to strip off.
                gen.fs.copyTpl(
                    gen.templatePath(path.join('dependencies', glob)),
                    gen.destinationPath(parts.slice(1, firstWildcard).join('/') || '.'),
                    gen._getModel()
                );
            });
        }
    },

    install: {
        deps: function() {
            if (this.options['skip-install']) {
                return;
            }
            this.installDependencies({
                skipMessage: true
            });
        },

        installNpm: function installNpm() {
            if (this.options['skip-install-npm']) {
                return;
            }

            var dependencies = this._dependencyResolver('npm');
            if (dependencies) {
                this.npmInstall(dependencies, { save: true });
            }
        },

        installNpmDev: function installNpmDev() {
            if (this.options['skip-install-npm']) {
                return;
            }

            var dependencies = this._dependencyResolver('npmDev');

            if (dependencies) {
                this.npmInstall(dependencies, { saveDev: true });
            }
        },

        installBower: function installBower() {
            if (this.options['skip-install-bower']) {
                return;
            }

            var dependencies = this._dependencyResolver('bower');

            if (dependencies) {
                this.bowerInstall(dependencies, { save: true });
            }
        }
    },

    _getTasks: function getTasks() {
        if (!this.tasks) {
            this.tasks = ['jshint'];
            var add = this._dependencyResolver('tasks');
            if (add) {
                this.tasks = this.tasks.concat(add);
            }

            this.tasks.push('copyto');
        }
        return this.tasks;
    },

    _getModel: function getModel() {
        var model = {
            us: us,
            pkg: pkg,
            tasks: this._getTasks()
        };

        var conf = this.config.getAll();
        for (var k in conf) {
            model[k] = conf[k];
        }

        return model;
    },

    /**
     * Resolves named dependencies from the prompt options
     */
    _dependencyResolver: function dependencyResolver(type) {
        debug("resolving dependencies of type '%s'", type);
        var result = [];
        var options = this.config.getAll();

        this.dependencies.forEach(function (x) {
            var value = x && dependencies[x] && dependencies[x][type];

            if (typeof value === 'function') {
                debug("function, looking up");
                value = value(options);
            }

            debug("resolving got %j for dependency '%s'", value, x);
            if (value) {
                result = result.concat(value);
            }
        });

        debug("resolved dependencies of type '%s' to %j", type, result);

        return result.length ? result : null;
    }

});
