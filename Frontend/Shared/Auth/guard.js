(function () {
    // --- 1. Immediate UI Sync (Flash Prevention) ---
    // Extract path info early
    const currentPath = window.location.pathname.toLowerCase();
    const currentFile = currentPath.split('/').pop() || 'index.html';

    // ALWAYS FORCE LIGHT THEME for Owner Login & Signup pages
    const FORCE_LIGHT_PAGES = ['owner_login.html', 'signup.html', 'login.html'];
    const shouldForceLight = FORCE_LIGHT_PAGES.some(pg => currentFile.includes(pg));

    const savedTheme = shouldForceLight ? 'light' : (localStorage.getItem('theme') || 'light');
    
    document.documentElement.setAttribute('data-theme', savedTheme);
    document.documentElement.classList.toggle('dark', savedTheme === 'dark');
    
    // Apply sidebar state immediately to prevent layout jumps
    if (localStorage.getItem('sidebarCollapsed') === '1') {
        document.documentElement.classList.add('sidebar-collapsed');
    }

    // --- 2. Define Public Access ---
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

    // Check if current page is explicitly public
    const isPublic = PUBLIC_PAGES.some(pg => currentFile === pg.toLowerCase()) || 
                     currentFile === 'index.html' || 
                     currentFile === '';

    // --- 3. Immediate Flash Prevention for Private Pages ---
    if (!isPublic) {
        document.documentElement.style.visibility = 'hidden';
    }

    // --- 4. Session & Token Verification ---
    let sessionUser = null;
    let sessionEmployee = null;
    let sessionToken = sessionStorage.getItem('authToken'); // Switched to sessionStorage as requested earlier

    try {
        const userStr = sessionStorage.getItem('currentUser');
        const empStr = sessionStorage.getItem('currentEmployee');
        if (userStr) sessionUser = JSON.parse(userStr);
        if (empStr) sessionEmployee = JSON.parse(empStr);
    } catch (e) {
        console.warn('Session parsing failed, clearing malformed data.');
        sessionStorage.clear();
    }

    const isOwnerLoggedIn    = !!(sessionUser && sessionToken);
    const isEmployeeLoggedIn = !!(sessionEmployee && sessionToken && !sessionUser);
    const isAuthenticated    = isOwnerLoggedIn || isEmployeeLoggedIn;

    // --- 4.1 Provide Global Context ---
    window.authContext = {
        isAuthenticated,
        role: isOwnerLoggedIn ? 'owner' : (isEmployeeLoggedIn ? sessionEmployee.role : 'guest'),
        ownerRefId: isOwnerLoggedIn ? sessionUser._id : (isEmployeeLoggedIn ? sessionEmployee.ownerId : null),
        token: sessionToken,
        user: isOwnerLoggedIn ? sessionUser : (isEmployeeLoggedIn ? sessionEmployee : null)
    };

    // --- 5. Redirection Logic (Security) ---
    if (isPublic) {
        // We previously removed the auto-redirect for logged in users from public pages 
        // as the user found it annoying.
        return; 
    }

    if (!isAuthenticated) {
        // UNAUTHORIZED: Redirect with security alert
        sessionStorage.clear();
        
        // Find Landing Page Path
        window.location.href = '../landing/landing.html?alert=register';
        return;
    }

    // --- 6. Role-Based Access ---
    if (isEmployeeLoggedIn) {
        try {
            const emp = sessionEmployee; 

            // Block restricted-status employees
            if (['pending', 'blocked', 'rejected'].includes(emp.status)) {
                sessionStorage.clear();
                window.location.href = '../Authentication/employee_login.html?error=restricted';
                return;
            }

            // Staff cannot access owner-only modules
            const ownerOnlyModules = ['/analytics/', '/inventory/', '/employees/', '/smartexpiry/', '/udhaar/', '/settings/', '/ownerdashboard/'];
            if (emp.role === 'staff' && ownerOnlyModules.some(mod => currentPath.includes(mod))) {
                window.location.href = '../StaffDashboard/staff_dashboard.html';
                return;
            }
        } catch (e) {
            console.error('RBAC Error:', e);
            sessionStorage.clear();
            window.location.href = '../landing/landing.html';
            return;
        }
    }

    // --- 7. Final Unlock ---
    document.documentElement.style.visibility = 'visible';

    // Theme assurance
    if (document.body) document.body.setAttribute('data-theme', savedTheme);

})();
