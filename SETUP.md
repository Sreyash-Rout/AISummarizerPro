# AI Summarizer Pro - Setup Instructions

## 🚀 Installation

1. **Download all files** and save them in a folder named `ai-summarizer-pro`
2. **Create icons folder** and add your extension icons:
   - `icons/icon16.png` (16x16 pixels)
   - `icons/icon48.png` (48x48 pixels)  
   - `icons/icon128.png` (128x128 pixels)
3. **Load in Chrome:**
   - Open `chrome://extensions/`
   - Enable "Developer mode" (top right toggle)
   - Click "Load unpacked"
   - Select your `ai-summarizer-pro` folder

## 🔑 Getting Google Gemini API Key (Optional)

The extension works perfectly with **local processing** (no API needed), but you can optionally add Google Gemini for enhanced AI summaries:

### Step 1: Get API Key
1. Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy the generated API key (starts with "AI...")

### Step 2: Configure Extension
1. Click the extension icon in Chrome
2. Go to "Settings" tab
3. Change "AI Provider" from "Local Processing" to "Google Gemini"
4. Paste your API key in the field
5. Click "Save Key"

## 📁 File Structure
```
ai-summarizer-pro/
├── manifest.json
├── popup.html
├── popup.js
├── content.js
├── background.js
├── content.css
├── welcome.html
├── welcome.js
├── SETUP.md
└── icons/
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

## ✨ Features

### Local Processing (No API Required)
- ✅ Extractive summarization algorithm
- ✅ Key point extraction
- ✅ Multiple summary lengths
- ✅ Works completely offline
- ✅ Privacy-focused (no data sent anywhere)

### Google Gemini Integration (Optional)
- ✅ Advanced AI-powered summaries
- ✅ Better context understanding
- ✅ Multiple summary styles
- ✅ Automatic fallback to local processing

## 🎯 Usage

1. **Floating Button**: Click the ✨ button on any webpage
2. **Extension Popup**: Click the extension icon
3. **Context Menu**: Right-click and select "Summarize"
4. **Text Selection**: Select text and click the tooltip
5. **Auto-Summarize**: Enable in settings for automatic detection

## 🛡️ Privacy & Security

- **Local Processing**: No data sent to external servers by default
- **Gemini Integration**: Only content is sent to Google when using Gemini API
- **API Key Storage**: Stored locally in Chrome's secure storage
- **No Tracking**: Extension doesn't track or collect user data

## 🔧 Troubleshooting

### Extension won't load:
- Make sure all files are in the correct folder structure
- Check that manifest.json is valid
- Ensure icon files exist in the icons folder

### Gemini API errors:
- Verify API key is correct (starts with "AI...")
- Check you have API quota remaining
- Ensure stable internet connection
- Extension will automatically fallback to local processing

### Summary quality issues:
- Try different summary lengths (short/medium/long)
- Use Gemini for better AI summaries
- Ensure page content is readable text (not images/videos)

## 💡 Tips

- **Best Results**: Use on article pages, blog posts, and text-heavy content
- **Selection Mode**: Select specific paragraphs for focused summaries
- **Export Data**: Use the export feature to save your summaries
- **Dark Mode**: Extension respects your system's dark mode preference

## 🆘 Support

If you encounter issues:
1. Check browser console for error messages
2. Try refreshing the page and extension
3. Verify all files are present and properly named
4. Test with local processing first before using Gemini API