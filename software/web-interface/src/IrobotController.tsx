import React, { useState, useRef, useEffect, MouseEvent, TouchEvent } from 'react';
import { Circle, AlertTriangle, Keyboard } from 'lucide-react';
import * as ROSLIB from 'roslib';

interface JoystickPosition {
  x: number;
  y: number;
}

const IrobotController: React.FC = () => {
  console.log('IrobotController rendering...');
  
  const [connected, setConnected] = useState(false);
  const [robotStatus, setRobotStatus] = useState('Idle');
  const [joystickPos, setJoystickPos] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [speed, setSpeed] = useState(0.5);
  const [turnRate, setTurnRate] = useState(1.0);
  const [activeKey, setActiveKey] = useState<string>('');
  const [collisionDetected, setCollisionDetected] = useState(false);

  const collisionSubRef = useRef<any>(null);
  const joystickRef = useRef<HTMLDivElement | null>(null);
  const rosRef = useRef<any>(null);
  const cmdVelRef = useRef<any>(null);
  const publishIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const pressedKeysRef = useRef<Set<string>>(new Set());
  const collisionDetectedRef = useRef(false);
  
  // Key bindings
  const moveBindings: { [key: string]: [number, number, number, number] } = {
    'i': [-1, 0, 0, 0],
    // ',': [1, 0, 0, 0],
    // '.': [0, 0, 0, 1],
    // 'm': [0, 0, 0, -1],
    'j': [0, 0, 0, -1],
    'l': [0, 0, 0, 1],
    //'u': [-1, 0, 0, 1],
    //'o': [-1, 0, 0, -1],
    'k': [0, 0, 0, 0],
  };

  // Stop publishing
  const stopMoving = (): void => {
    if (publishIntervalRef.current) {
      clearInterval(publishIntervalRef.current);
      publishIntervalRef.current = null;
    }
    
    if (cmdVelRef.current) {
      cmdVelRef.current.publish({
        linear: { x: 0, y: 0, z: 0 },
        angular: { x: 0, y: 0, z: 0 }
      });
    }
  };

  // Start moving
  const startMoving = (linear: number, angular: number): void => {
    if (!connected || !cmdVelRef.current) return;
    
    if (publishIntervalRef.current) {
      clearInterval(publishIntervalRef.current);
    }
    
    publishIntervalRef.current = setInterval(() => {
      // Use ref to get current collision state (avoids stale closure)
      const safeLinear = collisionDetectedRef.current ? 0 : linear;
      cmdVelRef.current.publish({
        linear: { x: safeLinear, y: 0, z: 0 },
        angular: { x: 0, y: 0, z: angular }
      });
    }, 100);
  };

// Initialize ROS connection
useEffect(() => {
  if (connected && !rosRef.current) {
    const ros = new ROSLIB.Ros({
      url: 'ws://192.168.1.219:9090'
    });

    ros.on('connection', () => {
      console.log('Connected to ROS');
      setRobotStatus('Connected to ROS');
    });

    ros.on('error', (err: any) => {
      console.error('ROS connection error:', err);
      setRobotStatus('Error: Connection failed');
      setConnected(false);
    });

    ros.on('close', () => {
      console.log('Disconnected from ROS');
      setRobotStatus('Disconnected');
      setConnected(false);
    });

    rosRef.current = ros;
    
    const cmdVel = new ROSLIB.Topic({
      ros: ros,
      name: '/cmd_vel',
      messageType: 'geometry_msgs/msg/Twist'
    });
    cmdVelRef.current = cmdVel;

    const collisionSub = new ROSLIB.Topic({
    ros: ros,
    name: '/collision_warning',
    messageType: 'std_msgs/Bool'
  });

  // roslib v1 style - callback directly in subscribe
  collisionSub.subscribe(function(message: any) {
    collisionDetectedRef.current = message.data;  // Update ref for interval to read
    setCollisionDetected(message.data);            // Update state for UI
    if (message.data) {
      setRobotStatus('COLLISION WARNING - Linear blocked, rotation allowed');
    } else {
      setRobotStatus('Path clear');
    }
  });

collisionSubRef.current = collisionSub;

    
  } else if (!connected && rosRef.current) {
    if (publishIntervalRef.current) {
      clearInterval(publishIntervalRef.current);
      publishIntervalRef.current = null;
    }
    
    rosRef.current.close();
    rosRef.current = null;
    cmdVelRef.current = null;
  }

  return () => {
    if (publishIntervalRef.current) {
      clearInterval(publishIntervalRef.current);
    }
    if (rosRef.current) {
      rosRef.current.close();
    }
  };
}, [connected]);


  // Handle button press
  const handleButtonPress = (key: string) => {
    if (key in moveBindings) {
      setActiveKey(key);
      const [x, y, z, th] = moveBindings[key];
      const linearVel = x * speed;
      const angularVel = th * turnRate;
      startMoving(linearVel, angularVel);
    }
  };

  const handleButtonRelease = () => {
    setActiveKey('');
    stopMoving();
  };

  // Handle keyboard input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key;
      
      if (key === 'q') {
        setSpeed(s => Math.min(1000, s * 1.1));
        setTurnRate(t => Math.min(1000, t * 1.1));
        setRobotStatus('Speed increased by 10%');
        return;
      }
      if (key === 'z') {
        setSpeed(s => s * 0.9);
        setTurnRate(t => t * 0.9);
        setRobotStatus('Speed decreased by 10%');
        return;
      }
      if (key === 'w') {
        setSpeed(s => Math.min(1000, s * 1.1));
        setRobotStatus('Linear speed increased by 10%');
        return;
      }
      if (key === 'x') {
        setSpeed(s => s * 0.9);
        setRobotStatus('Linear speed decreased by 10%');
        return;
      }
      if (key === 'e') {
        setTurnRate(t => Math.min(1000, t * 1.1));
        setRobotStatus('Angular speed increased by 10%');
        return;
      }
      if (key === 'c') {
        setTurnRate(t => t * 0.9);
        setRobotStatus('Angular speed decreased by 10%');
        return;
      }

      if (key in moveBindings && !pressedKeysRef.current.has(key)) {
        pressedKeysRef.current.add(key);
        setActiveKey(key);
        const [x, y, z, th] = moveBindings[key];
        const linearVel = x * speed;
        const angularVel = th * turnRate;
        startMoving(linearVel, angularVel);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key;
      if (key in moveBindings && pressedKeysRef.current.has(key)) {
        pressedKeysRef.current.delete(key);
        setActiveKey('');
        stopMoving();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [connected, speed, turnRate, moveBindings]);

  // Handle joystick movement
  const handleJoystickMove = (e: MouseEvent<HTMLDivElement> | TouchEvent<HTMLDivElement>) => {
    if (!isDragging || !joystickRef.current) return;
    
    const rect = joystickRef.current.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    
    let x = clientX - rect.left - centerX;
    let y = clientY - rect.top - centerY;
    
    const distance = Math.sqrt(x * x + y * y);
    const maxDistance = centerX * 0.8;
    
    if (distance > maxDistance) {
      x = (x / distance) * maxDistance;
      y = (y / distance) * maxDistance;
    }
    
    setJoystickPos({ x, y });
    
    const linearVel = (y / maxDistance) * speed;
    const angularVel = (x / maxDistance) * turnRate;
    
    startMoving(linearVel, angularVel);
  };

  const handleJoystickEnd = () => {
    setIsDragging(false);
    setJoystickPos({ x: 0, y: 0 });
    stopMoving();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white p-4">
      <div className="max-w-4xl mx-auto mb-6">
        <div className="flex items-center justify-between bg-slate-800/50 rounded-lg p-4 border border-slate-700">
          <div className="flex items-center gap-3">
            <Circle className={`w-3 h-3 ${connected ? 'fill-green-500 text-green-500' : 'fill-red-500 text-red-500'} animate-pulse`} />
            <h1 className="text-2xl font-bold">iRobot Controller</h1>
            {collisionDetected && (
              <div className="flex items-center gap-2 px-3 py-1 bg-red-600 rounded-lg animate-pulse">
                <AlertTriangle className="w-4 h-4" />
                <span className="text-sm font-bold">COLLISION</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-400">{robotStatus}</span>
            <button 
              onClick={() => setConnected(!connected)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors text-sm font-medium"
            >
              {connected ? 'Disconnect' : 'Connect'}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-800/50 rounded-xl p-8 border border-slate-700">
          <h2 className="text-lg font-semibold mb-6 text-center">Movement Control (Joystick)</h2>
          
          <div className="flex justify-center">
            <div 
              ref={joystickRef}
              className="relative w-80 h-80 bg-slate-900 rounded-full border-4 border-slate-700 touch-none cursor-pointer"
              onMouseDown={() => setIsDragging(true)}
              onMouseMove={handleJoystickMove}
              onMouseUp={handleJoystickEnd}
              onMouseLeave={handleJoystickEnd}
              onTouchStart={() => setIsDragging(true)}
              onTouchMove={handleJoystickMove}
              onTouchEnd={handleJoystickEnd}
            >
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-px h-full bg-slate-700/50"></div>
                <div className="absolute w-full h-px bg-slate-700/50"></div>
              </div>
              
              <div 
                className="absolute w-20 h-20 bg-blue-500 rounded-full shadow-lg cursor-grab active:cursor-grabbing transition-colors hover:bg-blue-400"
                style={{
                  left: `calc(50% + ${joystickPos.x}px - 2.5rem)`,
                  top: `calc(50% + ${joystickPos.y}px - 2.5rem)`,
                }}
              >
                <div className="absolute inset-3 bg-blue-400 rounded-full"></div>
              </div>
              
              
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-medium text-slate-400">LEFT</div>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium text-slate-400">RIGHT</div>
            </div>
          </div>
        </div>

        <div className="bg-slate-800/50 rounded-xl p-8 border border-slate-700">
          <div className="flex items-center gap-2 mb-6">
            <Keyboard className="w-5 h-5" />
            <h2 className="text-lg font-semibold">Keyboard Controls</h2>
          </div>
          
          <div className="space-y-4 text-sm">
            <div className="bg-slate-900/50 rounded-lg p-4">
              <h3 className="font-semibold mb-2 text-blue-400">Movement Keys</h3>
              <div className="space-y-2">
                {Object.entries({
                  'i': 'Forward',
                  '.': 'Left (rotate)',
                  'm': 'Right (rotate)',
                  'j': 'Rotate right → left',
                  'l': 'Rotate left → right',
                  'u': 'Forward-left diagonal',
                  'o': 'Forward-right diagonal',
                  // ',': 'Backwards',
                  'k': 'Stop'
                }).map(([key, label]) => (
                  <div key={key} className="flex items-center gap-3">
                    <button 
                      onMouseDown={() => handleButtonPress(key)}
                      onMouseUp={handleButtonRelease}
                      onMouseLeave={handleButtonRelease}
                      onTouchStart={() => handleButtonPress(key)}
                      onTouchEnd={handleButtonRelease}
                      className={`px-3 py-2 rounded text-center w-12 font-bold transition-colors ${activeKey === key ? 'bg-blue-600' : 'bg-slate-700 hover:bg-slate-600'}`}
                    >{key.toUpperCase()}</button>
                    <span className="text-xs text-slate-300">{label}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-slate-900/50 rounded-lg p-4">
              <h3 className="font-semibold mb-2 text-green-400">Speed Controls</h3>
              <ul className="space-y-1 text-xs text-slate-300">
                <li><kbd className="px-2 py-1 bg-slate-700 rounded text-xs">Q</kbd> / <kbd className="px-2 py-1 bg-slate-700 rounded text-xs">Z</kbd> - All speeds ±10%</li>
                <li><kbd className="px-2 py-1 bg-slate-700 rounded text-xs">W</kbd> / <kbd className="px-2 py-1 bg-slate-700 rounded text-xs">X</kbd> - Linear speed ±10%</li>
                <li><kbd className="px-2 py-1 bg-slate-700 rounded text-xs">E</kbd> / <kbd className="px-2 py-1 bg-slate-700 rounded text-xs">C</kbd> - Angular speed ±10%</li>
              </ul>
            </div>

            <div className="bg-slate-900/50 rounded-lg p-4">
              <h3 className="font-semibold mb-2">Current Settings</h3>
              <div className="space-y-1 text-xs text-slate-300">
                <div className="flex justify-between">
                  <span>Linear Speed:</span>
                  <span className="font-mono text-blue-400">{speed.toFixed(2)} m/s</span>
                </div>
                <div className="flex justify-between">
                  <span>Angular Speed:</span>
                  <span className="font-mono text-blue-400">{turnRate.toFixed(2)} rad/s</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IrobotController;
