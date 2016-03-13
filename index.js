var defaultOptions = {
    mergeDefaultConfig: true,
    verbose: false
};
var confLoader = require('./lib/confLoader');

function mashConf(options, done) {
    confLoader.load(options, function (err, config) {
        if(err) {
            return done(err);
        }

        done(null, config);
    });
}

function mashConfSync(options) {
    confLoader.loadSync(options);
}

module.exports = {
    mashConf: mashConf,
    mashConfSync: mashConfSync
};

