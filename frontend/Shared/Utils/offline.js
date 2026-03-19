/**
 * Offline Management Module
 * Automatically detects internet loss and displays a non-blocking 
 * but descriptive "Offline" page/overlay with an inline SVG image.
 */

document.addEventListener('DOMContentLoaded', () => {
    // Create the overlay container if it doesn't exist
    if (!document.getElementById('offline-status-overlay')) {
        const overlay = document.createElement('div');
        overlay.id = 'offline-status-overlay';
        overlay.innerHTML = `
            <div class="offline-wrapper">
                <div class="status-badge-offline">Connection Lost</div>
                <div class="offline-icon-container">
                    <div class="offline-glow"></div>
                    <!-- Inline SVG: High-quality "No Internet" Illustration -->
                    <svg width="100" height="100" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 4.75V2.25M12 21.75V19.25M4.75 12H2.25M21.75 12H19.25" stroke="var(--primary)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                        <path d="M17.125 17.125L18.875 18.875M5.125 5.125L6.875 6.875M17.125 6.875L18.875 5.125M5.125 18.875L6.875 17.125" stroke="var(--primary)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                        <circle cx="12" cy="12" r="6" stroke="var(--primary)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                        <path d="M0 0L24 24" stroke="var(--danger)" stroke-width="2" stroke-linecap="round"/>
                    </svg>
                </div>
                <div class="offline-content">
                    <h1>Internet Not Found</h1>
                    <p>QuadStock requires an active connection to sync your business data. Please check your network and try again.</p>
                    <div class="retry-container">
                        <button onclick="handleRetry(this)" class="retry-btn">
                            <i class="fa-solid fa-rotate-right"></i> Try Again
                        </button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);

        // Add helper function to the global scope for the button
        window.handleRetry = (btn) => {
            btn.classList.add('btn-loading');
            setTimeout(() => {
                if (navigator.onLine) {
                    window.location.reload();
                } else {
                    btn.classList.remove('btn-loading');
                    // Add subtle shake animation or secondary feedback if still offline
                    btn.parentElement.parentElement.parentElement.animate([
                        { transform: 'translateX(0)' },
                        { transform: 'translateX(-10px)' },
                        { transform: 'translateX(10px)' },
                        { transform: 'translateX(0)' }
                    ], { duration: 300, iterations: 1 });
                }
            }, 800);
        };
    }

    const offlineOverlay = document.getElementById('offline-status-overlay');

    function updateOnlineStatus() {
        if (navigator.onLine) {
            offlineOverlay.classList.remove('is-offline');
            // Optional: Show a "Back Online" toast if it was offline
            if (sessionStorage.getItem('wasOffline') === 'true') {
                console.log('Connection restored.');
                sessionStorage.removeItem('wasOffline');
            }
        } else {
            offlineOverlay.classList.add('is-offline');
            sessionStorage.setItem('wasOffline', 'true');
        }
    }

    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);

    // Initial check on load
    updateOnlineStatus();
});
