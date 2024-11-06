#! /bin/bash
echo "[$(date +'%F %T')] Starting MasterClass Final Project Web Application..."
ros2 launch rosbridge_server rosbridge_websocket_launch.xml &
sudo pip3 install pyquaternion && ros2 launch course_web_dev_ros tf2_web.launch.xml &
cd ./cleanerbot_webapp && python3 -m http.server 7000 &
webpage_address
rosbridge_address