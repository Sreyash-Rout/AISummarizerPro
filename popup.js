// AI Summarizer Pro - Popup Script
class PopupController {
    constructor() {
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadInitialData();
    }

    setupEventListeners() {
        // Tab switching
        document.querySelectorAll('.tab').forEach(tab => {
            tab.addEventListener('click', () => this.switchTab(tab));
        });

        // Toggle switches - FIXED
        document.querySelectorAll('.toggle').forEach(toggle => {
            toggle.addEventListener('click', () => this.handleToggle(toggle));
        });

        // Feature cards
        document.querySelectorAll('.feature-card').forEach(card => {
            card.addEventListener('click', () => this.selectFeature(card));
        });

        // Main action buttons
        document.getElementById('summarizeBtn').addEventListener('click', () => this.handleSummarize());
        document.getElementById('keyPointsBtn').addEventListener('click', () => this.handleKeyPoints());
        document.getElementById('copyBtn').addEventListener('click', () => this.handleCopy());
        document.getElementById('exportBtn').addEventListener('click', () => this.handleExport());
        document.getElementById('clearDataBtn').addEventListener('click', () => this.handleClearData());
        
        // AI Provider settings
        document.getElementById('aiProvider').addEventListener('change', (e) => this.handleProviderChange(e));
        document.getElementById('saveApiKey').addEventListener('click', () => this.handleSaveApiKey());
        document.getElementById('geminiApiKey').addEventListener('input', (e) => this.handleApiKeyInput(e));
    }

    switchTab(tab) {
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        
        tab.classList.add('active');
        document.getElementById(tab.dataset.tab).classList.add('active');
    }

    // FIXED: Toggle handling with proper functionality
    async handleToggle(toggle) {
        const setting = toggle.id;
        const wasActive = toggle.classList.contains('active');
        const isActive = !wasActive;
        
        // Update UI immediately
        if (isActive) {
            toggle.classList.add('active');
        } else {
            toggle.classList.remove('active');
        }
        
        try {
            // Save setting to storage
            await chrome.storage.sync.set({ [setting]: isActive });
            
            // Handle specific toggle functionalities
            await this.handleToggleFeature(setting, isActive);
            
            console.log(`${setting} toggled to:`, isActive);
            
        } catch (error) {
            console.error(`Error handling ${setting} toggle:`, error);
            // Revert UI on error
            if (wasActive) {
                toggle.classList.add('active');
            } else {
                toggle.classList.remove('active');
            }
        }
    }

    // Handle specific toggle features
    async handleToggleFeature(setting, isActive) {
        switch (setting) {
            case 'floatingBtn':
                await this.handleFloatingButtonToggle(isActive);
                break;
                
            case 'autoSummarize':
                await this.handleAutoSummarizeToggle(isActive);
                break;
                
            case 'contextMenu':
                await this.handleContextMenuToggle(isActive);
                break;
                
            case 'darkMode':
                await this.handleDarkModeToggle(isActive);
                break;
        }
    }

    // Floating button toggle
    async handleFloatingButtonToggle(isActive) {
        try {
            // Send message to all active tabs
            const tabs = await chrome.tabs.query({});
            
            for (const tab of tabs) {
                try {
                    await chrome.tabs.sendMessage(tab.id, {
                        action: 'updateSetting',
                        setting: 'floatingBtn',
                        value: isActive
                    });
                } catch (error) {
                    // Tab might not have content script, ignore
                    console.log(`Could not update tab ${tab.id}:`, error.message);
                }
            }
            
            // Also send to background script
            chrome.runtime.sendMessage({
                action: 'updateSetting',
                setting: 'floatingBtn',
                value: isActive
            });
            
        } catch (error) {
            console.error('Error toggling floating button:', error);
        }
    }

    // Auto-summarize toggle
    async handleAutoSummarizeToggle(isActive) {
        try {
            chrome.runtime.sendMessage({
                action: 'updateSetting',
                setting: 'autoSummarize',
                value: isActive
            });
            
            if (isActive) {
                this.showTemporaryMessage('Auto-summarize enabled! New pages will show summary notifications.');
            } else {
                this.showTemporaryMessage('Auto-summarize disabled.');
            }
            
        } catch (error) {
            console.error('Error toggling auto-summarize:', error);
        }
    }

    // Context menu toggle
    async handleContextMenuToggle(isActive) {
        try {
            chrome.runtime.sendMessage({
                action: 'updateSetting',
                setting: 'contextMenu',
                value: isActive
            });
            
            if (isActive) {
                this.showTemporaryMessage('Context menu enabled! Right-click on pages to summarize.');
            } else {
                this.showTemporaryMessage('Context menu disabled.');
            }
            
        } catch (error) {
            console.error('Error toggling context menu:', error);
        }
    }

    // Dark mode toggle
    async handleDarkModeToggle(isActive) {
        try {
            // Apply dark mode to popup immediately
            if (isActive) {
                document.body.style.background = 'linear-gradient(135deg, #2d3748 0%, #1a202c 100%)';
                document.body.style.color = '#e2e8f0';
            } else {
                document.body.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
                document.body.style.color = 'white';
            }
            
            // Send to content scripts
            const tabs = await chrome.tabs.query({});
            for (const tab of tabs) {
                try {
                    await chrome.tabs.sendMessage(tab.id, {
                        action: 'updateSetting',
                        setting: 'darkMode',
                        value: isActive
                    });
                } catch (error) {
                    // Ignore tabs without content script
                }
            }
            
            this.showTemporaryMessage(isActive ? 'Dark mode enabled!' : 'Dark mode disabled!');
            
        } catch (error) {
            console.error('Error toggling dark mode:', error);
        }
    }

    // Show temporary message
    showTemporaryMessage(message) {
        const messageDiv = document.createElement('div');
        messageDiv.style.cssText = `
            position: fixed;
            top: 10px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(0, 255, 0, 0.8);
            color: white;
            padding: 8px 16px;
            border-radius: 20px;
            font-size: 12px;
            z-index: 10000;
            animation: fadeInOut 3s ease-in-out;
        `;
        messageDiv.textContent = message;
        
        // Add animation
        const style = document.createElement('style');
        style.textContent = `
            @keyframes fadeInOut {
                0% { opacity: 0; transform: translateX(-50%) translateY(-10px); }
                20% { opacity: 1; transform: translateX(-50%) translateY(0); }
                80% { opacity: 1; transform: translateX(-50%) translateY(0); }
                100% { opacity: 0; transform: translateX(-50%) translateY(-10px); }
            }
        `;
        document.head.appendChild(style);
        
        document.body.appendChild(messageDiv);
        
        setTimeout(() => {
            if (messageDiv.parentNode) {
                messageDiv.remove();
            }
            if (style.parentNode) {
                style.remove();
            }
        }, 3000);
    }

    selectFeature(card) {
        // Remove active class from all cards
        document.querySelectorAll('.feature-card').forEach(c => c.classList.remove('active'));
        card.classList.add('active');
        
        // Store selected mode
        chrome.storage.local.set({ summaryMode: card.id });
    }

    async handleSummarize() {
        try {
            this.showLoading(true);
            
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            
            // Get current summary mode
            const result = await chrome.storage.local.get(['summaryMode']);
            const mode = result.summaryMode || 'pageSum';
            
            chrome.tabs.sendMessage(tab.id, {
                action: 'summarize',
                mode: mode
            }, (response) => {
                this.showLoading(false);
                if (chrome.runtime.lastError) {
                    this.displaySummary('❌ Error: Could not communicate with the page. Please refresh and try again.');
                    return;
                }
                
                if (response && response.success) {
                    this.displaySummary(response.summary);
                    this.updateStats();
                } else {
                    this.displaySummary('❌ Unable to summarize this content. ' + (response?.error || 'Please try selecting text first or ensure the page has readable content.'));
                }
            });
        } catch (error) {
            this.showLoading(false);
            this.displaySummary('❌ Error: ' + error.message);
        }
    }

    async handleKeyPoints() {
        try {
            this.showLoading(true);
            
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            
            chrome.tabs.sendMessage(tab.id, {
                action: 'extractKeyPoints'
            }, (response) => {
                this.showLoading(false);
                if (chrome.runtime.lastError) {
                    this.displaySummary('❌ Error: Could not communicate with the page. Please refresh and try again.');
                    return;
                }
                
                if (response && response.success) {
                    this.displaySummary(response.keyPoints);
                    this.updateStats();
                } else {
                    this.displaySummary('❌ Unable to extract key points from this content. ' + (response?.error || ''));
                }
            });
        } catch (error) {
            this.showLoading(false);
            this.displaySummary('❌ Error: ' + error.message);
        }
    }

    handleCopy() {
        const summaryText = document.getElementById('summaryText').textContent;
        navigator.clipboard.writeText(summaryText).then(() => {
            const btn = document.getElementById('copyBtn');
            const originalText = btn.textContent;
            btn.textContent = '✅ Copied!';
            setTimeout(() => {
                btn.textContent = originalText;
            }, 2000);
        }).catch(error => {
            console.error('Copy failed:', error);
        });
    }

    async handleExport() {
        try {
            const data = await chrome.storage.local.get(['summaryHistory']);
            const summaries = data.summaryHistory || [];
            
            const exportData = {
                exportDate: new Date().toISOString(),
                totalSummaries: summaries.length,
                summaries: summaries
            };
            
            const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = `ai-summarizer-export-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            
            URL.revokeObjectURL(url);
            
            this.showTemporaryMessage('Export completed successfully!');
        } catch (error) {
            console.error('Export failed:', error);
            this.showTemporaryMessage('Export failed: ' + error.message);
        }
    }

    async handleClearData() {
        if (confirm('Are you sure you want to clear all data? This cannot be undone.')) {
            try {
                await chrome.storage.local.clear();
                // Don't clear sync storage as it contains user settings
                await this.loadStats();
                this.showTemporaryMessage('Data cleared successfully!');
            } catch (error) {
                console.error('Clear data failed:', error);
                this.showTemporaryMessage('Failed to clear data: ' + error.message);
            }
        }
    }

    showLoading(show) {
        const loading = document.getElementById('loadingIndicator');
        const result = document.getElementById('summaryResult');
        
        if (show) {
            loading.classList.remove('hidden');
            result.classList.add('hidden');
        } else {
            loading.classList.add('hidden');
        }
    }

    displaySummary(summary) {
        const resultDiv = document.getElementById('summaryResult');
        const textDiv = document.getElementById('summaryText');
        
        textDiv.textContent = summary;
        resultDiv.classList.remove('hidden');
        
        // Save to history
        this.saveSummaryToHistory(summary);
    }

    async saveSummaryToHistory(summary) {
        try {
            const data = await chrome.storage.local.get(['summaryHistory']);
            const history = data.summaryHistory || [];
            
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            
            history.unshift({
                summary: summary,
                timestamp: Date.now(),
                url: tab?.url || 'unknown',
                title: tab?.title || 'Unknown Page'
            });
            
            // Keep only last 100 summaries
            if (history.length > 100) {
                history.splice(100);
            }
            
            await chrome.storage.local.set({ summaryHistory: history });
        } catch (error) {
            console.error('Error saving to history:', error);
        }
    }

    async updateStats() {
        try {
            const data = await chrome.storage.local.get(['summaryHistory', 'totalWordsProcessed']);
            const history = data.summaryHistory || [];
            const wordsProcessed = data.totalWordsProcessed || 0;
            
            // Update word count (estimate)
            const newWords = 150; // Average words saved per summary
            await chrome.storage.local.set({ 
                totalWordsProcessed: wordsProcessed + newWords 
            });
            
            this.loadStats();
        } catch (error) {
            console.error('Error updating stats:', error);
        }
    }

    async loadStats() {
        try {
            const data = await chrome.storage.local.get(['summaryHistory', 'totalWordsProcessed']);
            const history = data.summaryHistory || [];
            const wordsProcessed = data.totalWordsProcessed || 0;
            
            document.getElementById('totalSummaries').textContent = history.length;
            document.getElementById('timesSaved').textContent = Math.floor(history.length * 2.5) + 'm';
            document.getElementById('wordsProcessed').textContent = this.formatNumber(wordsProcessed);
        } catch (error) {
            console.error('Error loading stats:', error);
            // Set default values
            document.getElementById('totalSummaries').textContent = '0';
            document.getElementById('timesSaved').textContent = '0m';
            document.getElementById('wordsProcessed').textContent = '0';
        }
    }

    formatNumber(num) {
        if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
        if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
        return num.toString();
    }

    async loadSettings() {
        try {
            const settings = await chrome.storage.sync.get([
                'autoSummarize', 
                'floatingBtn', 
                'darkMode', 
                'contextMenu', 
                'aiProvider', 
                'geminiApiKey'
            ]);
            
            // Update toggle states based on stored settings
            Object.keys(settings).forEach(key => {
                const toggle = document.getElementById(key);
                if (toggle) {
                    if (settings[key]) {
                        toggle.classList.add('active');
                    } else {
                        toggle.classList.remove('active');
                    }
                }
            });
            
            // Load AI provider
            const providerSelect = document.getElementById('aiProvider');
            if (providerSelect && settings.aiProvider) {
                providerSelect.value = settings.aiProvider;
            }
            
            // Show/hide Gemini config
            this.toggleGeminiConfig(settings.aiProvider === 'gemini');
            
            // Load API key status
            const apiKeyInput = document.getElementById('geminiApiKey');
            if (apiKeyInput && settings.geminiApiKey) {
                apiKeyInput.placeholder = '••••••••••••••••';
            }
            
            // Apply dark mode if enabled
            if (settings.darkMode) {
                document.body.style.background = 'linear-gradient(135deg, #2d3748 0%, #1a202c 100%)';
                document.body.style.color = '#e2e8f0';
            }
            
        } catch (error) {
            console.error('Error loading settings:', error);
        }
    }

    handleProviderChange(e) {
        const provider = e.target.value;
        chrome.storage.sync.set({ aiProvider: provider });
        this.toggleGeminiConfig(provider === 'gemini');
    }

    toggleGeminiConfig(show) {
        const geminiConfig = document.getElementById('geminiConfig');
        if (geminiConfig) {
            geminiConfig.style.display = show ? 'flex' : 'none';
        }
    }

    async handleSaveApiKey() {
        const apiKeyInput = document.getElementById('geminiApiKey');
        const apiKey = apiKeyInput.value.trim();
        
        if (!apiKey) {
            this.showTemporaryMessage('Please enter a valid API key');
            return;
        }
        
        // Validate API key format (basic check)
        if (!apiKey.startsWith('AI') || apiKey.length < 20) {
            this.showTemporaryMessage('Invalid API key format. Please check your Gemini API key.');
            return;
        }
        
        try {
            await chrome.storage.sync.set({ geminiApiKey: apiKey });
            
            // Clear input and show success
            apiKeyInput.value = '';
            apiKeyInput.placeholder = '••••••••••••••••';
            
            const saveBtn = document.getElementById('saveApiKey');
            const originalText = saveBtn.textContent;
            saveBtn.textContent = '✅ Saved!';
            setTimeout(() => {
                saveBtn.textContent = originalText;
            }, 2000);
            
            // Send message to background script to update API service
            chrome.runtime.sendMessage({
                action: 'updateApiKey',
                apiKey: apiKey
            });
            
            this.showTemporaryMessage('API key saved successfully!');
            
        } catch (error) {
            console.error('Error saving API key:', error);
            this.showTemporaryMessage('Error saving API key: ' + error.message);
        }
    }

    handleApiKeyInput(e) {
        const saveBtn = document.getElementById('saveApiKey');
        if (saveBtn) {
            saveBtn.style.opacity = e.target.value.trim() ? '1' : '0.5';
        }
    }

    loadInitialData() {
        this.loadStats();
        this.loadSettings();
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new PopupController();
});