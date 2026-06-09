# Chat Archiver Extension for Opera Browser

A powerful chat archiver extension designed specifically for gooning.games multiplayer chat. This extension intelligently captures all messages, handles multi-line continuations, and manages unique task/question cards while linking continuation messages to their original authors.

## Features

### Core Functionality
- **One-Click Sync**: Click the floating "Sync Chat" button on any gooning.games session to capture all messages
- **Intelligent Message Parsing**: Automatically detects and categorizes:
  - Standard text messages with user profiles
  - Multi-line continuation messages (linked to original authors)
  - Task and question cards
- **Session Tracking**: Extracts session IDs from URLs like `https://gooning.games/play/mindcontrol/c80b01c7-a1a1-4aea-90c7-89e13dbc247f?spy=1`
- **Local Storage**: All data is stored in Chrome/Opera storage with optional server sync to localhost:7337

### User Management
- **User Profiles**: Click any username to view/edit their profile with fields:
  - Alias
  - Tags (comma-separated)
  - Gender
  - Age
  - Kinks
- **Inline Display**: Age and gender shown next to usernames in message views
- **Session History**: View all sessions a user has participated in

### Browse & Navigation
- **Users Tab**: See all users across all archived sessions
- **Sessions Tab**: Browse all archived sessions with participant lists
- **Message View**: Scroll through complete conversation histories
- **Click-through Navigation**: 
  - Click username → View their sessions
  - Click session → View all messages from that session
  - Click username in messages → Edit their profile

### Manual Import
- **Copy-Paste Support**: Import chat logs from other sources
- **Flexible Format**: Accepts formats like:
  ```
  femmygb5:08 PM
  No, just feminine. In act and dress
  vbernalnj5:08 PM
  cool
  ```

## Installation

### For Opera Browser
1. Open Opera and navigate to `opera://extensions/`
2. Enable "Developer mode" in the top right
3. Click "Load unpacked"
4. Select the `/workspace/chat-archiver-extension` directory
5. The extension icon should appear in your toolbar

### For Chrome Browser
1. Navigate to `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select the extension directory

## Usage

### Archiving Chats
1. Navigate to any gooning.games session (URL format: `https://gooning.games/play/[game]/[session-id]`)
2. Wait for the chat to load
3. Click the purple "Sync Chat" button that appears near the chat window
4. Wait for the success notification
5. Access archived data via the extension popup

### Viewing Archived Data
1. Click the extension icon in your toolbar
2. Navigate between tabs:
   - **Users**: Browse all users, click to see their sessions
   - **Sessions**: View all archived sessions
   - **Import**: Paste external chat logs
3. Click usernames to edit profiles
4. Click sessions to view full message history

### Editing User Profiles
1. Click any username in the Users tab or in a message view
2. Fill in profile fields (alias, tags, gender, age, kinks)
3. Click "Save Profile"
4. Age and gender will now display inline with their username

## File Structure

```
chat-archiver-extension/
├── manifest.json           # Extension configuration
├── background/
│   └── service-worker.js   # Background logic, storage, server sync
├── content/
│   └── content-script.js   # Page interaction, message parsing, sync button
├── lib/
│   └── message-parser.js   # Reusable message parsing logic
├── popup/
│   ├── popup.html          # Extension popup UI
│   └── popup.js            # Popup interaction logic
└── icons/
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

## Technical Details

### Message Types Detected

1. **Full Messages**: Have `.profile-area` with `.username` and `.avatar`
2. **Continuations**: Lack `.profile-area`, have `mt-1` class, indented with `pl-10`
3. **Tasks/Questions**: Have `.task-container` with `h3` titles, may use `.user-badge`

### Selectors Used
- Main container: `[class*="chat-history"]` or similar
- Message rows: Elements with `id` (UUID) or `data-message-id` attributes
- Profile detection: `.profile-area`, `.username`, `.avatar`
- Continuation detection: `.mt-1` class, missing `.profile-area`
- Task detection: `.task-card`, `.task-container`, `.user-badge`

### Server Integration
By default, synced data is sent to `http://localhost:7337/api/sync`. If the server is unavailable, data is still stored locally in browser storage.

## API Reference

### Background Script Messages

**Sync Chat:**
```javascript
chrome.runtime.sendMessage({
  action: 'syncChat',
  sessionId: 'uuid-string',
  messages: [...],
  url: 'https://...',
  timestamp: 'ISO-date'
});
```

**Get Users:**
```javascript
chrome.runtime.sendMessage({ action: 'getUsers' });
// Returns: { success: true, users: [{ username, sessions: [...] }] }
```

**Get User Sessions:**
```javascript
chrome.runtime.sendMessage({ 
  action: 'getUserSessions', 
  username: 'username' 
});
```

**Get Session Messages:**
```javascript
chrome.runtime.sendMessage({ 
  action: 'getSessionMessages', 
  sessionId: 'uuid' 
});
```

**Get/Update User Profile:**
```javascript
chrome.runtime.sendMessage({ 
  action: 'getUserProfile', 
  username: 'username' 
});

chrome.runtime.sendMessage({ 
  action: 'updateUserProfile', 
  username: 'username',
  profileData: { alias, tags, gender, age, kinks }
});
```

**Import Chat Data:**
```javascript
chrome.runtime.sendMessage({ 
  action: 'importChatData',
  data: { sessionId, messages }
});
```

## Troubleshooting

### Sync Button Not Appearing
- Ensure you're on a gooning.games URL with a valid session ID
- Refresh the page
- Check browser console for errors

### No Messages Showing
- Make sure the chat has loaded before clicking sync
- Try scrolling up in the chat to load more messages
- Check if messages are being parsed correctly in the console

### Server Sync Failing
- Verify your local server is running on port 7337
- Check server logs for incoming requests
- Data is still stored locally even if server is unavailable

## Privacy & Security

- All data is stored locally in your browser
- Server sync is optional (disable by modifying `SERVER_URL` in service-worker.js)
- No data is sent to third parties
- Extension only runs on gooning.games domain

## License

MIT License - Feel free to modify and distribute.
