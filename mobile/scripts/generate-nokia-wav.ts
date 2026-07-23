// Diseñado por: Edward Labrador  ·  Para: ELITE GROUP - Integral Services LLC
// Genera el Nokia SMS tone como archivo WAV y lo guarda en assets/
// Uso: npx tsx scripts/generate-nokia-wav.ts
//
// Patrón: pi  piii  pi  piii
//         100ms 200ms 100ms 200ms  (x2 repeticiones, pausa entre grupos)

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const SR  = 22050;
const AMP = 28000;

// pi piii pi piii  →  repetido 2 veces con pausa entre grupos
// [frecuencia Hz, duración ms, silencio posterior ms]
type Note = [number, number, number];

const GROUP: Note[] = [
  [1318, 100, 60],   // pi    (E6)
  [1318, 220, 60],   // piii  (E6)
  [1318, 100, 60],   // pi
  [1318, 220, 0],    // piii  (sin pausa al final del grupo)
];

const PAUSE_BETWEEN_GROUPS = 350; // ms de silencio entre las dos repeticiones
const REPEATS = 2;

function u32le(buf: Uint8Array, off: number, v: number) {
  buf[off]   =  v        & 255;
  buf[off+1] = (v >>>  8)& 255;
  buf[off+2] = (v >>> 16)& 255;
  buf[off+3] = (v >>> 24)& 255;
}
function u16le(buf: Uint8Array, off: number, v: number) {
  buf[off]   =  v       & 255;
  buf[off+1] = (v >>> 8)& 255;
}

// Calcular total de muestras
function groupSamples(): number {
  let s = 0;
  for (const [, dur, gap] of GROUP) s += Math.floor(SR * (dur + gap) / 1000);
  return s;
}

const pauseSamples = Math.floor(SR * PAUSE_BETWEEN_GROUPS / 1000);
const totalSamples = groupSamples() * REPEATS + pauseSamples * (REPEATS - 1);
const dataBytes    = totalSamples * 2;
const wav          = new Uint8Array(44 + dataBytes);

// RIFF header
[0x52,0x49,0x46,0x46].forEach((b,i) => wav[i]=b);
u32le(wav, 4, 36 + dataBytes);
[0x57,0x41,0x56,0x45].forEach((b,i) => wav[8+i]=b);
[0x66,0x6D,0x74,0x20].forEach((b,i) => wav[12+i]=b);
u32le(wav,16,16); u16le(wav,20,1); u16le(wav,22,1);
u32le(wav,24,SR); u32le(wav,28,SR*2); u16le(wav,32,2); u16le(wav,34,16);
[0x64,0x61,0x74,0x61].forEach((b,i) => wav[36+i]=b);
u32le(wav,40,dataBytes);

let pos = 44;

function writeSilence(samples: number) {
  pos += samples * 2; // ya son ceros
}

function writeBeep(freq: number, durationMs: number) {
  const n   = Math.floor(SR * durationMs / 1000);
  const atk = Math.min(40, Math.floor(n * 0.10));
  const rel = Math.min(80, Math.floor(n * 0.15));

  for (let i = 0; i < n; i++) {
    let env = 1.0;
    if (i < atk)            env = i / atk;
    else if (i > n - rel)   env = (n - i) / rel;

    let s = Math.round(AMP * env * Math.sin(2 * Math.PI * freq * (i / SR)));
    if (s >  32767) s =  32767;
    if (s < -32768) s = -32768;
    const u = s < 0 ? s + 65536 : s;
    wav[pos]   = u & 255;
    wav[pos+1] = (u >>> 8) & 255;
    pos += 2;
  }
}

for (let r = 0; r < REPEATS; r++) {
  for (const [freq, dur, gap] of GROUP) {
    writeBeep(freq, dur);
    writeSilence(Math.floor(SR * gap / 1000));
  }
  if (r < REPEATS - 1) writeSilence(pauseSamples);
}

const outPath = path.join(__dirname, '../assets/nokia_tone.wav');
fs.writeFileSync(outPath, Buffer.from(wav));
console.log(`✅ nokia_sms_tone.wav generado: ${wav.length} bytes → ${outPath}`);
