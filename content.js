// AI Summarizer Pro - Content Script
class AISummarizer {
    constructor() {
        this.apiKey = null;
        this.floatingButton = null;
        this.modal = null;
        this.selectionTooltip = null;
        this.isDarkMode = false;
        this.init();
    }

    async init() {
        try {
            // Load settings
            const settings = await chrome.storage.sync.get([
                'floatingBtn', 
                'autoSummarize', 
                'darkMode', 
                'contextMenu'
            ]);

            // Apply dark mode
            this.isDarkMode = settings.darkMode || false;

            // Create components based on settings
            if (settings.floatingBtn !== false) {
                this.createFloatingButton();
            }

            if (settings.autoSummarize) {
                setTimeout(() => this.autoSummarize(), 3000);
            }

            // Listen for messages from popup and background
            chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
                return this.handleMessage(request, sender, sendResponse);
            });

            // Listen for text selection
            document.addEventListener('mouseup', () => this.handleTextSelection());
            document.addEventListener('selectionchange', () => this.handleSelectionChange());

            // Initialize modal
            this.createModal();

            // Make available globally for background script
            window.aiSummarizer = this;

        } catch (error) {
            console.error('AI Summarizer initialization error:', error);
        }
    }

    handleMessage(request, sender, sendResponse) {
        switch (request.action) {
            case 'summarize':
                this.summarizeContent(request.mode).then(result => {
                    sendResponse(result);
                }).catch(error => {
                    sendResponse({ success: false, error: error.message });
                });
                return true; // Keep message channel open for async response

            case 'extractKeyPoints':
                this.extractKeyPoints().then(result => {
                    sendResponse(result);
                }).catch(error => {
                    sendResponse({ success: false, error: error.message });
                });
                return true;

            case 'updateSetting':
                this.updateSetting(request.setting, request.value);
                sendResponse({ success: true });
                break;

            default:
                sendResponse({ success: false, error: 'Unknown action' });
        }
    }

    // Handle setting updates from popup
    updateSetting(setting, value) {
        switch (setting) {
            case 'floatingBtn':
                if (value) {
                    if (!this.floatingButton) {
                        this.createFloatingButton();
                    }
                } else {
                    if (this.floatingButton) {
                        this.floatingButton.remove();
                        this.floatingButton = null;
                    }
                }
                break;

            case 'darkMode':
                this.isDarkMode = value;
                this.applyDarkMode(value);
                if (this.modal) {
                    this.updateModalTheme();
                }
                if (this.floatingButton) {
                    this.updateFloatingButtonTheme();
                }
                break;

            case 'autoSummarize':
                if (value) {
                    // Auto-summarize is now enabled
                    setTimeout(() => this.autoSummarize(), 1000);
                }
                break;
        }
    }

    applyDarkMode(isDark) {
        if (isDark) {
            document.documentElement.style.setProperty('--ai-summarizer-bg', 'linear-gradient(135deg, #2d3748 0%, #1a202c 100%)');
            document.documentElement.style.setProperty('--ai-summarizer-text', '#e2e8f0');
            document.documentElement.style.setProperty('--ai-summarizer-accent', 'rgba(255,255,255,0.1)');
        } else {
            document.documentElement.style.setProperty('--ai-summarizer-bg', 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)');
            document.documentElement.style.setProperty('--ai-summarizer-text', 'white');
            document.documentElement.style.setProperty('--ai-summarizer-accent', 'rgba(255,255,255,0.1)');
        }
    }

    createFloatingButton() {
        // Remove existing button
        if (this.floatingButton) {
            this.floatingButton.remove();
        }

        const button = document.createElement('div');
        button.id = 'ai-summarizer-floating-btn';
        button.innerHTML = '✨';
        
        const baseStyles = `
            position: fixed;
            top: 20px;
            right: 20px;
            width: 50px;
            height: 50px;
            color: white;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            z-index: 10000;
            font-size: 20px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.3);
            transition: all 0.3s ease;
            user-select: none;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        `;
        
        button.style.cssText = baseStyles + this.getThemeStyles();

        button.addEventListener('mouseenter', () => {
            button.style.transform = 'scale(1.1)';
            button.style.boxShadow = '0 6px 25px rgba(0,0,0,0.4)';
        });

        button.addEventListener('mouseleave', () => {
            button.style.transform = 'scale(1)';
            button.style.boxShadow = '0 4px 20px rgba(0,0,0,0.3)';
        });

        button.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.showQuickSummary();
        });

        // Make draggable
        this.makeDraggable(button);

        document.body.appendChild(button);
        this.floatingButton = button;
    }

    getThemeStyles() {
        if (this.isDarkMode) {
            return 'background: linear-gradient(135deg, #4a5568 0%, #2d3748 100%);';
        } else {
            return 'background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);';
        }
    }

    updateFloatingButtonTheme() {
        if (this.floatingButton) {
            const themeStyle = this.getThemeStyles();
            const currentStyle = this.floatingButton.style.cssText;
            // Replace background style
            const newStyle = currentStyle.replace(/background:[^;]+;/, themeStyle);
            this.floatingButton.style.cssText = newStyle;
        }
    }

    makeDraggable(element) {
        let isDragging = false;
        let currentX;
        let currentY;
        let initialX;
        let initialY;
        let xOffset = 0;
        let yOffset = 0;

        element.addEventListener('mousedown', (e) => {
            if (e.target === element) {
                initialX = e.clientX - xOffset;
                initialY = e.clientY - yOffset;
                isDragging = true;
                element.style.cursor = 'grabbing';
            }
        });

        document.addEventListener('mousemove', (e) => {
            if (isDragging) {
                e.preventDefault();
                currentX = e.clientX - initialX;
                currentY = e.clientY - initialY;
                xOffset = currentX;
                yOffset = currentY;
                element.style.transform = `translate(${currentX}px, ${currentY}px)`;
            }
        });

        document.addEventListener('mouseup', () => {
            if (isDragging) {
                isDragging = false;
                element.style.cursor = 'pointer';
            }
        });
    }

    createModal() {
        const modal = document.createElement('div');
        modal.id = 'ai-summarizer-modal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.8);
            display: none;
            z-index: 10001;
            backdrop-filter: blur(5px);
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        `;

        const modalContent = document.createElement('div');
        modalContent.className = 'modal-content';
        
        const modalBg = this.isDarkMode ? 
            'linear-gradient(135deg, #2d3748 0%, #1a202c 100%)' : 
            'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
            
        modalContent.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: ${modalBg};
            padding: 30px;
            border-radius: 20px;
            max-width: 600px;
            width: 90%;
            max-height: 80%;
            overflow-y: auto;
            color: white;
            font-family: inherit;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
        `;

        modalContent.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h2 style="margin: 0; font-size: 24px;">✨ AI Summary</h2>
                <button id="close-modal" style="background: none; border: none; color: white; font-size: 24px; cursor: pointer; padding: 5px;">×</button>
            </div>
            <div id="modal-loading" style="text-align: center; padding: 20px;">
                <div style="width: 40px; height: 40px; border: 3px solid rgba(255,255,255,0.3); border-top: 3px solid white; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 15px;"></div>
                <p>Analyzing content...</p>
            </div>
            <div id="modal-content" style="display: none;">
                <div id="summary-text" style="background: rgba(255,255,255,0.1); padding: 20px; border-radius: 10px; margin-bottom: 20px; line-height: 1.6; max-height: 300px; overflow-y: auto;"></div>
                <div style="display: flex; gap: 10px;">
                    <button id="copy-summary" style="flex: 1; padding: 10px; background: linear-gradient(45deg, #4ecdc4, #44a08d); border: none; border-radius: 8px; color: white; cursor: pointer; font-weight: 600;">📋 Copy</button>
                    <button id="save-summary" style="flex: 1; padding: 10px; background: linear-gradient(45deg, #ff6b6b, #ee5a52); border: none; border-radius: 8px; color: white; cursor: pointer; font-weight: 600;">💾 Save</button>
                </div>
            </div>
        `;

        modal.appendChild(modalContent);
        document.body.appendChild(modal);
        this.modal = modal;

        // Add CSS animation
        if (!document.getElementById('ai-summarizer-styles')) {
            const style = document.createElement('style');
            style.id = 'ai-summarizer-styles';
            style.textContent = `
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                @keyframes fadeInUp {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @keyframes slideInDown {
                    from { opacity: 0; transform: translateY(-30px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @keyframes slideOutUp {
                    from { opacity: 1; transform: translateY(0); }
                    to { opacity: 0; transform: translateY(-30px); }
                }
            `;
            document.head.appendChild(style);
        }

        // Event listeners
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.hideModal();
            }
        });

        modalContent.querySelector('#close-modal').addEventListener('click', () => {
            this.hideModal();
        });

        modalContent.querySelector('#copy-summary').addEventListener('click', () => {
            this.copySummary();
        });

        modalContent.querySelector('#save-summary').addEventListener('click', () => {
            this.saveSummary();
        });
    }

    updateModalTheme() {
        if (this.modal) {
            const modalContent = this.modal.querySelector('.modal-content');
            if (modalContent) {
                const modalBg = this.isDarkMode ? 
                    'linear-gradient(135deg, #2d3748 0%, #1a202c 100%)' : 
                    'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
                modalContent.style.background = modalBg;
            }
        }
    }

    async showQuickSummary() {
        this.showModal();
        const result = await this.summarizeContent('pageSum');
        if (result && result.success) {
            this.displayModalSummary(result.summary);
        } else {
            this.displayModalSummary('❌ Unable to generate summary. ' + (result?.error || 'Please try on a page with more readable content.'));
        }
    }

    showModal() {
        this.modal.style.display = 'block';
        document.getElementById('modal-loading').style.display = 'block';
        document.getElementById('modal-content').style.display = 'none';
    }

    hideModal() {
        this.modal.style.display = 'none';
    }

    displayModalSummary(summary) {
        document.getElementById('modal-loading').style.display = 'none';
        document.getElementById('modal-content').style.display = 'block';
        document.getElementById('summary-text').textContent = summary;
    }

    copySummary() {
        const summaryText = document.getElementById('summary-text').textContent;
        navigator.clipboard.writeText(summaryText).then(() => {
            const btn = document.getElementById('copy-summary');
            const originalText = btn.textContent;
            btn.textContent = '✅ Copied!';
            setTimeout(() => {
                btn.textContent = originalText;
            }, 2000);
        }).catch(error => {
            console.error('Copy failed:', error);
        });
    }

    async saveSummary() {
        try {
            const summaryText = document.getElementById('summary-text').textContent;
            const data = await chrome.storage.local.get(['savedSummaries']);
            const saved = data.savedSummaries || [];

            saved.unshift({
                summary: summaryText,
                url: window.location.href,
                title: document.title,
                timestamp: Date.now()
            });

            await chrome.storage.local.set({ savedSummaries: saved });

            const btn = document.getElementById('save-summary');
            const originalText = btn.textContent;
            btn.textContent = '✅ Saved!';
            setTimeout(() => {
                btn.textContent = originalText;
            }, 2000);
        } catch (error) {
            console.error('Save failed:', error);
        }
    }

    async summarizeText(text) {
        if (!text || text.trim().length < 20) {
            this.showModal();
            this.displayModalSummary('⚠️ Please select a longer passage of text to summarize.');
            return;
        }
        this.showModal();
        const result = await this.summarizeRawText(text);
        this.displayModalSummary(result.summary || '❌ Failed to generate summary.');
    }

    async summarizeRawText(text) {
        return await new Promise((resolve) => {
            chrome.runtime.sendMessage({
                action: 'getSummary',
                content: text,
                options: {
                    length: 'medium',
                    style: 'informative'
                }
            }, (response) => {
                if (chrome.runtime.lastError) {
                    resolve({ success: false, error: chrome.runtime.lastError.message });
                } else {
                    resolve(response || { success: false, error: 'No response received' });
                }
            });
        });
    }

    async summarizeContent(mode = 'pageSum') {
        try {
            let content = '';

            switch (mode) {
                case 'selectedSum':
                    content = this.getSelectedText();
                    if (!content) {
                        return { success: false, error: 'No text selected' };
                    }
                    break;
                case 'pageSum':
                default:
                    content = this.getPageContent();
                    break;
            }

            if (!content || content.length < 50) {
                return { success: false, error: 'Insufficient content to summarize' };
            }

            // Send to background script for AI processing
            const result = await new Promise((resolve) => {
                chrome.runtime.sendMessage({
                    action: 'getSummary',
                    content: content,
                    options: {
                        length: mode === 'quickSum' ? 'short' : 'medium',
                        style: 'informative'
                    }
                }, (response) => {
                    if (chrome.runtime.lastError) {
                        resolve({ success: false, error: chrome.runtime.lastError.message });
                    } else if (!response) {
                        resolve({ success: false, error: 'No response received from background script' });
                    } else {
                        resolve(response);
                    }
                });
            });

            return result;

        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async extractKeyPoints() {
        try {
            const content = this.getSelectedText() || this.getPageContent();

            if (!content || content.length < 50) {
                return { success: false, error: 'Insufficient content to analyze' };
            }

            // Try AI-powered key point extraction first
            const result = await new Promise((resolve) => {
                chrome.runtime.sendMessage({
                    action: 'getSummary',
                    content: content,
                    options: {
                        length: 'medium',
                        style: 'bullet'
                    }
                }, (response) => {
                    if (chrome.runtime.lastError) {
                        resolve({ success: false, error: chrome.runtime.lastError.message });
                    } else {
                        resolve(response || { success: false, error: 'No response received' });
                    }
                });
            });

            if (result && result.success) {
                return {
                    success: true,
                    keyPoints: result.summary
                };
            }

            // Fallback to local extraction
            const keyPoints = this.extractKeyPointsFromText(content);

            return {
                success: true,
                keyPoints: keyPoints.join('\n\n')
            };

        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    getPageContent() {
        // Remove script and style elements
        const clone = document.cloneNode(true);
        const scripts = clone.querySelectorAll('script, style, nav, footer, aside, .ad, .advertisement, #ai-summarizer-floating-btn, #ai-summarizer-modal');
        scripts.forEach(el => el.remove());

        // Priority content selectors
        const contentSelectors = [
            'article',
            '[role="main"]',
            '.content',
            '.post-content',
            '.entry-content',
            '.article-content',
            'main',
            '.main-content',
            '.story-body',
            '.article-body'
        ];

        let content = '';

        // Try to find main content area
        for (const selector of contentSelectors) {
            const element = clone.querySelector(selector);
            if (element) {
                content = element.textContent || element.innerText || '';
                break;
            }
        }

        // Fallback to body content
        if (!content) {
            content = clone.body ? (clone.body.textContent || clone.body.innerText || '') : '';
        }

        // Clean up the content
        return this.cleanText(content);
    }

    getSelectedText() {
        const selection = window.getSelection();
        return selection.toString().trim();
    }

    cleanText(text) {
        return text
            .replace(/\s+/g, ' ')
            .replace(/\n\s*\n/g, '\n')
            .replace(/[^\w\s.,!?;:()\-"']/g, '') // Remove unusual characters
            .trim();
    }

    extractKeyPointsFromText(text) {
        const sentences = text.match(/[^.!?]+[.!?]+/g) || [];
        const keyPoints = [];

        // Look for sentences with key indicators
        const keyIndicators = [
            /(?:key|main|important|significant|primary|essential|critical)/i,
            /(?:first|second|third|finally|lastly|in conclusion)/i,
            /(?:\d+[.)]|\•|·|→|⇒)/,
            /(?:benefit|advantage|problem|issue|solution|result|outcome)/i,
            /(?:because|since|therefore|thus|consequently|however|although)/i
        ];

        sentences.forEach(sentence => {
            const trimmed = sentence.trim();
            if (trimmed.length < 20 || trimmed.length > 200) return;

            let score = 0;
            keyIndicators.forEach(pattern => {
                if (pattern.test(trimmed)) score++;
            });

            if (score > 0) {
                keyPoints.push(`• ${trimmed}`);
            }
        });

        // If no key points found, extract first few sentences
        if (keyPoints.length === 0) {
            return sentences.slice(0, 5).map(s => `• ${s.trim()}`);
        }

        return keyPoints.slice(0, 8);
    }

    handleTextSelection() {
        setTimeout(() => {
            const selectedText = this.getSelectedText();
            if (selectedText && selectedText.length > 20) {
                this.showSelectionTooltip();
            } else {
                this.hideSelectionTooltip();
            }
        }, 100);
    }

    handleSelectionChange() {
        // Hide tooltip when selection changes
        setTimeout(() => {
            const selectedText = this.getSelectedText();
            if (!selectedText || selectedText.length <= 20) {
                this.hideSelectionTooltip();
            }
        }, 100);
    }

    showSelectionTooltip() {
        // Remove existing tooltip
        this.hideSelectionTooltip();

        const selection = window.getSelection();
        if (selection.rangeCount === 0) return;

        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();

        const tooltip = document.createElement('div');
        tooltip.id = 'ai-summarizer-tooltip';
        tooltip.innerHTML = '✨ Summarize';
        
        const tooltipBg = this.isDarkMode ? 
            'linear-gradient(45deg, #4a5568, #2d3748)' : 
            'linear-gradient(45deg, #667eea, #764ba2)';
            
        tooltip.style.cssText = `
            position: absolute;
            top: ${window.scrollY + rect.top - 35}px;
            left: ${window.scrollX + rect.left + rect.width / 2 - 50}px;
            background: ${tooltipBg};
            color: white;
            padding: 8px 15px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 600;
            cursor: pointer;
            z-index: 10000;
            box-shadow: 0 4px 15px rgba(0,0,0,0.3);
            font-family: 'Segoe UI', sans-serif;
            user-select: none;
            animation: fadeInUp 0.3s ease;
        `;

        tooltip.addEventListener('click', async () => {
            this.hideSelectionTooltip();
            const selectedText = this.getSelectedText();
            await this.summarizeText(selectedText);
        });

        document.body.appendChild(tooltip);
        this.selectionTooltip = tooltip;

        // Auto-hide after 5 seconds
        setTimeout(() => this.hideSelectionTooltip(), 5000);
    }

    hideSelectionTooltip() {
        if (this.selectionTooltip) {
            this.selectionTooltip.remove();
            this.selectionTooltip = null;
        }
    }

    async autoSummarize() {
        // Only auto-summarize on article pages
        const isArticle = document.querySelector('article') ||
            document.querySelector('[role="main"]') ||
            document.querySelector('.post-content') ||
            document.querySelector('.entry-content') ||
            document.querySelector('.story-body') ||
            document.querySelector('.article-body');

        if (!isArticle) return;

        const content = this.getPageContent();
        if (content.length < 500) return; // Too short to be worth summarizing

        // Check if this is a readable URL
        if (!this.isReadableUrl(window.location.href)) return;

        // Show notification
        this.showAutoSummaryNotification();
    }

    isReadableUrl(url) {
        const readablePatterns = [
            /\/article/i,
            /\/blog/i,
            /\/news/i,
            /\/post/i,
            /\/story/i,
            /medium\.com/i,
            /\.html$/i
        ];

        const unreadablePatterns = [
            /google\.com\/search/i,
            /youtube\.com/i,
            /facebook\.com/i,
            /twitter\.com/i,
            /instagram\.com/i,
            /tiktok\.com/i,
            /reddit\.com\/r\/[^\/]+\/?$/i // Reddit main pages
        ];

        return readablePatterns.some(pattern => pattern.test(url)) &&
               !unreadablePatterns.some(pattern => pattern.test(url));
    }

    showAutoSummaryNotification() {
        // Remove existing notification
        const existing = document.getElementById('ai-summarizer-auto-notification');
        if (existing) existing.remove();

        const notification = document.createElement('div');
        notification.id = 'ai-summarizer-auto-notification';
        
        const notificationBg = this.isDarkMode ? 
            'linear-gradient(45deg, #4a5568, #2d3748)' : 
            'linear-gradient(45deg, #667eea, #764ba2)';
            
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: ${notificationBg};
            color: white;
            padding: 15px 25px;
            border-radius: 25px;
            font-family: 'Segoe UI', sans-serif;
            font-size: 14px;
            font-weight: 600;
            z-index: 10000;
            box-shadow: 0 4px 20px rgba(0,0,0,0.3);
            cursor: pointer;
            animation: slideInDown 0.5s ease;
        `;

        notification.innerHTML = '✨ Click to get AI summary of this page';

        notification.addEventListener('click', () => {
            notification.remove();
            this.showQuickSummary();
        });

        document.body.appendChild(notification);

        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.style.animation = 'slideOutUp 0.5s ease';
                setTimeout(() => {
                    if (notification.parentNode) {
                        notification.remove();
                    }
                }, 500);
            }
        }, 5000);
    }
}

// Initialize the summarizer when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        new AISummarizer();
    });
} else {
    new AISummarizer();
}