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
echo "*** STEP 4 - With NODE-RED, your Raspberry will be the king of IOT with many protocols and devices supported ***"
bash <(curl -sL https://raw.githubusercontent.com/node-red/linux-installers/master/deb/update-nodejs-and-nodered)
echo "*** STEP 5 - Now we create the possibility to orchestrate everything using pm2 ***"
wget -qO- https://getpm2.com/install.sh | bash
echo "*** STEP 6 - Now it is time to install the meta ***"
wget https://github.com/jac459/meta/archive/refs/tags/latest.zip
unzip *.zip
mv meta-* meta
rm *.zip
echo "*** STEP 7 - Creating the startup scripts and rebooting, you should see the meta in your neeo now ***"
pm2 start mosquitto
pm2 start node-red
pm2 start ./meta/meta.js
sudo reboot
