// Content script for Chat Archiver extension
(function() {
  'use strict';

  // Import the parser (will be concatenated during build or loaded separately)
  class ChatMessageParser {
    constructor() {
      this.messageCache = new Map();
    }

    extractSessionId(url) {
      const match = url.match(/\/play\/[^\/]+\/([a-f0-9-]{36})/i);
      return match ? match[1] : null;
    }

    parseChatHistory(container) {
      const messages = [];
      const messageRows = container.querySelectorAll('[id], [data-message-id]');
      
      let lastFullMessage = null;

      messageRows.forEach((row) => {
        const messageId = row.id || row.getAttribute('data-message-id');
        if (!messageId) return;

        const isContinuation = row.classList.contains('mt-1') || !row.querySelector('.profile-area');
        const isTask = row.classList.contains('task-card') || row.querySelector('.task-container');

        let messageData = null;

        if (isTask) {
          messageData = this.parseTaskMessage(row);
        } else if (isContinuation) {
          messageData = this.parseContinuationMessage(row, lastFullMessage);
        } else {
          messageData = this.parseFullMessage(row);
          if (messageData) {
            lastFullMessage = messageData;
          }
        }

        if (messageData) {
          messages.push(messageData);
        }
      });

      return messages;
    }

    parseFullMessage(row) {
      const profileArea = row.querySelector('.profile-area');
      const messageContent = row.querySelector('.message-content');
      
      if (!messageContent) return null;

      let username = '';
      let avatarUrl = '';

      if (profileArea) {
        const usernameEl = profileArea.querySelector('.username');
        const avatarEl = profileArea.querySelector('.avatar, img[alt=""]');
        
        if (usernameEl) {
          username = usernameEl.textContent.trim();
        }
        if (avatarEl) {
          avatarUrl = avatarEl.src || avatarEl.getAttribute('src');
        }
      }

      if (!username) {
        const userBadge = row.querySelector('.user-badge');
        if (userBadge) {
          username = userBadge.textContent.trim();
        }
      }

      const content = this.extractMessageContent(messageContent);
      const timestamp = this.extractTimestamp(row);

      return {
        id: row.id || row.getAttribute('data-message-id'),
        type: 'message',
        author: username,
        avatar: avatarUrl,
        content: content,
        timestamp: timestamp,
        rawHtml: row.outerHTML,
        continuations: []
      };
    }

    parseContinuationMessage(row, lastFullMessage) {
      const messageContent = row.querySelector('.message-content');
      if (!messageContent) return null;

      const content = this.extractMessageContent(messageContent);
      const timestamp = this.extractTimestamp(row);

      return {
        id: row.id || row.getAttribute('data-message-id'),
        type: 'continuation',
        content: content,
        timestamp: timestamp,
        rawHtml: row.outerHTML,
        linkedTo: lastFullMessage ? lastFullMessage.id : null,
        linkedAuthor: lastFullMessage ? lastFullMessage.author : 'Unknown'
      };
    }

    parseTaskMessage(row) {
      const taskContainer = row.querySelector('.task-container');
      const profileArea = row.querySelector('.profile-area');
      
      let username = '';
      let avatarUrl = '';

      if (profileArea) {
        const usernameEl = profileArea.querySelector('.username');
        const userBadge = profileArea.querySelector('.user-badge');
        const avatarEl = profileArea.querySelector('.avatar');
        
        if (usernameEl) {
          username = usernameEl.textContent.trim();
        } else if (userBadge) {
          username = userBadge.textContent.trim();
        }
        
        if (avatarEl) {
          avatarUrl = avatarEl.src || avatarEl.getAttribute('src');
        }
      }

      let title = '';
      let body = '';

      if (taskContainer) {
        const titleEl = taskContainer.querySelector('h3');
        if (titleEl) {
          title = titleEl.textContent.trim();
        }
        
        const bodyElements = taskContainer.querySelectorAll('p');
        body = Array.from(bodyElements).map(el => el.textContent.trim()).join('\n');
      }

      const timestamp = this.extractTimestamp(row);

      return {
        id: row.id || row.getAttribute('data-message-id'),
        type: 'task',
        author: username,
        avatar: avatarUrl,
        title: title,
        content: body,
        timestamp: timestamp,
        rawHtml: row.outerHTML
      };
    }

    extractMessageContent(contentEl) {
      const paragraphs = contentEl.querySelectorAll('p');
      if (paragraphs.length > 0) {
        return Array.from(paragraphs).map(p => p.textContent.trim()).join('\n');
      }
      return contentEl.textContent.trim();
    }

    extractTimestamp(row) {
      const timeEl = row.querySelector('time, .timestamp, [class*="time"]');
      if (timeEl) {
        return timeEl.textContent.trim() || timeEl.getAttribute('datetime');
      }
      return new Date().toISOString();
    }
  }

  const parser = new ChatMessageParser();
  let syncButton = null;
  let isSyncing = false;

  // Find the chat history container
  function findChatHistory() {
    // Try various selectors based on the provided HTML structure
    const selectors = [
      '[class*="chat-history"]',
      '.chat-history',
      '[data-chat-overlay-control]',
      '.flex.min-h-0.flex-1.flex-col',
      '[class*="chat"]'
    ];

    for (const selector of selectors) {
      const container = document.querySelector(selector);
      if (container) {
        // Look for the actual message container within
        const messageContainer = container.querySelector('[class*="flex-col"]') || 
                                container.querySelector('[role="log"]') ||
                                container.children[container.children.length - 1];
        return messageContainer || container;
      }
    }
    return null;
  }

  // Create or get the sync button
  function createSyncButton() {
    if (syncButton) return syncButton;

    syncButton = document.createElement('button');
    syncButton.id = 'chat-archiver-sync';
    syncButton.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M14 8a6 6 0 1 1-1.7-4.2M14 2v4h-4"/>
      </svg>
      Sync Chat
    `;
    syncButton.style.cssText = `
      position: fixed;
      bottom: 100px;
      right: 380px;
      z-index: 9999;
      padding: 10px 16px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      transition: all 0.2s ease;
    `;
    
    syncButton.addEventListener('mouseenter', () => {
      syncButton.style.transform = 'scale(1.05)';
      syncButton.style.boxShadow = '0 6px 16px rgba(0,0,0,0.4)';
    });
    
    syncButton.addEventListener('mouseleave', () => {
      syncButton.style.transform = 'scale(1)';
      syncButton.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
    });

    syncButton.addEventListener('click', handleSyncClick);

    document.body.appendChild(syncButton);
    return syncButton;
  }

  // Handle sync button click
  async function handleSyncClick() {
    if (isSyncing) return;
    
    isSyncing = true;
    syncButton.disabled = true;
    syncButton.innerHTML = `
      <svg class="animate-spin" width="16" height="16" viewBox="0 0 16 16" fill="none">
        <circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="2" stroke-dasharray="8 8"/>
      </svg>
      Syncing...
    `;

    try {
      const sessionId = parser.extractSessionId(window.location.href);
      if (!sessionId) {
        throw new Error('Could not extract session ID from URL');
      }

      const chatContainer = findChatHistory();
      if (!chatContainer) {
        throw new Error('Could not find chat history container');
      }

      const messages = parser.parseChatHistory(chatContainer);
      
      // Send to background script for storage and server sync
      const response = await chrome.runtime.sendMessage({
        action: 'syncChat',
        sessionId: sessionId,
        messages: messages,
        url: window.location.href,
        timestamp: new Date().toISOString()
      });

      showNotification(`Successfully synced ${messages.length} messages!`, 'success');
      console.log('[Chat Archiver] Sync complete:', response);
    } catch (error) {
      console.error('[Chat Archiver] Sync failed:', error);
      showNotification(`Sync failed: ${error.message}`, 'error');
    } finally {
      isSyncing = false;
      syncButton.disabled = false;
      syncButton.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M14 8a6 6 0 1 1-1.7-4.2M14 2v4h-4"/>
        </svg>
        Sync Chat
      `;
    }
  }

  // Show notification
  function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 10000;
      padding: 12px 20px;
      background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#667eea'};
      color: white;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 500;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      animation: slideIn 0.3s ease;
    `;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.style.opacity = '0';
      notification.style.transition = 'opacity 0.3s ease';
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }

  // Initialize
  function init() {
    console.log('[Chat Archiver] Initializing...');
    
    // Wait for page to load
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        setTimeout(createSyncButton, 1000);
      });
    } else {
      setTimeout(createSyncButton, 1000);
    }

    // Listen for messages from popup
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.action === 'getChatData') {
        const sessionId = parser.extractSessionId(window.location.href);
        const chatContainer = findChatHistory();
        
        if (chatContainer) {
          const messages = parser.parseChatHistory(chatContainer);
          sendResponse({ success: true, sessionId, messages });
        } else {
          sendResponse({ success: false, error: 'Chat container not found' });
        }
      }
      return true;
    });
  }

  init();
})();
