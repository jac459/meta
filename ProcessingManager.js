const path = require('path'); 
const CertificateGenerator = require (path.join(__dirname,"lib/certificate/CertificateGenerator.js")).CertificateGenerator;
const PairingManager = require (path.join(__dirname,"lib/pairing/PairingManager.js")).PairingManager;
const RemoteManager = require (path.join(__dirname,"lib/remote/RemoteManager.js")).RemoteManager;
const AndroidRemote = require (path.join(__dirname,"lib//AndroidRemote.js")).AndroidRemote;

const { exec } = require("child_process");
const xpath = require('xpath');
const http = require('http.min');
const { JSONPath } = require ('jsonpath-plus');
const io = require('socket.io-client');
const rpc = require('json-rpc2');
const lodash = require('lodash');
var xml2js = require('xml2js');
const WebSocket = require('ws');
const got = require('got');
const wol = require('wol');
const settings = require(path.join(__dirname,'settings'));
const { connect } = require("socket.io-client");
const meta = require(path.join(__dirname,'meta'));
//LOGGING SETUP AND WRAPPING
//Disable the NEEO library console warning.
const { metaMessage, LOG_TYPE } = require("./metaMessage");
const { startsWith } = require("lodash");
const { retry } = require("statuses");
console.error = console.info = console.debug = console.warn = console.trace = console.dir = console.dirxml = console.group = console.groupEnd = console.time = console.timeEnd = console.assert = console.profile = function() {};
function metaLog(message) {
  let initMessage = { component:'processingManager', type:LOG_TYPE.INFO, content:'', deviceId: null };
  let myMessage = {...initMessage, ...message}
  return metaMessage (myMessage);
} 

//STRATEGY FOR THE COMMAND TO BE USED (HTTPGET, post, websocket, ...) New processor to be added here. This strategy mix both transport and data format (json, soap, ...)
class ProcessingManager {
  constructor() {
    this._processor = null;
  };
  set processor(processor) {
    this._processor = processor;
  };
  get processor() {
    return this._processor;
  }
  initiate(connection) {
    return new Promise((resolve, reject) => {
      this._processor.initiate(connection)
        .then((result) => { resolve(result); })
        .catch((err) => reject(err));
    });
  }
  process(params) {
    return new Promise((resolve, reject) => {
      this._processor.process(params)
        .then((result) => { resolve(result); })
        .catch((err) => reject(err));
    });
  }
  query(params) {
    return this._processor.query(params);
  }
  startListen(params, deviceId) {
    return this._processor.startListen(params, deviceId);
  }
  stopListen(listen, connection) {
    return this._processor.stopListen(listen, connection);
  }
  wrapUp(connection) {
    return new Promise((resolve, reject) => {
      this._processor.wrapUp(connection)
        .then((result) => { resolve(result); })
        .catch((err) => reject(err));
    });
  }
}
exports.ProcessingManager = ProcessingManager;

class httprestProcessor {
  constructor() {
  };
  initiate(connection) {
    return new Promise(function (resolve, reject) {
      resolve();
    });
  }
  process(params) {
    return new Promise(function (resolve, reject) {
      try {
        if (typeof (params.command) == 'string') { params.command = JSON.parse(params.command); };
        let myRestFunction;
        if (params.command.verb == 'post') {myRestFunction = got.post};
        if (params.command.verb == 'put') {myRestFunction = got.put};
        if (params.command.verb == 'get') {myRestFunction = got};
        let param;
        if (typeof params.command.message === 'string' && params.command.message.startsWith("<")) {
          param = {body:params.command.message,headers:params.command.headers};
        } else
        {
          param = {json:params.command.message,headers:params.command.headers};
        }
        myRestFunction(params.command.call, param)
        .then((response) => {
          if ((response.headers["content-type"] && response.headers["content-type"] == "text/xml") || response.body.startsWith('<'))
          {
            xml2js.parseStringPromise(response.body)
            .then((result) => {
              metaLog({type:LOG_TYPE.VERBOSE, content:result});
              resolve(result);
            })
            .catch((err) => {
              metaLog({type:LOG_TYPE.ERROR, content:err});
            })
          }
          else {
            metaLog({type:LOG_TYPE.VERBOSE, content:response.headers});
            metaLog({type:LOG_TYPE.VERBOSE, content:response.body});
            resolve(response.body);
          }
        })
        .catch((err) => {
            metaLog({type:LOG_TYPE.ERROR, content:'Request didn\'t work : '});
            metaLog({type:LOG_TYPE.ERROR, content:params});
            metaLog({type:LOG_TYPE.ERROR, content:err});
        });
      }
      catch (err) {
        metaLog({type:LOG_TYPE.ERROR, content:'Meta Error during the rest command processing'});
        metaLog({type:LOG_TYPE.ERROR, content:err});
      }
     });
    }
    query(params) {
      return new Promise(function (resolve, reject) {
        if (params.query) {
          try {
            metaLog({type:LOG_TYPE.VERBOSE, content:'Rest command query processing, parameters, result JSON path: '+ JSONPath(params.query, params.data)});
            if (typeof (params.data) == 'string') { params.data = JSON.parse(params.data); }
            resolve(JSONPath(params.query, params.data));
          }
          catch (err) {
            metaLog({type:LOG_TYPE.ERROR, content:'HTTP Error ' + err + ' in JSONPATH ' + params.query + ' processing of :' + params.data});
          }
        }
        else { resolve(params.data); }
      });
    }
  startListen(params, deviceId) {
    return new Promise(function (resolve, reject) {
      let previousResult = '';
      clearInterval(params.listener.timer);
      params.listener.timer = setInterval(() => {
        try {
          if (typeof (params.command) === 'string') { params.command = JSON.parse(params.command); }
          let myRestFunction;
          if (params.command.verb == 'post') {myRestFunction = got.post};
          if (params.command.verb == 'put') {myRestFunction = got.put};
          if (params.command.verb == 'get') {myRestFunction = got};
          metaLog({type:LOG_TYPE.VERBOSE, content:"Intenting rest call", deviceId});
          metaLog({type:LOG_TYPE.VERBOSE, content:params.command, deviceId});
          let param;
          if (typeof params.command.message === 'string' && params.command.message.startsWith("<")) {
            param = {body:params.command.message,headers:params.command.headers};
          } else
          {
            param = {json:params.command.message,headers:params.command.headers};
          }
          myRestFunction(params.command.call, param)
          .then((response) => {
            if ((response.headers["content-type"] && response.headers["content-type"] == "text/xml") || response.body.startsWith('<'))
            {
              xml2js.parseStringPromise(response.body)
              .then((result) => {
                metaLog({type:LOG_TYPE.VERBOSE, content:result, deviceId});
                if (result != previousResult) {
                  previousResult = result;
                  params._listenCallback(result, params.listener, deviceId);
                }
                resolve("");
              })
              .catch((err) => {
                metaLog({type:LOG_TYPE.ERROR, content:err});
              })
            }
            else {
              if (response.body != previousResult) {
                previousResult = response.body;
                params._listenCallback(response.body, params.listener, deviceId);
              }
              resolve("");
            }
          })
          .catch((err) => {
              metaLog({type:LOG_TYPE.ERROR, content:'Request didn\'t work : '});
              metaLog({type:LOG_TYPE.ERROR, content:err});
              resolve('');
          });
        }
        catch (err) {
          metaLog({type:LOG_TYPE.ERROR, content:'Meta Error during the rest command processing'});
          metaLog({type:LOG_TYPE.ERROR, content:err});
          resolve('');
        }
      }, (params.listener.pooltime ? params.listener.pooltime : 1000));
      if (params.listener.poolduration && (params.listener.poolduration != '')) {
        setTimeout(() => {
          clearInterval(params.listener.timer);
        }, params.listener.poolduration);
      }
    });
  }
  stopListen(params) {
    clearInterval(params.timer);
  }
}
exports.httprestProcessor = httprestProcessor;

class httpgetProcessor {
  constructor() {
  };
  initiate(connection) {
    return new Promise(function (resolve, reject) {
      resolve();
    });
  }
  process(params) {
    return new Promise(function (resolve, reject) {
      try {
        got(params.command)
          .then(function (result) {
            resolve(result.body);
          })
          .catch((err) => {
            metaLog({type:LOG_TYPE.ERROR, content:err});
            resolve();
          });
      }
      catch (err) {
        metaLog({type:LOG_TYPE.ERROR, content:err});
        resolve();
      }
    })
  }
  query(params) {
    return new Promise(function (resolve, reject) {
      if (params.query) {
        try {
          if (typeof (params.data) == 'string') { params.data = JSON.parse(params.data); };
          resolve(JSONPath(params.query, params.data));
        }
        catch (err) {
          metaLog({type:LOG_TYPE.ERROR, content:err});
        }
      }
      else { resolve(params.data); }
    });
  }
  startListen(params, deviceId) {
    return new Promise(function (resolve, reject) {
      let previousResult = '';
      clearInterval(params.listener.timer);
      params.listener.islistening == true;
      params.listener.timer = setInterval(() => {
        metaLog({type:LOG_TYPE.VERBOSE, content:"listening device " + deviceId});
        if (params.command == "") {resolve("")}; //for 
        http(params.command)
          .then(function (result) {
            if (result.data != previousResult) {
              previousResult = result.data;
              params._listenCallback(result.data, params.listener, deviceId);
            }
            resolve('');
          })
          .catch((err) => { 
            metaLog({type:LOG_TYPE.ERROR, content:err});
           });
        }, (params.listener.pooltime ? params.listener.pooltime : 1000));
        if (params.listener.poolduration && (params.listener.poolduration != '')) {
          setTimeout(() => {
            clearInterval(params.listener.timer);
            params.listener.islistening == false;
          }, params.listener.poolduration);
        }
      });
    }
    stopListen(listener) {
      listener.islistening == false;
      clearInterval(listener.timer);
    }
}
exports.httpgetProcessor = httpgetProcessor;

class wolProcessor {
  constructor() {
  };
  initiate() {
    return new Promise(function (resolve, reject) {
      resolve();
    });
  }
  process(params) {
    return new Promise(function (resolve, reject) {
      try {
        wol.wake(params.command, function(err, res){
          if (err) {
            resolve({'error':err})
          }
          else {
            resolve({'result':res})
          }
        });
      }
      catch (err) {
        metaLog({type:LOG_TYPE.ERROR, content:err});
        resolve({'error':err});
      }
    })
  }
  query(params) {
    return new Promise(function (resolve, reject) {
      if (params.query) {
        try {
          if (typeof (params.data) == 'string') { params.data = JSON.parse(params.data); };
          resolve(JSONPath(params.query, params.data));
        }
        catch (err) {
          metaLog({type:LOG_TYPE.ERROR, content:err});
        }
      }
      else { resolve(params.data); }
    });
  }
  startListen(params, deviceId) {
    return new Promise(function (resolve, reject) {
      resolve();
    })  
  }
  stopListen(listener) {
  }
  wrapUp(connection) {
    return new Promise(function (resolve, reject) {
      resolve(connection);
    });
  }
}
exports.wolProcessor = wolProcessor;

class socketIOProcessor {
  initiate(connection) {
    return new Promise(function (resolve, reject) {
      try {
        connection.toConnect = true;
        if (connection.connector != "" && connection.connector != undefined) {
          connection.connector.close();
        } //to avoid opening multiple
        
        connection.connector = io(connection.descriptor.startsWith('http')?connection.descriptor:"http://"+connection.descriptor, { jsonp: false, transports: ['websocket'] });
        connection.connector.on("connect", () => {
          metaLog({type:LOG_TYPE.INFO, content:"socketIO connected on " + connection.descriptor});
        });
        connection.connector.on("disconnect", () => {
          metaLog({type:LOG_TYPE.INFO, content:"socketIO disconnected from " + connection.descriptor});
          if (connection.toConnect) {
            connection.connector.connect();
          }
        });
        connection.connector.on("connect_error", (err) => {
          metaLog({type:LOG_TYPE.ERROR, content:"Connection error with socketIO - " + connection.descriptor});
          metaLog({type:LOG_TYPE.ERROR, content:err});
        });
        connection.connector.connect();
        //connection.connector.connect();
        resolve(connection);
      }
      catch (err) {
        metaLog({type:LOG_TYPE.ERROR, content:'Error while intenting connection to the target device.'});
        metaLog({type:LOG_TYPE.ERROR, content:err});
      }
    }); //to avoid opening multiple
  }
  process(params) {
    return new Promise(function (resolve, reject) {
      if (typeof (params.command) == 'string') { params.command = JSON.parse(params.command); }
      if (params.command.call) {
        params.connection.connector.emit(params.command.call, params.command.message);
        resolve('');
      }
    });
  }
  query(params) {
    return new Promise(function (resolve, reject) {
      try {
        if (params.query) {
          resolve(JSONPath(params.query, params.data));
        }
        else {
          resolve(params.data);
        }
      }
      catch (err) {
        metaLog({type:LOG_TYPE.ERROR, content:err});
      }
    });
  }
  startListen(params, deviceId) {
    return new Promise(function (resolve, reject) {
      params.connection.connector.on(params.command, (result) => { params._listenCallback(result, params.listener, deviceId); });
      resolve('');
    });
  }
  stopListen(connection) {
    if (connection.connector != "" && connection.connector != undefined) {
      connection.toConnect = false;
      connection.connector.close();
    }
  }
  wrapUp(connection) {
    return new Promise(function (resolve, reject) {
      if (connection.connector != "" && connection.connector != undefined) {
        connection.toConnect = false;
        connection.connector.close();
      }
      resolve(connection);
    });
  }
}
exports.socketIOProcessor = socketIOProcessor;

class androidProcessor {
  initiate(connection) {
    return new Promise(function (resolve, reject) {
      resolve();
    });
  }
  process(params) {
    return new Promise(function (resolve, reject) {
      if (typeof (params.command) == 'string') { params.command = JSON.parse(params.command); }
      if (params.command.register) {
        metaLog({type:LOG_TYPE.INFO, content:"REGISTERING " + params.command.message});
        params.connection.connector.pairingManager.sendCode(params.command.message);
      }
      else {
        metaLog({type:LOG_TYPE.INFO, content:"Sending command:"});
        metaLog({type:LOG_TYPE.INFO, content:params.command});
        if (params.command.remoteKeyCode && params.command.remoteDirection) {
          if (params.connection.connector.remoteManager.client._readableState) {
            if (!params.connection.connector.remoteManager.client._readableState.closed)
            params.connection.connector.remoteManager.sendKey(params.command.remoteKeyCode, params.command.remoteDirection);
            else {
              params.connection.connector.remoteManager.start();
            }
          }
        }
        else if (params.command.appLink) {
          let result = params.connection.connector.remoteManager.sendAppLink(params.command.appLink);
          metaLog({type:LOG_TYPE.WARNING, content:"Sent command with result: " + result})
        }
      }
      resolve();
    });
  }
  query(params) {
    return new Promise(function (resolve, reject) {
      try {
        if (params.query) {
          metaLog({type:LOG_TYPE.WARNING, content:params});
          metaLog({type:LOG_TYPE.WARNING, content:JSONPath(params.query, params.data)});
          resolve(JSONPath(params.query, params.data));
        }
        else {
          resolve(params.data);
        }
      }
      catch (err) {
        metaLog({type:LOG_TYPE.ERROR, content:err});
        resolve('');
      }
    });
  }
  
  startListen(params, deviceId) {
    return new Promise(function (resolve, reject) {
      try {
        if (!params.connection) {params.connection = {}}
        if (typeof (params.command) == 'string') { params.command = JSON.parse(params.command); }
        metaLog({type:LOG_TYPE.INFO, content:'Starting to listen with this params:'});
        metaLog({type:LOG_TYPE.INFO, content:params.command});
        let cert = CertificateGenerator.generateFull(
          "Neeo-meta",
          'CNT',
          'ST',
          'LOC',
          'O',
          'OU'
        );
        let options = {
          pairing_port : 6467,
          remote_port : 6466,
          name : 'androidtv-remote',
          cert: cert
        }
        if (params.command.certificate) {
          metaLog({type:LOG_TYPE.INFO, content:params.command.certificate});
          if (JSON.parse(params.command.certificate).key && JSON.parse(params.command.certificate).cert) {
            params.connection.connector.remoteManager  = new RemoteManager(params.command.connection, options.remote_port, JSON.parse(params.command.certificate))
            params.connection.connector.remoteManager.start().then ((result) => {
              metaLog({type:LOG_TYPE.INFO, content:'Android Connected'});
              params.connection.connector.remoteManager.on('powered', (powered) => {
                metaLog({type:LOG_TYPE.INFO, content:powered});  
                params._listenCallback("{\"message\":" + JSON.stringify(result) + "}", params.listener, deviceId);;              

              });
              params.connection.connector.remoteManager.on('volume', (volume) => {
                metaLog({type:LOG_TYPE.INFO, content:"volume"});  
                metaLog({type:LOG_TYPE.INFO, content:volume});  
                params._listenCallback("{\"message\":" + JSON.stringify(volume) + "}", params.listener, deviceId);;              
              });
              params.connection.connector.remoteManager.on('current_app', (current_app) => {
                metaLog({type:LOG_TYPE.INFO, content:current_app});  
                params._listenCallback("{\"message\":" + JSON.stringify(current_app) + "}", params.listener, deviceId);;              
              });
              params.connection.connector.remoteManager.on('ready', (ready) => {
                metaLog({type:LOG_TYPE.INFO, content:"ready"});  
                metaLog({type:LOG_TYPE.INFO, content:ready});  
                params._listenCallback("{\"message\":" + JSON.stringify(ready) + "}", params.listener, deviceId);              
              });
              params.connection.connector.remoteManager.on('error', (error) => {
                metaLog({type:LOG_TYPE.WARNING, content:"error"});  
                metaLog({type:LOG_TYPE.WARNING, content:error});  
                params._listenCallback("{\"message\":" + JSON.stringify(error) + "}", params.listener, deviceId); 
                params.connection.connector.remoteManager.start();           
              });
              params.connection.connector.remoteManager.on('close', (message) => {
                metaLog({type:LOG_TYPE.WARNING, content:"close"});  
                metaLog({type:LOG_TYPE.WARNING, content:message});  
                params._listenCallback("{\"message\":" + JSON.stringify(message) + "}", params.listener, deviceId); 
                params.connection.connector.remoteManager.start();           
              });
              params._listenCallback("{\"message\":" + result + "}", params.listener, deviceId);;              
              resolve();
            })
          }
        }
        else {
          params.connection.connector.pairingManager = new PairingManager(params.command.connection, options.pairing_port, options.cert, options.name)
          params.connection.connector.pairingManager.start().then ((result)=> {
            metaLog({type:LOG_TYPE.INFO, content:'PAIRING STARTED'});
            metaLog({type:LOG_TYPE.INFO, content:result});
            metaLog({type:LOG_TYPE.INFO, content: options.cert});
            params._listenCallback("{\"key\":"+JSON.stringify(options.cert)+"}", params.listener, deviceId);;  
          })
          .catch(function (error) {
            metaLog({type:LOG_TYPE.ERROR, content:error});
          });
          resolve();
        }        
      }
      catch (err) {
        metaLog({type:LOG_TYPE.ERROR, content:'Error with listener configuration.'});
        metaLog({type:LOG_TYPE.ERROR, content:err});
        resolve('');
      }

    });
  }
  stopListen(params) {
  }

  wrapUp(connection) { 
    return new Promise(function (resolve, reject) {
      try {
        metaLog({type:LOG_TYPE.VERBOSE, content:' WrapUp Android'});
        if (connection.connector.remoteManager != undefined) {
          connection.connector.remoteManager.stop().then (
              (result) => {
                metaLog({type:LOG_TYPE.VERBOSE, content:'Closing the communication with Android.'});
                metaLog({type:LOG_TYPE.VERBOSE, content:result}); 
  
              })
  
        }
        if (connection.connector.pairingManager != undefined) {
          connection.connector.pairingManager.stop().then (
              (result) => {
                metaLog({type:LOG_TYPE.VERBOSE, content:'Closing the communication with Android.'});
                metaLog({type:LOG_TYPE.VERBOSE, content:result}); 
  
              })
              connection.connector = undefined;
        }
        resolve();
      }
      catch (err) {
        metaLog({type:LOG_TYPE.ERROR, content:'Error will releasing android connection.'});
        metaLog({type:LOG_TYPE.ERROR, content:err});
        resolve('');
      }    
   })
  }
}
exports.androidProcessor = androidProcessor;


class webSocketProcessor {
  initiate() {
    return new Promise(function (resolve, reject) {
      resolve();
    });
  }
  process(params) {
    return new Promise(function (resolve, reject) {
      metaLog({type:LOG_TYPE.VERBOSE, content:'Entering the processor:'});
      if (typeof (params.command) == 'string') { params.command = JSON.parse(params.command); };
      metaLog({type:LOG_TYPE.VERBOSE, content:params.command});
      if (!params.connection) {params.connection = {}}
      if  (!params.connection.connections) { params.connection.connections = []};
      let connectionIndex = params.connection.connections.findIndex((con) => {return con.descriptor == params.command.connection});
      metaLog({type:LOG_TYPE.VERBOSE, content:'Connection Index:' + connectionIndex});
      if  (connectionIndex < 0) { //checking if connection exist
        metaLog({type:LOG_TYPE.WARNING, content:'You need to create a listener to have a proper websocket connection.'});
        resolve({'readystate':-1});
      }
      else if (params.command.message) {
        if (typeof (params.command.message) != 'string') {params.command.message = JSON.stringify(params.command.message)}
        try {
          params.command.message = params.command.message.replace(/<__n__>/g, '\n');
          metaLog({type:LOG_TYPE.VERBOSE, content:'Emitting: ' + params.command.message});
          if (params.connection.connections[connectionIndex]) {
            let theConnection = params.connection.connections[connectionIndex];
            if (theConnection.connector && theConnection.connector.readyState != 1)
            {
              metaLog({type:LOG_TYPE.VERBOSE, content:"Waiting for WebScoket connection to be done"});
              setTimeout(() => {
                if (params.connection.connections) {
                  connectionIndex = params.connection.connections.find((con) => {return con.descriptor == params.command.connection});
                  theConnection = params.connection.connections[connectionIndex];
                  metaLog({type:LOG_TYPE.VERBOSE, content:"Retrying to send the message"});
                  if (theConnection && theConnection.connector && theConnection.connector.readyState == 1) {
                    theConnection.connector.send(params.command.message)
                  };
                  if (theConnection && theConnection.connector && theConnection.connector.readyState) {
                    resolve({'readystate':theConnection.connector.readyState});
                  }
                  else {resolve({'readystate':-1});}
                }
                else {resolve({'readystate':-1});}
              }, 1000)
            }
            else {
              theConnection.connector.send(params.command.message);
              resolve({'readystate':theConnection.connector.readyState});
            }
          }
        }
        catch (err) {
          metaLog({type:LOG_TYPE.WARNING, content:'Error while sending message to the target device.'});
          metaLog({type:LOG_TYPE.WARNING, content:err});
          resolve({'readystate':undefined, 'error':err});
        }
      }
    });
  }
  query(params) {
    return new Promise(function (resolve, reject) {
      try {
        if (params.query) {
          metaLog({type:LOG_TYPE.WARNING, content:params});
          metaLog({type:LOG_TYPE.WARNING, content:JSONPath(params.query, params.data)});
          resolve(JSONPath(params.query, params.data));
        }
        else {
          resolve(params.data);
        }
      }
      catch (err) {
        metaLog({type:LOG_TYPE.ERROR, content:err});
        resolve('');
      }
    });
  }
  
  startListen(params, deviceId) {
    return new Promise(function (resolve, reject) {
      try {
        if (!params.connection) {params.connection = {}}
        if  (!params.connection.connections) { params.connection.connections = []};
        if (typeof (params.command) == 'string') { params.command = JSON.parse(params.command); }
        metaLog({type:LOG_TYPE.INFO, content:'Starting to listen with this params:'});
        metaLog({type:LOG_TYPE.INFO, content:params});
        metaLog({type:LOG_TYPE.INFO, content:params.command.connection});
        if (params.command.connection)
        {
          let connectionIndex = params.connection.connections.findIndex((con)=> {return con.descriptor == params.command.connection});
            try {
            if (connectionIndex<0) {
              let connector = new WebSocket(params.command.connection);
              params.connection.connections.push({"descriptor": params.command.connection, "connector": connector});
              connectionIndex = params.connection.connections.length - 1;
            }
            else {
              if (params.connection.connections[connectionIndex] && params.connection.connections[connectionIndex].connector && params.connection.connections[connectionIndex].connector.readyState != 1) {
                try {
                  params.connection.connections[connectionIndex].connector.terminate();  
                }
                catch (err) {
                  metaLog({type:LOG_TYPE.VERBOSE, content:'Disposing unused socket.'});
                }  
                params.connection.connections[connectionIndex].connector = new WebSocket(params.command.connection);;
              }
              else {
                resolve();
                return;
              }
            }
            if (params.connection.connections[connectionIndex] && params.connection.connections[connectionIndex].connector) {
              params.connection.connections[connectionIndex].connector.on('error', (result) => { 
                metaLog({type:LOG_TYPE.WARNING, content:'Error event called on the webSocket.'});
                metaLog({type:LOG_TYPE.VERBOSE, content:result});
              });
              params.connection.connections[connectionIndex].connector.on('close', (result) => { 
                if (params.connection.connections) {
                  metaLog({type:LOG_TYPE.VERBOSE, content:'Close event called on the webSocket with connection index:' + connectionIndex});
                  metaLog({type:LOG_TYPE.VERBOSE, content:result});
                }
              });
              params.connection.connections[connectionIndex].connector.on('open', (result) => { 
                try {
                  metaLog({type:LOG_TYPE.INFO, content:'Connection webSocket open.'});
                  metaLog({type:LOG_TYPE.VERBOSE, content:'New Connection Index:' + connectionIndex});
                  params.connection.connections[connectionIndex].connector.on((params.command.message?params.command.message:'message'), (result) => { 
                    params._listenCallback(result, params.listener, deviceId); 
                  });
                }
                catch (err) {
                  metaLog({type:LOG_TYPE.WARNING, content:'Error while intenting connection to the target device.'});
                  metaLog({type:LOG_TYPE.WARNING, content:err});
                }
              });
              resolve('');
            }
          }
          catch (err) {
            metaLog({type:LOG_TYPE.WARNING, content:'Error while intenting connection to the target device.'});
            metaLog({type:LOG_TYPE.WARNING, content:err});
            resolve('');
          }
        }   
      }
      catch (err) {
        metaLog({type:LOG_TYPE.ERROR, content:'Error with listener configuration.'});
        metaLog({type:LOG_TYPE.ERROR, content:err});
        resolve('');
      }

    });
  }
  stopListen(params) {
//    metaLog({type:LOG_TYPE.ERROR, content:params});
  }

  wrapUp(connection) { 
    return new Promise(function (resolve, reject) {
      metaLog({type:LOG_TYPE.VERBOSE, content:'WebSocket WrapUp'});
      if (connection && connection.connections) {
        while (connection.connections.length > 0)
        {
          metaLog({type:LOG_TYPE.VERBOSE, content:'WebSocket WrapUp'});
          //connection.connections[connection.connections.length-1]?connection.connections[connection.connections.length-1].terminate():"";
          connection.connections[connection.connections.length-1] = null;
          connection.connections.pop();
        }
        connection.connections = null;
      }
      resolve();
   })
  }
}
exports.webSocketProcessor = webSocketProcessor;
class jsontcpProcessor {
  initiate(connection) {
    return new Promise(function (resolve, reject) {
      //if (connection.connector == "" || connection.connector == undefined) {
      rpc.SocketConnection.$include({
        write: function ($super, data) {
          return $super(data + "\r\n");
        },
        call: function ($super, method, params, callback) {
          if (!lodash.isArray(params) && !lodash.isObject(params)) {
            params = [params];
          }
          `A`;
          var id = null;
          if (lodash.isFunction(callback)) {
            id = ++this.latestId;
            this.callbacks[id] = callback;
          }

          var data = JSON.stringify({ jsonrpc: '2.0', method: method, params: params, id: id });
          this.write(data);
        }
      });
      let mySocket = rpc.Client.$create(1705, connection.descriptor, null, null);
      mySocket.connectSocket(function (err, conn) {
        if (err) {
          metaLog({type:LOG_TYPE.ERROR, content:'Error connecting to the target device.'});
          metaLog({type:LOG_TYPE.ERROR, content:err});
        }
        if (conn) {
          connection.connector = conn; 
          metaLog({type:LOG_TYPE.VERBOSE, content:'Connection to the JSONTCP device successful'});
          resolve(connection);
        }
      });
      //} //to avoid opening multiple
    });
  }
  process(params) {
    return new Promise(function (resolve, reject) {
      if (typeof (params.command) == 'string') { params.command = JSON.parse(params.command); }

      if (params.command.call) {
        params.connection.connector.call(params.command.call, params.command.message, function (err, result) {
          if (err) { 
            metaLog({type:LOG_TYPE.ERROR, content:err});
          }
          resolve(result);
        });

      }
    });
  }
  query(params) {
    return new Promise(function (resolve, reject) {
      try {
        if (params.query) {
          resolve(JSONPath(params.query, params.data));
        }
        else {
          resolve(params.data);
        }
      }
      catch (err) {
        metaLog({type:LOG_TYPE.ERROR, content:err});
      }
    });
  }
  startListen(params, deviceId) {
    return new Promise(function (resolve, reject) {
      params.socketIO.on(params.command, (result) => { params._listenCallback(result, params.listener, deviceId); });
      resolve('');
    });
  }
  stopListen(params) {
    metaLog({type:LOG_TYPE.INFO, content:'Stop listening to the device.'});
  }
}
exports.jsontcpProcessor = jsontcpProcessor;
function convertXMLTable2JSON(TableXML, indent, TableJSON) {
  return new Promise(function (resolve, reject) {
    parserXMLString.parseStringPromise(TableXML[indent]).then((result) => {
      if (result) {
        TableJSON.push(result);
        indent = indent + 1;
        if (indent < TableXML.length) {
          resolve(convertXMLTable2JSON(TableXML, indent, TableJSON));
        }
        else {
          resolve(TableJSON);
        }

      }
      else {
        metaLog({type:LOG_TYPE.ERROR, content:err});
      }
    });
  });
}
class httpgetSoapProcessor {
  initiate(connection) {
    return new Promise(function (resolve, reject) {
      resolve();
    });
  }  
  process(params) {
    return new Promise(function (resolve, reject) {
      http(params.command)
        .then(function (result) {
          resolve(result.data);
        })
        .catch((err) => { reject(err); });
    });
  }
  query(params) {
    return new Promise(function (resolve, reject) {
      if (params.query) {
        try {
          var doc = new xmldom().parseFromString(params.data);
          //console.log('RAW XPATH Return elt 0.1: ' + doc);
          //console.log('RAW XPATH Return elt 0.1: ' + query);
          var nodes = xpath.select(params.query, doc);
          //console.log('RAW XPATH Return elt : ' + nodes);
          //console.log('RAW XPATH Return elt 2: ' + nodes.toString());
          let JSonResult = [];
          convertXMLTable2JSON(nodes, 0, JSonResult).then((result) => {
   //         console.log('Result of conversion +> ');
     //       console.log(result);
            resolve(result);
          });
        }
        catch (err) {
          metaLog({type:LOG_TYPE.ERROR, content:err});
        }
      }
      else { resolve(params.data); }
    });
  }
  listen(params) {
    return '';
  }
}
exports.httpgetSoapProcessor = httpgetSoapProcessor;
class httppostProcessor {
  initiate(connection) {
    return new Promise(function (resolve, reject) {
      resolve();
    });
  }
  process(params) {
    return new Promise(function (resolve, reject) {
      try {
        if (typeof (params.command) == 'string') { params.command = JSON.parse(params.command); }
        if (params.command.call) {
          http.post(params.command.call, params.command.message)
            .then(function (result) {
              resolve(result.data);
            })
            .catch((err) => {  metaLog({type:LOG_TYPE.ERROR, content:err});reject(err); });
        }
        else { reject('no post command provided or improper format'); }
      }
      catch (err) {
        metaLog({type:LOG_TYPE.ERROR, content:"Error during Post command processing : " + params.command.call + " - " + params.command.message});
        metaLog({type:LOG_TYPE.ERROR, content:err});
      }      
    });
  }
  query(params) {
    return new Promise(function (resolve, reject) {
      try {
        resolve(JSONPath(params.query, JSON.parse(params.data)));
      }
      catch (err) {
        metaLog({type:LOG_TYPE.ERROR, content:err});
      }
    });
  }
  listen(params) {
    return '';
  }
}
exports.httppostProcessor = httppostProcessor;
class staticProcessor {
  initiate(connection) {
    return new Promise(function (resolve, reject) {
      resolve();
    });
  }
  process(params) {
    return new Promise(function (resolve, reject) {
      resolve(params.command);
    });
  }
  query(params) {
    return new Promise(function (resolve, reject) {
      try {
        if (params.query != undefined  && params.query != '') {
          resolve(JSONPath(params.query, JSON.parse(params.data)));
        }
        else {
          if (params.data != undefined) {
            if (typeof(params.data) == string){
              resolve(JSON.parse(params.data));
            }
            else 
            {
              resolve(params.data)
            }
          }
          else { resolve(); }
        }
      }
      catch {
        metaLog({type:LOG_TYPE.INFO, content:'Value is not JSON after processed by query: ' + params.query + ' returning as text:' + params.data});
        resolve(params.data)
      }
    });
  }
  startListen(params, deviceId) {
    return new Promise(function (resolve, reject) {
      clearInterval(params.listener.timer);
      params.listener.timer = setInterval(() => {
        params._listenCallback(params.command, params.listener, deviceId);
        resolve(params.command)
      }, (params.listener.pooltime ? params.listener.pooltime : 1000));
      if (params.listener.poolduration && (params.listener.poolduration != '')) {
        setTimeout(() => {
          clearInterval(params.listener.timer);
        }, params.listener.poolduration);
      }
    });
  }
  stopListen(params) {
    clearInterval(params.timer);
  }
}
exports.staticProcessor = staticProcessor;
class mDNSProcessor {
  initiate(connection) {
    return new Promise(function (resolve, reject) {
      resolve();
    });
  }
  process(params) {
    return new Promise(function (resolve, reject) {
      resolve(JSON.stringify(meta.localDevices));
    });
  }
  query(params) {
    return new Promise(function (resolve, reject) {
      try {
        if (params.query != undefined  && params.query != '') {
          resolve(JSONPath(params.query, JSON.parse(params.data)));
        }
        else {
          if (params.data != undefined) {
            if (typeof(params.data) == string){
              resolve(JSON.parse(params.data));
            }
            else 
            {
              resolve(params.data)
            }
          }
          else { resolve(); }
        }
      }
      catch {
        metaLog({type:LOG_TYPE.INFO, content:'Value is not JSON after processed by query: ' + params.query + ' returning as text:' + params.data});
        resolve(params.data)
      }
    });
  }
  startListen(params, deviceId) {
    return new Promise(function (resolve, reject) {
      clearInterval(params.listener.timer);
      params.listener.timer = setInterval(() => {
        params._listenCallback(params.command, params.listener, deviceId);
        resolve(params.command)
      }, (params.listener.pooltime ? params.listener.pooltime : 1000));
      if (params.listener.poolduration && (params.listener.poolduration != '')) {
        setTimeout(() => {
          clearInterval(params.listener.timer);
        }, params.listener.poolduration);
      }
    });
  }
  stopListen(params) {
    clearInterval(params.timer);
  }
}
exports.mDNSProcessor = mDNSProcessor;

class cliProcessor {
  initiate(connection) {
    return new Promise(function (resolve, reject) {
      resolve();
    });
  }
  process(params) {
    return new Promise(function (resolve, reject) {
      try {
        exec(params.command, (stdout, stderr) => {
          if (stdout) {
            resolve(stdout);
          }
          else {
            resolve(stderr);
          }
        });
      }
      catch (err) {
        resolve(err);
      }
    });
  }
  query(params) {
    return new Promise(function (resolve, reject) {
      try {
        //let resultArray = new [];
        if (params.query!=undefined) {
          if (params.query!="") {
            let literal = params.query.slice(params.query.indexOf('/')+1, params.query.lastIndexOf('/'));
            let modifier = params.query.slice(params.query.lastIndexOf('/')+1);
            metaLog({type:LOG_TYPE.VERBOSE, content:"RegEx literal : " + literal + ", regEx modifier : " + modifier});
            let regularEx = new RegExp(literal, modifier);
              resolve(params.data.toString().match(regularEx));
          }
          else {
            resolve(params.data.toString())
          }
        }
        else {resolve();}
      }
      catch (err) {
        metaLog({type:LOG_TYPE.ERROR, content:'error in string.match regex :' + params.query + ' processing of :' + params.data});
        metaLog({type:LOG_TYPE.ERROR, content:err});
      }
    });
  }
  listen(params) {
    return '';
  }
}
exports.cliProcessor = cliProcessor;
class replProcessor {
  initiate(connection) {
    return new Promise(function (resolve, reject) {
      try {
        if (connection.connector != "" && connection.connector != undefined) {
          connection.connector.close();
        } //to avoid opening multiple
        connection.connector = io.connect(connection.descriptor);
        resolve(connection);
      }
      catch (err) {
        metaLog({type:LOG_TYPE.ERROR, content:'Error while intenting connection to the target device.'});
        metaLog({type:LOG_TYPE.ERROR, content:err});
      }
    });
  }
  process(params) {
    return new Promise(function (resolve, reject) {
      if (params.interactiveCLIProcess) {
        params.interactiveCLIProcess.stdin.write(params.command + '\n');
        resolve('Finished ' + params.command);
      }
    });
  }
  query(params) {
    return new Promise(function (resolve, reject) {
      try {
        //let resultArray = new [];
        resolve(params.data.split(params.query));
      }
      catch {
        metaLog({type:LOG_TYPE.ERROR, content:err});
      }
    });
  }
  listen(params) {
    return '';
  }
}
exports.replProcessor = replProcessor;

class mqttProcessor {
  initiate(connection) {
    return new Promise(function (resolve, reject) {
      //nothing to do, it is done globally.
      //connection.connector = mqttClient;
    }); 
  } 
  process (params) {
    return new Promise(function (resolve, reject) {
      if (typeof params.command === 'string') {params.command = JSON.parse(params.command);}
      if (params.command.message) {// here we publish into a topic
        if (typeof params.command.message === 'object') {params.command.message = JSON.stringify(params.command.message);}
        metaLog({type:LOG_TYPE.VERBOSE, content:'MQTT publishing ' + params.command.message + ' to ' + params.command.topic + ' with options : ' + (params.command.options ? JSON.parse(params.command.options) : "")});
        try {
          params.connection.connector.publish(params.command.topic, params.command.message, (params.command.options ? JSON.parse(params.command.options) : ""), (err) => {
            if (err) {
              metaLog({type:LOG_TYPE.ERROR, content:err});
            }
            else {
              metaLog({type:LOG_TYPE.INFO, content:"MQTT Message pushed successfully to : " + params.command.topic});
            }    
            resolve('');        
          });
        }
        catch (err) {
          metaLog({type:LOG_TYPE.ERROR, content:'Meta found an error processing the MQTT command'});
          metaLog({type:LOG_TYPE.ERROR, content:err});
        }
      }
      else {
        metaLog({type:LOG_TYPE.ERROR, content:"Meta Error: Your command MQTT seems incorrect"});
        metaLog({type:LOG_TYPE.ERROR, content:err});
      }
    })
  }
  query(params) {
    return new Promise(function (resolve, reject) {
      if (params.query) {
        try {
          if (typeof (params.data) == 'string') { params.data = JSON.parse(params.data); }
          resolve(JSONPath(params.query, params.data));
        }
        catch (err) {
          metaLog({type:LOG_TYPE.ERROR, content:'error ' + err + ' in JSONPATH ' + params.query + ' processing of :'});
          metaLog({type:LOG_TYPE.ERROR, content:params.data});
        }
      }
      else { resolve(params.data); }
    });
  }
  startListen(params, deviceId) {
    return new Promise(function (resolve, reject) {
        params.connection.connector.subscribe(params.command, (result) => {
        params.connection.connector.on('message', function (topic, message) {
          if (topic == params.command) {
            metaLog({type:LOG_TYPE.VERBOSE, content:'message received : ' + message.toString()});
            params._listenCallback(message.toString(), params.listener, deviceId);
          }
        });
      });
      resolve('');
    });
  }
  stopListen(listen, connection) {
    connection.connector.unsubscribe(listen.command, (err) => {
      if (err) {
        metaLog({type:LOG_TYPE.ERROR, content:err});
      }
      else {
        metaLog({type:LOG_TYPE.INFO, content:"Unsubscribed to : " + listen.command});
      }
    })

  };
  wrapUp() {
    return new Promise(function (resolve, reject) {
      resolve();
    });
  };
}
exports.mqttProcessor = mqttProcessor;
