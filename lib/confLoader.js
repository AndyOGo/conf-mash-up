var cwd = process.cwd();
var fs = require('fs');
var path = require('path');
var glob = require('glob');
var complement = require('./complement');
var log = console.log;
var chalk = require('chalk');
var yargs = require('yargs');
var argv = yargs.alias('config', 'c')
    .describe('c', 'Load a config file by path - for relative paths see CWD and __dirname below')
    .alias('merge-default-config', 'm')
    .boolean('m')
    .describe('m', 'Just use this flag to merge supplied config with default config')
    .alias('ignore-default-config', 'i')
    .boolean('i')
    .describe('i', 'Just use this flag to ignore default config (no merging)')
    .epilog('Copyright 2016 Andreas Deuschlinger (MIT Licensed)')
    .help()
    .argv;

function load(options, done) {
    var config;
    var globPattern;

    // try load config by --config argument
    if(argv.config) {
        globPattern = '*(' + argv.config + '|' + cwd + argv.config + ')';

        glob(globPattern, function(err, files) {
            if(err) {
                log(chalk.red('Error: Can\'t find ' + chalk.magenta(argv.config) + '! Please make sure that your path or glob is correct.'));
                log(err);

                log(chalk.yellow('CWD: ') + chalk.magenta(process.cwd()));
                log(chalk.yellow('__dirname: ') + chalk.magenta(__dirname));

                return done(err);
            }

            if(!files || !files.length) {
                log(chalk.red('Can\'t find ' + chalk.magenta(argv.config) + '! Please make sure that your path or glob is correct.'));

                log(chalk.yellow('CWD: ') + chalk.magenta(process.cwd()));
                log(chalk.yellow('__dirname: ') + chalk.magenta(__dirname));

                return done(new Error('File not found!'));
            }

            loadCustomConfig(files, function(err, conf) {
                if(err) {
                    return done(err);
                }

                config = conf;

                loadDefaultConfig(options, config, defaultConfigDone);
            });
        })
    } else {
        loadDefaultConfig(options, config, defaultConfigDone);
    }

    // get default config by package.json name property
    function defaultConfigDone(err, defaultConfig) {

        if(err) {
            return done(err);
        }

        // if no config given -> just override with default config
        if(!config) {
            config = defaultConfig;

            // init config
            initConfig(config);
        }
        // else -> merge them
        else if (defaultConfig) {
            if(Array.isArray(config)) {
                for(var i= 0, l=config.length; i<l; i++) {
                    complement(config[i], defaultConfig, options.merger);
                }
            } else {
                complement(config, defaultConfig, options.merger);
            }
        } else {
            // init config
            initConfig(config);
        }

        done(null, config);
    }
}

function loadSync(options) {
    var config;
    var defaultConfig;
    var globPattern;

    // try load config by --config argument
    if(argv.config) {
        globPattern = '*(' + argv.config + '|' + cwd + argv.config + ')';

        try {
            var files = glob.sync(globPattern);

            if(!files || !files.length) {
                log(chalk.red('Can\'t find ' + chalk.magenta(argv.config) + '! Please make sure that your path or glob is correct.'));
                log(chalk.yellow('CWD: ') + chalk.magenta(process.cwd()));
                log(chalk.yellow('__dirname: ') + chalk.magenta(__dirname));

                process.exit(1);
            }

            config = loadCustomConfig(files);

        } catch(err) {
            log(chalk.red('Error: Can\'t find ' + chalk.magenta(argv.config) + '! Please make sure that your path or glob is correct.'));

            log(chalk.yellow('CWD: ') + chalk.magenta(process.cwd()));
            log(chalk.yellow('__dirname: ') + chalk.magenta(__dirname));

            log(err);

            process.exit(1);
        }
    }

    defaultConfig = loadDefaultConfig(options, config);

    // if no config given -> just override with default config
    if(!config) {
        config = defaultConfig;

        // init config
        initConfig(config);
    }
    // else -> merge them
    else if (defaultConfig) {
        if(Array.isArray(config)) {
            for(var i= 0, l=config.length; i<l; i++) {
                complement(config[i], defaultConfig, options.merger);
            }
        } else {
            complement(config, defaultConfig, options.merger);
        }
    } else {
        // init config
        initConfig(config);
    }

    return config;
}

module.exports = {
    load: load,
    loadSync: loadSync
};

function initConfig(config) {
    var init = settings.init;
    var keys = Object.keys(init);
    var initializer;
    var initializerType;
    var path;
    var pathKey;
    var i=0, l = keys.length;
    var j, k;
    var configObject = config;

    // loop through all initializers
    for(;i<l; i++) {
        path = keys[i];
        initializer = init[path];

        path = path.split('.');

        // traverse path to find matching property path
        // if found -> execute initializer
        for(j=0, k=path.length; j<k; j++) {
            pathKey = path[j];

            if(!(pathKey in configObject))
                break;

            if(j<k-1) {
                configObject = configObject[pathKey];
                continue;
            }

            // last run -> initialize it
            initializerType = typeof initializer;

            if(initializerType === 'function') {
                // custom initialization
                initializer(configObject);
            }
            else if(initializerType === 'string') {
                // try loading merger plugin
                try {
                    initializer = require(initializer);

                    if(typeof initializer === 'function') {
                        initializer(configObject);
                    } else {
                        initializer.init(configObject);
                    }
                } catch(e) {
                    console.log(chalk.red('FAILED loading init plugin: "') +
                        chalk.magenta(init[path.join('.')]) +
                        chalk.red('" for "') +
                        chalk.magenta(pathKey) +
                        chalk.red('"'));
                    console.log(e);
                    process.exit(1);
                }
            }
        }
    }
}

function loadCustomConfig(files, done) {
    var path;
    var hasDone = typeof done === "function";
    var configs = [];
    var config;

    for(var i= 0, l=files.length; i<l; i++) {
        try {
            path = files[i];
            config = require(path);

            configs.push(config);

            log(chalk.green('Load custom config from: ' + chalk.magenta( path )));
        } catch (e) {
            yargs.showHelp();

            log(chalk.red('Can\'t find ' + chalk.magenta(path) + '! Please make sure that your path is correct.'));

            log(chalk.yellow('CWD: ') + chalk.magenta(process.cwd()));
            log(chalk.yellow('__dirname: ') + chalk.magenta(__dirname));

            log(e);

            if(hasDone) {
                return done(e);
            } else {
                process.exit(1);
            }
        }
    }

    if(hasDone) {
        done(null, l>1 ? configs : config);
    } else {
        return l>1 ? configs : config;
    }
}

function loadDefaultConfig(options, config, done) {
    var path;
    var hasDone = typeof done === "function";
    var packageJson;
    var defaultConfig;
    var forceMerge = argv.m || (options.mergeDefaultConfig) && !argv.i;

    // get default config by package.json name property
    if(!config || forceMerge) {
        try {
            packageJson = require(cwd + options.packageJSON);

            try {
                path = cwd + packageJson.name + '.conf';
                defaultConfig = require(path);
            } catch(e) {
                log(chalk.red('You have no default config file! Expected ' + chalk.magenta(path + '.(json|js)') + ' in root directory of the package.'));
                log(e);

                // if we have a config and merge is true -> exit
                // else config is not a must
                if(config && forceMerge) {
                    if(hasDone) {
                        return done(e);
                    } else {
                        process.exit(1);
                    }
                }
            }
        } catch(e) {
            log(chalk.red('Can\'t find package.json file! No config loaded'));
            log(e);

            // if we have a config and merge is true -> exit
            // else config is not a must
            if(config && forceMerge) {
                if(hasDone) {
                    return done(e);
                } else {
                    process.exit(1);
                }
            }
        }

        log(chalk.green('Load default config from: ' + chalk.magenta( path )));
    }

    if(hasDone) {
        done(null, defaultConfig);
    } else {
        return defaultConfig;
    }
}