import crypto from 'crypto';

// The encryption key should be exactly 32 bytes long for aes-256-gcm.
// We fallback to a default dev key if not provided, but in production,
// ENCRYPTION_KEY environment variable MUST be set.
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default_dev_encryption_key_32_bytes_long!@#';
const ALGORITHM = 'aes-256-gcm';

// We need to ensure the key is exactly 32 bytes
const getValidKey = () => {
  if (ENCRYPTION_KEY.length === 32) {
    return Buffer.from(ENCRYPTION_KEY, 'utf-8');
  }
  // Hash it to get a 32-byte key if it's not exactly 32 bytes
  return crypto.createHash('sha256').update(String(ENCRYPTION_KEY)).digest('base64').substring(0, 32);
};

export function encrypt(text: string): string {
  if (!text) return text;
  
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, getValidKey(), iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();
  
  // Format: iv:authTag:encryptedText
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

export function decrypt(text: string): string {
  if (!text || !text.includes(':')) return text; // Not encrypted or empty
  
  try {
    const parts = text.split(':');
    if (parts.length !== 3) return text;
    
    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encryptedText = parts[2];
    
    const decipher = crypto.createDecipheriv(ALGORITHM, getValidKey(), iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('Decryption failed', error);
    return text; // Return original text if decryption fails
  }
}
