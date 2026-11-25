import * as THREE from 'three';

export const Palette = {
  Ink: 0x2a2d32,
  ShadowCool: 0x9aa9c8,
  ShadowWarm: 0xb39a9a,

  SkyZenith: 0x5cbdbd,
  SkyHorizon: 0xa3e2d3,
  Cream: 0xede6d3,
  WarmGrey: 0xc9c2b2,
  Concrete: 0xa9ada5,
  Sage: 0x9db5a1,
  Mint: 0x86cdb5,
  Teal: 0x4fa7a3,
  Slate: 0x6c7e86,
  SlateDark: 0x4c5a61,

  Red: 0xb9463f,
  Brick: 0xc46f5c,
  Orange: 0xe89b3c,
  Mustard: 0xe2c25b,
  SkyBlue: 0x7fb6d9,
  Navy: 0x394a6b,
  Wood: 0xa9774f,
  WoodDark: 0x75513a,
  Rattan: 0xd1a867,
  Steel: 0xb9c3c6,
  White: 0xf4f1e8,
  Skin: 0xf2cdb0,
  Hair: 0x3a2f33,
  Roach: 0x7a4128,
  RoachDark: 0x4e2a1c,
} as const;

let sharedGradientMap: THREE.DataTexture | null = null;

export function getToonGradientMap(): THREE.DataTexture {
  if (sharedGradientMap) return sharedGradientMap;
  const colors = new Uint8Array([
    130, 130, 145, 255,
    210, 210, 215, 255,
    255, 255, 255, 255,
  ]);
  const tex = new THREE.DataTexture(colors, 3, 1, THREE.RGBAFormat);
  tex.minFilter = THREE.NearestFilter;
  tex.magFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  tex.needsUpdate = true;
  sharedGradientMap = tex;
  return tex;
}

export function createToonMaterial(
  color: number,
  options: {
    map?: THREE.Texture;
    emissive?: number;
    emissiveIntensity?: number;
    transparent?: boolean;
    opacity?: number;
    side?: THREE.Side;
  } = {}
): THREE.MeshToonMaterial {
  return new THREE.MeshToonMaterial({
    color: options.map ? 0xffffff : color,
    gradientMap: getToonGradientMap(),
    map: options.map,
    emissive: options.emissive ?? 0x000000,
    emissiveIntensity: options.emissiveIntensity ?? 1,
    transparent: options.transparent ?? false,
    opacity: options.opacity ?? 1,
    side: options.side ?? THREE.FrontSide,
  });
}

const inkLineMaterial = new THREE.LineBasicMaterial({
  color: Palette.Ink,
  transparent: true,
  opacity: 0.42,
});

export function attachInkEdges(mesh: THREE.Mesh, thresholdAngle = 28): void {
  const edges = new THREE.EdgesGeometry(mesh.geometry, thresholdAngle);
  const line = new THREE.LineSegments(edges, inkLineMaterial);
  line.raycast = () => {};
  mesh.add(line);
}

export function createTileTexture(
  gridCount: number,
  colorA: string,
  colorB: string,
  groutColor: string,
  checker: boolean,
  repeatX = 1,
  repeatY = 1
): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const cell = size / gridCount;

  for (let y = 0; y < gridCount; y++) {
    for (let x = 0; x < gridCount; x++) {
      ctx.fillStyle = checker && (x + y) % 2 === 1 ? colorB : colorA;
      ctx.fillRect(x * cell, y * cell, cell, cell);
    }
  }

  ctx.strokeStyle = groutColor;
  ctx.lineWidth = 3;
  for (let i = 0; i <= gridCount; i++) {
    const p = i * cell;
    ctx.beginPath();
    ctx.moveTo(p, 0);
    ctx.lineTo(p, size);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, p);
    ctx.lineTo(size, p);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createWoodTexture(): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#C08A5E';
  ctx.fillRect(0, 0, size, size);

  const planks = 4;
  const plankH = size / planks;
  for (let i = 0; i < planks; i++) {
    ctx.fillStyle = i % 2 === 0 ? '#C08A5E' : '#B37D52';
    ctx.fillRect(0, i * plankH, size, plankH);

    ctx.strokeStyle = '#8E6142';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, i * plankH);
    ctx.lineTo(size, i * plankH);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(117, 81, 58, 0.35)';
    ctx.lineWidth = 1.5;
    for (let g = 0; g < 3; g++) {
      const y = i * plankH + (g + 0.6) * (plankH / 3.5);
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.bezierCurveTo(size * 0.3, y - 3, size * 0.7, y + 3, size, y);
      ctx.stroke();
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createPronotumTexture(): THREE.CanvasTexture {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#D9933B';
  ctx.fillRect(0, 0, size, size);

  // Dua bercak gelap khas Periplaneta americana di tengah pronotum
  ctx.fillStyle = '#3B1D12';
  ctx.beginPath();
  ctx.ellipse(size * 0.36, size * 0.52, size * 0.19, size * 0.27, -0.15, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(size * 0.64, size * 0.52, size * 0.19, size * 0.27, 0.15, 0, Math.PI * 2);
  ctx.fill();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createWingTexture(): THREE.CanvasTexture {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#874528';
  ctx.fillRect(0, 0, size, size);

  ctx.strokeStyle = 'rgba(58, 25, 14, 0.55)';
  ctx.lineWidth = 2;
  for (let i = 1; i <= 6; i++) {
    ctx.beginPath();
    ctx.moveTo(size * 0.5, 0);
    ctx.quadraticCurveTo(size * (0.2 + i * 0.1), size * 0.5, size * (i / 7), size);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createDasterTexture(): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#4FA7A3';
  ctx.fillRect(0, 0, size, size);

  // Motif kelopak sederhana khas daster rumah Indonesia
  const spots = [
    [45, 50],
    [135, 38],
    [215, 70],
    [85, 130],
    [185, 150],
    [40, 210],
    [130, 215],
    [220, 225],
  ];
  for (const [cx, cy] of spots) {
    ctx.fillStyle = '#EDE6D3';
    for (let p = 0; p < 5; p++) {
      const a = (p / 5) * Math.PI * 2;
      ctx.beginPath();
      ctx.arc(cx + Math.cos(a) * 10, cy + Math.sin(a) * 10, 6, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#E89B3C';
    ctx.beginPath();
    ctx.arc(cx, cy, 5, 0, Math.PI * 2);
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 2);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
