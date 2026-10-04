const crypto = globalThis.crypto;

// Password/key -> AES-256 key
async function getKey(password) {
  const hash = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(password),
  );

  return crypto.subtle.importKey(
    "raw",
    hash,
    {
      name: "AES-GCM",
    },
    false,
    ["encrypt", "decrypt"],
  );
}

// Uint8Array -> Base64URL
function bytesToBase64Url(bytes) {
  let binary = "";

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

// Base64URL -> Uint8Array
function base64UrlToBytes(str) {
  str = str.replace(/-/g, "+").replace(/_/g, "/");

  while (str.length % 4) {
    str += "=";
  }

  const binary = atob(str);

  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

// Encrypt
async function encrypt(text, password) {
  const key = await getKey(password);

  // Random IV
  const iv = crypto.getRandomValues(new Uint8Array(12));

  const encrypted = await crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv,
    },
    key,
    new TextEncoder().encode(text),
  );

  // IV + encrypted data
  const result = new Uint8Array(iv.length + encrypted.byteLength);

  result.set(iv, 0);
  result.set(new Uint8Array(encrypted), iv.length);

  return bytesToBase64Url(result);
}

// Decrypt
async function decrypt(encoded, password) {
  const key = await getKey(password);

  const data = base64UrlToBytes(encoded);

  // First 12 bytes = IV
  const iv = data.slice(0, 12);

  // Remaining = encrypted data
  const encrypted = data.slice(12);

  const decrypted = await crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv,
    },
    key,
    encrypted,
  );

  return new TextDecoder().decode(decrypted);
}

// ==========================
// Example
// ==========================

const key = "MY_SECRET_KEY_123";

const originalText = "Hello World!";

// Encrypt
const encoded = await encrypt(originalText, key);

console.log("Encrypted:");
console.log(encoded);

// Decrypt
const decoded = await decrypt(encoded, key);

console.log("Decrypted:");
console.log(decoded);
