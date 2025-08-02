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

        // Toggle switches
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

    handleToggle(toggle) {
        toggle.classList.toggle('active');
        const setting = toggle.id;
        const isActive = toggle.classList.contains('active');
        
        // Save setting
        chrome.storage.sync.set({ [setting]: isActive });
        
        // Send message to background script
        chrome.runtime.sendMessage({
            action: 'updateSetting',
            setting: setting,
            value: isActive
        });
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
                if (response && response.success) {
                    this.displaySummary(response.summary);
                    this.updateStats();
                } else {
                    this.displaySummary('❌ Unable to summarize this content. Please try selecting text first or ensure the page has readable content.');
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
                if (response && response.success) {
                    this.displaySummary(response.keyPoints);
                    this.updateStats();
                } else {
                    this.displaySummary('❌ Unable to extract key points from this content.');
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
        });
    }

    async handleExport() {
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
        a.click();
        
        URL.revokeObjectURL(url);
    }

    handleClearData() {
        if (confirm('Are you sure you want to clear all data? This cannot be undone.')) {
            chrome.storage.local.clear();
            chrome.storage.sync.clear();
            this.loadStats();
            alert('All data cleared successfully!');
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
        const data = await chrome.storage.local.get(['summaryHistory']);
        const history = data.summaryHistory || [];
        
        history.unshift({
            summary: summary,
            timestamp: Date.now(),
            url: (await chrome.tabs.query({ active: true, currentWindow: true }))[0].url
        });
        
        // Keep only last 100 summaries
        if (history.length > 100) {
            history.splice(100);
        }
        
        await chrome.storage.local.set({ summaryHistory: history });
    }

    async updateStats() {
        const data = await chrome.storage.local.get(['summaryHistory', 'totalWordsProcessed']);
        const history = data.summaryHistory || [];
        const wordsProcessed = data.totalWordsProcessed || 0;
        
        // Update word count (estimate)
        const newWords = 150; // Average words saved per summary
        await chrome.storage.local.set({ 
            totalWordsProcessed: wordsProcessed + newWords 
        });
        
        this.loadStats();
    }

    async loadStats() {
        const data = await chrome.storage.local.get(['summaryHistory', 'totalWordsProcessed']);
        const history = data.summaryHistory || [];
        const wordsProcessed = data.totalWordsProcessed || 0;
        
        document.getElementById('totalSummaries').textContent = history.length;
        document.getElementById('timesSaved').textContent = Math.floor(history.length * 2.5) + 'm';
        document.getElementById('wordsProcessed').textContent = this.formatNumber(wordsProcessed);
    }

    formatNumber(num) {
        if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
        if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
        return num.toString();
    }

    async loadSettings() {
        const settings = await chrome.storage.sync.get(['autoSummarize', 'floatingBtn', 'darkMode', 'contextMenu', 'aiProvider', 'geminiApiKey']);
        
        Object.keys(settings).forEach(key => {
            const toggle = document.getElementById(key);
            if (toggle && settings[key]) {
                toggle.classList.add('active');
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
            alert('Please enter a valid API key');
            return;
        }
        
        // Validate API key format (basic check)
        if (!apiKey.startsWith('AI') || apiKey.length < 20) {
            alert('Invalid API key format. Please check your Gemini API key.');
            return;
        }
        
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
    }

    handleApiKeyInput(e) {
        const saveBtn = document.getElementById('saveApiKey');
        saveBtn.style.opacity = e.target.value.trim() ? '1' : '0.5';
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