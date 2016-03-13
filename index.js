var defaultOptions = {
    packageJSON: '/package.json',
    mergeDefaultConfig: true,
    verbose: false
};
var confLoader = require('./lib/confLoader');

function mashConf(options, done) {
    var opts = Object.assign(defaultOptions, options);

    confLoader.load(opts, function (err, configs) {
        if(err) {
            return done(err);
        }

        console.log(configs);

        done(null, configs);
    });
}

function mashConfSync(options) {
    var opts = Object.assign(defaultOptions, options);
    var configs = confLoader.loadSync(opts);

    console.log(configs);

    return configs;
}

module.exports = {
    mashConf: mashConf,
    mashConfSync: mashConfSync
};

