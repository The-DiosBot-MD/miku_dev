document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const tokenFromUrl = urlParams.get('token');
    if (tokenFromUrl) {
        localStorage.setItem('jwt_token', tokenFromUrl);
        window.history.replaceState({}, document.title, "/app.html" + window.location.hash);
    }
    
    const canProceed = MikuDev.init();
    
    if (canProceed) {
        Router.init();
    } else {
        window.location.href = `/index.html?redirect=${encodeURIComponent(window.location.pathname + window.location.hash)}`;
    }
});