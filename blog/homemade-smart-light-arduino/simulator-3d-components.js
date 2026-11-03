import * as THREE from 'three';

export const WIRE_DEFINITIONS = Object.freeze({
  'rail-positive': Object.freeze({ id: 'rail-positive', endpoints: ['uno-vin', 'rail-positive-in'], label: 'Uno VIN → positive rail', color: '#ef6461' }),
  'rail-negative': Object.freeze({ id: 'rail-negative', endpoints: ['uno-gnd-rail', 'rail-negative-in'], label: 'Uno GND → negative rail', color: '#94a3b8' }),
  'pir-vcc': Object.freeze({ id: 'pir-vcc', endpoints: ['rail-positive-pir', 'pir-vcc'], label: 'Positive rail → PIR VCC', color: '#ff7b72' }),
  'pir-gnd': Object.freeze({ id: 'pir-gnd', endpoints: ['rail-negative-pir', 'pir-gnd'], label: 'Negative rail → PIR GND', color: '#cbd5e1' }),
  'pir-signal': Object.freeze({ id: 'pir-signal', endpoints: ['uno-d2', 'pir-out'], label: 'PIR OUT → Uno D2', color: '#f4d35e' }),
  'relay-dcplus': Object.freeze({ id: 'relay-dcplus', endpoints: ['rail-positive-relay', 'relay-dcplus'], label: 'Positive rail → relay DC+', color: '#fb7185' }),
  'relay-dcminus': Object.freeze({ id: 'relay-dcminus', endpoints: ['rail-negative-relay', 'relay-dcminus'], label: 'Negative rail → relay DC−', color: '#d8dee9' }),
  'relay-signal': Object.freeze({ id: 'relay-signal', endpoints: ['uno-d9', 'relay-in'], label: 'Relay IN → Uno D9', color: '#6ee7b7' }),
  'bt-vcc': Object.freeze({ id: 'bt-vcc', endpoints: ['uno-5v-bt', 'bt-vcc'], label: 'Uno 5V → HC-06 VCC', color: '#f28f3b' }),
  'bt-gnd': Object.freeze({ id: 'bt-gnd', endpoints: ['uno-gnd-bt', 'bt-gnd'], label: 'Uno GND → HC-06 GND', color: '#a8b3c5' }),
  'bt-tx': Object.freeze({ id: 'bt-tx', endpoints: ['uno-rx0', 'bt-tx'], label: 'HC-06 TX → Uno 0/RX', color: '#a78bfa' }),
  'bt-rx': Object.freeze({ id: 'bt-rx', endpoints: ['uno-tx1', 'bt-rx'], label: 'Uno 1/TX → HC-06 RX', color: '#38bdf8' })
});

export const COMPONENT_INFO = Object.freeze({
  uno: Object.freeze({ name: 'Arduino Uno-compatible board', eyebrow: 'Controller', purpose: 'Reads PIR motion and Bluetooth commands, then controls the relay.', connections: 'D2 · D9 · 0/RX · 1/TX · 5V · GND · VIN' }),
  breadboard: Object.freeze({ name: 'Breadboard power rails', eyebrow: 'Distribution', purpose: 'Distributes the historical VIN and GND rail connections to the PIR and relay.', connections: 'Positive rail · Negative rail' }),
  pir: Object.freeze({ name: 'HC-SR501 PIR sensor', eyebrow: 'Automatic input', purpose: 'Detects changes in infrared energy associated with movement and raises its OUT pin.', connections: 'VCC · OUT → D2 · GND' }),
  relay: Object.freeze({ name: '5V single-channel relay', eyebrow: 'Output switch', purpose: 'Lets the Arduino switch the lamp path. The prototype selector jumper was set to H.', connections: 'DC+ · DC− · IN → D9 · COM/NO load side' }),
  bluetooth: Object.freeze({ name: 'HC-06 Bluetooth module', eyebrow: 'Manual input', purpose: 'Receives the app’s text commands over serial: 1 for Leave ON and 0 for Turn OFF.', connections: 'VCC → 5V · GND · TX → 0/RX · RX ← 1/TX' }),
  battery: Object.freeze({ name: '9V battery holder', eyebrow: 'Historical supply', purpose: 'Powered the Uno through its barrel connector in the original prototype.', connections: 'Prewired holder → Uno barrel jack' }),
  lamp: Object.freeze({ name: 'Bulb and socket', eyebrow: 'Visible output', purpose: 'Illuminates when the relay-controlled simulation state is ON.', connections: 'Enclosed historical COM/NO load path' })
});

const LOW = 'low';
const PRIMARY_LABELS = new Set(['ELEGOO UNO R3', 'ATmega328P', 'HC-SR501', 'SRD-05VDC', 'HC-06', '9V', 'HOLDER', 'LAMP']);

function materialKit() {
  const standard = (color, roughness = 0.62, metalness = 0) => new THREE.MeshStandardMaterial({ color, roughness, metalness });
  return {
    table: standard(0x173c40, 0.82),
    tableEdge: standard(0x092a30, 0.75),
    pcbBlue: standard(0x087e92, 0.48),
    pcbGreen: standard(0x1d825e, 0.53),
    pcbRelay: standard(0x91343b, 0.58),
    pcbBluetooth: standard(0x246b9a, 0.5),
    breadboard: standard(0xe9e6dc, 0.86),
    darkPlastic: standard(0x101c1f, 0.82),
    blackPlastic: standard(0x06090a, 0.9),
    bluePlastic: standard(0x178fd0, 0.52),
    greenPlastic: standard(0x4c9a5d, 0.64),
    orangePlastic: standard(0xe39a2b, 0.62),
    whitePlastic: standard(0xf0f1e9, 0.76),
    silver: standard(0xb8c1be, 0.28, 0.9),
    copper: standard(0xbc7138, 0.42, 0.72),
    gold: standard(0xc79b3a, 0.35, 0.72),
    redRail: standard(0xd84e55, 0.72),
    blueRail: standard(0x4c78ab, 0.72),
    brownCable: standard(0x3b2118, 0.82),
    redCable: standard(0xb72e35, 0.76),
    blackCable: standard(0x111719, 0.88),
    glass: new THREE.MeshPhysicalMaterial({ color: 0xffe7a4, emissive: 0xffc65d, emissiveIntensity: 0.04, roughness: 0.18, metalness: 0, transparent: true, opacity: 0.58, depthWrite: false, clearcoat: 0.75 }),
    dome: new THREE.MeshPhysicalMaterial({ color: 0xf2f4e9, roughness: 0.64, metalness: 0, transparent: true, opacity: 0.92 }),
    hole: standard(0x4f5c5d, 0.96),
    labelLight: new THREE.MeshBasicMaterial({ color: 0xe7efed, toneMapped: false }),
    labelDark: new THREE.MeshBasicMaterial({ color: 0x193033, toneMapped: false })
  };
}

function box(parent, size, position, material, name, rotation = null) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
  mesh.position.fromArray(position);
  if (rotation) mesh.rotation.set(...rotation);
  mesh.name = name;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function cylinder(parent, radius, height, position, material, name, segments = 16, rotation = null) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, height, segments), material);
  mesh.position.fromArray(position);
  if (rotation) mesh.rotation.set(...rotation);
  mesh.name = name;
  mesh.castShadow = true;
  parent.add(mesh);
  return mesh;
}

function canvasLabel(text, width = 1, height = 0.24, options = {}) {
  const scale = options.scale || 2;
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(128, Math.round(width * 180 * scale));
  canvas.height = Math.max(48, Math.round(height * 180 * scale));
  const context = canvas.getContext('2d');
  context.clearRect(0, 0, canvas.width, canvas.height);
  if (options.background) {
    context.fillStyle = options.background;
    context.fillRect(0, 0, canvas.width, canvas.height);
  }
  if (options.borderColor) {
    context.strokeStyle = options.borderColor;
    context.lineWidth = Math.max(3, Math.round(canvas.height * .06));
    context.strokeRect(context.lineWidth / 2, context.lineWidth / 2, canvas.width - context.lineWidth, canvas.height - context.lineWidth);
  }
  context.fillStyle = options.color || '#eff7f4';
  const requestedFontScale = options.fontScale || .5;
  const readableFontScale = Math.min(.82, Math.max(.58, requestedFontScale * 1.36));
  context.font = `${options.weight || 800} ${Math.round(canvas.height * readableFontScale)}px ${options.font || 'Arial, sans-serif'}`;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText(text, canvas.width / 2, canvas.height / 2, canvas.width * .94);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false, depthTest: !options.alwaysVisible, toneMapped: false, side: THREE.DoubleSide });
  const plane = new THREE.Mesh(new THREE.PlaneGeometry(width, height), material);
  plane.rotation.x = -Math.PI / 2;
  plane.renderOrder = options.alwaysVisible ? 12 : 3;
  return plane;
}

function addTopLabel(parent, text, position, width, height = .22, options = {}) {
  const label = canvasLabel(text, width, height, options);
  label.position.fromArray(position);
  if (PRIMARY_LABELS.has(text)) {
    label.scale.set(1.45, 1.45, 1);
    label.position.y += .012;
  }
  label.name = `label-${text}`;
  parent.add(label);
  return label;
}

function addConnectionLabel(parent, { endpointId, wireId, text, position, width = .46 }) {
  const label = addTopLabel(parent, text, position, width, .21, {
    background: '#06272d',
    borderColor: WIRE_DEFINITIONS[wireId].color,
    color: '#ffffff',
    fontScale: .68,
    weight: 800,
    alwaysVisible: true
  });
  label.userData = { kind: 'port-label', endpointId, wireId };
  return label;
}

function addTube(parent, points, radius, material, name, segments = 24) {
  const curve = new THREE.CatmullRomCurve3(points.map((point) => new THREE.Vector3(...point)));
  const mesh = new THREE.Mesh(new THREE.TubeGeometry(curve, segments, radius, 6, false), material);
  mesh.name = name;
  mesh.castShadow = true;
  parent.add(mesh);
  return mesh;
}

function componentGroup(root, components, id, position) {
  const group = new THREE.Group();
  group.name = id;
  group.position.fromArray(position);
  group.userData = { kind: 'component', componentId: id };
  root.add(group);
  components.set(id, group);
  return group;
}

function registerComponentMeshes(group, componentId) {
  group.traverse((object) => {
    if (!object.isMesh || object.userData.kind === 'port' || object.userData.kind === 'port-label') return;
    object.userData.kind = 'component';
    object.userData.componentId = componentId;
  });
}

function portFactory(materials, ports, quality) {
  const geometry = new THREE.CylinderGeometry(quality === LOW ? .14 : .125, quality === LOW ? .14 : .125, .085, quality === LOW ? 10 : 14);
  const materialCache = new Map();
  return (parent, config) => {
    const color = WIRE_DEFINITIONS[config.wireId].color;
    let material = materialCache.get(color);
    if (!material) {
      material = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: .18, roughness: .38, metalness: .45 });
      materialCache.set(color, material);
    }
    box(parent, [.3, .1, .3], [config.position[0], config.position[1] - .075, config.position[2]], materials.blackPlastic, `${config.endpointId}-header`);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.fromArray(config.position);
    mesh.name = config.endpointId;
    mesh.castShadow = true;
    mesh.userData = {
      kind: 'port',
      endpointId: config.endpointId,
      wireId: config.wireId,
      label: config.label,
      componentId: config.componentId,
      baseEmissiveIntensity: .18
    };
    parent.add(mesh);
    ports.set(config.endpointId, mesh);
    return mesh;
  };
}

function createUno(root, components, ports, materials, makePort, quality) {
  const group = componentGroup(root, components, 'uno', [-2.55, .14, .25]);
  box(group, [4.25, .16, 2.72], [0, 0, 0], materials.pcbBlue, 'uno-pcb');
  box(group, [3.9, .035, .06], [0, .105, -1.22], materials.labelLight, 'uno-top-silkscreen');
  box(group, [3.9, .035, .06], [0, .105, 1.22], materials.labelLight, 'uno-bottom-silkscreen');
  addTopLabel(group, 'ELEGOO UNO R3', [0, .115, .35], 2.25, .34, { color: '#eef9f7', fontScale: .46 });
  addTopLabel(group, 'ATmega328P', [0, .31, -.15], 1.15, .18, { color: '#c6dbd8', fontScale: .42 });

  box(group, [1.5, .22, .48], [0, .22, -.22], materials.darkPlastic, 'atmega-chip');
  const pinCount = quality === LOW ? 8 : 14;
  for (let i = 0; i < pinCount; i += 1) {
    const x = -0.65 + (i % 7) * .215;
    const z = i < 7 ? -.51 : .08;
    box(group, [.1, .035, .11], [x, .23, z], materials.silver, `chip-pin-${i}`);
  }

  box(group, [.74, .62, .92], [-1.72, .37, -.57], materials.silver, 'usb-port');
  box(group, [.42, .22, .58], [-1.76, .38, -.57], materials.darkPlastic, 'usb-cavity');
  cylinder(group, .34, .58, [1.72, .34, -.72], materials.darkPlastic, 'barrel-jack', 16, [0, 0, Math.PI / 2]);
  cylinder(group, .13, .61, [1.73, .34, -.72], materials.silver, 'barrel-contact', 12, [0, 0, Math.PI / 2]);
  box(group, [.42, .16, .3], [1.33, .18, .73], materials.orangePlastic, 'reset-button');
  addTopLabel(group, 'RESET', [1.33, .28, 1.02], .58, .14, { color: '#eff9f5', fontScale: .36 });

  for (let i = 0; i < 3; i += 1) {
    cylinder(group, .12 + i * .018, .33, [1.05 + i * .31, .26, -.02 + i * .18], materials.blackPlastic, `capacitor-${i}`, 12);
  }
  box(group, [.48, .12, .22], [.65, .18, -.75], materials.silver, 'crystal');

  box(group, [3.42, .22, .33], [.2, .21, -1.08], materials.blackPlastic, 'digital-header');
  box(group, [2.55, .22, .33], [.56, .21, 1.08], materials.blackPlastic, 'power-header');

  const portY = .39;
  const digitalPorts = [
    ['uno-rx0', 'bt-tx', '0 / RX', -1.27],
    ['uno-tx1', 'bt-rx', '1 / TX', -.85],
    ['uno-d2', 'pir-signal', 'D2', -.43],
    ['uno-d9', 'relay-signal', 'D9', 1.48]
  ];
  digitalPorts.forEach(([endpointId, wireId, label, x], index) => {
    makePort(group, { endpointId, wireId, label, componentId: 'uno', position: [x, portY, -1.08] });
    addConnectionLabel(group, {
      endpointId, wireId, text: label,
      position: [x + (index % 2 ? .04 : -.04), .52, index % 2 ? -.55 : -.79],
      width: label.length > 3 ? .54 : .43
    });
  });

  const powerPorts = [
    ['uno-vin', 'rail-positive', 'VIN', -.44],
    ['uno-gnd-rail', 'rail-negative', 'GND', .02],
    ['uno-gnd-bt', 'bt-gnd', 'GND', .48],
    ['uno-5v-bt', 'bt-vcc', '5V', .94]
  ];
  powerPorts.forEach(([endpointId, wireId, label, x], index) => {
    makePort(group, { endpointId, wireId, label, componentId: 'uno', position: [x, portY, 1.08] });
    addConnectionLabel(group, {
      endpointId, wireId, text: label,
      position: [x + (index % 2 ? .04 : -.04), .52, index % 2 ? .55 : .79],
      width: .48
    });
  });

  registerComponentMeshes(group, 'uno');
  return group;
}

function createBreadboard(root, components, ports, materials, makePort, quality) {
  const group = componentGroup(root, components, 'breadboard', [2.05, .12, -.45]);
  box(group, [4.15, .22, 2.42], [0, 0, 0], materials.breadboard, 'breadboard-body');
  box(group, [3.85, .025, .08], [0, .13, -.78], materials.redRail, 'positive-rail-line');
  box(group, [3.85, .025, .08], [0, .13, .78], materials.blueRail, 'negative-rail-line');
  box(group, [3.9, .04, .18], [0, .14, 0], materials.tableEdge, 'breadboard-trench');
  addTopLabel(group, '+', [-1.92, .15, -.78], .18, .18, { color: '#b9232d', fontScale: .74 });
  addTopLabel(group, '−', [-1.92, .15, .78], .18, .18, { color: '#315f9a', fontScale: .74 });

  const columns = quality === LOW ? 14 : 20;
  const rows = quality === LOW ? 6 : 8;
  const holeGeometry = new THREE.CylinderGeometry(.042, .042, .025, 6);
  const holes = new THREE.InstancedMesh(holeGeometry, materials.hole, columns * rows);
  const matrix = new THREE.Matrix4();
  let index = 0;
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const x = -1.72 + column * (3.44 / (columns - 1));
      const z = -.52 + row * (1.04 / (rows - 1));
      matrix.makeTranslation(x, .13, z);
      holes.setMatrixAt(index, matrix);
      index += 1;
    }
  }
  holes.instanceMatrix.needsUpdate = true;
  holes.name = 'breadboard-holes';
  holes.userData = { kind: 'component', componentId: 'breadboard' };
  group.add(holes);

  const railPorts = [
    ['rail-positive-in', 'rail-positive', 'VIN IN', -1.36, -.98],
    ['rail-positive-pir', 'pir-vcc', 'PIR +', -.42, -.98],
    ['rail-positive-relay', 'relay-dcplus', 'RELAY +', .66, -.98],
    ['rail-negative-in', 'rail-negative', 'GND IN', -1.36, .98],
    ['rail-negative-pir', 'pir-gnd', 'PIR −', -.42, .98],
    ['rail-negative-relay', 'relay-dcminus', 'RELAY −', .66, .98]
  ];
  railPorts.forEach(([endpointId, wireId, label, x, z]) => {
    makePort(group, { endpointId, wireId, label, componentId: 'breadboard', position: [x, .31, z] });
    addConnectionLabel(group, { endpointId, wireId, text: label, position: [x, .47, z > 0 ? 1.22 : -1.22], width: .74 });
  });

  registerComponentMeshes(group, 'breadboard');
  return group;
}

function createPir(root, components, ports, materials, makePort, quality) {
  const group = componentGroup(root, components, 'pir', [4.65, .18, -2.4]);
  group.scale.setScalar(1.12);
  box(group, [1.72, .15, 1.45], [0, 0, 0], materials.pcbGreen, 'pir-pcb');
  addTopLabel(group, 'HC-SR501', [0, .105, -.54], 1.02, .18, { color: '#e8f5ef', fontScale: .36 });

  const dome = new THREE.Mesh(new THREE.SphereGeometry(.48, quality === LOW ? 14 : 22, quality === LOW ? 8 : 12, 0, Math.PI * 2, 0, Math.PI / 2), materials.dome);
  dome.position.set(0, .12, .05);
  dome.name = 'pir-fresnel-dome';
  dome.castShadow = true;
  group.add(dome);
  for (let ring = 1; ring <= (quality === LOW ? 2 : 4); ring += 1) {
    const ringMesh = new THREE.Mesh(new THREE.TorusGeometry(.12 * ring, .012, 5, 24), materials.whitePlastic);
    ringMesh.rotation.x = Math.PI / 2;
    ringMesh.position.set(0, .28 + ring * .055, .05);
    ringMesh.scale.z = .82;
    group.add(ringMesh);
  }
  cylinder(group, .115, .09, [-.53, .14, -.3], materials.orangePlastic, 'pir-sensitivity-pot', 12);
  cylinder(group, .115, .09, [.53, .14, -.3], materials.orangePlastic, 'pir-delay-pot', 12);
  const pirSignal = new THREE.MeshStandardMaterial({ color: 0x14322a, emissive: 0x6ee7b7, emissiveIntensity: .05, roughness: .48 });
  cylinder(group, .065, .08, [.66, .15, .47], pirSignal, 'pir-signal-led', 10);

  const entries = [
    ['pir-vcc', 'pir-vcc', 'VCC', -.42],
    ['pir-out', 'pir-signal', 'OUT', 0],
    ['pir-gnd', 'pir-gnd', 'GND', .42]
  ];
  entries.forEach(([endpointId, wireId, label, x]) => {
    makePort(group, { endpointId, wireId, label, componentId: 'pir', position: [x, .32, .62] });
    addConnectionLabel(group, { endpointId, wireId, text: label, position: [x, .58, .91], width: .46 });
  });
  registerComponentMeshes(group, 'pir');
  return { group, pirSignal };
}

function createRelay(root, components, ports, materials, makePort) {
  const group = componentGroup(root, components, 'relay', [3.62, .16, 2.16]);
  box(group, [2.82, .16, 1.78], [0, 0, 0], materials.pcbRelay, 'relay-pcb');
  box(group, [1.18, .72, 1.02], [.2, .43, .08], materials.bluePlastic, 'relay-cube');
  addTopLabel(group, 'SRD-05VDC', [.2, .805, .08], .95, .2, { color: '#e4f6ff', fontScale: .32 });

  box(group, [.58, .5, 1.5], [1.04, .3, 0], materials.bluePlastic, 'load-terminal-block');
  const loadNames = ['NC', 'COM', 'NO'];
  loadNames.forEach((label, index) => {
    const z = -.48 + index * .48;
    cylinder(group, .105, .06, [1.04, .58, z], materials.silver, `relay-${label}-screw`, 12);
    addTopLabel(group, label, [.68, .11, z], .38, .13, { color: '#f6e9e2', fontScale: .36 });
  });

  box(group, [.42, .22, .32], [-.22, .2, -.61], materials.greenPlastic, 'trigger-jumper');
  addTopLabel(group, 'L  H', [-.22, .34, -.61], .52, .16, { color: '#f5e6bd', fontScale: .4 });
  box(group, [.12, .18, .18], [-.1, .38, -.61], materials.blackPlastic, 'trigger-jumper-cap');

  const relayLed = new THREE.MeshStandardMaterial({ color: 0x351a1a, emissive: 0xff655f, emissiveIntensity: .05, roughness: .42 });
  cylinder(group, .07, .08, [-.32, .16, .52], relayLed, 'relay-status-led', 10);

  const inputs = [
    ['relay-dcminus', 'relay-dcminus', 'DC−', -.52],
    ['relay-dcplus', 'relay-dcplus', 'DC+', 0],
    ['relay-in', 'relay-signal', 'IN', .52]
  ];
  inputs.forEach(([endpointId, wireId, label, z]) => {
    makePort(group, { endpointId, wireId, label, componentId: 'relay', position: [-1.16, .32, z] });
    addConnectionLabel(group, { endpointId, wireId, text: label, position: [-1.49, .5, z], width: .48 });
  });

  registerComponentMeshes(group, 'relay');
  return { group, relayLed };
}

function createBluetooth(root, components, ports, materials, makePort, quality) {
  const group = componentGroup(root, components, 'bluetooth', [-.15, .16, 3.08]);
  box(group, [2.3, .14, 1.18], [0, 0, 0], materials.pcbBluetooth, 'hc06-pcb');
  box(group, [.58, .12, .44], [-.05, .16, .03], materials.darkPlastic, 'hc06-chip');
  addTopLabel(group, 'HC-06', [.33, .105, -.4], .72, .18, { color: '#e8f5ff', fontScale: .42 });

  const traceCount = quality === LOW ? 5 : 9;
  for (let i = 0; i < traceCount; i += 1) {
    const x = -.86 + (i % 3) * .18;
    const z = -.34 + Math.floor(i / 3) * .18;
    box(group, [.12, .028, .025], [x, .095, z], materials.gold, `antenna-trace-${i}`);
  }
  const bluetoothLed = new THREE.MeshStandardMaterial({ color: 0x12242c, emissive: 0x52c8ff, emissiveIntensity: .08, roughness: .4 });
  cylinder(group, .065, .07, [.8, .15, -.32], bluetoothLed, 'hc06-status-led', 10);

  const pins = [
    ['bt-vcc', 'bt-vcc', 'VCC', -.72],
    ['bt-gnd', 'bt-gnd', 'GND', -.24],
    ['bt-tx', 'bt-tx', 'TX', .24],
    ['bt-rx', 'bt-rx', 'RX', .72]
  ];
  pins.forEach(([endpointId, wireId, label, x]) => {
    makePort(group, { endpointId, wireId, label, componentId: 'bluetooth', position: [x, .32, .52] });
    addConnectionLabel(group, { endpointId, wireId, text: label, position: [x, .5, .82], width: .45 });
  });

  registerComponentMeshes(group, 'bluetooth');
  return { group, bluetoothLed };
}

function createBattery(root, components, materials, quality) {
  const group = componentGroup(root, components, 'battery', [-4.85, .2, -2.05]);
  box(group, [1.55, .28, 2.18], [0, 0, 0], materials.blackPlastic, 'battery-holder');
  box(group, [1.28, .72, 1.84], [0, .47, 0], materials.gold, 'nine-volt-battery');
  box(group, [1.3, .18, .54], [0, .86, -.64], materials.darkPlastic, 'battery-cap');
  cylinder(group, .14, .12, [-.26, .99, -.68], materials.silver, 'battery-terminal-small', quality === LOW ? 8 : 12);
  cylinder(group, .19, .12, [.28, .99, -.68], materials.silver, 'battery-terminal-large', quality === LOW ? 8 : 12);
  addTopLabel(group, '9V', [0, .845, .12], .7, .44, { color: '#192325', background: '#d4a83e', fontScale: .7 });
  addTopLabel(group, 'HOLDER', [0, .845, .55], .9, .18, { color: '#172427', background: '#d4a83e', fontScale: .34 });
  registerComponentMeshes(group, 'battery');
  return group;
}

function createLamp(root, components, materials, quality) {
  const group = componentGroup(root, components, 'lamp', [5.15, .15, 1.85]);
  cylinder(group, .52, .22, [0, .11, 0], materials.tableEdge, 'lamp-base', quality === LOW ? 16 : 24);
  cylinder(group, .32, .66, [0, .52, 0], materials.silver, 'lamp-socket', quality === LOW ? 14 : 20);
  for (let i = 0; i < 4; i += 1) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(.325, .035, 6, quality === LOW ? 14 : 24), materials.tableEdge);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = .3 + i * .13;
    group.add(ring);
  }
  const profile = [
    new THREE.Vector2(.18, 0), new THREE.Vector2(.34, .16), new THREE.Vector2(.54, .48),
    new THREE.Vector2(.58, .82), new THREE.Vector2(.45, 1.15), new THREE.Vector2(.22, 1.33), new THREE.Vector2(0, 1.38)
  ];
  const bulb = new THREE.Mesh(new THREE.LatheGeometry(profile, quality === LOW ? 18 : 28), materials.glass);
  bulb.position.y = .78;
  bulb.name = 'illuminating-bulb';
  bulb.castShadow = true;
  group.add(bulb);
  const filament = addTube(group, [[-.12, .95, 0], [-.08, 1.24, 0], [0, 1.08, 0], [.08, 1.24, 0], [.12, .95, 0]], .018, materials.copper, 'bulb-filament', 16);
  filament.position.y = .4;
  const bulbLight = new THREE.PointLight(0xffcf74, 0, 5.5, 2.1);
  bulbLight.position.set(0, 1.55, 0);
  bulbLight.name = 'bulb-light';
  group.add(bulbLight);
  addTopLabel(group, 'LAMP', [0, .24, .73], .75, .2, { color: '#d8e8e5', fontScale: .4 });
  registerComponentMeshes(group, 'lamp');
  return { group, bulbLight };
}

function createWorkbench(root, materials, quality) {
  box(root, [11.8, .34, 7.8], [0, -.3, .22], materials.table, 'workbench-surface');
  box(root, [12.1, .22, .22], [0, -.48, -3.72], materials.tableEdge, 'bench-front-edge');
  box(root, [12.1, .22, .22], [0, -.48, 4.15], materials.tableEdge, 'bench-back-edge');
  const gridMaterial = new THREE.LineBasicMaterial({ color: 0x31565a, transparent: true, opacity: .25 });
  const gridPoints = [];
  const spacing = quality === LOW ? 1 : .5;
  for (let x = -5.5; x <= 5.5; x += spacing) gridPoints.push(x, -.115, -3.5, x, -.115, 3.9);
  for (let z = -3.5; z <= 3.9; z += spacing) gridPoints.push(-5.5, -.115, z, 5.5, -.115, z);
  const gridGeometry = new THREE.BufferGeometry();
  gridGeometry.setAttribute('position', new THREE.Float32BufferAttribute(gridPoints, 3));
  const grid = new THREE.LineSegments(gridGeometry, gridMaterial);
  grid.name = 'workbench-grid';
  root.add(grid);
}

function addHistoricalCables(root, materials, quality) {
  const segments = quality === LOW ? 12 : 26;
  addTube(root, [[-4.85, .9, -2.55], [-4.3, 1.1, -1.45], [-3.6, .9, -.72], [-1.02, .62, -.47]], .045, materials.redCable, 'battery-red-lead', segments);
  addTube(root, [[-4.85, .86, -2.62], [-4.25, .82, -1.65], [-3.45, .72, -.82], [-.95, .55, -.47]], .045, materials.blackCable, 'battery-black-lead', segments);
  addTube(root, [[4.65, .58, 2.16], [4.95, .72, 2.05], [5.08, .52, 1.96]], .07, materials.brownCable, 'enclosed-load-cable', segments);
}

function collectDiagnostics(root) {
  const geometries = new Set();
  const materials = new Set();
  const textures = new Set();
  let meshes = 0;
  let instances = 0;
  let triangles = 0;
  root.traverse((object) => {
    if (!object.isMesh && !object.isInstancedMesh) return;
    meshes += 1;
    const multiplier = object.isInstancedMesh ? object.count : 1;
    if (object.isInstancedMesh) instances += object.count;
    if (object.geometry) {
      geometries.add(object.geometry);
      const count = object.geometry.index ? object.geometry.index.count : object.geometry.attributes.position?.count || 0;
      triangles += Math.round((count / 3) * multiplier);
    }
    const list = Array.isArray(object.material) ? object.material : [object.material];
    list.forEach((material) => {
      if (!material) return;
      materials.add(material);
      Object.values(material).forEach((value) => { if (value?.isTexture) textures.add(value); });
    });
  });
  return { meshes, instances, triangles, geometries: geometries.size, materials: materials.size, textures: textures.size };
}

function pruneLowTierDetails(root) {
  const essentialLabels = new Set([
    'label-ELEGOO UNO R3', 'label-D2', 'label-D9', 'label-VIN', 'label-GND', 'label-5V',
    'label-HC-SR501', 'label-SRD-05VDC', 'label-L  H', 'label-HC-06', 'label-LAMP',
    'label-+', 'label-−'
  ]);
  const decorativeNames = /^(chip-pin-|antenna-trace-|.*-header$|uno-(top|bottom)-silkscreen$|usb-cavity$|barrel-contact$|reset-button$|crystal$|capacitor-|battery-terminal-|bulb-filament$)/;
  root.traverse((object) => {
    if (object.userData.kind === 'port-label') return;
    if (object.name?.startsWith('label-') && !essentialLabels.has(object.name)) object.visible = false;
    if (decorativeNames.test(object.name || '')) object.visible = false;
    if (object.geometry?.type === 'TorusGeometry') object.visible = false;
  });
}

export function createSmartLightWorkbench({ quality = 'high' } = {}) {
  const normalizedQuality = quality === LOW ? LOW : 'high';
  const root = new THREE.Group();
  root.name = 'smart-light-workbench';
  const components = new Map();
  const ports = new Map();
  const materials = materialKit();
  const makePort = portFactory(materials, ports, normalizedQuality);

  createWorkbench(root, materials, normalizedQuality);
  createUno(root, components, ports, materials, makePort, normalizedQuality);
  createBreadboard(root, components, ports, materials, makePort, normalizedQuality);
  const pir = createPir(root, components, ports, materials, makePort, normalizedQuality);
  const relay = createRelay(root, components, ports, materials, makePort);
  const bluetooth = createBluetooth(root, components, ports, materials, makePort, normalizedQuality);
  createBattery(root, components, materials, normalizedQuality);
  const lamp = createLamp(root, components, materials, normalizedQuality);
  addHistoricalCables(root, materials, normalizedQuality);
  if (normalizedQuality === LOW) pruneLowTierDetails(root);
  root.updateMatrixWorld(true);
  const connectionLabels = [];
  root.traverse((object) => {
    if (object.userData.kind !== 'port-label') return;
    if (normalizedQuality === LOW) object.scale.multiplyScalar(1.35);
    connectionLabels.push(object);
  });

  const stateVisuals = {
    bulbMaterial: materials.glass,
    bulbLight: lamp.bulbLight,
    relayLedMaterial: relay.relayLed,
    pirSignalMaterial: pir.pirSignal,
    bluetoothLedMaterial: bluetooth.bluetoothLed
  };

  return {
    root,
    ports,
    connectionLabels,
    components,
    stateVisuals,
    materials,
    diagnostics: collectDiagnostics(root)
  };
}
