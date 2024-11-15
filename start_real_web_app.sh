#! /bin/bash
echo "[$(date +'%F %T')] Starting MasterClass Final Project Web Application..."
sudo pip3 install pyquaternion && echo "done : install pyquaternion"

ros2 launch trash_table_detection real_web_app.launch.xml &
sleep 5
cd ~/webpage_ws/cleanerbot_webapp && python3 -m http.server 7000 &
sleep 3
shopt -s expand_aliases
source /home/user/.bash_aliases
webpage_address
rosbridge_address