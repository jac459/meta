As I am working quite a lot on this driver nowadays, don't hesitate to support me to buy coffee. More coffees help me stay awake for a longer time and be more productive :-). \
https://www.paypal.me/jac459

# meta
Drivers development and execution platform for neeo remote (metadriver reloaded)
You can join the community.. \
..on Discord: https://discord.gg/3nuUZwXVXA \
..or on Telegram (backup): https://t.me/joinchat/NocMDU9RCVP9hSCJxPsCEg
 
#### Some driver examples:
##### Roon Driver (control your roon music/zones/outputs)
Demo: https://www.youtube.com/watch?v=iphGhOKRXJQ \
Specific install instructions: https://github.com/jac459/meta-roon
##### Broadlink Driver (learn and send IR codes)
Demo: https://www.youtube.com/watch?v=Ub8pFTeWAiU \
Specific install instructions: https://github.com/jac459/meta-broadlink 
##### Philips Hue Driver (as the standard Philips Hue but with color change capability)
Instructions: https://github.com/jac459/meta-hue
##### Volumio (Music player)
Demo: https://www.youtube.com/watch?v=ybQrpgSK1yM&t=34 \
Instructions: https://github.com/jac459/meta-volumio
##### Yamaha AVR
Instructions: https://github.com/jac459/meta-yamahaAVR

## A - How to install meta on a pre configured system
Use this command to start a script that will install the meta in your system (for example raspberry PI):
```
bash <(wget -qO- https://raw.githubusercontent.com/jac459/meta/Release/installMeta.sh)
```

## B - How to install meta on a new Rasberry PI (Step by step for total beginners)
##### Hardware needed:
- 1 MicroSd card (8gb Or 16Gb will do, even less I think but I didn't test)
- 1 Raspberry Pi4 (4GB RAM advised, 2GB is largely enough, 1GB works too). Pi3 should work also but discovery may be long.
- 1 Computer.
- 1 Neeo Brain
- 1 MicroSd card reader/writer.

##### Software needed:
- Balena Etcher: https://www.balena.io/etcher/
- RaspbianOS Lite: https://www.raspberrypi.org/software/operating-systems/
- Putty (if in windows, not needed for MacOS): https://www.putty.org/

##### Step 1 - Setup the Raspberry
Insert the microSD in the card reader and in your PC.
DO NOT FORMAT.
Start Balena Etcher. Choose the raspberry OS you have downloaded using the link given on the previous step. Choose the microSD card and click FLASH.
Hence Done, DO NOT FORMAT. Unplug the MicroSD and plug again. DO NOT FORMAT. Go to the disk you just created (should be called BOOT). and at the root of this disk, create a file named ssh. On windows, to do that simply right click and choose to create a text file. Replace the name AND the extension of the file (for example "new file.txt" by "ssh"). This will allow you to get access to your raspberry later.

##### Step 2 - Gain access to the Raspberry
Before pluging your raspberry. You can open a command in your windows (on the magnifier next to the windows button, bottom left, type cmd). In the new black window created, just type arp -a. Leave it like that.
Now you can insert the MicroSD card in your raspberry and plug it. YOU NEED TO USE A NETWORK CABLE AT FIRST. At least for a while, after you can configure wifi but for first boot, just connect through a RJ45 network cable to your router.
When your raspberry as booted, you can go back to the very same black window you opened (or open one in your macos) and type:
```
ping raspberrypi.local
```
This should answer the IP address (something looking like 192.168.1.17 for example) of your newly setup raspberry.
If it fails, try to type again arp -a. This will again give you a list of devices. If you have one more since last time. You are good, you got the IP of your new PI.
If you still didn't manage to get the IP of your raspberry, just logon to your router and get the list of device.
If you still didn't manage, you can try to download a wifi scanner on your phone (better luck if you have android).
Now that you have your IP address, go to PUTTY (if on windows) and type the IP address into the "Host Name (or IP address)" field. Then you can directly click open.
A new window will appears, in the user/password, type pi (as user) and raspberry (as password). You can change later.
You know have access to your raspberry. The window you are seeing now is the one of your raspberry, not the computer you are looking at (magic).

##### Step 3 - Setting up the Raspberry PI
Use this command to start a script that will install the meta in your system:
```
bash <(wget -qO- https://raw.githubusercontent.com/jac459/meta/Release/installMeta.sh)
```
Copy paste this command to your raspberry. In order to copy, you can select and type Ctr+V (or right click and choose copy).
when you go back to the window showing your raspberry, be careful, the copy paste doesn't work this way. Just right click it will paste directy.
Hence this is done, just push the ENTER button.
Now your rapsberry is being configured. It will take a good 20 minutes. You will have to answer yes at some questions (just press y and ENTER) so don't stay to far.
Hence the script is done, you are done.
You can go to neeo and search a new device. You should find the meta-core driver.

##### Step 4 - Setup and learn about metaCore
MetaCore can be used to manage the meta platform from the UI of the NEEO remote.
Visit this page to learn more about metaCore: https://github.com/jac459/meta-core

##### How to update meta later
Meta has a growing set of features and can be updated to gain access to the most recent features and bug fixes.

It is recommended to use [metaCore](https://github.com/jac459/meta-core#update-meta) to update meta. In metaCore go to: Global Settings > update meta

More advanced users can run the same command manually in a command line. First browse to the folder of meta. The default (using the above installMeta.sh) is:
```
cd meta
```
Now run the following command to start a script that will update the meta in your system:
```
bash <(wget -qO- https://raw.githubusercontent.com/jac459/meta/Release/update.sh)
```

## C - How to install meta if You are a Raspberry/Linux Black Belt
- The meta can be installed like any node.js program by taking the files and typing "npm install".
- The meta NEEDS MQTT to run. NODE-RED is highly advised.
- MQTT is expected to not have any authentication.
- Meta-core driver expect node-red, mqtt and meta to by run by pm2. Not by services. This is not a big deal if you don't plan to use it.
- The meta expect 2 folders: library (for all drivers) and active (for activated drivers).
- You can configure the name, port of the meta in order to run multiple instances of the meta (have different names and port for the neeo). This is very useful if you want to run a new version of the meta without taking risk on your previous version.
- You can configure the mqtt instances and the directory names and location of the active and library folders. This is NOT thoroughly tested so trial and error may apply.

##### Running meta (with Logs)
To run meta in a terminal with logging use the following command. But first make sure to stop meta in pm2 (```pm2 stop meta```).
```
node meta '{"LogSeverity":"VERBOSE"}'
```
This way the meta is slower and produce an awful lot of logs. You can try to change the level of log and the component(s) logging:
```
'{"LogSeverity":"INFO","Components":["meta","metaController"]}'
```
##### Force a specific brain address
You can also force to use a specific brain address:
```
'{"Brain":"192.168.1.144","LogSeverity":"INFO","Components":["meta"]}'
```

### If you are a Raspberry/Linux black belt but needs a few reminders:
In order to run properly, the meta needs to run next to a MQTT Broker and a node-red server and in a nodejs environment.
This section explains how to install all this in a Raspberry Pi. It is very similar with MacOs (I run it on a M1) and any other linux. This can also be run on windows.

#### Setting up the Raspberry PI
##### Get the right image
Instructions to create an image are very easy, you just need a micro SD card and to visit this address:
https://www.raspberrypi.org/documentation/installation/installing-images/
You want to download the raspberry OS Lite (if you download the not lite version it is not big deal but you will have all desktop software you won't have any use for).
Before puting the card in your raspberry, enable SSH access:
"For headless setup, SSH can be enabled by placing a file named ssh, without any extension, onto the boot partition of the SD card from another computer. When the Pi boots, it looks for the ssh file. If it is found, SSH is enabled and the file is deleted. The content of the file does not matter; it could contain text, or nothing at all."
These instruction are from this page - section 3:
https://www.raspberrypi.org/documentation/remote-access/ssh/

##### Get access to your Raspberry
Initially you have to make sure that your raspberry is plugged through LAN as it doesn't know yet your WIFI (it can be setup later).
Then you need an SSH client. Can be easily down through macOS. On windows, you need to download PUTTY tool:
https://www.putty.org/
In the window, just type the IP address of your raspberry (under hostname) and type open
If you didn't change the default, your username are pi and password raspberry (you may want to google that to double check).

#### Installing related Software/ Packages
##### Install node environment (node and NPM)
WIP

##### Install mosquitto
```
sudo apt install -y mosquitto mosquitto-clients
```

##### Install node-red
```
bash <(curl -sL https://raw.githubusercontent.com/node-red/linux-installers/master/deb/update-nodejs-and-nodered)
```

##### Install pm2
```
wget -qO- https://getpm2.com/install.sh | bash
```

### Running the meta in pm2
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


##### Some additional pm2 Commands to help you out in special Conditions
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

## Releases
### v1.0.1 (current release)
- Main drivers supported: 
  - Hue, Yamaha AVR, Broadlink (Generic + Air Conditionnated), Volumio, Roon, Kodi, LG webOS.
- Main features:
  - 0.9.8 features
  - meta-core driver allowing to download and install new drivers, reset drivers (datastore) or update the meta
  - improved discovery (for maker).
- Missing features: N/A
- Known bugs: N/A

### v0.9.8 
- Main drivers supported: 
  - Hue, Yamaha AVR, Broadlink (Generic + Air Conditionnated), Volumio, Roon, Kodi, LG webOS.
- Main features:
  - 0.9.5 features
  - full support of websockets
  - buttons in list
  - wake-on-lan capability
  - installation shell
  - meta management driver with capacity to restart meta components, reset the drivers datastore.
- Missing features: N/A
- Known bugs: N/A

### v0.9.5
- Main drivers supported:
  - Hue, Yamaha AVR, Broadlink (Generic + Air Conditionnated), Volumio, Roon.
- Main features:
  - Standard features
  - node-red usage for broadlink
  - enhanced discovery
  - enhanced devices monitoring 
  - hosting in raspberry pi4
- Missing features: meta management driver not compatible yet.
- Known bugs: When adding a device, refreshing the page could generate double monitoring of device (waste of resources).
