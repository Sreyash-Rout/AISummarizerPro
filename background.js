// AI Summarizer Pro - Background Script

// Import AI Service functionality directly

class AIService {
    constructor() {
        this.apiKey = null;
        this.baseURL ='https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent';
    }

    async setApiKey(apiKey) {
        this.apiKey = apiKey;
        await chrome.storage.sync.set({ geminiApiKey: apiKey });
    }

    async summarizeWithGemini(content, options = {}) {
        if (!this.apiKey) {
            throw new Error('Gemini API key not configured');
        }

        const { length = 'medium', style = 'informative', language = 'en' } = options;
        const prompt = this.createSummarizationPrompt(content, length, style, language);

        try {
            const response = await fetch(`${this.baseURL}?key=${this.apiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: {
                        temperature: 0.3,
                        topK: 40,
                        topP: 0.95,
                        maxOutputTokens: this.getMaxTokens(length),
                    }
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`Gemini API Error: ${errorData.error?.message || 'Unknown error'}`);
            }

            const data = await response.json();
            const summary = data.candidates[0]?.content?.parts[0]?.text;

            if (!summary) {
                throw new Error('No summary generated');
            }

            return {
                success: true,
                summary: summary.trim(),
                provider: 'gemini',
                metadata: {
                    originalLength: content.length,
                    summaryLength: summary.length,
                    model: 'gemini-pro',
                    processingTime: Date.now()
                }
            };

        } catch (error) {
            return {
                success: false,
                error: error.message,
                provider: 'gemini'
            };
        }
    }

    createSummarizationPrompt(content, length, style, language) {
        const lengthInstructions = {
            'short': 'in 2-3 sentences',
            'medium': 'in 1-2 paragraphs',
            'long': 'in 3-4 detailed paragraphs'
        };

        const styleInstructions = {
            'informative': 'Focus on key facts and main points',
            'analytical': 'Provide analysis and insights',
            'casual': 'Use simple, conversational language',
            'academic': 'Use formal, scholarly tone',
            'bullet': 'Format as bullet points'
        };

        return `Please summarize the following content ${lengthInstructions[length] || 'concisely'}. ${styleInstructions[style] || 'Focus on key facts and main points'}. Respond in ${language === 'en' ? 'English' : language}.

Content to summarize:
${content}

Summary:`;
    }

    getMaxTokens(length) {
        switch (length) {
            case 'short': return 512;
            case 'medium': return 1024;
            case 'long': return 2048;
            default: return 1024;
        }
    }

    async generateSummary(content, options = {}) {
        // Add content validation
        if (!content || typeof content !== 'string' || content.trim().length < 20) {
            return {
                success: false,
                error: 'Insufficient content to summarize. Please provide at least 20 characters of text.'
            };
        }

        const settings = await chrome.storage.sync.get(['aiProvider', 'geminiApiKey']);
        
        if (settings.aiProvider === 'gemini' && settings.geminiApiKey) {
            this.apiKey = settings.geminiApiKey;
            const result = await this.summarizeWithGemini(content, options);
            if (result.success) {
                return result;
            }
            console.warn('Gemini failed, falling back to local processing:', result.error);
        }

        // Fallback to local processing
        return this.localSummarize(content, options);
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
            // Fallback: split by periods if no proper sentences found
            const fallbackSentences = cleanContent.split('.').filter(s => s.trim().length > 10);
            if (fallbackSentences.length > 0) {
                return {
                    success: true,
                    summary: fallbackSentences.slice(0, 3).join('. ').trim() + '.',
                    provider: 'local',
                    metadata: {
                        originalLength: content.length,
                        summaryLength: fallbackSentences.slice(0, 3).join('. ').length,
                        processingTime: Date.now()
                    }
                };
            }
            
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

            // Length scoring - prefer medium length sentences
            if (wordCount >= 8 && wordCount <= 30) score += 3;
            else if (wordCount >= 5 && wordCount <= 40) score += 1;
            else if (wordCount < 5) score -= 2; // Penalize very short sentences

            // Position scoring
            const relativePosition = index / sentences.length;
            if (relativePosition <= 0.1) score += 3; // Beginning
            if (relativePosition >= 0.9) score += 2; // End
            if (relativePosition >= 0.4 && relativePosition <= 0.6) score += 1; // Middle

            // Keyword scoring
            const importantTerms = [
                'important', 'significant', 'key', 'main', 'primary', 'essential', 'crucial',
                'conclusion', 'result', 'finding', 'discovered', 'revealed', 'shows', 'indicates',
                'however', 'therefore', 'because', 'since', 'thus', 'consequently', 'moreover',
                'first', 'second', 'third', 'finally', 'lastly', 'additionally', 'furthermore',
                'research', 'study', 'analysis', 'data', 'evidence', 'proof', 'demonstrates'
            ];

            importantTerms.forEach(term => {
                if (sentence.toLowerCase().includes(term)) score += 2;
            });

            // Numeric data scoring
            if (/\d+(\.\d+)?%/.test(sentence)) score += 2; // Percentages
            if (/\$\d+/.test(sentence)) score += 1; // Money
            if (/\d{4}/.test(sentence)) score += 1; // Years

            // Question and exclamation penalties (usually less informative)
            if (sentence.includes('?')) score -= 1;
            if (sentence.includes('!') && !sentence.toLowerCase().includes('important')) score -= 0.5;

            return { sentence: sentence.trim(), score, index };
        });

        // Select top sentences
        const selectedSentences = sentenceScores
            .sort((a, b) => b.score - a.score)
            .slice(0, targetSentences)
            .sort((a, b) => a.index - b.index)
            .map(item => item.sentence);

        let summary = selectedSentences.join(' ').replace(/\s+/g, ' ').trim();

        // Ensure minimum length and quality
        if (summary.length < 50 && sentences.length > 0) {
            summary = sentences.slice(0, Math.min(3, sentences.length)).join(' ').trim();
        }

        return {
            success: true,
            summary: summary || 'Could not generate a meaningful summary from this content.',
            provider: 'local',
            metadata: {
                originalLength: content.length,
                summaryLength: summary.length,
                processingTime: Date.now(),
                sentencesUsed: selectedSentences.length,
                totalSentences: sentences.length
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
        // Install/Update handler
        chrome.runtime.onInstalled.addListener((details) => {
            this.handleInstall(details);
        });

        // Message handler - CRITICAL FIX
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            return this.handleMessage(request, sender, sendResponse);
        });

        // Context menu handler
        chrome.contextMenus.onClicked.addListener((info, tab) => {
            this.handleContextMenu(info, tab);
        });

        // Tab update handler for auto-summarization
        chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
            this.handleTabUpdate(tabId, changeInfo, tab);
        });

        // Storage change handler
        chrome.storage.onChanged.addListener((changes, namespace) => {
            this.handleStorageChange(changes, namespace);
        });

        // Setup context menus
        this.setupContextMenus();
    }

    async handleInstall(details) {
        if (details.reason === 'install') {
            // Set default settings
            await chrome.storage.sync.set({
                autoSummarize: false,
                floatingBtn: true,
                darkMode: false,
                contextMenu: true,
                summaryLength: 'medium',
                aiProvider: 'local',
                geminiApiKey: ''
            });

            // Initialize stats
            await chrome.storage.local.set({
                totalSummaries: 0,
                totalWordsProcessed: 0,
                summaryHistory: [],
                savedSummaries: []
            });

            // Open welcome page
            chrome.tabs.create({
                url: chrome.runtime.getURL('welcome.html')
            });
        }
    }

    // CRITICAL FIX: Proper async message handling
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
                return true; // Keep message channel open
                
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
                return true; // Keep message channel open
                
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

    async setupContextMenus() {
        try {
            // Remove existing menus
            await chrome.contextMenus.removeAll();

            const settings = await chrome.storage.sync.get(['contextMenu']);
            
            if (settings.contextMenu !== false) {
                // Main menu
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
                    id: 'separator1',
                    type: 'separator',
                    contexts: ['page', 'selection']
                });

                chrome.contextMenus.create({
                    id: 'extract-keypoints',
                    title: '🔑 Extract key points',
                    contexts: ['page', 'selection']
                });

                chrome.contextMenus.create({
                    id: 'quick-summary',
                    title: '⚡ Quick summary',
                    contexts: ['page']
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
                case 'quick-summary':
                    await this.executeContentScript(tab.id, 'quickSummary');
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
                                window.aiSummarizer.summarizeText(data);
                                break;
                            case 'extractKeyPoints':
                                window.aiSummarizer.extractKeyPoints(data);
                                break;
                            case 'quickSummary':
                                window.aiSummarizer.quickSummary();
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
                // Check if it's a readable page
                if (this.isReadablePage(tab.url)) {
                    // Delay to let page load completely
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
        
        // Handle setting changes
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

    async generateSummary(content, options = {}) {
        try {
            // Use AI service for summarization
            const result = await this.aiService.generateSummary(content, options);
            
            if (result.success) {
                // Update stats
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
                timeSaved: Math.floor((data.totalSummaries || 0) * 2.5), // Estimate 2.5 minutes per summary
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

// Initialize background service
new BackgroundService();