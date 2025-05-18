// src/js/historyEncryptionManager.js

// This class will manage bulk encryption/decryption operations on the password history.

const HISTORY_KEY = "password_history"; // Assuming the key name remains consistent

export class HistoryEncryptionManager {
    constructor(chromeStorageLocal, encryptionService) {
        this.storage = chromeStorageLocal; // e.g., chrome.storage.local
        this.encryptionService = encryptionService; // Instance of EncryptionService
    }

    async _getRawHistory() {
        const data = await this.storage.get(HISTORY_KEY);
        return data[HISTORY_KEY] || [];
    }

    async _saveRawHistory(history) {
        await this.storage.set({ [HISTORY_KEY]: history });
    }

    async encryptExistingHistory(masterPassword) {
        if (!masterPassword) {
            console.error("Master password is required for encryption.");
            return { succeeded: 0, failed: 0, critical: true, error: "Master password required" };
        }
        try {
            const history = await this._getRawHistory();
            const updatedHistory = [];
            let succeeded = 0;
            let failed = 0;

            for (const item of history) {
                if (!item.isEncrypted && item.password) {
                    try {
                        const encrypted = await this.encryptionService.encryptData(item.password, masterPassword);
                        if (encrypted && encrypted.cipherText && encrypted.iv) {
                            const encryptedItem = { ...item }; // Clone item
                            delete encryptedItem.password; // Remove plaintext
                            encryptedItem.encryptedPassword = encrypted.cipherText;
                            encryptedItem.iv = encrypted.iv;
                            encryptedItem.isEncrypted = true;
                            updatedHistory.push(encryptedItem);
                            succeeded++;
                        } else {
                            updatedHistory.push(item); // Push original item on encryption failure
                            failed++;
                            console.warn(`Failed to encrypt history item ID: ${item.id}. It was not a critical failure for this item.`);
                        }
                    } catch (encError) {
                        console.error(`Error encrypting history item ID: ${item.id}:`, encError);
                        updatedHistory.push(item); // Push original item
                        failed++;
                    }
                } else {
                    updatedHistory.push(item); // Already encrypted or no password to encrypt
                }
            }
            await this._saveRawHistory(updatedHistory);
            return { succeeded, failed, critical: false };
        } catch (error) {
            console.error("Critical error encrypting existing history:", error);
            return { succeeded: 0, failed: 0, critical: true, error: error.message };
        }
    }

    async reEncryptHistory(oldMasterPassword, newMasterPassword) {
        if (!oldMasterPassword || !newMasterPassword) {
            console.error("[HistoryEncryptionManager] Old or new master password missing.");
            return { succeeded: 0, failed: 0, critical: true, error: "Master passwords required" };
        }
        try {
            const history = await this._getRawHistory();
            const updatedHistory = [];
            let succeeded = 0;
            let failed = 0;

            for (const item of history) {
                if (item.isEncrypted && item.encryptedPassword && item.iv) {
                    try {
                        const decryptedPassword = await this.encryptionService.decryptData(item.encryptedPassword, item.iv, oldMasterPassword);

                        if (decryptedPassword !== null) {
                            const encrypted = await this.encryptionService.encryptData(decryptedPassword, newMasterPassword);
                            if (encrypted && encrypted.cipherText && encrypted.iv) {
                                const reEncryptedItem = { ...item };
                                delete reEncryptedItem.password;
                                reEncryptedItem.encryptedPassword = encrypted.cipherText;
                                reEncryptedItem.iv = encrypted.iv;
                                updatedHistory.push(reEncryptedItem);
                                succeeded++;
                            } else {
                                console.warn(`[HistoryEncryptionManager] Failed to re-encrypt (new encryption step) history item ID: ${item.id}`);
                                updatedHistory.push(item);
                                failed++;
                            }
                        } else {
                            console.warn(`[HistoryEncryptionManager] Failed to decrypt (old password step) history item ID: ${item.id} during re-encryption. Pushing original.`);
                            updatedHistory.push(item);
                            failed++;
                        }
                    } catch (reEncError) {
                        console.error(`[HistoryEncryptionManager] Error during individual re-encryption of item ID: ${item.id}:`, reEncError);
                        updatedHistory.push(item);
                        failed++;
                    }
                } else {
                    updatedHistory.push(item);
                }
            }
            await this._saveRawHistory(updatedHistory);
            return { succeeded, failed, critical: false };
        } catch (error) {
            console.error("[HistoryEncryptionManager] CRITICAL error in reEncryptHistory main try-catch:", error);
            return { succeeded: 0, failed: 0, critical: true, error: error.message };
        }
    }

    async decryptExistingHistory(masterPassword) {
        if (!masterPassword) {
            console.error("Master password is required for decryption.");
            return { succeeded: 0, failed: 0, critical: true, error: "Master password required" };
        }
        try {
            const history = await this._getRawHistory();
            const updatedHistory = [];
            let succeeded = 0;
            let failed = 0;

            for (const item of history) {
                if (item.isEncrypted && item.encryptedPassword && item.iv) {
                    try {
                        const decryptedPassword = await this.encryptionService.decryptData(item.encryptedPassword, item.iv, masterPassword);
                        if (decryptedPassword !== null) {
                            const decryptedItem = { ...item }; // Clone
                            delete decryptedItem.encryptedPassword;
                            delete decryptedItem.iv;
                            decryptedItem.password = decryptedPassword;
                            decryptedItem.isEncrypted = false;
                            updatedHistory.push(decryptedItem);
                            succeeded++;
                        } else {
                            console.warn(`Failed to decrypt history item ID: ${item.id}. Check master password.`);
                            updatedHistory.push(item); // Push original item (still encrypted or undecryptable)
                            failed++;
                        }
                    } catch (decError) {
                        console.error(`Error decrypting history item ID: ${item.id}:`, decError);
                        updatedHistory.push(item);
                        failed++;
                    }
                } else {
                    updatedHistory.push(item); // Already plaintext or no password data
                }
            }
            await this._saveRawHistory(updatedHistory);
            return { succeeded, failed, critical: false };
        } catch (error) {
            console.error("Critical error decrypting existing history:", error);
            return { succeeded: 0, failed: 0, critical: true, error: error.message };
        }
    }
} 