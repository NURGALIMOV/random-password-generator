/**
 * Service for handling encryption and decryption of data.
 */
export class EncryptionService {
  /**
   * @param {object} storageApi - An object with get and set methods, similar to chrome.storage.local.
   * @param {string} saltKey - The key used to store the encryption salt in storageApi.
   */
  constructor(storageApi, saltKey) {
    this.storageApi = storageApi;
    this.SALT_KEY = saltKey;
    this.PBKDF2_ITERATIONS = 310000; // Iterations for PBKDF2 key derivation
    this.AES_IV_LENGTH = 12; // bytes, IV length for AES-GCM
  }

  /**
   * Converts ArrayBuffer to Base64 string.
   * @param {ArrayBuffer} buffer
   * @returns {string}
   * @private
   */
  _arrayBufferToBase64(buffer) {
    let binary = "";
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  /**
   * Converts Base64 string to ArrayBuffer.
   * @param {string} base64
   * @returns {ArrayBuffer}
   * @private
   */
  _base64ToArrayBuffer(base64) {
    const binary_string = atob(base64);
    const len = binary_string.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binary_string.charCodeAt(i);
    }
    return bytes.buffer;
  }

  /**
   * Retrieves salt from storage, or generates and stores a new one.
   * @returns {Promise<ArrayBuffer>} Salt
   * @private
   */
  async _getSalt() {
    try {
      const data = await this.storageApi.get(this.SALT_KEY);
      if (data[this.SALT_KEY]) {
        return this._base64ToArrayBuffer(data[this.SALT_KEY]);
      } else {
        const salt = crypto.getRandomValues(new Uint8Array(16)); // 16 bytes salt
        const saltBase64 = this._arrayBufferToBase64(salt);
        await this.storageApi.set({ [this.SALT_KEY]: saltBase64 });
        return salt;
      }
    } catch (error) {
      console.error("Error getting or creating salt:", error);
      throw new Error("Could not get or create salt for encryption.");
    }
  }

  /**
   * Derives a cryptographic key from master password and salt.
   * @param {string} masterPassword
   * @param {ArrayBuffer} salt
   * @returns {Promise<CryptoKey>} Derived key for AES-GCM
   * @private
   */
  async _deriveKey(masterPassword, salt) {
    const masterPasswordBuffer = new TextEncoder().encode(masterPassword);
    const importedMasterKey = await crypto.subtle.importKey(
      "raw",
      masterPasswordBuffer,
      "PBKDF2",
      false,
      ["deriveBits", "deriveKey"]
    );
    return crypto.subtle.deriveKey(
      {
        name: "PBKDF2",
        salt: salt,
        iterations: this.PBKDF2_ITERATIONS,
        hash: "SHA-256",
      },
      importedMasterKey,
      { name: "AES-GCM", length: 256 },
      true, // exportable
      ["encrypt", "decrypt"]
    );
  }

  /**
   * Encrypts plaintext data.
   * @param {string} plainText
   * @param {string} masterPassword
   * @returns {Promise<{cipherText: string, iv: string} | null>} Encrypted data or null on error.
   */
  async encryptData(plainText, masterPassword) {
    try {
      const salt = await this._getSalt();
      const key = await this._deriveKey(masterPassword, salt);
      const iv = crypto.getRandomValues(new Uint8Array(this.AES_IV_LENGTH));
      const encodedText = new TextEncoder().encode(plainText);
      const cipherBuffer = await crypto.subtle.encrypt(
        { name: "AES-GCM", iv: iv },
        key,
        encodedText
      );
      return {
        cipherText: this._arrayBufferToBase64(cipherBuffer),
        iv: this._arrayBufferToBase64(iv),
      };
    } catch (error) {
      console.error("Encryption error:", error);
      // Consider more specific error handling or re-throwing
      return null;
    }
  }

  /**
   * Decrypts ciphertext data.
   * @param {string} cipherTextBase64
   * @param {string} ivBase64
   * @param {string} masterPassword
   * @returns {Promise<string | null>} Decrypted plaintext or null on error (e.g., wrong password).
   */
  async decryptData(cipherTextBase64, ivBase64, masterPassword) {
    try {
      const salt = await this._getSalt();
      const key = await this._deriveKey(masterPassword, salt);
      const iv = this._base64ToArrayBuffer(ivBase64);
      const cipherBuffer = this._base64ToArrayBuffer(cipherTextBase64);
      const decryptedBuffer = await crypto.subtle.decrypt(
        { name: "AES-GCM", iv: iv },
        key,
        cipherBuffer
      );
      return new TextDecoder().decode(decryptedBuffer);
    } catch (error) {
      // Common for decryption to fail with wrong password, so null is an expected outcome here.
      console.warn("Decryption error (possibly wrong master password or corrupted data):", error.name);
      return null;
    }
  }
} 