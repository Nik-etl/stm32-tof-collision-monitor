#!/usr/bin/env python3
from flask import Flask, request, jsonify
from flask_cors import CORS
import rospy
from geometry_msgs.msg import Twist

app = Flask(__name__)
CORS(app)  # Allow requests from your web browser

# Initialize ROS node
rospy.init_node('web_controller_server', anonymous=True)
cmd_vel_pub = rospy.Publisher('cmd_vel', Twist, queue_size=1)

@app.route('/api/cmd_vel', methods=['POST'])
def send_velocity():
    """Receive velocity commands from web UI"""
    try:
        data = request.json
        linear = data.get('linear', 0.0)
        angular = data.get('angular', 0.0)
        
        # Create and publish Twist message
        twist = Twist()
        twist.linear.x = linear
        twist.linear.y = 0.0
        twist.linear.z = 0.0
        twist.angular.x = 0.0
        twist.angular.y = 0.0
        twist.angular.z = angular
        
        cmd_vel_pub.publish(twist)
        
        return jsonify({'status': 'success', 'linear': linear, 'angular': angular}), 200
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

@app.route('/api/dock', methods=['POST'])
def dock():
    """Dock the robot"""
    try:
        # Add your docking logic here
        # This might involve calling a ROS service or publishing to a topic
        rospy.loginfo("Docking command received")
        return jsonify({'status': 'success', 'action': 'dock'}), 200
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

@app.route('/api/undock', methods=['POST'])
def undock():
    """Undock the robot"""
    try:
        # Add your undocking logic here
        rospy.loginfo("Undocking command received")
        return jsonify({'status': 'success', 'action': 'undock'}), 200
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

@app.route('/api/stop', methods=['POST'])
def emergency_stop():
    """Emergency stop - send zero velocities"""
    try:
        twist = Twist()
        twist.linear.x = 0.0
        twist.linear.y = 0.0
        twist.linear.z = 0.0
        twist.angular.x = 0.0
        twist.angular.y = 0.0
        twist.angular.z = 0.0
        
        cmd_vel_pub.publish(twist)
        rospy.loginfo("Emergency stop executed")
        
        return jsonify({'status': 'success', 'action': 'stop'}), 200
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

@app.route('/health', methods=['GET'])
def health_check():
    """Simple health check endpoint"""
    return jsonify({'status': 'healthy'}), 200

if __name__ == '__main__':
    # Run Flask server on all network interfaces, port 5000
    app.run(host='0.0.0.0', port=5000, debug=True)