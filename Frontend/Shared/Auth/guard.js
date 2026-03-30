(function () {
    // --- 1. Define Public Access ---
    const PUBLIC_PAGES = [
        'landing.html',
        'login.html',
        'owner_login.html',
        'employee_login.html',
        'signup.html',
        'verify_otp.html',
        'forgot_password.html',
        'contact.html',
        'portfolio.html',
        'privacy-policy.html',
        'privacy_policy.html',
        'index.html'
    ];

    const path = window.location.pathname.toLowerCase();
    const fileName = path.split('/').pop() || 'index.html';
    
    // Check if current page is explicitly public
    const isPublic = PUBLIC_PAGES.some(pg => fileName === pg.toLowerCase()) || 
                     fileName === 'index.html' || 
                     fileName === '';

    // --- 2. Immediate Flash Prevention ---
    // Hide the entire document if it's a private page to prevent data leak before redirect
    if (!isPublic) {
        document.documentElement.style.visibility = 'hidden';
    }

    // --- 3. Session & Token Verification ---
    let sessionUser = null;
    let sessionEmployee = null;
    let sessionToken = localStorage.getItem('authToken');

    try {
        const userStr = localStorage.getItem('currentUser');
        const empStr = localStorage.getItem('currentEmployee');
        if (userStr) sessionUser = JSON.parse(userStr);
        if (empStr) sessionEmployee = JSON.parse(empStr);
    } catch (e) {
        console.warn('Session parsing failed, clearing malformed data.');
        localStorage.clear();
    }

    const isOwnerLoggedIn    = !!(sessionUser && sessionToken);
    const isEmployeeLoggedIn = !!(sessionEmployee && sessionToken && !sessionUser);
    const isAuthenticated    = isOwnerLoggedIn || isEmployeeLoggedIn;

    // --- 3.1 Provide Global Context ---
    window.authContext = {
        isAuthenticated,
        role: isOwnerLoggedIn ? 'owner' : (isEmployeeLoggedIn ? sessionEmployee.role : 'guest'),
        ownerRefId: isOwnerLoggedIn ? sessionUser._id : (isEmployeeLoggedIn ? sessionEmployee.ownerId : null),
        token: sessionToken,
        user: isOwnerLoggedIn ? sessionUser : (isEmployeeLoggedIn ? sessionEmployee : null)
    };


    if (isPublic) {
        // Redirect authenticated users away from login/signup to prevent double-login
        if (isAuthenticated && (fileName.includes('login') || fileName.includes('signup') || fileName === 'verify_otp.html')) {
            const upPath = path.includes('/authentication/') ? '../' : './';
            if (isOwnerLoggedIn) {
                window.location.href = upPath + 'Ownerdashboard/dashboard.html';
            } else {
                window.location.href = upPath + 'StaffDashboard/staff_dashboard.html';
            }
        }
        return; // Allow public access
    }

    // --- 4. Enforcement Logic ---
    if (!isAuthenticated) {
        // UNAUTHORIZED: Kill session and boot to landing
        localStorage.clear();
        
        // Find Landing Page Path dynamically
        let landingPath = '../landing/landing.html';
        if (path.includes('/ownerdashboard/') || path.includes('/analytics/') || path.includes('/inventory/') || 
            path.includes('/query/') || path.includes('/complain/') || path.includes('/smartexpiry/') || 
            path.includes('/udhaar/') || path.includes('/settings/') || path.includes('/employees/') || 
            path.includes('/staffdashboard/')) {
            window.location.href = '../landing/landing.html';
        } else {
            window.location.href = '/landing/landing.html';
        }
        return;
    }

    // --- 5. Role-Based Access ---
    if (isEmployeeLoggedIn) {
        try {
            const emp = sessionEmployee; // Already parsed at line 41

            // Block restricted-status employees
            if (['pending', 'blocked', 'rejected'].includes(emp.status)) {
                localStorage.removeItem('currentEmployee');
                localStorage.removeItem('authToken');
                window.location.href = '../Authentication/employee_login.html?error=restricted';
                return;
            }

            // Staff cannot access owner-only modules
            const ownerOnlyModules = ['/analytics/', '/inventory/', '/employees/', '/smartexpiry/', '/udhaar/', '/settings/', '/ownerdashboard/'];
            if (emp.role === 'staff' && ownerOnlyModules.some(mod => path.includes(mod))) {
                window.location.href = '../StaffDashboard/staff_dashboard.html';
                return;
            }
        } catch (e) {
            console.error('RBAC Error:', e);
            localStorage.clear();
            window.location.href = '../landing/landing.html';
            return;
        }
    }

    // Owners have full access — no further restriction needed

    // --- 6. Final Unlock ---
    document.documentElement.style.visibility = 'visible';

    // Apply saved theme immediately (before page paints to prevent flash)
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    if (document.body) document.body.setAttribute('data-theme', savedTheme);

    // Apply sidebar state immediately to prevent layout jumps
    if (localStorage.getItem('sidebarCollapsed') === '1') {
        document.documentElement.classList.add('sidebar-collapsed');
    }

    // NOTE: Clock, theme toggle button, and store name are handled by
    // the inline <script> at the bottom of each page (after DOM is fully ready).

})();
