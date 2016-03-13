var defaultOptions = {
    mergeDefaultConfig: true,
    verbose: false
};
var confLoader = require('./lib/confLoader');

function mashConf(options, done) {
    var opts = Object.assign(defaultOptions, options);

    confLoader.load(opts, function (err, config) {
        if(err) {
            return done(err);
        }

        done(null, config);
    });
}

function mashConfSync(options) {
    var opts = Object.assign(defaultOptions, options);

    return confLoader.loadSync(opts);
}

module.exports = {
    mashConf: mashConf,
    mashConfSync: mashConfSync
};

