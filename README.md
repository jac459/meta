# meta
 Drivers development and execution platform for neeo remote (metadriver reloaded)
  
 ## A - How to install
 
 ### 0 - Prerequisites: You need a few prerequisites that you wont need anymore once done. Please scroll down to prerequisites section
 
 ### 1 - Go to the folder where you want to install the package
 ### 2 - download and unzip the package: (if you already use meta, don't forget to save your drivers and copy back in the "active" directory)
 ```
 wget https://github.com/jac459/meta/archive/refs/tags/0.9.5.zip
 unzip 0.9.5.zip
 mv meta-0.9.5/* .
 rm 0.9.5.zip
 rm -r meta-0.9.5 
  ```
 Note: From macOs, you may need to install wget first using : brew install wget
 ### 3 - install the driver
 ```
 npm install
 ```
You are done, you can not launch by typing:
```
node meta '{"LogSeverity":"VERBOSE"}'
```
(If you want to see an awfull lot of logs)
When you are good to go to make it run indefinitely:
type (if it is your first run):
``` 
pm2 start meta.js
pm2 save
pm2 startup
```
If you already use meta
```
pm2 restart meta
```

You are done.

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
WIP
#### Install node-red
#### Install pm2





 
