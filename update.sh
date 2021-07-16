#!/bin/bash

echo "Hello, this setup program will update meta in your raspberry pi 4"

wget https://raw.githubusercontent.com/jac459/meta/Release/ProcessingManager.js
wget https://raw.githubusercontent.com/jac459/meta/Release/directoryHelper.js
wget https://raw.githubusercontent.com/jac459/meta/Release/drivers.manifest
wget https://raw.githubusercontent.com/jac459/meta/Release/imageHelper.js
wget https://raw.githubusercontent.com/jac459/meta/Release/labelHelper.js
wget https://raw.githubusercontent.com/jac459/meta/Release/meta.js
wget https://raw.githubusercontent.com/jac459/meta/Release/metaController.js
wget https://raw.githubusercontent.com/jac459/meta/Release/metaMessage.js
wget https://raw.githubusercontent.com/jac459/meta/Release/package.json
wget https://raw.githubusercontent.com/jac459/meta/Release/package-lock.json
wget https://raw.githubusercontent.com/jac459/meta/Release/sensorHelper.js
wget https://raw.githubusercontent.com/jac459/meta/Release/settings.js
wget https://raw.githubusercontent.com/jac459/meta/Release/sliderHelper.js
wget https://raw.githubusercontent.com/jac459/meta/Release/switchHelper.js
wget https://raw.githubusercontent.com/jac459/meta/Release/variablesVault.js
npm install

