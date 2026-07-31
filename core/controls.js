import * as THREE from 'three';

export class Controls {
  constructor(camera) {
    this.camera = camera;
    
    this.speed = 8.0;      // Forward movement velocity (units per second)
    this.turnSpeed = 1.5;   // Maximum rotation speed (radians per second)
    this.deadzone = 0.15;   // Center deadzone threshold (0.15 = inner 15% of screen is idle)

    this.camera.rotation.order = 'YXZ'; // Ensure camera rotation order prevents unwanted rolling/tilting

    // State tracking
    this.isMovingForward = false;
    this.isCursorInView = true; // Track if the cursor is within the window bounds
    this.mouse = { x: 0, y: 0 }; // Normalized mouse position (-1.0 to 1.0 from center)

    this.initListeners();
  }

  initListeners() {
    window.addEventListener('mousemove', (event) => { // Track mouse position relative to the center of the screen
      const centerX = window.innerWidth / 2;
      const centerY = window.innerHeight / 2;

      // Normalize coordinates: 0 is center, -1 is left/top, +1 is right/bottom
      this.mouse.x = (event.clientX - centerX) / centerX;
      this.mouse.y = (event.clientY - centerY) / centerY;
    });

    document.documentElement.addEventListener('mouseleave', () => {
      this.isCursorInView = false;
      //console.log('Cursor left the window. Camera rotation and movement paused.');
    });

    document.documentElement.addEventListener('mouseenter', () => {
      this.isCursorInView = true;
      //console.log('Cursor entered the window. Camera rotation and movement resumed.');
    });

    document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        this.isCursorInView = false;
        this.isMovingForward = false;
        //console.log('Window lost focus. Camera rotation and movement paused.');
    } else {
        this.isCursorInView = true;
        //console.log('Window gained focus. Camera rotation and movement resumed.');
    }
    });

    window.addEventListener('mousedown', (event) => {
      if (event.button === 0) {
        this.isMovingForward = true;
      }
    });

    window.addEventListener('mouseup', (event) => {
      if (event.button === 0) {
        this.isMovingForward = false;
      }
    });

    window.addEventListener('contextmenu', (event) => {
      event.preventDefault();
    });

    window.addEventListener('resize', () => { // Reset mouse offset if window resizes
      this.mouse.x = 0;
      this.mouse.y = 0;
    });
  }

  update(delta) {
    if (!this.isCursorInView) {
      return; // Skip rotation and movement calculations if the cursor is outside the window or the window is not focused
    }

    let yawSpeed = 0;
    let pitchSpeed = 0;

    if (Math.abs(this.mouse.x) > this.deadzone) { // Horizontal check (Yaw - looking Left / Right)
      const sign = Math.sign(this.mouse.x);
      const normalizedInput = (Math.abs(this.mouse.x) - this.deadzone) / (1 - this.deadzone); // Remap the range beyond the deadzone from 0.0 to 1.0 for smooth scaling
      
      yawSpeed = -sign * normalizedInput * this.turnSpeed;
    }

    if (Math.abs(this.mouse.y) > this.deadzone) { // Vertical check (Pitch - looking Up / Down)
      const sign = Math.sign(this.mouse.y);
      const normalizedInput = (Math.abs(this.mouse.y) - this.deadzone) / (1 - this.deadzone);
      
      pitchSpeed = -sign * normalizedInput * this.turnSpeed;
    }

    // Apply rotations
    this.camera.rotation.y += yawSpeed * delta;
    this.camera.rotation.x += pitchSpeed * delta;

    // Clamp pitch to prevent the camera from flipping upside down (-85 deg to +85 deg)
    const maxPitch = Math.PI / 2 - 0.05;
    this.camera.rotation.x = Math.max(-maxPitch, Math.min(maxPitch, this.camera.rotation.x));

    if (this.isMovingForward) { // Forward movement along the camera's local Z-axis
      this.camera.translateZ(-this.speed * delta);
    }
  }
}