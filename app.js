/**
 * FastReader - RSVP Speed Reading App
 * Main Application Module
 * 
 * 100% Open Source - MIT License
 */

(() => {
    'use strict';

    // ============================================
    // Constants & Configuration
    // ============================================

    const STORAGE_KEYS = {
        theme: 'fastreader.theme',
        wpm: 'fastreader.wpm',
        profile: 'fastreader.profile',
        loop: 'fastreader.loop',
        font: 'fastreader.font',
        lastText: 'fastreader.lastText',
        highlightMode: 'fastreader.highlightMode',
        firstVisit: 'fastreader.firstVisit'
    };

    // Highlight Modes for different reading strategies
    const HIGHLIGHT_MODES = {
        classic: {
            name: 'Classic (ORP)',
            description: 'Original center-focused highlighting at the Optimal Recognition Point',
            icon: '◉',
            bestFor: 'General reading, fiction, news articles',
            pros: ['Minimizes eye movement', 'Fast word recognition', 'Industry standard (Spritz-style)'],
            cons: ['Less effective for long/compound words', 'Can cause tunnel vision fatigue']
        },
        startEnd: {
            name: 'Start-End Anchoring',
            description: 'Highlights first (blue) and last (green) letters for word shape recognition',
            icon: '⟨⟩',
            bestFor: 'Technical documentation, compound words, accessibility',
            pros: ['Matches natural lexical access patterns', 'Better for morphologically complex words', 'Dyslexia-friendly'],
            cons: ['Slightly slower initial adaptation', 'Less effective for very short words']
        },
        adaptive: {
            name: 'Adaptive Focus',
            description: 'Dynamically shifts highlight based on word length and structure',
            icon: '↔',
            bestFor: 'Mixed content with varied vocabulary',
            pros: ['Reduces monotony', 'Matches natural eye landing patterns', 'Best of both worlds'],
            cons: ['Can feel inconsistent initially', 'Requires brief adjustment period']
        },
        syllable: {
            name: 'Syllable Rhythm',
            description: 'Alternates colors by syllables for phonetic chunking',
            icon: '∿',
            bestFor: 'Language learning, scientific terms, unfamiliar vocabulary',
            pros: ['Mirrors phonological decoding', 'Helps with pronunciation', 'Great for new terminology'],
            cons: ['Slower for expert readers', 'May not match exact syllable breaks']
        },
        morpheme: {
            name: 'Morpheme Structure',
            description: 'Colors prefix (blue), root (white), and suffix (green) differently',
            icon: '⧈',
            bestFor: 'Academic papers, medical/legal text, STEM content',
            pros: ['Reveals word meaning structure', 'Reduces cognitive load for complex terms', 'Aids comprehension'],
            cons: ['Pattern-based detection not always accurate', 'Overkill for simple text']
        },
        minimal: {
            name: 'Minimal',
            description: 'Clean single-color display without highlighting',
            icon: '○',
            bestFor: 'Experienced speed readers, reducing visual noise',
            pros: ['No distractions', 'Pure RSVP experience', 'Maximum speed potential'],
            cons: ['No focal guidance', 'Higher cognitive load', 'Not for beginners']
        }
    };

    // Common prefixes and suffixes for morpheme detection
    const PREFIXES = ['anti', 'auto', 'bio', 'contra', 'counter', 'de', 'dis', 'down', 'extra',
                      'hyper', 'in', 'im', 'il', 'ir', 'inter', 'intra', 'macro', 'micro', 'mid',
                      'mis', 'mono', 'multi', 'non', 'out', 'over', 'post', 'pre', 'pro', 're',
                      'semi', 'sub', 'super', 'tele', 'trans', 'tri', 'ultra', 'un', 'under', 'up'];

    const SUFFIXES = ['able', 'ible', 'al', 'ial', 'an', 'ian', 'ance', 'ence', 'ant', 'ent',
                      'ary', 'ery', 'ory', 'ate', 'ed', 'en', 'er', 'or', 'ar', 'est', 'ful',
                      'ic', 'ical', 'ile', 'ing', 'ion', 'tion', 'ation', 'ition', 'ious', 'ous',
                      'ish', 'ism', 'ist', 'ity', 'ty', 'ive', 'ative', 'itive', 'less', 'ly',
                      'ment', 'ness', 'ship', 'ward', 'wards', 'wise', 'ize', 'ise', 'fy'];

    // Highlight colors
    const HIGHLIGHT_COLORS = {
        accent: '#e94560',      // Red - primary focal point
        start: '#4dabf7',       // Blue - word start / prefix
        end: '#51cf66',         // Green - word end / suffix
        syllableA: '#e94560',   // Red - odd syllables
        syllableB: '#4dabf7',   // Blue - even syllables
        root: '#ffffff'         // White - root/default
    };

    const FONT_STACKS = {
        'system': 'system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif',
        'Arial': 'Arial, Helvetica, sans-serif',
        'Verdana': 'Verdana, Geneva, sans-serif',
        'Georgia': 'Georgia, "Times New Roman", serif',
        'Times New Roman': '"Times New Roman", Times, serif',
        'Trebuchet MS': '"Trebuchet MS", Helvetica, sans-serif',
        'Tahoma': 'Tahoma, Geneva, sans-serif',
        'Courier New': '"Courier New", Courier, monospace',
        'OpenDyslexic': '"OpenDyslexic", system-ui, Arial, sans-serif'
    };

    // Pause Profiles: multipliers for different punctuation/word types
    const PAUSE_PROFILES = {
        relaxed: {
            name: 'Relaxed',
            sentence: 4.0,      // . ! ?
            comma: 2.0,         // , ; :
            paragraph: 4.0,     // Double line breaks
            longWord: 1.5,      // Words > 8 chars
            number: 2.0,        // Numeric content
            minSentenceMs: 400,
            minCommaMs: 200
        },
        normal: {
            name: 'Normal',
            sentence: 3.0,
            comma: 1.5,
            paragraph: 3.0,
            longWord: 1.3,
            number: 1.5,
            minSentenceMs: 300,
            minCommaMs: 150
        },
        speed: {
            name: 'Speed',
            sentence: 1.5,
            comma: 1.2,
            paragraph: 1.5,
            longWord: 1.1,
            number: 1.2,
            minSentenceMs: 150,
            minCommaMs: 80
        }
    };

    const DEFAULT_TEXT = `Welcome to FastReader! This is a speed reading application using RSVP (Rapid Serial Visual Presentation) technique.

The red letter in the center of each word is the focal point. Keep your eyes fixed there and let the words come to you.

You can adjust the reading speed using the WPM slider below. Try starting at 300 WPM and gradually increase as you get comfortable.

Click "Set Text" to paste your own content or upload a PDF or text file. Happy reading!`;

    // ============================================
    // State
    // ============================================

    let inputText = '';
    let words = [];
    let index = 0;
    let currentWord = ' ';
    let totalWords = 0;
    let isPlaying = false;
    let timerId = null;

    // Settings
    let theme = loadStr(STORAGE_KEYS.theme, 'dark');
    let wpm = loadNum(STORAGE_KEYS.wpm, 300);
    let profileKey = loadStr(STORAGE_KEYS.profile, 'normal');
    let loopEnabled = loadBool(STORAGE_KEYS.loop, false);
    let fontChoice = loadStr(STORAGE_KEYS.font, 'system');
    let highlightMode = loadStr(STORAGE_KEYS.highlightMode, 'classic');
    let isFirstVisit = !localStorage.getItem(STORAGE_KEYS.firstVisit);

    // PDF state
    let isPdfMode = false;
    let pdfLoader = null;

    // Canvas
    const canvas = document.getElementById('stage');
    const ctx = canvas.getContext('2d');
    const fontWeight = 700;
    let fontSizePx = 64;

    // ============================================
    // DOM Elements
    // ============================================

    const elements = {
        // Controls
        playBtn: document.getElementById('playBtn'),
        playIcon: document.getElementById('playIcon'),
        pauseIcon: document.getElementById('pauseIcon'),
        resetBtn: document.getElementById('resetBtn'),
        backBtn: document.getElementById('backBtn'),
        fwdBtn: document.getElementById('fwdBtn'),
        textBtn: document.getElementById('textBtn'),
        themeBtn: document.getElementById('themeBtn'),
        sunIcon: document.getElementById('sunIcon'),
        moonIcon: document.getElementById('moonIcon'),
        loopToggleBtn: document.getElementById('loopToggleBtn'),
        settingsToggle: document.getElementById('settingsToggle'),
        settingsPanel: document.getElementById('settingsPanel'),

        // Inputs
        wpmLabel: document.getElementById('wpmLabel'),
        wpmValue: document.getElementById('wpmValue'),
        wpmInput: document.getElementById('wpmInput'),
        wpmRange: document.getElementById('wpmRange'),
        profileSelect: document.getElementById('profileSelect'),
        fontSelect: document.getElementById('fontSelect'),

        // Progress
        progressText: document.getElementById('progressText'),
        progressFill: document.getElementById('progressFill'),

        // Modal
        modalBackdrop: document.getElementById('modalBackdrop'),
        textArea: document.getElementById('textArea'),
        fileInput: document.getElementById('fileInput'),
        cancelModalBtn: document.getElementById('cancelModalBtn'),
        applyModalBtn: document.getElementById('applyModalBtn'),
        closeModalBtn: document.getElementById('closeModalBtn'),
        pdfStatus: document.getElementById('pdfStatus'),
        pdfStatusText: document.getElementById('pdfStatusText'),
        recentPdfs: document.getElementById('recentPdfs'),
        recentList: document.getElementById('recentList'),

        // Loading
        loadingOverlay: document.getElementById('loadingOverlay'),
        offlineBanner: document.getElementById('offlineBanner')
    };

    // ============================================
    // Highlight Mode Helpers
    // ============================================

    /**
     * Simple vowel-based syllable detection
     * Returns array of { start, end } indices for each syllable
     */
    function detectSyllables(word) {
        const cleanWord = word.replace(/[^\p{L}]/gu, '').toLowerCase();
        if (cleanWord.length <= 2) return [{ start: 0, end: word.length }];

        const vowels = 'aeiouyàáâãäåèéêëìíîïòóôõöùúûüœæ';
        const syllables = [];
        let syllableStart = 0;
        let inVowelGroup = false;
        let vowelCount = 0;

        for (let i = 0; i < cleanWord.length; i++) {
            const isVowel = vowels.includes(cleanWord[i]);

            if (isVowel && !inVowelGroup) {
                inVowelGroup = true;
                vowelCount++;
                // Start new syllable before this vowel (except first)
                if (vowelCount > 1 && i > 0) {
                    // Split at consonant before vowel
                    const splitPoint = Math.max(syllableStart + 1, i - 1);
                    syllables.push({ start: syllableStart, end: splitPoint });
                    syllableStart = splitPoint;
                }
            } else if (!isVowel) {
                inVowelGroup = false;
            }
        }

        // Add final syllable
        syllables.push({ start: syllableStart, end: word.length });

        // If only one vowel found, return whole word
        if (syllables.length === 0 || vowelCount <= 1) {
            return [{ start: 0, end: word.length }];
        }

        return syllables;
    }

    /**
     * Pattern-based morpheme detection
     * Returns { prefix, root, suffix } with start/end indices
     */
    function detectMorphemes(word) {
        const cleanWord = word.replace(/[^\p{L}]/gu, '').toLowerCase();
        const originalLength = word.length;
        const punctuationAtEnd = word.length - cleanWord.length;

        let prefixEnd = 0;
        let suffixStart = cleanWord.length;

        // Detect prefix (check longest matches first)
        const sortedPrefixes = [...PREFIXES].sort((a, b) => b.length - a.length);
        for (const prefix of sortedPrefixes) {
            if (cleanWord.startsWith(prefix) && cleanWord.length > prefix.length + 2) {
                prefixEnd = prefix.length;
                break;
            }
        }

        // Detect suffix (check longest matches first)
        const sortedSuffixes = [...SUFFIXES].sort((a, b) => b.length - a.length);
        for (const suffix of sortedSuffixes) {
            if (cleanWord.endsWith(suffix) && cleanWord.length > suffix.length + prefixEnd + 1) {
                suffixStart = cleanWord.length - suffix.length;
                break;
            }
        }

        // Ensure root has at least 2 characters
        if (suffixStart - prefixEnd < 2) {
            // Reset to no morpheme detection
            return {
                prefix: { start: 0, end: 0 },
                root: { start: 0, end: originalLength },
                suffix: { start: originalLength, end: originalLength }
            };
        }

        return {
            prefix: { start: 0, end: prefixEnd },
            root: { start: prefixEnd, end: suffixStart },
            suffix: { start: suffixStart, end: originalLength }
        };
    }

    /**
     * Get adaptive focus index based on word characteristics
     */
    function getAdaptiveFocusIndex(word) {
        const cleanWord = word.replace(/[^\p{L}\p{N}]/gu, '');
        const len = cleanWord.length;

        if (len <= 3) return Math.floor(len / 2);
        if (len <= 5) return Math.floor(len * 0.35);
        if (len <= 8) return Math.floor(len * 0.3);

        // For long words, check if suffix-heavy
        const lowerWord = cleanWord.toLowerCase();
        for (const suffix of SUFFIXES) {
            if (lowerWord.endsWith(suffix) && suffix.length >= 3) {
                // Focus on root area (before suffix)
                return Math.floor((len - suffix.length) * 0.4);
            }
        }

        // Default to first third for long words
        return Math.floor(len * 0.3);
    }

    /**
     * Get character colors for current highlight mode
     */
    function getCharacterColors(word, chars) {
        const len = chars.length;
        const colors = new Array(len).fill(theme === 'dark' ? '#ffffff' : '#1a1a2e');
        const baseColor = colors[0];

        switch (highlightMode) {
            case 'classic': {
                const mid = middleIndex(word);
                if (mid < len) colors[mid] = HIGHLIGHT_COLORS.accent;
                break;
            }

            case 'startEnd': {
                // Find first and last letter positions (skip punctuation)
                let firstLetter = -1, lastLetter = -1;
                for (let i = 0; i < len; i++) {
                    if (/[\p{L}\p{N}]/u.test(chars[i])) {
                        if (firstLetter === -1) firstLetter = i;
                        lastLetter = i;
                    }
                }
                if (firstLetter !== -1) colors[firstLetter] = HIGHLIGHT_COLORS.start;
                if (lastLetter !== -1 && lastLetter !== firstLetter) colors[lastLetter] = HIGHLIGHT_COLORS.end;
                break;
            }

            case 'adaptive': {
                const focusIdx = getAdaptiveFocusIndex(word);
                if (focusIdx < len) colors[focusIdx] = HIGHLIGHT_COLORS.accent;
                // Also subtle highlight on word boundaries for long words
                if (len > 6) {
                    let firstLetter = -1, lastLetter = -1;
                    for (let i = 0; i < len; i++) {
                        if (/[\p{L}\p{N}]/u.test(chars[i])) {
                            if (firstLetter === -1) firstLetter = i;
                            lastLetter = i;
                        }
                    }
                    // Use dimmer versions
                    if (firstLetter !== -1 && firstLetter !== focusIdx)
                        colors[firstLetter] = theme === 'dark' ? '#7fb3d5' : '#2980b9';
                    if (lastLetter !== -1 && lastLetter !== focusIdx && lastLetter !== firstLetter)
                        colors[lastLetter] = theme === 'dark' ? '#82e0aa' : '#27ae60';
                }
                break;
            }

            case 'syllable': {
                const syllables = detectSyllables(word);
                syllables.forEach((syl, idx) => {
                    const color = idx % 2 === 0 ? HIGHLIGHT_COLORS.syllableA : HIGHLIGHT_COLORS.syllableB;
                    for (let i = syl.start; i < Math.min(syl.end, len); i++) {
                        colors[i] = color;
                    }
                });
                break;
            }

            case 'morpheme': {
                const morphemes = detectMorphemes(word);
                // Prefix in blue
                for (let i = morphemes.prefix.start; i < Math.min(morphemes.prefix.end, len); i++) {
                    colors[i] = HIGHLIGHT_COLORS.start;
                }
                // Root stays base color (or slightly emphasized)
                for (let i = morphemes.root.start; i < Math.min(morphemes.root.end, len); i++) {
                    colors[i] = baseColor;
                }
                // Suffix in green
                for (let i = morphemes.suffix.start; i < Math.min(morphemes.suffix.end, len); i++) {
                    colors[i] = HIGHLIGHT_COLORS.end;
                }
                break;
            }

            case 'minimal':
            default:
                // All same color, already set
                break;
        }

        return colors;
    }

    // ============================================
    // Storage Helpers
    // ============================================

    function loadBool(key, fallback) {
        const v = localStorage.getItem(key);
        if (v === null) return fallback;
        return v === 'true';
    }

    function loadNum(key, fallback) {
        const v = Number(localStorage.getItem(key));
        return Number.isFinite(v) && v > 0 ? v : fallback;
    }

    function loadStr(key, fallback) {
        return localStorage.getItem(key) ?? fallback;
    }

    function saveStr(key, value) {
        try {
            localStorage.setItem(key, value);
        } catch (e) {
            console.warn('Failed to save to localStorage:', e);
        }
    }

    // ============================================
    // Tokenizer
    // ============================================

    /**
     * Tokenize text into words with attached punctuation
     * Handles Unicode, URLs, contractions, and preserves paragraph markers
     */
    function tokenize(text) {
        // Normalize line endings and mark paragraphs
        const normalized = text
            .replace(/\r\n/g, '\n')
            .replace(/\r/g, '\n')
            .replace(/\n{2,}/g, '\n\n'); // Normalize multiple newlines to double

        // Split into paragraphs
        const paragraphs = normalized.split(/\n\n+/);
        const output = [];

        for (let p = 0; p < paragraphs.length; p++) {
            const para = paragraphs[p].trim();
            if (!para) continue;

            // Regex to match words, URLs, numbers, and punctuation
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
                    // Attach punctuation to previous word
                    output[output.length - 1].word += t;
                }
            }

            // Mark last word of paragraph (except last paragraph)
            if (output.length > 0 && p < paragraphs.length - 1) {
                output[output.length - 1].isParagraphEnd = true;
            }
        }

        return output.length > 0 ? output : [{ word: ' ', isParagraphEnd: false }];
    }

    // ============================================
    // RSVP Core
    // ============================================

    function getActiveProfile() {
        return PAUSE_PROFILES[profileKey] || PAUSE_PROFILES.normal;
    }

    function middleIndex(s) {
        // Optimal Recognition Point: slightly left of center
        const len = s.length;
        if (len <= 1) return 0;
        if (len <= 3) return Math.floor(len / 2);
        // For longer words, position at roughly 35-40% from start
        return Math.floor(len * 0.35);
    }

    function baseIntervalMs() {
        if (wpm <= 0) return null;
        return Math.max(1, Math.floor(60000 / wpm));
    }

    function dwellMsForToken(token) {
        const base = baseIntervalMs();
        if (base === null) return null;

        const profile = getActiveProfile();
        const word = token.word;
        let multiplier = 1.0;

        // Sentence ending
        if (/[.!?]$/.test(word)) {
            multiplier = Math.max(multiplier, profile.sentence);
        }
        // Comma, semicolon, colon
        else if (/[,;:]$/.test(word)) {
            multiplier = Math.max(multiplier, profile.comma);
        }

        // Long words (> 8 characters, excluding punctuation)
        const cleanWord = word.replace(/[^\p{L}\p{N}]/gu, '');
        if (cleanWord.length > 8) {
            multiplier = Math.max(multiplier, profile.longWord);
        }

        // Numbers
        if (/\d/.test(word)) {
            multiplier = Math.max(multiplier, profile.number);
        }

        // Paragraph end
        if (token.isParagraphEnd) {
            multiplier = Math.max(multiplier, profile.paragraph);
        }

        let dwell = Math.floor(base * multiplier);

        // Apply minimum times for readability
        if (/[.!?]$/.test(word)) {
            dwell = Math.max(dwell, profile.minSentenceMs);
        } else if (/[,;:]$/.test(word)) {
            dwell = Math.max(dwell, profile.minCommaMs);
        }

        return dwell;
    }

    function stopLoop() {
        if (timerId) {
            clearTimeout(timerId);
            timerId = null;
        }
    }

    function scheduleNext() {
        if (!isPlaying) return;

        // Check if we need more content from PDF
        if (isPdfMode && pdfLoader) {
            const needsMore = pdfLoader.needsMoreContent(index);
            if (needsMore && index >= words.length - 1) {
                // Need to wait for more content
                showLoadingOverlay(true);
                pdfLoader.waitForContent().then(() => {
                    showLoadingOverlay(false);
                    words = pdfLoader.getAllWords();
                    totalWords = pdfLoader.estimatedTotalWords;
                    if (isPlaying) scheduleNext();
                });
                return;
            }
        }

        // Stop at end if not looping
        if (!loopEnabled && index >= words.length - 1) {
            setPlaying(false);
            return;
        }

        const token = words[index];
        const ms = dwellMsForToken(token);
        if (ms === null) return;

        timerId = setTimeout(() => {
            if (!isPlaying) return;

            if (index < words.length - 1) {
                advanceTo(index + 1);
            } else if (loopEnabled) {
                advanceTo(0);
            } else {
                setPlaying(false);
                return;
            }

            scheduleNext();
        }, ms);
    }

    function restartIfPlaying() {
        if (!isPlaying) return;
        stopLoop();
        scheduleNext();
    }

    function setPlaying(v) {
        isPlaying = v;
        updatePlayButton();
        stopLoop();
        if (v && wpm > 0) {
            scheduleNext();
        }
        updateNavButtons();
    }

    function advanceTo(newIndex) {
        index = Math.max(0, Math.min(words.length - 1, newIndex));
        currentWord = words[index]?.word || ' ';
        draw();
        updateProgress();
        updateNavButtons();
    }

    function resetToStart() {
        advanceTo(0);
        restartIfPlaying();
    }

    // ============================================
    // Canvas Rendering
    // ============================================

    function getActiveFontFamily() {
        return FONT_STACKS[fontChoice] || FONT_STACKS['system'];
    }

    function computeFontSize() {
        const minDim = Math.min(window.innerWidth, window.innerHeight);
        fontSizePx = Math.max(28, Math.min(96, Math.floor(minDim * 0.14)));
    }

    function verticalOffset() {
        // Shift up on mobile to account for controls
        if (window.innerWidth <= 520) {
            return -Math.min(80, window.innerHeight * 0.12);
        }
        return -20;
    }

    function resize() {
        const dpr = window.devicePixelRatio || 1;
        canvas.width = window.innerWidth * dpr;
        canvas.height = window.innerHeight * dpr;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        computeFontSize();
        draw();
    }

    function draw() {
        const width = window.innerWidth;
        const height = window.innerHeight;

        // Background
        ctx.fillStyle = theme === 'dark' ? '#0f0f1a' : '#f5f5f8';
        ctx.fillRect(0, 0, width, height);

        // Set font
        ctx.font = `${fontWeight} ${fontSizePx}px ${getActiveFontFamily()}`;
        ctx.textBaseline = 'middle';

        // Calculate character positions for focal point alignment
        const chars = [...currentWord];
        const mid = middleIndex(currentWord);
        const widths = chars.map(c => ctx.measureText(c).width);
        
        // Calculate starting X so middle char is centered
        const beforeWidth = widths.slice(0, mid).reduce((a, b) => a + b, 0);
        const midCharHalfWidth = (widths[mid] || 0) / 2;
        const startX = (width / 2) - beforeWidth - midCharHalfWidth;
        
        const centerY = (height / 2) + verticalOffset();

        // Draw focal point marker (subtle line)
        ctx.strokeStyle = theme === 'dark' ? '#303050' : '#d0d0e0';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(width / 2, centerY - fontSizePx * 0.7);
        ctx.lineTo(width / 2, centerY - fontSizePx * 0.5);
        ctx.moveTo(width / 2, centerY + fontSizePx * 0.5);
        ctx.lineTo(width / 2, centerY + fontSizePx * 0.7);
        ctx.stroke();

        // Get character colors based on highlight mode
        const charColors = getCharacterColors(currentWord, chars);

        // Draw each character
        let x = startX;
        chars.forEach((char, i) => {
            ctx.fillStyle = charColors[i];
            ctx.fillText(char, x, centerY);
            x += widths[i];
        });
    }

    // ============================================
    // UI Updates
    // ============================================

    function updatePlayButton() {
        elements.playIcon.classList.toggle('hidden', isPlaying);
        elements.pauseIcon.classList.toggle('hidden', !isPlaying);
    }

    function updateNavButtons() {
        elements.backBtn.disabled = isPlaying || index <= 0;
        elements.fwdBtn.disabled = isPlaying || index >= words.length - 1;
    }

    function updateProgress() {
        const current = index + 1;
        const total = totalWords || words.length;
        elements.progressText.textContent = `Word ${current} of ${total}`;
        
        const percent = total > 0 ? (current / total) * 100 : 0;
        elements.progressFill.style.width = `${percent}%`;
    }

    function updateThemeUI() {
        document.body.dataset.theme = theme;
        elements.sunIcon.classList.toggle('hidden', theme === 'light');
        elements.moonIcon.classList.toggle('hidden', theme === 'dark');
    }

    function updateLoopUI() {
        elements.loopToggleBtn.classList.toggle('active', loopEnabled);
    }

    function applyWpm(v) {
        wpm = Math.max(50, Math.min(1500, v));
        elements.wpmValue.textContent = wpm;
        elements.wpmRange.value = wpm;
        elements.wpmInput.value = wpm;
        saveStr(STORAGE_KEYS.wpm, String(wpm));
        restartIfPlaying();
    }

    function showLoadingOverlay(show) {
        elements.loadingOverlay.classList.toggle('hidden', !show);
        if (show && isPlaying) {
            stopLoop();
        }
    }

    // ============================================
    // WPM Editing
    // ============================================

    function startEditingWpm() {
        elements.wpmInput.value = String(wpm);
        elements.wpmLabel.classList.add('hidden');
        elements.wpmInput.classList.remove('hidden');
        elements.wpmInput.focus();
        elements.wpmInput.select();
    }

    function stopEditingWpm(apply) {
        if (apply) {
            applyWpm(Number(elements.wpmInput.value));
        }
        elements.wpmInput.classList.add('hidden');
        elements.wpmLabel.classList.remove('hidden');
    }

    // ============================================
    // Modal & Text Input
    // ============================================

    function openModal() {
        elements.textArea.value = inputText;
        elements.modalBackdrop.classList.remove('hidden');
        elements.pdfStatus.classList.add('hidden');
        loadRecentPdfs();
    }

    function closeModal() {
        elements.modalBackdrop.classList.add('hidden');
    }

    function applyText() {
        const newText = elements.textArea.value.trim();
        if (newText) {
            setText(newText);
            saveStr(STORAGE_KEYS.lastText, newText);
        }
        closeModal();
    }

    function setText(text) {
        inputText = text;
        isPdfMode = false;
        pdfLoader = null;
        words = tokenize(text);
        totalWords = words.length;
        advanceTo(0);
        setPlaying(true);
    }

    async function loadRecentPdfs() {
        if (typeof FastReaderDB === 'undefined') return;
        
        try {
            const recent = await FastReaderDB.getRecentDocuments(5);
            if (recent.length === 0) {
                elements.recentPdfs.classList.add('hidden');
                return;
            }

            elements.recentList.innerHTML = '';
            recent.forEach(doc => {
                const li = document.createElement('li');
                li.innerHTML = `
                    <span class="name">${escapeHtml(doc.fileName)}</span>
                    <span class="date">${formatDate(doc.date)}</span>
                `;
                li.addEventListener('click', () => loadCachedDocument(doc.id));
                elements.recentList.appendChild(li);
            });
            elements.recentPdfs.classList.remove('hidden');
        } catch (e) {
            console.warn('Failed to load recent PDFs:', e);
        }
    }

    async function loadCachedDocument(id) {
        try {
            const doc = await FastReaderDB.getDocument(id);
            if (doc && doc.text) {
                elements.textArea.value = doc.text;
            }
        } catch (e) {
            console.warn('Failed to load cached document:', e);
        }
    }

    // ============================================
    // File Handling
    // ============================================

    async function handleFileUpload(file) {
        if (!file) return;

        const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');

        if (isPdf) {
            await handlePdfUpload(file);
        } else {
            // Plain text file
            try {
                const text = await file.text();
                elements.textArea.value = text;
            } catch (e) {
                console.error('Failed to read text file:', e);
                alert('Failed to read file. Please try again.');
            }
        }
    }

    async function handlePdfUpload(file) {
        try {
            if (typeof PdfLoader === 'undefined') {
                throw new Error('PDF.js not loaded');
            }

            // Create loader to get page count
            pdfLoader = new PdfLoader(file, {
                onPageLoaded: (pageNum, pageText, totalPages) => {
                    const pdfLoadingText = document.getElementById('pdfLoadingText');
                    const pdfProgressFill = document.getElementById('pdfProgressFill');
                    if (pdfLoadingText) {
                        pdfLoadingText.textContent = `Loading page ${pageNum} of ${totalPages}...`;
                    }
                    if (pdfProgressFill) {
                        pdfProgressFill.style.width = `${(pageNum / totalPages) * 100}%`;
                    }
                    elements.pdfStatusText.textContent = `Loaded page ${pageNum} of ${totalPages}`;
                },
                onWordsUpdated: (newWords, estimatedTotal) => {
                    if (isPdfMode) {
                        words = newWords;
                        totalWords = estimatedTotal;
                        updateProgress();
                    }
                },
                onAllPagesLoaded: () => {
                    elements.pdfStatus.classList.add('hidden');
                    console.log('All PDF pages loaded');
                },
                onError: (error) => {
                    console.error('PDF loading error:', error);
                }
            });

            await pdfLoader.init();
            
            // Show PDF options modal
            showPdfOptionsModal();

        } catch (e) {
            console.error('PDF handling error:', e);
            alert('Failed to load PDF. Make sure it contains text.');
        }
    }

    function showPdfOptionsModal() {
        const backdrop = document.getElementById('pdfOptionsBackdrop');
        const infoText = document.getElementById('pdfInfoText');
        const loadingProgress = document.getElementById('pdfLoadingProgress');
        const optionsDiv = document.querySelector('.pdf-options');
        
        // Update info text
        const estimatedWords = pdfLoader.totalPages * 250;
        infoText.textContent = `This PDF has ${pdfLoader.totalPages} pages (~${estimatedWords.toLocaleString()} words)`;
        
        // Reset state
        loadingProgress.classList.add('hidden');
        optionsDiv.classList.remove('hidden');
        document.getElementById('pdfProgressFill').style.width = '0%';
        
        // Show modal
        backdrop.classList.remove('hidden');
    }

    function hidePdfOptionsModal() {
        document.getElementById('pdfOptionsBackdrop').classList.add('hidden');
    }

    async function loadAllPdfPages() {
        const loadingProgress = document.getElementById('pdfLoadingProgress');
        const optionsDiv = document.querySelector('.pdf-options');
        const pdfProgressFill = document.getElementById('pdfProgressFill');
        const pdfLoadingText = document.getElementById('pdfLoadingText');
        
        // Show loading, hide options
        optionsDiv.classList.add('hidden');
        loadingProgress.classList.remove('hidden');
        pdfProgressFill.style.width = '0%';
        pdfLoadingText.textContent = 'Loading all pages...';
        
        // Load all pages
        for (let i = 1; i <= pdfLoader.totalPages; i++) {
            await pdfLoader.loadPage(i);
        }
        
        pdfLoader.allPagesLoaded = true;
        
        // Update text area and close modal
        elements.textArea.value = pdfLoader.getAllText();
        hidePdfOptionsModal();
        elements.pdfStatus.classList.add('hidden');
    }

    async function loadQuickStart() {
        const loadingProgress = document.getElementById('pdfLoadingProgress');
        const optionsDiv = document.querySelector('.pdf-options');
        const pdfLoadingText = document.getElementById('pdfLoadingText');
        
        // Show brief loading
        optionsDiv.classList.add('hidden');
        loadingProgress.classList.remove('hidden');
        pdfLoadingText.textContent = 'Loading first 3 pages...';
        
        // Load first 3 pages
        await pdfLoader.loadInitialPages(3);
        
        // Update text area and close modal
        elements.textArea.value = pdfLoader.getAllText();
        hidePdfOptionsModal();
        
        // Show status that background loading will happen
        elements.pdfStatus.classList.remove('hidden');
        elements.pdfStatusText.textContent = `Loaded ${Math.min(3, pdfLoader.totalPages)} of ${pdfLoader.totalPages} pages`;
    }

    function applyPdfText() {
        if (!pdfLoader) {
            applyText();
            return;
        }

        isPdfMode = true;
        inputText = elements.textArea.value;
        words = pdfLoader.getAllWords();
        totalWords = pdfLoader.estimatedTotalWords;
        closeModal();
        advanceTo(0);
        setPlaying(true);

        // Start background loading of remaining pages
        pdfLoader.startBackgroundLoading();

        // Cache PDF for offline use (will wait for all pages)
        pdfLoader.cacheForOffline();
    }

    // ============================================
    // Gestures & Touch
    // ============================================

    let touchStartX = 0;
    let touchStartY = 0;
    let touchStartTime = 0;
    let lastTapTime = 0;
    const SWIPE_THRESHOLD = 50;
    const TAP_THRESHOLD = 10;
    const DOUBLE_TAP_DELAY = 300;

    function handlePointerDown(e) {
        if (e.target.closest('.controls, .modal')) return;
        
        touchStartX = e.clientX;
        touchStartY = e.clientY;
        touchStartTime = Date.now();
    }

    function handlePointerUp(e) {
        if (e.target.closest('.controls, .modal')) return;

        const dx = e.clientX - touchStartX;
        const dy = e.clientY - touchStartY;
        const dt = Date.now() - touchStartTime;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // Check for swipe
        if (distance > SWIPE_THRESHOLD && dt < 500) {
            if (Math.abs(dx) > Math.abs(dy)) {
                // Horizontal swipe
                if (!isPlaying) {
                    if (dx > 0) {
                        advanceTo(index - 1); // Swipe right = back
                    } else {
                        advanceTo(index + 1); // Swipe left = forward
                    }
                }
            }
            return;
        }

        // Check for tap
        if (distance < TAP_THRESHOLD && dt < 300) {
            const now = Date.now();
            
            // Double tap
            if (now - lastTapTime < DOUBLE_TAP_DELAY) {
                resetToStart();
                lastTapTime = 0;
            } else {
                // Single tap - toggle play/pause
                lastTapTime = now;
                setTimeout(() => {
                    if (lastTapTime === now) {
                        setPlaying(!isPlaying);
                    }
                }, DOUBLE_TAP_DELAY);
            }
        }
    }

    // ============================================
    // Keyboard Shortcuts
    // ============================================

    function handleKeyDown(e) {
        // Ignore if typing in input
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
            if (e.key === 'Escape') {
                e.target.blur();
                closeModal();
            }
            return;
        }

        switch (e.key) {
            case ' ':
                e.preventDefault();
                setPlaying(!isPlaying);
                break;
            case 'ArrowLeft':
                if (!isPlaying) advanceTo(index - 1);
                break;
            case 'ArrowRight':
                if (!isPlaying) advanceTo(index + 1);
                break;
            case 'r':
            case 'R':
                resetToStart();
                break;
            case 't':
            case 'T':
                toggleTheme();
                break;
            case 'Escape':
                closeModal();
                break;
        }
    }

    // ============================================
    // Settings
    // ============================================

    function toggleTheme() {
        theme = theme === 'dark' ? 'light' : 'dark';
        saveStr(STORAGE_KEYS.theme, theme);
        updateThemeUI();
        draw();
    }

    function toggleLoop() {
        loopEnabled = !loopEnabled;
        saveStr(STORAGE_KEYS.loop, String(loopEnabled));
        updateLoopUI();
    }

    function setProfile(key) {
        if (PAUSE_PROFILES[key]) {
            profileKey = key;
            saveStr(STORAGE_KEYS.profile, profileKey);
            restartIfPlaying();
        }
    }

    function setFont(choice) {
        if (FONT_STACKS[choice]) {
            fontChoice = choice;
            saveStr(STORAGE_KEYS.font, fontChoice);
            draw();
        }
    }

    function setHighlightMode(mode) {
        if (HIGHLIGHT_MODES[mode]) {
            highlightMode = mode;
            saveStr(STORAGE_KEYS.highlightMode, mode);
            draw();
            updateHighlightModeUI();
        }
    }

    function updateHighlightModeUI() {
        const select = document.getElementById('highlightSelect');
        if (select) {
            select.value = highlightMode;
        }
    }

    // ============================================
    // Welcome Screen
    // ============================================

    function showWelcomeScreen() {
        const backdrop = document.getElementById('welcomeBackdrop');
        if (backdrop) {
            backdrop.classList.remove('hidden');
        }
    }

    function hideWelcomeScreen() {
        const backdrop = document.getElementById('welcomeBackdrop');
        if (backdrop) {
            backdrop.classList.add('hidden');
        }
        // Mark as visited
        saveStr(STORAGE_KEYS.firstVisit, 'false');
        isFirstVisit = false;
    }

    function selectWelcomeMode(mode) {
        setHighlightMode(mode);
        hideWelcomeScreen();
    }

    // ============================================
    // Research Modal
    // ============================================

    function showResearchModal() {
        const backdrop = document.getElementById('researchBackdrop');
        if (backdrop) {
            backdrop.classList.remove('hidden');
        }
    }

    function hideResearchModal() {
        const backdrop = document.getElementById('researchBackdrop');
        if (backdrop) {
            backdrop.classList.add('hidden');
        }
    }

    function navigateToResearchSection(targetId) {
        const target = document.getElementById(targetId);
        if (!target) return;

        // Close all sections first
        document.querySelectorAll('.research-section').forEach(section => {
            section.removeAttribute('open');
        });

        // Open the target section
        target.setAttribute('open', '');

        // Scroll into view
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });

        // Update active button state
        document.querySelectorAll('.research-nav-btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.target === targetId) {
                btn.classList.add('active');
            }
        });
    }

    function toggleSettings() {
        elements.settingsPanel.classList.toggle('expanded');
    }

    // ============================================
    // Offline Detection
    // ============================================

    function updateOnlineStatus() {
        elements.offlineBanner.classList.toggle('hidden', navigator.onLine);
    }

    // ============================================
    // Utilities
    // ============================================

    function escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    function formatDate(date) {
        const d = new Date(date);
        const now = new Date();
        const diff = now - d;
        
        if (diff < 86400000) { // Less than 24 hours
            return 'Today';
        } else if (diff < 172800000) { // Less than 48 hours
            return 'Yesterday';
        } else {
            return d.toLocaleDateString();
        }
    }

    // ============================================
    // Event Listeners
    // ============================================

    function setupEventListeners() {
        // Playback controls
        elements.playBtn.addEventListener('click', () => setPlaying(!isPlaying));
        elements.resetBtn.addEventListener('click', resetToStart);
        elements.backBtn.addEventListener('click', () => !isPlaying && advanceTo(index - 1));
        elements.fwdBtn.addEventListener('click', () => !isPlaying && advanceTo(index + 1));

        // Settings
        elements.themeBtn.addEventListener('click', toggleTheme);
        elements.loopToggleBtn.addEventListener('click', toggleLoop);
        elements.settingsToggle.addEventListener('click', toggleSettings);

        // WPM
        elements.wpmRange.addEventListener('input', (e) => applyWpm(+e.target.value));
        elements.wpmLabel.addEventListener('click', startEditingWpm);
        elements.wpmInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                stopEditingWpm(true);
            } else if (e.key === 'Escape') {
                e.preventDefault();
                stopEditingWpm(false);
            }
        });
        elements.wpmInput.addEventListener('blur', () => {
            if (!elements.wpmInput.classList.contains('hidden')) {
                stopEditingWpm(true);
            }
        });

        // Profile & Font
        elements.profileSelect.addEventListener('change', (e) => setProfile(e.target.value));
        elements.fontSelect.addEventListener('change', (e) => setFont(e.target.value));

        // Highlight Mode
        const highlightSelect = document.getElementById('highlightSelect');
        if (highlightSelect) {
            highlightSelect.addEventListener('change', (e) => setHighlightMode(e.target.value));
        }

        // Modal
        elements.textBtn.addEventListener('click', openModal);
        elements.cancelModalBtn.addEventListener('click', closeModal);
        elements.closeModalBtn.addEventListener('click', closeModal);
        elements.applyModalBtn.addEventListener('click', () => {
            if (isPdfMode && pdfLoader) {
                applyPdfText();
            } else {
                applyText();
            }
        });
        elements.modalBackdrop.addEventListener('click', (e) => {
            if (e.target === elements.modalBackdrop) closeModal();
        });

        // File upload
        elements.fileInput.addEventListener('change', (e) => {
            handleFileUpload(e.target.files[0]);
            e.target.value = ''; // Reset for re-upload
        });

        // PDF Options Modal
        document.getElementById('closePdfOptionsBtn').addEventListener('click', hidePdfOptionsModal);
        document.getElementById('pdfOptionsBackdrop').addEventListener('click', (e) => {
            if (e.target.id === 'pdfOptionsBackdrop') hidePdfOptionsModal();
        });
        document.getElementById('loadAllPagesBtn').addEventListener('click', loadAllPdfPages);
        document.getElementById('loadQuickStartBtn').addEventListener('click', loadQuickStart);

        // Welcome Screen
        const welcomeModeCards = document.querySelectorAll('.welcome-mode-card');
        welcomeModeCards.forEach(card => {
            card.addEventListener('click', () => {
                const mode = card.dataset.mode;
                if (mode) selectWelcomeMode(mode);
            });
        });
        const skipWelcomeBtn = document.getElementById('skipWelcomeBtn');
        if (skipWelcomeBtn) {
            skipWelcomeBtn.addEventListener('click', hideWelcomeScreen);
        }

        // Research Modal
        const researchBtn = document.getElementById('researchBtn');
        if (researchBtn) {
            researchBtn.addEventListener('click', showResearchModal);
        }
        const closeResearchBtn = document.getElementById('closeResearchBtn');
        if (closeResearchBtn) {
            closeResearchBtn.addEventListener('click', hideResearchModal);
        }
        const researchBackdrop = document.getElementById('researchBackdrop');
        if (researchBackdrop) {
            researchBackdrop.addEventListener('click', (e) => {
                if (e.target === researchBackdrop) hideResearchModal();
            });
        }

        // Research Navigation Buttons
        document.querySelectorAll('.research-nav-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const targetId = btn.dataset.target;
                if (targetId) navigateToResearchSection(targetId);
            });
        });

        // Touch/pointer
        canvas.addEventListener('pointerdown', handlePointerDown);
        canvas.addEventListener('pointerup', handlePointerUp);

        // Keyboard
        document.addEventListener('keydown', handleKeyDown);

        // Resize
        window.addEventListener('resize', resize);

        // Online/offline
        window.addEventListener('online', updateOnlineStatus);
        window.addEventListener('offline', updateOnlineStatus);
    }

    // ============================================
    // Initialization
    // ============================================

    function init() {
        // Set initial UI state
        updateThemeUI();
        updateLoopUI();
        updateOnlineStatus();
        updateHighlightModeUI();

        // Set select values from storage
        elements.profileSelect.value = profileKey;
        elements.fontSelect.value = fontChoice;

        // Load last text or use default
        const lastText = loadStr(STORAGE_KEYS.lastText, DEFAULT_TEXT);
        inputText = lastText;
        words = tokenize(inputText);
        totalWords = words.length;
        currentWord = words[0]?.word || ' ';

        // Setup listeners
        setupEventListeners();

        // Initial render
        const startApp = () => {
            resize();
            applyWpm(wpm);
            updateProgress();
            // Don't auto-play on load
            setPlaying(false);
            draw();

            // Show welcome screen on first visit
            if (isFirstVisit) {
                showWelcomeScreen();
            }
        };

        // Wait for fonts to load
        if (document.fonts && document.fonts.ready) {
            document.fonts.ready.then(startApp).catch(startApp);
        } else {
            startApp();
        }
    }

    // Start when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Expose for PDF loader integration
    window.FastReader = {
        setText,
        setPlaying,
        advanceTo,
        get words() { return words; },
        set words(w) { words = w; },
        get totalWords() { return totalWords; },
        set totalWords(t) { totalWords = t; }
    };

})();
