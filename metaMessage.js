const { SSL_OP_LEGACY_SERVER_CONNECT } = require('constants');
const path = require('path');
const settings = require(path.join(__dirname,'settings'));


const LOG_TYPE = {'ALWAYS':{Code:'A', Color:'\x1b[35m'}, 'INFO':{Code:'I', Color:'\x1b[32m'}, 'VERBOSE':{Code:'V', Color:'\x1b[36m'}, 'WARNING':{Code:'W', Color:'\x1b[35m'}, 'ERROR':{Code:'E', Color:'\x1b[31m'}, 'FATAL':{Code:'F', Color:'\x1b[41m'}, 'HUH':{Code:'A', Color:'\x1b[5m'}}
const LOG_LEVEL = {'QUIET':[LOG_TYPE.ALWAYS], 
                    'FATAL':[LOG_TYPE.ALWAYS, LOG_TYPE.HUH, LOG_TYPE.FATAL],
                    'ERROR':[LOG_TYPE.ALWAYS, LOG_TYPE.HUH, LOG_TYPE.FATAL, LOG_TYPE.ERROR],
                    'WARNING':[LOG_TYPE.ALWAYS, LOG_TYPE.HUH, LOG_TYPE.FATAL, LOG_TYPE.ERROR, LOG_TYPE.WARNING],
                    'INFO': [LOG_TYPE.ALWAYS, LOG_TYPE.HUH, LOG_TYPE.FATAL, LOG_TYPE.ERROR, LOG_TYPE.WARNING, LOG_TYPE.INFO],
                    'VERBOSE': [LOG_TYPE.ALWAYS, LOG_TYPE.HUH, LOG_TYPE.FATAL, LOG_TYPE.ERROR, LOG_TYPE.WARNING, LOG_TYPE.INFO, LOG_TYPE.VERBOSE]}

//Initialise Severity Level;
var mySeverity = null;
var myComponents = [];
if (mySeverity == null) {
    if (settings.LogSeverity) { mySeverity = LOG_LEVEL[settings.LogSeverity]; } // Did the user override this setting during runtime?
    else mySeverity == LOG_LEVEL.QUIET;
}
function initialiseLogSeverity(sever) { mySeverity = LOG_LEVEL[sever];}
function initialiseLogComponents(comp) { myComponents = comp;}

function metaMessage(message) {
    try {
        if (mySeverity && myComponents) {
            if (mySeverity.includes(message.type) && (myComponents.length == 0 || myComponents.includes(message.component))) {// Do we need to log this?

                console.log('\x1b[4m', (new Date()).toLocaleString() + "\x1b[0m \x1b[36m\x1b[7m" + (message.deviceId ? message.deviceId : "no deviceId") + "\x1b[0m - " + message.component + "\x1b[0m: ", message.type.Color, (typeof message.content == 'object' ? "JSON Object":message.content), '\x1b[0m');
                if (typeof message.content == 'object') { console.log('\x1b[0m\x1b[2m', message.content, '\x1b[0m') };
                if (Array.isArray(message.content)) { console.log('\x1b[0m\x1b[2m', JSON.stringify(message.content), '\x1b[0m') };
            }
        }
    }
    catch (err) {
        console.log("Error while generating the message, you may have used a too complex structure");
        console.log(err);
    }
}
exports.metaMessage = metaMessage;
exports.LOG_TYPE = LOG_TYPE;
exports.LOG_LEVEL = LOG_LEVEL;
exports.initialiseLogSeverity = initialiseLogSeverity;
exports.initialiseLogComponents = initialiseLogComponents;