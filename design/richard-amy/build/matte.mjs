// Chroma-key the flat screenshot background out of each pasted icon PNG,
// crop to the visible content, and write a clean transparent PNG.
// No pixels are invented — this only removes the solid backdrop color and
// keeps the icon's own linework, converted to a flat near-black so it can be
// CSS-inverted for dark mode (same job var(--ink) does for real vector icons).
import { readFileSync, writeFileSync, readdirSync, mkdirSync, existsSync } from "node:fs";
import zlib from "node:zlib";

function decodePNG(buf) {
  let pos = 8; const chunks = [];
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos);
    const type = buf.toString("ascii", pos + 4, pos + 8);
    const data = buf.slice(pos + 8, pos + 8 + len);
    chunks.push({ type, data });
    pos += 8 + len + 4;
  }
  const ihdr = chunks.find(c => c.type === "IHDR").data;
  const width = ihdr.readUInt32BE(0), height = ihdr.readUInt32BE(4);
  const colorType = ihdr[9];
  const idat = Buffer.concat(chunks.filter(c => c.type === "IDAT").map(c => c.data));
  const raw = zlib.inflateSync(idat);
  const channels = colorType === 6 ? 4 : colorType === 2 ? 3 : 1;
  const bpp = channels;
  const stride = width * bpp;
  const out = Buffer.alloc(height * stride);
  let rp = 0;
  for (let y = 0; y < height; y++) {
    const filter = raw[rp]; rp++;
    for (let x = 0; x < stride; x++) {
      const rawByte = raw[rp + x];
      const a = x >= bpp ? out[y * stride + x - bpp] : 0;
      const b = y > 0 ? out[(y - 1) * stride + x] : 0;
      const c = (y > 0 && x >= bpp) ? out[(y - 1) * stride + x - bpp] : 0;
      let val;
      if (filter === 0) val = rawByte;
      else if (filter === 1) val = (rawByte + a) & 0xff;
      else if (filter === 2) val = (rawByte + b) & 0xff;
      else if (filter === 3) val = (rawByte + Math.floor((a + b) / 2)) & 0xff;
      else if (filter === 4) {
        const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
        const pr = (pa <= pb && pa <= pc) ? a : (pb <= pc) ? b : c;
        val = (rawByte + pr) & 0xff;
      } else val = rawByte;
      out[y * stride + x] = val;
    }
    rp += stride;
  }
  return { width, height, channels, data: out };
}

function crc32(buf) {
  let c;
  const table = crc32.table || (crc32.table = (() => {
    const t = [];
    for (let n = 0; n < 256; n++) {
      c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      t[n] = c >>> 0;
    }
    return t;
  })());
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, "ascii");
  const crcBuf = Buffer.alloc(4); crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function encodePNG(width, height, rgba) {
  const stride = width * 4;
  const raw = Buffer.alloc(height * (stride + 1));
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0; // filter type 0 (none)
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride);
  }
  const idatData = zlib.deflateSync(raw, { level: 9 });
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  return Buffer.concat([sig, chunk("IHDR", ihdr), chunk("IDAT", idatData), chunk("IEND", Buffer.alloc(0))]);
}

const SRC = "icons-raw", OUT = "icons-clean";
if (!existsSync(OUT)) mkdirSync(OUT, { recursive: true });

const report = [];
for (const f of readdirSync(SRC).sort()) {
  if (!f.endsWith(".png")) continue;
  const buf = readFileSync(`${SRC}/${f}`);
  const { width, height, data } = decodePNG(buf);
  const px = (x, y) => {
    const i = (y * width + x) * 4;
    return [data[i], data[i + 1], data[i + 2]];
  };
  const bg = px(0, 0);
  const bgL = (bg[0] + bg[1] + bg[2]) / 3;

  // find darkest pixel as the foreground reference
  let fgL = 255;
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const [r, g, b] = px(x, y);
    const L = (r + g + b) / 3;
    if (L < fgL) fgL = L;
  }
  const span = Math.max(bgL - fgL, 1);

  const outRGBA = Buffer.alloc(width * height * 4);
  let minX = width, minY = height, maxX = -1, maxY = -1;
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const i = (y * width + x) * 4;
    const [r, g, b] = px(x, y);
    const L = (r + g + b) / 3;
    let t = (bgL - L) / span; // 0 at background, 1 at darkest foreground
    t = Math.max(0, Math.min(1, t));
    const a = Math.round(t * 255);
    outRGBA[i] = 15; outRGBA[i + 1] = 15; outRGBA[i + 2] = 17; outRGBA[i + 3] = a;
    if (a > 10) {
      if (x < minX) minX = x; if (x > maxX) maxX = x;
      if (y < minY) minY = y; if (y > maxY) maxY = y;
    }
  }

  const pad = 3;
  minX = Math.max(0, minX - pad); minY = Math.max(0, minY - pad);
  maxX = Math.min(width - 1, maxX + pad); maxY = Math.min(height - 1, maxY + pad);
  const cw = maxX - minX + 1, ch = maxY - minY + 1;
  const cropped = Buffer.alloc(cw * ch * 4);
  for (let y = 0; y < ch; y++) {
    const srcStart = ((y + minY) * width + minX) * 4;
    outRGBA.copy(cropped, y * cw * 4, srcStart, srcStart + cw * 4);
  }

  const png = encodePNG(cw, ch, cropped);
  const outName = f.replace("paste-", "icon-").replace(".png", ".png");
  writeFileSync(`${OUT}/${outName}`, png);
  report.push({ file: f, out: outName, orig: `${width}x${height}`, cropped: `${cw}x${ch}`, ratio: (cw / ch).toFixed(2), bytes: png.length });
}
console.log(JSON.stringify(report, null, 2));
