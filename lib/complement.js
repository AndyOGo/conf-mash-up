var chalk = require('chalk');

module.exports = complement;

/**
 * Assigns own enumerable properties of source objects to the destination object.
 * Source objects are applied from left to right. Subsequent sources don't overwrite
 * property assignments of previous sources, hence the destination object is complemented.
 *
 * **Note:** This modifies the original `object`.
 *
 * **Note:** This is very useful if you have default options which you want to be complemented by custom options.
 *
 * @function
 * @private
 * @param {object} object - The object to be complement.
 * @param {object} source - Used to complement object
 * @param {MergerHash} [merger={}] - Used for custom merge rules by property path.
 * @returns {object} Returns complemented `object`.
 * @example
 *
 * var default = { greeting: 'hello', punctuation: '!'};
 *
 * complement( { greeting: 'hi' }, default);
 * => { greeting: 'hi', punctuation: '!'};
 * */
function complement(object, source, merger) {
    var args = Array.prototype.slice.call(arguments, 1);
    var i, l = args.length;

    var props, key, itemObject, itemSource;
    var j, k;

    var stack = [];
    var stackLength = stack.length;
    var plate;
    var path = [];
    var pathKey;
    var mergerType;
    var mergePlugin;

    merger = merger || {};

    for(i=0; i<l; i++) {
        source = args[i];

        props = Object.keys(source);
        k = props.length;

        for(j=0; j<k; j++) {
            key = props[j];
            path.push(key);
            itemObject = object[key];
            itemSource = source[key];

            if(!(key in object)) {
                object[key] = itemSource;
            } else if(isPlainObject(itemObject) && isPlainObject(itemSource)) {

                pathKey = path.join('.');
                mergerType = typeof merger[pathKey];


                if(mergerType === 'function') {
                    // custom merging
                    merger[pathKey](object, source);
                }
                else if(mergerType === 'string') {
                    // try loading merger plugin
                    try {
                        mergePlugin = require(merger[pathKey]);

                        if(typeof mergePlugin === 'function') {
                            mergePlugin(object, source);
                        } else {
                            mergePlugin.merger(object, source);
                        }
                    } catch(e) {
                        console.log(chalk.red('FAILED loading merger plugin: "') +
                            chalk.magenta(merger[pathKey]) +
                            chalk.red('" for "') +
                            chalk.magenta(pathKey) +
                            chalk.red('"'));
                        console.log(e);
                        process.exit(1);
                    }
                }
                else {

                    // push to stack
                    stack.push({
                        j: j,
                        k: k,
                        props: props,
                        object: object,
                        source: source
                    });
                    ++stackLength;

                    props = Object.keys(itemSource);
                    k = props.length;
                    j = -1;

                    object = itemObject;
                    source = itemSource;

                    continue;
                }
            }

            // make sure to pop stack back if end of current stack
            while(j === k-1 && stackLength) {
                plate = stack.pop();
                --stackLength;

                props = plate.props;
                k = plate.k;
                j = plate.j;

                path.pop();

                object = plate.object;
                source = plate.source;
            }

            path.pop();
        }
    }

    return object;
}

/**
 * @private
 * cache natives prototypes */
var ObjectProto = Object.prototype;
var FunctionProto = Function.prototype;

/**
 * @private
 * cache Object.prototype.toString utilized to archive reliable cross-window/frame type checking */
var toString = ObjectProto.toString;

/**
 * @private
 * Used to resolve the decompiled source of functions. */
var funcToString = FunctionProto.toString;

/**
 * @private
 * Used to infer the `Object` constructor. */
var objectCtorString = funcToString.call(Object);

function isPlainObject(value) {
    if (!value || !isObjectLike(value) || toString.call(value) !== '[object Object]' || isArguments(value)) {
        return false;
    }
    var proto = ObjectProto;
    // make sure that constructor is not messed up
    if (typeof value.constructor === 'function' && value instanceof value.constructor) {
        proto = Object.getPrototypeOf(value);
    }
    if (proto === null) {
        return true;
    }
    var Ctor = proto.constructor;
    return (typeof Ctor === 'function'
    && Ctor instanceof Ctor
    && funcToString.call(Ctor) === objectCtorString);
}

function isObjectLike(value) {
    return !!value && typeof value === 'object';
}

function isArguments(value) {
    return !!value && toString.call(value) === '[object Arguments]';
}