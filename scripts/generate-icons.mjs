import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  crcTable[n] = c >>> 0;
}

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function makeChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcBuf = Buffer.alloc(4);
  const combined = Buffer.concat([typeBuf, data]);
  crcBuf.writeUInt32BE(crc32(combined), 0);
  return Buffer.concat([len, combined, crcBuf]);
}

function encodePNG(width, height, rgba) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const stride = width * 4 + 1;
  const raw = Buffer.alloc(stride * height);
  for (let y = 0; y < height; y++) {
    raw[y * stride] = 0;
    rgba.copy(raw, y * stride + 1, y * width * 4, (y + 1) * width * 4);
  }
  const compressed = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([
    signature,
    makeChunk('IHDR', ihdr),
    makeChunk('IDAT', compressed),
    makeChunk('IEND', Buffer.alloc(0)),
  ]);
}

// Signed distance helper for shield shape in normalized [-1, 1] coords
function insideShield(nx, ny, scale = 1) {
  const x = Math.abs(nx) / scale;
  const y = ny / scale;
  if (y < -0.78 || y > 0.86) return -1;
  // Top roof slope from (0, -0.78) to (0.68, -0.48)
  if (y < -0.48) {
    const maxW = ((y + 0.78) / 0.30) * 0.68;
    return maxW - x;
  }
  // Tapered body down to (0, 0.86)
  const t = (y + 0.48) / 1.34;
  const maxW = 0.68 * (1 - Math.pow(t, 1.85));
  return maxW - x;
}

function renderShieldIcon(size, maskable = false) {
  const buf = Buffer.alloc(size * size * 4);
  const scale = maskable ? 0.72 : 0.88;

  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      const idx = (py * size + px) * 4;
      const nx = (px / (size - 1)) * 2 - 1;
      const ny = (py / (size - 1)) * 2 - 1;

      // Deep navy background gradient (#060A13 -> #0B1426)
      const grad = Math.max(0, Math.min(1, (ny + 1) * 0.5));
      let r = Math.round(6 + grad * 7);
      let g = Math.round(10 + grad * 12);
      let b = Math.round(19 + grad * 22);

      const outerDist = insideShield(nx, ny, scale);
      const innerDist = insideShield(nx, ny, scale * 0.78);
      const coreDist = insideShield(nx, ny, scale * 0.58);

      // Outer shield electric blue border (#2563EB)
      if (outerDist >= 0 && innerDist < 0) {
        r = 37;
        g = 99;
        b = 235;
      } else if (innerDist >= 0) {
        // Shield interior navy (#0F1D36)
        r = 15;
        g = 29;
        b = 54;
        // Thin cyan ring
        if (coreDist < 0.035 && coreDist >= 0) {
          r = 34;
          g = 211;
          b = 238;
        }
      }

      // Crosshair / node emblem inside shield
      const sx = nx / scale;
      const sy = ny / scale;
      const distCenter = Math.hypot(sx, sy + 0.02);
      const onVert = Math.abs(sx) < 0.042 && sy > -0.34 && sy < 0.42;
      const onHoriz = Math.abs(sy + 0.02) < 0.042 && Math.abs(sx) < 0.28;
      if (onVert || onHoriz) {
        r = 34;
        g = 211;
        b = 238;
      }
      if (distCenter < 0.12) {
        r = 59;
        g = 130;
        b = 246;
      }
      if (distCenter < 0.065) {
        r = 224;
        g = 242;
        b = 254;
      }

      buf[idx] = r;
      buf[idx + 1] = g;
      buf[idx + 2] = b;
      buf[idx + 3] = 255;
    }
  }
  return encodePNG(size, size, buf);
}

const publicDir = path.resolve(process.cwd(), 'public');
fs.mkdirSync(publicDir, { recursive: true });

fs.writeFileSync(path.join(publicDir, 'pwa-192x192.png'), renderShieldIcon(192, false));
fs.writeFileSync(path.join(publicDir, 'pwa-512x512.png'), renderShieldIcon(512, false));
fs.writeFileSync(path.join(publicDir, 'pwa-maskable-512x512.png'), renderShieldIcon(512, true));
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), renderShieldIcon(180, false));

console.log('Generated PWA PNG icons in public/');
