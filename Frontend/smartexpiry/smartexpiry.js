document.addEventListener('DOMContentLoaded', function () {
    // --- Authentication & Context ---
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    const currentEmployee = JSON.parse(localStorage.getItem('currentEmployee'));
    const ownerId = (currentUser && currentUser.ownerId) || (currentEmployee && currentEmployee.ownerId);

    if (!ownerId) {
        window.location.href = '../Authentication/login.html';
        return;
    }

    const userRole = (currentUser && currentUser.role) || (currentEmployee && currentEmployee.role) || 'staff';

    // --- Theme Logic ---
    const themeBtn = document.getElementById('theme-toggle');
    const body = document.body;
    const documentElement = document.documentElement;
    const savedTheme = localStorage.getItem('theme') || 'light';

    function applyTheme(theme) {
        body.setAttribute('data-theme', theme);
        documentElement.setAttribute('data-theme', theme);
        if (themeBtn) {
            themeBtn.innerHTML = theme === 'dark' ? '<i class="fa-solid fa-sun"></i>' : '<i class="fa-solid fa-moon"></i>';
        }
    }

    applyTheme(savedTheme);

    if (themeBtn) {
        themeBtn.addEventListener('click', () => {
            const currentTheme = body.getAttribute('data-theme');
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            localStorage.setItem('theme', newTheme);
            applyTheme(newTheme);
        });
    }

    // --- Data Loading (Real Inventory) ---
    const inventoryKey = `inventory_${ownerId}`;
    let rawInventory = JSON.parse(localStorage.getItem(inventoryKey)) || [];

    // Only process products that have an expiry date
    let products = rawInventory.filter(p => p.expiry && p.expiry !== '');


    // --- Dynamic Sidebar Logic ---
    function setupSidebar() {
        const role = userRole;
        const sidebarTarget = document.getElementById('sidebar-target');

        const attachToggle = () => {
            const toggle = document.getElementById('sidebar-toggle');
            const container = document.querySelector('.layout-container');

            if (toggle && container) {
                const newToggle = toggle.cloneNode(true);
                toggle.parentNode.replaceChild(newToggle, toggle);

                newToggle.addEventListener('click', (e) => {
                    e.stopPropagation();
                    container.classList.toggle('sidebar-collapsed');
                });
            }
        };

        if (role === 'manager' || role === 'staff') {
            sidebarTarget.innerHTML = `
                <div class="brand">
                    <button id="sidebar-toggle" class="sidebar-toggle">
                        <i class="fa-solid fa-bars"></i>
                    </button>
                    <h2 class="brand-text">QuadStock</h2>
                </div>
                
                <nav class="sidebar-menu">
                    <a href="../Managerdashboard/manager_dashboard.html" class="menu-item" title="Dashboard">
                        <i class="fa-solid fa-house-chimney"></i>
                        <span>Dashboard</span>
                    </a>
                    <a href="../Analytics/analytics.html" class="menu-item" title="Analytics">
                        <i class="fa-solid fa-chart-simple"></i>
                        <span>Analytics</span>
                    </a>
                    <a href="../Query/query.html" class="menu-item" title="Query">
                        <i class="fa-solid fa-clipboard-question"></i>
                        <span>Query</span>
                    </a>
                    <a href="../Inventory/inventory.html" class="menu-item" title="Inventory">
                        <i class="fa-solid fa-boxes-stacked"></i>
                        <span>Inventory</span>
                    </a>
                    <a href="smartexpiry.html" class="menu-item active" title="Smart Expiry">
                        <i class="fa-solid fa-hourglass-end"></i>
                        <span>Smart Expiry</span>
                    </a>

                    <a href="../Complain/complain.html" class="menu-item" title="Complain">
                        <i class="fa-solid fa-triangle-exclamation"></i>
                        <span>Complain</span>
                    </a>
                    <a href="../Udhaar/udhaar.html" class="menu-item" title="Pending Payments">
                        <i class="fa-solid fa-indian-rupee-sign"></i>
                        <span>Udhaar/Pending</span>
                    </a>
                    <a href="../Settings/settings.html" class="menu-item" title="Settings">
                        <i class="fa-solid fa-gear"></i>
                        <span>Settings</span>
                    </a>
                    <a href="../landing/landing.html" class="menu-item" title="Logout">
                        <i class="fa-solid fa-right-from-bracket"></i>
                        <span>Logout</span>
                    </a>
                </nav>

                <div class="sidebar-footer-card">
                    <div class="support-illustration">
                        <svg viewBox="0 0 100 100" class="illus-svg">
                            <circle cx="50" cy="35" r="15" fill="#333" />
                            <path d="M20,80 Q50,70 80,80 V100 H20 Z" fill="#333" />
                            <rect x="15" y="45" width="25" height="15" rx="2" fill="#555" transform="rotate(-15 27 52)" />
                        </svg>
                    </div>
                    <a href="../Footer/contact.html" class="btn-support" style="text-decoration: none; display: inline-block; text-align: center;">
                        <i class="fa-regular fa-life-ring"></i> Support
                    </a>
                </div>
            `;

            // Update Shop Name
            const userProfile = document.querySelector('.user-profile');
            if (userProfile) {
                userProfile.className = 'shop-name-container';
                userProfile.innerHTML = `
                    <i class="fa-solid fa-store" style="color: var(--primary-color); margin-right: 0.5rem;"></i>
                    <span class="shop-name">${(currentUser && currentUser.shopName) || (currentEmployee && currentEmployee.shopName) || 'QuadStock Store'}</span>
                `;
            }
        } else {
            sidebarTarget.innerHTML = `
            <div class="brand">
                <button id="sidebar-toggle" class="sidebar-toggle">
                    <i class="fa-solid fa-bars"></i>
                </button>
                <h2 class="brand-text">QuadStock</h2>
            </div>
            <nav class="sidebar-menu">
                <a href="../Ownerdashboard/dashboard.html" class="menu-item " title="Dashboard">
                    <i class="fa-solid fa-house"></i>
                    <span>Dashboard</span>
                </a>
                <a href="../Analytics/analytics.html" class="menu-item " title="Analytics">
                    <i class="fa-solid fa-chart-simple"></i>
                    <span>Analytics</span>
                </a>
                <a href="../Query/query.html" class="menu-item " title="Query">
                    <i class="fa-solid fa-clipboard-question"></i>
                    <span>Query</span>
                </a>
                <a href="../Inventory/inventory.html" class="menu-item " title="Inventory">
                    <i class="fa-solid fa-boxes-stacked"></i>
                    <span>Inventory</span>
                </a>
                <a href="../Employees/employees.html" class="menu-item " title="Employees">
                    <i class="fa-solid fa-users"></i>
                    <span>Employees</span>
                </a>
                <a href="../smartexpiry/smartexpiry.html" class="menu-item active" title="Smart Expiry">
                    <i class="fa-solid fa-hourglass-end"></i>
                    <span>Smart Expiry</span>
                </a>

                <a href="../Complain/complain.html" class="menu-item " title="Complaints">
                    <div style="position:relative;">
                        <i class="fa-solid fa-triangle-exclamation"></i>
                        <span id="nav-badge-complain" class="nav-badge" style="display:none;">0</span>
                    </div>
                    <span>Complaints</span>
                </a>
                <a href="../Udhaar/udhaar.html" class="menu-item " title="Pending Payments">
                    <i class="fa-solid fa-indian-rupee-sign"></i>
                    <span>Udhaar/Pending</span>
                </a>
                <a href="../Settings/settings.html" class="menu-item " title="Settings">
                    <i class="fa-solid fa-gear"></i>
                    <span>Settings</span>
                </a>
                <a href="../landing/landing.html" class="menu-item" title="Logout">
                    <i class="fa-solid fa-right-from-bracket"></i>
                    <span>Logout</span>
                </a>
            </nav>
            <div class="sidebar-footer-card">
                <div class="support-illustration">
                    <svg viewBox="0 0 100 100" class="illus-svg">
                        <circle cx="50" cy="35" r="15" fill="#333" />
                        <path d="M20,80 Q50,70 80,80 V100 H20 Z" fill="#333" />
                        <rect x="15" y="45" width="25" height="15" rx="2" fill="#555" transform="rotate(-15 27 52)" />
                    </svg>
                </div>
                <a href="../Footer/contact.html" class="btn-support" style="text-decoration: none; display: inline-block; text-align: center;">
                    <i class="fa-regular fa-life-ring"></i> Support
                </a>
            </div>
            `;

            // Update Shop Name
            const userProfile = document.querySelector('.user-profile');
            if (userProfile) {
                userProfile.className = 'shop-name-container';
                userProfile.innerHTML = `
                    <i class="fa-solid fa-store" style="color: var(--primary-color); margin-right: 0.5rem;"></i>
                    <span class="shop-name">${(currentUser && currentUser.shopName) || (currentEmployee && currentEmployee.shopName) || 'QuadStock Store'}</span>
                `;
            }
        }

        attachToggle();
    }

    setupSidebar();

    // --- Logic: Calculate Days Remaining & FEFO ---
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Enrich data
    products = products.map(p => {
        const exp = new Date(p.expiry);
        const diffTime = exp - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return { ...p, daysRemaining: diffDays, rawDate: exp };
    });

    // FEFO Sort (First Expiring First Out) -> Ascending Days Remaining
    products.sort((a, b) => a.daysRemaining - b.daysRemaining);

    // --- DOM Elements ---
    const expiryList = document.getElementById('expiry-list');
    const statExpired = document.getElementById('stat-expired');
    const stat7Days = document.getElementById('stat-7days');
    const stat30Days = document.getElementById('stat-30days');
    const filterBtns = document.querySelectorAll('.filter-btn');
    const bulkActions = document.getElementById('bulk-actions');
    const selectedCountSpan = document.getElementById('selected-count');
    const searchInput = document.getElementById('search-input');
    const sortSelect = document.getElementById('sort-select');

    let currentFilter = 'all';
    let selectedItems = new Set();

    // --- Render Function ---
    function renderList() {
        expiryList.innerHTML = '';
        let countExpired = 0;
        let count7 = 0;
        let count30 = 0;

        // Statistics Count
        products.forEach(p => {
            if (p.daysRemaining < 0) countExpired++;
            else if (p.daysRemaining <= 7) count7++;
            else if (p.daysRemaining <= 30) count30++;
        });

        statExpired.textContent = countExpired;
        stat7Days.textContent = count7;
        stat30Days.textContent = count30;

        // Filtering
        let filtered = products.filter(p => {
            // Category/Date Filter
            let matchesFilter = true;
            if (currentFilter === 'expired') matchesFilter = p.daysRemaining < 0;
            else if (currentFilter === '7days') matchesFilter = p.daysRemaining >= 0 && p.daysRemaining <= 7;
            else if (currentFilter === '14days') matchesFilter = p.daysRemaining >= 0 && p.daysRemaining <= 14;
            else if (currentFilter === '30days') matchesFilter = p.daysRemaining >= 0 && p.daysRemaining <= 30;

            // Search Filter
            let matchesSearch = true;
            if (searchInput && searchInput.value.trim() !== '') {
                const term = searchInput.value.toLowerCase();
                matchesSearch = p.name.toLowerCase().includes(term) ||
                    p.batch.toLowerCase().includes(term) ||
                    p.category.toLowerCase().includes(term);
            }

            return matchesFilter && matchesSearch;
        });

        // Sorting
        if (sortSelect) {
            const sortVal = sortSelect.value;
            filtered.sort((a, b) => {
                if (sortVal === 'expiry-asc') return a.daysRemaining - b.daysRemaining;
                if (sortVal === 'expiry-desc') return b.daysRemaining - a.daysRemaining;
                if (sortVal === 'name-asc') return a.name.localeCompare(b.name);
                if (sortVal === 'quantity-desc') return b.quantity - a.quantity;
                return 0;
            });
        }

        if (filtered.length === 0) {
            expiryList.innerHTML = `<div style="text-align:center; padding: 2rem; color: var(--text-secondary);">No items found for this filter.</div>`;
        }

        // Update Notification Bell Count
        const totalAlerts = countExpired + count7 + count30;
        const notifBtn = document.querySelector('.notif-btn');
        if (notifBtn && totalAlerts > 0) {
            notifBtn.innerHTML = `<i class="fa-solid fa-bell"></i><span style="position: absolute; top: 0; right: 0; background: #ef4444; color: white; border-radius: 50%; width: 16px; height: 16px; font-size: 10px; display: flex; align-items: center; justify-content: center; border: 2px solid white;">${totalAlerts}</span>`;
        }

        filtered.forEach(p => {
            let statusClass = '';
            let statusText = '';
            let badgeClass = '';
            let badgeColor = '';

            if (p.daysRemaining < 0) {
                statusClass = 'expired';
                statusText = `Expired ${Math.abs(p.daysRemaining)} days ago`;
                badgeClass = 'red';
                badgeColor = '#fee2e2';
            } else if (p.daysRemaining <= 7) {
                statusClass = 'warning';
                statusText = `Expires in ${p.daysRemaining} days`;
                badgeClass = 'red';
                badgeColor = '#fee2e2';
            } else if (p.daysRemaining <= 14) {
                statusClass = 'warning';
                statusText = `Expires in ${p.daysRemaining} days`;
                badgeClass = 'orange';
                badgeColor = '#ffedd5';
            } else if (p.daysRemaining <= 30) {
                statusClass = 'soon';
                statusText = `Expires in ${p.daysRemaining} days`;
                badgeClass = 'yellow';
                badgeColor = '#fef9c3';
            } else {
                statusText = `Expires in ${p.daysRemaining} days`;
                badgeClass = 'blue';
                badgeColor = '#e0f2fe';
            }

            const isSelected = selectedItems.has(p.id);

            let progressPct = 0;
            let progressColor = '#e2e8f0';

            if (p.daysRemaining < 0) {
                progressPct = 100;
                progressColor = '#ef4444';
            } else {
                progressPct = Math.min(100, Math.max(5, (p.daysRemaining / 60) * 100));
                if (p.daysRemaining <= 7) progressColor = '#ef4444';
                else if (p.daysRemaining <= 30) progressColor = '#eab308';
                else progressColor = '#22c55e';
            }

            let priceHtml = `<div class="price-info" style="font-weight:600; color:var(--text-primary); font-size: 0.95rem; margin-top:0.25rem;">MRP: ₹${p.price}</div>`;

            if (p.discount) {
                let finalPrice = p.price;
                if (p.discount.type === 'percent') {
                    finalPrice = p.price - (p.price * (p.discount.value / 100));
                } else {
                    finalPrice = Math.max(0, p.price - p.discount.value);
                }
                finalPrice = Math.round(finalPrice * 100) / 100;

                priceHtml = `
                    <div class="price-info" style="margin-top:0.25rem; display:flex; align-items:center; gap:0.5rem;">
                        <span style="text-decoration: line-through; color: var(--text-secondary); font-size: 0.85em;">₹${p.price}</span>
                        <span style="font-weight: 700; color: #16a34a; font-size: 0.95em;">₹${finalPrice}</span>
                        <span class="discount-badge" style="background:#dcfce7; color:#16a34a; padding:2px 6px; border-radius:4px; font-size:0.75rem; font-weight:700;">${p.discount.type === 'percent' ? p.discount.value + '% OFF' : '₹' + p.discount.value + ' OFF'}</span>
                    </div>
                `;
            }

            const item = document.createElement('div');
            item.className = `timeline-item ${statusClass}`;
            item.innerHTML = `
                <input type="checkbox" class="item-check" data-id="${p.id}" ${isSelected ? 'checked' : ''}>
                <div class="prod-cell" style="cursor: pointer;">
                    <div class="prod-img" style="background: ${badgeColor};">
                        <img src="${p.image}" alt="${p.name}">
                    </div>
                    <div class="item-info">
                        <h4>${p.name} <span style="font-size:0.8rem; color:var(--text-secondary); font-weight:400;">(Batch: ${p.batch})</span> </h4>
                        <div style="display:flex; flex-direction:column; gap:0.1rem;">
                            <p>${p.category} • Qty: ${p.quantity}</p>
                            ${priceHtml}
                        </div>
                        <div class="expiry-progress-container" title="Freshness Indicator">
                            <div class="expiry-progress-bar" style="width: ${progressPct}%; background: ${progressColor};"></div>
                        </div>
                    </div>
                </div>
                <div class="days-badge ${badgeClass}" style="min-width: 120px;">
                    ${statusText}
                </div>
                <div style="font-size: 0.85rem; color: var(--text-secondary); font-weight:600;">
                    ${p.rawDate.toLocaleDateString()}
                </div>
                <button class="action-btn" style="background: transparent; border: 1px solid var(--border-color); margin-left: auto;">
                    <i class="fa-solid fa-eye"></i>
                </button>
            `;

            const prodCell = item.querySelector('.prod-cell');
            prodCell.addEventListener('click', () => viewProductDetails(p));

            const viewBtn = item.querySelector('.action-btn');
            viewBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                viewProductDetails(p);
            });

            expiryList.appendChild(item);
        });

        document.querySelectorAll('.item-check').forEach(cb => {
            cb.addEventListener('change', (e) => {
                const id = parseInt(e.target.dataset.id);
                if (e.target.checked) selectedItems.add(id);
                else selectedItems.delete(id);
                updateBulkActions();
            });
        });
    }

    function updateBulkActions() {
        const count = selectedItems.size;
        selectedCountSpan.textContent = count;
        if (count > 0) {
            bulkActions.classList.add('visible');
        } else {
            bulkActions.classList.remove('visible');
        }
    }

    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            filterBtns.forEach(b => {
                b.classList.remove('active');
                b.classList.remove('active-red');
                b.classList.remove('active-orange');
                b.classList.remove('active-yellow');
            });
            btn.classList.add('active');
            if (btn.dataset.filter === '7days') btn.classList.add('active-red');
            if (btn.dataset.filter === '14days') btn.classList.add('active-orange');
            if (btn.dataset.filter === '30days') btn.classList.add('active-yellow');
            currentFilter = btn.dataset.filter;
            renderList();
        });
    });

    if (searchInput) searchInput.addEventListener('input', renderList);
    if (sortSelect) sortSelect.addEventListener('change', renderList);

    renderList();

    const modal = document.getElementById('action-modal');
    const modalTitle = document.getElementById('modal-title');
    const modalBody = document.getElementById('modal-body');
    const modalConfirm = document.getElementById('modal-confirm');
    const modalCancel = document.getElementById('modal-cancel');
    const toastContainer = document.getElementById('toast-container');

    let currentConfirmAction = null;

    function showModal(title, htmlContent, onConfirmAction) {
        modalTitle.textContent = title;
        modalBody.innerHTML = htmlContent;
        currentConfirmAction = onConfirmAction;
        modal.classList.add('visible');
    }

    function hideModal() {
        modal.classList.remove('visible');
        currentConfirmAction = null;
    }

    if (modalCancel) modalCancel.addEventListener('click', hideModal);
    if (modalConfirm) {
        modalConfirm.addEventListener('click', () => {
            if (currentConfirmAction) currentConfirmAction();
            hideModal();
        });
    }

    function showToast(message, type = 'success') {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <i class="fa-solid ${type === 'success' ? 'fa-circle-check' : 'fa-circle-exclamation'}"></i>
            <span>${message}</span>
        `;
        toastContainer.appendChild(toast);
        setTimeout(() => {
            toast.style.animation = 'fadeOut 0.5s forwards';
            setTimeout(() => {
                toast.remove();
            }, 500);
        }, 3000);
    }

    const btnDiscount = document.querySelector('.btn-discount');
    const btnReturn = document.querySelector('.btn-return');
    const btnDispose = document.querySelector('.btn-dispose');

    if (btnDiscount) {
        btnDiscount.addEventListener('click', () => {
            showModal(
                '🎉 Dhamaka Sale / Discount',
                `
                <p style="margin-bottom:1rem; color:var(--text-secondary);">Clear stock quickly before expiry. <i>"Sasta becho, nuksan bachao!"</i></p>
                <div class="radio-group">
                    <label class="radio-label"><input type="radio" name="discType" value="percent" checked> Percentage (%) OFF</label>
                    <label class="radio-label"><input type="radio" name="discType" value="flat"> Flat ₹ OFF</label>
                </div>
                <div class="input-group">
                    <label>Discount Value</label>
                    <input type="number" id="disc-val" placeholder="e.g. 50">
                </div>
                `,
                () => {
                    const val = document.getElementById('disc-val').value;
                    const typeRadio = document.querySelector('input[name="discType"]:checked');
                    const type = typeRadio ? typeRadio.value : 'percent';
                    if (!val) {
                        showToast('Please enter a value', 'error');
                        return;
                    }
                    products = products.map(p => {
                        if (selectedItems.has(p.id)) {
                            return { ...p, discount: { type, value: parseFloat(val) } };
                        }
                        return p;
                    });
                    showToast(`Success! ${val}${type === 'percent' ? '%' : '₹'} Discount applied! 🛍️`, 'success');
                    selectedItems.clear();
                    updateBulkActions();
                    renderList();
                }
            );
        });
    }

    if (btnReturn) {
        btnReturn.addEventListener('click', () => {
            const count = selectedItems.size;
            showModal(
                '🚚 Return to Vendor',
                `
                <p style="margin-bottom:1rem; color:var(--text-secondary);">Returning <strong>${count}</strong> items. <i>"Mal wapas, paisa wapas."</i></p>
                <div class="input-group">
                    <label>Select Reason</label>
                    <select>
                        <option>Expired Stock</option>
                        <option>Damaged / Defective</option>
                        <option>Excess Inventory</option>
                    </select>
                </div>
                `,
                () => {
                    products = products.filter(p => !selectedItems.has(p.id));
                    selectedItems.clear();
                    updateBulkActions();
                    renderList();
                    showToast(`Returned ${count} items. 📄`, 'success');
                }
            );
        });
    }

    if (btnDispose) {
        btnDispose.addEventListener('click', () => {
            const count = selectedItems.size;
            const loss = count * 1500;
            showModal(
                '🗑️ Dispose Stock',
                `
                <p style="margin-bottom:1rem; color:var(--c-red-text);">⚠️ Total loss action. <i>"Kachra Seth ko bulao?"</i></p>
                <div style="background:#fee2e2; padding:1rem; border-radius:1rem; color:#991b1b; display:flex; justify-content:space-between; align-items:center;">
                    <span>Estimated Loss:</span>
                    <span style="font-weight:800; font-size:1.1rem;">₹${loss.toLocaleString('en-IN')}</span>
                </div>
                `,
                () => {
                    products = products.filter(p => !selectedItems.has(p.id));
                    selectedItems.clear();
                    updateBulkActions();
                    renderList();
                    showToast(`Disposed ${count} items. Loss recorded. 📉`, 'success');
                }
            );
        });
    }

    function viewProductDetails(p) {
        let priceDisplay = `<span style="font-size:1.2rem; font-weight:700;">₹${p.price}</span>`;
        if (p.discount) {
            let finalPrice = p.discount.type === 'percent'
                ? p.price - (p.price * (p.discount.value / 100))
                : Math.max(0, p.price - p.discount.value);
            finalPrice = Math.round(finalPrice * 100) / 100;
            priceDisplay = `
                <div style="display:flex; align-items:center; gap:0.5rem;">
                    <span style="text-decoration: line-through; color: var(--text-secondary);">₹${p.price}</span>
                    <span style="font-size:1.4rem; font-weight:700; color:#16a34a;">₹${finalPrice}</span>
                </div>
            `;
        }
        const html = `
            <div style="display:flex; gap:1.5rem; align-items:flex-start;">
                <div style="width:100px; height:100px; border-radius:1rem; overflow:hidden; flex-shrink:0;">
                    <img src="${p.image}" style="width:100%; height:100%; object-fit:cover;" alt="${p.name}">
                </div>
                <div style="flex:1;">
                    <h4 style="font-size:1.3rem; margin-bottom:0.25rem;">${p.name}</h4>
                    <p style="color:var(--text-secondary); margin-bottom:0.5rem;">Batch: ${p.batch}</p>
                    <div style="margin-bottom:1rem;">${priceDisplay}</div>
                </div>
            </div>
        `;
        showModal('📦 Product Details', html, () => { hideModal(); });
        if (modalConfirm) modalConfirm.innerText = "Close";
    }

    function updateClock() {
        const now = new Date();
        const clockEl = document.getElementById('digital-clock');
        if (clockEl) {
            clockEl.innerHTML = `<span style="font-weight:800;">${now.toLocaleTimeString()}</span>`;
        }
    }
    setInterval(updateClock, 1000);
    updateClock();
});
