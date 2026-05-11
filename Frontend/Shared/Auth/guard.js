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

            // Role-Based Access Control (RBAC)
            const ownerOnlyModules = ['/analytics/', '/employees/', '/udhaar/', '/settings/', '/ownerdashboard/'];
            const inventoryModules = ['/inventory/', '/smartexpiry/'];

            if (emp.role === 'staff') {
                // Staff blocked from both owner-only and inventory-related modules
                if (ownerOnlyModules.some(mod => currentPath.includes(mod)) || inventoryModules.some(mod => currentPath.includes(mod))) {
                    window.location.href = '../StaffDashboard/staff_dashboard.html';
                    return;
                }
            } else if (emp.role === 'inventory_manager') {
                // Inventory Managers can see inventory/smartexpiry but not owner-only administrative modules
                if (ownerOnlyModules.some(mod => currentPath.includes(mod))) {
                    window.location.href = '../StaffDashboard/staff_dashboard.html';
                    return;
                }
            }
        } catch (e) {
            console.error('RBAC Error:', e);
            sessionStorage.clear();
            window.location.href = '../landing/landing.html';
            return;
        }
    }

    // --- 6.1 Subscription Benefit Checks (Feature Guard) ---
    // If user is on FREE plan, block access to Advanced Analytics and Smart Expiry
    const premiumModules = ['/smartexpiry/', '/analytics/']; // Analytics added to premium
    
    // Robust plan detection (handles both populated objects and raw IDs)
    const storeObj = (sessionUser?.storeId && typeof sessionUser.storeId === 'object') ? sessionUser.storeId : 
                    ((sessionEmployee?.storeId && typeof sessionEmployee.storeId === 'object') ? sessionEmployee.storeId : null);
    
    const activePlan = storeObj?.subscriptionPlan || 'free';
    const isExpired = storeObj?.subscriptionStatus === 'expired' || (storeObj?.subscriptionExpiry && new Date(storeObj.subscriptionExpiry) < new Date());

    if ((activePlan === 'free' || isExpired) && premiumModules.some(mod => currentPath.includes(mod))) {
        const msg = isExpired ? "Your subscription has expired. Please renew to access this feature." : "This is a PRO feature. Please upgrade your plan to access Advanced Analytics and Smart Expiry.";
        
        if (typeof QuadModals !== 'undefined') {
            QuadModals.alert("Subscription Required", msg, "info");
        } else {
            alert(msg);
        }
        
        // Redirect based on role
        if (isEmployeeLoggedIn) {
            window.location.href = '../StaffDashboard/staff_dashboard.html';
        } else {
            window.location.href = '../Ownerdashboard/dashboard.html';
        }
        return;
    }

    // --- 7. Final Unlock ---
    document.documentElement.style.visibility = 'visible';

    // Theme assurance
    if (document.body) document.body.setAttribute('data-theme', savedTheme);

    // --- 8. Background Status Check (Instant Logout for Blocked Employees) ---
    if (isEmployeeLoggedIn) {
        const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        const API_BASE = isLocal ? 'http://localhost:3000/api' : '/api';
        
        setInterval(async () => {
            try {
                const response = await fetch(`${API_BASE}/employees/status-check`, {
                    headers: { 'Authorization': `Bearer ${sessionToken}` }
                });
                
                if (response.status === 200) {
                    const data = await response.json();
                    if (data.role && data.role !== emp.role) {
                        // Role changed! Update session and reload
                        emp.role = data.role;
                        sessionStorage.setItem('currentEmployee', JSON.stringify(emp));
                        window.location.reload();
                    }
                } else if (response.status === 403) {
                    const data = await response.json();
                    if (data.message && data.message.toLowerCase().includes('blocked')) {
                        sessionStorage.clear();
                        window.location.href = '../Authentication/employee_login.html?error=restricted';
                    }
                }
            } catch (e) {
                // Ignore connection errors during background check
            }
        }, 30000); // Check every 30 seconds
    }

})();
