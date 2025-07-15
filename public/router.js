document.addEventListener('DOMContentLoaded', () => {
    const navLinks = document.querySelectorAll('.nav-link');
    const views = document.querySelectorAll('.view');
    
    let chatHistoryLoaded = false;

    function handleRouteChange() {
        const hashParts = window.location.hash.split('?');
        const mainHash = hashParts[0] || '#chat';
        const queryParams = new URLSearchParams(hashParts[1] || '');
        const usernameToShow = queryParams.get('user');

        views.forEach(view => view.classList.remove('active'));
        navLinks.forEach(link => link.classList.remove('active'));
        
        let activeView;
        if (mainHash === '#profile' && usernameToShow) {
            activeView = document.querySelector('#public-profile-view');
        } else {
            activeView = document.querySelector(mainHash + '-view');
            const activeLink = document.querySelector(`a[href="${mainHash}"]`);
            if (activeLink) activeLink.classList.add('active');
        }

        if (activeView) {
            activeView.classList.add('active');
        }

        const checkSocketAndLoad = setInterval(() => {
            if (window.Client && window.Client.socket && window.Client.socket.connected) {
                clearInterval(checkSocketAndLoad);

                if (mainHash === '#chat' && !chatHistoryLoaded) {
                    window.Client.requestChatHistory();
                    chatHistoryLoaded = true;
                } else if (mainHash === '#profile' && usernameToShow) {
                    window.Client.requestUserProfile(usernameToShow);
                }
            }
        }, 100);
    }

    window.addEventListener('hashchange', handleRouteChange);
    handleRouteChange();
});