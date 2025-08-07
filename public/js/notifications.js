
// Global Notification System
class NotificationManager {
    constructor() {
        this.notifications = [];
        this.isInitialized = false;
        this.socket = null;
        this.currentUserId = null;
        this.init();
    }

    init() {
        // Request notification permission
        if ('Notification' in window) {
            if (Notification.permission === 'default') {
                Notification.requestPermission();
            }
        }

        // Create notification container
        this.createNotificationContainer();

        // Initialize service worker for background notifications
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/service-worker.js').catch(console.error);
        }

        this.isInitialized = true;
    }

    createNotificationContainer() {
        if (!document.getElementById('toast-container')) {
            const container = document.createElement('div');
            container.id = 'toast-container';
            container.className = 'fixed top-4 right-4 z-50 space-y-2 max-w-sm';
            document.body.appendChild(container);
        }
    }

    setSocket(socket, userId) {
        this.socket = socket;
        this.currentUserId = userId;
        this.setupSocketListeners();
    }

    setupSocketListeners() {
        if (!this.socket) return;

        // Listen for new messages
        this.socket.on('chat message', (data) => {
            if (data.from._id !== this.currentUserId) {
                this.showMessageNotification(data);
            }
        });

        this.socket.on('group message', (data) => {
            if (data.from._id !== this.currentUserId) {
                this.showGroupMessageNotification(data);
            }
        });

        // Listen for calls
        this.socket.on('incoming-call', (data) => {
            this.showCallNotification(data);
        });

        this.socket.on('incoming-group-call', (data) => {
            this.showGroupCallNotification(data);
        });

        // Listen for missed calls
        this.socket.on('call-missed', (data) => {
            this.showMissedCallNotification(data);
        });
    }

    showMessageNotification(message) {
        const title = `New message from ${message.from.username}`;
        const body = message.msg || (message.media ? 'Sent a file' : 'New message');
        
        this.showBrowserNotification(title, body, {
            tag: `message-${message.from._id}`,
            icon: '/avatars/default-avatar.png',
            data: {
                type: 'message',
                userId: message.from._id,
                username: message.from.username
            }
        });

        this.showToastNotification(title, body, 'message');
    }

    showGroupMessageNotification(message) {
        const title = `${message.from.username} in ${message.group?.name || 'Group'}`;
        const body = message.msg || (message.media ? 'Sent a file' : 'New message');
        
        this.showBrowserNotification(title, body, {
            tag: `group-${message.group._id}`,
            icon: '/group_icons/default.png',
            data: {
                type: 'group-message',
                groupId: message.group._id,
                groupName: message.group?.name
            }
        });

        this.showToastNotification(title, body, 'group-message');
    }

    showCallNotification(callData) {
        const title = `Incoming ${callData.type} call`;
        const body = `${callData.caller.username} is calling you`;
        
        this.showBrowserNotification(title, body, {
            tag: `call-${callData.callId}`,
            icon: '/avatars/default-avatar.png',
            requireInteraction: true,
            data: {
                type: 'call',
                callId: callData.callId,
                caller: callData.caller
            }
        });

        this.showToastNotification(title, body, 'call', {
            persistent: true,
            actions: [
                { label: 'Answer', action: () => this.answerCall(callData.callId) },
                { label: 'Decline', action: () => this.declineCall(callData.callId) }
            ]
        });
    }

    showGroupCallNotification(callData) {
        const title = `Group ${callData.type} call`;
        const body = `${callData.caller.username} started a call in ${callData.groupName}`;
        
        this.showBrowserNotification(title, body, {
            tag: `group-call-${callData.callId}`,
            icon: '/group_icons/default.png',
            requireInteraction: true,
            data: {
                type: 'group-call',
                callId: callData.callId,
                groupId: callData.groupId,
                caller: callData.caller
            }
        });

        this.showToastNotification(title, body, 'group-call', {
            persistent: true,
            actions: [
                { label: 'Join', action: () => this.joinGroupCall(callData.callId, callData.groupId) }
            ]
        });
    }

    showMissedCallNotification(callData) {
        const title = 'Missed call';
        const body = `You missed a call from ${callData.caller?.username || 'Unknown'}`;
        
        this.showBrowserNotification(title, body, {
            tag: `missed-call-${callData.callId}`,
            icon: '/avatars/default-avatar.png'
        });

        this.showToastNotification(title, body, 'missed-call');
    }

    showBrowserNotification(title, body, options = {}) {
        if (Notification.permission === 'granted' && document.hidden) {
            const notification = new Notification(title, {
                body: body,
                icon: options.icon || '/favicon.ico',
                tag: options.tag,
                requireInteraction: options.requireInteraction || false,
                data: options.data
            });

            notification.onclick = () => {
                window.focus();
                notification.close();
                
                if (options.data) {
                    this.handleNotificationClick(options.data);
                }
            };

            setTimeout(() => notification.close(), 10000);
        }
    }

    showToastNotification(title, body, type, options = {}) {
        const container = document.getElementById('toast-container');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = `
            bg-white rounded-lg shadow-lg p-4 mb-2 border-l-4 transform transition-all duration-300
            translate-x-full opacity-0 ${this.getToastColor(type)}
        `;

        toast.innerHTML = `
            <div class="flex items-start">
                <div class="flex-shrink-0">
                    ${this.getToastIcon(type)}
                </div>
                <div class="ml-3 flex-1">
                    <p class="text-sm font-medium text-gray-900">${title}</p>
                    <p class="text-sm text-gray-600">${body}</p>
                    ${options.actions ? this.renderToastActions(options.actions) : ''}
                </div>
                <div class="ml-4 flex-shrink-0">
                    <button class="text-gray-400 hover:text-gray-600" onclick="this.parentElement.parentElement.parentElement.remove()">
                        <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                        </svg>
                    </button>
                </div>
            </div>
        `;

        container.appendChild(toast);

        // Animate in
        setTimeout(() => {
            toast.classList.remove('translate-x-full', 'opacity-0');
        }, 100);

        // Auto remove if not persistent
        if (!options.persistent) {
            setTimeout(() => {
                toast.classList.add('translate-x-full', 'opacity-0');
                setTimeout(() => toast.remove(), 300);
            }, 5000);
        }
    }

    getToastColor(type) {
        switch (type) {
            case 'call': 
            case 'group-call': 
                return 'border-green-500';
            case 'message':
            case 'group-message':
                return 'border-blue-500';
            case 'missed-call':
                return 'border-red-500';
            default:
                return 'border-gray-500';
        }
    }

    getToastIcon(type) {
        const iconClass = "h-6 w-6";
        switch (type) {
            case 'call':
            case 'group-call':
                return `<svg class="${iconClass} text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path>
                </svg>`;
            case 'message':
            case 'group-message':
                return `<svg class="${iconClass} text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path>
                </svg>`;
            case 'missed-call':
                return `<svg class="${iconClass} text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 8l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M3 3l1.5 1.5m0 0l1.5 1.5M6 5v10a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2z"></path>
                </svg>`;
            default:
                return `<svg class="${iconClass} text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>`;
        }
    }

    renderToastActions(actions) {
        return `
            <div class="mt-2 flex space-x-2">
                ${actions.map(action => `
                    <button onclick="${action.action}" class="text-sm bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600">
                        ${action.label}
                    </button>
                `).join('')}
            </div>
        `;
    }

    handleNotificationClick(data) {
        switch (data.type) {
            case 'message':
                window.location.href = `/chat/${data.userId}`;
                break;
            case 'group-message':
                window.location.href = `/groups/${data.groupId}`;
                break;
            case 'call':
                // Handle call acceptance
                break;
            case 'group-call':
                window.location.href = `/groups/${data.groupId}`;
                break;
        }
    }

    // Call action methods
    answerCall(callId) {
        if (window.callManager) {
            window.callManager.acceptCall();
        }
    }

    declineCall(callId) {
        if (window.callManager) {
            window.callManager.declineCall();
        }
    }

    joinGroupCall(callId, groupId) {
        if (window.groupCallManager) {
            window.groupCallManager.acceptGroupCall(callId, groupId, 'video');
        }
    }
}

// Initialize global notification manager
window.notificationManager = new NotificationManager();
