#!/bin/bash

echo "Hello, this setup program will update meta in your raspberry pi 4"
mkdir active
wget https://raw.githubusercontent.com/jac459/meta/Release/ProcessingManager.js -O ProcessingManager.js
wget https://raw.githubusercontent.com/jac459/meta/Release/directoryHelper.js -O directoryHelper.js
wget https://raw.githubusercontent.com/jac459/meta/Release/drivers.manifest -O drivers.manifest
wget https://raw.githubusercontent.com/jac459/meta/Release/imageHelper.js -O imageHelper.js
wget https://raw.githubusercontent.com/jac459/meta/Release/labelHelper.js -O labelHelper.js
wget https://raw.githubusercontent.com/jac459/meta/Release/meta.js -O meta.js
wget https://raw.githubusercontent.com/jac459/meta/Release/metaController.js -O metaController.js
wget https://raw.githubusercontent.com/jac459/meta/Release/metaMessage.js -O metaMessage.js
wget https://raw.githubusercontent.com/jac459/meta/Release/package.json -O package.json
wget https://raw.githubusercontent.com/jac459/meta/Release/sensorHelper.js -O sensorHelper.js
wget https://raw.githubusercontent.com/jac459/meta/Release/sliderHelper.js -O sliderHelper.js
wget https://raw.githubusercontent.com/jac459/meta/Release/switchHelper.js -O switchHelper.js
wget https://raw.githubusercontent.com/jac459/meta/Release/variablesVault.js -O variablesVault.js
wget https://raw.githubusercontent.com/jac459/meta-core/main/metaCore.json -O ./active/metaCore.json
wget -x -nH --cut-dirs=3 https://raw.githubusercontent.com/jac459/meta/Release/lib/certificate/CertificateGenerator.js
wget -x -nH --cut-dirs=3 https://raw.githubusercontent.com/jac459/meta/Release/lib/pairing/PairingManager.js
wget -x -nH --cut-dirs=3 https://raw.githubusercontent.com/jac459/meta/Release/lib/pairing/PairingMessageManager.js
wget -x -nH --cut-dirs=3 https://raw.githubusercontent.com/jac459/meta/Release/lib/pairing/pairingmessage.proto
wget -x -nH --cut-dirs=3 https://raw.githubusercontent.com/jac459/meta/Release/lib/remote/RemoteManager.js
wget -x -nH --cut-dirs=3 https://raw.githubusercontent.com/jac459/meta/Release/lib/remote/RemoteMessageManager.js
wget -x -nH --cut-dirs=3 https://raw.githubusercontent.com/jac459/meta/Release/lib/remote/remotemessage.proto
npm install
