document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const chatArea = document.getElementById('chat-area');
    const userInput = document.getElementById('user-input');
    const sendBtn = document.getElementById('send-btn');
    const newChatBtn = document.getElementById('new-chat');
    const chatHistoryEl = document.getElementById('chat-history');
    const API_URL = "https://1e1e-34-31-197-199.ngrok-free.app";
    
    // Chat state
    let currentChatId = null;
    let chats = {};
    
    // Initialize the app
    initializeChats();
    
    // Event listeners
    userInput.addEventListener('input', autoResizeTextarea);
    userInput.addEventListener('keydown', handleKeyDown);
    sendBtn.addEventListener('click', sendMessage);
    newChatBtn.addEventListener('click', startNewChat);
    
    // Functions
    function initializeChats() {
        const savedChats = localStorage.getItem('protonChats');
        if (savedChats) {
            chats = JSON.parse(savedChats);
        }
        
        if (Object.keys(chats).length === 0) {
            startNewChat();
        } else {
            const chatIds = Object.keys(chats);
            currentChatId = chatIds[chatIds.length - 1];
            loadChat(currentChatId);
        }
        
        updateChatHistoryUI();
    }
    
    function startNewChat() {
        currentChatId = 'chat-' + Date.now();
        chats[currentChatId] = {
            title: 'New Chat',
            messages: [],
            createdAt: new Date().toISOString()
        };
        saveChats();
        clearChatArea();
        updateChatHistoryUI();
        
        // Show welcome message
        const welcomeMessage = document.createElement('div');
        welcomeMessage.className = 'welcome-message';
        welcomeMessage.innerHTML = `
            <h1>Welcome to ProtonAI</h1>
            <p>How can I help you today?</p>
        `;
        chatArea.appendChild(welcomeMessage);
    }
    
    function loadChat(chatId) {
        if (!chats[chatId]) return;
        
        currentChatId = chatId;
        clearChatArea();
        
        const chat = chats[chatId];
        if (chat.messages.length === 0) {
            const welcomeMessage = document.createElement('div');
            welcomeMessage.className = 'welcome-message';
            welcomeMessage.innerHTML = `
                <h1>Welcome to Proton</h1>
                <p>How can I help you today?</p>
            `;
            chatArea.appendChild(welcomeMessage);
        } else {
            chat.messages.forEach(msg => {
                addMessageToChat(msg.role, msg.content, false);
            });
        }
        
        updateChatHistoryUI();
    }
    
    function saveMessage(role, content) {
        if (!currentChatId || !chats[currentChatId]) return;
        
        chats[currentChatId].messages.push({
            role,
            content,
            timestamp: new Date().toISOString()
        });
        
        // Update chat title if it's the first user message
        if (role === 'user' && chats[currentChatId].title === 'New Chat') {
            chats[currentChatId].title = content.length > 30 
                ? content.substring(0, 30) + '...' 
                : content;
        }
        
        saveChats();
        updateChatHistoryUI();
    }
    
    function saveChats() {
        localStorage.setItem('protonChats', JSON.stringify(chats));
    }
    
    function updateChatHistoryUI() {
        chatHistoryEl.innerHTML = '';
        
        // Sort chats by creation date (newest first)
        const sortedChats = Object.entries(chats).sort((a, b) => {
            return new Date(b[1].createdAt) - new Date(a[1].createdAt);
        });
        
        sortedChats.forEach(([id, chat]) => {
            const chatItem = document.createElement('div');
            chatItem.className = `chat-item ${id === currentChatId ? 'active' : ''}`;
            chatItem.textContent = chat.title;
            
            // Add context menu for delete
            chatItem.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                if (confirm(`Delete "${chat.title}"?`)) {
                    deleteChat(id);
                }
            });
            
            chatItem.addEventListener('click', () => loadChat(id));
            chatHistoryEl.appendChild(chatItem);
        });
    }
    
    function deleteChat(chatId) {
        if (Object.keys(chats).length <= 1) {
            alert("You need to keep at least one chat");
            return;
        }
        
        delete chats[chatId];
        if (currentChatId === chatId) {
            startNewChat();
        }
        saveChats();
        updateChatHistoryUI();
    }
    
    function clearChatArea() {
        chatArea.innerHTML = '';
    }
    
    function addMessageToChat(sender, message, saveToHistory = true) {
        if (saveToHistory) {
            saveMessage(sender, message);
        }
        
        // Remove welcome message if it exists
        const welcomeMessage = document.querySelector('.welcome-message');
        if (welcomeMessage) {
            welcomeMessage.remove();
        }
        
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}-message`;
        
        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';
        contentDiv.textContent = message;
        
        const timestamp = document.createElement('div');
        timestamp.className = 'message-timestamp';
        timestamp.textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        if (sender === 'assistant') {
            messageDiv.appendChild(contentDiv);
            messageDiv.appendChild(timestamp);
        } else {
            contentDiv.style.textAlign = 'right';
            messageDiv.appendChild(contentDiv);
            messageDiv.appendChild(timestamp);
        }
        
        chatArea.appendChild(messageDiv);
        chatArea.scrollTop = chatArea.scrollHeight;
    }
    
    function showTypingIndicator() {
        const typingDiv = document.createElement('div');
        typingDiv.className = 'message assistant-message typing-indicator';
        typingDiv.id = 'typing-' + Date.now();
        
        for (let i = 0; i < 3; i++) {
            const dot = document.createElement('div');
            dot.className = 'typing-dot';
            typingDiv.appendChild(dot);
        }
        
        chatArea.appendChild(typingDiv);
        chatArea.scrollTop = chatArea.scrollHeight;
        
        return typingDiv.id;
    }
    
    function removeTypingIndicator(id) {
        const typingElement = document.getElementById(id);
        if (typingElement) {
            typingElement.remove();
        }
    }
    
    function sendMessage() {
        const message = userInput.value.trim();
        if (!message) return;
        
        addMessageToChat('user', message);
        userInput.value = '';
        userInput.style.height = 'auto';
        
        const typingId = showTypingIndicator();
        
        fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ message: message })
        })
        .then(response => response.json())
        .then(data => {
            removeTypingIndicator(typingId);
            
            if (data.response) {
                addMessageToChat('assistant', data.response);
            } else {
                addMessageToChat('assistant', "Sorry, I couldn't process your request.");
            }
        })
        .catch(error => {
            removeTypingIndicator(typingId);
            addMessageToChat('assistant', "Error connecting to the server. Please try again.");
            console.error('Error:', error);
        });
    }
    
    function autoResizeTextarea() {
        this.style.height = 'auto';
        this.style.height = (this.scrollHeight) + 'px';
    }
    
    function handleKeyDown(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    }
    
async function sendMessage() {
  const userInput = document.getElementById("user-input").value;
  
  try {
    const response = await fetch(API_URL, {
      method: "POST",
      mode: "cors",  // Required for CORS
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ message: userInput }),
    });

    if (!response.ok) throw new Error("API request failed");
    
    const data = await response.json();
    console.log("AI Response:", data.response);
    // Display the response in your chat UI
    
  } catch (error) {
    console.error("Error:", error);
    // Show error to user (e.g., "Failed to connect to AI")
  }
}
    
});
