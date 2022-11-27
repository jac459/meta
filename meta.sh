#! /bin/sh
pm2 stop all
pm2 start mosquitto -o "/dev/null" -e "/dev/null"   
pm2 start node-red -o "/dev/null" -e "/dev/null"   
pm2 start meta -o "/dev/null" -e "/dev/null"
rm ~/.pm2/logs/*.*
