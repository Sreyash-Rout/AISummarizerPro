// AI Summarizer Pro - Content Script (COMPLETELY FIXED)
class AISummarizer {
    constructor() {
        this.apiKey = null;
        this.floatingButton = null;
        this.modal = null;
        this.selectionTooltip = null;
        this.isDarkMode = false;
        this.currentSelectedText = '';
        this.init();
    }

    async init() {
        try {
            const settings = await chrome.storage.sync.get([
                'floatingBtn', 
                'autoSummarize', 
                'darkMode', 
                'contextMenu'
            ]);

            this.isDarkMode = settings.darkMode || false;

            if (settings.floatingBtn !== false) {
                this.createFloatingButton();
            }

            if (settings.autoSummarize) {
                setTimeout(() => this.autoSummarize(), 3000);
            }

            chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
                return this.handleMessage(request, sender, sendResponse);
            });

            // FIXED: Better selection handling
            document.addEventListener('mouseup', (e) => this.handleTextSelection(e));
            document.addEventListener('keyup', (e) => this.handleTextSelection(e));
            document.addEventListener('touchend', (e) => this.handleTextSelection(e));

            this.createModal();
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
                return true;

            case 'extractKeyPoints':
                this.extractKeyPoints().then(result => {
                    sendResponse(result);
                }).catch(error => {
                    sendResponse({ success: false, error: error.message });
                });
                return true;

            case 'getPageContent':
                try {
                    const content = this.getCleanPageContent();
                    console.log('Content extracted, length:', content.length);
                    sendResponse({ 
                        success: true, 
                        content: content,
                        length: content.length 
                    });
                } catch (error) {
                    console.error('Error extracting content:', error);
                    sendResponse({ 
                        success: false, 
                        error: error.message 
                    });
                }
                break;

            case 'updateSetting':
                this.updateSetting(request.setting, request.value);
                sendResponse({ success: true });
                break;

            default:
                sendResponse({ success: false, error: 'Unknown action' });
        }
    }

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
                    setTimeout(() => this.autoSummarize(), 1000);
                }
                break;
        }
    }

    applyDarkMode(isDark) {
        if (isDark) {
            document.documentElement.style.setProperty('--ai-summarizer-bg', 'linear-gradient(135deg, #2d3748 0%, #1a202c 100%)');
            document.documentElement.style.setProperty('--ai-summarizer-text', '#e2e8f0');
        } else {
            document.documentElement.style.setProperty('--ai-summarizer-bg', 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)');
            document.documentElement.style.setProperty('--ai-summarizer-text', 'white');
        }
    }

    createFloatingButton() {
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
            const newStyle = currentStyle.replace(/background:[^;]+;/, themeStyle);
            this.floatingButton.style.cssText = newStyle;
        }
    }

    makeDraggable(element) {
        let isDragging = false;
        let currentX, currentY, initialX, initialY, xOffset = 0, yOffset = 0;

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
            max-width: 700px;
            width: 90%;
            max-height: 80%;
            overflow-y: auto;
            color: white;
            font-family: inherit;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
        `;

        modalContent.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h2 id="modal-title" style="margin: 0; font-size: 24px;">✨ AI Summary</h2>
                <button id="close-modal" style="background: none; border: none; color: white; font-size: 24px; cursor: pointer; padding: 5px;">×</button>
            </div>
            <div id="modal-loading" style="text-align: center; padding: 20px;">
                <div style="width: 40px; height: 40px; border: 3px solid rgba(255,255,255,0.3); border-top: 3px solid white; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 15px;"></div>
                <p id="loading-text">Analyzing content...</p>
            </div>
            <div id="modal-content" style="display: none;">
                <div id="summary-text" style="background: rgba(255,255,255,0.1); padding: 20px; border-radius: 10px; margin-bottom: 20px; line-height: 1.8; max-height: 400px; overflow-y: auto; white-space: pre-wrap; font-size: 14px;"></div>
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
                #ai-summarizer-modal .key-points {
                    list-style: none;
                    padding: 0;
                    margin: 0;
                }
                #ai-summarizer-modal .key-point {
                    display: flex;
                    align-items: flex-start;
                    margin-bottom: 12px;
                    padding: 8px 0;
                }
                #ai-summarizer-modal .key-point::before {
                    content: "•";
                    color: #4ecdc4;
                    font-weight: bold;
                    font-size: 18px;
                    margin-right: 12px;
                    margin-top: 2px;
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
        this.showModal('summary');
        const result = await this.summarizeContent('pageSum');
        if (result && result.success) {
            this.displayModalContent(result.summary, 'summary');
        } else {
            this.displayModalContent('❌ Unable to generate summary. ' + (result?.error || 'Please try on a page with more readable content.'), 'summary');
        }
    }

    showModal(type = 'summary') {
        this.modal.style.display = 'block';
        
        // Update title based on type
        const title = document.getElementById('modal-title');
        const loadingText = document.getElementById('loading-text');
        
        if (type === 'keypoints') {
            title.textContent = '🔑 Key Points';
            loadingText.textContent = 'Extracting key points...';
        } else {
            title.textContent = '✨ AI Summary';
            loadingText.textContent = 'Analyzing content...';
        }
        
        document.getElementById('modal-loading').style.display = 'block';
        document.getElementById('modal-content').style.display = 'none';
    }

    hideModal() {
        this.modal.style.display = 'none';
    }

    // FIXED: Better content display with proper formatting
    displayModalContent(content, type = 'summary') {
        document.getElementById('modal-loading').style.display = 'none';
        document.getElementById('modal-content').style.display = 'block';
        
        const summaryTextElement = document.getElementById('summary-text');
        
        if (type === 'keypoints') {
            // Format key points as proper bullet list
            const formattedContent = this.formatKeyPoints(content);
            summaryTextElement.innerHTML = formattedContent;
        } else {
            summaryTextElement.textContent = content;
        }
    }

    // FIXED: Proper key points formatting
    formatKeyPoints(content) {
        if (!content) return '';
        
        // Split by bullet points or newlines
        let points = content.split(/[•·\-\*]\s*/).filter(point => point.trim().length > 0);
        
        // If no bullets found, try splitting by newlines
        if (points.length <= 1) {
            points = content.split('\n').filter(point => point.trim().length > 0);
        }
        
        // Remove any remaining bullet characters and clean up
        points = points.map(point => {
            return point.replace(/^[•·\-\*\s]+/, '').trim();
        }).filter(point => point.length > 10); // Filter out very short points
        
        // Create HTML with proper bullet points
        const formattedPoints = points.map(point => {
            return `<div class="key-point">${point}</div>`;
        }).join('');
        
        return `<div class="key-points">${formattedPoints}</div>`;
    }

    copySummary() {
        const summaryTextElement = document.getElementById('summary-text');
        // Get plain text content for copying
        const summaryText = summaryTextElement.textContent || summaryTextElement.innerText;
        
        navigator.clipboard.writeText(summaryText).then(() => {
            const btn = document.getElementById('copy-summary');
            const originalText = btn.textContent;
            btn.textContent = '✅ Copied!';
            setTimeout(() => {
                btn.textContent = originalText;
            }, 2000);
        });
    }

    async saveSummary() {
        const summaryTextElement = document.getElementById('summary-text');
        const summaryText = summaryTextElement.textContent || summaryTextElement.innerText;
        
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
    }

    // FIXED: Get current selected text properly
    getSelectedText() {
        let selectedText = '';
        
        if (window.getSelection) {
            const selection = window.getSelection();
            selectedText = selection.toString();
        } else if (document.selection && document.selection.type !== 'Control') {
            selectedText = document.selection.createRange().text;
        }
        
        return selectedText.trim();
    }

    // FIXED: Improved text selection handling
    handleTextSelection(e) {
        // Small delay to ensure selection is complete
        setTimeout(() => {
            const selectedText = this.getSelectedText();
            this.currentSelectedText = selectedText;
            
            console.log('Selected text length:', selectedText.length);
            console.log('Selected text preview:', selectedText.substring(0, 100));
            
            if (selectedText && selectedText.length >= 20) {
                this.showSelectionTooltip();
            } else {
                this.hideSelectionTooltip();
            }
        }, 10);
    }

    // FIXED: Text summarization that actually works
    async summarizeText(text) {
        if (!text || text.trim().length < 20) {
            this.showModal('summary');
            this.displayModalContent('⚠️ Please select a longer passage of text to summarize (at least 20 characters).', 'summary');
            return;
        }

        console.log('Starting text summarization for:', text.substring(0, 100) + '...');
        
        this.showModal('summary');
        
        try {
            // Send selected text directly to background script
            const result = await new Promise((resolve, reject) => {
                const timeout = setTimeout(() => {
                    reject(new Error('Request timeout'));
                }, 30000); // 30 second timeout
                
                chrome.runtime.sendMessage({
                    action: 'getSummary',
                    content: text,
                    options: {
                        length: 'medium',
                        style: 'informative',
                        type: 'summary'
                    }
                }, (response) => {
                    clearTimeout(timeout);
                    
                    if (chrome.runtime.lastError) {
                        reject(new Error(chrome.runtime.lastError.message));
                        return;
                    }
                    
                    console.log('Background response for selected text:', response);
                    resolve(response);
                });
            });

            if (result && result.success) {
                this.displayModalContent(result.summary, 'summary');
                console.log('Summary generated successfully');
            } else {
                this.displayModalContent('❌ Failed to summarize selected text: ' + (result?.error || 'Unknown error'), 'summary');
            }
        } catch (error) {
            console.error('Error summarizing selected text:', error);
            this.displayModalContent('❌ Error summarizing selected text: ' + error.message, 'summary');
        }
    }

    // FIXED: Key points extraction that actually works
    async showKeyPointsForText(text) {
        if (!text || text.trim().length < 20) {
            this.showModal('keypoints');
            this.displayModalContent('⚠️ Please select a longer passage of text to extract key points (at least 20 characters).', 'keypoints');
            return;
        }

        console.log('Starting key points extraction for:', text.substring(0, 100) + '...');
        
        this.showModal('keypoints');
        
        try {
            // Send selected text directly to background script for key points
            const result = await new Promise((resolve, reject) => {
                const timeout = setTimeout(() => {
                    reject(new Error('Request timeout'));
                }, 30000); // 30 second timeout
                
                chrome.runtime.sendMessage({
                    action: 'getKeyPoints',
                    content: text,
                    options: {
                        length: 'medium',
                        style: 'bullet',
                        type: 'keypoints'
                    }
                }, (response) => {
                    clearTimeout(timeout);
                    
                    if (chrome.runtime.lastError) {
                        reject(new Error(chrome.runtime.lastError.message));
                        return;
                    }
                    
                    console.log('Background response for key points:', response);
                    resolve(response);
                });
            });

            if (result && result.success) {
                this.displayModalContent(result.keyPoints, 'keypoints');
                console.log('Key points generated successfully');
            } else {
                this.displayModalContent('❌ Failed to extract key points: ' + (result?.error || 'Unknown error'), 'keypoints');
            }
        } catch (error) {
            console.error('Error extracting key points from selected text:', error);
            this.displayModalContent('❌ Error extracting key points: ' + error.message, 'keypoints');
        }
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
                    content = this.getCleanPageContent();
                    break;
            }

            if (!content || content.length < 50) {
                return { success: false, error: 'Insufficient content to summarize' };
            }

            // Send to background script for summarization
            const result = await new Promise((resolve) => {
                chrome.runtime.sendMessage({
                    action: 'getSummary',
                    content: content,
                    options: {
                        length: mode === 'quickSum' ? 'short' : 'medium',
                        style: 'informative'
                    }
                }, (response) => {
                    resolve(response || { success: false, error: 'No response received' });
                });
            });

            return result;

        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async extractKeyPoints(selectedText = null) {
        try {
            const content = selectedText || this.getSelectedText() || this.getCleanPageContent();

            if (!content || content.length < 50) {
                return { success: false, error: 'Insufficient content to analyze' };
            }

            // Send to background script for key points extraction
            const result = await new Promise((resolve) => {
                chrome.runtime.sendMessage({
                    action: 'getKeyPoints',
                    content: content,
                    options: {
                        length: 'medium',
                        style: 'bullet'
                    }
                }, (response) => {
                    resolve(response || { success: false, error: 'No response received' });
                });
            });

            return {
                success: result.success,
                keyPoints: result.keyPoints || result.summary,
                provider: result.provider
            };

        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // Method specifically for showing key points in modal
    async showKeyPoints(selectedText = null) {
        try {
            // Show modal first
            this.showModal('keypoints');
            
            // Get key points
            const result = await this.extractKeyPoints(selectedText);
            
            if (result && result.success) {
                this.displayModalContent(result.keyPoints, 'keypoints');
            } else {
                const errorMsg = '❌ Unable to extract key points. ' + (result?.error || '');
                this.displayModalContent(errorMsg, 'keypoints');
            }

        } catch (error) {
            const errorMsg = '❌ Error extracting key points: ' + error.message;
            this.displayModalContent(errorMsg, 'keypoints');
        }
    }

    // IMPROVED: Better content extraction that filters out junk
    getCleanPageContent() {
        // Remove scripts, styles, and other non-content elements
        const clone = document.cloneNode(true);
        
        // Remove unwanted elements
        const unwantedSelectors = [
            'script', 'style', 'nav', 'footer', 'aside', 'header',
            '.ad', '.advertisement', '.ads', '.sidebar', '.menu',
            '.navigation', '.breadcrumb', '.share', '.social',
            '.comments', '.comment', '.popup', '.modal', '.overlay',
            '.cookie', '.banner', '.notification', '[class*="ad-"]',
            '[id*="ad-"]', '[class*="advertisement"]', '[id*="advertisement"]'
        ];
        
        unwantedSelectors.forEach(selector => {
            try {
                const elements = clone.querySelectorAll(selector);
                elements.forEach(el => el.remove());
            } catch (e) {
                // Ignore selector errors
            }
        });

        // Priority content selectors (in order of preference)
        const contentSelectors = [
            'article',
            '[role="main"]',
            'main',
            '.post-content',
            '.entry-content',
            '.article-content',
            '.content',
            '.main-content',
            '.post-body',
            '.article-body',
            '.story-body'
        ];

        let content = '';

        // Try to find main content area
        for (const selector of contentSelectors) {
            try {
                const element = clone.querySelector(selector);
                if (element) {
                    content = this.extractTextFromElement(element);
                    if (content.length > 200) { // Minimum content threshold
                        break;
                    }
                }
            } catch (e) {
                // Continue to next selector
            }
        }

        // Fallback to body if no specific content area found
        if (!content || content.length < 200) {
            if (clone.body) {
                content = this.extractTextFromElement(clone.body);
            }
        }

        return this.cleanText(content);
    }

    extractTextFromElement(element) {
        if (!element) return '';
        
        // Get text content while preserving some structure
        let text = '';
        
        // Walk through text nodes and important elements
        const walker = document.createTreeWalker(
            element,
            NodeFilter.SHOW_TEXT,
            {
                acceptNode: (node) => {
                    // Skip text in unwanted elements
                    const parent = node.parentElement;
                    if (!parent) return NodeFilter.FILTER_REJECT;
                    
                    const tagName = parent.tagName.toLowerCase();
                    if (['script', 'style', 'nav', 'footer', 'aside'].includes(tagName)) {
                        return NodeFilter.FILTER_REJECT;
                    }
                    
                    return NodeFilter.FILTER_ACCEPT;
                }
            }
        );

        let node;
        while (node = walker.nextNode()) {
            const textContent = node.textContent.trim();
            if (textContent.length > 3) { // Skip very short text
                text += textContent + ' ';
            }
        }

        return text;
    }

    cleanText(text) {
        return text
            .replace(/\s+/g, ' ')           // Multiple spaces to single space
            .replace(/\n\s*\n/g, '\n')      // Multiple newlines to single newline
            .replace(/[^\w\s\.\!\?\,\;\:\-\(\)\[\]\"\']/g, ' ') // Remove special chars but keep punctuation
            .trim();
    }

    // FIXED: Better tooltip that actually works
    showSelectionTooltip() {
        this.hideSelectionTooltip();

        const selection = window.getSelection();
        if (selection.rangeCount === 0) return;

        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();

        // Position tooltip above the selection
        const tooltip = document.createElement('div');
        tooltip.id = 'ai-summarizer-tooltip';
        tooltip.style.cssText = `
            position: fixed;
            top: ${rect.top - 55}px;
            left: ${rect.left + rect.width / 2 - 85}px;
            background: linear-gradient(45deg, #667eea, #764ba2);
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
            display: flex;
            gap: 15px;
            align-items: center;
        `;

        // Create clickable buttons
        const summarizeBtn = document.createElement('span');
        summarizeBtn.textContent = '✨ Summarize';
        summarizeBtn.style.cssText = `
            cursor: pointer; 
            padding: 4px 8px; 
            border-radius: 8px; 
            transition: background 0.2s;
            border: 1px solid rgba(255,255,255,0.3);
        `;
        
        summarizeBtn.addEventListener('mouseenter', () => {
            summarizeBtn.style.background = 'rgba(255,255,255,0.2)';
        });
        summarizeBtn.addEventListener('mouseleave', () => {
            summarizeBtn.style.background = 'transparent';
        });
        summarizeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            e.preventDefault();
            const selectedText = this.currentSelectedText || this.getSelectedText();
            console.log('Tooltip summarize clicked, text length:', selectedText.length);
            this.hideSelectionTooltip();
            // Clear selection to avoid conflicts
            if (window.getSelection) {
                window.getSelection().removeAllRanges();
            }
            this.summarizeText(selectedText);
        });

        const keyPointsBtn = document.createElement('span');
        keyPointsBtn.textContent = '🔑 Key Points';
        keyPointsBtn.style.cssText = `
            cursor: pointer; 
            padding: 4px 8px; 
            border-radius: 8px; 
            transition: background 0.2s;
            border: 1px solid rgba(255,255,255,0.3);
        `;
        
        keyPointsBtn.addEventListener('mouseenter', () => {
            keyPointsBtn.style.background = 'rgba(255,255,255,0.2)';
        });
        keyPointsBtn.addEventListener('mouseleave', () => {
            keyPointsBtn.style.background = 'transparent';
        });
        keyPointsBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            e.preventDefault();
            const selectedText = this.currentSelectedText || this.getSelectedText();
            console.log('Tooltip key points clicked, text length:', selectedText.length);
            this.hideSelectionTooltip();
            // Clear selection to avoid conflicts
            if (window.getSelection) {
                window.getSelection().removeAllRanges();
            }
            this.showKeyPointsForText(selectedText);
        });

        tooltip.appendChild(summarizeBtn);
        tooltip.appendChild(keyPointsBtn);

        document.body.appendChild(tooltip);
        this.selectionTooltip = tooltip;

        // Auto-hide after 8 seconds
        setTimeout(() => this.hideSelectionTooltip(), 8000);
    }

    hideSelectionTooltip() {
        if (this.selectionTooltip) {
            this.selectionTooltip.remove();
            this.selectionTooltip = null;
        }
    }

    async autoSummarize() {
        const isArticle = document.querySelector('article') ||
            document.querySelector('[role="main"]') ||
            document.querySelector('.post-content') ||
            document.querySelector('.entry-content');

        if (!isArticle) return;

        const content = this.getCleanPageContent();
        if (content.length < 500) return;

        this.showAutoSummaryNotification();
    }

    showAutoSummaryNotification() {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: linear-gradient(45deg, #667eea, #764ba2);
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

        setTimeout(() => {
            if (notification.parentNode) {
                notification.style.animation = 'slideOutUp 0.5s ease';
                setTimeout(() => notification.remove(), 500);
            }
        }, 5000);
    }

    // Public methods for background script
    quickSummary() {
        this.showQuickSummary();
    }

    summarizePage() {
        this.showQuickSummary();
    }

    summarizeSelection(text) {
        if (text && text.length > 20) {
            this.summarizeText(text);
        } else {
            const currentSelection = this.getSelectedText();
            if (currentSelection && currentSelection.length > 20) {
                this.summarizeText(currentSelection);
            } else {
                this.showModal('summary');
                this.displayModalContent('⚠️ No text selected or selection too short. Please select at least 20 characters.', 'summary');
            }
        }
    }

    extractKeyPointsFromSelection(text) {
        if (text && text.length > 20) {
            this.showKeyPointsForText(text);
        } else {
            const currentSelection = this.getSelectedText();
            if (currentSelection && currentSelection.length > 20) {
                this.showKeyPointsForText(currentSelection);
            } else {
                this.showModal('keypoints');
                this.displayModalContent('⚠️ No text selected or selection too short. Please select at least 20 characters.', 'keypoints');
            }
        }
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