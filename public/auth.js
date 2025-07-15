document.addEventListener('DOMContentLoaded', async () => {
    const decodeJwt = (token) => {
        try {
            return JSON.parse(atob(token.split('.')[1]));
        } catch (e) {
            return null;
        }
    };

    const token = localStorage.getItem('jwt_token');
    if (token) {
        window.location.href = '/app.html';
        return;
    }

    let cloudflareSiteKey = null;
    try {
        const response = await fetch('/api/misc/config');
        if (!response.ok) throw new Error('No se pudo obtener la configuración del servidor.');
        const data = await response.json();
        cloudflareSiteKey = data.cloudflareSiteKey;
        if (!cloudflareSiteKey) throw new Error("Cloudflare Site Key no recibida del backend.");
    } catch (error) {
        console.error("Error crítico de configuración:", error);
        showError("No se pudo cargar el sistema de verificación. Inténtalo de nuevo más tarde.");
        return;
    }

    const loginView = document.getElementById('login-view');
    const registerView = document.getElementById('register-view');
    const googleCompleteView = document.getElementById('google-complete-view');
    
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const googleCompleteForm = document.getElementById('google-complete-form');
    
    const showRegisterBtn = document.getElementById('show-register');
    const showLoginBtn = document.getElementById('show-login');
    
    const errorMessageDiv = document.getElementById('error-message');

    let loginWidgetId = null;
    let registerWidgetId = null;
    let googleWidgetId = null;
    
    const allViews = [loginView, registerView, googleCompleteView];

    const urlParams = new URLSearchParams(window.location.search);
    const tempToken = urlParams.get('tempToken');

    if (tempToken) {
        const decoded = decodeJwt(tempToken);
        if (decoded && decoded.email) {
            allViews.forEach(v => v.classList.remove('active'));
            googleCompleteView.classList.add('active');
            
            document.getElementById('google-temp-token').value = tempToken;
            document.getElementById('google-email').value = decoded.email;
            document.getElementById('google-username').value = decoded.suggestedUsername + Math.floor(Math.random() * 1000);
            
            renderTurnstile('google');
            window.history.replaceState({}, document.title, "/index.html");
        } else {
            showError('El token de registro es inválido. Por favor, intenta registrarte con Google de nuevo.');
        }
    } else {
        loginView.classList.add('active');
        renderTurnstile('login');
    }

    showRegisterBtn.addEventListener('click', () => switchView('register'));
    showLoginBtn.addEventListener('click', () => switchView('login'));
    
    function switchView(viewName) {
        hideError();
        allViews.forEach(v => v.classList.remove('active'));
        if (viewName === 'login') {
            loginView.classList.add('active');
            renderTurnstile('login');
        } else if (viewName === 'register') {
            registerView.classList.add('active');
            renderTurnstile('register');
        }
    }

    loginForm.addEventListener('submit', (e) => handleFormSubmit(e, '/api/auth/login', loginForm, handleLoginSuccess));
    registerForm.addEventListener('submit', (e) => handleFormSubmit(e, '/api/auth/register', registerForm, handleRegisterSuccess));
    googleCompleteForm.addEventListener('submit', (e) => handleFormSubmit(e, '/api/auth/complete-google', googleCompleteForm, handleLoginSuccess));

    function handleLoginSuccess(result) {
        localStorage.setItem('jwt_token', result.token);
        const redirectUrl = new URLSearchParams(window.location.search).get('redirect');
        window.location.href = redirectUrl || '/app.html';
    }

    function handleRegisterSuccess() {
        alert('¡Registro exitoso! Ahora puedes iniciar sesión.');
        switchView('login');
    }

    async function handleFormSubmit(event, endpoint, form, onSuccess) {
        event.preventDefault();
        hideError();
        
        const turnstileResponse = window.turnstile.getResponse(form.querySelector('.cf-turnstile, [id^="turnstile-"]'));
        if (!turnstileResponse) {
            showError('Por favor, completa la verificación.');
            return;
        }

        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());
        data['turnstileToken'] = turnstileResponse;

        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.message);
            onSuccess(result);
        } catch (error) {
            showError(error.message);
        } finally {
            if (window.turnstile) {
                const widgetId = form.id === 'login-form' ? loginWidgetId : (form.id === 'register-form' ? registerWidgetId : googleWidgetId);
                if (widgetId) window.turnstile.reset(widgetId);
            }
        }
    }

    function renderTurnstile(view) {
        if (!window.turnstile || !cloudflareSiteKey) return;
        
        if (view === 'login' && !loginWidgetId) {
            loginWidgetId = window.turnstile.render('#turnstile-login-widget', { sitekey: cloudflareSiteKey });
        } else if (view === 'register' && !registerWidgetId) {
            registerWidgetId = window.turnstile.render('#turnstile-register-widget', { sitekey: cloudflareSiteKey });
        } else if (view === 'google' && !googleWidgetId) {
            googleWidgetId = window.turnstile.render('#turnstile-google-widget', { sitekey: cloudflareSiteKey });
        }
    }

    function showError(message) {
        errorMessageDiv.textContent = message;
        errorMessageDiv.style.display = 'block';
    }

    function hideError() {
        errorMessageDiv.style.display = 'none';
    }
});