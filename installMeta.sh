#!/bin/bash

echo "Hello, this setup program will install meta in your raspberry pi 4"

echo "*** STEP 0 - Refresh your system with latest libraries ***"
sudo apt-get update
sudo apt-get upgrade
echo "*** STEP 1 - Install meta's best friend : node.js ***"
curl -sL https://deb.nodesource.com/setup_14.x | sudo -E bash -
sudo apt install -y nodejs
echo "*** STEP 2 - Install node.js best friend: npm (friends of our friends are our friends) ***"
sudo apt install -y npm
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

