/**
 * QuadStock Access Guard
 * Enforces authentication before page load.
 */
(function () {
    // Pages that don't require login
    const publicPages = [
        'landing.html',
        'login.html',
        'owner_login.html',
        'employee_login.html',
        'signup.html',
        'forgot_password.html',
        'contact.html',
        'portfolio.html',
        'privacy-policy.html',
        'privacy_policy.html'
    ];

    const path = window.location.pathname.toLowerCase();

    // Check if the current URL matches any public page
    const isPublic = publicPages.some(pg => path.endsWith(pg.toLowerCase())) ||
        path.endsWith('/') ||
        path.endsWith('index.html');

    if (isPublic) return;

    // Check local storage for active session
    const currentUser = localStorage.getItem('currentUser');
    const currentEmployee = localStorage.getItem('currentEmployee');

    if (!currentUser && !currentEmployee) {
        // Unauthorized access: redirect to landing page
        console.warn("🔐 Access Denied: Unauthorized access to " + path + ". Redirecting...");
        document.documentElement.style.display = 'none';
        window.location.href = '../landing/landing.html';
        return;
    } else if (currentEmployee) {
        try {
            const emp = JSON.parse(currentEmployee);
            const restrictedStatuses = ['pending', 'blocked', 'rejected'];
            if (restrictedStatuses.includes(emp.status)) {
                console.warn("🔐 Access Denied: Employee status is " + emp.status);
                document.documentElement.style.display = 'none';
                localStorage.removeItem('currentEmployee'); // Clear session
                window.location.href = '../authentication/employee_login.html?error=restricted';
                return;
            }
        } catch (e) {
            console.error("Guard: Session Error", e);
        }
    }

    // --- Custom UI for Access Denied ---
    function showAccessDenied(message, redirectUrl) {
        // Ensure white/dark background
        const isDark = localStorage.getItem('theme') === 'dark';
        const bgColor = isDark ? '#111827' : '#f9fafb';
        const cardColor = isDark ? '#1f2937' : '#ffffff';
        const textColor = isDark ? '#f3f4f6' : '#111827';
        const mutedColor = isDark ? '#9ca3af' : '#6b7280';
        
        const overlay = document.createElement('div');
        overlay.id = 'access-guard-overlay';
        overlay.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: ${bgColor};
            display: flex; align-items: center; justify-content: center;
            z-index: 999999; font-family: 'Plus Jakarta Sans', sans-serif;
            padding: 20px; box-sizing: border-box;
        `;

        overlay.innerHTML = `
            <div style="
                background: ${cardColor};
                padding: 40px;
                border-radius: 24px;
                box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
                max-width: 450px;
                width: 100%;
                text-align: center;
                border: 1px solid ${isDark ? '#374151' : '#e5e7eb'};
                animation: guardContentAppear 0.4s cubic-bezier(0.16, 1, 0.3, 1);
            ">
                <style>
                    @keyframes guardContentAppear {
                        from { opacity: 0; transform: translateY(20px) scale(0.95); }
                        to { opacity: 1; transform: translateY(0) scale(1); }
                    }
                </style>
                <div style="
                    width: 72px; height: 72px; background: rgba(244, 124, 37, 0.1);
                    color: #f47c25; border-radius: 20px; display: flex;
                    align-items: center; justify-content: center; margin: 0 auto 24px;
                    font-size: 32px;
                ">
                    <i class="fa-solid fa-lock"></i>
                </div>
                <h2 style="margin: 0 0 12px 0; font-size: 24px; font-weight: 800; color: ${textColor};">Access Restricted</h2>
                <p style="margin: 0 0 32px 0; color: ${mutedColor}; line-height: 1.6; font-size: 16px;">${message}</p>
                <button onclick="window.location.href='${redirectUrl}'" style="
                    background: #f47c25; color: white; border: none;
                    padding: 14px 28px; border-radius: 12px; font-weight: 700;
                    font-size: 16px; cursor: pointer; width: 100%;
                    transition: all 0.2s ease; box-shadow: 0 10px 15px -3px rgba(244, 124, 37, 0.3);
                ">
                    Return to Dashboard
                </button>
            </div>
        `;

        // Inject Font Awesome if not present (sometimes head isn't loaded)
        if (!document.querySelector('link[href*="font-awesome"]')) {
           const fa = document.createElement('link');
           fa.rel = 'stylesheet';
           fa.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css';
           document.head.appendChild(fa);
        }

        // Wait for body or inject directly into docElem
        if (document.body) {
            document.body.appendChild(overlay);
        } else {
            document.documentElement.appendChild(overlay);
        }
        
        // Ensure the overlay itself is visible
        document.documentElement.style.display = 'block';
        // Hide the rest of the page content specifically
        const style = document.createElement('style');
        style.innerHTML = 'body > *:not(#access-guard-overlay) { display: none !important; }';
        document.head.appendChild(style);
    }

    // Role-based Path Filtering (Strict Dashboard Enforce)
    const empData = currentEmployee ? JSON.parse(currentEmployee) : null;
    const role = (currentUser ? 'owner' : (empData ? empData.role : null));

    // 1. Owner Dashboard Protection
    if (path.includes('/ownerdashboard/') && !currentUser) {
        showAccessDenied('Only the store owner can access the main dashboard. Please login as Owner.', '../authentication/login.html');
        return;
    }

    // 2. Manager Dashboard Protection
    if (path.includes('/managerdashboard/') && (!empData || empData.role !== 'manager')) {
        showAccessDenied('Managerial access required.', '../authentication/employee_login.html');
        return;
    }

    // 3. Staff Dashboard Protection
    if (path.includes('/staffdashboard/') && (!empData || empData.role !== 'staff')) {
        showAccessDenied('Staff-only access detected.', '../authentication/employee_login.html');
        return;
    }

    // 4. Strict Staff Restrictions (Block management pages)
    if (role === 'staff') {
        const restrictedPaths = [
            '/analytics/',
            '/inventory/',
            '/employees/',
            '/smartexpiry/',
            '/udhaar/',
            '/settings/'
        ];
        if (restrictedPaths.some(rp => path.includes(rp))) {
            showAccessDenied('This module is for Managers and Owners only. Please use your staff tools to continue.', '../StaffDashboard/staff_dashboard.html');
            return;
        }
    }

    // Global Logout Interceptor
    document.addEventListener('click', function (e) {
        // Attempt to find if they clicked an anchor traversing to landing.html acting as a Logout
        let target = e.target.closest('a') || e.target.closest('button');
        if (target && (
            (target.title && target.title.toLowerCase() === 'logout') ||
            (target.href && target.href.includes('landing.html')) ||
            (target.textContent && target.textContent.trim().toLowerCase() === 'logout')
        )) {
            localStorage.removeItem('currentUser');
            localStorage.removeItem('currentEmployee');
            // Allow default navigation to happen gracefully
        }
    });

})();
