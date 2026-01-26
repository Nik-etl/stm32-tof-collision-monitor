#/bin/bash
valid=true

echo " Welcome to our irobot demo"
while [ $valid ]
    do
     
	    echo "What would you like to do?"
            echo "dock = d" 
	    echo "undock = u" 
            echo "stopcode = s" 
	    echo "open remote control = c"
	    echo "dance = r"
	    echo "navigate = n"
	    echo "go to area = a"
            echo  "rotate = o "
	    read  action
            
	    if [[ ( $action == "d") ]];
              then  
              ros2 action send_goal /dock irobot_create_msgs/action/Dock "{}" 
              
	    elif [[ ( $action == o) ]];
	    then
		    echo "What is angle of rotation ?"
		    read angle
		    echo "What speed?"
		    read speed
		    ros2 action send_goal /rotate_angle irobot_create_msgs/action/RotateAngle "{angle: $angle,max_rotation_speed: $speed}"

            elif [[ ( $action == "u") ]];
              then
              ros2 action send_goal /undock irobot_create_msgs/action/Undock "{}"

            elif [[ ( $action == "c") ]];
              then
              source ~/create3_examples_ws/install/local_setup.sh
              ros2 param set /motion_control safety_override full
              ros2 run teleop_twist_keyboard teleop_twist_keyboard
            
      elif [[ ( $action == "a" ) ]];
      then
	      
	      echo "Which area would you like to go : 1  2  3  4"
	      read action
	      if [[ ( $action == "1" ) ]];
	      then
		      ros2 action send_goal /navigate_to_position irobot_create_msgs/action/NavigateToPosition "{achieve_goal_heading: true,goal_pose:{pose:{position:{x: 0.5,y: 0.5,z: 0.5}, orientation:{x: 0.5,y: 0.5, z: 0.5, w: 1.0}}}}"
	      elif [[ ($action == "2" ) ]];
	      then
		      ros2 action send_goal /navigate_to_position irobot_create_msgs/action/NavigateToPosition "{achieve_goal_heading: true,goal_pose:{pose:{position:{x: -0.5,y: 0.5,z: 0.5}, orientation:{x: 0.5,y: 0.5, z: 0.5, w: 1.0}}}}"
		elif [[ ($action==3) ]];
		then
                      ros2 action send_goal /navigate_to_position irobot_create_msgs/action/NavigateToPosition "{achieve_goal_heading: true,goal_pose:{pose:{position:{x: -0.5,y: -0.5,z: 0.5}, orientation:{x: 0.5,y: 0.5, z: 0.5, w: 1.0}}}}"
              elif [[ ($action == "4" ) ]];
              then
                      ros2 action send_goal /navigate_to_position irobot_create_msgs/action/NavigateToPosition "{achieve_goal_heading: true,goal_pose:{pose:{position:{x: 0.5,y: -0.5,z: 0.5}, orientation:{x: 0.5,y: 0.5, z: 0.5, w: 1.0}}}}"
	      else	      
	      echo "you did not select area"
	      break
	      fi


            elif [[ ( $action == "r") ]];
              then
              source ~/create3_examples_ws/install/local_setup.sh
              ros2 run create3_examples_py create3_dance

	    elif [[ ( $action == "n") ]];
              then
		      echo "Where do you want to go ?"
		      echo "What is x?"
		      read x
		      echo "What is y?"
		      read y
		      echo "What is z?"
		      read z
                      ros2 action send_goal /navigate_to_position irobot_create_msgs/action/NavigateToPosition "{achieve_goal_heading: true,goal_pose:{pose:{position:{x: $x,y: $y,z: $z}, orientation:{x: $x,y: $y, z: $z, w: 1.0}}}}"

              echo "x = $x y= $y z=$z"
	      elif [[ ( $action == "s") ]];
              then
              valid=false
              break
            
            else
            echo "invalid command"
            fi
     done
