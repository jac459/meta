//"use strict";
const path = require('path');
const settings = require(path.join(__dirname,'settings'));
const neeoapi = require("neeo-sdk");
const metacontrol = require(path.join(__dirname,'metaController'));

//Discovery tools
var mdns = require('multicast-dns')()
const find = require('local-devices');
var discoveryBuffer = __dirname + '/resultsDiscovery.json'

const fs = require('fs');
var activatedModule = path.join(__dirname,'activated');
if (settings.drivers[0].variables.ActivatedLib) {activatedModule = settings.drivers[0].variables.ActivatedLib;}
const BUTTONHIDE = '__';
const DATASTOREEXTENSION = 'DataStore.json';
const DEFAULT = 'default'; //NEEO SDK deviceId default value for devices
const mqtt = require('mqtt');
const { metaMessage, LOG_TYPE, initialiseLogComponents, initialiseLogSeverity } = require("./metaMessage");

config = [{brainip : '', brainport : ''}];
function returnBrainIp() { return config.brainip;}
var brainDiscovered = false;
var brainConsoleGivenIP = undefined;
var driverTable = [];
var localDevices = [];
exports.localDevices = localDevices;
exports.neeoBrainIp = returnBrainIp;
var mqttClient;
var driversCache = [];

//LOGGING SETUP AND WRAPPING
//Disable the NEEO library console warning.
console.error = console.info = console.debug = console.warn = console.trace = console.dir = console.dirxml = console.group = console.groupEnd = console.time = console.timeEnd = console.assert = console.profile = function() {};
function metaLog(message) {
  let initMessage = { component:'meta', type:LOG_TYPE.INFO, content:'', deviceId: null };
  let myMessage = {...initMessage, ...message}
  return metaMessage (myMessage);
} 

function networkDiscovery() {
  fs.readFile(discoveryBuffer, (err, data) => {
    if (err) { 
      metaLog({type:LOG_TYPE.INFO, content:'No discovery file, starting to discover now.'});
      }
    else {
      if (data && (data != '')) {
        metaLog({type:LOG_TYPE.INFO, content:'Discovery buffer loaded, scanning changes now'});
        let savedDevices = JSON.parse(data);
        savedDevices.forEach((dev) => {localDevices.push(dev);})
      }
    }

    //Unleaching discovery
    //Mac addresses.
    find().then(devices => {
      devices.forEach((newDevice) => {
        if (localDevices.findIndex((device)=>{return device.name == newDevice.name})<0) {
          localDevices.push({"name":newDevice.name,"ip":newDevice.ip,"mac":newDevice.mac, "short":undefined})
          metaLog({type:LOG_TYPE.INFO, content:"New device discovered on the network with name " + newDevice.name + ". Please wait 10 min (from driver start) for full discovery and caching in your disk."});
        }
      });
    });

    //multicast-dns
    let delayWrite = undefined; //Timer to avoid writting too much on the drive.
    mdns.on('response', function(response) {
      let myObjectPTR, myObjectIP, myObjectMac;
      let myName, myShortName, myIP, myMAC, myPort = undefined
      if (response.additionals) {
        myObjectPTR = response.additionals.find((answer) => {return answer.type == 'PTR'});
        if (myObjectPTR && myObjectPTR.data) {
          myName = myName?myName:myObjectPTR.data; 
        };
        if (myObjectPTR && myObjectPTR.name) {
          myShortName = myShortName?myShortName:myObjectPTR.name; 
        };
        myObjectPTR = response.additionals.find((answer) => {return (answer.type == 'SRV')});
          if (myObjectPTR && myObjectPTR.data) {
            myPort = myPort?myPort:myObjectPTR.data.port; 
          };
          if (myObjectPTR && myObjectPTR.name) {
            myShortName = myShortName?myShortName:myObjectPTR.name; 
          };
        myObjectIP = response.additionals.find((answer) => {return answer.type == 'A'});
          if (myObjectIP && myObjectIP.data) {myIP = myObjectIP.data};
          myObjectMac = response.additionals.find((answer) => {return answer.type == 'AAA'});
          if (myObjectMac && myObjectMac.data) {myMac = myObjectMac.data};
      }  
      if (response.authorities) {
        myObjectPTR = response.authorities.find((answer) => {return answer.type == 'PTR'});
          if (myObjectPTR && myObjectPTR.data) {
            myName = myName?myName:myObjectPTR.data; 
          };
          if (myObjectPTR && myObjectPTR.name) {
            myShortName = myShortName?myShortName:myObjectPTR.name; 
          };
        myObjectPTR = response.authorities.find((answer) => {return (answer.type == 'SRV')});
          if (myObjectPTR && myObjectPTR.data) {
            myPort = myPort?myPort:myObjectPTR.data.port; 
          };
          if (myObjectPTR && myObjectPTR.name) {
            myShortName = myShortName?myShortName:myObjectPTR.name; 
          };
        myObjectIP = response.authorities.find((answer) => {return answer.type == 'A'});
          if (myObjectIP && myObjectIP.data) {myIP = myObjectIP.data};
          myObjectMac = response.authorities.find((answer) => {return answer.type == 'AAA'});
          if (myObjectMac && myObjectMac.data) {myMac = myObjectMac.data};
        }
      if (response.answers) {
        myObjectPTR = response.answers.find((answer) => {return (answer.type == 'PTR')});
          if (myObjectPTR && myObjectPTR.data) {
            myName = myName?myName:myObjectPTR.data; 
          };
          if (myObjectPTR && myObjectPTR.name) {
            myShortName = myShortName?myShortName:myObjectPTR.name; 
          };
        myObjectPTR = response.answers.find((answer) => {return (answer.type == 'SRV')});
          if (myObjectPTR && myObjectPTR.data) {
            myPort = myPort?myPort:myObjectPTR.data.port; 
          };
          if (myObjectPTR && myObjectPTR.name) {
            myShortName = myShortName?myShortName:myObjectPTR.name; 
          };
        myObjectIP = response.answers.find((answer) => {return answer.type == 'A'});
          if (myObjectIP && myObjectIP.data) {myIP = myObjectIP.data};
          myObjectMac = response.answers.find((answer) => {return answer.type == 'AAA'});
          if (myObjectMac && myObjectMac.data) {myMac = myObjectMac.data};
        }
      
      if (localDevices.findIndex((device)=>{return (device.name == myName && device.ip == myIP&& device.port == myPort)})<0) {
        localDevices.push({"name":myName,"ip":myIP,"mac":myMAC, "short":myShortName, "port":myPort});
        if (delayWrite == undefined) {//In order to be gentle on storage.
          delayWrite = setTimeout(() => {
            fs.writeFile(discoveryBuffer, JSON.stringify(localDevices), err => {
              if (err) {
                metaLog({type:LOG_TYPE.ERROR, content:"Error writing the discovery file. " + err});
                } else {
                  metaLog({type:LOG_TYPE.WARNING, content:"Discovery updated"});
                }
            })
            delayWrite = undefined;
          }, 10000);
        }
      }
    })

    setTimeout(() => {
      metaLog({type:LOG_TYPE.INFO, content:"stopping discovery process."});
      mdns.destroy();
    }, 3600000);
  }) 
  return null;
}

function getConfig() {
  return new Promise(function (resolve, reject) {
    fs.readFile(__dirname + '/config.js', (err, data) => {
      if (err) { 
        metaLog({type:LOG_TYPE.ERROR, content:'No config file, the initial setup will be launched'});
        resolve(null);
        }
      else {
        if (data && (data != '')) {
          config = JSON.parse(data);
          resolve(config);
        }
        else {
          resolve (config);}
      }
    }) 
  })
}
        
function getHelper (HelpTable, prop, deviceId) {
  return HelpTable[HelpTable.findIndex((item) => { return (item.name==prop && item.deviceId==deviceId) })];
}

function getIndividualActivatedDrivers(files, driverList, driverIterator) {
  return new Promise(function (resolve, reject) {
    if (files) {
      if (driverIterator < files.length) {
        if (!files[driverIterator].endsWith(DATASTOREEXTENSION)){ //To separate from datastore
          metaLog({content:'Activating drivers: ' + files[driverIterator]});
          fs.readFile(path.join(activatedModule,files[driverIterator]), (err, data) => {
            if (data) {
              try {
                const driver = JSON.parse(data);
                driver.filename = files[driverIterator];
                if (driver.template) { //persisted variables management
                  driver.template.filename = files[driverIterator];
                }
                driverList.push(driver);
              }
              catch (err) {
                metaLog({type:LOG_TYPE.ERROR, content:' Parsing driver : ' + files[driverIterator]});
                metaLog({type:LOG_TYPE.ERROR, content:err});
              }
            }
            if (err) {
              metaLog({type:LOG_TYPE.ERROR, content:' Loading the driver file : ' + files[driverIterator]});
              metaLog({type:LOG_TYPE.ERROR, content:err});
          }
            resolve(getIndividualActivatedDrivers(files, driverList, driverIterator+1));
          })
        }
        else {resolve(getIndividualActivatedDrivers(files, driverList, driverIterator+1));}
      } 
      else { 
        resolve(driverList)
       }
    }
    else {resolve([])
    }
  })
}

function getActivatedDrivers() {
  return new Promise(function (resolve, reject) {
    metaLog({type:LOG_TYPE.VERBOSE, content:'Searching drivers in : ' + activatedModule});
    fs.readdir(activatedModule, (err, files) => {
      metaLog({content:'drivers found'});
      var driverList = [];
      getIndividualActivatedDrivers(files, driverList,0).then((list) => {
        resolve(list);
      })
    })
  })
}

function getDataStorePath(filename) {
  try {
    if (filename) {
      return path.join(activatedModule, filename.split('.json')[0] + '-DataStore.json');
    }
    else {return null;}
  }
  catch (err) {
    metaLog({type:LOG_TYPE.ERROR, content:'your path (' + filename + ') given seems to be wrong :'});
    metaLog({type:LOG_TYPE.ERROR, content:err});
  }
}

function createDevices () {
  return new Promise(function (resolve, reject) {
    getActivatedDrivers().then((drivers) => {
      drivers = drivers.concat(settings.drivers);
      const driverCreationTable = [];
      drivers.forEach((driver) => {
        driverCreationTable.push(executeDriverCreation(driver))
      })
      Promise.all(driverCreationTable).then((driverTab) => {
        driverTable = driverTab;
        resolve(driverTab);
      })
    })
  })
}

function discoveredDriverListBuilder(inputRawDriverList, outputPreparedDriverList, indent, controller, targetDeviceId, driver) {
  return new Promise (function (resolve, reject) {
    //targetDeviceId = undefined; //void the logic and force creation of all devices.
    if (indent < inputRawDriverList.length) {
      if (inputRawDriverList[indent].dynamicname && inputRawDriverList[indent].dynamicname != "") {
        if (targetDeviceId == undefined || targetDeviceId == inputRawDriverList[indent].dynamicid)
        {
          inputRawDriverList[indent].name = driver.name;
          inputRawDriverList[indent].type = driver.type;
          inputRawDriverList[indent].version = driver.version;
          inputRawDriverList[indent].manufacturer = driver.manufacturer;
          inputRawDriverList[indent].icon = driver.icon;
          inputRawDriverList[indent].alwayson = driver.alwayson;
          executeDriverCreation(inputRawDriverList[indent], controller, inputRawDriverList[indent].dynamicid).then((builtdevice) => {
            builtdevice.addCapability("dynamicDevice");
            const discoveredDevice = {
              id:inputRawDriverList[indent].dynamicid,
              name:inputRawDriverList[indent].dynamicname,
              reachable:true,
              device : builtdevice
            }
            outputPreparedDriverList.push(discoveredDevice);
            driverTable.push(builtdevice);
            if (targetDeviceId == undefined) {//initial creation of the driver, need the full list to be returned
              resolve(discoveredDriverListBuilder(inputRawDriverList, outputPreparedDriverList, indent+1, controller, targetDeviceId, driver));
            }
            else {//on the spot creation of a specific driver, we leave after creation.
              resolve(outputPreparedDriverList);
            }

          })
          
        }//all these else to ensure proper timely construction and not a resolve before end of creation.
        else {
          resolve(discoveredDriverListBuilder(inputRawDriverList, outputPreparedDriverList, indent+1, controller, targetDeviceId, driver));
        }
      }
      else {
        resolve(discoveredDriverListBuilder(inputRawDriverList, outputPreparedDriverList, indent+1, controller, targetDeviceId, driver));
      }
    }
    else {
      resolve (outputPreparedDriverList);
    }
  })
}

function instanciationHelper(controller, givenResult, jsonDriver) {
  jsonDriver = JSON.stringify(jsonDriver);
  let slicedDriver = jsonDriver.split("DYNAMIK_INST_START ");
  let recontructedDriver = slicedDriver[0];
  for (let index = 1; index < slicedDriver.length; index++) {
    //TODO Correct ugly hack suppressing the escape of quote..
    let tempoResult = slicedDriver[index].split(" DYNAMIK_INST_END")[0].replace(/\\/g, "");
    //let tempoResult = slicedDriver[index].split(" DYNAMIK_INST_END")[0];
    tempoResult = controller.vault.readVariables(tempoResult, DEFAULT);
    tempoResult = controller.assignTo("$Result", tempoResult, givenResult);
    recontructedDriver = recontructedDriver + tempoResult;
    recontructedDriver = recontructedDriver + slicedDriver[index].split(" DYNAMIK_INST_END")[1];
  }
  metaLog({type:LOG_TYPE.VERBOSE, content:'Driver has been reconstructed.'});
  metaLog({type:LOG_TYPE.VERBOSE, content:recontructedDriver});

  return JSON.parse(controller.vault.readVariables(recontructedDriver, DEFAULT));
}

function prepareCommand(controller, commandArray, deviceId, index) {
  return new Promise(function (resolve, reject) {
    
    if (commandArray && commandArray.length>index) {
      controller.actionManager(deviceId, commandArray[index].type, commandArray[index].command, commandArray[index].queryresult, commandArray[index].evaldo, commandArray[index].evalwrite)
      .then(()=>{
        resolve(prepareCommand(controller, commandArray, deviceId, index+1));
      })
    }
    else {
      resolve()}
  })
}

function discoveryDriverPreparator(controller, driver, deviceId) {
  return new Promise(function (resolve, reject) {
    try {                  
      if (driver.discover) {
            controller.vault.retrieveValueFromDataStore("ToInitiate","default").then((ToInitiate)=>{
              if (ToInitiate == undefined) {ToInitiate = true;}
              metaLog({deviceId: deviceId, type:LOG_TYPE.INFO, content:"ToInitiate " + ToInitiate});
              prepareCommand(controller, driver.discover.initcommandset, deviceId, ToInitiate?0:(driver.discover.initcommandset?driver.discover.initcommandset.length:0)).then(()=> {
              let instanciationTable = [];
              metaLog({deviceId: deviceId, type:LOG_TYPE.INFO, content:"Driver Discovery preparation."});
                controller.initiateProcessor(driver.discover.command.type).then(() => {
                  controller.commandProcessor(driver.discover.command.command, driver.discover.command.type, deviceId).then((result)=>{
                      controller.queryProcessor(result, driver.discover.command.queryresult, driver.discover.command.type, deviceId).then((result) => {
                      if (driver.discover.command.evalwrite) {controller.evalWrite(driver.discover.command.evalwrite, result, deviceId)};
                          metaLog({deviceId: deviceId, type:LOG_TYPE.VERBOSE, content:'discovery Driver Preparation, query result'});
                          metaLog({deviceId: deviceId, type:LOG_TYPE.VERBOSE, content:result});
                      if (!Array.isArray(result)) {
                        let tempo = [];
                        tempo.push(result);
                        result = tempo;
                      }
                      result.forEach(element => {
                        driverInstance = instanciationHelper(controller, element, driver.template);
                        instanciationTable.push(driverInstance);
                      });
                      resolve(instanciationTable)
                    })
                  })
                })
                
              })
          })
          .catch((err) => {
            metaLog({type:LOG_TYPE.ERROR, content:'Driver has no ToInitiate Persisted Variable.'});
            metaLog({type:LOG_TYPE.ERROR, content:err});
          })
      }
      else {
        resolve();
      }
    }
    catch (error) {
      metaLog({type:LOG_TYPE.ERROR, content:'Couldn\'t construct the driver.'});
      metaLog({type:LOG_TYPE.ERROR, content:error});
    }
  })
}

function getRegistrationCode(controller, credentials, driver, deviceId){
  return new Promise(function (resolve, reject) {
    controller.vault.addVariable("RegistrationCode", credentials.securityCode, deviceId, true)
    registerDevice(controller, driver, deviceId).then((result)=>{
      if (result) {
        resolve(true);
      }
      else {
        resolve(false)
      }
    })
  })
}

function registerDevice(controller, driver, deviceId) {
  return new Promise(function (resolve, reject) {
    controller.actionManager(DEFAULT, driver.register.registrationcommand.type, driver.register.registrationcommand.command, 
                          driver.register.registrationcommand.queryresult, '', driver.register.registrationcommand.evalwrite)
    .then((result) => {
      metaLog({deviceId: deviceId, type:LOG_TYPE.FATAL, content:'Result of the registration command: '});
      metaLog({deviceId: deviceId, type:LOG_TYPE.VERBOSE, content:result});

      controller.reInitVariablesValues(deviceId);
      controller.reInitConnectionsValues(deviceId);
      controller.vault.snapshotDataStore();
      if (controller.vault.getValue("IsRegistered", deviceId)) {
        metaLog({deviceId: deviceId, type:LOG_TYPE.INFO, content:"Registration success"});
        resolve(true);
      }
      else {
        metaLog({deviceId: deviceId, type:LOG_TYPE.WARNING, content:'Registration Failure'});
        resolve(false);
      }
    })
  })
}

function isDeviceRegistered(controller, driver, deviceId) {
  return new Promise(function (resolve, reject) {
    let retValue = controller.vault.getValue("IsRegistered", deviceId);
    metaLog({deviceId: deviceId, type:LOG_TYPE.VERBOSE, content:'is registered ? : ' + retValue});
    if (retValue) {resolve(retValue);}
    else {
      registerDevice(controller, driver, deviceId).then((result)=>{
        metaLog({deviceId: deviceId, type:LOG_TYPE.VERBOSE, content:'the result of the registration process is '+result});
        if (result) {
          resolve(true);
        }
        else {
          resolve(false)
        }
      })
    }
  })
}

function createController(hubController, driver) {//Discovery specific
  if (hubController) {//We are inside a discovered item no new controller to be created.
    return hubController;
  }
  else {//normal device, controller to be created.
    const controller = new metacontrol(driver);
    return controller;
  }
}

function assignControllers(controller, driver, deviceId) {
  for (var prop in driver.buttons) { // Dynamic creation of all buttons
    if (Object.prototype.hasOwnProperty.call(driver.buttons, prop)) {
      controller.addButton(deviceId, prop, driver.buttons[prop])
    }
  } 

  for (var prop in driver.images) { // Dynamic creation of all images
    if (Object.prototype.hasOwnProperty.call(driver.images, prop)) {
      controller.addImageHelper(deviceId, prop, driver.images[prop].listen)
    }
  }

  for (var prop in driver.labels) { // Dynamic creation of all labels
    if (Object.prototype.hasOwnProperty.call(driver.labels, prop)) {
      controller.addLabelHelper(deviceId, prop, driver.labels[prop].listen, driver.labels[prop].actionlisten)
    }
  }

  for (var prop in driver.sensors) { // Dynamic creation of all sensors
    if (Object.prototype.hasOwnProperty.call(driver.sensors, prop)) {
      controller.addSensorHelper(deviceId, prop, driver.sensors[prop].listen)
    }
  }

  for (var prop in driver.switches) { // Dynamic creation of all sliders
    if (Object.prototype.hasOwnProperty.call(driver.switches, prop)) {
      controller.addSwitchHelper(deviceId, prop, driver.switches[prop].listen, driver.switches[prop].evaldo);
    }
  }

  for (var prop in driver.sliders) { // Dynamic creation of all sliders
    if (Object.prototype.hasOwnProperty.call(driver.sliders, prop)) {
      controller.addSliderHelper(deviceId, driver.sliders[prop].listen, driver.sliders[prop].evaldo, prop);
    }
  }

  for (var prop in driver.directories) { // Dynamic creation of directories
    if (Object.prototype.hasOwnProperty.call(driver.directories, prop)) {
      const theHelper = controller.addDirectoryHelper(deviceId, prop);
      for (var feed in driver.directories[prop].feeders) {
        let feedConfig = {"name":feed, 
                          "label":driver.directories[prop].feeders[feed].label, 
                          "commandset":driver.directories[prop].feeders[feed].commandset, 
                        };
        theHelper.addFeederHelper(feedConfig);
      }
    }
  }

}


function executeDriverCreation (driver, hubController, passedDeviceId) { 
    return new Promise(function (resolve, reject) {
    //driverTable.length = 0; //Reset the table without cleaning the previous reference (to avoid destructing other devices when running Discovery).
      let deviceId = passedDeviceId ? passedDeviceId : DEFAULT; //to add the deviceId of the real discovered device in the Helpers

      let controller = createController(hubController, driver);
      metaLog({deviceId: deviceId, type:LOG_TYPE.INFO, content:'creating the driver: ' + deviceId + " with controller: " + controller.name});

      //TODO check if this is still usefull
      //if (hubController) {controller.assignDiscoverHubController(hubController)}; //if the device is a discovered device.
      const theDevice = neeoapi.buildDevice(".meta2 " + driver.name) 
      theDevice.setType(driver.type); 
      theDevice.setDriverVersion(driver.version);
      theDevice.setManufacturer(driver.manufacturer);
      if (driver.icon) {
        theDevice.setIcon(driver.icon)
      }
      if (driver.alwayson) {
        theDevice.addCapability("alwaysOn");
      }
      if (theDevice.supportsTiming()) {theDevice.defineTiming({ powerOnDelayMs: 200, sourceSwitchDelayMs: 50, shutdownDelayMs: 100 })};
        
       //CREATING VARIABLES
       for (var prop in driver.variables) { // Initialisation of the variables
        if (Object.prototype.hasOwnProperty.call(driver.variables, prop)) {
          controller.vault.addVariable(prop, driver.variables[prop], deviceId)
        }
      }

      if (driver.persistedvariables){
        for (var prop in driver.persistedvariables) { // Initialisation of the variables to be persisted
          if (Object.prototype.hasOwnProperty.call(driver.persistedvariables, prop)) {
            controller.vault.addVariable(prop, driver.persistedvariables[prop], deviceId, true);
          }
        }
      }

      controller.vault.initialiseVault(getDataStorePath(driver.filename)).then(() => {//Retrieve the value form the vault

      //CREATING CONTROLLERS
      assignControllers(controller, driver, deviceId);


      //GET ALL CONNECTIONS
      if (driver.webSocket) {
        controller.addConnection({"name":"webSocket", "descriptor":driver.webSocket, "connector":"", "deviceId":deviceId})
      }
      if (driver.socketIO) {
        controller.addConnection({"name":"socketIO", "descriptor":driver.socketIO, "connector":"", "deviceId":deviceId})
      }
      if (driver.jsontcp) {
        controller.addConnection({"name":"jsontcp", "descriptor":driver.jsontcp, "connector":"", "deviceId":deviceId})
      }
      if (settings.mqtt) {
        metaLog({deviceId: deviceId, type:LOG_TYPE.INFO, content:'Creating the connection MQTT'});
        controller.addConnection({"name":"mqtt", "descriptor":settings.mqtt, "connector":mqttClient, "deviceId":deviceId})//early loading
      }
      if (driver.repl) {
        controller.addConnection({"name":"repl", "descriptor":driver.repl, "connector":"", "deviceId":deviceId})
      }
    
      //Registration
      if (driver.register) {
        theDevice.enableRegistration(
        {
          type: 'SECURITY_CODE',
          headerText: driver.register.registerheadertext,
          description: driver.register.registerdescription,
        },
        {
          register: (credentials) => getRegistrationCode(controller, credentials, driver, deviceId),
          isRegistered: () => {return new Promise(function (resolve, reject) {isDeviceRegistered(controller, driver, deviceId).then((res)=>{resolve(res)})})},
        })
      }

      //DISCOVERY  
      if (driver.discover) {
        metaLog({deviceId: deviceId, type:LOG_TYPE.WARNING, content:'Creating discovery process for ' + controller.name});
        theDevice.enableDiscovery(
          {
            headerText: driver.discover.welcomeheadertext,
            description: driver.discover.welcomedescription,
            enableDynamicDeviceBuilder: true,
          },
          
          (targetDeviceId) => {
            return new Promise(function (resolve, reject) {
              const formatedTable = [];
              metaLog({deviceId: deviceId, type:LOG_TYPE.INFO, content:'Discovering this device:'});
              metaLog({deviceId: deviceId, type:LOG_TYPE.INFO, content:targetDeviceId});
              if (targetDeviceId) {
                let ind = controller.discoveredDevices.findIndex(dev => {return dev.id == targetDeviceId});
                if (ind>=0) {
                  metaLog({deviceId: deviceId, type:LOG_TYPE.INFO, content:"DRIVER CACHE USED"});
                  formatedTable.push(controller.discoveredDevices[ind]);
                  resolve(formatedTable); 
                  return;
                }
              }
              discoveryDriverPreparator(controller, driver, deviceId).then((driverList) => {
                discoveredDriverListBuilder(driverList, formatedTable, 0, controller, targetDeviceId, driver).then((outputTable) => {
                  outputTable.forEach(output => {if (controller.discoveredDevices.findIndex(dev => {dev.id == output.id})<0) {controller.discoveredDevices.push(output)}});
                  resolve(outputTable); 
                })
              })
            })
          }
        )
      }

      controller.reInitConnectionsValues(deviceId);
      
      //CREATING LISTENERS
      for (var prop in driver.listeners) { // Initialisation of the variables
        if (Object.prototype.hasOwnProperty.call(driver.listeners, prop)) {

          controller.addListener({
              name : prop, 
              deviceId: deviceId,
              isHub: driver.listeners[prop].isHub,
              interested: [],
              interestedAndUsing: [],              
              type : driver.listeners[prop].type,
              command : driver.listeners[prop].command,
              timer : "", //prepare the listener to save the timer here.
              pooltime : driver.listeners[prop].pooltime,
              poolduration : driver.listeners[prop].poolduration,
              queryresult : driver.listeners[prop].queryresult,
              evalwrite : driver.listeners[prop].evalwrite,
              evaldo : driver.listeners[prop].evaldo
            })
        }
      }
      
        //CREATING INDIVIDUAL SHORTCUTS

        for (var prop in driver.buttons) { // Dynamic creation of all buttons
          if (Object.prototype.hasOwnProperty.call(driver.buttons, prop)) {
            if (theDevice.buttons.findIndex((item) => {return (item.param.name == prop)})<0) {//not button of same name (in case included in a widget)
              if (!prop.startsWith(BUTTONHIDE)){ //If the button doesnt need to be hidden.
                theDevice.addButton({name: prop, label: (driver.buttons[prop].label == '') ? (prop) : (driver.buttons[prop].label)})
              }
            }
          }
        }

        for (var prop in driver.images) { // Dynamic creation of all images
          if (Object.prototype.hasOwnProperty.call(driver.images, prop)) {
            if (theDevice.imageUrls.findIndex((item) => {return (item.param.name == prop)})<0) {//not image of same name (in case included in a widget)
              const helperI = getHelper(controller.imageH, prop, deviceId);
              theDevice.addImageUrl({name: prop, label: (driver.images[prop].label == '') ? (prop) : (driver.images[prop].label),
                    size : driver.images[prop].size},
              (theDeviceId) => helperI.get(theDeviceId))
            }
          }
        }

        for (var prop in driver.labels) { // Dynamic creation of all labels
          if (Object.prototype.hasOwnProperty.call(driver.labels, prop)) {
            if (theDevice.textLabels.findIndex((item) => {return (item.param.name == prop)})<0) {//not item of same name (in case included in a widget)
              const helperL = getHelper(controller.labelH, prop, deviceId);
              theDevice.addTextLabel({name: prop, label: (driver.labels[prop].label == '') ? (prop) : (driver.labels[prop].label)},
              helperL.get);
            }
          }
        }

        for (var prop in driver.sensors) { // Dynamic creation of all sensors
          if (Object.prototype.hasOwnProperty.call(driver.sensors, prop)) {
            if (theDevice.sensors.findIndex((item) => {return (item.param.name == prop)})<0) {//not item of same name (in case included in a widget)
              const helperSe = getHelper(controller.sensorH, prop, deviceId);
              theDevice.addSensor({name: prop, label: (driver.sensors[prop].label == '') ? (prop) : (driver.sensors[prop].label),
              type:driver.sensors[prop].type},
              {
                getter: helperSe.get
              });
            }
          }
        }

        for (var prop in driver.switches) { // Dynamic creation of all switches
          if (Object.prototype.hasOwnProperty.call(driver.switches, prop)) {
            if (theDevice.switches.findIndex((item) => {return (item.param.name == prop)})<0) {//not item of same name (in case included in a widget)
            const helperSw = getHelper(controller.switchH, prop, deviceId);
            theDevice.addSwitch({
              name: prop, 
              label: (driver.switches[prop].label == '') ? (prop) : (driver.switches[prop].label),
            },
            {
              setter: helperSw.set, getter: helperSw.get
            })
          }
        }
      }

        for (var prop in driver.sliders) { // Dynamic creation of all sliders
          if (Object.prototype.hasOwnProperty.call(driver.sliders, prop)) {
            if (theDevice.sliders.findIndex((item) => {return (item.param.name == prop)})<0) {//not slider of same name (in case included in a widget)
              const helperS = getHelper(controller.sliderH, prop, deviceId);
              theDevice.addSlider({
                name: prop, 
                label: (driver.sliders[prop].label == '') ? (prop) : (driver.sliders[prop].label),
                range: [0,100], unit: driver.sliders[prop].unit 
              },
              {
                setter: helperS.set, getter: helperS.get
              })
            }
          }
        }

        for (var prop in driver.directories) { // Dynamic creation of directories
          if (Object.prototype.hasOwnProperty.call(driver.directories, prop)) {
            if (theDevice.directories.findIndex((item) => {return (item.param.name == prop)})<0) {//not directory of same name (in case included in a widget)
              const helperD = getHelper(controller.directoryH, prop, deviceId);
              theDevice.addDirectory({
                name: prop, 
                label: (driver.directories[prop].label == '') ? (prop) : (driver.directories[prop].label),
              }, helperD.browse)
            }
          }
        }

        theDevice.addButtonHandler((name, theDeviceId) => {controller.onButtonPressed(name, theDeviceId)})
        theDevice.registerSubscriptionFunction((updateCallback) => {controller.sendComponentUpdate = updateCallback});
        theDevice.registerInitialiseFunction((theDeviceId) => {controller.initialise(theDeviceId)});
        theDevice.registerDeviceSubscriptionHandler(
          {
            deviceAdded: (theDeviceId) => {
                metaLog({deviceId: theDeviceId, type:LOG_TYPE.VERBOSE, content:'device added'});
                controller.dynamicallyAssignSubscription(theDeviceId,false);
            },
            deviceRemoved: (theDeviceId) => {
              metaLog({deviceId: theDeviceId, type:LOG_TYPE.VERBOSE, content:'device removed'});
            },
            initializeDeviceList: (theDeviceIds) => {
              metaLog({deviceId: "theDeviceIds", type:LOG_TYPE.VERBOSE, content:"INITIALIZED DEVICES:" + theDeviceIds});
            },
          }
        )
        metaLog({deviceId: deviceId, type:LOG_TYPE.INFO, content:"Device " + driver.name + " has been created."});
        enableMQTT(controller, deviceId);
        resolve(theDevice);
      });
  })
}

//DISCOVERING BRAIN
        
function discoverBrain() {
  return new Promise(function (resolve, reject) {
    metaLog({type:LOG_TYPE.INFO, content:"Trying to discover a NEEO Brain..."});
 
    brainDiscovered = true;
    neeoapi.discoverOneBrain()
      .then((brain) => {
        metaLog({type:LOG_TYPE.INFO, content:"Brain Discovered at IP : " + brain.iparray.toString()});
        config.brainip = brain.iparray.toString();
         resolve();
      })
      .catch ((err) => {
        metaLog({type:LOG_TYPE.FATAL, content:"Brain couldn't be discovered using the neeo-sdk framework." + err});
        metaLog({type:LOG_TYPE.FATAL, content:"Now trying using .meta internal discovery." + err});
        setTimeout(() => {
          let ind =  localDevices.findIndex((device) => {return device.short == '_neeo._tcp.local'});

          if (ind < 0) {//second chance
            ind = localDevices.findIndex((device) => {
              if (device.name) {
                  return (device.name.startsWith("neeo-") || device.name.startsWith("NEEO-"))
                }
              });
            }
          if (ind >= 0) {
            config.brainip = localDevices[ind].ip;
            metaLog({type:LOG_TYPE.WARNING, content:"The discovery seems to be a success. Brain found at " + config.brainip});
            resolve();
          }
          metaLog({type:LOG_TYPE.FATAL, content:".meta internal discovery didn't find the neeo brain, check the connection." + err});
        }, 2000);  
      
      })
    })
}

function setupNeeo(forceDiscovery) {
  return new Promise(function (resolve, reject) {
    if (forceDiscovery) {
      discoverBrain().then(() => {
        runNeeo();
      })
    }
    else if (brainConsoleGivenIP)  { 
      config.brainip = brainConsoleGivenIP;
      metaLog({type:LOG_TYPE.INFO, content:"Using brain-IP from CommandLine: " + brainConsoleGivenIP});
      runNeeo();
    }
   else
    if (!config.brainip || config.brainip == ''){
        discoverBrain().then(() => {
          runNeeo();
        })
    }
    else {
      runNeeo();
    }
    resolve();
  })
}

function runNeeo () {
  return new Promise(function (resolve, reject) {
    if (!config.brainport) {config.brainport = 4015}
    const neeoSettings = {
      brain: config.brainip.toString(),
      port: config.brainport.toString(),
      name: ".meta",
      devices: driverTable
    };
    metaLog({type:LOG_TYPE.INFO, content:"Current directory: " + __dirname});
    metaLog({type:LOG_TYPE.INFO, content:"Trying to start the meta."});
    
    neeoapi.startServer(neeoSettings)
      .then((result) => {
        metaLog({type:LOG_TYPE.INFO, content:"Driver running, you can search it on the neeo app."});
        if (brainDiscovered) {
            fs.writeFile(__dirname + '/config.js', "{\"brainip\":\"" + neeoSettings.brain + "\", \"brainport\":\"" + neeoSettings.port + "\"}", err => {
              if (err) {
                metaLog({type:LOG_TYPE.ERROR, content:"Error writing the config file. " + err});
                 } else {
                  metaLog({type:LOG_TYPE.INFO, content:"Initial configuration saved"});
                }
              resolve();
            })
          }
      })
      .catch(err => {
           metaLog({type:LOG_TYPE.ERROR, content:'Failed running Neeo with error: ' + err});
           process.exit(1);
      });
    })
}
    

function enableMQTT (cont, deviceId) {
  mqttClient.subscribe(settings.mqtt_topic + cont.name + "/#", () => {});
  mqttClient.on('message', function (topic, value) {
      try {

        let theTopic = topic.split("/");
        if (theTopic.length == 6 && theTopic[5] == "set") {

          if (theTopic[3] == "button") {
            cont.onButtonPressed(theTopic[4], theTopic[2]);
          }
          else if (theTopic[3] == "slider") {
            let sliI = cont.sliderH.findIndex((sli)=>{return sli.name == theTopic[4]});
            if (sliI>=0){
              cont.sliderH[sliI].set(theTopic[2], value)
            }   
          }
          else if (theTopic[3] == "switch") {
            let sliI = cont.switchH.findIndex((sli)=>{return sli.name == theTopic[4]});
            if (sliI>=0){
              cont.switchH[sliI].set(theTopic[2], value)
            }   
          }
          else if (theTopic[3] == "image") {
            let imaI = cont.imageH.findIndex((ima)=>{return ima.name == theTopic[4]});
            if (imaI>=0){
              cont.imageH[imaI].set(theTopic[2], value)
            }   
          }
          else if (theTopic[3] == "label") {
            let labI = cont.labelH.findIndex((lab)=>{return lab.name == theTopic[4]});
            if (labI>=0){
              cont.labelH[labI].set(theTopic[2], value)
            }   
          }
         }
      }
      catch (err) {
        metaLog({type:LOG_TYPE.ERROR, content:'Parsing incomming message on: '+settings.mqtt_topic + cont.name + "/command"});
        metaLog({type:LOG_TYPE.ERROR, content:err});
      }
  })
}

//MAIN
process.chdir(__dirname);

if (process.argv.length>2) {
  try {
    if (process.argv[2]) {
      let arguments = JSON.parse(process.argv[2]);
      if (arguments.Brain) {
        brainConsoleGivenIP = arguments.Brain;
      }
      if (arguments.LogSeverity) {
        initialiseLogSeverity(arguments.LogSeverity);
      }
      if (arguments.Components) {
        initialiseLogComponents(arguments.Components);
      }
    }
    else {
      metaLog({type:LOG_TYPE.FATAL, content:'Wrong arguments: ' + process.argv[2] + (process.argv.length>3? ' ' + process.argv[3]: '') + ' You can try for example node meta \'{"Brain":"192.168.1.144","LogSeverity":"INFO","Components":["meta"]}\', Or example: node meta \'{"Brain":"localhost","LogSeverity":"VERBOSE","Components":["metaController", "variablesVault"]}\', all items are optionals, LogSeverity can be VERBOSE, INFO, WARNING or QUIET, components can be meta, metaController, variablesVault, processingManager, sensorHelper, sliderHeper, switchHelper, imageHelper or directoryHelper if you want to focus the logs on a specific function. If components is empty, all modules are shown.'});
      process.exit();
    }
  }
  catch (err)
  {
    metaLog({type:LOG_TYPE.FATAL, content:'Wrong arguments: ' + process.argv[2] + (process.argv.length>3? ' ' + process.argv[3]: '') + ' You can try for example node meta \'{"Brain":"192.168.1.144","LogSeverity":"INFO","Components":["meta"]}\', Or example: node meta \'{"Brain":"localhost","LogSeverity":"VERBOSE","Components":["metaController", "variablesVault"]}\', all items are optionals, LogSeverity can be VERBOSE, INFO, WARNING or QUIET, components can be meta, metaController, variablesVault, processingManager, sensorHelper, sliderHeper, switchHelper, imageHelper or directoryHelper if you want to focus the logs on a specific function. If components is empty, all modules are shown.'});
    metaLog({type:LOG_TYPE.FATAL, content:err});
    process.exit();
  }
}

getConfig().then(() => {
    networkDiscovery();
    mqttClient = mqtt.connect('mqtt://' + settings.mqtt, {clientId:"meta"}); // Always connect to the local mqtt broker
    mqttClient.setMaxListeners(0); //CAREFULL OF MEMORY LEAKS HERE.
    mqttClient.on('connect', () => {
      metaLog({type:LOG_TYPE.WARNING, content:"Connection to MQTT Broker Successful."});
    })
    mqttClient.on('error', (err) => {
      metaLog({type:LOG_TYPE.FATAL, content:"Issue while connecting to the mqtt broker."});
      metaLog({type:LOG_TYPE.FATAL, content:err});
    })
    createDevices()
    .then (() => {
      metaLog({type:LOG_TYPE.WARNING, content:"Connecting to the neeo brain."});
      setupNeeo().then(() => {
       
      })
    })  
})
