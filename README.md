As I am working quite a lot on this driver nowadays, don't hesitate to supporte me to buy coffee. More coffees help me getting awake longer time and being more productive :-). \
https://www.paypal.me/jac459

# meta
Drivers development and execution platform for neeo remote (metadriver reloaded)
You can join the community.. \
..on Discord: https://discord.gg/3nuUZwXVXA \
..or on Telegram (backup): https://t.me/joinchat/NocMDU9RCVP9hSCJxPsCEg
 
#### Currently supported Drivers:
##### 1 - Roon Driver (control your roon music/zones/outputs)
Demo: https://www.youtube.com/watch?v=iphGhOKRXJQ \
Specific install instructions: https://github.com/jac459/meta-roon
##### 2 - Broadlink Driver (learn and send IR codes)
Demo: https://www.youtube.com/watch?v=Ub8pFTeWAiU \
Specific install instructions: https://github.com/jac459/meta-broadlink 
##### 3 - Philips Hue Driver (as the standard Philips Hue but with color change capability)
Instructions: https://github.com/jac459/meta-hue
##### 4 - Volumio (Music player)
Demo: https://www.youtube.com/watch?v=ybQrpgSK1yM&t=34 \
Instructions: https://github.com/jac459/meta-volumio
##### 5 - Yamaha AVR
Instrutions: https://github.com/jac459/meta-yamahaAVR
  
  
## A - How to install

### Experimental:
Simply use this script to install the meta in your raspberry PI:
wget https://raw.githubusercontent.com/jac459/meta/master/installMeta.sh | . ./installMeta.sh

All following install-processes are done by terminal commands. If you have a display connected to your raspberry pi you can open the LXTerminal for typing the commands. If you are using your raspberry pi in headless mode you can connect to it via PuTTY.
 
### 0 - Prerequisites
The meta needs a few prerequisites for operating. These have to be installed to your pi. Please scroll down to prerequisites section.
 
### 1 - Browse to the Folder where you want to install the Package
For convenience it is recommended to install the meta driver to the folder /home/pi. This is the home folder. If you want to install to a different location you can type "cd" followed by the path. \
Howewer if you want to install to the home folder you dont need specifically browse to that location after opening the terminal. This is because the home folder is the default location.
  
### 2 - Download and unzip the Package
Now use the command "wget" followed by the link to the latest verison to download the package. This will download the .zip to your home folder. \
Note: From macOs, you may need to install wget first using: brew install wget

 ```
 wget https://github.com/jac459/meta/archive/refs/tags/0.9.5.zip
 ```
 
Next unzip the downloaded package with the following command:
 ```
 unzip 0.9.5.zip
 ```

Now rename the unziped folder to just "meta":
 ```
 mv meta-0.9.5 meta
 ```

The downloaded .zip can now be removed with the following command:
 ```
 rm 0.9.5.zip
 ```

### 3 - Install the meta Driver
Now that you have downloaded and unzipped the files from the repository you need to install all linked repositories/ dependancies. For this you first have to browse into the meta folder with:
 ```
 cd /home/pi/meta
 ```
 
With the following command all linked dependancies (specified in the package-lock.json in that folder) will be installed:
 ```
 npm install
 ```

You can now "testrun" the meta by typing:
 ```
 node meta '{"LogSeverity":"VERBOSE"}'
 ```

This will run the meta in the opened terminal window. The start option '{"LogSeverity":"VERBOSE"}' will give you an awfull lot of logs. \
You can now go to your NEEO app and search for new devices. As a keyword you can use "meta" to find the related device drivers. Also you can install and (test)run a device if you wish. \
As soon as you close the the terminal window the meta will stop running. Therefore it is recommended to use pm2 for running the driver (chapter 4). \
If you need to run the meta in the terminal for some reason you can type (please make sure you are not running it in pm2 at the same time):
 ```
 cd /home/pi/meta
 node meta '{"LogSeverity":"VERBOSE"}'
 ```
Note: If the meta is not running the commands for installed devices wont be processed. However all installed devices (by NEEO app) will remain installed to your NEEO.

### 3a - Updating the meta Driver
If you already use meta and you have custom drivers in the active folder please make a backup copy outside the meta folder.  \
Next just follow the steps of chapter 2 and 3 to get yourself a fresh package of meta. The old files will be overwritten in the process.

### 4 - Running the meta in pm2
pm2 will make the metadriver run in the background so you dont have to have a terminal open. \
First browse to the install folder of the meta driver:
 ```
 cd /home/pi/meta
 ```
Now start meta in pm2:
 ``` 
 pm2 start meta.js
 ```
To save the the current running processes (including the just started meta.js) in pm2 type:
 ``` 
 pm2 save
 ```
Next we make pm2 restart automatically after rebooting the pi. This will start pm2 with the saved processes:
 ``` 
 pm2 startup
 ```

You are done. 

The meta will now automatically restart after rebooting the pi. You can go to your NEEO app to search for new devices. As a keyword you can use "meta" to find the related device drivers.


#### Some additional pm2 Commands to help you out in special Conditions
List all processes in pm2 (like a "Taskmanager"):
 ```
 pm2 list
 ```
Restart the meta process in pm2:
 ```
 pm2 restart meta
 ```

Stop the meta process in pm2:
 ```
 pm2 stop meta
 ```


## B - Prerequisites
In order to run properly, the meta needs to run next to a MQTT Broker and a node-red server and in a nodejs environment.
This section explains how to install all this in a Raspberry Pi. It is very similar with MacOs (I run it on a M1) and any other linux. This can also be run on windows.

### Setup your Raspberry PI.

#### Get the right image.
Instructions to create an image are very easy, you just need a micro SD card and to visit this address:
https://www.raspberrypi.org/documentation/installation/installing-images/
You want to download the raspberry OS Lite (if you download the not lite version it is not big deal but you will have all desktop software you won't have any use for).
Before puting the card in your raspberry, enable SSH access:
"For headless setup, SSH can be enabled by placing a file named ssh, without any extension, onto the boot partition of the SD card from another computer. When the Pi boots, it looks for the ssh file. If it is found, SSH is enabled and the file is deleted. The content of the file does not matter; it could contain text, or nothing at all."
These instruction are from this page - section 3:
https://www.raspberrypi.org/documentation/remote-access/ssh/

#### Get access to your raspberry
Initially you have to make sure that your raspberry is plugged through LAN as it doesn't know yet your WIFI (it can be setup later).
Then you need an SSH client. Can be easily down through macOS. On windows, you need to download PUTTY tool:
https://www.putty.org/
In the window, just type the IP address of your raspberry (under hostname) and type open
If you didn't change the default, your username are pi and password raspberry (you may want to google that to double check).

#### Install node environment (node and NPM)
 WIP

#### Install mosquitto
 ```
 sudo apt install -y mosquitto mosquitto-clients
 ```

#### Install node-red
 ```
 bash <(curl -sL https://raw.githubusercontent.com/node-red/linux-installers/master/deb/update-nodejs-and-nodered)
 ```

#### Install pm2
 ```
 wget -qO- https://getpm2.com/install.sh | bash
 ```
