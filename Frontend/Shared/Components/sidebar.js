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
                    <div class="store-identity">
                        <i class="fa-solid fa-store store-identity-icon"></i>
                        <div>
                            <div class="shop-name-topbar shop-name">QuadStock</div>
                            <div class="store-id-text" id="store-id-badge" style="display:none;">ID: ...</div>
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

        // ── 5. SIDEBAR TOGGLE ────────────────────────────────────────────────────
        const toggleBtn = document.getElementById('sidebar-toggle');
        const container = document.querySelector('.layout-container');
        if (toggleBtn && container) {
            toggleBtn.addEventListener('click', function () {
                container.classList.toggle('sidebar-collapsed');
                // Persist collapsed state
                const isCollapsed = container.classList.contains('sidebar-collapsed');
                localStorage.setItem('sidebarCollapsed', isCollapsed ? '1' : '0');
            });
            // Restore collapsed state
            if (localStorage.getItem('sidebarCollapsed') === '1') {
                container.classList.add('sidebar-collapsed');
            }
        }

        // ── 6. STORE NAME & ID FROM DATABASE (via window.authContext) ───────────
        const user = window.authContext && window.authContext.user;
        if (user) {
            const shopName = user.shopName || (user.storeId && user.storeId.name) || 'QuadStock';
            // Update all shop-name elements
            document.querySelectorAll('.shop-name, .brand-text').forEach(function (el) {
                el.textContent = shopName;
            });
            // Also update top-bar specific one
            const topbarName = document.querySelector('.shop-name-topbar');
            if (topbarName) topbarName.textContent = shopName;

            // Store ID badge
            const storeUniqueId = user.storeUniqueId || (user.storeId && user.storeId.storeUniqueId);
            const badge = document.getElementById('store-id-badge');
            if (badge && storeUniqueId) {
                badge.textContent = 'ID: ' + storeUniqueId;
                badge.style.display = 'block';
            }
        }

        // ── 7. DIGITAL CLOCK ─────────────────────────────────────────────────────
        var clockEl = document.getElementById('digital-clock');
        if (clockEl) {
            function updateClock() {
                var now = new Date();
                var DAYS   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
                var MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
                var h  = now.getHours();
                var m  = String(now.getMinutes()).padStart(2, '0');
                var s  = String(now.getSeconds()).padStart(2, '0');
                var ap = h >= 12 ? 'PM' : 'AM';
                var h12= h % 12 || 12;
                clockEl.innerHTML =
                    '<span style="opacity:0.6;font-size:0.85em;margin-right:5px;">' +
                    DAYS[now.getDay()] + ', ' + now.getDate() + ' ' + MONTHS[now.getMonth()] +
                    '</span><b>' + h12 + ':' + m + ':' + s + ' ' + ap + '</b>';
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
