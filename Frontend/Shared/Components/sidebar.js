/**
 * QuadStock — Shared Sidebar & Top Bar Component
 * -----------------------------------------------
 * Drop this script at the BOTTOM of any owner page (before </body>).
 * It will:
 *   1. Replace the <aside class="sidebar"> with a consistent sidebar.
 *   2. Insert a standardized .top-bar into .main-content (at the top).
 *   3. Start the live clock.
 *   4. Wire the theme toggle.
 *   5. Display store name & ID fetched from window.authContext (guard.js).
 *
 * Usage — each page must declare which link is "active":
 *   <script>window.ACTIVE_PAGE = 'inventory';</script>
 *   <script src="../Shared/Components/sidebar.js"></script>
 */
(function () {
    const initSidebar = () => {
        // ── 1. NAV ITEMS (label → href relative to each module folder) ──────────
        const NAV_ITEMS = [
            { id: 'dashboard',   icon: 'fa-house',               label: 'Dashboard',   href: '../Ownerdashboard/dashboard.html' },
            { id: 'analytics',   icon: 'fa-chart-simple',        label: 'Analytics',   href: '../Analytics/analytics.html' },
            { id: 'inventory',   icon: 'fa-boxes-stacked',       label: 'Inventory',   href: '../Inventory/inventory.html' },
            { id: 'employees',   icon: 'fa-users',               label: 'Employees',   href: '../Employees/employees.html' },
            { id: 'smartexpiry', icon: 'fa-hourglass-end',       label: 'Smart Expiry',href: '../smartexpiry/smartexpiry.html' },
            { id: 'query',       icon: 'fa-clipboard-question',  label: 'Queries',     href: '../Query/query.html' },
            { id: 'complain',    icon: 'fa-circle-exclamation',  label: 'Complaints',  href: '../Complain/complain.html' },
            { id: 'udhaar',      icon: 'fa-indian-rupee-sign',   label: 'Udhaar',      href: '../Udhaar/udhaar.html' },
            { id: 'sales',       icon: 'fa-receipt',             label: 'POS Terminal',href: '../Sales/sales.html' },
        ];

        const FOOTER_ITEMS = [
            { id: 'settings', icon: 'fa-gear',               label: 'Settings', href: '../Settings/settings.html' },
            { id: 'logout',   icon: 'fa-right-from-bracket', label: 'Logout',   href: '../landing/landing.html', cls: 'logout' },
        ];

        const activePage = window.ACTIVE_PAGE || '';

        // ── 2. BUILD SIDEBAR HTML ────────────────────────────────────────────────
        function buildNavLink(item) {
            const isActive = item.id === activePage ? ' active' : '';
            const extraCls = item.cls ? ' ' + item.cls : '';
            return `<a href="${item.href}" class="menu-item${isActive}${extraCls}" title="${item.label}">
                        <i class="fa-solid ${item.icon}"></i>
                        <span>${item.label}</span>
                    </a>`;
        }

        const sidebarHTML = `
            <div class="brand">
                <button class="sidebar-toggle" id="sidebar-toggle" title="Toggle Sidebar">
                    <i class="fa-solid fa-bars"></i>
                </button>
                <span class="brand-text">QuadStock</span>
            </div>

            <nav class="sidebar-menu">
                ${NAV_ITEMS.map(buildNavLink).join('\n')}
            </nav>

            <div class="sidebar-footer">
                ${FOOTER_ITEMS.map(buildNavLink).join('\n')}
            </div>
        `;

        // ── 3. BUILD TOP BAR HTML ────────────────────────────────────────────────
        const topBarHTML = `
            <div class="top-bar" id="shared-top-bar">
                <div class="header-left">
                    <button class="menu-toggle-btn mobile-only" id="mobile-menu-toggle" title="Open Menu">
                        <i class="fa-solid fa-bars"></i>
                    </button>
                    <div class="store-identity">
                        <i class="fa-solid fa-store store-identity-icon"></i>
                        <div class="shop-name-topbar shop-name">
                            <div class="topbar-line">Store :- <span id="topbar-store-name">QuadStock</span></div>
                            <div class="topbar-line">Store id :- <span id="topbar-store-id">...</span></div>
                        </div>
                    </div>
                </div>
                <div class="header-right">
                    <div class="digital-clock" id="digital-clock">--:--:-- --</div>
                    <button class="theme-toggle-btn" id="theme-toggle" title="Toggle Theme">
                        <i class="fa-solid fa-moon"></i>
                    </button>
                </div>
            </div>
        `;

        // ── 4. INJECT INTO DOM ───────────────────────────────────────────────────
        const sidebar = document.querySelector('aside.sidebar');
        if (sidebar) {
            sidebar.innerHTML = sidebarHTML;
        }

        // Inject top bar at the very top of .main-content (before existing children)
        const mainContent = document.querySelector('.main-content');
        if (mainContent) {
            // Remove any existing top-bar or top-header to avoid duplicates
            const existing = mainContent.querySelector('.top-bar, .top-header, header');
            if (existing) existing.remove();

            mainContent.insertAdjacentHTML('afterbegin', topBarHTML);
        }

        // ── 5. SIDEBAR TOGGLE & MOBILE DRAWER ───────────────────────────────────
        const desktopToggle = document.getElementById('sidebar-toggle');
        const mobileToggle = document.getElementById('mobile-menu-toggle');
        const container = document.querySelector('.layout-container');
        const sidebarEl = document.querySelector('aside.sidebar');

        // Desktop Toggle
        if (desktopToggle && container) {
            desktopToggle.addEventListener('click', function () {
                document.documentElement.classList.toggle('sidebar-collapsed');
                const isCollapsed = document.documentElement.classList.contains('sidebar-collapsed');
                localStorage.setItem('sidebarCollapsed', isCollapsed ? '1' : '0');
            });
            if (localStorage.getItem('sidebarCollapsed') === '1') {
                document.documentElement.classList.add('sidebar-collapsed');
            }
        }

        // Mobile Toggle (Slide out Drawer)
        if (mobileToggle && sidebarEl) {
            mobileToggle.addEventListener('click', function (e) {
                e.stopPropagation();
                sidebarEl.classList.toggle('mobile-active');
            });

            // Close sidebar when clicking outside on mobile
            document.addEventListener('click', function (e) {
                if (window.innerWidth <= 768 && sidebarEl.classList.contains('mobile-active')) {
                    if (!sidebarEl.contains(e.target) && !mobileToggle.contains(e.target)) {
                        sidebarEl.classList.remove('mobile-active');
                    }
                }
            });

            // Close sidebar when clicking a menu item on mobile
            sidebarEl.querySelectorAll('.menu-item').forEach(item => {
                item.addEventListener('click', () => {
                    if (window.innerWidth <= 768) {
                        sidebarEl.classList.remove('mobile-active');
                    }
                });
            });
        }

        // ── 6. STORE NAME & ID FROM DATABASE (via window.authContext) ───────────
        const user = window.authContext && window.authContext.user;
        if (user) {
            // 6.1 Function to update UI with store data
            const updateStoreUI = (name, id) => {
                // Update sidebar brand text
                document.querySelectorAll('.brand-text').forEach(function (el) {
                    el.textContent = name;
                });

                // Update top bar formatted string
                const topbarStoreName = document.getElementById('topbar-store-name');
                const topbarStoreId = document.getElementById('topbar-store-id');
                if (topbarStoreName) topbarStoreName.textContent = name;
                if (topbarStoreId) topbarStoreId.textContent = id;

                // Maintain compatibility with any other .shop-name elements if they exist
                document.querySelectorAll('.shop-name').forEach(function (el) {
                    if (!el.classList.contains('shop-name-topbar')) {
                        el.textContent = name;
                    }
                });
            };

            // 6.2 Display cached data first to prevent UI jumping
            let shopName = user.shopName || (user.storeId && user.storeId.name) || 'QuadStock';
            let storeUniqueId = user.storeUniqueId || (user.storeId && user.storeId.storeUniqueId) || 'N/A';
            updateStoreUI(shopName, storeUniqueId);

            // 6.3 Fetch Live Data from Database
            const token = localStorage.getItem('authToken');
            if (token) {
                const apiBase = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
                                ? 'http://localhost:3000/api' 
                                : '/api'; // Fallback for production
                
                fetch(`${apiBase}/stores/details`, {
                    headers: {
                        'Authorization': 'Bearer ' + token,
                        'Content-Type': 'application/json'
                    }
                })
                .then(res => res.json())
                .then(result => {
                    if (result.success && result.data) {
                        const liveName = result.data.name || 'QuadStock';
                        const liveId = result.data.storeUniqueId || 'N/A';
                        updateStoreUI(liveName, liveId);
                    }
                })
                .catch(err => console.error("Could not fetch live store details:", err));
            }
        }

        // ── 7. DIGITAL CLOCK ─────────────────────────────────────────────────────
        var clockEl = document.getElementById('digital-clock');
        if (clockEl) {
            let timeFormat = '12'; // Default

            function updateClock() {
                var now = new Date();
                var DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
                var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                var h = now.getHours();
                var m = String(now.getMinutes()).padStart(2, '0');
                var s = String(now.getSeconds()).padStart(2, '0');
                
                let displayTime = '';
                if (timeFormat === '24') {
                    displayTime = `<b>${String(h).padStart(2, '0')}:${m}:${s}</b>`;
                } else {
                    var ap = h >= 12 ? 'PM' : 'AM';
                    var h12 = h % 12 || 12;
                    displayTime = `<b>${h12}:${m}:${s} ${ap}</b>`;
                }

                clockEl.innerHTML =
                    '<span style="opacity:0.6;font-size:0.85em;margin-right:5px;">' +
                    DAYS[now.getDay()] + ', ' + now.getDate() + ' ' + MONTHS[now.getMonth()] +
                    '</span>' + displayTime;
            }

            // Sync formatting with live store data
            const token = localStorage.getItem('authToken');
            if (token) {
                const apiBase = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
                    ? 'http://localhost:3000/api'
                    : '/api';
                fetch(`${apiBase}/stores/details`, {
                    headers: { 'Authorization': 'Bearer ' + token }
                }).then(r => r.json()).then(res => {
                    if (res.success && res.data.timeFormat) {
                        timeFormat = res.data.timeFormat;
                        updateClock();
                    }
                }).catch(e => { });
            }

            updateClock();
            setInterval(updateClock, 1000);
        }

        // ── 8. THEME TOGGLE ──────────────────────────────────────────────────────
        var savedTheme = localStorage.getItem('theme') || 'light';
        document.documentElement.setAttribute('data-theme', savedTheme);
        document.body.setAttribute('data-theme', savedTheme);

        var themeBtn = document.getElementById('theme-toggle');
        if (themeBtn) {
            themeBtn.innerHTML = savedTheme === 'dark'
                ? '<i class="fa-solid fa-sun"></i>'
                : '<i class="fa-solid fa-moon"></i>';

            themeBtn.addEventListener('click', function () {
                var current = document.documentElement.getAttribute('data-theme');
                var next = current === 'dark' ? 'light' : 'dark';
                document.documentElement.setAttribute('data-theme', next);
                document.body.setAttribute('data-theme', next);
                localStorage.setItem('theme', next);
                themeBtn.innerHTML = next === 'dark'
                    ? '<i class="fa-solid fa-sun"></i>'
                    : '<i class="fa-solid fa-moon"></i>';
            });
        }
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initSidebar);
    } else {
        initSidebar();
    }
})();
