const neeoapi = require('neeo-sdk');
const path = require('path');
const settings = require(path.join(__dirname,'settings'));
const variablePattern = {'pre':'$','post':''};
const RESULT = variablePattern.pre + 'Result' + variablePattern.post;
const BROWSEID = variablePattern.pre + 'NavigationIdentifier' + variablePattern.post;
const MQTT = 'mqtt';
//LOGGING SETUP AND WRAPPING
//Disable the NEEO library console warning.
const { metaMessage, LOG_TYPE } = require("./metaMessage");
console.error = console.info = console.debug = console.warn = console.trace = console.dir = console.dirxml = console.group = console.groupEnd = console.time = console.timeEnd = console.assert = console.profile = function() {};
function metaLog(message) {
  let initMessage = { component:'directoryHelper', type:LOG_TYPE.INFO, content:'', deviceId: null };
  let myMessage = {...initMessage, ...message}
  return metaMessage (myMessage);
} 

class directoryHelper {
  constructor(deviceId, dirname, controller) {
    this.name = dirname;
    this.deviceId = deviceId;
    this.feederH = [];
    this.cacheList = [];
    this.actionId = undefined;
    this.listOffset = 0;
    this.browseHistory = [];
    this.currentFeederIndex = 0;
    this.controller = controller;
    this.previousOffset = 0; //check if we were scrolling;
    var self = this;
    this.addFeederHelper = function (feedConfig) {
      self.feederH.push(feedConfig);
    };
    this.browse = {
      getter: (deviceId, params) => this.fetchList(deviceId, params),
      action: (deviceId, params) => this.handleAction(deviceId, params),
    };

    this.evalNext = function (deviceId, evalnext, result, browseIdentifierValue) {
      if (evalnext) { //case we want to go to another feeder
        evalnext.forEach(evalN => {
          //if (evalN.test == '') {evalN.test = true}; //in case of no test, go to the do function TODO: correction, not working.
          let finalNextTest = self.controller.vault.readVariables(evalN.test, deviceId);// prepare the test to assign variable and be evaluated.
          finalNextTest = self.controller.assignTo(RESULT, finalNextTest, result);
          if (browseIdentifierValue) {
            finalNextTest = self.controller.assignTo(BROWSEID, finalNextTest, browseIdentifierValue);
          }
          if (finalNextTest) {
            if (evalN.then && evalN.then != '')
            {
              self.currentFeederIndex = self.feederH.findIndex((feed) => {return (feed.name == evalN.then)});
            }
          }
          else { 
            if (evalN.or && evalN.or != '')
            {
              self.currentFeederIndex = self.feederH.findIndex((feed) => {return (feed.name == evalN.or)});
            }
          }
        })
      }
    }

    this.fetchList = function (deviceId, params) { //browse management and delegation to feeders. to be refactored later>
      return new Promise(function (resolve, reject) {
      metaLog({type:LOG_TYPE.VERBOSE, content:'Fetch Parameters : ' + JSON.stringify(params), deviceId:deviceId});
      self.listOffset = params.offset;
      if (params.browseIdentifier != undefined && params.browseIdentifier != '') { //case were a directory was selected in the list
        //Take the good feeder:
        //Take the good commandset:
        let PastQueryId = params.browseIdentifier.split("$PastQueryId=")[1];
        if (self.actionId != undefined) {
          PastQueryId = self.actionId;
          self.actionId = undefined;          
        }
        let PastQueryValue = self.cacheList[PastQueryId].myPastQuery;
        params.browseIdentifier = params.browseIdentifier.split("$PastQueryId=")[0];
        let commandSetIndex = params.browseIdentifier.split("$CommandSet=")[1];
        params.browseIdentifier = params.browseIdentifier.split("$CommandSet=")[0];
        if (self.cacheList[PastQueryId].action == undefined || self.cacheList[PastQueryId].action == "") {
          //new oct 2021
          let tmpCommandSet = JSON.stringify(self.feederH[self.currentFeederIndex].commandset[commandSetIndex]);
          tmpCommandSet = tmpCommandSet.replace(/\$ListIndex/g, PastQueryId);
          tmpCommandSet = JSON.parse(tmpCommandSet);
          self.controller.evalWrite(tmpCommandSet.evalwrite, PastQueryValue, deviceId);
          self.controller.evalDo(tmpCommandSet.evaldo, PastQueryValue, deviceId);
        }
        self.evalNext(deviceId, self.feederH[self.currentFeederIndex].commandset[commandSetIndex].evalnext, PastQueryValue, params.browseIdentifier);//assign the good value to know the feeder
      }
      else if (params.history != undefined && params.history.length>0 && params.offset==0 && self.previousOffset == 0) {//case where we browse backward
        self.currentFeederIndex = self.browseHistory[params.history.length];
        if (self.currentFeederIndex == undefined) {self.currentFeederIndex = 0;}
        metaLog({type:LOG_TYPE.VERBOSE, content:'current feeder' + self.currentFeederIndex, deviceId:deviceId});
      }
      else if ( params.offset != undefined && params.offset>0) {
        self.previousOffset = params.offset;
      }
      else if ( params.offset != undefined && params.offset==0 && self.previousOffset > 0) {//we were scrolling and get back to begining of list either by up scroll or back button
        self.previousOffset = 0;
      }
      else {
        self.currentFeederIndex = 0
      } // beginning

      if (params.history != undefined) {
        if (self.browseHistory.length<params.history.length) {
          self.browseHistory.push(self.currentFeederIndex) //memorize the path of browsing for feeder 
        }
        else {self.browseHistory[params.history.length] = self.currentFeederIndex}
      }

      self.actionId = undefined;          

      self.fetchCurrentList(deviceId, self.feederH[self.currentFeederIndex], params)
          .then((list) => {resolve(list);})
          .catch((err) => { reject(err); });
      });
    };

    this.fetchCurrentList = function (deviceId, allconfigs, params) {
      metaLog({type:LOG_TYPE.VERBOSE, content:"params: " + JSON.stringify(params) + " - browseIdentifier: " + params.browseIdentifier + " - actionIdentifier: " + params.actionIdentifier + " - current feeder: " + self.currentFeederIndex, deviceId:deviceId});
      self.cacheList = [];
      return new Promise(function (resolve, reject) {
        
//        self.currentCommandResult = [];//initialise as new commands will be done now.
        try {
         self.fillTheList(deviceId, allconfigs, params, 0, 0).then(() => {//self.cacheList, allconfigs, params, indentCommand
            //Feed the neeo list
         let neeoList;
            neeoList = neeoapi.buildBrowseList({
              title: allconfigs.name,
              totalMatchingItems: self.cacheList.length,
              limit: 64,
              offset: (params.offset || 0),
            });
            var i;
            for (i = (params.offset || 0); (i < ((params.offset || 0) + 64) && (i < self.cacheList.length)); i++) {
              if (self.cacheList[i].itemtype == 'tile') {
                let tiles = [];
                tiles.push({
                    thumbnailUri: self.cacheList[i].image ? self.cacheList[i].image : "https://raw.githubusercontent.com/jac459/meta-core/main/pics/meta.jpg",
                    actionIdentifier: self.cacheList[i].action, //For support of index
                    uiAction: self.cacheList[i].UI ? self.cacheList[i].UI : ''
                })
                if ((i+1 < self.cacheList.length) && (self.cacheList[i+1].itemtype == 'tile')) {
                  //test if the next item is also a tile to put on the right, if it is not the end of the list
                  i++
                  tiles.push({
                    thumbnailUri: self.cacheList[i].image ? self.cacheList[i].image : "https://raw.githubusercontent.com/jac459/meta-core/main/pics/meta.jpg",
                    actionIdentifier: self.cacheList[i].action,
                    uiAction: self.cacheList[i].UI ? self.cacheList[i].UI : ((self.cacheList[i].action != '' || self.cacheList[i].action != undefined) ? '' : 'reload'),
                  });
                }
                neeoList.addListTiles(tiles);
              }
              else if (self.cacheList[i].itemtype == 'button') {
                let buttonLine = [];
                buttonLine.push({title:self.cacheList[i].name, uiAction:'reload',iconName:self.cacheList[i].image,inverse:self.cacheList[i].UI,actionIdentifier:self.cacheList[i].action});
                if (self.cacheList[i+1] && self.cacheList[i+1].itemtype == "button" && self.cacheList[i+2] && self.cacheList[i+2].itemtype == "button") {
                  buttonLine.push({title:self.cacheList[i+1].name, uiAction:'reload',iconName:self.cacheList[i+1].image,inverse:self.cacheList[i+1].UI,actionIdentifier:self.cacheList[i+1].action});
                  buttonLine.push({title:self.cacheList[i+2].name, uiAction:'reload',iconName:self.cacheList[i+2].image,inverse:self.cacheList[i+2].UI,actionIdentifier:self.cacheList[i+2].action});
                  i=i+2;
                }
                if (self.cacheList[i+1] && self.cacheList[i+1].itemtype == "button") {
                  buttonLine.push({title:self.cacheList[i+1].name, uiAction:'reload',iconName:self.cacheList[i+1].image,inverse:(self.cacheList[i+1].UI?self.cacheList[i+1].UI:false),actionIdentifier:self.cacheList[i+1].action});
                  i=i+1;
                }
                neeoList.addListButtons(buttonLine);
             }
             else if (self.cacheList[i].itemtype == 'info') {
//              let UI = JSON.parse(self.cacheList[i].UI);
//              metaLog({type:LOG_TYPE.ERROR, content:self.cacheList[i], deviceId:deviceId});
//              metaLog({type:LOG_TYPE.ERROR, content:UI.affirmative, deviceId:deviceId});
//              metaLog({type:LOG_TYPE.ERROR, content:UI.negative, deviceId:deviceId});

              neeoList.addListInfoItem({
                  title: self.cacheList[i].name,
                  text: self.cacheList[i].label,
                  //affirmativeButtonText:  "UI.affirmative",
                  //negativeButtonText: UI.negative ? UI.negative : undefined,
                  //actionIdentifier: self.cacheList[i].action,
                });
              }
              else {
                neeoList.addListItem({
                title: self.cacheList[i].name,
                label: self.cacheList[i].label,
                thumbnailUri: self.cacheList[i].image,
                actionIdentifier: self.cacheList[i].action, //For support of index
                browseIdentifier: self.cacheList[i].browse,
                uiAction: self.cacheList[i].UI ? self.cacheList[i].UI : ((self.cacheList[i].action != '' || self.cacheList[i].action != undefined) ? '' : 'reload'),
              });
             }
            }
            resolve(neeoList);
          })
        }
        catch (err) {
          metaLog({type:LOG_TYPE.ERROR, content:'Problem refreshing the list', deviceId:deviceId});
        }
      })
    }

    this.fillTheList = function (deviceId, allconfigs, params, indentCommand) {
        let rAction;
        let rUI;
        let rBrowse;
        let rName;
        let rItemType;
        let rImage;
        let rLabel;
        return new Promise(function (resolve, reject) {
          if (indentCommand < allconfigs.commandset.length) {
            //new jult 2021
            //self.cacheList, allconfigs, params, indentCommand
            let commandSet = allconfigs.commandset[indentCommand];
            let processedCommand = self.controller.vault.readVariables(commandSet.command, deviceId);
            if (processedCommand) {processedCommand = processedCommand.replace(/\$ListOffset/g, self.listOffset);}
            processedCommand = self.controller.assignTo(BROWSEID, processedCommand, params.browseIdentifier);
            metaLog({type:LOG_TYPE.VERBOSE, content:'Final processed Command:', deviceId:deviceId});
            metaLog({type:LOG_TYPE.VERBOSE, content:processedCommand, deviceId:deviceId});
            self.controller.commandProcessor(processedCommand, commandSet.type, deviceId)
              .then((result) => {
                rName = self.controller.vault.readVariables(commandSet.itemname, deviceId); //ensure that the item name chain has the variable interpreted (except $Result)
                rImage = self.controller.vault.readVariables(commandSet.itemimage, deviceId); 
                rItemType = self.controller.vault.readVariables(commandSet.itemtype, deviceId); 
                rLabel = self.controller.vault.readVariables(commandSet.itemlabel, deviceId); 
                rAction = self.controller.vault.readVariables(commandSet.itemaction, deviceId); 
                rUI = self.controller.vault.readVariables(commandSet.itemUI, deviceId); 
                rBrowse = self.controller.vault.readVariables(commandSet.itembrowse, deviceId); 
                self.controller.queryProcessor(result, commandSet.queryresult, commandSet.type, deviceId).then ((tempResultList) => {
                  let resultList = [];
                  if (!Array.isArray(tempResultList)) {//must be an array so make it an array if not
                    if (tempResultList) {
                    resultList.push(tempResultList);
                    }
                  }
                  else {resultList = tempResultList;}

                  resultList.forEach(oneItemResult => { //As in this case, $Result is a table, transform $Result to get every part of the table as one $Result
                    let action = undefined;
                    if (rAction) {
                      let valAction = self.controller.assignTo(RESULT, rAction, oneItemResult);
                      if (valAction != undefined) {
                         action = valAction+"$CommandSet="+indentCommand+"$PastQueryId=" + (self.cacheList.length);
                      }
                    }
                    //new Oct 2021
                    let cacheListItem = {
                      'myPastQuery' : ((typeof(oneItemResult) == 'string')?oneItemResult:JSON.stringify(oneItemResult)),
                      'name' : self.controller.assignTo(RESULT, rName, oneItemResult),
                      'image' : self.controller.assignTo(RESULT, rImage, oneItemResult),
                      'itemtype' : rItemType,
                      'label' : self.controller.assignTo(RESULT, rLabel, oneItemResult),
                      'action' : action,
                      'UI' : rUI ? self.controller.assignTo(RESULT, rUI, oneItemResult):"",
                      'browse' : "$CommandSet="+indentCommand+"$PastQueryId=" + (self.cacheList.length)
                    };
                    cacheListItem = JSON.stringify(cacheListItem);
                    cacheListItem = cacheListItem.replace(/\$ListIndex/g, self.cacheList.length);
                    cacheListItem = JSON.parse(cacheListItem);
                    self.cacheList.push(cacheListItem);
                    metaLog({type:LOG_TYPE.VERBOSE, content:self.cacheList.length, deviceId:deviceId});

                  });
                  resolve(self.fillTheList(deviceId, allconfigs, params, indentCommand + 1));
                })
                
              })
              .catch(function (err) {
                metaLog({type:LOG_TYPE.ERROR, content:'Fetching Error', deviceId:deviceId});
                metaLog({type:LOG_TYPE.ERROR, content:err, deviceId:deviceId});
              });
          }
          else {
            resolve(self.cacheList);
          }
        })
    }
    
  

    this.handleAction = function (deviceId, params) {
      return new Promise(function (resolve, reject) {
        self.handleCurrentAction(deviceId, params)
          .then((action) => { resolve(action); })
          .catch((err) => { reject(err); });
      });
    };

    this.handleCurrentAction = function (deviceId, params) {
      return new Promise(function (resolve, reject) {
          
        //here, the action identifier is the result.  
        let PastQueryId = params.actionIdentifier.split("$PastQueryId=")[1];
        self.actionId = PastQueryId;
        let PastQueryValue = self.cacheList[PastQueryId].myPastQuery;
        //MQTT Logging
        self.controller.commandProcessor("{\"topic\":\"" + settings.mqtt_topic + self.controller.name + "/" + deviceId + "/directory/" + self.name + "\",\"message\":\"" + PastQueryId + "\", \"options\":\"{\\\"retain\\\":true}\"}", MQTT, deviceId)
      
        params.actionIdentifier = params.actionIdentifier.split("$PastQueryId=")[0];
        let commandSetIndex = params.actionIdentifier.split("$CommandSet=")[1];
        params.actionIdentifier = params.actionIdentifier.split("$CommandSet=")[0];
        if (self.feederH[self.currentFeederIndex].commandset[commandSetIndex]) {
          let tmpCommandSet = JSON.stringify(self.feederH[self.currentFeederIndex].commandset[commandSetIndex]);
          tmpCommandSet = tmpCommandSet.replace(/\$ListIndex/g, PastQueryId);
          tmpCommandSet = JSON.parse(tmpCommandSet);
          self.controller.evalWrite(tmpCommandSet.evalwrite, PastQueryValue, deviceId);
        }
        //finding the feeder which is actually an action feeder
        let ActionIndex = self.feederH.findIndex((feed) => {return (feed.name == params.actionIdentifier)});

        //Processing all commandset recursively
        if (ActionIndex>=0){

          let tmpActionCommandSet = JSON.stringify(self.feederH[ActionIndex].commandset);
          tmpActionCommandSet = tmpActionCommandSet.replace(/\$ListIndex/g, PastQueryId);
          tmpActionCommandSet = JSON.parse(tmpActionCommandSet);
          resolve(self.executeAllActions(deviceId, PastQueryValue, tmpActionCommandSet, 0));
        }
        else {resolve();}
      });
    };

    this.executeAllActions = function (deviceId, PastQueryValue, allCommandSet, indexCommand) {
      return new Promise(function (resolve, reject) {
        if (indexCommand < allCommandSet.length){
          let commandSet = allCommandSet[indexCommand]; 
          let processedCommand = commandSet.command;
          processedCommand = self.controller.vault.readVariables(processedCommand, deviceId);
          processedCommand = self.controller.assignTo(RESULT, processedCommand, PastQueryValue);
          metaLog({type:LOG_TYPE.VERBOSE, content:processedCommand, deviceId:deviceId});
          self.controller.commandProcessor(processedCommand, commandSet.type, deviceId)
            .then((resultC) => {
          
              self.controller.queryProcessor(resultC, commandSet.queryresult, commandSet.type, deviceId)
              .then ((result) => {

                self.controller.evalWrite(commandSet.evalwrite, result, deviceId);
                self.controller.evalDo(commandSet.evaldo, result, deviceId); 

                resolve(self.executeAllActions(deviceId, result, allCommandSet, indexCommand+1))
              })
              .catch ((err) => {
                metaLog({type:LOG_TYPE.ERROR, content:"Error while parsing the command result.", deviceId:deviceId});
                metaLog({type:LOG_TYPE.ERROR, content:err, deviceId:deviceId});
                resolve(err);
              })
          })
        }
        else
        {
          resolve(); 
        } 
      })           
    };
  }
}
exports.directoryHelper = directoryHelper;