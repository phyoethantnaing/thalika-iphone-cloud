import { randomBytes, scryptSync } from 'node:crypto';
import { writeFileSync, existsSync } from 'node:fs';
// Never write or print the password; generated credentials go only to a private local file.
const password = randomBytes(24).toString('base64url');
const salt = randomBytes(16).toString('hex');
const destination = process.argv[2] || '.env.local';
if (existsSync(destination)) throw new Error(`${destination} exists. Choose a new output file; merge manually.`);
writeFileSync(destination, `OWNER_PASSWORD_HASH=${salt}:${scryptSync(password, salt, 64).toString('hex')}\nSESSION_SECRET=${randomBytes(48).toString('hex')}\nRUNTIME_TOKEN=${randomBytes(48).toString('hex')}\n`, { mode: 0o600, flag: 'wx' });
const passwordFile = `${destination}.owner-password`;
writeFileSync(passwordFile, password + '\n', { mode: 0o600, flag: 'wx' });
console.log(`Credentials: ${destination}; one-time password: ${passwordFile}. Keep both private. Import into your password manager.`);
