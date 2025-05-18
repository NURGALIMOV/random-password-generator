/**
 * Derives a key from a master password and salt using PBKDF2.
 * @param {string} password - The master password.
 * @param {Uint8Array} salt - The salt.
 * @returns {Promise<CryptoKey>} The derived key.
 */
async function deriveKey(password, salt) {
  const enc = new TextEncoder();
  const baseKey = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  );
  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt,
      iterations: 100000,
      hash: "SHA-256",
    },
    baseKey,
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"]
  );
}

/**
 * Encrypts data using AES-GCM.
 * @param {string} plaintext - The data to encrypt.
 * @param {CryptoKey} key - The encryption key.
 * @returns {Promise<{cipherText: string, iv: string}>} The encrypted data and IV, base64-encoded.
 */
async function encrypt(plaintext, key) {
  const enc = new TextEncoder();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertextBuffer = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv },
    key,
    enc.encode(plaintext)
  );

  const bufferToBase64 = (buff) => btoa(String.fromCharCode.apply(null, new Uint8Array(buff)));
  
  return {
    cipherText: bufferToBase64(ciphertextBuffer),
    iv: bufferToBase64(iv),
  };
}

/**
 * Decrypts data using AES-GCM.
 * @param {string} cipherTextB64 - The base64-encoded ciphertext.
 * @param {string} ivB64 - The base64-encoded IV.
 * @param {CryptoKey} key - The decryption key.
 * @returns {Promise<string|null>} The decrypted plaintext, or null on failure.
 */
async function decrypt(cipherTextB64, ivB64, key) {
  try {
    const base64ToBuffer = (b64) => Uint8Array.from(atob(b64), c => c.charCodeAt(0));
    
    const ciphertext = base64ToBuffer(cipherTextB64);
    const iv = base64ToBuffer(ivB64);

    const decryptedBuffer = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: iv },
      key,
      ciphertext
    );

    return new TextDecoder().decode(decryptedBuffer);
  } catch (e) {
    console.error("Decryption failed in worker:", e);
    return null; // Indicates a decryption error (e.g., wrong password)
  }
}

// Listen for messages from the main thread
self.onmessage = async (event) => {
  const { id, type, payload } = event.data;

  try {
    let result;
    switch (type) {
      case 'deriveKey': {
        const { password, salt } = payload;
        // This is not directly used from outside, but a core part of the logic
        // Salt must be passed as Uint8Array
        const saltBuffer = new Uint8Array(Object.values(salt));
        result = await deriveKey(password, saltBuffer);
        // CryptoKey cannot be cloned, so we don't send it back.
        // The worker will derive the key for each operation.
        // This is a security measure.
        self.postMessage({ id, success: true, payload: "Key derived and used internally." });
        return;
      }
      case 'encrypt': {
        const { plaintext, password, salt } = payload;
        const saltBuffer = new Uint8Array(Object.values(salt));
        const key = await deriveKey(password, saltBuffer);
        result = await encrypt(plaintext, key);
        break;
      }
      case 'decrypt': {
        const { cipherText, iv, password, salt } = payload;
        const saltBuffer = new Uint8Array(Object.values(salt));
        const key = await deriveKey(password, saltBuffer);
        result = await decrypt(cipherText, iv, key);
        break;
      }
      default:
        throw new Error(`Unknown action in crypto-worker: ${type}`);
    }
    self.postMessage({ id, success: true, payload: result });
  } catch (error) {
    self.postMessage({ id, success: false, error: error.message });
  }
}; 