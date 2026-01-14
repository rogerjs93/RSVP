/**
 * FastReader - PDF Loader Module
 * Handles PDF text extraction with background loading
 * 
 * Uses PDF.js (Mozilla, Apache 2.0 License)
 * 100% Open Source - MIT License
 */

class PdfLoader {
    constructor(file, options = {}) {
        this.file = file;
        this.fileName = file.name;
        this.options = options;

        // PDF.js document
        this.pdfDoc = null;
        this.totalPages = 0;

        // Page management
        this.loadedPages = new Map(); // pageNum -> { text, words, loadTime }
        this.loadingPages = new Set();
        this.pageWordRanges = []; // [{ start, end }] for each page
        this.nextPageToLoad = 1;
        this.isBackgroundLoading = false;
        this.allPagesLoaded = false;

        // Aggregated content
        this.allText = '';
        this.allWords = [];
        this.estimatedTotalWords = 0;

        // Callbacks
        this.onPageLoaded = options.onPageLoaded || (() => {});
        this.onProgress = options.onProgress || (() => {});
        this.onWordsUpdated = options.onWordsUpdated || (() => {});
        this.onAllPagesLoaded = options.onAllPagesLoaded || (() => {});
        this.onError = options.onError || console.error;
        this.onReady = options.onReady || (() => {});

        // Waiting promises
        this.contentWaiters = [];
    }

    /**
     * Initialize PDF.js and load document metadata
     */
    async init() {
        try {
            // Check if PDF.js is available
            if (typeof pdfjsLib === 'undefined') {
                throw new Error('PDF.js library not loaded');
            }

            // Set worker path (self-hosted)
            pdfjsLib.GlobalWorkerOptions.workerSrc = 'lib/pdf.worker.min.js';

            // Read file as ArrayBuffer
            const arrayBuffer = await this.file.arrayBuffer();

            // Load PDF document
            const loadingTask = pdfjsLib.getDocument({
                data: arrayBuffer,
                cMapUrl: 'https://unpkg.com/pdfjs-dist@3.11.174/cmaps/',
                cMapPacked: true
            });

            this.pdfDoc = await loadingTask.promise;
            this.totalPages = this.pdfDoc.numPages;

            // Estimate total words (rough: ~250 words per page average)
            this.estimatedTotalWords = this.totalPages * 250;

            return this.pdfDoc;
        } catch (error) {
            this.onError(error);
            throw error;
        }
    }

    /**
     * Load initial pages for fast startup
     */
    async loadInitialPages(count = 3) {
        const pagesToLoad = Math.min(count, this.totalPages);
        for (let i = 1; i <= pagesToLoad; i++) {
            await this.loadPage(i);
        }
        this.nextPageToLoad = pagesToLoad + 1;
        return this.allWords;
    }

    /**
     * Start background loading of remaining pages
     */
    startBackgroundLoading() {
        if (this.isBackgroundLoading || this.allPagesLoaded) return;
        this.isBackgroundLoading = true;
        this._loadNextPageInBackground();
    }

    /**
     * Load next page in background with delay
     */
    async _loadNextPageInBackground() {
        if (!this.isBackgroundLoading) return;

        if (this.nextPageToLoad > this.totalPages) {
            this.isBackgroundLoading = false;
            this.allPagesLoaded = true;
            this.onAllPagesLoaded();
            return;
        }

        try {
            await this.loadPage(this.nextPageToLoad);
            this.nextPageToLoad++;

            // Small delay to avoid blocking UI
            setTimeout(() => this._loadNextPageInBackground(), 50);
        } catch (error) {
            console.error('Background page load error:', error);
            // Continue with next page
            this.nextPageToLoad++;
            setTimeout(() => this._loadNextPageInBackground(), 100);
        }
    }

    /**
     * Load a specific page and extract text
     */
    async loadPage(pageNum) {
        if (pageNum < 1 || pageNum > this.totalPages) {
            return null;
        }

        // Already loaded
        if (this.loadedPages.has(pageNum)) {
            return this.loadedPages.get(pageNum).text;
        }

        // Currently loading
        if (this.loadingPages.has(pageNum)) {
            return new Promise((resolve) => {
                const checkInterval = setInterval(() => {
                    if (this.loadedPages.has(pageNum)) {
                        clearInterval(checkInterval);
                        resolve(this.loadedPages.get(pageNum).text);
                    }
                }, 50);
            });
        }

        this.loadingPages.add(pageNum);
        const loadStart = performance.now();

        try {
            const page = await this.pdfDoc.getPage(pageNum);
            const textContent = await page.getTextContent();

            // Extract text with proper spacing
            let pageText = '';
            let lastY = null;
            let lastX = null;

            for (const item of textContent.items) {
                if (item.str) {
                    // Detect line breaks
                    if (lastY !== null) {
                        const yDiff = Math.abs(item.transform[5] - lastY);
                        if (yDiff > 5) {
                            // New line
                            pageText += '\n';
                        } else if (lastX !== null) {
                            // Same line, check for word spacing
                            const xGap = item.transform[4] - lastX;
                            if (xGap > 10) {
                                pageText += ' ';
                            }
                        }
                    }

                    pageText += item.str;
                    lastY = item.transform[5];
                    lastX = item.transform[4] + item.width;
                }
            }

            // Tokenize page
            const pageWords = this.tokenizePage(pageText);
            const loadTime = performance.now() - loadStart;

            // Store page data
            this.loadedPages.set(pageNum, {
                text: pageText,
                words: pageWords,
                loadTime
            });

            this.loadingPages.delete(pageNum);

            // Rebuild aggregated content
            this.rebuildAggregatedContent();

            // Notify
            this.onPageLoaded(pageNum, pageText, this.totalPages);

            // Resolve any waiters
            this.resolveWaiters();

            return pageText;
        } catch (error) {
            this.loadingPages.delete(pageNum);
            this.onError(error);
            throw error;
        }
    }

    /**
     * Tokenize page text into word tokens
     */
    tokenizePage(text) {
        const normalized = text
            .replace(/\r\n/g, '\n')
            .replace(/\r/g, '\n')
            .replace(/\n{2,}/g, '\n\n');

        const paragraphs = normalized.split(/\n\n+/);
        const output = [];

        for (let p = 0; p < paragraphs.length; p++) {
            const para = paragraphs[p].trim();
            if (!para) continue;

            const re = /https?:\/\/[^\s]+|www\.[^\s]+|[\p{L}\p{N}]+(?:[''][\p{L}\p{N}]+)*(?:\.[\p{L}\p{N}]+)*|[^\p{L}\p{N}\s]+/gu;
            const tokens = para.match(re) || [];

            for (let i = 0; i < tokens.length; i++) {
                const t = tokens[i];
                const isWordLike = /^[\p{L}\p{N}]/u.test(t) || 
                                   /^https?:\/\//i.test(t) || 
                                   /^www\./i.test(t);

                if (isWordLike) {
                    output.push({ word: t, isParagraphEnd: false });
                } else if (output.length > 0) {
                    output[output.length - 1].word += t;
                }
            }

            if (output.length > 0 && p < paragraphs.length - 1) {
                output[output.length - 1].isParagraphEnd = true;
            }
        }

        return output;
    }

    /**
     * Rebuild aggregated content from loaded pages
     */
    rebuildAggregatedContent() {
        const sortedPages = Array.from(this.loadedPages.keys()).sort((a, b) => a - b);
        
        this.allText = '';
        this.allWords = [];
        this.pageWordRanges = [];

        for (const pageNum of sortedPages) {
            const pageData = this.loadedPages.get(pageNum);
            const startIdx = this.allWords.length;

            this.allText += pageData.text + '\n\n';
            this.allWords.push(...pageData.words);

            this.pageWordRanges[pageNum - 1] = {
                start: startIdx,
                end: this.allWords.length - 1
            };
        }

        // Update estimated total based on average words per page
        if (sortedPages.length > 0) {
            const avgWordsPerPage = this.allWords.length / sortedPages.length;
            this.estimatedTotalWords = Math.ceil(avgWordsPerPage * this.totalPages);
        }

        // Notify about updated words
        this.onWordsUpdated(this.allWords, this.estimatedTotalWords);
    }

    /**
     * Check if more content is needed
     */
    needsMoreContent(currentWordIndex) {
        const hasMorePages = this.loadedPages.size < this.totalPages;
        const nearEnd = currentWordIndex >= this.allWords.length - 10;
        return hasMorePages && nearEnd;
    }

    /**
     * Wait for content to be available
     */
    waitForContent() {
        return new Promise((resolve) => {
            if (this.loadingPages.size > 0 || this.isBackgroundLoading) {
                this.contentWaiters.push(resolve);
            } else {
                resolve();
            }
        });
    }

    /**
     * Resolve content waiters
     */
    resolveWaiters() {
        while (this.contentWaiters.length > 0) {
            const waiter = this.contentWaiters.shift();
            waiter();
        }
    }

    /**
     * Get all loaded words
     */
    getAllWords() {
        return this.allWords;
    }

    /**
     * Get all loaded text
     */
    getAllText() {
        return this.allText;
    }

    /**
     * Cache PDF content for offline use
     */
    async cacheForOffline() {
        if (typeof FastReaderDB === 'undefined') return;

        try {
            // Wait for all pages to load first
            if (!this.allPagesLoaded) {
                await new Promise((resolve) => {
                    const originalCallback = this.onAllPagesLoaded;
                    this.onAllPagesLoaded = () => {
                        originalCallback();
                        resolve();
                    };
                });
            }

            // Save to IndexedDB
            await FastReaderDB.saveDocument(this.fileName, this.allText, {
                totalPages: this.totalPages,
                wordCount: this.allWords.length
            });

            // Prune old documents
            await FastReaderDB.pruneDocuments(20);
        } catch (error) {
            console.warn('Failed to cache PDF:', error);
        }
    }

    /**
     * Check if a file was previously cached
     */
    static async checkCache(file) {
        if (typeof FastReaderDB === 'undefined') return null;

        try {
            const content = await file.text();
            const hash = await FastReaderDB.hashContent(content);
            return await FastReaderDB.getDocumentByHash(hash);
        } catch (error) {
            return null;
        }
    }
}

// Export for use
window.PdfLoader = PdfLoader;// Export for use
window.PdfLoader = PdfLoader;
