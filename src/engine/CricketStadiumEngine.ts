import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import {
  CameraMode,
  DeliveryType,
  FieldPreset,
  PitchCondition,
  ShotDirection,
  ShotType,
  StadiumTime,
  WeatherCondition,
} from '../types/game';
import { audioEngine } from './audio';
import {
  createCricketBall,
  createCricketerRig,
  createStadiumEnvironment,
  createWicketSet,
  CricketerRig,
  resetWicketRig,
  StadiumEnvironmentHandles,
  stepWicketRig,
  triggerWicketBreak,
  WicketRig,
} from './models';
import {
  createAdBoardTexture,
  createOutfieldTexture,
  createPitchTexture,
} from './textures';

export interface EngineMatchVisuals {
  stadiumTime: StadiumTime;
  weather: WeatherCondition;
  pitch: PitchCondition;
  fieldPreset: FieldPreset;
  cameraMode: CameraMode;
  userJerseyColor: string;
  userAccentColor: string;
  userHelmetColor: string;
  userBatColor: string;
  userGloveColor: string;
  userLeftHanded: boolean;
  opponentJerseyColor: string;
  opponentAccentColor: string;
  ballColor: string;
  seamColor: string;
  graphicsQuality: 'High' | 'Balanced';
  vrHeadlookSensitivity: number;
}

export interface DeliveryCommand {
  deliveryType: DeliveryType;
  targetX: number; // -0.65 (leg/off) to +0.65
  targetZ: number; // bounce Z: -1 (bouncer) to +8.2 (yorker)
  speedKmh: number;
  swingFactor: number; // -1 to 1
  spinTurn: number; // -1 to 1
  isUserBowling: boolean;
  aiDifficulty: 'Amateur' | 'Pro' | 'Legend';
}

export interface BattingInput {
  shotType: ShotType;
  direction: ShotDirection;
}

export interface DeliveryOutcome {
  runs: number;
  isFour: boolean;
  isSix: boolean;
  isWicket: boolean;
  wicketType?: string;
  isWide: boolean;
  isNoBall: boolean;
  timingLabel: string;
  shotName: string;
  speedKmh: number;
  commentary: string;
  userRanCount: number;
}

export interface LiveBallTelemetry {
  phase:
    | 'idle'
    | 'runup'
    | 'in_flight'
    | 'after_hit'
    | 'dead';
  ballDistanceToCrease: number; // meters from batting popping crease (z=8.84)
  runsAvailableByRunning: number;
  battersCurrentlyRunning: boolean;
  canRunMore: boolean;
  ballSpeedKmh: number;
}

type FielderUnit = {
  rig: CricketerRig;
  homePos: THREE.Vector3;
  pos: THREE.Vector3;
  roleName: string;
  isKeeper: boolean;
};

// Pre-allocated scratch math objects (zero GC in loop)
const _v1 = new THREE.Vector3();
const _v2 = new THREE.Vector3();
const _camTargetPos = new THREE.Vector3();
const _camTargetLook = new THREE.Vector3();
const _mat4 = new THREE.Matrix4();
const _pos = new THREE.Vector3();
const _quat = new THREE.Quaternion();
const _scale = new THREE.Vector3();

function detectSoftwareWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param));
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return false;
  }
}

const FIELD_COORDS: Record<FieldPreset, Array<[number, number, string]>> = {
  Balanced: [
    [0.2, 12.6, 'Wicketkeeper'],
    [1.8, 12.2, 'First Slip'],
    [14, 10, 'Point'],
    [22, -4, 'Cover'],
    [13, -18, 'Mid-Off'],
    [-12, -18, 'Mid-On'],
    [-22, -3, 'Mid-Wicket'],
    [-18, 11, 'Square Leg'],
    [-9, 24, 'Fine Leg'],
    [10, 23, 'Third Man'],
  ],
  Attacking: [
    [0.2, 12.6, 'Wicketkeeper'],
    [1.4, 12.2, 'First Slip'],
    [2.6, 11.8, 'Second Slip'],
    [4.4, 10.6, 'Gully'],
    [16, 4, 'Cover Point'],
    [11, -16, 'Mid-Off'],
    [-11, -16, 'Mid-On'],
    [-17, 2, 'Short Mid-Wicket'],
    [-14, 12, 'Square Leg'],
    [-10, 22, 'Fine Leg'],
  ],
  Defensive: [
    [0.2, 12.6, 'Wicketkeeper'],
    [32, 14, 'Deep Point'],
    [44, -14, 'Deep Extra Cover'],
    [26, -42, 'Long-Off'],
    [-26, -42, 'Long-On'],
    [-46, -12, 'Deep Mid-Wicket'],
    [-44, 12, 'Deep Square Leg'],
    [-22, 38, 'Deep Fine Leg'],
    [22, 36, 'Third Man'],
    [14, -14, 'Mid-Off'],
  ],
  Powerplay: [
    [0.2, 12.6, 'Wicketkeeper'],
    [1.6, 12.2, 'Slip'],
    [17, 6, 'Point'],
    [20, -8, 'Extra Cover'],
    [12, -19, 'Mid-Off'],
    [-12, -19, 'Mid-On'],
    [-21, -6, 'Mid-Wicket'],
    [-24, 16, 'Deep Square'],
    [-14, 34, 'Fine Leg'],
    [18, 22, 'Third Man'],
  ],
  Death: [
    [0.2, 12.6, 'Wicketkeeper'],
    [42, 8, 'Deep Point'],
    [46, -18, 'Deep Cover'],
    [22, -52, 'Long-Off'],
    [-22, -52, 'Long-On'],
    [-48, -16, 'Cow Corner'],
    [-44, 16, 'Deep Square'],
    [-20, 44, 'Fine Leg'],
    [24, 40, 'Third Man'],
    [10, -14, 'Mid-Off'],
  ],
};

export class CricketStadiumEngine {
  private container: HTMLElement;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private isSoftwareGl: boolean;
  private maxAnisotropy: number;

  private frameId = 0;
  private clock = new THREE.Clock();
  private disposed = false;

  // Lighting & environment
  private sunLight: THREE.DirectionalLight;
  private hemiLight: THREE.HemisphereLight;
  private floodSpots: THREE.SpotLight[] = [];
  private stadiumHandles!: StadiumEnvironmentHandles;
  private rainLines: THREE.LineSegments | null = null;
  private rainPositions: Float32Array | null = null;
  private outfieldMesh!: THREE.Mesh;
  private pitchMesh!: THREE.Mesh;

  // Match actors
  private batterStumps!: WicketRig;
  private bowlerStumps!: WicketRig;
  private strikerRig!: CricketerRig;
  private nonStrikerRig!: CricketerRig;
  private bowlerRig!: CricketerRig;
  private umpireRig!: CricketerRig;
  private fielders: FielderUnit[] = [];
  private ballMesh!: THREE.Group;
  private pitchMarkerMesh!: THREE.Mesh;
  private ballShadowMesh!: THREE.Mesh;
  private trailPoints: THREE.Vector3[] = [];
  private trailLine!: THREE.Line;

  // State
  private mode: 'showcase' | 'match' = 'showcase';
  private visuals: EngineMatchVisuals;
  private showcaseAngle = 0;

  // Headlook VR orientation offset
  private vrYawOffset = 0;
  private vrPitchOffset = 0;
  private pointerDown = false;
  private lastPointerX = 0;
  private lastPointerY = 0;

  // Active delivery simulation
  private phase: LiveBallTelemetry['phase'] = 'idle';
  private phaseTimer = 0;
  private deliveryCmd: DeliveryCommand | null = null;
  private queuedBattingInput: BattingInput | null = null;
  private swingStartedAt = -1;
  private swingElapsed = 0;
  private activeShot: ShotType = 'Drive';
  private activeDir: ShotDirection = 'Straight';

  private ballPos = new THREE.Vector3(0, 1.8, -10.5);
  private ballVel = new THREE.Vector3(0, 0, 0);
  private ballBounced = false;
  private ballHitBat = false;
  private ballCaught = false;
  private ballCrossedBoundary = false;
  private ballStopped = false;
  private fielderTargetIndex = -1;
  private fielderHasBall = false;
  private throwInFlight = false;
  private throwTargetZ = 10.06;

  // Running between wickets
  private strikerZ = 8.84;
  private nonStrikerZ = -8.84;
  private strikerTargetZ = 8.84;
  private nonStrikerTargetZ = -8.84;
  private battersRunning = false;
  private completedRuns = 0;
  private runOutOccurred = false;
  private runOutWicketType = 'Run Out';

  // Outcome tracking
  private outcomeTimingLabel = 'Good';
  private outcomeShotName = 'Straight Drive';
  private outcomeCommentary = '';
  private outcomeWicket = false;
  private outcomeWicketType = '';
  private outcomeWide = false;
  private outcomeNoBall = false;
  private crowdCheerTimer = 0;
  private hitstopTimer = 0;
  private shakeMagnitude = 0;

  private onOutcomeCallback: ((outcome: DeliveryOutcome) => void) | null = null;
  private onTelemetryCallback: ((tel: LiveBallTelemetry) => void) | null = null;
  private telemetryAccumulator = 0;

  constructor(container: HTMLElement, initialVisuals: EngineMatchVisuals) {
    this.container = container;
    this.visuals = initialVisuals;
    this.isSoftwareGl = detectSoftwareWebGL();

    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.12;
    this.renderer.setPixelRatio(
      this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2)
    );
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const w = container.clientWidth || window.innerWidth;
    const h = container.clientHeight || window.innerHeight;
    this.renderer.setSize(w, h);
    this.renderer.domElement.style.display = 'block';
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    container.appendChild(this.renderer.domElement);

    this.maxAnisotropy = Math.min(8, this.renderer.capabilities.getMaxAnisotropy() || 1);

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(48, w / h, 0.15, 420);
    this.camera.position.set(0, 6.2, -23);
    this.camera.lookAt(0, 1.1, 8);

    // Mandatory studio environment map via PMREMGenerator
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();

    // Lighting rig
    this.hemiLight = new THREE.HemisphereLight(0x93c5fd, 0x1e3a24, 0.7);
    this.scene.add(this.hemiLight);

    this.sunLight = new THREE.DirectionalLight(0xfff1d6, 1.65);
    this.sunLight.position.set(28, 46, 22);
    this.sunLight.castShadow = !this.isSoftwareGl;
    this.sunLight.shadow.mapSize.width = 1024;
    this.sunLight.shadow.mapSize.height = 1024;
    this.sunLight.shadow.camera.near = 5;
    this.sunLight.shadow.camera.far = 130;
    const d = 28;
    this.sunLight.shadow.camera.left = -d;
    this.sunLight.shadow.camera.right = d;
    this.sunLight.shadow.camera.top = d;
    this.sunLight.shadow.camera.bottom = -d;
    this.sunLight.shadow.bias = -0.0005;
    this.sunLight.shadow.normalBias = 0.02;
    this.scene.add(this.sunLight);

    // 2 Floodlight spotlights (total shadow casters <= 3)
    [
      [58, 40, 58],
      [-58, 40, -58],
    ].forEach(([lx, ly, lz]) => {
      const spot = new THREE.SpotLight(0xfff8eb, 0, 190, Math.PI / 4, 0.45, 1.1);
      spot.position.set(lx, ly, lz);
      spot.target.position.set(0, 0, 0);
      this.scene.add(spot);
      this.scene.add(spot.target);
      this.floodSpots.push(spot);
    });

    this.buildWorld();
    this.applyVisuals(initialVisuals);

    if (!this.isSoftwareGl) {
      this.renderer.compile(this.scene, this.camera);
    }

    this.bindEvents();
    this.startLoop();
  }

  private buildWorld() {
    // Ground apron beyond stadium
    const outerGround = new THREE.Mesh(
      new THREE.CircleGeometry(220, 48),
      new THREE.MeshStandardMaterial({ color: 0x0a140e, roughness: 0.95 })
    );
    outerGround.rotation.x = -Math.PI / 2;
    outerGround.position.y = -0.04;
    this.scene.add(outerGround);

    // Mowed Cricket Outfield (66m radius)
    const outfieldTex = createOutfieldTexture(this.maxAnisotropy, this.visuals.weather);
    this.outfieldMesh = new THREE.Mesh(
      new THREE.CircleGeometry(66.5, 64),
      new THREE.MeshStandardMaterial({
        map: outfieldTex,
        roughness: 0.85,
        metalness: 0.02,
      })
    );
    this.outfieldMesh.rotation.x = -Math.PI / 2;
    this.outfieldMesh.position.y = 0;
    this.outfieldMesh.receiveShadow = true;
    this.scene.add(this.outfieldMesh);

    // 22-yard Cricket Pitch strip (3.05m wide x 22.56m long)
    const pitchTex = createPitchTexture(this.maxAnisotropy, this.visuals.pitch);
    const pitchMat = new THREE.MeshStandardMaterial({
      map: pitchTex,
      roughness: 0.88,
      metalness: 0.02,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });
    this.pitchMesh = new THREE.Mesh(new THREE.PlaneGeometry(3.05, 22.56), pitchMat);
    this.pitchMesh.rotation.x = -Math.PI / 2;
    this.pitchMesh.position.y = 0.015;
    this.pitchMesh.receiveShadow = true;
    this.scene.add(this.pitchMesh);

    // Stadium stands, crowd & floodlights
    const adTex = createAdBoardTexture(this.maxAnisotropy);
    this.stadiumHandles = createStadiumEnvironment(
      adTex,
      this.visuals.stadiumTime !== 'Day'
    );
    this.scene.add(this.stadiumHandles.group);

    // Wickets at both ends (20.12m apart: z = -10.06 and z = +10.06)
    this.bowlerStumps = createWicketSet();
    this.bowlerStumps.group.position.set(0, 0, -10.06);
    this.scene.add(this.bowlerStumps.group);

    this.batterStumps = createWicketSet();
    this.batterStumps.group.position.set(0, 0, 10.06);
    this.scene.add(this.batterStumps.group);

    // Build Cricketers
    this.rebuildActors();

    // Ball & shadow
    this.ballMesh = createCricketBall(
      this.visuals.ballColor,
      this.visuals.seamColor,
      this.maxAnisotropy
    );
    this.ballMesh.position.copy(this.ballPos);
    this.scene.add(this.ballMesh);

    const shadowGeo = new THREE.CircleGeometry(0.11, 14);
    shadowGeo.rotateX(-Math.PI / 2);
    this.ballShadowMesh = new THREE.Mesh(
      shadowGeo,
      new THREE.MeshBasicMaterial({
        color: 0x000000,
        transparent: true,
        opacity: 0.42,
        depthWrite: false,
      })
    );
    this.ballShadowMesh.position.set(0, 0.025, 0);
    this.scene.add(this.ballShadowMesh);

    // Pitch bounce marker ring
    const markerGeo = new THREE.RingGeometry(0.14, 0.22, 24);
    markerGeo.rotateX(-Math.PI / 2);
    this.pitchMarkerMesh = new THREE.Mesh(
      markerGeo,
      new THREE.MeshBasicMaterial({
        color: 0xf59e0b,
        transparent: true,
        opacity: 0.85,
        depthWrite: false,
      })
    );
    this.pitchMarkerMesh.position.set(0, 0.03, 4.5);
    this.pitchMarkerMesh.visible = false;
    this.scene.add(this.pitchMarkerMesh);

    // Ball trajectory trail
    const trailGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, 0),
    ]);
    this.trailLine = new THREE.Line(
      trailGeo,
      new THREE.LineBasicMaterial({
        color: 0x34d399,
        transparent: true,
        opacity: 0.65,
      })
    );
    this.trailLine.visible = false;
    this.scene.add(this.trailLine);
  }

  private rebuildActors() {
    const clearActor = (rig?: CricketerRig) => {
      if (rig) this.scene.remove(rig.root);
    };
    clearActor(this.strikerRig);
    clearActor(this.nonStrikerRig);
    clearActor(this.bowlerRig);
    clearActor(this.umpireRig);
    this.fielders.forEach((f) => this.scene.remove(f.rig.root));
    this.fielders = [];

    // Striker (user or batting side)
    this.strikerRig = createCricketerRig({
      jerseyColor: this.visuals.userJerseyColor,
      accentColor: this.visuals.userAccentColor,
      skinTone: '#C68B59',
      helmetColor: this.visuals.userHelmetColor,
      batColor: this.visuals.userBatColor,
      gloveColor: this.visuals.userGloveColor,
      hasHelmet: true,
      hasPads: true,
      hasBat: true,
      anisotropy: this.maxAnisotropy,
    });
    const stanceX = this.visuals.userLeftHanded ? 0.36 : -0.36;
    this.strikerRig.root.position.set(stanceX, 0, this.strikerZ);
    this.strikerRig.root.rotation.y = this.visuals.userLeftHanded ? -Math.PI * 0.55 : Math.PI * 0.55;
    this.scene.add(this.strikerRig.root);

    // Non-striker at bowling end
    this.nonStrikerRig = createCricketerRig({
      jerseyColor: this.visuals.userJerseyColor,
      accentColor: this.visuals.userAccentColor,
      skinTone: '#B57B4C',
      helmetColor: this.visuals.userHelmetColor,
      batColor: '#D6B27A',
      hasHelmet: true,
      hasPads: true,
      hasBat: true,
      anisotropy: this.maxAnisotropy,
    });
    this.nonStrikerRig.root.position.set(1.15, 0, this.nonStrikerZ);
    this.nonStrikerRig.root.rotation.y = 0;
    this.scene.add(this.nonStrikerRig.root);

    // Bowler
    this.bowlerRig = createCricketerRig({
      jerseyColor: this.visuals.opponentJerseyColor,
      accentColor: this.visuals.opponentAccentColor,
      skinTone: '#C68B59',
      hasHelmet: false,
      hasPads: false,
      hasBat: false,
      anisotropy: this.maxAnisotropy,
    });
    this.bowlerRig.root.position.set(0.6, 0, -14.5);
    this.scene.add(this.bowlerRig.root);

    // Standing Umpire at bowler's end
    this.umpireRig = createCricketerRig({
      jerseyColor: '#F8FAFC',
      accentColor: '#0F172A',
      skinTone: '#8D5524',
      hasHelmet: false,
      hasPads: false,
      hasBat: false,
      anisotropy: this.maxAnisotropy,
    });
    this.umpireRig.root.position.set(-0.25, 0, -11.4);
    this.scene.add(this.umpireRig.root);

    // 10 Fielders (1 Wicketkeeper + 9 Outfielders)
    const coords = FIELD_COORDS[this.visuals.fieldPreset];
    coords.forEach(([fx, fz, roleName], idx) => {
      const isKeeper = idx === 0;
      const rig = createCricketerRig({
        jerseyColor: this.visuals.opponentJerseyColor,
        accentColor: this.visuals.opponentAccentColor,
        skinTone: idx % 2 === 0 ? '#C68B59' : '#8D5524',
        hasHelmet: false,
        hasPads: isKeeper,
        hasBat: false,
        isKeeper,
        anisotropy: this.maxAnisotropy,
      });
      const home = new THREE.Vector3(fx, 0, fz);
      rig.root.position.copy(home);
      rig.root.lookAt(0, 0, 8.84);
      if (isKeeper) {
        rig.torso.position.y = 0.72; // crouch stance
        rig.torso.rotation.x = 0.35;
      }
      this.scene.add(rig.root);
      this.fielders.push({
        rig,
        homePos: home.clone(),
        pos: home.clone(),
        roleName,
        isKeeper,
      });
    });
  }

  public applyVisuals(next: EngineMatchVisuals) {
    const prev = this.visuals;
    this.visuals = next;

    // Atmosphere & lighting based on StadiumTime + Weather
    const isNight = next.stadiumTime === 'Night';
    const isTwilight = next.stadiumTime === 'Twilight';
    const isOvercast = next.weather === 'Overcast' || next.weather !== 'Clear';

    let skyHex = 0x5ca4e6;
    if (isNight) skyHex = 0x070d16;
    else if (isTwilight) skyHex = 0x2d243b;
    else if (isOvercast) skyHex = 0x4b5d6c;

    this.scene.background = new THREE.Color(skyHex);
    this.scene.fog = new THREE.FogExp2(skyHex, next.weather === 'Heavy Rain' ? 0.0085 : 0.0036);

    this.sunLight.color.setHex(isNight ? 0xc7d2fe : isTwilight ? 0xfdba74 : 0xfff3db);
    this.sunLight.intensity = isNight ? 0.55 : isTwilight ? 1.15 : isOvercast ? 1.05 : 1.75;
    this.hemiLight.color.setHex(isNight ? 0x1e293b : isTwilight ? 0x9333ea : 0x93c5fd);
    this.hemiLight.groundColor.setHex(0x163020);
    this.hemiLight.intensity = isNight ? 0.55 : 0.72;

    const floodIntensity = isNight ? 2.8 : isTwilight ? 1.8 : isOvercast ? 0.8 : 0;
    this.floodSpots.forEach((spot) => {
      spot.intensity = floodIntensity;
    });
    this.stadiumHandles.floodlightMaterials.forEach((m) => {
      m.emissive.setHex(floodIntensity > 0 ? 0xfff8e7 : 0x334155);
      m.emissiveIntensity = floodIntensity > 0 ? 3.2 : 0.15;
    });

    // Update pitch & turf textures if weather/pitch changed
    if (prev.pitch !== next.pitch) {
      const pitchMat = this.pitchMesh.material as THREE.MeshStandardMaterial;
      pitchMat.map?.dispose();
      pitchMat.map = createPitchTexture(this.maxAnisotropy, next.pitch);
      pitchMat.needsUpdate = true;
    }
    if (prev.weather !== next.weather) {
      const outMat = this.outfieldMesh.material as THREE.MeshStandardMaterial;
      outMat.map?.dispose();
      outMat.map = createOutfieldTexture(this.maxAnisotropy, next.weather);
      outMat.roughness = next.weather === 'Clear' ? 0.85 : 0.52;
      outMat.needsUpdate = true;
      this.updateRainParticles(next.weather);
      audioEngine.setRainAmbience(next.weather === 'Light Rain' || next.weather === 'Heavy Rain');
    }

    // Update field placements if changed
    if (
      prev.fieldPreset !== next.fieldPreset ||
      prev.userJerseyColor !== next.userJerseyColor ||
      prev.userHelmetColor !== next.userHelmetColor ||
      prev.userBatColor !== next.userBatColor ||
      prev.userLeftHanded !== next.userLeftHanded ||
      prev.opponentJerseyColor !== next.opponentJerseyColor
    ) {
      this.rebuildActors();
    }

    if (prev.ballColor !== next.ballColor || prev.seamColor !== next.seamColor) {
      this.scene.remove(this.ballMesh);
      this.ballMesh = createCricketBall(next.ballColor, next.seamColor, this.maxAnisotropy);
      this.ballMesh.position.copy(this.ballPos);
      this.scene.add(this.ballMesh);
    }

    if (prev.cameraMode !== next.cameraMode) {
      this.vrYawOffset = 0;
      this.vrPitchOffset = 0;
    }
  }

  private updateRainParticles(weather: WeatherCondition) {
    if (this.rainLines) {
      this.scene.remove(this.rainLines);
      this.rainLines.geometry.dispose();
      (this.rainLines.material as THREE.Material).dispose();
      this.rainLines = null;
      this.rainPositions = null;
    }

    if (weather !== 'Light Rain' && weather !== 'Heavy Rain') return;

    const count = weather === 'Heavy Rain' ? 1400 : 600;
    const arr = new Float32Array(count * 6);
    for (let i = 0; i < count; i++) {
      const x = (Math.random() - 0.5) * 110;
      const y = Math.random() * 32;
      const z = (Math.random() - 0.5) * 110;
      arr[i * 6 + 0] = x;
      arr[i * 6 + 1] = y;
      arr[i * 6 + 2] = z;
      arr[i * 6 + 3] = x - 0.12;
      arr[i * 6 + 4] = y - 0.95;
      arr[i * 6 + 5] = z;
    }
    this.rainPositions = arr;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(arr, 3));
    const mat = new THREE.LineBasicMaterial({
      color: 0xcbd5e1,
      transparent: true,
      opacity: weather === 'Heavy Rain' ? 0.55 : 0.35,
    });
    this.rainLines = new THREE.LineSegments(geo, mat);
    this.scene.add(this.rainLines);
  }

  public setMode(mode: 'showcase' | 'match') {
    this.mode = mode;
    if (mode === 'showcase') {
      this.phase = 'idle';
      this.pitchMarkerMesh.visible = false;
      this.trailLine.visible = false;
      this.ballMesh.visible = false;
      this.ballShadowMesh.visible = false;
    } else {
      this.ballMesh.visible = true;
      this.ballShadowMesh.visible = true;
      this.resetPositionsForNextBall();
    }
  }

  public setCallbacks(
    onOutcome: (o: DeliveryOutcome) => void,
    onTelemetry?: (t: LiveBallTelemetry) => void
  ) {
    this.onOutcomeCallback = onOutcome;
    this.onTelemetryCallback = onTelemetry || null;
  }

  public resetPositionsForNextBall() {
    this.phase = 'idle';
    this.phaseTimer = 0;
    this.queuedBattingInput = null;
    this.swingStartedAt = -1;
    this.swingElapsed = 0;
    this.ballBounced = false;
    this.ballHitBat = false;
    this.ballCaught = false;
    this.ballCrossedBoundary = false;
    this.ballStopped = false;
    this.fielderTargetIndex = -1;
    this.fielderHasBall = false;
    this.throwInFlight = false;
    this.battersRunning = false;
    this.completedRuns = 0;
    this.runOutOccurred = false;
    this.outcomeWicket = false;
    this.outcomeWide = false;
    this.outcomeNoBall = false;
    this.trailPoints = [];
    this.trailLine.visible = false;
    this.pitchMarkerMesh.visible = false;

    this.strikerZ = 8.84;
    this.nonStrikerZ = -8.84;
    this.strikerTargetZ = 8.84;
    this.nonStrikerTargetZ = -8.84;

    const stanceX = this.visuals.userLeftHanded ? 0.36 : -0.36;
    this.strikerRig.root.position.set(stanceX, 0, this.strikerZ);
    this.strikerRig.root.rotation.y = this.visuals.userLeftHanded ? -Math.PI * 0.55 : Math.PI * 0.55;
    this.strikerRig.batPivot.rotation.set(0.25, 0, -0.35);
    this.strikerRig.torso.rotation.set(0.12, 0, 0);
    this.strikerRig.leftLegPivot.rotation.set(0, 0, 0);
    this.strikerRig.rightLegPivot.rotation.set(0, 0, 0);

    this.nonStrikerRig.root.position.set(1.15, 0, this.nonStrikerZ);
    this.nonStrikerRig.leftLegPivot.rotation.set(0, 0, 0);
    this.nonStrikerRig.rightLegPivot.rotation.set(0, 0, 0);

    this.bowlerRig.root.position.set(0.55, 0, -14.8);
    this.bowlerRig.rightArmPivot.rotation.set(0, 0, 0);
    this.bowlerRig.leftArmPivot.rotation.set(0, 0, 0);
    this.bowlerRig.leftLegPivot.rotation.set(0, 0, 0);
    this.bowlerRig.rightLegPivot.rotation.set(0, 0, 0);

    this.fielders.forEach((f) => {
      f.pos.copy(f.homePos);
      f.rig.root.position.copy(f.homePos);
      f.rig.root.lookAt(0, 0, 8.84);
      f.rig.leftLegPivot.rotation.set(0, 0, 0);
      f.rig.rightLegPivot.rotation.set(0, 0, 0);
    });

    resetWicketRig(this.batterStumps);
    resetWicketRig(this.bowlerStumps);

    this.ballPos.set(0.45, 1.9, -10.2);
    this.ballMesh.position.copy(this.ballPos);
    this.ballShadowMesh.position.set(this.ballPos.x, 0.025, this.ballPos.z);
  }

  public startDelivery(cmd: DeliveryCommand) {
    this.resetPositionsForNextBall();
    this.deliveryCmd = cmd;
    this.phase = 'runup';
    this.phaseTimer = 0;

    // Show pitch bounce reticle
    this.pitchMarkerMesh.position.set(cmd.targetX, 0.03, cmd.targetZ);
    const mat = this.pitchMarkerMesh.material as THREE.MeshBasicMaterial;
    mat.color.setHex(
      cmd.deliveryType === 'Yorker'
        ? 0xef4444
        : cmd.deliveryType === 'Bouncer'
        ? 0xf59e0b
        : 0x34d399
    );
    this.pitchMarkerMesh.visible = true;
  }

  public triggerBatSwing(input: BattingInput) {
    if (this.phase === 'in_flight' || this.phase === 'runup') {
      this.queuedBattingInput = input;
      if (this.swingStartedAt < 0 && this.phase === 'in_flight') {
        this.swingStartedAt = this.phaseTimer;
        this.swingElapsed = 0;
        this.activeShot = input.shotType;
        this.activeDir = input.direction;
      }
    }
  }

  public triggerRunBetweenWickets() {
    if (this.phase !== 'after_hit' || this.ballCaught || this.ballCrossedBoundary) return;
    if (this.battersRunning) return;
    if (this.completedRuns >= 3) return;
    this.battersRunning = true;
    // Swap targets between +8.84 and -8.84
    this.strikerTargetZ = this.strikerZ > 0 ? -8.84 : 8.84;
    this.nonStrikerTargetZ = this.nonStrikerZ > 0 ? -8.84 : 8.84;
  }

  public triggerManualThrowEnd(end: 'striker' | 'bowler') {
    if (this.phase !== 'after_hit') return;
    this.throwTargetZ = end === 'striker' ? 10.06 : -10.06;
  }

  private launchBallFromBowler() {
    if (!this.deliveryCmd) return;
    const cmd = this.deliveryCmd;
    this.phase = 'in_flight';
    this.phaseTimer = 0;
    this.trailPoints = [];
    this.trailLine.visible = true;

    const releasePos = new THREE.Vector3(0.42, 2.05, -9.85);
    this.ballPos.copy(releasePos);

    // Speed conversion: km/h -> m/s (scaled cleanly for readable reaction window)
    const realMs = cmd.speedKmh / 3.6;
    // Gameplay readable pace scaling (~0.56x real time so mobile touch reaction feels crisp)
    const speedZ = THREE.MathUtils.clamp(realMs * 0.56, 12.5, 25.5);

    const dz = Math.max(2.5, cmd.targetZ - releasePos.z);
    const flightTimeToBounce = dz / speedZ;
    const dx = cmd.targetX - releasePos.x;

    // Solve vertical velocity to hit ground y=0.04 at flightTimeToBounce under g=9.81
    const g = 9.81;
    const vy = (0.04 - releasePos.y + 0.5 * g * flightTimeToBounce * flightTimeToBounce) / flightTimeToBounce;

    // Lateral swing offset compensation
    const swingCompensation = -cmd.swingFactor * 0.35 * flightTimeToBounce;
    const vx = dx / flightTimeToBounce + swingCompensation;

    this.ballVel.set(vx, vy, speedZ);

    // If batter queued shot during run-up, start swing when ball is halfway
    if (this.queuedBattingInput && this.swingStartedAt < 0 && !cmd.isUserBowling) {
      // Wait for flight
    }
  }

  private resolveAiBattingIfUserBowling() {
    if (!this.deliveryCmd?.isUserBowling) return;
    if (this.ballHitBat || this.swingStartedAt >= 0) return;

    const distToCrease = 8.84 - this.ballPos.z;
    if (distToCrease <= 2.3 && distToCrease >= 0.4) {
      const diff = this.deliveryCmd.aiDifficulty;
      const skill = diff === 'Legend' ? 0.88 : diff === 'Pro' ? 0.72 : 0.52;
      const isGoodYorker = this.deliveryCmd.deliveryType === 'Yorker' && Math.abs(this.deliveryCmd.targetX) < 0.18;

      if (Math.random() < skill && !(isGoodYorker && Math.random() < 0.45)) {
        const shots: ShotType[] = ['Defend', 'Drive', 'Pull', 'Lofted'];
        const dirs: ShotDirection[] = ['Leg', 'Straight', 'Off'];
        const shotType =
          this.deliveryCmd.deliveryType === 'Bouncer'
            ? 'Pull'
            : this.deliveryCmd.deliveryType === 'Yorker'
            ? 'Defend'
            : shots[Math.floor(Math.random() * shots.length)];
        const direction = dirs[Math.floor(Math.random() * dirs.length)];
        this.queuedBattingInput = { shotType, direction };
        this.activeShot = shotType;
        this.activeDir = direction;
        this.swingStartedAt = this.phaseTimer;
        this.swingElapsed = 0;
      } else {
        // AI misses / defensive late poke
        this.swingStartedAt = this.phaseTimer + 0.14;
        this.swingElapsed = 0;
        this.activeShot = 'Defend';
        this.activeDir = 'Straight';
      }
    }
  }

  private checkBatBallContact() {
    if (this.ballHitBat) return;
    if (this.swingStartedAt < 0) return;

    // Crease plane z around 8.75..9.05
    if (this.ballPos.z < 8.4 || this.ballPos.z > 9.45) return;

    // Timing quality: optimal swing elapsed at ball arrival is ~0.10s..0.24s
    const dtFromIdeal = Math.abs(this.swingElapsed - 0.16);
    const horizontalMiss = Math.abs(this.ballPos.x);
    const heightOk = this.ballPos.y >= 0.05 && this.ballPos.y <= 1.65;

    if (!heightOk || horizontalMiss > 0.78) return;

    if (dtFromIdeal > 0.25) {
      // Swung way too early or late -> miss
      return;
    }

    this.ballHitBat = true;
    this.phase = 'after_hit';
    this.pitchMarkerMesh.visible = false;

    const isEdge = dtFromIdeal > 0.16 || horizontalMiss > 0.56;
    const isPerfect = dtFromIdeal < 0.065 && horizontalMiss < 0.4;
    this.outcomeTimingLabel = isEdge
      ? 'Thick Edge!'
      : isPerfect
      ? 'PERFECT!'
      : this.swingElapsed < 0.16
      ? 'Slightly Early'
      : 'Good Timing';

    const shotLabelMap: Record<ShotType, string> = {
      Defend: 'Forward Defense',
      Drive: `${this.activeDir} Drive`,
      Pull: 'Pull Shot',
      Lofted: `Lofted ${this.activeDir} Hit`,
    };
    this.outcomeShotName = shotLabelMap[this.activeShot];

    // Direction angle in XZ (0 = straight back down pitch toward -Z)
    let baseAngle = 0;
    if (this.activeDir === 'Off') baseAngle = 0.58;
    else if (this.activeDir === 'Leg') baseAngle = -0.58;
    if (this.visuals.userLeftHanded) baseAngle = -baseAngle;

    if (this.activeShot === 'Pull') {
      baseAngle = this.visuals.userLeftHanded ? 1.12 : -1.12;
    }
    if (isEdge) {
      baseAngle = (this.visuals.userLeftHanded ? -1 : 1) * (1.85 + Math.random() * 0.7);
    }

    const qualityMult = isEdge ? 0.45 : isPerfect ? 1.24 : 0.96;
    let launchSpeed = 16;
    let launchElev = 0.12;

    if (this.activeShot === 'Defend') {
      launchSpeed = 6.5 * qualityMult;
      launchElev = 0.06;
    } else if (this.activeShot === 'Drive') {
      launchSpeed = 24.5 * qualityMult;
      launchElev = 0.14;
    } else if (this.activeShot === 'Pull') {
      launchSpeed = 27.5 * qualityMult;
      launchElev = isPerfect ? 0.42 : 0.22;
    } else if (this.activeShot === 'Lofted') {
      launchSpeed = 30.5 * qualityMult;
      launchElev = isPerfect ? 0.62 : 0.52;
    }

    if (isEdge) {
      launchSpeed = 14 + Math.random() * 6;
      launchElev = 0.48;
    }

    // Apply velocity toward outfield (-Z is straight down the ground)
    const flatSpeed = launchSpeed * Math.cos(launchElev);
    this.ballVel.set(
      Math.sin(baseAngle) * flatSpeed,
      Math.sin(launchElev) * launchSpeed,
      -Math.cos(baseAngle) * flatSpeed
    );

    // Sound + hitstop + subtle camera shake
    audioEngine.playBatHit(isPerfect ? 1.0 : 0.7, isEdge);
    if (isPerfect && this.activeShot === 'Lofted') {
      this.hitstopTimer = 0.045;
      this.shakeMagnitude = 0.18;
    } else {
      this.shakeMagnitude = 0.07;
    }

    // Assign closest fielder to chase ball
    this.assignClosestFielder();
  }

  private assignClosestFielder() {
    // Predict rough landing spot
    const predX = this.ballPos.x + this.ballVel.x * 1.4;
    const predZ = this.ballPos.z + this.ballVel.z * 1.4;
    let bestIdx = 1;
    let bestDist = Infinity;
    this.fielders.forEach((f, idx) => {
      if (idx === 0 && this.ballVel.z < -2) return; // keeper stays for forward hits
      const dist = Math.hypot(f.pos.x - predX, f.pos.z - predZ);
      if (dist < bestDist) {
        bestDist = dist;
        bestIdx = idx;
      }
    });
    this.fielderTargetIndex = bestIdx;
    this.throwTargetZ = 10.06;
  }

  private finishDelivery() {
    if (this.phase === 'dead') return;
    this.phase = 'dead';
    this.trailLine.visible = false;
    this.pitchMarkerMesh.visible = false;

    const cmd = this.deliveryCmd;
    const speedKmh = cmd?.speedKmh || 138;

    let runs = this.completedRuns;
    let isFour = false;
    let isSix = false;
    let isWicket = this.outcomeWicket || this.runOutOccurred;
    let wicketType = this.runOutOccurred ? this.runOutWicketType : this.outcomeWicketType;

    if (this.ballCaught) {
      isWicket = true;
      wicketType = 'Caught';
      runs = 0;
    } else if (this.ballCrossedBoundary && !isWicket) {
      if (!this.ballBounced) {
        isSix = true;
        runs = 6;
      } else {
        isFour = true;
        runs = 4;
      }
    }

    if (this.outcomeWide && !this.ballHitBat && !isWicket) {
      runs += 1;
    }

    let commentary = this.outcomeCommentary;
    if (!commentary) {
      if (isWicket) {
        commentary =
          wicketType === 'Bowled'
            ? 'Timber! Right through the gate and the bails are flying!'
            : wicketType === 'Caught'
            ? 'In the air... and taken cleanly by the fielder!'
            : wicketType === 'LBW'
            ? 'Dead in front! Umpire raises the finger for LBW!'
            : 'Direct hit at the stumps! Caught short of the crease — Run Out!';
      } else if (isSix) {
        commentary = `Massive hit! ${this.outcomeShotName} sails deep into the stands for SIX!`;
      } else if (isFour) {
        commentary = `Crisp timing! ${this.outcomeShotName} races across the turf for FOUR!`;
      } else if (this.outcomeWide) {
        commentary = 'Straying down the corridor — Wide signaled by the umpire.';
      } else if (runs > 0) {
        commentary = `Placed into the gap — smart running brings ${runs} run${runs > 1 ? 's' : ''}.`;
      } else if (this.ballHitBat) {
        commentary = 'Solid stroke straight to the fielder inside the ring. Dot ball.';
      } else {
        commentary = 'Beaten outside off stump! Good carry through to the keeper.';
      }
    }

    if (isSix) {
      audioEngine.playCrowdCheer('six');
      audioEngine.playUmpireSignal('boundary');
      this.crowdCheerTimer = 2.4;
    } else if (isFour) {
      audioEngine.playCrowdCheer('boundary');
      audioEngine.playUmpireSignal('boundary');
      this.crowdCheerTimer = 1.6;
    } else if (isWicket) {
      audioEngine.playCrowdCheer('wicket');
      audioEngine.playUmpireSignal('out');
      this.crowdCheerTimer = 2.0;
    } else if (this.outcomeWide) {
      audioEngine.playUmpireSignal('wide');
    }

    audioEngine.speakCommentary(commentary);

    this.onOutcomeCallback?.({
      runs,
      isFour,
      isSix,
      isWicket,
      wicketType: isWicket ? wicketType : undefined,
      isWide: this.outcomeWide,
      isNoBall: this.outcomeNoBall,
      timingLabel: this.outcomeTimingLabel || (this.ballHitBat ? 'Good' : 'Beaten'),
      shotName: this.outcomeShotName || 'Leave',
      speedKmh,
      commentary,
      userRanCount: this.completedRuns,
    });
  }

  private stepSimulation(dt: number) {
    // Showcase idle flyover
    if (this.mode === 'showcase') {
      this.showcaseAngle += dt * 0.14;
      const rad = 52;
      _camTargetPos.set(
        Math.cos(this.showcaseAngle) * rad,
        19 + Math.sin(this.showcaseAngle * 0.5) * 4,
        Math.sin(this.showcaseAngle) * rad
      );
      this.camera.position.lerp(_camTargetPos, 1 - Math.exp(-3 * dt));
      this.camera.lookAt(0, 2, 0);
      this.animateCrowd(dt);
      this.animateRain(dt);
      return;
    }

    // Hitstop freeze frame for heavy sixes/bowled
    if (this.hitstopTimer > 0) {
      this.hitstopTimer -= dt;
      return;
    }

    this.animateCrowd(dt);
    this.animateRain(dt);
    stepWicketRig(this.batterStumps, dt);
    stepWicketRig(this.bowlerStumps, dt);

    // Animate bat swing
    if (this.swingStartedAt >= 0) {
      this.swingElapsed += dt;
      const t = Math.min(1, this.swingElapsed / 0.36);
      const swingCurve = Math.sin(t * Math.PI);
      const dirSign = this.visuals.userLeftHanded ? -1 : 1;

      if (this.activeShot === 'Defend') {
        this.strikerRig.batPivot.rotation.set(0.55 * swingCurve, 0, -0.2);
      } else if (this.activeShot === 'Pull') {
        this.strikerRig.batPivot.rotation.set(
          -0.2 + swingCurve * 1.1,
          dirSign * swingCurve * 1.45,
          -0.9 * dirSign
        );
        this.strikerRig.torso.rotation.y = dirSign * swingCurve * 0.65;
      } else if (this.activeShot === 'Lofted') {
        this.strikerRig.batPivot.rotation.set(
          0.3 - swingCurve * 2.15,
          dirSign * (this.activeDir === 'Off' ? -0.45 : this.activeDir === 'Leg' ? 0.45 : 0),
          -0.25
        );
      } else {
        // Drive
        this.strikerRig.batPivot.rotation.set(
          0.25 - swingCurve * 1.65,
          dirSign * (this.activeDir === 'Off' ? -0.4 : this.activeDir === 'Leg' ? 0.4 : 0),
          -0.2
        );
      }
    }

    // Phase state machine
    if (this.phase === 'runup') {
      this.phaseTimer += dt;
      const runDuration = 0.88;
      const p = Math.min(1, this.phaseTimer / runDuration);
      this.bowlerRig.root.position.set(0.55, 0, THREE.MathUtils.lerp(-14.8, -10.1, p));
      const stride = Math.sin(p * Math.PI * 6) * 0.75;
      this.bowlerRig.leftLegPivot.rotation.x = stride;
      this.bowlerRig.rightLegPivot.rotation.x = -stride;
      this.bowlerRig.rightArmPivot.rotation.x = -p * Math.PI * 2.2;
      this.bowlerRig.leftArmPivot.rotation.x = stride * 0.5;
      this.ballPos.set(0.45, 1.4 + Math.sin(p * Math.PI) * 0.6, this.bowlerRig.root.position.z + 0.25);

      if (p >= 1) {
        this.launchBallFromBowler();
      }
    } else if (this.phase === 'in_flight') {
      this.phaseTimer += dt;
      const cmd = this.deliveryCmd!;

      // Magnus swing before bounce
      if (!this.ballBounced) {
        const rainBoost = this.visuals.weather === 'Overcast' ? 1.35 : 1.0;
        this.ballVel.x += cmd.swingFactor * 1.25 * rainBoost * dt;
      }

      // Gravity
      this.ballVel.y -= 9.81 * dt;
      this.ballPos.addScaledVector(this.ballVel, dt);
      this.ballMesh.rotation.x += 18 * dt;
      this.ballMesh.rotation.z += cmd.spinTurn * 24 * dt;

      // Pitch bounce check
      if (!this.ballBounced && this.ballPos.y <= 0.04) {
        this.ballBounced = true;
        this.ballPos.y = 0.04;

        const pitchRestitution =
          this.visuals.pitch === 'Flat'
            ? 0.72
            : this.visuals.pitch === 'Dry'
            ? 0.66
            : this.visuals.pitch === 'Green'
            ? 0.76
            : 0.54;

        this.ballVel.y = Math.abs(this.ballVel.y) * pitchRestitution;
        if (cmd.deliveryType === 'Bouncer') {
          this.ballVel.y = Math.max(this.ballVel.y, 4.9);
        }

        // Spin / Seam lateral deviation on pitch bounce
        const pitchTurnMult = this.visuals.pitch === 'Dry' ? 1.65 : this.visuals.pitch === 'Green' ? 1.35 : 0.85;
        this.ballVel.x += cmd.spinTurn * 1.9 * pitchTurnMult;
        audioEngine.playPitchBounce();
      }

      this.resolveAiBattingIfUserBowling();
      this.checkBatBallContact();

      // Check ball hitting batter stumps
      if (
        !this.ballHitBat &&
        !this.outcomeWicket &&
        this.ballPos.z >= 9.96 &&
        this.ballPos.z <= 10.25
      ) {
        if (Math.abs(this.ballPos.x) <= 0.145 && this.ballPos.y <= 0.74) {
          this.outcomeWicket = true;
          this.outcomeWicketType = 'Bowled';
          triggerWicketBreak(this.batterStumps, 1);
          audioEngine.playWicketShatter();
          this.shakeMagnitude = 0.22;
          this.hitstopTimer = 0.05;
          this.ballVel.multiplyScalar(0.25);
          setTimeout(() => !this.disposed && this.finishDelivery(), 850);
          this.phase = 'after_hit';
        } else if (Math.abs(this.ballPos.x) > 0.68) {
          this.outcomeWide = true;
        }
      }

      // Keeper collects if passed behind stumps
      if (!this.ballHitBat && !this.outcomeWicket && this.ballPos.z >= 12.5) {
        this.ballVel.set(0, 0, 0);
        this.finishDelivery();
      }
    } else if (this.phase === 'after_hit') {
      this.phaseTimer += dt;
      // Gravity & Turf bounce/friction
      this.ballVel.y -= 9.81 * dt;
      this.ballPos.addScaledVector(this.ballVel, dt);
      this.ballMesh.rotation.x += this.ballVel.z * 2.5 * dt;
      this.ballMesh.rotation.z -= this.ballVel.x * 2.5 * dt;

      if (this.ballPos.y <= 0.04) {
        this.ballPos.y = 0.04;
        if (Math.abs(this.ballVel.y) > 0.8) {
          this.ballVel.y = Math.abs(this.ballVel.y) * 0.52;
          this.ballBounced = true;
        } else {
          this.ballVel.y = 0;
          this.ballBounced = true;
        }
        // Turf drag (wet outfield slows faster)
        const drag = this.visuals.weather === 'Heavy Rain' ? 2.4 : 1.35;
        this.ballVel.x *= Math.max(0, 1 - drag * dt);
        this.ballVel.z *= Math.max(0, 1 - drag * dt);
      }

      // Boundary check (63.4m radius)
      const radFromCenter = Math.hypot(this.ballPos.x, this.ballPos.z);
      if (radFromCenter >= 63.4 && !this.ballCrossedBoundary) {
        this.ballCrossedBoundary = true;
        this.ballVel.multiplyScalar(0.15);
        this.finishDelivery();
      }

      // Fielder chase & Catch / Throw-in logic
      if (!this.ballCrossedBoundary && !this.outcomeWicket && this.fielderTargetIndex >= 0) {
        const f = this.fielders[this.fielderTargetIndex];
        if (!this.fielderHasBall) {
          _v1.set(this.ballPos.x - f.pos.x, 0, this.ballPos.z - f.pos.z);
          const dist = _v1.length();
          if (dist > 0.1) {
            _v1.normalize();
            const sprintSpeed = 7.6;
            f.pos.addScaledVector(_v1, Math.min(dist, sprintSpeed * dt));
            f.rig.root.position.copy(f.pos);
            f.rig.root.lookAt(this.ballPos.x, 0, this.ballPos.z);
            const runOsc = Math.sin(this.phaseTimer * 14) * 0.7;
            f.rig.leftLegPivot.rotation.x = runOsc;
            f.rig.rightLegPivot.rotation.x = -runOsc;
          }

          // Catch check if ball never bounced after hitting bat
          if (!this.ballBounced && dist < 1.35 && this.ballPos.y > 0.25 && this.ballPos.y < 2.25) {
            this.ballCaught = true;
            this.ballVel.set(0, 0, 0);
            this.ballPos.set(f.pos.x, 1.35, f.pos.z);
            this.finishDelivery();
          } else if (this.ballBounced && dist < 1.15 && this.ballPos.y < 1.3) {
            // Picked up & throw back to stumps
            this.fielderHasBall = true;
            this.throwInFlight = true;
            const targetZ = this.battersRunning
              ? this.strikerTargetZ < 0
                ? -10.06
                : 10.06
              : this.throwTargetZ;
            _v2.set(0 - this.ballPos.x, 1.6, targetZ - this.ballPos.z);
            const throwDist = _v2.length();
            _v2.normalize().multiplyScalar(Math.min(28, Math.max(14, throwDist * 0.9)));
            this.ballVel.copy(_v2);
            this.ballVel.y = Math.min(6.5, throwDist * 0.12);
          }
        } else if (this.throwInFlight) {
          // Check if throw reaches stumps
          const targetZ = this.strikerTargetZ < 0 ? -10.06 : 10.06;
          if (Math.hypot(this.ballPos.x, this.ballPos.z - targetZ) < 0.75) {
            this.throwInFlight = false;
            this.ballVel.set(0, 0, 0);
            // Run-out check if batters are still mid-pitch!
            if (this.battersRunning) {
              this.runOutOccurred = true;
              triggerWicketBreak(targetZ > 0 ? this.batterStumps : this.bowlerStumps, 1);
              audioEngine.playWicketShatter();
            }
            this.finishDelivery();
          }
        }
      }

      // Animate batters running between wickets
      if (this.battersRunning) {
        const runSpeed = 6.2;
        const stepToward = (curr: number, target: number) => {
          const d = target - curr;
          if (Math.abs(d) <= runSpeed * dt) return target;
          return curr + Math.sign(d) * runSpeed * dt;
        };
        this.strikerZ = stepToward(this.strikerZ, this.strikerTargetZ);
        this.nonStrikerZ = stepToward(this.nonStrikerZ, this.nonStrikerTargetZ);

        this.strikerRig.root.position.z = this.strikerZ;
        this.strikerRig.root.lookAt(this.strikerRig.root.position.x, 0, this.strikerTargetZ);
        this.nonStrikerRig.root.position.z = this.nonStrikerZ;
        this.nonStrikerRig.root.lookAt(this.nonStrikerRig.root.position.x, 0, this.nonStrikerTargetZ);

        const stride = Math.sin(this.phaseTimer * 16) * 0.75;
        this.strikerRig.leftLegPivot.rotation.x = stride;
        this.strikerRig.rightLegPivot.rotation.x = -stride;
        this.nonStrikerRig.leftLegPivot.rotation.x = -stride;
        this.nonStrikerRig.rightLegPivot.rotation.x = stride;

        if (
          Math.abs(this.strikerZ - this.strikerTargetZ) < 0.05 &&
          Math.abs(this.nonStrikerZ - this.nonStrikerTargetZ) < 0.05
        ) {
          this.battersRunning = false;
          this.completedRuns += 1;
        }
      }

      // End delivery cleanly if ball stops or after timeout
      const speedSq = this.ballVel.lengthSq();
      if (
        !this.ballStopped &&
        ((speedSq < 0.25 && this.ballPos.y <= 0.08 && !this.battersRunning && !this.throwInFlight) ||
          this.phaseTimer > 6.5)
      ) {
        this.ballStopped = true;
        this.finishDelivery();
      }
    }

    // Update ball mesh, shadow & trail
    this.ballMesh.position.copy(this.ballPos);
    this.ballShadowMesh.position.set(this.ballPos.x, 0.025, this.ballPos.z);
    const shadowScale = Math.max(0.35, 1 - this.ballPos.y * 0.08);
    this.ballShadowMesh.scale.set(shadowScale, 1, shadowScale);

    if (this.trailLine.visible && (this.phase === 'in_flight' || this.phase === 'after_hit')) {
      this.trailPoints.push(this.ballPos.clone());
      if (this.trailPoints.length > 26) this.trailPoints.shift();
      this.trailLine.geometry.setFromPoints(this.trailPoints);
    }

    // Camera Rig Update with smooth damping
    this.updateMatchCamera(dt);

    // Emit live telemetry to HUD at ~20Hz
    this.telemetryAccumulator += dt;
    if (this.onTelemetryCallback && this.telemetryAccumulator >= 0.05) {
      this.telemetryAccumulator = 0;
      this.onTelemetryCallback({
        phase: this.phase,
        ballDistanceToCrease: Math.max(0, 8.84 - this.ballPos.z),
        runsAvailableByRunning: this.completedRuns,
        battersCurrentlyRunning: this.battersRunning,
        canRunMore:
          this.phase === 'after_hit' &&
          !this.battersRunning &&
          !this.ballCaught &&
          !this.ballCrossedBoundary &&
          this.completedRuns < 3,
        ballSpeedKmh: this.deliveryCmd?.speedKmh || 0,
      });
    }
  }

  private updateMatchCamera(dt: number) {
    const mode = this.visuals.cameraMode;
    const dampLambda = 6.5;

    if (mode === 'FirstPersonVR') {
      // First-person helmet eye position (VR-Ready Headlook rig)
      const headX = this.strikerRig.root.position.x * 0.4;
      _camTargetPos.set(headX, 1.66, this.strikerZ + 0.05);
      this.camera.position.lerp(_camTargetPos, 1 - Math.exp(-12 * dt));
      const lookX = Math.sin(this.vrYawOffset) * 18;
      const lookY = 1.2 + Math.sin(this.vrPitchOffset) * 8;
      const lookZ = this.strikerZ - Math.cos(this.vrYawOffset) * 18;
      _camTargetLook.set(lookX, lookY, lookZ);
      this.camera.lookAt(_camTargetLook);
      return;
    }

    if (mode === 'BowlerCam') {
      _camTargetPos.set(0.6, 2.35, -16.5);
      _camTargetLook.set(0, 0.9, 8.84);
    } else if (mode === 'Drone') {
      _camTargetPos.set(18, 22, -26);
      _camTargetLook.copy(this.phase === 'after_hit' ? this.ballPos : _v1.set(0, 0.5, 4));
    } else {
      // Broadcast TV Cam
      if (this.phase === 'after_hit') {
        _camTargetPos.set(
          THREE.MathUtils.clamp(this.ballPos.x * 0.28, -14, 14),
          8.5 + Math.min(8, Math.hypot(this.ballPos.x, this.ballPos.z) * 0.12),
          -20.5
        );
        _camTargetLook.set(this.ballPos.x * 0.65, 0.8, this.ballPos.z * 0.65);
      } else {
        _camTargetPos.set(0.15, 5.2, -19.2);
        _camTargetLook.set(0, 0.95, 8.2);
      }
    }

    const alpha = 1 - Math.exp(-dampLambda * dt);
    this.camera.position.lerp(_camTargetPos, alpha);

    // Decaying camera shake
    if (this.shakeMagnitude > 0.002) {
      this.camera.position.x += (Math.random() - 0.5) * this.shakeMagnitude;
      this.camera.position.y += (Math.random() - 0.5) * this.shakeMagnitude;
      this.shakeMagnitude *= Math.exp(-9 * dt);
    }
    this.camera.lookAt(_camTargetLook);
  }

  private animateCrowd(dt: number) {
    if (this.crowdCheerTimer <= 0) return;
    this.crowdCheerTimer -= dt;
    const t = this.clock.elapsedTime;
    const mesh = this.stadiumHandles.crowdMesh;
    const bases = this.stadiumHandles.crowdBaseMatrices;
    // Animate subset of crowd jumping on cheers
    const stride = this.isSoftwareGl ? 6 : 3;
    for (let i = 0; i < this.stadiumHandles.crowdCount; i += stride) {
      bases[i].decompose(_pos, _quat, _scale);
      _pos.y += Math.abs(Math.sin(t * 11 + i)) * 0.45;
      _mat4.compose(_pos, _quat, _scale);
      mesh.setMatrixAt(i, _mat4);
    }
    mesh.instanceMatrix.needsUpdate = true;
  }

  private animateRain(dt: number) {
    if (!this.rainLines || !this.rainPositions) return;
    const arr = this.rainPositions;
    const fallSpeed = this.visuals.weather === 'Heavy Rain' ? 28 : 19;
    for (let i = 0; i < arr.length; i += 6) {
      arr[i + 1] -= fallSpeed * dt;
      arr[i + 4] -= fallSpeed * dt;
      if (arr[i + 1] < 0) {
        const yReset = 28 + Math.random() * 6;
        arr[i + 1] = yReset;
        arr[i + 4] = yReset - 0.95;
      }
    }
    (this.rainLines.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
  }

  private afterDraw(cb: () => void) {
    const gl = this.renderer.getContext() as WebGL2RenderingContext;
    const sync = gl.fenceSync ? gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0) : null;
    gl.flush();
    const poll = () => {
      if (this.disposed) return;
      const state = sync ? gl.getSyncParameter(sync, gl.SYNC_STATUS) : gl.SIGNALED;
      if (state === gl.UNSIGNALED) {
        this.frameId = window.setTimeout(poll, 5);
      } else {
        if (sync) gl.deleteSync(sync);
        this.frameId = window.setTimeout(cb, 80);
      }
    };
    this.frameId = window.setTimeout(poll, 5);
  }

  private startLoop() {
    const tick = () => {
      if (this.disposed) return;
      const rawDt = this.clock.getDelta();
      const dt = Math.min(rawDt, 0.05);

      this.stepSimulation(dt);
      this.renderer.render(this.scene, this.camera);

      if (this.isSoftwareGl) {
        this.afterDraw(tick);
      } else {
        this.frameId = requestAnimationFrame(tick);
      }
    };

    if (this.isSoftwareGl) {
      this.afterDraw(tick);
    } else {
      this.frameId = requestAnimationFrame(tick);
    }
  }

  private onResize = () => {
    if (this.disposed) return;
    const w = this.container.clientWidth || window.innerWidth;
    const h = this.container.clientHeight || window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  };

  private onPointerDown = (e: PointerEvent) => {
    if (this.visuals.cameraMode !== 'FirstPersonVR') return;
    this.pointerDown = true;
    this.lastPointerX = e.clientX;
    this.lastPointerY = e.clientY;
  };

  private onPointerMove = (e: PointerEvent) => {
    if (!this.pointerDown || this.visuals.cameraMode !== 'FirstPersonVR') return;
    const dx = e.clientX - this.lastPointerX;
    const dy = e.clientY - this.lastPointerY;
    this.lastPointerX = e.clientX;
    this.lastPointerY = e.clientY;
    const sens = 0.004 * this.visuals.vrHeadlookSensitivity;
    this.vrYawOffset = THREE.MathUtils.clamp(this.vrYawOffset - dx * sens, -1.25, 1.25);
    this.vrPitchOffset = THREE.MathUtils.clamp(this.vrPitchOffset - dy * sens, -0.55, 0.65);
  };

  private onPointerUp = () => {
    this.pointerDown = false;
  };

  private bindEvents() {
    window.addEventListener('resize', this.onResize);
    const dom = this.renderer.domElement;
    dom.addEventListener('pointerdown', this.onPointerDown);
    window.addEventListener('pointermove', this.onPointerMove);
    window.addEventListener('pointerup', this.onPointerUp);
  }

  public dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.frameId);
    clearTimeout(this.frameId);
    window.removeEventListener('resize', this.onResize);
    window.removeEventListener('pointermove', this.onPointerMove);
    window.removeEventListener('pointerup', this.onPointerUp);
    this.renderer.domElement.removeEventListener('pointerdown', this.onPointerDown);
    audioEngine.setRainAmbience(false);

    this.scene.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        const m = obj as THREE.Mesh;
        m.geometry?.dispose();
        if (Array.isArray(m.material)) {
          m.material.forEach((mat) => mat.dispose());
        } else {
          m.material?.dispose();
        }
      }
    });
    this.renderer.dispose();
    if (this.renderer.domElement.parentNode === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}
