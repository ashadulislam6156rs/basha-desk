import {
  createCipheriv,
  createDecipheriv,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";
import { AppError } from "../../common/app-error.js";

const BASE32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

function encryptionKey(): Buffer {
  const value = process.env.PLATFORM_MFA_ENCRYPTION_KEY;
  if (!value || !/^[\da-fA-F]{64}$/.test(value) || /^0{64}$/i.test(value)) {
    throw new AppError(503, "ERR_MFA_NOT_CONFIGURED", "MFA Not Configured", "Set PLATFORM_MFA_ENCRYPTION_KEY to a 32-byte hex key.");
  }
  return Buffer.from(value, "hex");
}

function base32Encode(bytes: Buffer): string {
  let bits = 0;
  let value = 0;
  let output = "";
  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += BASE32[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) output += BASE32[(value << (5 - bits)) & 31];
  return output;
}

function base32Decode(input: string): Buffer {
  let bits = 0;
  let value = 0;
  const output: number[] = [];
  for (const char of input.replace(/=+$/g, "").toUpperCase()) {
    const index = BASE32.indexOf(char);
    if (index < 0) throw new AppError(500, "ERR_MFA_SECRET", "MFA Error", "Stored MFA secret is invalid.");
    value = (value << 5) | index;
    bits += 5;
    if (bits >= 8) {
      output.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(output);
}

export function createTotpSecret(): string {
  return base32Encode(randomBytes(20));
}

export function encryptTotpSecret(secret: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(secret, "utf8"), cipher.final()]);
  return ["v1", iv.toString("hex"), cipher.getAuthTag().toString("hex"), ciphertext.toString("hex")].join(":");
}

export function decryptTotpSecret(encrypted: string): string {
  const [version, ivHex, tagHex, ciphertextHex] = encrypted.split(":");
  if (version !== "v1" || !ivHex || !tagHex || !ciphertextHex) {
    throw new AppError(500, "ERR_MFA_SECRET", "MFA Error", "Stored MFA secret is invalid.");
  }
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(tagHex, "hex"));
  return Buffer.concat([decipher.update(Buffer.from(ciphertextHex, "hex")), decipher.final()]).toString("utf8");
}

function totpAt(secret: string, timeMs: number): string {
  const counter = BigInt(Math.floor(timeMs / 30_000));
  const message = Buffer.alloc(8);
  message.writeBigUInt64BE(counter);
  const digest = createHmac("sha1", base32Decode(secret)).update(message).digest();
  const offset = digest[digest.length - 1]! & 15;
  const number = (digest.readUInt32BE(offset) & 0x7fffffff) % 1_000_000;
  return String(number).padStart(6, "0");
}

export function verifyTotp(secret: string, code: string, now = Date.now()): boolean {
  if (!/^\d{6}$/.test(code)) return false;
  const candidate = Buffer.from(code);
  for (const drift of [-30_000, 0, 30_000]) {
    const expected = Buffer.from(totpAt(secret, now + drift));
    if (timingSafeEqual(candidate, expected)) return true;
  }
  return false;
}

export function totpUri(secret: string, email: string): string {
  const label = encodeURIComponent(`Basha Desk:${email}`);
  const issuer = encodeURIComponent("Basha Desk");
  return `otpauth://totp/${label}?secret=${secret}&issuer=${issuer}&algorithm=SHA1&digits=6&period=30`;
}
