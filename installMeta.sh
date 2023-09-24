#!/bin/bash

echo "Hello, this setup program will install meta in your raspberry pi 4"

echo "*** STEP 0 - Refresh your system with latest libraries ***"
sudo apt-get update
sudo apt-get upgrade
echo "*** STEP 1 - Install meta's best friend : node.js and npm ***"
sudo apt-get install -y ca-certificates curl gnupg
sudo mkdir -p /etc/apt/keyrings
curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | sudo gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg
NODE_MAJOR=20
echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_$NODE_MAJOR.x nodistro main" | sudo tee /etc/apt/sources.list.d/nodesource.list
sudo apt-get update
sudo apt-get install nodejs -y
echo "*** STEP 2 - Install node.js 2nd best friend: git ***"
sudo apt install -y npm
sudo apt install git
echo "*** STEP 3 - Make your Raspberry a communication Champion with mosquitto, the best MQTT broker to communicate with your devices and hubs ***"
sudo apt install -y mosquitto
sudo systemctl stop mosquitto.service
sudo systemctl disable mosquitto.service
echo "*** STEP 4 - With NODE-RED, your Raspberry will be the king of IOT with many protocols and devices supported ***"
bash <(curl -sL https://raw.githubusercontent.com/node-red/linux-installers/master/deb/update-nodejs-and-nodered)
echo "*** STEP 5 - Now we create the possibility to orchestrate everything using pm2 ***"
sudo npm install -g pm2
echo "*** STEP 6 - Now it is time to install the meta ***"
mkdir meta
cd meta
mkdir active
mkdir library
wget https://raw.githubusercontent.com/jac459/meta/Release/settings.js -O settings.js
bash <(wget -qO- https://raw.githubusercontent.com/jac459/meta/Release/update.sh)
echo "*** STEP 7 - Creating the startup scripts and rebooting, you should see the meta in your neeo now ***"
pm2 start mosquitto
pm2 start node-red
pm2 start meta.js
pm2 save
cd ..
