const fs = require('fs');
const zlib = require('zlib');
const path = require('path');

const dir = path.join('public', 'images');
fs.mkdirSync(dir, { recursive: true });

const W = 1200;
const H = 675;

function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const t = Buffer.from(type);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([t, data])));
  return Buffer.concat([len, t, data, crc]);
}

const raw = Buffer.alloc((W * 4 + 1) * H);
for (let y = 0; y < H; y++) {
  const row = y * (W * 4 + 1);
  raw[row] = 0;
  for (let x = 0; x < W; x++) {
    const i = row + 1 + x * 4;
    const inset = y > 48 && y < H - 48 && x > 48 && x < W - 48;
    raw[i] = inset ? 22 : 14;
    raw[i + 1] = inset ? 26 : 17;
    raw[i + 2] = inset ? 34 : 22;
    raw[i + 3] = 255;
    if (inset && y > 80 && y < 120 && x > 80 && x < W - 80) {
      raw[i] = 30;
      raw[i + 1] = 35;
      raw[i + 2] = 45;
    }
  }
}

const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(W, 0);
ihdr.writeUInt32BE(H, 4);
ihdr[8] = 8;
ihdr[9] = 6;

const png = Buffer.concat([
  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
  chunk('IHDR', ihdr),
  chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
  chunk('IEND', Buffer.alloc(0)),
]);

const out = path.join(dir, 'produkt-skjermbilde.png');
fs.writeFileSync(out, png);
console.log('wrote', out, png.length);
