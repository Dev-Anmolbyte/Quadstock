/**
 * QuadStock — Shared Sidebar & Top Bar Component
 * -----------------------------------------------
 * Drop this script at the BOTTOM of any owner or staff page (before </body>).
 * It will:
 *   1. Replace the <aside class="sidebar"> with a consistent sidebar.
 *   2. Insert a standardized .top-bar into .main-content (at the top).
 *   3. Start the live clock.
 *   4. Wire the theme toggle.
 *   5. Display store name & ID fetched from window.authContext or session.
 *
 * Usage — each page must declare which link is "active":
 *   <script>window.ACTIVE_PAGE = 'inventory';</script>
 *   <script src="../Shared/Components/sidebar.js"></script>
 */
(function () {
    const initSidebar = () => {
        // ── 1. NAV ITEMS (Can be overridden by window.CUSTOM_NAV_ITEMS) ──────────
        const TRANSLATIONS = {
            hi: {
                dashboard: 'डैशबोर्ड',
                analytics: 'एनालिटिक्स',
                inventory: 'इन्वेंटरी',
                employees: 'कर्मचारी',
                smartexpiry: 'स्मार्ट एक्सपायरी',
                query: 'पूछताछ',
                complain: 'शिकायतें',
                udhaar: 'उधार',
                sales: 'पीओएस टर्मिनल',
                settings: 'सेटिंग्स',
                logout: 'लॉगआउट',
                store: 'स्टोर',
                store_id: 'स्टोर आईडी'
            }
        };

        const lang = localStorage.getItem('language') || 'en';

        const DEFAULT_NAV_ITEMS = [
            { id: 'dashboard',   icon: 'fa-house',               label: (lang === 'hi' ? TRANSLATIONS.hi.dashboard : 'Dashboard'),   href: '../Ownerdashboard/dashboard.html' },
            { id: 'analytics',   icon: 'fa-chart-simple',        label: (lang === 'hi' ? TRANSLATIONS.hi.analytics : 'Analytics'),   href: '../Analytics/analytics.html' },
            { id: 'inventory',   icon: 'fa-boxes-stacked',       label: (lang === 'hi' ? TRANSLATIONS.hi.inventory : 'Inventory'),   href: '../Inventory/inventory.html' },
            { id: 'employees',   icon: 'fa-users',               label: (lang === 'hi' ? TRANSLATIONS.hi.employees : 'Employees'),   href: '../Employees/employees.html' },
            { id: 'smartexpiry', icon: 'fa-hourglass-end',       label: (lang === 'hi' ? TRANSLATIONS.hi.smartexpiry : 'Smart Expiry'),href: '../smartexpiry/smartexpiry.html' },
            { id: 'query',       icon: 'fa-clipboard-question',  label: (lang === 'hi' ? TRANSLATIONS.hi.query : 'Queries'),     href: '../Query/query.html' },
            { id: 'complain',    icon: 'fa-circle-exclamation',  label: (lang === 'hi' ? TRANSLATIONS.hi.complain : 'Complaints'),  href: '../Complain/complain.html' },
            { id: 'udhaar',      icon: 'fa-indian-rupee-sign',   label: (lang === 'hi' ? TRANSLATIONS.hi.udhaar : 'Udhaar'),      href: '../Udhaar/udhaar.html' },
            { id: 'sales',       icon: 'fa-receipt',             label: (lang === 'hi' ? TRANSLATIONS.hi.sales : 'POS Terminal'),href: '../Sales/sales.html' },
        ];

        const user = (window.authContext && window.authContext.user) || JSON.parse(sessionStorage.getItem('user'));
        const userRole = (window.authContext && window.authContext.role) || (user && user.role) || 'staff';

        const NAV_ITEMS = (window.CUSTOM_NAV_ITEMS || DEFAULT_NAV_ITEMS).filter(item => {
            // If user is staff, hide owner-only pages
            if (userRole === 'staff') {
                return !['analytics', 'employees', 'inventory', 'smartexpiry', 'udhaar', 'sales'].includes(item.id);
            }
            return true;
        });

        const FOOTER_ITEMS = [
            { id: 'settings', icon: 'fa-gear',               label: (lang === 'hi' ? TRANSLATIONS.hi.settings : 'Settings'), href: '../Settings/settings.html' },
            { id: 'logout',   icon: 'fa-right-from-bracket', label: (lang === 'hi' ? TRANSLATIONS.hi.logout : 'Logout'),   href: '../landing/landing.html', cls: 'logout' },
        ];

        const activePage = window.ACTIVE_PAGE || '';

        // ── 2. BUILD SIDEBAR HTML ────────────────────────────────────────────────
        function buildNavLink(item) {
            const isActive = item.id === activePage ? ' active' : '';
            const extraCls = item.cls ? ' ' + item.cls : '';
            const href = item.href === '#' ? '#' : item.href;
            const clickAttr = item.onclick ? `onclick="${item.onclick}"` : '';

            // Badge Placeholder
            const badgeHTML = `<span class="nav-badge" id="badge-${item.id}" style="display:none;"></span>`;

            return `<a href="${href}" class="menu-item${isActive}${extraCls}" title="${item.label}" ${clickAttr} id="${item.id}-btn-sidebar">
                        <i class="fa-solid ${item.icon}">${badgeHTML}</i>
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
                            <div class="topbar-line">${lang === 'hi' ? TRANSLATIONS.hi.store : 'Store'} :- <span id="topbar-store-name">QuadStock</span></div>
                            <div class="topbar-line">${lang === 'hi' ? TRANSLATIONS.hi.store_id : 'Store id'} :- <span id="topbar-store-id">...</span></div>
                        </div>
                    </div>
                </div>
                <div class="header-right">
                    <div class="digital-clock" id="digital-clock">--:--:-- --</div>
                    <button class="theme-toggle-btn" id="theme-toggle" title="Toggle Theme">
                        <i class="fa-solid fa-sun"></i>
                    </button>
                </div>
            </div>
        `;

        const overlayHTML = `<div class="sidebar-overlay" id="sidebar-overlay"></div>`;

        // ── 4. INJECT INTO DOM ───────────────────────────────────────────────────
        const sidebar = document.querySelector('aside.sidebar') || document.getElementById('sidebar-target');
        if (sidebar) {
            sidebar.innerHTML = sidebarHTML;
        }

        // Inject top bar at the very top of .main-content (before existing children)
        const mainContent = document.querySelector('.main-content');
        if (mainContent && !window.HIDE_TOP_BAR) {
            // Remove any existing top-bar or top-header to avoid duplicates
            const existing = mainContent.querySelector('.top-bar, .top-header, header');
            // If the user has a custom top-header they want to KEEP, we should be careful.
            // But here we enforce the global top bar.
            if (existing && existing.id !== 'shared-top-bar') existing.remove();

            if (!mainContent.querySelector('#shared-top-bar')) {
                mainContent.insertAdjacentHTML('afterbegin', topBarHTML);
            }
        }

        // Inject Overlay (for mobile)
        if (!document.getElementById('sidebar-overlay')) {
            document.body.insertAdjacentHTML('beforeend', overlayHTML);
        }

        // ── 5. SIDEBAR TOGGLE & MOBILE DRAWER ───────────────────────────────────
        const desktopToggle = document.getElementById('sidebar-toggle');
        const mobileToggle = document.getElementById('mobile-menu-toggle');
        const container = document.querySelector('.layout-container');
        const sidebarEl = document.querySelector('aside.sidebar') || document.getElementById('sidebar-target');

        // Desktop Toggle
        if (desktopToggle && container) {
            desktopToggle.addEventListener('click', function () {
                container.classList.toggle('sidebar-collapsed');
                document.documentElement.classList.toggle('sidebar-collapsed');
                const isCollapsed = document.documentElement.classList.contains('sidebar-collapsed');
                localStorage.setItem('sidebarCollapsed', isCollapsed ? '1' : '0');
            });
            if (localStorage.getItem('sidebarCollapsed') === '1') {
                container.classList.add('sidebar-collapsed');
                document.documentElement.classList.add('sidebar-collapsed');
            }
        }

        // Mobile Toggle (Slide out Drawer)
        const overlayEl = document.getElementById('sidebar-overlay');
        
        const toggleMobileMenu = (active) => {
            if (active) {
                sidebarEl.classList.add('mobile-active');
                overlayEl.classList.add('active');
                document.body.style.overflow = 'hidden';
            } else {
                sidebarEl.classList.remove('mobile-active');
                overlayEl.classList.remove('active');
                document.body.style.overflow = '';
            }
        };

        if (mobileToggle && sidebarEl) {
            mobileToggle.addEventListener('click', function (e) {
                e.stopPropagation();
                const isActive = sidebarEl.classList.contains('mobile-active');
                toggleMobileMenu(!isActive);
            });

            // Close when clicking overlay
            if (overlayEl) {
                overlayEl.addEventListener('click', () => toggleMobileMenu(false));
            }

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
                        toggleMobileMenu(false);
                    }
                });
            });
        }

        // ── 6. STORE NAME & ID FROM DATABASE ────────────────────────────────────
        const updateStoreUI = (name, id) => {
            document.querySelectorAll('.brand-text').forEach(el => el.textContent = name);
            const topbarStoreName = document.getElementById('topbar-store-name');
            const topbarStoreId = document.getElementById('topbar-store-id');
            if (topbarStoreName) topbarStoreName.textContent = name;
            if (topbarStoreId) topbarStoreId.textContent = id;

            document.querySelectorAll('.shop-name').forEach(el => {
                if (!el.classList.contains('shop-name-topbar')) el.textContent = name;
            });
        };

        const emp = JSON.parse(sessionStorage.getItem('currentEmployee'));

        if (user || emp) {
            let shopName = (user && user.shopName) || (emp && emp.shopName) || 'QuadStock';
            let storeId = (user && (user.storeUniqueId || (user.storeId && user.storeId.storeUniqueId))) || (emp && emp.storeId) || 'N/A';
            updateStoreUI(shopName, storeId);

            const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
            if (token) {
                const apiBase = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
                                ? 'http://localhost:3000/api' : '/api';
                
                fetch(`${apiBase}/stores/details`, {
                    headers: { 'Authorization': 'Bearer ' + token }
                })
                .then(res => res.json())
                .then(result => {
                    if (result.success && result.data) {
                        const store = result.data;
                        updateStoreUI(store.name || 'QuadStock', store.storeUniqueId || 'N/A');
                        
                        // Save localization settings
                        if (store.timeFormat) localStorage.setItem('timeFormat', store.timeFormat);
                        if (store.language) localStorage.setItem('language', store.language);
                        
                        // Signal clock update if needed (it reads from localStorage or state)
                        if (window.updateClockFormat) window.updateClockFormat();
                    }
                })
                .catch(err => {});

                // ── 6.5 FETCH NOTIFICATION BADGES ───────────────────────────
                fetch(`${apiBase}/stores/notifications`, {
                    headers: { 'Authorization': 'Bearer ' + token }
                })
                .then(res => res.json())
                .then(result => {
                    if (result.success && result.data) {
                        const { queries, complaints } = result.data;
                        
                        const updateBadge = (id, count) => {
                            const badge = document.getElementById(`badge-${id}`);
                            if (badge) {
                                if (count > 0) {
                                    badge.textContent = count > 99 ? '9'+'+' : count;
                                    badge.style.display = 'flex';
                                } else {
                                    badge.style.display = 'none';
                                }
                            }
                        };
                        
                        updateBadge('query', queries);
                        updateBadge('complain', complaints);
                    }
                })
                .catch(err => {});
            }
        }

        // ── 7. DIGITAL CLOCK ─────────────────────────────────────────────────────
        var clockEl = document.getElementById('digital-clock');
        if (clockEl) {
            // Load initial format from localStorage or default
            let timeFormat = localStorage.getItem('timeFormat') || '12';

            window.updateClockFormat = function() {
                timeFormat = localStorage.getItem('timeFormat') || '12';
                updateClock();
            };

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
                    `<span style="opacity:0.6;font-size:0.85em;margin-right:5px;">${DAYS[now.getDay()]}, ${now.getDate()} ${MONTHS[now.getMonth()]}</span>${displayTime}`;
            }

            updateClock();
            setInterval(updateClock, 1000);
        }

        // ── 8. THEME TOGGLE ──────────────────────────────────────────────────────
        const themeBtn = document.getElementById('theme-toggle');
        const applyTheme = (theme) => {
            document.documentElement.setAttribute('data-theme', theme);
            document.body.setAttribute('data-theme', theme);
            if (themeBtn) {
                themeBtn.innerHTML = theme === 'dark' ? '<i class="fa-solid fa-sun"></i>' : '<i class="fa-solid fa-moon"></i>';
            }
        };

        applyTheme(localStorage.getItem('theme') || 'light');

        if (themeBtn) {
            themeBtn.addEventListener('click', function () {
                const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
                localStorage.setItem('theme', next);
                applyTheme(next);
            });
        }
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initSidebar);
    } else {
        initSidebar();
    }
})();

