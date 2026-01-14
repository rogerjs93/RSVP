/**
 * FastReader - IndexedDB Wrapper
 * Custom database helper for caching PDFs and documents
 * 
 * 100% Open Source - MIT License
 */

const FastReaderDB = (() => {
    'use strict';

    const DB_NAME = 'FastReaderDB';
    const DB_VERSION = 1;
    const STORE_DOCUMENTS = 'documents';
    const STORE_SETTINGS = 'settings';

    let db = null;

    /**
     * Open/create the database
     */
    function open() {
        return new Promise((resolve, reject) => {
            if (db) {
                resolve(db);
                return;
            }

            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onerror = () => {
                console.error('IndexedDB open error:', request.error);
                reject(request.error);
            };

            request.onsuccess = () => {
                db = request.result;
                resolve(db);
            };

            request.onupgradeneeded = (event) => {
                const database = event.target.result;

                // Documents store for cached PDFs
                if (!database.objectStoreNames.contains(STORE_DOCUMENTS)) {
                    const docStore = database.createObjectStore(STORE_DOCUMENTS, { 
                        keyPath: 'id',
                        autoIncrement: true 
                    });
                    docStore.createIndex('hash', 'hash', { unique: true });
                    docStore.createIndex('date', 'date', { unique: false });
                    docStore.createIndex('fileName', 'fileName', { unique: false });
                }

                // Settings store
                if (!database.objectStoreNames.contains(STORE_SETTINGS)) {
                    database.createObjectStore(STORE_SETTINGS, { keyPath: 'key' });
                }
            };
        });
    }

    /**
     * Generate a hash for file content
     */
    async function hashContent(content) {
        try {
            const encoder = new TextEncoder();
            const data = encoder.encode(content);
            const hashBuffer = await crypto.subtle.digest('SHA-256', data);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        } catch (e) {
            // Fallback for environments without crypto.subtle
            let hash = 0;
            for (let i = 0; i < content.length; i++) {
                const char = content.charCodeAt(i);
                hash = ((hash << 5) - hash) + char;
                hash = hash & hash;
            }
            return Math.abs(hash).toString(16);
        }
    }

    /**
     * Save a document (PDF text) to the database
     */
    async function saveDocument(fileName, text, metadata = {}) {
        const database = await open();
        const hash = await hashContent(text);

        return new Promise((resolve, reject) => {
            const transaction = database.transaction([STORE_DOCUMENTS], 'readwrite');
            const store = transaction.objectStore(STORE_DOCUMENTS);

            // Check if document with same hash exists
            const hashIndex = store.index('hash');
            const getRequest = hashIndex.get(hash);

            getRequest.onsuccess = () => {
                const existing = getRequest.result;

                if (existing) {
                    // Update existing document
                    existing.date = new Date().toISOString();
                    existing.fileName = fileName;
                    const updateRequest = store.put(existing);
                    updateRequest.onsuccess = () => resolve(existing.id);
                    updateRequest.onerror = () => reject(updateRequest.error);
                } else {
                    // Add new document
                    const doc = {
                        hash,
                        fileName,
                        text,
                        date: new Date().toISOString(),
                        totalPages: metadata.totalPages || 0,
                        wordCount: metadata.wordCount || text.split(/\s+/).length
                    };
                    const addRequest = store.add(doc);
                    addRequest.onsuccess = () => resolve(addRequest.result);
                    addRequest.onerror = () => reject(addRequest.error);
                }
            };

            getRequest.onerror = () => reject(getRequest.error);
        });
    }

    /**
     * Get a document by ID
     */
    async function getDocument(id) {
        const database = await open();

        return new Promise((resolve, reject) => {
            const transaction = database.transaction([STORE_DOCUMENTS], 'readonly');
            const store = transaction.objectStore(STORE_DOCUMENTS);
            const request = store.get(id);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Get a document by content hash
     */
    async function getDocumentByHash(hash) {
        const database = await open();

        return new Promise((resolve, reject) => {
            const transaction = database.transaction([STORE_DOCUMENTS], 'readonly');
            const store = transaction.objectStore(STORE_DOCUMENTS);
            const index = store.index('hash');
            const request = index.get(hash);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Get recent documents
     */
    async function getRecentDocuments(limit = 10) {
        const database = await open();

        return new Promise((resolve, reject) => {
            const transaction = database.transaction([STORE_DOCUMENTS], 'readonly');
            const store = transaction.objectStore(STORE_DOCUMENTS);
            const index = store.index('date');
            const request = index.openCursor(null, 'prev');

            const results = [];
            request.onsuccess = (event) => {
                const cursor = event.target.result;
                if (cursor && results.length < limit) {
                    results.push({
                        id: cursor.value.id,
                        fileName: cursor.value.fileName,
                        date: cursor.value.date,
                        wordCount: cursor.value.wordCount
                    });
                    cursor.continue();
                } else {
                    resolve(results);
                }
            };

            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Delete a document
     */
    async function deleteDocument(id) {
        const database = await open();

        return new Promise((resolve, reject) => {
            const transaction = database.transaction([STORE_DOCUMENTS], 'readwrite');
            const store = transaction.objectStore(STORE_DOCUMENTS);
            const request = store.delete(id);

            request.onsuccess = () => resolve(true);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Clear old documents (keep most recent N)
     */
    async function pruneDocuments(keepCount = 20) {
        const database = await open();

        return new Promise((resolve, reject) => {
            const transaction = database.transaction([STORE_DOCUMENTS], 'readwrite');
            const store = transaction.objectStore(STORE_DOCUMENTS);
            const index = store.index('date');
            const request = index.openCursor(null, 'prev');

            let count = 0;
            const toDelete = [];

            request.onsuccess = (event) => {
                const cursor = event.target.result;
                if (cursor) {
                    count++;
                    if (count > keepCount) {
                        toDelete.push(cursor.value.id);
                    }
                    cursor.continue();
                } else {
                    // Delete old documents
                    Promise.all(toDelete.map(id => {
                        return new Promise((res) => {
                            const delReq = store.delete(id);
                            delReq.onsuccess = () => res();
                            delReq.onerror = () => res();
                        });
                    })).then(() => resolve(toDelete.length));
                }
            };

            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Save a setting
     */
    async function saveSetting(key, value) {
        const database = await open();

        return new Promise((resolve, reject) => {
            const transaction = database.transaction([STORE_SETTINGS], 'readwrite');
            const store = transaction.objectStore(STORE_SETTINGS);
            const request = store.put({ key, value });

            request.onsuccess = () => resolve(true);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Get a setting
     */
    async function getSetting(key, defaultValue = null) {
        const database = await open();

        return new Promise((resolve, reject) => {
            const transaction = database.transaction([STORE_SETTINGS], 'readonly');
            const store = transaction.objectStore(STORE_SETTINGS);
            const request = store.get(key);

            request.onsuccess = () => {
                resolve(request.result?.value ?? defaultValue);
            };
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Get database storage estimate
     */
    async function getStorageEstimate() {
        if (navigator.storage && navigator.storage.estimate) {
            const estimate = await navigator.storage.estimate();
            return {
                usage: estimate.usage || 0,
                quota: estimate.quota || 0,
                usagePercent: estimate.quota ? ((estimate.usage / estimate.quota) * 100).toFixed(2) : 0
            };
        }
        return null;
    }

    // Public API
    return {
        open,
        saveDocument,
        getDocument,
        getDocumentByHash,
        getRecentDocuments,
        deleteDocument,
        pruneDocuments,
        saveSetting,
        getSetting,
        getStorageEstimate,
        hashContent
    };

})();
