
'use strict';
const path = require('path');
const { imageHelper } = require(path.join(__dirname,'imageHelper'));
const { labelHelper } = require(path.join(__dirname,'labelHelper'));
const { switchHelper } = require(path.join(__dirname,'switchHelper'));
const { sensorHelper } = require(path.join(__dirname,'sensorHelper'));
const { sliderHelper } = require(path.join(__dirname,'sliderHelper'));
const { directoryHelper } = require(path.join(__dirname,'directoryHelper'));
const { variablesVault } = require(path.join(__dirname,'variablesVault'));
const settings = require(path.join(__dirname,'settings'));

const variablePattern = {'pre':'$','post':''};
const BUTTONHIDE = '__';
const RESULT = variablePattern.pre + 'Result' + variablePattern.post;
const HTTPGET = 'http-get';
const HTTPREST = 'http-rest';
const HTTPGETSOAP = 'http-get-soap';
const HTTPPOST = 'http-post';
const STATIC = 'static';
const CLI = 'cli';
const REPL = 'repl';
const WEBSOCKET = 'webSocket';
const SOCKETIO = 'socketIO';
const JSONTCP = 'jsontcp';
const MQTT = 'mqtt';
const WOL = 'wol';
const MDNS = 'mDNS';
const ANDROID = 'android';
const { ProcessingManager, httpgetProcessor, httprestProcessor, httpgetSoapProcessor, httppostProcessor, cliProcessor, staticProcessor, webSocketProcessor, jsontcpProcessor, mqttProcessor, socketIOProcessor, mDNSProcessor, androidProcessor, wolProcessor, replProcessor } = require('./ProcessingManager');
const { metaMessage, LOG_TYPE } = require("./metaMessage");

const processingManager = new ProcessingManager();
const myHttpgetProcessor = new httpgetProcessor();
const myHttpgetSoapProcessor = new httpgetSoapProcessor();
const myHttppostProcessor = new httppostProcessor();
const myCliProcessor = new cliProcessor();
const myStaticProcessor = new staticProcessor();
const myWebSocketProcessor = new webSocketProcessor();
const mySocketIOProcessor = new socketIOProcessor();
const myWolProcessor = new wolProcessor();
const myJsontcpProcessor = new jsontcpProcessor();
const myMqttProcessor = new mqttProcessor();
const myReplProcessor = new replProcessor();
const myHttprestProcessor = new httprestProcessor();
const myMDNSProcessor = new mDNSProcessor();
const myAndroidProcessor = new androidProcessor();

//LOGGING SETUP AND WRAPPING
//Disable the NEEO library console warning.
console.error = console.info = console.debug = console.warn = console.trace = console.dir = console.dirxml = console.group = console.groupEnd = console.time = console.timeEnd = console.assert = console.profile = function() {};
function metaLog(message) {
  let initMessage = { component:'metaController', type:LOG_TYPE.INFO, content:'', deviceid: null };
  let myMessage = {...initMessage, ...message}
  return metaMessage (myMessage);
} 

module.exports = function controller(driver) {
  this.buttons = []; //structure keeping all buttons of the driver
  this.sendComponentUpdate;
  this.name = driver.name;
  this.vault = new variablesVault();
  this.discoveredDevices = [];
  this.listeners = []; //container for all device listeners.
  this.connectionH = []; //helper for all connections.
  this.imageH = []; //image helper to store all the getter of the dynamically created images.
  this.sensorH = []; //sensor helper to store all the getter and setter of the dynamically created sensors.
  this.switchH = []; //sensor switch to store all the getter and setter of the dynamically created switches.
  this.labelH = []; //label helper to store all the getter and setter of the dynamically created labels.
  this.sliderH = []; //slider helper to store all the getter and setter of the dynamically created sliders.
  this.directoryH = []; //directory helper to store all the browse getter and setter of the dynamically created simple directories.
  var self = this;

  this.assignDiscoverHubController = function (theHubController) {//Assign the hub in order to send it the notifications
    metaLog({type:LOG_TYPE.VERBOSE, content:'assignDiscoverHubController - ' + theHubController});

    self.sendComponentUpdate = theHubController.sendComponentUpdate;
    self.connectionH = theHubController.connectionH;
  };
 
  this.addListener = function(params) {
    params.command = self.vault.readVariables(params.command, params.deviceId);
    if (Array.isArray(params.queryresult)) {
      params.queryresult.forEach(qr => {qr = self.vault.readVariables(qr, params.deviceId);})
    }
    else {
      params.queryresult = self.vault.readVariables(params.queryresult, params.deviceId);
    }
    let listIndent;
    if (params.isHub == false) { //if not a Hub, all device have to listen. 
      metaLog({deviceId:params.deviceId, type:LOG_TYPE.VERBOSE, content:'addListener : ' + params.command});
      listIndent = self.listeners.findIndex((listen) => {return (listen.name == params.name && listen.command == params.command && listen.deviceId == params.deviceId)});
    } 
    else {
      metaLog({deviceId:params.deviceId, type:LOG_TYPE.VERBOSE, content:'addListener : ' + params.command});
      listIndent = self.listeners.findIndex((listen) => {return (listen.name == params.name && listen.command == params.command)});
    }

    if (listIndent < 0) {//the command is new.
      //we add the interrested devices list to this listener. Interrested concept is needed for hub listener where the observer for one device may interest other devices.
      params.interested = [];
      params.interested.push(params.deviceId);


      if (params.evalwrite) {
         params.evalwrite.forEach(pEw => {//for dynamic devices, tracking of which variables to write on.
          pEw.deviceId = params.deviceId;
        }) 
      }
      if (params.evaldo) {
        params.evaldo.forEach(pEd => {//for dynamic devices, tracking of which variables to write on.
          pEd.deviceId = params.deviceId;
        })
      }
      self.listeners.push(params);
    }
    else {//we forbid addition of a new duplicate command to listen and we add the evalwrite conditions instead.
      if (self.listeners[listIndent].interested.findIndex((interested)=>{return interested == params.deviceId})<0) {
        self.listeners[listIndent].interested.push(params.deviceId);
      }
      if (params.evalwrite) {
        params.evalwrite.forEach(pEw => {
          let ewI = self.listeners[listIndent].evalwrite.findIndex((ew) => {return ((ew.variable == pEw.variable) && (ew.deviceId == pEw.deviceId))});
          if (ewI < 0) {//prevent duplicate evalwrite
            pEw.deviceId = params.deviceId; //for dynamic devices, tracking of which variables to write on.
            self.listeners[listIndent].evalwrite.push(pEw);
          }
        });
      }
      if (params.evaldo) {
        params.evaldo.forEach(pEd => {
          metaLog({type:LOG_TYPE.VERBOSE, content:'Trying to add a new listener evaldo' + pEd});
          let edI = self.listeners[listIndent].evaldo.findIndex((ed) => {return ((ed.variable == pEd.variable) && (ed.deviceId == pEd.deviceId))});
          if (edI < 0) {//prevent duplicate evalwrite
            pEd.deviceId = params.deviceId; //for dynamic devices, tracking of which variables to write on.
            self.listeners[listIndent].evaldo.push(pEd);
          }
        });
      }
    }
  }

  this.addConnection = function(params) {
    metaLog({type:LOG_TYPE.VERBOSE, content:'addConnection - ' + params.descriptor});
    self.connectionH.push(params);
  };

  this.addButton = function(deviceId, name, value) {
    self.buttons.push({'deviceId':deviceId, 'name':name,'value':value});
  };

  this.addImageHelper = function(deviceId, imageName, listened) {//function called by the MetaDriver to store 
    const indent = self.imageH.findIndex((elt) => {return (elt.name == imageName && elt.deviceId == deviceId);});
    if (indent<0) { //add only if not existant
      const newImageH = new imageHelper(deviceId, imageName, listened, self);
      self.imageH.push(newImageH);
      return self.imageH[self.imageH.length-1];
    }
    else {return self.imageH[indent];}
  };
  
  this.addLabelHelper = function(deviceId, labelName, listened, actionListened) {//function called by the MetaDriver to store 
    const indent = self.labelH.findIndex((elt) => {return (elt.name == labelName && elt.deviceId == deviceId);});
    if (indent<0) { //add only if not existant
      const newLabelH = new labelHelper(deviceId, labelName, listened, self, actionListened);
      self.labelH.push(newLabelH);
      return self.labelH[self.labelH.length-1];
    }
   else {return self.labelH[indent];}
  };

  this.addSensorHelper = function(deviceId, sensorName, listened) {//function called by the MetaDriver to store 
    const indent = self.sensorH.findIndex((elt) => {return (elt.name == sensorName && elt.deviceId == deviceId);});
    if (indent<0) { //add only if not existant
      const newSensorH = new sensorHelper(deviceId, sensorName, listened, self);
      self.sensorH.push(newSensorH);
      return self.sensorH[self.sensorH.length-1];

    }
    else {return self.sensorH[indent];}
  };

  this.addSwitchHelper = function(deviceId, switchName, listen, evaldo) {//function called by the MetaDriver to store 
    const indent = self.switchH.findIndex((elt) => {return (elt.name == switchName && elt.deviceId == deviceId);});
    if (indent<0) { //add only if not existant
      const newSwitchH = new switchHelper(deviceId, switchName, listen, evaldo, self);
      self.switchH.push(newSwitchH);
      return self.switchH[self.switchH.length-1];
    }
    else {return self.switchH[indent];}
  };

  this.addSliderHelper = function(deviceId, listen, evaldo, slidername) {//function called by the MetaDriver to store 
    const indent = self.sliderH.findIndex((elt) => {return (elt.name == slidername && elt.deviceId == deviceId);});
    if (indent<0) { //add only if not existant
      const newSliderH = new sliderHelper(deviceId, listen, evaldo, slidername, self);
      self.sliderH.push(newSliderH);
      return self.sliderH[self.sliderH.length-1];
    }
    else {return self.sliderH[indent];}
  };

  this.addDirectoryHelper = function(deviceId, dirname) {//function called by the MetaDriver to store the features of the list 
    const indent = self.directoryH.findIndex((elt) => {return (elt.name == dirname && elt.deviceId == deviceId);});
    if (indent<0) { //add only if not existant
      const newDirectoryH = new directoryHelper(deviceId, dirname, self);
      self.directoryH.push(newDirectoryH);
      return self.directoryH[self.directoryH.length-1];
    }
    else {return self.directoryH[indent];}
  };

  this.dynamicallyAssignSubscription = function(deviceId) {
    metaLog({type:LOG_TYPE.FATAL, content:'dynamicallyAssignSubscription', deviceId:deviceId});
    //  self.registerInitiationCallback(self.discoverHubController.updateFunction);
    //self.discoverHubController.updateFunction
    
  };

  this.assignTo = function(Pattern, inputChain, givenResult) //Assign a value to the input chain. Pattern found is replaced by given value
  {
   try {
      if (givenResult && !(typeof(givenResult) in {'string':'', 'number':'', 'boolean':''}) ) {//in case the response is a json object, convert to string
        givenResult = JSON.stringify(givenResult);
      }
     
      if (typeof(inputChain) == 'string') {
        if (inputChain.startsWith('DYNAMIK ')) {
          if (givenResult && (typeof(givenResult) == 'string' )) {
            givenResult = givenResult.replace(/\\/g, '\\\\'); // Absolutely necessary to properly escape the escaped character. Or super tricky bug.
            givenResult = givenResult.replace(/"/g, '\\"'); // Absolutely necessary to properly escape the escaped character. Or super tricky bug.
            givenResult = givenResult.replace(/(\r\n|\n|\r)/gm,''); //Management of NAIM issue but should be useful in general.
          }
          while (inputChain != inputChain.replace(Pattern, givenResult)) {
            inputChain = inputChain.replace(Pattern, givenResult);
          }
          metaLog({type:LOG_TYPE.VERBOSE, content:'Assign To Before Eval. ' + inputChain});
          let evaluatedValue = eval(inputChain.split('DYNAMIK ')[1]);
          metaLog({type:LOG_TYPE.VERBOSE, content:'Assign To After Eval. ' + evaluatedValue});
          return evaluatedValue;
        }
        else {
          inputChain = inputChain.replace(Pattern, givenResult);
          return inputChain;
        }
      }
      return inputChain;
    }
    catch (err) {
      metaLog({type:LOG_TYPE.ERROR, content:'META found an error in the DYNAMIK Function created with ('+Pattern+', '+inputChain+', '+givenResult+'). Error: '});
      metaLog({type:LOG_TYPE.ERROR, content:err});
    }
  };

  
  this.evalWrite = function (evalwrite, result, deviceId) {
    metaLog({type:LOG_TYPE.VERBOSE, content:'Processing evalwrite with result ' + result, deviceId:deviceId});
    metaLog({type:LOG_TYPE.VERBOSE, content:evalwrite, deviceId:deviceId});
    if (evalwrite) { //case we want to write inside a variable
      evalwrite.forEach(evalW => {
        if (evalW.deviceId) {deviceId = evalW.deviceId} //this is specific for listeners and discovery, when one command should be refreshing data of multiple devices (example hue bulbs)
        
        //process the value
        let finalValue = self.vault.readVariables(evalW.value, deviceId);
        finalValue = self.assignTo(RESULT, finalValue, result);
        metaLog({type:LOG_TYPE.INFO, content:"Value to EvalWrite: " + finalValue, deviceId:deviceId});
        self.vault.writeVariable(evalW.variable, finalValue, deviceId); 
      });
    }
  };

    this.evalDo = function (evaldo, result, deviceId) {
    if (evaldo) { //case we want to trigger a button
      evaldo.forEach(evalD => {
        if (evalD.test == '' || evalD.test == true) {evalD.test = true;} //in case of no test, go to the do function
        let finalDoTest = self.vault.readVariables(evalD.test, deviceId);// prepare the test to assign variable and be evaluated.
        metaLog({type:LOG_TYPE.INFO, content:"Intermediate Result to evaldo: " + finalDoTest, deviceId:deviceId});
        finalDoTest = self.assignTo(RESULT, finalDoTest, result);
        metaLog({type:LOG_TYPE.INFO, content:"Result to evaldo: " + finalDoTest, deviceId:deviceId});
        if (finalDoTest) {
          if (evalD.then && evalD.then != '')
          {
           self.onButtonPressed(evalD.then, deviceId);
          } 
        }
        else { 
          if (evalD.or && evalD.or != '')
          {
            self.onButtonPressed(evalD.or, deviceId);
          }
        }
       });
    }
  };

  this.reInitVariablesValues = function(deviceId) {//it is to make sure that all variable have been interpreted after the register process
    self.vault.variables.forEach(element => {
      element.value = self.vault.readVariables(element.value, deviceId); 
    });
  };

  this.reInitConnectionsValues = function(deviceId) {//it is to make sure that all variable have been interpreted after the register process
    self.connectionH.forEach(element => {
      if (element.deviceId == deviceId) {
        element.descriptor = self.vault.readVariables(element.descriptor, deviceId); 
      }
    });
  };

  this.getConnection = function(commandtype, deviceId) {
     return self.connectionH[self.connectionH.findIndex((item) => { return (item.name==commandtype && item.deviceId==deviceId); })];
  };

  this.assignProcessor = function(commandtype) {
    if (commandtype == HTTPGET) {
      processingManager.processor = myHttpgetProcessor;
    } 
    else if (commandtype == HTTPREST) {
      processingManager.processor = myHttprestProcessor;
    } 
    else if (commandtype == HTTPGETSOAP) {
      processingManager.processor = myHttpgetSoapProcessor;
    } 
    else if (commandtype == HTTPPOST) {
      processingManager.processor = myHttppostProcessor;
    }
    else if (commandtype == STATIC) {
      processingManager.processor = myStaticProcessor;
    }
    else if (commandtype == CLI) {
      processingManager.processor = myCliProcessor;
    }
    else if (commandtype == WEBSOCKET) {
      processingManager.processor = myWebSocketProcessor;
    }
    else if (commandtype == SOCKETIO) {
      processingManager.processor = mySocketIOProcessor;
    }
    else if (commandtype == WOL) {
      processingManager.processor = myWolProcessor;
    }
    else if (commandtype == MDNS) {
      processingManager.processor = myMDNSProcessor;
    }
    else if (commandtype == ANDROID) {
      processingManager.processor = myAndroidProcessor;
    }
    else if (commandtype == JSONTCP) {
      processingManager.processor = myJsontcpProcessor;
    }
    else if (commandtype == MQTT) {
      processingManager.processor = myMqttProcessor;
    }
    else if (commandtype == REPL) {
      processingManager.processor = myReplProcessor;
    }
    else {metaLog({type:LOG_TYPE.ERROR, content:'Error in meta: The commandtype to process is not defined: ' + commandtype});}
  };

  this.initiateProcessor = function(commandtype, deviceId) { // Initiate communication protocoles
    return new Promise(function (resolve, reject) {
      self.assignProcessor(commandtype); //to get the correct processing manager.
      processingManager.initiate(self.getConnection(commandtype, deviceId))
        .then((result) => {
          resolve(result);
        })
        .catch((err) => {
          metaLog({type:LOG_TYPE.ERROR, content:'Error during initiation with commandtype : ' + commandtype, deviceId:deviceId});
          metaLog({type:LOG_TYPE.ERROR, content:err});
          reject (err);
        });
    });    
  };

  this.wrapUpProcessor = function(commandtype, deviceId) { // close communication protocoles
    return new Promise(function (resolve, reject) {

      self.assignProcessor(commandtype); //to get the correct processing manager.
      processingManager.wrapUp(self.getConnection(commandtype, deviceId))
        .then((result) => {
          resolve(result);
        })
        .catch((err) => {reject (err);});
    });    
  };

  
  this.commandProcessor = function(command, commandtype, deviceId) { // process any command according to the target protocole
    return new Promise(function (resolve, reject) {
      try {
        self.assignProcessor(commandtype);
        const connection = self.getConnection(commandtype, deviceId);
        command = self.vault.readVariables(command, deviceId);
        command = self.assignTo(RESULT, command, '');
        const params = {'command' : command, 'connection' : connection};
        metaLog({type:LOG_TYPE.VERBOSE, content:'Final command to be processed: ' + commandtype, deviceId:deviceId});
        metaLog({type:LOG_TYPE.VERBOSE, content:command, deviceId:deviceId});
        processingManager.process(params)
          .then((result) => {
            metaLog({type:LOG_TYPE.VERBOSE, content:'Result of the command to be processed: '+result, deviceId:deviceId});
            resolve(result);
          })
          .catch((err) => {reject (err);});
      }
      catch (err) {
        metaLog({type:LOG_TYPE.VERBOSE, content:'Error when executing the command:', deviceId:deviceId});
        metaLog({type:LOG_TYPE.VERBOSE, content:command, deviceId:deviceId});
        metaLog({type:LOG_TYPE.VERBOSE, content:err, deviceId:deviceId});
      } 
    })  
  };

  this.listenProcessor = function(listener, deviceId) { // process any command according to the target protocole
    return new Promise(function (resolve, reject) {

      self.assignProcessor(listener.type);
      //TODO Replace by let
      const connection = self.getConnection(listener.type, deviceId);
      let params = {'command' : listener.command, 'listener' : listener, '_listenCallback' : self.onListenExecute, 'connection' : connection};
      
      processingManager.startListen(params, deviceId)
      .then((result) => {
          resolve(result);
      })
      .catch((err) => {reject (err);});
    });    
  };

  this.stopListenProcessor = function(listener, deviceId) { // process any command according to the target protocole
    return new Promise(function (resolve, reject) {
      if (listener.interested.includes(deviceId)) {
        listener.currentInterestCount = listener.currentInterestCount - 1;
        listener.interestedAndUsing = listener.interestedAndUsing.filter(devId => {return devId != deviceId})
        self.assignProcessor(listener.type);
        processingManager.stopListen(listener, self.getConnection(listener.type, deviceId));
      }
      else {
        metaLog({type:LOG_TYPE.WARNING, content:'Trying to stop a listener from the wrong device', deviceId:deviceId});
      }
    });    
  };

  this.queryProcessor = function (data, query, commandtype, deviceId) { // process any command according to the target protocole
    return new Promise(function (resolve, reject) {
      try {
        self.assignProcessor(commandtype);
        metaLog({type:LOG_TYPE.VERBOSE, content:'Query Processor : ' + query, deviceId:deviceId});
        let myQueryT = [];
        const promiseT = [];
        if (!Array.isArray(query)) {
          myQueryT.push(query);
        }
        else {
          myQueryT = query;
        }
        for (let index = 0; index < myQueryT.length; index++) { //process all the query result in parallele.
          const mypromise = new Promise ((resolve, reject) => {
            myQueryT[index] = self.vault.readVariables(myQueryT[index], deviceId);
            const params = {'query' : myQueryT[index], 'data' : data};
            processingManager.query(params).then((data) => {
              resolve(data);
            });
          });
          promiseT.push(mypromise);
        }
        Promise.all(promiseT).then((values) => {
          metaLog({type:LOG_TYPE.VERBOSE, content:'Result of all query processors : ' + values, deviceId:deviceId});
          if (values.length == 1) {
            resolve(values[0]);
          }
          else {
            const result = [];
            if (values[0]) {
                for (let index = 0; index < values[0].length; index++) {
                  const cell = [];
                  for (let index2 = 0; index2 < values.length; index2++) {
                    cell.push(values[index2][index]);
                  }
                  result.push(cell);
                }
              }
              resolve(result);
            }
        });
      }
      catch (err) {
        metaLog({type:LOG_TYPE.ERROR, content:'Error during the querryresult processing.', deviceId:deviceId});
        metaLog({type:LOG_TYPE.ERROR, content:err, deviceId:deviceId});
        resolve(err);
      }
    });
  };
  
  this.onListenExecute = function (result, listener, deviceId) {
    self.queryProcessor(result, listener.queryresult, listener.type, deviceId).then((result) => {
       if (listener.evalwrite) {self.evalWrite(listener.evalwrite, result, deviceId);}
       if (listener.evaldo) {self.evalDo(listener.evaldo, result, deviceId);}
    });
  };

  this.listenStart = function (listener, deviceId) {
    return new Promise(function (resolve, reject) {
      try {
        listener.command = self.vault.readVariables(listener.initialCommand, deviceId);
        if (listener.interested.includes(deviceId)) {
          if (listener.interestedAndUsing.findIndex(devId => {return devId == deviceId})<0) {
            listener.interestedAndUsing.push(deviceId);
          } //CHANGE IN LISTENER LOGIC AS WE LISTEN PROCESSOR ANYWAY
            metaLog({type:LOG_TYPE.INFO, content:"Listener will listen to command: " + listener.command, deviceId:deviceId});
            self.listenProcessor(listener, deviceId);

        }
      } 
      catch (err) {reject('Error when starting to listen. ' + err);}
    });
  };
  
  this.actionManager = function (deviceId, commandtype, command, queryresult, evaldo, evalwrite) {
    return new Promise(function (resolve, reject) {
      try {
        self.commandProcessor(command, commandtype, deviceId)
        .then((result) => {
          self.queryProcessor(result, queryresult, commandtype, deviceId).then((result) => {
            if (Array.isArray(result) && !Array.isArray(queryresult)) {//For compatibility transform to single value override by making query result a table
              result = result[0];
            } 
            if (evalwrite) {self.evalWrite(evalwrite, result, deviceId);}
            if (evaldo) {self.evalDo(evaldo, result, deviceId);}
            resolve(result);
          });
        })
        .catch((result) => { //if the command doesn't work.
          result = 'Command failed:' + result;
          if (evalwrite) {self.evalWrite(evalwrite, result, deviceId);}
          if (evaldo) {self.evalDo(evaldo, result, deviceId);}
          resolve('Error during the post command processing' + result);
        }); 
      }
      catch {reject('Error while processing the command.');}
    });
  };

  this.initialise = function(deviceId) {
    metaLog({type:LOG_TYPE.VERBOSE, content:'Initialising the driver.', deviceId:deviceId});

    self.sliderH.forEach((helper) => {if (helper.deviceId == deviceId) {helper.initialise(deviceId);}});//No need to cleanup as double addition is protected
    self.switchH.forEach((helper) => {if (helper.deviceId == deviceId) {helper.initialise(deviceId);}});//No need to cleanup as double addition is protected
    self.imageH.forEach((helper) => {if (helper.deviceId == deviceId) {helper.initialise(deviceId);}});//No need to cleanup as double addition is protected
    self.labelH.forEach((helper) => {if (helper.deviceId == deviceId) {helper.initialise(deviceId);}});//No need to cleanup as double addition is protected
    self.sensorH.forEach((helper) => {if (helper.deviceId == deviceId) {helper.initialise(deviceId);}});//No need to cleanup as double addition is protected

    self.connectionH.forEach(connection => {//open all driver connections type
      self.initiateProcessor(connection.name, deviceId);
    });
    self.listeners.forEach((listener) => {
      if (listener.interested.includes(deviceId?deviceId:"default")) {//we start only the listeners of this device !!! Or if it is a hub. The inserted default help for "constructor" devices discovering others.
        metaLog({type:LOG_TYPE.VERBOSE, content:'Initialising the listeners of the driver.', deviceId:deviceId});
        self.listenStart(listener, deviceId?deviceId:"default");
      }
    });
  };
  
  this.onButtonPressed = function(name, deviceId) {
    return new Promise(function (resolve, reject) {
      metaLog({type:LOG_TYPE.WARNING, content:'[CONTROLLER] - ' + name + ' - button pressed', deviceId:deviceId});
      if (name == '__INITIALISE') {//Device resources and connection management.
        self.initialise(deviceId);
      }

      if (name == '__CLEANUP') {//listener management to listen to other devices. Stop listening on power off.
        self.listeners.forEach(listener => {
          if (listener.interested.includes(deviceId)) {//we stop only the listeners of this device !!!
            self.stopListenProcessor(listener, deviceId);
          }
        });
        self.connectionH.forEach(connection => {
          self.wrapUpProcessor(connection.name, deviceId);
        });
      }
      if (name == '__PERSIST') {//Device resources and connection management.
        self.vault.snapshotDataStore();
      }
      let theButton = self.buttons[self.buttons.findIndex((button) => {return button.name ==  name && button.deviceId == deviceId;})];
      if (theButton != undefined) {
        theButton = theButton.value;
        if (!name.startsWith(BUTTONHIDE)) {
          self.commandProcessor("{\"topic\":\""+ settings.mqtt_topic + self.name + "/" + deviceId + "/button/" + name + "\",\"message\":\"PRESSED\"}", MQTT, deviceId)
        }
        if (theButton.command != undefined){ 
          self.actionManager(deviceId, theButton.type, theButton.command, theButton.queryresult, theButton.evaldo, theButton.evalwrite)
          .then(()=>{
            metaLog({type:LOG_TYPE.VERBOSE, content:'Button Action Done.', deviceId:deviceId});
            metaLog({type:LOG_TYPE.VERBOSE, content:theButton, deviceId:deviceId});
            resolve('Action done.');
          })
          .catch((err) => { 
            metaLog({type:LOG_TYPE.ERROR, content:'Error when processing the command : ' + err, deviceId:deviceId});
              resolve(err);
          });
        }
        else {resolve("No command in the button.")}
      }
      else {resolve("no real button pressed")}
    })
  };
};

