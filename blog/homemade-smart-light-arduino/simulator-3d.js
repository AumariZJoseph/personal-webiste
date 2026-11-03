import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { COMPONENT_INFO, WIRE_DEFINITIONS, createSmartLightWorkbench } from './simulator-3d-components.js';

const DEFAULT_CAMERA = Object.freeze({ position: [9.4, 7.8, 10.5], target: [0, .35, .2] });
const MOBILE_CAMERA = Object.freeze({ position: [11.5, 9.8, 13.5], target: [0, .3, .2] });
const WIRE_IDS = Object.freeze(Object.keys(WIRE_DEFINITIONS));

function requiredElement(section, id) {
  const element = section.querySelector(`#${id}`);
  if (!element) throw new Error(`Missing 3D lab element: #${id}`);
  return element;
}

function deviceTier() {
  const mobile = matchMedia('(max-width: 700px), (pointer: coarse)').matches;
  const constrained = (navigator.deviceMemory && navigator.deviceMemory <= 4)
    || (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4);
  return {
    mobile,
    constrained,
    quality: mobile || constrained ? 'low' : 'high',
    dprCap: constrained ? 1 : mobile ? 1.35 : 1.75,
    shadows: !mobile && !constrained
  };
}

function makeWire(startPort, endPort, definition, quality) {
  const start = startPort.getWorldPosition(new THREE.Vector3());
  const end = endPort.getWorldPosition(new THREE.Vector3());
  const distance = start.distanceTo(end);
  const lift = Math.min(1.45, .62 + distance * .075);
  const midpoint = start.clone().lerp(end, .5);
  const lateral = new THREE.Vector3(-(end.z - start.z), 0, end.x - start.x).normalize();
  midpoint.addScaledVector(lateral, Math.min(.38, distance * .04));
  midpoint.y = Math.max(start.y, end.y) + lift;

  const curve = new THREE.CatmullRomCurve3([
    start.clone().add(new THREE.Vector3(0, .06, 0)),
    start.clone().add(new THREE.Vector3(0, lift * .58, 0)),
    midpoint,
    end.clone().add(new THREE.Vector3(0, lift * .58, 0)),
    end.clone().add(new THREE.Vector3(0, .06, 0))
  ], false, 'centripetal');
  const geometry = new THREE.TubeGeometry(curve, quality === 'low' ? 24 : 40, quality === 'low' ? .045 : .052, 7, false);
  const material = new THREE.MeshStandardMaterial({
    color: definition.color,
    emissive: definition.color,
    emissiveIntensity: .08,
    roughness: .48,
    metalness: .08,
    transparent: true,
    opacity: 1
  });
  const wire = new THREE.Mesh(geometry, material);
  wire.name = `wire-${definition.id}`;
  wire.castShadow = quality !== 'low';
  wire.userData = { kind: 'wire', wireId: definition.id };
  return wire;
}

export async function initSmartLight3D(section) {
  if (section.dataset.initialized === 'true') return;
  section.dataset.initialized = 'true';

  const canvas = requiredElement(section, 'lab3d-canvas');
  const stage = canvas.closest('.lab3d__stage');
  const status = requiredElement(section, 'lab3d-status');
  const progress = requiredElement(section, 'lab3d-progress');
  const progressBar = requiredElement(section, 'lab3d-progress-bar');
  const instructionLabel = requiredElement(section, 'lab3d-instruction-label');
  const instruction = requiredElement(section, 'lab3d-instruction');
  const guidedInput = requiredElement(section, 'lab3d-mode-guided');
  const selfInput = requiredElement(section, 'lab3d-mode-self');
  const controlGroup = requiredElement(section, 'lab3d-control-group');
  const autoButton = requiredElement(section, 'lab3d-auto');
  const onButton = requiredElement(section, 'lab3d-on');
  const offButton = requiredElement(section, 'lab3d-off');
  const motionButton = requiredElement(section, 'lab3d-motion');
  const disconnectButton = requiredElement(section, 'lab3d-disconnect');
  const resetWiringButton = requiredElement(section, 'lab3d-reset-wiring');
  const resetCameraButton = requiredElement(section, 'lab3d-reset-camera');
  const inspectorTitle = requiredElement(section, 'lab3d-inspector-title');
  const inspectorBody = requiredElement(section, 'lab3d-inspector-body');
  const inspectorConnections = requiredElement(section, 'lab3d-inspector-connections');
  const toast = requiredElement(section, 'lab3d-toast');
  const qualityLabel = requiredElement(section, 'lab3d-quality');

  if (!stage) throw new Error('Missing 3D stage container.');

  const tier = deviceTier();
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: tier.quality === 'high', powerPreference: 'high-performance' });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = tier.quality === 'low' ? 1.42 : 1.08;
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, tier.dprCap));
  renderer.shadowMap.enabled = tier.shadows;
  renderer.shadowMap.type = THREE.PCFShadowMap;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x071f24);
  scene.fog = new THREE.Fog(0x071f24, 15, 24);

  const cameraPreset = tier.mobile ? MOBILE_CAMERA : DEFAULT_CAMERA;
  const camera = new THREE.PerspectiveCamera(tier.mobile ? 48 : 38, 1, .1, 48);
  camera.position.fromArray(cameraPreset.position);

  const controls = new OrbitControls(camera, canvas);
  controls.target.fromArray(cameraPreset.target);
  controls.enablePan = false;
  controls.enableDamping = false;
  controls.rotateSpeed = .58;
  controls.zoomSpeed = .78;
  controls.minDistance = tier.mobile ? 10.5 : 7.6;
  controls.maxDistance = tier.mobile ? 23 : 16.2;
  controls.minPolarAngle = .42;
  controls.maxPolarAngle = 1.28;
  controls.minAzimuthAngle = -1.52;
  controls.maxAzimuthAngle = 1.52;
  controls.update();
  controls.saveState();

  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), .04).texture;
  pmrem.dispose();

  scene.add(new THREE.HemisphereLight(0xd9f4ef, 0x16383c, tier.quality === 'low' ? 2.65 : 1.25));
  if (tier.quality === 'low') scene.add(new THREE.AmbientLight(0xe1f4ec, .9));
  const key = new THREE.DirectionalLight(0xfff0d1, tier.quality === 'low' ? 3.2 : 2.65);
  key.position.set(-5, 10, 7);
  key.castShadow = tier.shadows;
  if (tier.shadows) {
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.left = -7;
    key.shadow.camera.right = 7;
    key.shadow.camera.top = 6;
    key.shadow.camera.bottom = -6;
    key.shadow.camera.near = 1;
    key.shadow.camera.far = 22;
    key.shadow.bias = -.0004;
  }
  scene.add(key);
  const rim = new THREE.DirectionalLight(0x4fc4c6, .95);
  rim.position.set(7, 5, -7);
  scene.add(rim);

  const workbench = createSmartLightWorkbench({ quality: tier.quality });
  scene.add(workbench.root);
  workbench.root.updateMatrixWorld(true);

  const wireRoot = new THREE.Group();
  wireRoot.name = 'interactive-jumper-wires';
  scene.add(wireRoot);
  const selectionBox = new THREE.Box3Helper(new THREE.Box3(), 0xe8af4f);
  selectionBox.visible = false;
  selectionBox.name = 'component-selection-outline';
  scene.add(selectionBox);

  const connected = new Set();
  const wireMeshes = new Map();
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const interactiveMeshes = [];
  workbench.root.traverse((object) => {
    if (object.isMesh && (object.userData.kind === 'port' || object.userData.kind === 'component')) interactiveMeshes.push(object);
  });

  let selectedEndpoint = null;
  let buildMode = 'guided';
  let controlMode = 'auto';
  let motion = false;
  let motionTimer = null;
  let toastTimer = null;
  let renderFrame = null;
  let pausedForTest = false;
  let reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const animations = [];

  const isReady = () => connected.size === WIRE_IDS.length;
  const isLightOn = () => isReady() && (controlMode === 'on' || (controlMode === 'auto' && motion));
  const nextMissing = () => WIRE_IDS.find((wireId) => !connected.has(wireId));

  const render = (time = performance.now()) => {
    renderFrame = null;
    for (let index = animations.length - 1; index >= 0; index -= 1) {
      const animation = animations[index];
      const amount = Math.min(1, (time - animation.start) / animation.duration);
      animation.update(1 - Math.pow(1 - amount, 3));
      if (amount >= 1) {
        animation.complete?.();
        animations.splice(index, 1);
      }
    }
    workbench.connectionLabels.forEach((label) => label.quaternion.copy(camera.quaternion));
    workbench.root.updateMatrixWorld(true);
    renderer.render(scene, camera);
    if (animations.length) renderFrame = requestAnimationFrame(render);
  };

  const requestRender = () => {
    if (renderFrame === null) renderFrame = requestAnimationFrame(render);
  };

  const animate = (duration, update, complete) => {
    if (reducedMotion || duration <= 0) {
      update(1);
      complete?.();
      requestRender();
      return;
    }
    animations.push({ start: performance.now(), duration, update, complete });
    requestRender();
  };

  const showToast = (message) => {
    toast.textContent = message;
    toast.classList.add('is-visible');
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => toast.classList.remove('is-visible'), 1900);
  };

  const inspectComponent = (componentId) => {
    const info = COMPONENT_INFO[componentId];
    const component = workbench.components.get(componentId);
    if (!info || !component) return;
    inspectorTitle.textContent = info.name;
    inspectorBody.textContent = info.purpose;
    inspectorConnections.textContent = info.connections;
    selectionBox.box.setFromObject(component);
    selectionBox.visible = true;
    requestRender();
  };

  const refreshPortVisuals = () => {
    const highlightedWire = buildMode === 'guided' ? nextMissing() : null;
    workbench.ports.forEach((port, endpointId) => {
      const wireId = port.userData.wireId;
      const isConnected = connected.has(wireId);
      const isSelected = endpointId === selectedEndpoint;
      const isHinted = !isConnected && wireId === highlightedWire;
      port.scale.setScalar(isSelected ? 1.42 : isHinted ? 1.2 : 1);
      port.material.emissiveIntensity = isSelected ? 1.5 : isHinted ? .72 : isConnected ? .04 : .18;
    });
  };

  const refreshInstruction = () => {
    if (isReady()) {
      instructionLabel.textContent = 'Circuit complete';
      instruction.textContent = 'Test motion or send a Bluetooth command.';
      return;
    }
    if (selectedEndpoint) {
      const port = workbench.ports.get(selectedEndpoint);
      const definition = WIRE_DEFINITIONS[port.userData.wireId];
      const other = definition.endpoints.find((endpoint) => endpoint !== selectedEndpoint);
      instructionLabel.textContent = 'Endpoint selected';
      instruction.textContent = `Find ${workbench.ports.get(other).userData.label}`;
      return;
    }
    if (buildMode === 'self') {
      instructionLabel.textContent = 'Self-build mode';
      instruction.textContent = 'Choose any two documented matching endpoints.';
      return;
    }
    const wireId = nextMissing();
    instructionLabel.textContent = 'Next connection';
    instruction.textContent = WIRE_DEFINITIONS[wireId].label;
  };

  const updateStateVisuals = (animateLight = true) => {
    const lightOn = isLightOn();
    const { bulbMaterial, bulbLight, relayLedMaterial, pirSignalMaterial, bluetoothLedMaterial } = workbench.stateVisuals;
    const startBulb = bulbMaterial.emissiveIntensity;
    const startLight = bulbLight.intensity;
    const targetBulb = lightOn ? 3.5 : .04;
    const targetLight = lightOn ? (tier.quality === 'low' ? 3.2 : 5) : 0;
    animate(animateLight ? 220 : 0, (amount) => {
      bulbMaterial.emissiveIntensity = THREE.MathUtils.lerp(startBulb, targetBulb, amount);
      bulbMaterial.opacity = THREE.MathUtils.lerp(lightOn ? .58 : .82, lightOn ? .84 : .58, amount);
      bulbLight.intensity = THREE.MathUtils.lerp(startLight, targetLight, amount);
    });
    relayLedMaterial.emissiveIntensity = lightOn ? 2.4 : isReady() ? .38 : .05;
    pirSignalMaterial.emissiveIntensity = motion ? 2.2 : .05;
    bluetoothLedMaterial.emissiveIntensity = controlMode === 'auto' ? .08 : 2.1;
    section.classList.toggle('is-ready', isReady());
    section.classList.toggle('is-on', lightOn);
  };

  const updateUi = ({ animateLight = true } = {}) => {
    const count = connected.size;
    const ready = isReady();
    const lightOn = isLightOn();
    progress.textContent = `${count} / ${WIRE_IDS.length}`;
    progressBar.style.width = `${(count / WIRE_IDS.length) * 100}%`;
    controlGroup.disabled = !ready;
    motionButton.disabled = !ready;
    disconnectButton.disabled = !ready || controlMode === 'auto';
    motionButton.textContent = motion ? 'Clear motion' : 'Simulate motion';
    motionButton.setAttribute('aria-pressed', String(motion));
    autoButton.classList.toggle('is-active', controlMode === 'auto');
    onButton.classList.toggle('is-active', controlMode === 'on');
    offButton.classList.toggle('is-active', controlMode === 'off');
    [autoButton, onButton, offButton].forEach((button) => button.setAttribute('aria-pressed', String(button.classList.contains('is-active'))));

    if (!ready) status.textContent = `Circuit incomplete · ${count} of ${WIRE_IDS.length}`;
    else if (controlMode === 'auto') status.textContent = `Automatic · light ${lightOn ? 'ON' : 'OFF'} · ${motion ? 'motion detected' : 'no motion'}`;
    else status.textContent = `Bluetooth command ${controlMode === 'on' ? '1' : '0'} · light ${lightOn ? 'ON' : 'OFF'}`;

    refreshInstruction();
    refreshPortVisuals();
    updateStateVisuals(animateLight);
    requestRender();
  };

  const addWire = (wireId, withFeedback = true) => {
    if (connected.has(wireId)) return;
    const definition = WIRE_DEFINITIONS[wireId];
    const startPort = workbench.ports.get(definition.endpoints[0]);
    const endPort = workbench.ports.get(definition.endpoints[1]);
    const wire = makeWire(startPort, endPort, definition, tier.quality);
    wireRoot.add(wire);
    wireMeshes.set(wireId, wire);
    connected.add(wireId);
    if (withFeedback) {
      wire.material.opacity = 0;
      animate(260, (amount) => { wire.material.opacity = amount; });
      showToast(`${definition.label} connected`);
    }
  };

  const removeWire = (wireId) => {
    const wire = wireMeshes.get(wireId);
    if (wire) {
      wireRoot.remove(wire);
      wire.geometry.dispose();
      wire.material.dispose();
      wireMeshes.delete(wireId);
    }
    connected.delete(wireId);
    selectedEndpoint = null;
    motion = false;
    controlMode = 'auto';
    showToast(`${WIRE_DEFINITIONS[wireId].label} removed`);
    updateUi();
  };

  const flashMismatch = (firstPort, secondPort) => {
    const originals = [firstPort, secondPort].map((port) => port.material.emissiveIntensity);
    animate(360, (amount) => {
      const pulse = Math.sin(amount * Math.PI * 3) * .5 + .5;
      firstPort.material.emissiveIntensity = 1 + pulse * 2;
      secondPort.material.emissiveIntensity = 1 + pulse * 2;
    }, () => {
      firstPort.material.emissiveIntensity = originals[0];
      secondPort.material.emissiveIntensity = originals[1];
      refreshPortVisuals();
    });
  };

  const handlePort = (port) => {
    if (pausedForTest) return;
    const { endpointId, wireId } = port.userData;
    if (connected.has(wireId)) {
      removeWire(wireId);
      return;
    }
    if (!selectedEndpoint) {
      selectedEndpoint = endpointId;
      inspectComponent(port.userData.componentId);
      showToast(`${port.userData.label} selected`);
      updateUi({ animateLight: false });
      return;
    }
    if (selectedEndpoint === endpointId) {
      selectedEndpoint = null;
      showToast('Selection cleared');
      updateUi({ animateLight: false });
      return;
    }
    const firstPort = workbench.ports.get(selectedEndpoint);
    if (firstPort.userData.wireId === wireId) {
      addWire(wireId);
      selectedEndpoint = null;
      if (isReady()) showToast('Circuit complete · controls unlocked');
      updateUi();
      return;
    }
    flashMismatch(firstPort, port);
    selectedEndpoint = endpointId;
    inspectComponent(port.userData.componentId);
    showToast('Those endpoints do not belong to the same documented connection.');
    updateUi({ animateLight: false });
  };

  const setControlMode = (mode, message) => {
    if (!isReady() || pausedForTest) return;
    controlMode = mode;
    showToast(message);
    updateUi();
  };

  const setMotion = (next, timed = false) => {
    if (!isReady() || pausedForTest) return;
    motion = next;
    window.clearTimeout(motionTimer);
    showToast(next ? 'PIR detected movement' : 'PIR output returned LOW');
    updateUi();
    if (next && timed) {
      motionTimer = window.setTimeout(() => {
        if (pausedForTest) return;
        motion = false;
        updateUi();
      }, 2200);
    }
  };

  const resetWiring = () => {
    window.clearTimeout(motionTimer);
    wireMeshes.forEach((wire) => {
      wireRoot.remove(wire);
      wire.geometry.dispose();
      wire.material.dispose();
    });
    wireMeshes.clear();
    connected.clear();
    selectedEndpoint = null;
    controlMode = 'auto';
    motion = false;
    selectionBox.visible = false;
    inspectorTitle.textContent = 'Select a component';
    inspectorBody.textContent = 'Tap a board or module to understand its role in the circuit.';
    inspectorConnections.textContent = '';
    showToast('Workbench reset');
    updateUi();
  };

  const nearestPortAt = (clientX, clientY, maxDistance) => {
    let nearest = null;
    workbench.ports.forEach((port) => {
      const projected = port.getWorldPosition(new THREE.Vector3()).project(camera);
      if (projected.z < -1 || projected.z > 1) return;
      const rect = canvas.getBoundingClientRect();
      const x = rect.left + ((projected.x + 1) / 2) * rect.width;
      const y = rect.top + ((1 - projected.y) / 2) * rect.height;
      const distance = Math.hypot(clientX - x, clientY - y);
      if (distance <= maxDistance && (!nearest || distance < nearest.distance)) nearest = { port, distance };
    });
    return nearest?.port || null;
  };

  const nearestConnectionLabelAt = (clientX, clientY, maxDistance) => {
    let nearest = null;
    workbench.root.traverse((object) => {
      if (object.userData.kind !== 'port-label' || !object.visible) return;
      const projected = object.getWorldPosition(new THREE.Vector3()).project(camera);
      if (projected.z < -1 || projected.z > 1) return;
      const rect = canvas.getBoundingClientRect();
      const x = rect.left + ((projected.x + 1) / 2) * rect.width;
      const y = rect.top + ((1 - projected.y) / 2) * rect.height;
      const distance = Math.hypot(clientX - x, clientY - y);
      if (distance <= maxDistance && (!nearest || distance < nearest.distance)) nearest = { object, distance };
    });
    return nearest ? workbench.ports.get(nearest.object.userData.endpointId) : null;
  };

  let pointerStart = null;
  canvas.addEventListener('pointerdown', (event) => {
    pointerStart = { x: event.clientX, y: event.clientY, id: event.pointerId, type: event.pointerType };
  });
  canvas.addEventListener('pointercancel', () => { pointerStart = null; });
  canvas.addEventListener('lostpointercapture', () => { pointerStart = null; });
  window.addEventListener('blur', () => { pointerStart = null; });
  canvas.addEventListener('pointerup', (event) => {
    if (!pointerStart || pointerStart.id !== event.pointerId || pausedForTest) return;
    const movement = Math.hypot(event.clientX - pointerStart.x, event.clientY - pointerStart.y);
    const pointerType = pointerStart.type;
    pointerStart = null;
    if (movement > 7) return;
    const rect = canvas.getBoundingClientRect();
    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    const labelPort = nearestConnectionLabelAt(event.clientX, event.clientY, pointerType === 'touch' || tier.mobile ? 34 : 22);
    if (labelPort) {
      handlePort(labelPort);
      return;
    }
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObjects(interactiveMeshes, false);
    const portHit = hits.find((hit) => hit.object.userData.kind === 'port' || hit.object.userData.kind === 'port-label');
    if (portHit) {
      const port = portHit.object.userData.kind === 'port-label'
        ? workbench.ports.get(portHit.object.userData.endpointId)
        : portHit.object;
      if (port) handlePort(port);
      return;
    }
    const assistedPort = nearestPortAt(event.clientX, event.clientY, pointerType === 'touch' || tier.mobile ? 30 : 15);
    if (assistedPort) {
      handlePort(assistedPort);
      return;
    }
    const componentHit = hits.find((hit) => hit.object.userData.kind === 'component');
    if (componentHit) inspectComponent(componentHit.object.userData.componentId);
  });

  controls.addEventListener('change', requestRender);
  resetCameraButton.addEventListener('click', () => {
    controls.reset();
    showToast('Camera reset');
    requestRender();
  });
  guidedInput.addEventListener('change', () => {
    if (!guidedInput.checked) return;
    buildMode = 'guided';
    selectedEndpoint = null;
    showToast('Guided build enabled');
    updateUi({ animateLight: false });
  });
  selfInput.addEventListener('change', () => {
    if (!selfInput.checked) return;
    buildMode = 'self';
    selectedEndpoint = null;
    showToast('Self-build enabled · hints hidden');
    updateUi({ animateLight: false });
  });
  autoButton.addEventListener('click', () => setControlMode('auto', 'Automatic PIR control active'));
  onButton.addEventListener('click', () => setControlMode('on', 'Bluetooth sent 1 · Leave ON'));
  offButton.addEventListener('click', () => setControlMode('off', 'Bluetooth sent 0 · Turn OFF'));
  motionButton.addEventListener('click', () => setMotion(!motion, !motion));
  disconnectButton.addEventListener('click', () => setControlMode('auto', 'Bluetooth disconnected · PIR resumed'));
  resetWiringButton.addEventListener('click', resetWiring);

  const resize = () => {
    const width = Math.max(1, stage.clientWidth);
    const height = Math.max(1, stage.clientHeight);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, tier.dprCap));
    renderer.setSize(width, height, false);
    requestRender();
  };
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(stage);

  const applyTestState = async (name) => {
    const supported = new Set(['unwired', 'wired-off', 'wired-on', 'wired-motion', 'self-build']);
    if (!supported.has(name)) throw new Error(`Unknown 3D lab state: ${name}`);
    resetWiring();
    if (name !== 'unwired') WIRE_IDS.forEach((wireId) => addWire(wireId, false));
    buildMode = name === 'self-build' ? 'self' : 'guided';
    guidedInput.checked = buildMode === 'guided';
    selfInput.checked = buildMode === 'self';
    controlMode = name === 'wired-on' ? 'on' : 'auto';
    motion = name === 'wired-motion';
    animations.length = 0;
    toast.classList.remove('is-visible');
    updateUi({ animateLight: false });
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    return { state: name };
  };

  window.__THREE_GAME_DIAGNOSTICS__ = {
    get renderer() {
      return {
        calls: renderer.info.render.calls,
        triangles: renderer.info.render.triangles,
        geometries: renderer.info.memory.geometries,
        textures: renderer.info.memory.textures
      };
    },
    quality: {
      tier: tier.quality,
      dprCap: tier.dprCap,
      shadows: tier.shadows,
      postPasses: 0,
      physics: 'none'
    },
    assets: workbench.diagnostics,
    get state() {
      return { connected: connected.size, required: WIRE_IDS.length, buildMode, controlMode, motion, lightOn: isLightOn() };
    }
  };

  window.__THREE_GAME_TEST_HOOKS__ = {
    seed() { return 42; },
    setState: applyTestState,
    setPausedForScreenshot(next) {
      pausedForTest = Boolean(next);
      if (pausedForTest) window.clearTimeout(motionTimer);
      requestRender();
    },
    setReducedMotion(next) { reducedMotion = Boolean(next); },
    hideDebugUi() { return true; },
    getState() {
      return { connected: connected.size, required: WIRE_IDS.length, buildMode, controlMode, motion, lightOn: isLightOn() };
    },
    getCameraPosition() { return camera.position.toArray(); },
    getEndpointScreenPosition(endpointId) {
      const port = workbench.ports.get(endpointId);
      if (!port) throw new Error(`Unknown endpoint: ${endpointId}`);
      const projected = port.getWorldPosition(new THREE.Vector3()).project(camera);
      const rect = canvas.getBoundingClientRect();
      return {
        x: rect.left + ((projected.x + 1) / 2) * rect.width,
        y: rect.top + ((1 - projected.y) / 2) * rect.height
      };
    },
    getConnectionLabelScreenPosition(endpointId) {
      let label = null;
      workbench.root.traverse((object) => {
        if (object.userData.kind === 'port-label' && object.userData.endpointId === endpointId) label = object;
      });
      if (!label) throw new Error(`Unknown connection label: ${endpointId}`);
      const projected = label.getWorldPosition(new THREE.Vector3()).project(camera);
      const rect = canvas.getBoundingClientRect();
      return {
        x: rect.left + ((projected.x + 1) / 2) * rect.width,
        y: rect.top + ((1 - projected.y) / 2) * rect.height
      };
    }
  };

  qualityLabel.textContent = `${tier.quality === 'low' ? 'Reduced' : 'High'} detail · DPR ≤ ${tier.dprCap}`;
  resize();
  updateUi({ animateLight: false });
  requestRender();
}
