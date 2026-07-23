// Diseñado por: Edward Labrador
// Para: ELITE GROUP - Integral Services LLC
// Encriptación AES-256-GCM para campos PII sensibles (date_of_birth, home_address, license_number)
// La clave vive en DB_ENCRYPTION_KEY (env var) — nunca se almacena en la BD.
// Formato del ciphertext: "<iv_b64>.<tag_b64>.<data_b64>"

import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_BYTES   = 12; // 96-bit IV recomendado para GCM
const TAG_BYTES  = 16;

function getKey(): Buffer {
  const raw = process.env['DB_ENCRYPTION_KEY'] ?? '';
  if (!raw || raw.length < 32) {
    throw new Error('DB_ENCRYPTION_KEY must be at least 32 characters');
  }
  // Usar los primeros 32 bytes del key (permite hex de 64 chars o string de 32+)
  return Buffer.from(raw.slice(0, 64), raw.length === 64 ? 'hex' : 'utf8').subarray(0, 32);
}

export function encryptPII(plaintext: string | null | undefined): string | null {
  if (!plaintext) return null;
  const key = getKey();
  const iv  = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('base64')}.${tag.toString('base64')}.${encrypted.toString('base64')}`;
}

export function decryptPII(ciphertext: string | null | undefined): string | null {
  if (!ciphertext) return null;
  // Si no tiene el formato esperado, es texto plano legado — devolverlo tal cual
  if (!ciphertext.includes('.')) return ciphertext;
  try {
    const key = getKey();
    const parts = ciphertext.split('.');
    if (parts.length !== 3) return ciphertext;
    const [ivB64, tagB64, dataB64] = parts as [string, string, string];
    const iv   = Buffer.from(ivB64,  'base64');
    const tag  = Buffer.from(tagB64, 'base64');
    const data = Buffer.from(dataB64,'base64');
    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);
    return decipher.update(data).toString('utf8') + decipher.final('utf8');
  } catch {
    return null;
  }
}
