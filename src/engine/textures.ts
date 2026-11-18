import * as THREE from 'three';
import { PitchCondition, WeatherCondition } from '../types/game';

export function createOutfieldTexture(
  anisotropy: number,
  weather: WeatherCondition
): THREE.CanvasTexture {
  const size = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  const wetDarken = weather === 'Heavy Rain' ? 0.8 : weather === 'Light Rain' ? 0.9 : 1.0;
  const cx = size / 2;
  const cy = size / 2;

  // Radial alternating mowed turf rings
  const ringCount = 18;
  for (let i = ringCount; i >= 1; i--) {
    const r = (i / ringCount) * (size * 0.5);
    const even = i % 2 === 0;
    const g1 = Math.round((even ? 118 : 102) * wetDarken);
    const r1 = Math.round((even ? 32 : 24) * wetDarken);
    const b1 = Math.round((even ? 46 : 38) * wetDarken);
    ctx.fillStyle = `rgb(${r1}, ${g1}, ${b1})`;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Fine grass grain
  ctx.fillStyle = 'rgba(255,255,255,0.03)';
  for (let i = 0; i < 4500; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    ctx.fillRect(x, y, 2, 2);
  }

  // 30-yard fielding restriction circle (stadium oval)
  ctx.strokeStyle = 'rgba(248, 250, 252, 0.72)';
  ctx.lineWidth = 3;
  ctx.setLineDash([12, 8]);
  ctx.beginPath();
  ctx.ellipse(cx, cy, size * 0.21, size * 0.25, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);

  // Outer boundary rope white paint line
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(cx, cy, size * 0.445, 0, Math.PI * 2);
  ctx.stroke();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = anisotropy;
  return tex;
}

export function createPitchTexture(
  anisotropy: number,
  pitch: PitchCondition
): THREE.CanvasTexture {
  const w = 512;
  const h = 2048;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;

  const palette: Record<PitchCondition, [string, string]> = {
    Flat: ['#C8B18B', '#B89E74'],
    Green: ['#8FA76A', '#7E955A'],
    Dry: ['#D3BC93', '#BEA478'],
    Damp: ['#978666', '#827153'],
  };
  const [baseColor, wearColor] = palette[pitch];
  ctx.fillStyle = baseColor;
  ctx.fillRect(0, 0, w, h);

  // Subtle rolled soil streaks
  for (let i = 0; i < 160; i++) {
    ctx.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,0.035)' : 'rgba(60,40,20,0.04)';
    ctx.fillRect(Math.random() * w, 0, 2 + Math.random() * 6, h);
  }

  // Bowler rough patches & batter footmarks
  ctx.fillStyle = wearColor;
  ctx.globalAlpha = 0.45;
  ctx.beginPath();
  ctx.ellipse(w * 0.34, h * 0.16, 42, 130, 0, 0, Math.PI * 2);
  ctx.ellipse(w * 0.66, h * 0.84, 42, 130, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1.0;

  // White crease markings (batting end and bowling end)
  ctx.strokeStyle = '#F8FAFC';
  ctx.lineWidth = 10;

  const drawEndCreases = (bowlingY: number, dir: 1 | -1) => {
    const poppingY = bowlingY + dir * 112; // ~1.22m in front of stumps
    const backY = bowlingY - dir * 112;

    // Bowling crease
    ctx.beginPath();
    ctx.moveTo(w * 0.18, bowlingY);
    ctx.lineTo(w * 0.82, bowlingY);
    ctx.stroke();

    // Popping crease (extended)
    ctx.beginPath();
    ctx.moveTo(w * 0.04, poppingY);
    ctx.lineTo(w * 0.96, poppingY);
    ctx.stroke();

    // Return creases
    ctx.beginPath();
    ctx.moveTo(w * 0.18, backY);
    ctx.lineTo(w * 0.18, poppingY);
    ctx.moveTo(w * 0.82, backY);
    ctx.lineTo(w * 0.82, poppingY);
    ctx.stroke();

    // Wide guidelines
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(w * 0.27, bowlingY);
    ctx.lineTo(w * 0.27, poppingY);
    ctx.moveTo(w * 0.73, bowlingY);
    ctx.lineTo(w * 0.73, poppingY);
    ctx.stroke();
    ctx.lineWidth = 10;
  };

  drawEndCreases(180, 1);
  drawEndCreases(h - 180, -1);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = anisotropy;
  return tex;
}

export function createBallTexture(ballColor: string, seamColor: string, anisotropy: number): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = ballColor;
  ctx.fillRect(0, 0, size, size);

  // Subtle leather shine gradient
  const grad = ctx.createLinearGradient(0, 0, size, size);
  grad.addColorStop(0, 'rgba(255,255,255,0.12)');
  grad.addColorStop(0.5, 'rgba(0,0,0,0)');
  grad.addColorStop(1, 'rgba(0,0,0,0.2)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  // Equator stitched seam
  ctx.strokeStyle = seamColor;
  ctx.lineWidth = 6;
  ctx.setLineDash([8, 4]);
  ctx.beginPath();
  ctx.moveTo(0, size * 0.48);
  ctx.lineTo(size, size * 0.48);
  ctx.moveTo(0, size * 0.52);
  ctx.lineTo(size, size * 0.52);
  ctx.stroke();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = anisotropy;
  return tex;
}

export function createBatWillowTexture(willowHex: string, accentHex: string, anisotropy: number): THREE.CanvasTexture {
  const w = 128;
  const h = 512;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = willowHex;
  ctx.fillRect(0, 0, w, h);

  // Natural straight willow wood grains
  ctx.strokeStyle = 'rgba(110, 72, 32, 0.24)';
  ctx.lineWidth = 2;
  for (let x = 8; x < w; x += 11) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x + (Math.random() - 0.5) * 3, h);
    ctx.stroke();
  }

  // Manufacturer sticker chevron
  ctx.fillStyle = accentHex;
  ctx.beginPath();
  ctx.moveTo(14, h * 0.26);
  ctx.lineTo(w - 14, h * 0.26);
  ctx.lineTo(w - 14, h * 0.58);
  ctx.lineTo(w / 2, h * 0.66);
  ctx.lineTo(14, h * 0.58);
  ctx.closePath();
  ctx.fill();

  // Inner dark stripe on sticker
  ctx.fillStyle = '#0F172A';
  ctx.fillRect(24, h * 0.34, w - 48, 22);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = anisotropy;
  return tex;
}

export function createAdBoardTexture(anisotropy: number): THREE.CanvasTexture {
  const w = 1024;
  const h = 128;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;

  const panels = [
    { bg: '#064E3B', fg: '#34D399', text: 'REAL CRICKET LIFE' },
    { bg: '#0F172A', fg: '#F8FAFC', text: 'STADIUM SERIES' },
    { bg: '#78350F', fg: '#FBBF24', text: 'APEX WILLOW' },
    { bg: '#1E3A8A', fg: '#93C5FD', text: 'WORLD CHAMPIONSHIP' },
  ];

  const pw = w / panels.length;
  panels.forEach((p, idx) => {
    ctx.fillStyle = p.bg;
    ctx.fillRect(idx * pw, 0, pw, h);
    ctx.fillStyle = p.fg;
    ctx.font = 'bold 26px "Barlow Condensed", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(p.text, idx * pw + pw / 2, h / 2);
  });

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = anisotropy;
  tex.wrapS = THREE.RepeatWrapping;
  tex.repeat.set(8, 1);
  return tex;
}
