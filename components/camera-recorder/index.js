window.download = require('./lib/download');
window.GIF = require('./lib/gif').GIF;
var Capture = require('./lib/ccapture.js');

/* global AFRAME */
if (typeof AFRAME === 'undefined') {
  throw new Error('Component attempted to register before AFRAME was available.');
}

/**
 * Camera recorder component for A-Frame.
 *
 * tilt, pan, dolly
 */
AFRAME.registerComponent('camera-recorder', {
  dependencies: ['camera'],

  schema: {
    dur: {default: 3000},
    enabled: {default: true},
    framerate: {default: 60},
    lookAt: {type: 'vec3'},
    holdTimeBefore: {default: 500},
    holdTimeAfter: {default: 1000},
    motionBlurEnabled: {default: true},
    name: {default: ''},
    quality: {default: 85},
    positionFrom: {type: 'vec3'},
    positionTo: {type: 'vec3'},
    rotationFrom: {type: 'vec3'},
    rotationTo: {type: 'vec3'},
    showControls: {default: true},
    workers: {default: 8},
    workerPath: {default: './'}
  },

  multiple: true,

  init: function () {
    var capture;
    var data = this.data;
    var domAttributes;
    var el = this.el;

    // Create CCapture.
    this.capture = new Capture({
      format: 'gif',
      name: data.name || undefined,
      motionBlurFrames: data.motionBlurEnabled ? 1 : 0,
      quality: data.quality,
      workers: data.workers,
      workersPath: data.workerPath
    });
    this.time = 0;

    // To tell what is developer-defined.
    domAttributes = this.el.getDOMAttribute('camera-recorder');

    if ('positionTo' in domAttributes) {
      el.setAttribute('animation__recorderposition', {
        property: 'position',
        delay: data.holdTimeBefore,
        dur: data.dur,
        easing: 'linear',
        from: 'positionFrom' in domAttributes
          ? data.positionFrom
          : el.getAttribute('position'),
        startEvents: 'camerarecorderanimationstart',
        to: data.positionTo,
      });
    }

    if ('rotationTo' in domAttributes) {
      el.setAttribute('animation__recorderrotation', {
        property: 'rotation',
        delay: data.holdTimeBefore,
        dur: data.dur,
        easing: 'linear',
        from: 'rotationFrom' in domAttributes
          ? data.rotationFrom
          : el.getAttribute('rotation'),
        startEvents: 'camerarecorderanimationstart',
        to: data.rotationTo
      });
    }

    if ('lookAt' in domAttributes) {
      this.lookAt = new THREE.Vector3().copy(data.lookAt);
      this.el.getObject3D('camera').rotation.y = Math.PI;
    }

    if (data.showControls) {
      this.injectRecordButton();
      this.injectDryRunButton();
    }

    el.addEventListener('camerarecorderstart', () => { this.startRecording(); });
    el.addEventListener('camerarecorderdrystart', () => { this.startRecording(true); });
  },

  play: function () {
    // Disable other controls.
    setTimeout(() => {
      this.el.setAttribute('look-controls', 'enabled', false);
      this.el.setAttribute('wasd-controls', 'enabled', false);
      this.el.sceneEl.setAttribute('vr-mode-ui', 'enabled', false);
    });
  },

  tick: function () {
    if (this.lookAt) {
      this.el.object3D.lookAt(this.lookAt);
    }
  },

  tock: function (t, dt) {
    if (!this.isRecording) { return; }

    this.time += dt;

    // Finished.
    if (this.time >
        this.data.dur + this.data.holdTimeBefore + this.data.holdTimeAfter) {
      this.isRecording = false;
      this.capture.stop();
      this.capture.save();
      if (this.recordButton) {
        this.recordButton.setAttribute('disabled', '');
        this.recordButton.innerHTML = 'Processing...';
      }
      return;
    }

    this.capture.capture(this.el.sceneEl.canvas);
  },

  injectRecordButton: function () {
    var button;
    button = document.createElement('button');
    button.innerHTML = 'Start recording';
    button.style.left = '5px';
    button.style.position = 'fixed';
    button.style.top = '5px';
    button.style.zIndex = 999999999999;
    document.body.appendChild(button);

    button.addEventListener('click', () => {
      this.startRecording();
    });

    this.recordButton = button;
  },

  injectDryRunButton: function () {
    var button;
    button = document.createElement('button');
    button.innerHTML = 'Preview recording';
    button.style.left = '5px';
    button.style.position = 'fixed';
    button.style.top = '30px';
    button.style.zIndex = 999999999999;
    document.body.appendChild(button);

    button.addEventListener('click', () => {
      this.startRecording(true);
    });
  },

  startRecording: function (isDryRun) {
    this.el.emit('camerarecorderanimationstart');
    if (isDryRun) { return; }
    this.capture.start();
    this.isRecording = true;
  }
});
