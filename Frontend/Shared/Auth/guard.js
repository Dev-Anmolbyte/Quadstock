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
    } else if (currentEmployee) {
        try {
            const emp = JSON.parse(currentEmployee);
            const restrictedStatuses = ['pending', 'blocked', 'rejected'];
            if (restrictedStatuses.includes(emp.status)) {
                console.warn("🔐 Access Denied: Employee status is " + emp.status);
                document.documentElement.style.display = 'none';
                localStorage.removeItem('currentEmployee'); // Clear session
                window.location.href = '../Authentication/employee_login.html?error=restricted';
            }
        } catch (e) {
            console.error("Guard: Session Error", e);
        }
    }
})();
