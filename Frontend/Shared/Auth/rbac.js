
/**
 * Role-Based Access Control (RBAC) Module
 * Handles sidebar filtering and page access restrictions.
 */

function updateSidebarForRole() {
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    const currentEmployee = JSON.parse(localStorage.getItem('currentEmployee'));

    let role = 'guest';
    if (currentUser) role = 'owner';
    else if (currentEmployee) role = currentEmployee.role || 'staff';

    const sidebar = document.querySelector('.sidebar');
    if (!sidebar) return;

    // If role is inventory_manager, filter the sidebar
    if (role === 'inventory_manager') {
        const menuItems = sidebar.querySelectorAll('.menu-item, .nav-item, .nav-link');
        menuItems.forEach(item => {
            const text = item.textContent.trim().toLowerCase();
            const href = item.getAttribute('href') || '';
            const isAllowed = text.includes('inventory') ||
                text.includes('settings') ||
                text.includes('logout') ||
                href.includes('inventory.html') ||
                href.includes('settings.html') ||
                href.includes('landing.html');

            if (!isAllowed) {
                // If it's a direct link, hide it
                item.style.display = 'none';

                // If it's inside a section, we might need to hide the section too
                const section = item.closest('.nav-section');
                if (section) {
                    const visibleItems = Array.from(section.querySelectorAll('.nav-item')).filter(i => i.style.display !== 'none');
                    if (visibleItems.length === 0) {
                        section.style.display = 'none';
                    }
                }
            }
        });

        // Also check for dashboard links and other restricted areas
        const currentPath = window.location.pathname.toLowerCase();
        const restrictedPaths = ['dashboard.html', 'analytics.html', 'query.html', 'employees.html', 'complain.html', 'udhaar.html', 'smartexpiry.html', 'staff_dashboard.html'];

        if (restrictedPaths.some(path => currentPath.endsWith(path))) {
            alert("Access Denied: You do not have permission to view this page.");
            window.location.href = (currentPath.includes('Frontend')) ? '../Inventory/inventory.html' : './Inventory/inventory.html';
        }
    }
}

document.addEventListener('DOMContentLoaded', updateSidebarForRole);
