// AI Summarizer Pro - Background Script (COMPLETELY FIXED)

class AIService {
    constructor() {
        this.apiKey = null;
        this.baseURL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';
    }

    async setApiKey(apiKey) {
        this.apiKey = apiKey;
        await chrome.storage.sync.set({ geminiApiKey: apiKey });
        console.log('API Key set:', apiKey ? 'Yes' : 'No');
    }

    async summarizeWithGemini(content, options = {}) {
        if (!this.apiKey) {
            console.log('No API key available');
            throw new Error('Gemini API key not configured');
        }

        const { length = 'medium', style = 'informative', language = 'en', type = 'summary' } = options;
        
        let prompt;
        if (type === 'keypoints') {
            prompt = `Extract key points from the following content and format them as a clean bullet list. Follow these rules:

1. Extract 6-10 most important points
2. Each point should be substantial and informative (15-50 words)
3. Format as bullet points with each point on a new line
4. Start each point with a bullet (•) followed by a space
5. Focus on main ideas, important facts, conclusions, and actionable insights
6. Avoid redundancy and filler content

Content:
${content}

Key Points:`;
        } else {
            const lengthGuide = {
                'short': 'in 2-3 concise sentences',
                'medium': 'in 1-2 well-structured paragraphs', 
                'long': 'in 3-4 detailed paragraphs'
            };

            prompt = `Summarize the following content ${lengthGuide[length]}. Focus on the main points, key information, and important conclusions. Be clear and informative.

Content:
${content}

Summary:`;
        }

        try {
            console.log('Making Gemini API call...');
            console.log('API URL:', `${this.baseURL}?key=${this.apiKey.substring(0, 10)}...`);
            
            const requestBody = {
                contents: [{
                    parts: [{
                        text: prompt
                    }]
                }],
                generationConfig: {
                    temperature: 0.3,
                    topK: 40,
                    topP: 0.95,
                    maxOutputTokens: type === 'keypoints' ? 1500 : 1000,
                    candidateCount: 1
                },
                safetySettings: [
                    {
                        category: "HARM_CATEGORY_HARASSMENT",
                        threshold: "BLOCK_MEDIUM_AND_ABOVE"
                    },
                    {
                        category: "HARM_CATEGORY_HATE_SPEECH",
                        threshold: "BLOCK_MEDIUM_AND_ABOVE"
                    },
                    {
                        category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
                        threshold: "BLOCK_MEDIUM_AND_ABOVE"
                    },
                    {
                        category: "HARM_CATEGORY_DANGEROUS_CONTENT",
                        threshold: "BLOCK_MEDIUM_AND_ABOVE"
                    }
                ]
            };

            console.log('Request body:', JSON.stringify(requestBody, null, 2));

            const response = await fetch(`${this.baseURL}?key=${this.apiKey}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestBody)
            });

            console.log('Response status:', response.status);
            console.log('Response headers:', Object.fromEntries(response.headers.entries()));

            if (!response.ok) {
                const errorText = await response.text();
                console.log('Error response:', errorText);
                
                let errorData;
                try {
                    errorData = JSON.parse(errorText);
                } catch {
                    errorData = { error: { message: `HTTP ${response.status}: ${response.statusText}` } };
                }
                throw new Error(`Gemini API Error: ${errorData.error?.message || 'Unknown error'}`);
            }

            const data = await response.json();
            console.log('API Response:', JSON.stringify(data, null, 2));
            
            if (!data.candidates || data.candidates.length === 0) {
                throw new Error('No candidates in response from Gemini API');
            }

            const candidate = data.candidates[0];
            
            if (candidate.finishReason === 'SAFETY') {
                throw new Error('Content was blocked by safety filters');
            }

            if (!candidate.content || !candidate.content.parts || candidate.content.parts.length === 0) {
                throw new Error('No content in response from Gemini API');
            }

            const result = candidate.content.parts[0].text;

            if (!result) {
                throw new Error('Empty response from Gemini API');
            }

            console.log('Gemini success! Result length:', result.length);

            return {
                success: true,
                summary: result.trim(),
                provider: 'gemini',
                metadata: {
                    originalLength: content.length,
                    summaryLength: result.length,
                    model: 'gemini-1.5-flash',
                    processingTime: Date.now(),
                    type: type
                }
            };

        } catch (error) {
            console.error('Gemini API Error Details:', error);
            return {
                success: false,
                error: error.message,
                provider: 'gemini'
            };
        }
    }

    async generateSummary(content, options = {}) {
        console.log('generateSummary called with content length:', content.length);
        
        if (!content || typeof content !== 'string' || content.trim().length < 20) {
            return {
                success: false,
                error: 'Insufficient content to summarize. Please provide at least 20 characters of text.'
            };
        }

        const settings = await chrome.storage.sync.get(['aiProvider', 'geminiApiKey']);
        console.log('Settings:', settings);
        
        // Try Gemini first if configured
        if (settings.aiProvider === 'gemini' && settings.geminiApiKey) {
            this.apiKey = settings.geminiApiKey;
            console.log('Using Gemini API with key:', this.apiKey ? 'Available' : 'Missing');
            
            const result = await this.summarizeWithGemini(content, options);
            if (result.success) {
                console.log('Gemini API success');
                return result;
            }
            console.warn('Gemini failed, falling back to local processing:', result.error);
        } else {
            console.log('Using local processing - no Gemini configured');
        }

        // Fallback to local processing
        return this.localSummarize(content, options);
    }

    async extractKeyPoints(content, options = {}) {
        console.log('extractKeyPoints called with content length:', content.length);
        
        if (!content || typeof content !== 'string' || content.trim().length < 20) {
            return {
                success: false,
                error: 'Insufficient content to extract key points from.'
            };
        }

        const settings = await chrome.storage.sync.get(['aiProvider', 'geminiApiKey']);
        
        // Try Gemini first if configured
        if (settings.aiProvider === 'gemini' && settings.geminiApiKey) {
            this.apiKey = settings.geminiApiKey;
            console.log('Using Gemini API for key points with key:', this.apiKey ? 'Available' : 'Missing');
            
            const result = await this.summarizeWithGemini(content, { ...options, type: 'keypoints' });
            if (result.success) {
                console.log('Gemini API key points success');
                return {
                    success: true,
                    keyPoints: result.summary,
                    provider: 'gemini',
                    metadata: result.metadata
                };
            }
            console.warn('Gemini failed for key points, falling back to local processing:', result.error);
        } else {
            console.log('Using local key points extraction - no Gemini configured');
        }

        // Fallback to local key point extraction
        return this.localExtractKeyPoints(content, options);
    }

    localSummarize(content, options = {}) {
        const { length = 'medium' } = options;
        
        // Clean and validate content
        const cleanContent = content.replace(/\s+/g, ' ').trim();
        if (cleanContent.length < 20) {
            return {
                success: false,
                error: 'Content too short to summarize effectively.'
            };
        }

        // Improved sentence splitting
        const sentences = cleanContent.match(/[^.!?]+[.!?]+/g) || [];
        
        if (sentences.length === 0) {
            return {
                success: false,
                error: 'Unable to process this content for summarization.'
            };
        }

        let targetSentences;
        switch (length) {
            case 'short': 
                targetSentences = Math.min(3, Math.max(1, Math.ceil(sentences.length * 0.15))); 
                break;
            case 'long': 
                targetSentences = Math.min(12, Math.max(3, Math.ceil(sentences.length * 0.4))); 
                break;
            case 'medium':
            default: 
                targetSentences = Math.min(8, Math.max(2, Math.ceil(sentences.length * 0.25))); 
                break;
        }

        const sentenceScores = sentences.map((sentence, index) => {
            let score = 0;
            const words = sentence.toLowerCase().split(/\s+/);
            const wordCount = words.length;

            // Length scoring
            if (wordCount >= 8 && wordCount <= 30) score += 3;
            else if (wordCount >= 5 && wordCount <= 40) score += 1;

            // Position scoring
            const relativePosition = index / sentences.length;
            if (relativePosition <= 0.1) score += 3;
            if (relativePosition >= 0.9) score += 2;

            // Keyword scoring
            const importantTerms = [
                'important', 'significant', 'key', 'main', 'primary', 'essential', 'crucial',
                'conclusion', 'result', 'finding', 'discovered', 'revealed', 'shows', 'indicates',
                'however', 'therefore', 'because', 'since', 'thus', 'consequently'
            ];

            importantTerms.forEach(term => {
                if (sentence.toLowerCase().includes(term)) score += 2;
            });

            // Numeric data scoring
            if (/\d+(\.\d+)?%/.test(sentence)) score += 2;
            if (/\$\d+/.test(sentence)) score += 1;

            return { sentence: sentence.trim(), score, index };
        });

        const selectedSentences = sentenceScores
            .sort((a, b) => b.score - a.score)
            .slice(0, targetSentences)
            .sort((a, b) => a.index - b.index)
            .map(item => item.sentence);

        const summary = selectedSentences.join(' ').replace(/\s+/g, ' ').trim();

        return {
            success: true,
            summary: summary || 'Could not generate a meaningful summary from this content.',
            provider: 'local',
            metadata: {
                originalLength: content.length,
                summaryLength: summary.length,
                processingTime: Date.now(),
                type: 'summary'
            }
        };
    }

    // FIXED: Improved local key points extraction with better formatting
    localExtractKeyPoints(content, options = {}) {
        const { length = 'medium' } = options;
        const cleanContent = content.replace(/\s+/g, ' ').trim();
        
        if (cleanContent.length < 20) {
            return {
                success: false,
                error: 'Content too short to extract key points from.'
            };
        }

        // Split into sentences and paragraphs for better analysis
        const sentences = cleanContent.match(/[^.!?]+[.!?]+/g) || [];
        const paragraphs = cleanContent.split(/\n\s*\n/).filter(p => p.trim().length > 50);
        
        const keyPoints = [];

        // Enhanced patterns for key point detection
        const patterns = [
            // Strong indicators (high weight)
            { regex: /(?:key|main|important|significant|primary|essential|critical|crucial|major)\s+(?:point|finding|result|conclusion|factor|aspect|benefit|advantage|problem|issue)/i, weight: 6 },
            { regex: /(?:research shows|study found|analysis reveals|data indicates|evidence suggests|findings show|results demonstrate)/i, weight: 5 },
            { regex: /(?:first|second|third|fourth|fifth|finally|lastly|in conclusion|to conclude|most importantly|significantly)/i, weight: 5 },
            
            // Medium indicators
            { regex: /(?:leads to|results in|causes|improves|increases|decreases|reduces|affects|impacts|influences)/i, weight: 4 },
            { regex: /(?:recommended|suggests|proposes|should|must|need to|important to|necessary to)/i, weight: 4 },
            { regex: /(?:percentage|percent|rate|ratio|statistics|data shows|numbers indicate)/i, weight: 4 },
            
            // Numbers and statistics
            { regex: /\d+(\.\d+)?%/, weight: 3 },
            { regex: /\$\d+(?:,\d{3})*(?:\.\d{2})?/, weight: 3 },
            { regex: /\d+(?:,\d{3})*\s+(?:people|users|customers|participants|respondents|cases)/, weight: 4 }
        ];

        // Score sentences
        sentences.forEach((sentence, index) => {
            const trimmed = sentence.trim();
            if (trimmed.length < 25 || trimmed.length > 200) return;

            let score = 0;
            let matchedPatterns = [];

            patterns.forEach(pattern => {
                if (pattern.regex.test(trimmed)) {
                    score += pattern.weight;
                    matchedPatterns.push(pattern.regex.source.substring(0, 20));
                }
            });

            // Position scoring (beginning and end are more important)
            const position = index / sentences.length;
            if (position <= 0.15) score += 3; // Beginning
            if (position >= 0.85) score += 2; // End
            if (position >= 0.4 && position <= 0.6) score += 1; // Middle

            // Length bonus for substantial sentences
            if (trimmed.length >= 40 && trimmed.length <= 120) score += 2;

            // Avoid promotional/marketing language
            if (/(?:click here|visit|subscribe|buy now|purchase|offer|deal|discount|advertisement)/i.test(trimmed)) {
                score -= 4;
            }

            // Boost sentences with multiple key indicators
            if (matchedPatterns.length > 1) score += 2;

            if (score >= 5) {
                keyPoints.push({
                    text: trimmed,
                    score: score,
                    patterns: matchedPatterns,
                    index: index
                });
            }
        });

        // If not enough from sentences, try paragraph analysis
        if (keyPoints.length < 4) {
            paragraphs.forEach((paragraph, paragraphIndex) => {
                const paragraphSentences = paragraph.match(/[^.!?]+[.!?]+/g) || [];
                if (paragraphSentences.length > 0) {
                    const firstSentence = paragraphSentences[0].trim();
                    if (firstSentence.length >= 30 && firstSentence.length <= 150) {
                        let score = 3; // Base score for paragraph first sentences
                        
                        patterns.forEach(pattern => {
                            if (pattern.regex.test(firstSentence)) {
                                score += pattern.weight;
                            }
                        });

                        // Boost early paragraphs
                        if (paragraphIndex <= 2) score += 2;

                        if (score >= 4) {
                            keyPoints.push({
                                text: firstSentence,
                                score: score,
                                patterns: ['paragraph-start'],
                                index: paragraphIndex * 1000 // Ensure sorting works
                            });
                        }
                    }
                }
            });
        }

        // Sort by score, then by position to maintain some document order
        keyPoints.sort((a, b) => {
            if (Math.abs(a.score - b.score) <= 1) {
                return a.index - b.index; // Maintain document order for similar scores
            }
            return b.score - a.score; // Higher score first
        });
        
        let maxPoints;
        switch (length) {
            case 'short': maxPoints = 5; break;
            case 'long': maxPoints = 10; break;
            default: maxPoints = 7; break;
        }

        // Remove duplicates and very similar points
        const uniquePoints = [];
        const usedWords = new Set();
        
        for (const point of keyPoints) {
            const words = point.text.toLowerCase().split(/\s+/).filter(w => w.length > 3);
            const pointWords = new Set(words);
            
            // Check for significant overlap with existing points
            let hasSignificantOverlap = false;
            for (const existingWords of usedWords) {
                const intersection = new Set([...pointWords].filter(x => existingWords.has(x)));
                if (intersection.size > Math.min(pointWords.size, existingWords.size) * 0.6) {
                    hasSignificantOverlap = true;
                    break;
                }
            }
            
            if (!hasSignificantOverlap && uniquePoints.length < maxPoints) {
                uniquePoints.push(point);
                usedWords.add(pointWords);
            }
        }

        // Format as proper bullet points
        const finalKeyPoints = uniquePoints.map(point => {
            let text = point.text;
            // Ensure proper punctuation
            if (!text.endsWith('.') && !text.endsWith('!') && !text.endsWith('?')) {
                text += '.';
            }
            return `• ${text}`;
        });

        // Fallback if still no good points
        if (finalKeyPoints.length === 0) {
            const meaningfulSentences = sentences
                .filter(s => {
                    const trimmed = s.trim();
                    return trimmed.length >= 30 && 
                           trimmed.length <= 150 && 
                           !/(?:click|visit|subscribe|copyright|terms|privacy|advertisement)/i.test(trimmed);
                })
                .slice(0, 5);
            
            finalKeyPoints.push(...meaningfulSentences.map(s => {
                let text = s.trim();
                if (!text.endsWith('.') && !text.endsWith('!') && !text.endsWith('?')) {
                    text += '.';
                }
                return `• ${text}`;
            }));
        }

        // Join with double newlines for better formatting
        const result = finalKeyPoints.join('\n\n');

        return {
            success: true,
            keyPoints: result || '• Could not extract meaningful key points from this content.',
            provider: 'local',
            metadata: {
                originalLength: content.length,
                keyPointsCount: finalKeyPoints.length,
                processingTime: Date.now(),
                type: 'keypoints'
            }
        };
    }
}

class BackgroundService {
    constructor() {
        this.aiService = new AIService();
        this.init();
    }

    init() {
        chrome.runtime.onInstalled.addListener((details) => {
            this.handleInstall(details);
        });

        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            return this.handleMessage(request, sender, sendResponse);
        });

        chrome.contextMenus.onClicked.addListener((info, tab) => {
            this.handleContextMenu(info, tab);
        });

        chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
            this.handleTabUpdate(tabId, changeInfo, tab);
        });

        chrome.storage.onChanged.addListener((changes, namespace) => {
            this.handleStorageChange(changes, namespace);
        });

        this.setupContextMenus();
    }

    async handleInstall(details) {
        if (details.reason === 'install') {
            await chrome.storage.sync.set({
                autoSummarize: false,
                floatingBtn: true,
                darkMode: false,
                contextMenu: true,
                summaryLength: 'medium',
                aiProvider: 'local',
                geminiApiKey: ''
            });

            await chrome.storage.local.set({
                totalSummaries: 0,
                totalWordsProcessed: 0,
                summaryHistory: [],
                savedSummaries: []
            });

            chrome.tabs.create({
                url: chrome.runtime.getURL('welcome.html')
            });
        }
    }

    handleMessage(request, sender, sendResponse) {
        switch (request.action) {
            case 'updateSetting':
                this.updateSetting(request.setting, request.value);
                sendResponse({ success: true });
                break;
                
            case 'updateApiKey':
                this.updateApiKey(request.apiKey).then(() => {
                    sendResponse({ success: true });
                }).catch(error => {
                    sendResponse({ success: false, error: error.message });
                });
                return true;
                
            case 'getSummary':
                this.generateSummary(request.content, request.options)
                    .then(result => {
                        sendResponse(result);
                    })
                    .catch(error => {
                        sendResponse({
                            success: false,
                            error: error.message,
                            provider: 'error'
                        });
                    });
                return true;
                
            case 'getKeyPoints':
                this.extractKeyPoints(request.content, request.options)
                    .then(result => {
                        sendResponse(result);
                    })
                    .catch(error => {
                        sendResponse({
                            success: false,
                            error: error.message,
                            provider: 'error'
                        });
                    });
                return true;
                
            case 'getStats':
                this.getStats().then(stats => {
                    sendResponse(stats);
                }).catch(error => {
                    sendResponse({ error: error.message });
                });
                return true;
                
            default:
                sendResponse({ success: false, error: 'Unknown action' });
        }
    }

    async updateApiKey(apiKey) {
        await this.aiService.setApiKey(apiKey);
    }

    async generateSummary(content, options = {}) {
        try {
            const result = await this.aiService.generateSummary(content, options);
            
            if (result.success) {
                await this.updateStats(content, result.summary);
            }
            
            return result;
        } catch (error) {
            console.error('Summary generation error:', error);
            return {
                success: false,
                error: error.message,
                provider: 'error'
            };
        }
    }

    async extractKeyPoints(content, options = {}) {
        try {
            const result = await this.aiService.extractKeyPoints(content, options);
            
            if (result.success) {
                await this.updateStats(content, result.keyPoints);
            }
            
            return result;
        } catch (error) {
            console.error('Key points extraction error:', error);
            return {
                success: false,
                error: error.message,
                provider: 'error'
            };
        }
    }

    async setupContextMenus() {
        try {
            await chrome.contextMenus.removeAll();
            const settings = await chrome.storage.sync.get(['contextMenu']);
            
            if (settings.contextMenu !== false) {
                chrome.contextMenus.create({
                    id: 'summarize-page',
                    title: '✨ Summarize this page',
                    contexts: ['page']
                });

                chrome.contextMenus.create({
                    id: 'summarize-selection',
                    title: '✨ Summarize selected text',
                    contexts: ['selection']
                });

                chrome.contextMenus.create({
                    id: 'extract-keypoints',
                    title: '🔑 Extract key points',
                    contexts: ['page', 'selection']
                });
            }
        } catch (error) {
            console.error('Error setting up context menus:', error);
        }
    }

    async handleContextMenu(info, tab) {
        try {
            switch (info.menuItemId) {
                case 'summarize-page':
                    await this.executeContentScript(tab.id, 'summarizePage');
                    break;
                case 'summarize-selection':
                    await this.executeContentScript(tab.id, 'summarizeSelection', info.selectionText);
                    break;
                case 'extract-keypoints':
                    await this.executeContentScript(tab.id, 'extractKeyPoints', info.selectionText);
                    break;
            }
        } catch (error) {
            console.error('Context menu error:', error);
        }
    }

    async executeContentScript(tabId, action, data = null) {
        try {
            await chrome.scripting.executeScript({
                target: { tabId: tabId },
                func: (action, data) => {
                    if (window.aiSummarizer) {
                        switch (action) {
                            case 'summarizePage':
                                window.aiSummarizer.showQuickSummary();
                                break;
                            case 'summarizeSelection':
                                window.aiSummarizer.summarizeSelection(data);
                                break;
                            case 'extractKeyPoints':
                                window.aiSummarizer.extractKeyPointsFromSelection(data);
                                break;
                        }
                    }
                },
                args: [action, data]
            });
        } catch (error) {
            console.error('Error executing content script:', error);
        }
    }

    async handleTabUpdate(tabId, changeInfo, tab) {
        if (changeInfo.status === 'complete' && tab.url) {
            const settings = await chrome.storage.sync.get(['autoSummarize']);
            
            if (settings.autoSummarize) {
                if (this.isReadablePage(tab.url)) {
                    setTimeout(() => {
                        this.executeContentScript(tabId, 'autoSummarize');
                    }, 2000);
                }
            }
        }
    }

    isReadablePage(url) {
        const readablePatterns = [
            /^https?:\/\/.*\.(com|org|net|edu|gov)/,
            /\/articles?/,
            /\/blog/,
            /\/news/,
            /\/post/
        ];

        const unreadablePatterns = [
            /^chrome:/,
            /^chrome-extension:/,
            /^file:/,
            /^data:/,
            /google\.com\/search/,
            /youtube\.com/,
            /facebook\.com/,
            /twitter\.com/,
            /instagram\.com/
        ];

        return readablePatterns.some(pattern => pattern.test(url)) &&
               !unreadablePatterns.some(pattern => pattern.test(url));
    }

    async updateSetting(setting, value) {
        await chrome.storage.sync.set({ [setting]: value });
        
        switch (setting) {
            case 'contextMenu':
                await this.setupContextMenus();
                break;
        }
    }

    async handleStorageChange(changes, namespace) {
        if (namespace === 'sync' && changes.contextMenu) {
            await this.setupContextMenus();
        }
    }

    async updateStats(originalContent, summary) {
        try {
            const data = await chrome.storage.local.get(['totalSummaries', 'totalWordsProcessed']);
            
            const newStats = {
                totalSummaries: (data.totalSummaries || 0) + 1,
                totalWordsProcessed: (data.totalWordsProcessed || 0) + originalContent.split(/\s+/).length
            };

            await chrome.storage.local.set(newStats);
        } catch (error) {
            console.error('Error updating stats:', error);
        }
    }

    async getStats() {
        try {
            const data = await chrome.storage.local.get([
                'totalSummaries',
                'totalWordsProcessed',
                'summaryHistory',
                'savedSummaries'
            ]);

            return {
                totalSummaries: data.totalSummaries || 0,
                totalWordsProcessed: data.totalWordsProcessed || 0,
                timeSaved: Math.floor((data.totalSummaries || 0) * 2.5),
                historyCount: (data.summaryHistory || []).length,
                savedCount: (data.savedSummaries || []).length
            };
        } catch (error) {
            console.error('Error getting stats:', error);
            return {
                totalSummaries: 0,
                totalWordsProcessed: 0,
                timeSaved: 0,
                historyCount: 0,
                savedCount: 0
            };
        }
    }
}

new BackgroundService();