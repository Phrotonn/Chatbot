document.addEventListener('DOMContentLoaded', function () {
    const chatArea = document.getElementById('chat-area');
    const userInput = document.getElementById('user-input');
    const sendBtn = document.getElementById('send-btn');
    const newChatBtn = document.getElementById('new-chat');
    const chatHistoryEl = document.getElementById('chat-history');
    const API_URL = "https://1dda-34-53-25-214.ngrok-free.app";

    let currentChatId = null;
    let chats = {};

    initializeChats();

    userInput.addEventListener('input', autoResizeTextarea);
    userInput.addEventListener('keydown', handleKeyDown);
    sendBtn.addEventListener('click', sendMessage);
    newChatBtn.addEventListener('click', startNewChat);

    function initializeChats() {
        const savedChats = localStorage.getItem('protonChats');
        if (savedChats) chats = JSON.parse(savedChats);

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
                <h1>Welcome to ProtonAI</h1>
                <p>How can I help you today?</p>
            `;
            chatArea.appendChild(welcomeMessage);
        } else {
            chat.messages.forEach(msg => {
                addMessageToChat(msg.role, msg.content, false, msg.timestamp);
            });
        }

        updateChatHistoryUI();
    }

    function addMessageToChat(sender, message, saveToHistory = true, time = null) {
        if (saveToHistory) {
            saveMessage(sender, message);
        }

        const welcome = document.querySelector('.welcome-message');
        if (welcome) welcome.remove();

        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}-message`;

        if (sender === 'assistant') {
            const senderLabel = document.createElement('div');
            senderLabel.className = 'sender-label';
            senderLabel.textContent = 'Proton';
            messageDiv.appendChild(senderLabel);
        }

        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';
        contentDiv.textContent = message;

        const timestamp = document.createElement('div');
        timestamp.className = 'message-timestamp';
        const messageTime = time ? new Date(time) : new Date();
        timestamp.textContent = messageTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        messageDiv.appendChild(contentDiv);
        messageDiv.appendChild(timestamp);

        if (sender === 'user') {
            contentDiv.style.textAlign = 'right';
            timestamp.style.textAlign = 'right';
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
        if (typingElement) typingElement.remove();
    }

    function sendMessage() {
        const message = userInput.value.trim();
        if (!message) return;

        const timestamp = new Date().toISOString();
        addMessageToChat('user', message, true, timestamp);
        userInput.value = '';
        userInput.style.height = 'auto';

        const typingId = showTypingIndicator();

        fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: message })
        })
            .then(res => res.json())
            .then(data => {
                removeTypingIndicator(typingId);
                const replyTime = new Date().toISOString();
                if (data.response) {
                    addMessageToChat('assistant', data.response, true, replyTime);
                } else {
                    addMessageToChat('assistant', "Sorry, I couldn't process your request.", true, replyTime);
                }
            })
            .catch(err => {
                removeTypingIndicator(typingId);
                addMessageToChat('assistant', "Error connecting to the server.");
                console.error(err);
            });
    }

    function saveMessage(role, content) {
        if (!currentChatId || !chats[currentChatId]) return;

        chats[currentChatId].messages.push({
            role,
            content,
            timestamp: new Date().toISOString()
        });

        if (role === 'user' && chats[currentChatId].title === 'New Chat') {
            chats[currentChatId].title = content.length > 30 ? content.slice(0, 30) + '...' : content;
        }

        saveChats();
        updateChatHistoryUI();
    }

    function saveChats() {
        localStorage.setItem('protonChats', JSON.stringify(chats));
    }

    function updateChatHistoryUI() {
        chatHistoryEl.innerHTML = '';
        const sorted = Object.entries(chats).sort((a, b) =>
            new Date(b[1].createdAt) - new Date(a[1].createdAt)
        );

        sorted.forEach(([id, chat]) => {
            const chatItem = document.createElement('div');
            chatItem.className = `chat-item ${id === currentChatId ? 'active' : ''}`;
            chatItem.textContent = chat.title;

            chatItem.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                if (confirm(`Delete "${chat.title}"?`)) deleteChat(id);
            });

            chatItem.addEventListener('click', () => loadChat(id));
            chatHistoryEl.appendChild(chatItem);
        });
    }

    function deleteChat(chatId) {
        if (Object.keys(chats).length <= 1) {
            alert("You need at least one chat.");
            return;
        }

        delete chats[chatId];
        if (currentChatId === chatId) startNewChat();
        saveChats();
        updateChatHistoryUI();
    }

    function clearChatArea() {
        chatArea.innerHTML = '';
    }

    function autoResizeTextarea() {
        this.style.height = 'auto';
        this.style.height = this.scrollHeight + 'px';
    }

    function handleKeyDown(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    }
});
