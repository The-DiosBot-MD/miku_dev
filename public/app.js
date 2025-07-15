// public/app.js

window.Client = {
    socket: null,
    currentUser: null,
    init: function() {
        const urlParams = new URLSearchParams(window.location.search);
        const tokenFromUrl = urlParams.get('token');
        if (tokenFromUrl) {
            localStorage.setItem('jwt_token', tokenFromUrl);
            window.history.replaceState({}, document.title, "/app.html" + window.location.hash);
        }

        const token = localStorage.getItem('jwt_token');
        if (!token) {
            window.location.href = `/index.html?redirect=${encodeURIComponent(window.location.pathname + window.location.hash)}`;
            return;
        }

        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', (e) => {
                e.preventDefault();
                if (this.socket) this.socket.disconnect();
                localStorage.removeItem('jwt_token');
                window.location.href = '/index.html';
            });
        }
        
        this.socket = io({ auth: { token } });

        this.socket.on('connect', () => console.log('Socket conectado.'));
        this.socket.on('connect_error', (err) => { 
            console.error(err.message);
            if(logoutBtn) logoutBtn.click();
         });
        
        this.socket.on('user_profile', (user) => {
            this.currentUser = user;
            this.renderProfileView(user);
        });
        
        this.socket.on('receive_message', (msg) => this.renderMessage(msg));
        this.socket.on('message_deleted', (data) => { 
            const msgEl = document.getElementById(`message-${data.messageId}`);
            if (msgEl) msgEl.remove();
        });
        
        const sendButton = document.getElementById('send-button');
        if (sendButton) {
            sendButton.addEventListener('click', () => this.sendMessage());
        }
        
        const messageInput = document.getElementById('message-input');
        if (messageInput) {
            messageInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.sendMessage();
                }
            });
        }
        
        const profileForm = document.getElementById('profile-form');
        if (profileForm) {
            profileForm.addEventListener('submit', (e) => this.handleProfileUpdate(e));
        }
    },

    requestUserProfile: function(username) {
        const profileContent = document.getElementById('public-profile-content');
        profileContent.innerHTML = '<div class="loading-spinner">Cargando perfil...</div>';

        fetch(`/api/users/${username}`)
            .then(res => {
                if (!res.ok) throw new Error('Usuario no encontrado');
                return res.json();
            })
            .then(user => this.renderPublicProfileView(user))
            .catch(err => {
                profileContent.innerHTML = `<div class="error-message">${err.message}</div>`;
            });
    },

    renderPublicProfileView: function(user) {
        const profileContent = document.getElementById('public-profile-content');
        const registrationDate = new Date(user.createdAt).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' });
        profileContent.innerHTML = `
            <div class="profile-avatar">
                <img src="${user.avatarUrl}" alt="Avatar de ${this.escapeHTML(user.username)}">
            </div>
            <h2>${this.escapeHTML(user.username)}</h2>
            <p class="role-badge role-${user.role}">${user.role}</p>
            <p class="bio">${user.bio ? this.escapeHTML(user.bio) : '<i>Este usuario aún no ha escrito una biografía.</i>'}</p>
            <p class="join-date">Se unió el ${registrationDate}</p>
        `;
    },

    handleProfileUpdate: async function(event) {
        event.preventDefault();
        const messageDiv = document.getElementById('profile-message');
        messageDiv.textContent = '';
        messageDiv.className = 'message-feedback';

        const payload = {};
        
        const newUsername = document.getElementById('profile-username').value;
        const newAvatarUrl = document.getElementById('profile-avatar-url').value;
        const newBio = document.getElementById('profile-bio').value;
        const currentPassword = document.getElementById('profile-current-password').value;
        const newPassword = document.getElementById('profile-new-password').value;

        // MEJORA: Comparaciones más robustas tratando null/undefined como cadenas vacías.
        if (newUsername !== this.currentUser.username) payload.username = newUsername;
        if (newAvatarUrl !== (this.currentUser.avatarUrl || '')) payload.avatarUrl = newAvatarUrl;
        if (newBio !== (this.currentUser.bio || '')) payload.bio = newBio;

        if (newPassword) {
            if (!currentPassword) {
                messageDiv.textContent = 'Debes introducir tu contraseña actual para cambiarla.';
                messageDiv.classList.add('error');
                return;
            }
            payload.currentPassword = currentPassword;
            payload.newPassword = newPassword;
        }

        if (Object.keys(payload).length === 0) {
            messageDiv.textContent = 'No has realizado ningún cambio.';
            messageDiv.classList.add('info');
            return;
        }
        
        try {
            const res = await fetch('/api/users/me', {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('jwt_token')}`
                },
                body: JSON.stringify(payload)
            });
            const result = await res.json();
            if (!res.ok) throw new Error(result.message);

            messageDiv.textContent = result.message;
            messageDiv.classList.add('success');
            
            if (result.token) {
                console.log("Nuevo token recibido. Actualizando localStorage.");
                localStorage.setItem('jwt_token', result.token);
            }

            // Recargar datos del perfil para reflejar los cambios guardados
            // y actualizar el objeto `this.currentUser`.
            const me_res = await fetch('/api/users/me', { headers: { 'Authorization': `Bearer ${localStorage.getItem('jwt_token')}` } });
            const updatedUser = await me_res.json();
            this.currentUser = updatedUser;
            this.renderProfileView(updatedUser);


            document.getElementById('profile-current-password').value = '';
            document.getElementById('profile-new-password').value = '';

        } catch (err) {
            messageDiv.textContent = err.message;
            messageDiv.classList.add('error');
        }
    },

    sendMessage: function() {
        const messageInput = document.getElementById('message-input');
        const content = messageInput.value.trim();
        if (content && this.socket) {
            this.socket.emit('send_message', { content: content, channel: 'global' });
            messageInput.value = '';
            messageInput.style.height = 'auto';
            messageInput.focus();
        }
    },

    requestChatHistory: function() {
        const messagesDiv = document.querySelector('#chat-view .messages');
        if (!messagesDiv) return;
        messagesDiv.innerHTML = '<div class="loading-spinner">Cargando mensajes...</div>';
        
        this.socket.emit('request_chat_history', { channel: 'global' }, (response) => {
            if (response.error) {
                console.error(response.error);
                messagesDiv.innerHTML = '<div class="error-message">No se pudo cargar el historial.</div>';
                return;
            }
            this.renderChatHistory(response.history);
        });
    },

    renderChatHistory: function(history) {
        const messagesDiv = document.querySelector('#chat-view .messages');
        if (!messagesDiv) return;
        messagesDiv.innerHTML = '';
        if (history && history.length > 0) {
            history.forEach(msg => this.renderMessage(msg, true));
        } else {
            messagesDiv.innerHTML = '<div class="info-message">¡Sé el primero en escribir un mensaje!</div>';
        }
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
    },

    renderMessage: function(msg, isFromHistory = false) {
        if (!msg || !msg.User) {
            console.error("renderMessage: El mensaje o msg.User es nulo o indefinido. Saltando renderizado.");
            return;
        }
        const messagesDiv = document.querySelector('#chat-view .messages');
        if (!messagesDiv) return;
        if (document.getElementById(`message-${msg.id}`)) return;

        const infoMessage = messagesDiv.querySelector('.info-message');
        if (infoMessage) infoMessage.remove();

        const msgEl = document.createElement('div');
        msgEl.classList.add('message');
        msgEl.id = `message-${msg.id}`;

        const avatarSrc = msg.User.avatarUrl || `https://i.pravatar.cc/40?u=${encodeURIComponent(msg.User.username)}`;
        const timestamp = new Date(msg.createdAt).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });

        msgEl.innerHTML = `
            <div class="message-avatar">
                <a href="/app.html#profile?user=${encodeURIComponent(this.escapeHTML(msg.User.username))}">
                <img src="${avatarSrc}" alt="${this.escapeHTML(msg.User.username)}" onerror="this.onerror=null;this.src='/images/logo.png';">
            </div>
            <div class="message-body">
                <div class="message-header">
                    <span class="username">
                        <a href="#profile?user=${encodeURIComponent(msg.User.username)}">${this.escapeHTML(msg.User.username)}</a>
                    </span>
                </div>
                <div class="message-content">${msg.content}</div>
            </div>
            <span class="timestamp-right">${timestamp}</span>
        `;
        
        messagesDiv.appendChild(msgEl);
        
        if (!isFromHistory) {
            messagesDiv.scrollTop = messagesDiv.scrollHeight;
        }
    },

    renderProfileView: function(user) {
        if (!user) {
            console.error("renderProfileView: El objeto de usuario es nulo.");
            return;
        }

        document.getElementById('profile-username').value = user.username || '';
        document.getElementById('profile-email').value = user.email || '';
        document.getElementById('profile-avatar-url').value = user.avatarUrl || '';
        document.getElementById('profile-bio').value = user.bio || '';
        
        const avatarImg = document.getElementById('profile-avatar-img');
        avatarImg.src = user.avatarUrl || '/images/logo.png';
        avatarImg.onerror = () => { avatarImg.src = '/images/logo.png'; };
    },

    escapeHTML: function(str) {
        if (!str) return '';
        return str.replace(/[&<>"']/g, (match) => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;',
        }[match]));
    }
};

document.addEventListener('DOMContentLoaded', () => {
    window.Client.init();
});