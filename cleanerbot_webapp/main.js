var app = new Vue({
    el: '#app',
    // storing the state of the page
    data: {
        connected: false,
        ros: null,
        logs: [],
        loading: false,
        rosbridge_address: 'wss://i-0eb9e495286f3e0ba.robotigniteacademy.com/a881afb5-27d7-457e-a771-e2795f4e8480/rosbridge/',
        port: '9090',
        targetEnv: 'sim',
        lift_topic: null,
        // Model 3D viewer
        viewer: null,
        tfClient: null,
        arrowNode: null,
        urdfClient: null,
        // Map viewer
        mapViewer: null,
        mapGridClient: null,
        interval: null,       
            // dragging data
        dragging: false,
        drg_x: 'no',
        drg_y: 'no',
        dragCircleStyle: {
            margin: '0px',
            top: '0px',
            left: '0px',
            display: 'none',
            width: '70px',
            height: '70px',
        },
        // joystick valules
        joystick: {
            vertical: 0,
            horizontal: 0,
        },
        lx: 0,
        az: 0,
        kv: 1,
        angular_dir: -1,
        pubInterval: null,
        // waypoint
        target_wp: 0,
        actionClient: null,
        goal_send_fg: false,
        goal_id: null,
        goal_msg: null,
        action: {
            goal: { cmd: 'go_home' },
            feedback: { phase: 'idle' },
            result: { complete: false },
            status: { status: 0, text: ''},
        },
        cur_pos: {
            x: 0,
            y: 0,
        },
        wplist: [
            {x: 0.15, y: -0.48},
            {x: 0.74, y: -0.48},
            {x: 0.74, y:  0.48},
            {x: 0.17, y:  0.48},
            {x: 0.17, y:  0},
            {x:-0.15, y:  0},
            {x:-0.15, y: -0.50},
            {x:-0.57, y: -0.50},
            {x:-0.15, y:  0.50},
            {x:-0.70, y:  0.48},
        ],

    },
    // helper methods to connect to ROS
    methods: {
        connect: function() {
            this.loading = true
            this.ros = new ROSLIB.Ros({
                url: this.rosbridge_address,
                groovyCompatibility: false
            })
            this.ros.on('connection', () => {
                this.logs.unshift((new Date()).toTimeString() + ' - Connected!')
                this.connected = true
                this.loading = false
                // 3D Viewer
                // this.setup3DViewer()
                // if(this.targetEnv == 'sim')
                //     this.lift_topic = '/elevator_up'
                // else
                //     this.lift_topic = '/set_elevator'

                // Map Viewer 3D
                this.mapViewer = new ROS3D.Viewer({
                    divID : 'divMap',
                    width : 450,
                    height : 700,
                    antialias : true
                });
                
                this.mapViewer.addObject(new ROS3D.Grid());
                
                // Setup the map client.
                this.mapGridClient = new ROS3D.OccupancyGridClient({
                    ros : this.ros,
                    rootObject : this.mapViewer.scene,
                    continuous: true,
                });

                // Setup a client to listen to TFs.
                this.tfClient = new ROSLIB.TFClient({
                    ros: this.ros,
                    angularThres: 0.01,
                    transThres: 0.01,
                    rate: 10.0,
                    fixedFrame: 'map'
                });
                this.arrowNode = new ROS3D.SceneNode({
                    tfClient : this.tfClient,
                    frameID  : 'robot_base_link',
                    object   : new ROS3D.Arrow(),        
                    // object   : new ROS3D.Arrow2(),        
                });
                // this.mapViewer.addObject(new ROS3D.Grid());
                this.mapViewer.scene.add(this.arrowNode);

                // // Setup the URDF client.
                // this.urdfClient = new ROS3D.UrdfClient({
                //     ros: this.ros,
                //     param: 'rb1_robot/robot_description',
                //     tfClient: this.tfClient,
                //     // We use "path: location.origin + location.pathname"
                //     // instead of "path: window.location.href" to remove query params,
                //     // otherwise the assets fail to load
                //     path: location.origin + location.pathname,
                //     rootObject: this.mapViewer.scene,
                //     loader: ROS3D.COLLADA_LOADER_2
                // })

                // // Setup the marker client.
                // var markerClient = new ROS3D.MarkerClient({
                //     ros : this.ros,
                //     tfClient : this.tfClient,
                //     topic : '/visualization_marker',
                //     lifetime : 0,
                //     rootObject : this.mapViewer.scene
                // });

                // Camera viewer
                // this.setCamera()
                // using timer callback func() for joystick
                this.pubInterval = setInterval(this.moveRobotbByJoysticVals, 100)
            })
            this.ros.on('error', (error) => {
                this.logs.unshift((new Date()).toTimeString() + ` - Error: ${error}`)
            })
            this.ros.on('close', () => {
                this.logs.unshift((new Date()).toTimeString() + ' - Disconnected!')
                this.connected = false
                this.loading = false
                // Map Viewer
                document.getElementById('divMap').innerHTML = ''
                // joystick
                clearinterval(this.pubInterval)
            })
        },
        disconnect: function() {
            this.ros.close()
        },
        switchTargetEnv: function() {
            if(this.targetEnv == 'sim')
                this.targetEnv = 'real'
            else
                this.targetEnv = 'sim'
        },
        upElevator: function() {
            if(this.targetEnv == 'sim')
                this.lift_topic = '/elevator_up'
            else
                this.lift_topic = '/set_elevator'
            let topic = new ROSLIB.Topic({
                ros: this.ros,
                name: this.lift_topic,
                messageType: 'std_msgs/String'
            })
            let message = new ROSLIB.Message({
                data: 'up',
            })
            topic.publish(message)
            console.log(message)
        },
        downElevator: function() {
            if(this.targetEnv == 'sim') 
                this.lift_topic = '/elevator_down'
            else 
                this.lift_topic = '/set_elevator'
            let topic = new ROSLIB.Topic({
                ros: this.ros,
                name: this.lift_topic,
                messageType: 'std_msgs/String'
            })
            let message = new ROSLIB.Message({
                data: 'down',
            })
            topic.publish(message)
            console.log(message)
        },
        cleanTable1: function() {
            if(!this.goal_send_fg) {
                this.goal_send_fg = true
                this.actionSendGoal('clean_table1')
            }
            console.log("Send command: [clean_table 1]")
        },
        cleanTable2: function() {
            if(!this.goal_send_fg) {
                this.goal_send_fg = true
                this.actionSendGoal('clean_table2')
            }
            console.log("Send command: [clean_table 2]")
        },
        discoverTable: function() {
            if(!this.goal_send_fg) {
                this.goal_send_fg = true
                this.actionSendGoal('discover_clean')
            }
            console.log("Send command: [discovery and clean table]")
        },
        cancelGoal: function() {
            this.goal_send_fg = false
            this.actionClient.cancelGoal(this.goal_id)
        },
        goHome: function() {
            if(!this.goal_send_fg) {
                this.goal_send_fg = true
                this.actionSendGoal('go_home')
            }
            console.log("Send command: [go home]")
        },
        actionSendGoal: function(cmd) {
            this.actionClient = new ROSLIB.Action({
                ros : this.ros,
                name : '/clean_table',
                actionType : 'table_find_interface/CleanTable'
            })
            this.action.goal.cmd = cmd
            this.logs.unshift('Goal: ' + cmd)
            this.goal_msg = new ROSLIB.ActionGoal({
                cmd: this.action.goal.cmd,
            })

            this.goal_id = this.actionClient.sendGoal(this.goal_msg, 
            //   function(result) {
            //     this.logs.unshift('Result of action goal : ' + result.complete)
            //   },
            //   function(feedback) {
            //     this.logs.unshift('Feedback : ' + feedback.phase)
            //   },
                this.actionResultCallback, 
                this.actionFeedbackCallback, 
            )
        },
        actionResultCallback: function(result) {
            this.logs.unshift('Result of action goal : ' + result.complete)
            this.goal_send_fg = false
        },
        actionFeedbackCallback: function(feedback) {
            this.logs.unshift('Result of action goal : ' + feedback.phase)
        },
        // joystic control command
        moveRobotbByJoysticVals: function () {
            let topic = new ROSLIB.Topic({
                ros: this.ros,
                // name: '/cmd_vel',
                name: '/diffbot_base_controller/cmd_vel_unstamped',
                messageType: 'geometry_msgs/Twist'
            })
            this.lx = this.joystick.vertical * this.kv
            this.az = this.joystick.horizontal * this.kv * this.angular_dir
            let message = new ROSLIB.Message({
                linear: { x: this.lx, y: 0, z: 0, },
                angular: { x: 0, y: 0, z: this.az, },
            })
            topic.publish(message)
        },
        startDrag() {
            this.dragging = true
            this.drag_x = this.drag_y = 0
        },
        stopDrag() {
            this.dragging = false
            this.drag_x = this.drag_y = 'no'
            this.dragCircleStyle.display = 'none'
            this.resetJoystickVals()
        },
        doDrag(event) {
            if (this.dragging) {
                this.drag_x = event.offsetX
                this.drag_y = event.offsetY
                let ref = document.getElementById('dragstartzone')
                this.dragCircleStyle.display = 'inline-block'

                let minTop = ref.offsetTop - parseInt(this.dragCircleStyle.height) / 2
                let maxTop = minTop + 200
                let top = this.drag_y + minTop
                this.dragCircleStyle.top = `${top}px`

                let minLeft = ref.offsetLeft - parseInt(this.dragCircleStyle.width) / 2
                let maxLeft = minLeft + 200
                let left = this.drag_x + minLeft
                this.dragCircleStyle.left = `${left}px`

                this.setJoystickVals()
                // // call the move func in the doDrag func
                // this.moveRobotbByJoysticVals()
            }
        },
        setJoystickVals() {
            this.joystick.vertical = -1 * ((this.drag_y / 200) - 0.5)
            this.joystick.horizontal = +1 * ((this.drag_x / 200) - 0.5)
        },
        resetJoystickVals() {
            this.joystick.vertical = 0
            this.joystick.horizontal = 0
        },
    },
    mounted() {
        window.addEventListener('mouseup', this.stopDrag)

    },
})