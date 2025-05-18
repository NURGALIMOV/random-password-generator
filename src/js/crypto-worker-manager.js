// src/js/crypto-worker-manager.js

class CryptoWorkerManager {
  constructor() {
    // Use webpack's new URL constructor for workers
    this.worker = new Worker(new URL('./crypto-worker.js', import.meta.url));
    this.requests = new Map();
    this.nextRequestId = 0;

    this.worker.onmessage = (event) => {
      const { id, success, payload, error } = event.data;
      if (this.requests.has(id)) {
        const { resolve, reject } = this.requests.get(id);
        if (success) {
          resolve(payload);
        } else {
          reject(new Error(error));
        }
        this.requests.delete(id);
      }
    };

    this.worker.onerror = (error) => {
      console.error('CryptoWorker has an error:', error);
      // Reject all pending requests
      this.requests.forEach(({ reject }) => {
        reject(new Error('CryptoWorker failed.'));
      });
      this.requests.clear();
    };
  }

  /**
   * Posts a message to the worker and returns a Promise that resolves with the result.
   * @param {string} type - The action to perform in the worker.
   * @param {object} payload - The data needed for the action.
   * @returns {Promise<any>}
   */
  postMessage(type, payload) {
    const id = this.nextRequestId++;
    return new Promise((resolve, reject) => {
      this.requests.set(id, { resolve, reject });
      this.worker.postMessage({ id, type, payload });
    });
  }
}

// Export a singleton instance
export const cryptoWorkerManager = new CryptoWorkerManager(); 