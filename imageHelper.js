//LOGGING SETUP AND WRAPPING
//Disable the NEEO library console warning.
const { metaMessage, LOG_TYPE } = require("./metaMessage");
console.error = console.info = console.debug = console.warn = console.trace = console.dir = console.dirxml = console.group = console.groupEnd = console.time = console.timeEnd = console.assert = console.profile = function() {};
function metaLog(message) {
  let initMessage = { component:'imageHelper', type:LOG_TYPE.INFO, content:'', deviceId: null };
  let myMessage = {...initMessage, ...message}
  return metaMessage (myMessage);
} 

const MQTT = 'mqtt';
const path = require('path');
const settings = require(path.join(__dirname,'settings'));

class imageHelper {
  constructor(deviceId, name, variableListened, controller) {
    this.name = name;
    this.deviceId = deviceId;
    this.variableListened = variableListened;
    this.value = '';
    this.controller = controller;
    var self = this;
    this.get = function (deviceId) {
      return new Promise(function (resolve, reject) {
        resolve(self.value);
      })
    }; 

    this.update = function (deviceId, theValue) {
      return new Promise(function (resolve, reject) {
        if (self.value != theValue) {
          self.value = theValue;
          self.controller.sendComponentUpdate({ uniqueDeviceId: deviceId, component: self.name, value: self.value})
            .catch((err) => { metaLog({type:LOG_TYPE.ERROR, content:err, deviceId:deviceId})});
        }
        resolve();
      });
    };

    this.set = function (deviceId, theValue) {
      return new Promise(function (resolve, reject) {
        metaLog({type:LOG_TYPE.VERBOSE, content:"set to perform : new value : " + theValue + " component " + controller.name, deviceId:deviceId});
        if (self.value != theValue) {
          self.value = theValue;
          controller.commandProcessor("{\"topic\":\"" + settings.mqtt_topic + controller.name + "/" + deviceId + "/image/" + self.name + "\",\"message\":\"" + theValue + "\", \"options\":\"{\\\"retain\\\":true}\"}", MQTT, deviceId)
          controller.sendComponentUpdate({ uniqueDeviceId: deviceId, component: self.name, value: String(theValue)})
          .then((result) => {metaLog({type:LOG_TYPE.VERBOSE, content:"set performed : new value : " + theValue + " component " + controller.name + "/" + self.name + " - " + JSON.stringify(result), deviceId:deviceId})})
          .catch((err) => {metaLog({type:LOG_TYPE.ERROR, content:err, deviceId:deviceId}); reject(err); });
          controller.vault.writeVariable(variableListened, theValue, deviceId);
        }
       resolve();
      });
    };

    this.initialise = function (deviceId) {
      metaLog({type:LOG_TYPE.VERBOSE, content:"Initialise imageHelper", deviceId:deviceId})
      self.controller.vault.addObserver(self.variableListened, self.update, deviceId, self.name);
    }
  }
}
exports.imageHelper = imageHelper;
