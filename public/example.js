document.addEventListener('DOMContentLoaded', () => {
    // Vistas y elementos del DOM
    const authView = document.getElementById('auth-view');
    const appView = document.getElementById('app-view');
    
    // Formularios
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const chatForm = document.getElementById('chat-form');
    
    // Displays
    const profileInfo = document.getElementById('profile-info');
    const chatMessages = document.getElementById('chat-messages');
    
    // Botones
    const logoutBtn = document.getElementById('logout-btn');

    let socket = null;
    let token = localStorage.getItem('jwt_token');

    // --- LÓGICA DE INICIALIZACIÓN ---
    if (token) {
        initializeApp(token);
    } else {
        showView('auth');
    }

    // --- MANEJADORES DE EVENTOS DE FORMULARIOS ---

    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('reg-username').value;
        const email = document.getElementById('reg-email').value;
        const password = document.getElementById('reg-password').value;
        
        try {
            // NOTA: Omitimos turnstileToken para este ejemplo. En la app real es OBLIGATORIO.
            const res = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, email, password })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message);
            alert(data.message);
            registerForm.reset();
        } catch (err) {
            alert('Error en el registro: ' + err.message);
        }
    });

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const identifier = document.getElementById('login-identifier').value;
        const password = document.getElementById('login-password').value;
        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ identifier, password })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message);
            
            token = data.token;
            localStorage.setItem('jwt_token', token);
            initializeApp(token);
        } catch (err) {
            alert('Error en el login: ' + err.message);
        }
    });
    
    chatForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const chatInput = document.getElementById('chat-input');
        const content = chatInput.value.trim();
        if (content && socket) {
            // EMITIR: send_message
            socket.emit('send_message', { content: content, channel: 'global' });
            chatInput.value = '';
        }
    });

    logoutBtn.addEventListener('click', () => {
        if (socket) socket.disconnect();
        localStorage.removeItem('jwt_token');
        token = null;
        showView('auth');
        chatMessages.innerHTML = '';
        profileInfo.textContent = '';
    });

    // --- FUNCIONES AUXILIARES ---

    function showView(viewName) {
        authView.classList.remove('active');
        appView.classList.remove('active');
        document.getElementById(`${viewName}-view`).classList.add('active');
    }

    function initializeApp(_token) {
        showView('app');
        connectSocket(_token);
    }

    function connectSocket(_token) {
        socket = io({ auth: { token: _token } });

        // --- REGISTRO DE EVENTOS DEL SOCKET ---

        socket.on('connect', () => {
            console.log('Socket conectado!');
            // EMITIR: request_chat_history
            socket.emit('request_chat_history', { channel: 'global' }, (response) => {
                if (response.error) {
                    addMessageToChat(`Sistema: ${response.error}`);
                } else {
                    chatMessages.innerHTML = ''; // Limpiar chat
                    response.history.forEach(msg => addMessageToChat(msg, true));
                }
            });
        });

        socket.on('connect_error', (err) => {
            alert(`Error de conexión: ${err.message}. Deslogueando.`);
            logoutBtn.click();
        });

        // ESCUCHAR: user_profile
        socket.on('user_profile', (user) => {
            profileInfo.textContent = JSON.stringify(user, null, 2);
        });

        // ESCUCHAR: receive_message
        socket.on('receive_message', (msg) => {
            addMessageToChat(msg, false);
        });
    }

    function addMessageToChat(msg, isHistory = false) {
        const div = document.createElement('div');
        div.className = 'message';
        if (typeof msg === 'string') {
            div.textContent = msg;
        } else {
            div.innerHTML = `<b>${msg.User.username}:</b> ${msg.content}`;
        }
        chatMessages.appendChild(div);
        if (!isHistory) {
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }
    }
});