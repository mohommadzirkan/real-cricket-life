import * as THREE from 'three';
import { createBallTexture, createBatWillowTexture } from './textures';

export interface WicketRig {
  group: THREE.Group;
  stumps: THREE.Mesh[];
  bails: THREE.Mesh[];
  restPositions: { pos: THREE.Vector3; rot: THREE.Euler }[];
  velocities: THREE.Vector3[];
  angVelocities: THREE.Vector3[];
  broken: boolean;
}

export function createWicketSet(): WicketRig {
  const group = new THREE.Group();
  const stumpMat = new THREE.MeshStandardMaterial({
    color: 0xe6c88c,
    roughness: 0.42,
    metalness: 0.05,
  });
  const capMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.25,
    metalness: 0.8,
  });
  const bailMat = new THREE.MeshStandardMaterial({
    color: 0xf1d49b,
    roughness: 0.38,
    metalness: 0.05,
  });

  const stumps: THREE.Mesh[] = [];
  const bails: THREE.Mesh[] = [];
  const restPositions: { pos: THREE.Vector3; rot: THREE.Euler }[] = [];
  const velocities: THREE.Vector3[] = [];
  const angVelocities: THREE.Vector3[] = [];

  const stumpGeo = new THREE.CylinderGeometry(0.018, 0.02, 0.71, 14);
  const capGeo = new THREE.CylinderGeometry(0.019, 0.019, 0.03, 14);
  const xOffsets = [-0.114, 0, 0.114];

  xOffsets.forEach((x) => {
    const stump = new THREE.Mesh(stumpGeo, stumpMat);
    stump.position.set(x, 0.355, 0);
    stump.castShadow = true;

    const cap = new THREE.Mesh(capGeo, capMat);
    cap.position.set(0, 0.34, 0);
    stump.add(cap);

    group.add(stump);
    stumps.push(stump);
    restPositions.push({ pos: stump.position.clone(), rot: stump.rotation.clone() });
    velocities.push(new THREE.Vector3());
    angVelocities.push(new THREE.Vector3());
  });

  const bailGeo = new THREE.CylinderGeometry(0.011, 0.011, 0.105, 10);
  bailGeo.rotateZ(Math.PI / 2);

  [-0.057, 0.057].forEach((x) => {
    const bail = new THREE.Mesh(bailGeo, bailMat);
    bail.position.set(x, 0.722, 0);
    bail.castShadow = true;
    group.add(bail);
    bails.push(bail);
    restPositions.push({ pos: bail.position.clone(), rot: bail.rotation.clone() });
    velocities.push(new THREE.Vector3());
    angVelocities.push(new THREE.Vector3());
  });

  return {
    group,
    stumps,
    bails,
    restPositions,
    velocities,
    angVelocities,
    broken: false,
  };
}

export function resetWicketRig(rig: WicketRig) {
  rig.broken = false;
  [...rig.stumps, ...rig.bails].forEach((mesh, idx) => {
    mesh.position.copy(rig.restPositions[idx].pos);
    mesh.rotation.copy(rig.restPositions[idx].rot);
    rig.velocities[idx].set(0, 0, 0);
    rig.angVelocities[idx].set(0, 0, 0);
  });
}

export function triggerWicketBreak(rig: WicketRig, impactDirZ: number) {
  if (rig.broken) return;
  rig.broken = true;
  const all = [...rig.stumps, ...rig.bails];
  all.forEach((_, idx) => {
    const isBail = idx >= 3;
    rig.velocities[idx].set(
      (Math.random() - 0.5) * (isBail ? 3.5 : 1.6),
      isBail ? 3.6 + Math.random() * 1.6 : 1.4 + Math.random() * 0.8,
      impactDirZ * (isBail ? 4.2 : 2.2 + Math.random() * 1.4)
    );
    rig.angVelocities[idx].set(
      (Math.random() - 0.5) * 14,
      (Math.random() - 0.5) * 10,
      (Math.random() - 0.5) * 14
    );
  });
}

export function stepWicketRig(rig: WicketRig, dt: number) {
  if (!rig.broken) return;
  const all = [...rig.stumps, ...rig.bails];
  all.forEach((mesh, idx) => {
    const vel = rig.velocities[idx];
    const ang = rig.angVelocities[idx];
    vel.y -= 9.81 * dt;
    mesh.position.addScaledVector(vel, dt);
    mesh.rotation.x += ang.x * dt;
    mesh.rotation.y += ang.y * dt;
    mesh.rotation.z += ang.z * dt;
    if (mesh.position.y < 0.04) {
      mesh.position.y = 0.04;
      vel.y *= -0.3;
      vel.x *= 0.72;
      vel.z *= 0.72;
      ang.multiplyScalar(0.75);
    }
  });
}

export interface CricketerOptions {
  jerseyColor: string;
  accentColor: string;
  skinTone: string;
  helmetColor?: string;
  batColor?: string;
  gloveColor?: string;
  hasHelmet?: boolean;
  hasPads?: boolean;
  hasBat?: boolean;
  isKeeper?: boolean;
  anisotropy?: number;
}

export interface CricketerRig {
  root: THREE.Group;
  torso: THREE.Group;
  headGroup: THREE.Group;
  rightArmPivot: THREE.Group;
  leftArmPivot: THREE.Group;
  rightLegPivot: THREE.Group;
  leftLegPivot: THREE.Group;
  batPivot: THREE.Group;
}

export function createCricketerRig(opts: CricketerOptions): CricketerRig {
  const root = new THREE.Group();

  const jerseyMat = new THREE.MeshStandardMaterial({
    color: opts.jerseyColor,
    roughness: 0.72,
    metalness: 0.05,
  });
  const accentMat = new THREE.MeshStandardMaterial({
    color: opts.accentColor,
    roughness: 0.5,
    metalness: 0.15,
  });
  const skinMat = new THREE.MeshStandardMaterial({
    color: opts.skinTone,
    roughness: 0.6,
    metalness: 0.02,
  });
  const padMat = new THREE.MeshStandardMaterial({
    color: 0xf1f5f9,
    roughness: 0.45,
    metalness: 0.08,
  });
  const bootMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.35,
    metalness: 0.12,
  });
  const gloveMat = new THREE.MeshStandardMaterial({
    color: opts.gloveColor || '#F8FAFC',
    roughness: 0.55,
    metalness: 0.05,
  });

  // Legs (grounded so bottom of boots = y:0)
  const makeLeg = (xOffset: number) => {
    const legPivot = new THREE.Group();
    legPivot.position.set(xOffset, 0.88, 0);

    const thigh = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.072, 0.42, 10), jerseyMat);
    thigh.position.set(0, -0.21, 0);
    thigh.castShadow = true;
    legPivot.add(thigh);

    const shin = new THREE.Mesh(
      new THREE.CylinderGeometry(opts.hasPads ? 0.082 : 0.064, opts.hasPads ? 0.078 : 0.052, 0.42, 10),
      opts.hasPads ? padMat : jerseyMat
    );
    shin.position.set(0, -0.61, 0);
    shin.castShadow = true;
    legPivot.add(shin);

    if (opts.hasPads) {
      const kneeRoll = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.11, 0.15), padMat);
      kneeRoll.position.set(0, -0.41, 0.02);
      legPivot.add(kneeRoll);
    }

    const boot = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.08, 0.22), bootMat);
    boot.position.set(0, -0.84, 0.04);
    boot.castShadow = true;
    legPivot.add(boot);

    root.add(legPivot);
    return legPivot;
  };

  const leftLegPivot = makeLeg(-0.11);
  const rightLegPivot = makeLeg(0.11);

  // Torso group (hinged at waist y = 0.90)
  const torso = new THREE.Group();
  torso.position.set(0, 0.9, 0);
  root.add(torso);

  const chest = new THREE.Mesh(new THREE.CylinderGeometry(0.185, 0.155, 0.54, 12), jerseyMat);
  chest.position.set(0, 0.27, 0);
  chest.castShadow = true;
  torso.add(chest);

  const collarStripe = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.16, 0.08, 12), accentMat);
  collarStripe.position.set(0, 0.52, 0);
  torso.add(collarStripe);

  // Head & Helmet
  const headGroup = new THREE.Group();
  headGroup.position.set(0, 0.62, 0);
  torso.add(headGroup);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.115, 16, 14), skinMat);
  head.position.set(0, 0.09, 0);
  head.castShadow = true;
  headGroup.add(head);

  if (opts.hasHelmet) {
    const helmetMat = new THREE.MeshStandardMaterial({
      color: opts.helmetColor || '#0F172A',
      roughness: 0.28,
      metalness: 0.35,
    });
    const shell = new THREE.Mesh(
      new THREE.SphereGeometry(0.128, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.65),
      helmetMat
    );
    shell.position.set(0, 0.1, -0.01);
    shell.castShadow = true;
    headGroup.add(shell);

    const peak = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.018, 0.09), helmetMat);
    peak.position.set(0, 0.11, 0.115);
    peak.rotation.x = 0.18;
    headGroup.add(peak);

    const grilleMat = new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      roughness: 0.22,
      metalness: 0.85,
    });
    const grille = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.008, 6, 16, Math.PI), grilleMat);
    grille.position.set(0, 0.045, 0.05);
    grille.rotation.x = Math.PI * 0.15;
    headGroup.add(grille);
  } else {
    const cap = new THREE.Mesh(
      new THREE.SphereGeometry(0.12, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.5),
      accentMat
    );
    cap.position.set(0, 0.1, 0);
    headGroup.add(cap);
  }

  // Arms
  const makeArm = (xOffset: number) => {
    const armPivot = new THREE.Group();
    armPivot.position.set(xOffset, 0.48, 0);

    const upper = new THREE.Mesh(new THREE.CylinderGeometry(0.056, 0.048, 0.28, 10), jerseyMat);
    upper.position.set(0, -0.14, 0);
    upper.castShadow = true;
    armPivot.add(upper);

    const forearm = new THREE.Mesh(new THREE.CylinderGeometry(0.046, 0.038, 0.26, 10), skinMat);
    forearm.position.set(0, -0.38, 0.04);
    forearm.rotation.x = -0.3;
    forearm.castShadow = true;
    armPivot.add(forearm);

    const hand = new THREE.Mesh(
      new THREE.SphereGeometry(opts.hasBat || opts.isKeeper ? 0.052 : 0.038, 10, 10),
      opts.hasBat || opts.isKeeper ? gloveMat : skinMat
    );
    hand.position.set(0, -0.5, 0.08);
    armPivot.add(hand);

    torso.add(armPivot);
    return armPivot;
  };

  const leftArmPivot = makeArm(-0.22);
  const rightArmPivot = makeArm(0.22);

  // Composite 4-part Willow Cricket Bat attached to batPivot
  const batPivot = new THREE.Group();
  batPivot.position.set(0.05, 0.14, 0.25);
  torso.add(batPivot);

  if (opts.hasBat) {
    const handleGripMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.78,
      metalness: 0.05,
    });
    const batTex = createBatWillowTexture(
      opts.batColor || '#D6B27A',
      opts.accentColor || '#10B981',
      opts.anisotropy || 4
    );
    const bladeMat = new THREE.MeshStandardMaterial({
      map: batTex,
      roughness: 0.36,
      metalness: 0.05,
    });
    const toeGuardMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.85,
    });

    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.017, 0.019, 0.29, 10), handleGripMat);
    handle.position.set(0, -0.1, 0);
    batPivot.add(handle);

    const shoulder = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.045, 0.08, 8), bladeMat);
    shoulder.position.set(0, -0.27, 0);
    batPivot.add(shoulder);

    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.108, 0.54, 0.046), bladeMat);
    blade.position.set(0, -0.56, 0);
    blade.castShadow = true;
    batPivot.add(blade);

    const toeGuard = new THREE.Mesh(new THREE.BoxGeometry(0.108, 0.024, 0.048), toeGuardMat);
    toeGuard.position.set(0, -0.84, 0);
    batPivot.add(toeGuard);
  }

  return {
    root,
    torso,
    headGroup,
    rightArmPivot,
    leftArmPivot,
    rightLegPivot,
    leftLegPivot,
    batPivot,
  };
}

export function createCricketBall(
  ballColor: string,
  seamColor: string,
  anisotropy: number
): THREE.Group {
  const group = new THREE.Group();
  const tex = createBallTexture(ballColor, seamColor, anisotropy);
  const sphereMat = new THREE.MeshStandardMaterial({
    map: tex,
    roughness: 0.24,
    metalness: 0.08,
  });
  const ball = new THREE.Mesh(new THREE.SphereGeometry(0.036, 20, 20), sphereMat);
  ball.castShadow = true;
  group.add(ball);

  // Subtle physical raised seam ridge
  const seamMat = new THREE.MeshStandardMaterial({
    color: seamColor,
    roughness: 0.7,
  });
  const seam = new THREE.Mesh(new THREE.TorusGeometry(0.0365, 0.0022, 6, 28), seamMat);
  seam.rotation.y = Math.PI / 2;
  group.add(seam);

  return group;
}

export interface StadiumEnvironmentHandles {
  group: THREE.Group;
  crowdMesh: THREE.InstancedMesh;
  crowdCount: number;
  crowdBaseMatrices: THREE.Matrix4[];
  floodlightMaterials: THREE.MeshStandardMaterial[];
}

export function createStadiumEnvironment(
  adTex: THREE.CanvasTexture,
  isNightOrTwilight: boolean
): StadiumEnvironmentHandles {
  const group = new THREE.Group();

  // Boundary padded LED/ad perimeter ring (64m radius)
  const boundaryWallGeo = new THREE.CylinderGeometry(64.5, 64.5, 1.05, 64, 1, true);
  const boundaryWallMat = new THREE.MeshStandardMaterial({
    map: adTex,
    roughness: 0.4,
    metalness: 0.1,
    side: THREE.DoubleSide,
  });
  const boundaryWall = new THREE.Mesh(boundaryWallGeo, boundaryWallMat);
  boundaryWall.position.y = 0.52;
  group.add(boundaryWall);

  // Padded rope cushion right inside boundary
  const ropeGeo = new THREE.TorusGeometry(63.4, 0.18, 8, 72);
  ropeGeo.rotateX(Math.PI / 2);
  const ropeMat = new THREE.MeshStandardMaterial({
    color: 0xf8fafc,
    roughness: 0.55,
  });
  const rope = new THREE.Mesh(ropeGeo, ropeMat);
  rope.position.y = 0.15;
  group.add(rope);

  // Sightscreens behind North & South ends
  const sightscreenMat = new THREE.MeshStandardMaterial({
    color: 0xf8fafc,
    roughness: 0.7,
  });
  const frameMat = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    roughness: 0.4,
    metalness: 0.7,
  });

  [-65.5, 65.5].forEach((zPos) => {
    const screenGroup = new THREE.Group();
    const screen = new THREE.Mesh(new THREE.BoxGeometry(14, 5.2, 0.4), sightscreenMat);
    screen.position.y = 2.6;
    const frame = new THREE.Mesh(new THREE.BoxGeometry(14.6, 5.5, 0.25), frameMat);
    frame.position.set(0, 2.75, zPos < 0 ? -0.18 : 0.18);
    screenGroup.add(screen, frame);
    screenGroup.position.set(0, 0, zPos);
    group.add(screenGroup);
  });

  // Two-tier elliptical stadium bowl stands
  const tierColors = [0x14201b, 0x0f1714, 0x1e2924];
  [
    { rTop: 77, rBot: 67, h: 7.5, y: 3.75, color: tierColors[0] },
    { rTop: 92, rBot: 77.5, h: 10.5, y: 12.2, color: tierColors[1] },
    { rTop: 96, rBot: 91, h: 2.4, y: 18.6, color: tierColors[2] },
  ].forEach((tier) => {
    const geo = new THREE.CylinderGeometry(tier.rTop, tier.rBot, tier.h, 48, 1, true);
    const mat = new THREE.MeshStandardMaterial({
      color: tier.color,
      roughness: 0.85,
      metalness: 0.1,
      side: THREE.DoubleSide,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.y = tier.y;
    group.add(mesh);
  });

  // Stadium roof canopy ring
  const canopyGeo = new THREE.RingGeometry(74, 96, 48);
  canopyGeo.rotateX(-Math.PI / 2);
  const canopyMat = new THREE.MeshStandardMaterial({
    color: 0x0b1210,
    roughness: 0.45,
    metalness: 0.65,
    side: THREE.DoubleSide,
  });
  const canopy = new THREE.Mesh(canopyGeo, canopyMat);
  canopy.position.y = 21;
  group.add(canopy);

  // 4 Monumental Floodlight Pylons
  const floodlightMaterials: THREE.MeshStandardMaterial[] = [];
  const pylonMat = new THREE.MeshStandardMaterial({
    color: 0x334155,
    roughness: 0.35,
    metalness: 0.82,
  });
  const lampMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: isNightOrTwilight ? 0xfff7e6 : 0x334155,
    emissiveIntensity: isNightOrTwilight ? 3.2 : 0.15,
    roughness: 0.15,
  });
  floodlightMaterials.push(lampMat);

  const angles = [Math.PI * 0.25, Math.PI * 0.75, Math.PI * 1.25, Math.PI * 1.75];
  angles.forEach((ang) => {
    const pylonGroup = new THREE.Group();
    const dist = 88;
    pylonGroup.position.set(Math.cos(ang) * dist, 0, Math.sin(ang) * dist);
    pylonGroup.lookAt(0, 12, 0);

    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 1.25, 42, 10), pylonMat);
    mast.position.y = 21;
    pylonGroup.add(mast);

    const headFrame = new THREE.Mesh(new THREE.BoxGeometry(10.5, 5.2, 0.9), pylonMat);
    headFrame.position.set(0, 42, 0);
    pylonGroup.add(headFrame);

    const lightPanel = new THREE.Mesh(new THREE.PlaneGeometry(9.6, 4.4), lampMat);
    lightPanel.position.set(0, 42, 0.55);
    pylonGroup.add(lightPanel);

    group.add(pylonGroup);
  });

  // Instanced Crowd Spectators (900 spectators distributed around lower & upper bowl)
  const crowdCount = 900;
  const specGeo = new THREE.BoxGeometry(0.55, 0.95, 0.45);
  const specMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.8,
  });
  const crowdMesh = new THREE.InstancedMesh(specGeo, specMat, crowdCount);
  const dummy = new THREE.Object3D();
  const palette = [
    new THREE.Color('#10B981'),
    new THREE.Color('#F59E0B'),
    new THREE.Color('#3B82F6'),
    new THREE.Color('#EF4444'),
    new THREE.Color('#F8FAFC'),
    new THREE.Color('#1E293B'),
  ];
  const crowdBaseMatrices: THREE.Matrix4[] = [];

  for (let i = 0; i < crowdCount; i++) {
    const angle = (i / crowdCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.18;
    const isUpper = i % 3 === 0;
    const rad = isUpper ? 79 + Math.random() * 11 : 68 + Math.random() * 7.5;
    const y = isUpper ? 9.5 + (rad - 79) * 0.72 : 1.4 + (rad - 68) * 0.72;
    dummy.position.set(Math.cos(angle) * rad, y, Math.sin(angle) * rad);
    dummy.lookAt(0, y, 0);
    const s = 0.85 + Math.random() * 0.3;
    dummy.scale.set(s, s, s);
    dummy.updateMatrix();
    crowdMesh.setMatrixAt(i, dummy.matrix);
    crowdBaseMatrices.push(dummy.matrix.clone());
    crowdMesh.setColorAt(i, palette[i % palette.length]);
  }
  crowdMesh.instanceMatrix.needsUpdate = true;
  if (crowdMesh.instanceColor) crowdMesh.instanceColor.needsUpdate = true;
  crowdMesh.computeBoundingSphere();
  group.add(crowdMesh);

  return {
    group,
    crowdMesh,
    crowdCount,
    crowdBaseMatrices,
    floodlightMaterials,
  };
}
