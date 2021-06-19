# meta
 Drivers development and execution platform for neeo remote (metadriver reloaded)
 
 
 
 ## How to install
 
 ### 0 - Prerequisites: You need a few prerequisites that you wont need anymore once done. Please scroll down to prerequisites section
 
 ### 1 - Go to the folder where you want to install the package
 ### 2 - download and unzip the package: (if you already use meta, don't forget to save your drivers and copy back in the "active" directory)
 ```
 wget https://github.com/jac459/meta/archive/refs/tags/0.9.3.zip
 unzip 0.9.3.zip
 mv meta-0.9.3/* .
 rm 0.9.3.zip
 rm -r meta-0.9.3 
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
pm2 statup
```
If you already use meta
```
pm2 restart meta
```

You are done.
