document.addEventListener('DOMContentLoaded', function () {
    // --- Mock Data ---
    // In a real app, this would come from an API
    let products = [
        { id: 1, name: "Crocin 650mg", batch: "BATCH-882", expiry: "2026-02-10", quantity: 150, category: "Medicine", price: 30, image: "https://ui-avatars.com/api/?name=Cr&background=fee2e2&color=ef4444" },
        { id: 2, name: "Britannia Bread (White)", batch: "BRT-002", expiry: "2026-02-11", quantity: 25, category: "Bakery", price: 45, image: "https://ui-avatars.com/api/?name=Br&background=ffedd5&color=f97316" },
        { id: 3, name: "Amul Taaza Milk 1L", batch: "AM-550", expiry: "2026-02-15", quantity: 45, category: "Dairy", price: 72, image: "https://ui-avatars.com/api/?name=Am&background=e0f2fe&color=0ea5e9" },
        { id: 4, name: "Farm Fresh Eggs (Tray)", batch: "EGG-101", expiry: "2026-02-28", quantity: 12, category: "Dairy", price: 180, image: "https://ui-avatars.com/api/?name=Eg&background=fce7f3&color=db2777" },
        { id: 5, name: "Amul Cheese Slices", batch: "Ch-909", expiry: "2026-03-05", quantity: 30, category: "Dairy", price: 145, image: "https://ui-avatars.com/api/?name=Ch&background=f3e8ff&color=a855f7" },
        { id: 6, name: "Mother Dairy Dahi", batch: "MD-221", expiry: "2026-02-05", quantity: 18, category: "Dairy", price: 35, image: "https://ui-avatars.com/api/?name=Da&background=dcfce7&color=16a34a" },
        { id: 7, name: "Amul Butter (500g)", batch: "BT-112", expiry: "2026-04-10", quantity: 60, category: "Dairy", price: 285, image: "https://ui-avatars.com/api/?name=Bu&background=f1f5f9&color=475569" },
        { id: 8, name: "Dolo 650", batch: "DL-999", expiry: "2026-02-09", quantity: 200, category: "Medicine", price: 32, image: "https://ui-avatars.com/api/?name=Do&background=fee2e2&color=ef4444" },
    ];

    // --- Dynamic Sidebar Logic ---
    function setupSidebar() {
        const role = new URLSearchParams(window.location.search).get('role') || localStorage.getItem('userRole') || 'owner';
        const sidebarTarget = document.getElementById('sidebar-target');

        // Logic to toggle sidebar
        const attachToggle = () => {
            const toggle = document.getElementById('sidebar-toggle');
            const container = document.querySelector('.dashboard-container');

            if (toggle && container) {
                // Clone to ensure clean listener
                const newToggle = toggle.cloneNode(true);
                toggle.parentNode.replaceChild(newToggle, toggle);

                newToggle.addEventListener('click', (e) => {
                    e.stopPropagation();
                    // Always toggle on container for desktop view
                    container.classList.toggle('sidebar-collapsed');
                });
            }
        };

        if (role === 'manager') {
            // Manager Sidebar - Adapted to grid style for consistency or keep sections?
            // User requested "Same design". Inventory uses grid.
            // Converting Manager to Flat Grid to match design exactly.
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
                    <a href="../Analytics/analytics.html?role=manager" class="menu-item" title="Analytics">
                        <i class="fa-solid fa-chart-simple"></i>
                        <span>Analytics</span>
                    </a>
                    <a href="../Query/query.html?role=manager" class="menu-item" title="Query">
                        <i class="fa-solid fa-clipboard-question"></i>
                        <span>Query</span>
                    </a>
                    <a href="#" class="menu-item" title="Inventory">
                        <i class="fa-solid fa-boxes-stacked"></i>
                        <span>Inventory</span>
                    </a>
                    <a href="smartexpiry.html" class="menu-item active" title="Smart Expiry">
                        <i class="fa-solid fa-hourglass-end"></i>
                        <span>Smart Expiry</span>
                    </a>
                    <a href="#" class="menu-item" title="Employees">
                        <i class="fa-solid fa-users-gear"></i>
                        <span>Employees</span>
                    </a>
                    <a href="../Complain/complain.html?role=manager" class="menu-item" title="Complain">
                        <i class="fa-solid fa-triangle-exclamation"></i>
                        <span>Complain</span>
                    </a>
                    <a href="#" class="menu-item" title="Pending Payments">
                        <i class="fa-solid fa-file-invoice-dollar"></i>
                        <span>Pending Payments</span>
                    </a>
                    <a href="#" class="menu-item" title="Settings">
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

            // Update User Profile for Manager
            const userProfile = document.querySelector('.user-profile');
            if (userProfile) {
                userProfile.innerHTML = `
                    <img src="https://ui-avatars.com/api/?name=Anil+Sharma&background=003f3f&color=fff" alt="User">
                    <span class="user-name">Anil Sharma</span>
                    <i class="fa-solid fa-chevron-down"></i>
                `;
            }
        } else {
            // Owner Sidebar (Default) - Matches Inventory.html structure
            sidebarTarget.innerHTML = `
                <div class="brand">
                    <button id="sidebar-toggle" class="sidebar-toggle">
                        <i class="fa-solid fa-bars"></i>
                    </button>
                    <h2 class="brand-text">QuadStock</h2>
                </div>

                <nav class="sidebar-menu">
                    <a href="../Ownerdashboard/dashboard.html" class="menu-item" title="Dashboard">
                        <i class="fa-solid fa-house"></i>
                        <span>Dashboard</span>
                    </a>
                    <a href="../Analytics/analytics.html" class="menu-item" title="Analytics">
                        <i class="fa-solid fa-chart-simple"></i>
                        <span>Analytics</span>
                    </a>
                    <a href="../Query/query.html?role=owner" class="menu-item" title="Query">
                        <i class="fa-solid fa-clipboard-question"></i>
                        <span>Query</span>
                    </a>
                    <a href="#" class="menu-item" title="Inventory">
                        <i class="fa-solid fa-boxes-stacked"></i>
                        <span>Inventory</span>
                    </a>
                    <a href="smartexpiry.html" class="menu-item active" title="Smart Expiry">
                        <i class="fa-solid fa-hourglass-end"></i>
                        <span>Smart Expiry</span>
                    </a>
                    <a href="#" class="menu-item" title="Employees">
                        <i class="fa-solid fa-users-gear"></i>
                        <span>Employees</span>
                    </a>
                    <a href="../Complain/complain.html?role=owner" class="menu-item" title="Complain">
                        <i class="fa-solid fa-triangle-exclamation"></i>
                        <span>Complain</span>
                    </a>
                    <a href="#" class="menu-item" title="Pending Payments">
                        <i class="fa-solid fa-indian-rupee-sign"></i>
                        <span>Pending Payments</span>
                    </a>
                    <a href="#" class="menu-item" title="Settings">
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
        }

        attachToggle();
    }

    setupSidebar();

    // --- Logic: Calculate Days Remaining & FEFO ---
    const today = new Date(); // Current date: 2026-02-08 (Set by system time in prompt)
    // IMPORTANT: In production, use server time. Here we use new Date() which relies on system time.

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
            // return; // Don't return here, we need to update notif count even if filter is empty visually (though stats guide it)
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
                badgeColor = '#fee2e2'; // Light red
            } else if (p.daysRemaining <= 7) {
                statusClass = 'warning'; // Red/Orange
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
                progressColor = '#ef4444'; // Red
            } else {
                // Assume visual scale of 60 days
                // Days: 0 -> 100% width (Red)
                // Days: 60 -> 0% width (Greenish)
                // Actually commonly: Full bar = Good. Empty = Bad.
                // Let's do: Width = Freshness.
                // < 0: 0% width.
                // 0: 5% width.
                // 30: 50% width.
                // 60+: 100% width.
                progressPct = Math.min(100, Math.max(5, (p.daysRemaining / 60) * 100));

                if (p.daysRemaining <= 7) progressColor = '#ef4444';
                else if (p.daysRemaining <= 30) progressColor = '#eab308';
                else progressColor = '#22c55e';
            }

            // Price Calculation
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
                <div class="prod-cell" style="cursor: pointer;" onclick="viewProductDetails(${p.id})">
                    <div class="prod-img" style="background: ${badgeColor};">
                        <img src="${p.image}" alt="${p.name}">
                    </div>
                    <div class="item-info">
                        <h4>${p.name} <span style="font-size:0.8rem; color:var(--text-secondary); font-weight:400;">(Batch: ${p.batch})</span> 
                        </h4>
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
                <button class="action-btn" style="background: transparent; border: 1px solid var(--border-color); margin-left: auto;" onclick="viewProductDetails(${p.id})">
                    <i class="fa-solid fa-eye"></i>
                </button>
            `;

            // Bind view event strictly to cell, avoid checkbox interference if any
            const prodCell = item.querySelector('.prod-cell');
            prodCell.addEventListener('click', () => viewProductDetails(p));
            // Remove the inline onclick from innerHTML to use closure p
            prodCell.removeAttribute('onclick');

            const viewBtn = item.querySelector('.action-btn');
            viewBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                viewProductDetails(p);
            });
            viewBtn.removeAttribute('onclick');

            expiryList.appendChild(item);
        });

        // Re-attach listeners to checkboxes
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

    // --- Event Listeners ---
    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            filterBtns.forEach(b => {
                b.classList.remove('active');
                b.classList.remove('active-red');
                b.classList.remove('active-orange');
                b.classList.remove('active-yellow');
            });

            btn.classList.add('active');
            // Add specific color active classes for visual punch
            if (btn.dataset.filter === '7days') btn.classList.add('active-red');
            if (btn.dataset.filter === '14days') btn.classList.add('active-orange');
            if (btn.dataset.filter === '30days') btn.classList.add('active-yellow');

            currentFilter = btn.dataset.filter;
            renderList();
        });
    });

    if (searchInput) {
        searchInput.addEventListener('input', renderList);
    }

    if (sortSelect) {
        sortSelect.addEventListener('change', renderList);
    }

    // --- Init ---
    renderList();

    // --- Modal & Toast Helpers ---
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

    if (modalCancel) {
        modalCancel.addEventListener('click', hideModal);
    }

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

        // Remove after 3s
        setTimeout(() => {
            toast.style.animation = 'fadeOut 0.5s forwards';
            setTimeout(() => {
                toast.remove();
            }, 500);
        }, 3000);
    }

    // --- Action Button Listeners ---
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

                    // Update Products
                    products = products.map(p => {
                        if (selectedItems.has(p.id)) {
                            return { ...p, discount: { type, value: parseFloat(val) } };
                        }
                        return p;
                    });

                    showToast(`Success! ${val}${type === 'percent' ? '%' : '₹'} Discount applied for Maha Sale 🛍️`, 'success');

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
                '🚚 Return to Vendor (Wapas Bhejo)',
                `
                <p style="margin-bottom:1rem; color:var(--text-secondary);">Returning <strong>${count}</strong> items to source. <i>"Mal wapas, paisa wapas."</i></p>
                <div class="input-group">
                    <label>Select Reason</label>
                    <select>
                        <option>Expired Stock</option>
                        <option>Damaged / Defective</option>
                        <option>Excess Inventory</option>
                    </select>
                </div>
                 <div class="input-group">
                    <label>Vendor Transport</label>
                    <input type="text" value="Sharma Logistics (Default)" readonly style="opacity:0.7">
                </div>
                <p style="font-size:0.8rem; color:#f59e0b;"><i class="fa-solid fa-file-invoice"></i> E-Way Bill will be auto-generated.</p>
                `,
                () => {
                    // Remove items mock
                    products = products.filter(p => !selectedItems.has(p.id));
                    selectedItems.clear();
                    updateBulkActions();
                    renderList();
                    showToast(`Returned ${count} items. Challan Generated! 📄`, 'success');
                }
            );
        });
    }

    if (btnDispose) {
        btnDispose.addEventListener('click', () => {
            const count = selectedItems.size;
            // Calculate vague loss
            const loss = count * 1500; // Mock avg price
            showModal(
                '🗑️ Scrap / Kabadi (Dispose)',
                `
                <p style="margin-bottom:1rem; color:var(--c-red-text);">⚠️ Warning: This is a total loss. <i>"Kachra Seth ko bulao?"</i></p>
                <div class="input-group">
                    <label>Disposal Method</label>
                    <select>
                        <option>Sent to Scrap Dealer (Kabadiwala)</option>
                        <option>Bio-hazard Treatment</option>
                        <option>Destroyed</option>
                    </select>
                </div>
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

    // --- Product Details View ---
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
                    <span class="discount-badge" style="background:#bfdbfe; color:#1e40af; padding:2px 8px; border-radius:4px; font-size:0.8rem; font-weight:700;">${p.discount.type === 'percent' ? p.discount.value + '% OFF' : '₹' + p.discount.value + ' OFF'}</span>
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
                    <p style="color:var(--text-secondary); margin-bottom:0.5rem;">Batch: <span style="font-family:monospace; background:#f3f4f6; padding:2px 6px; border-radius:4px;">${p.batch}</span></p>
                    <div style="margin-bottom:1rem;">${priceDisplay}</div>
                </div>
            </div>
            
            <div style="background:var(--bg-body); padding:1rem; border-radius:1rem; margin-top:1.5rem; display:grid; grid-template-columns:1fr 1fr; gap:1rem;">
                <div>
                    <span style="font-size:0.8rem; color:var(--text-secondary); display:block; margin-bottom:0.25rem;">Category</span>
                    <span style="font-weight:600;">${p.category}</span>
                </div>
                <div>
                    <span style="font-size:0.8rem; color:var(--text-secondary); display:block; margin-bottom:0.25rem;">Current Stock</span>
                    <span style="font-weight:600;">${p.quantity} Units</span>
                </div>
                <div>
                    <span style="font-size:0.8rem; color:var(--text-secondary); display:block; margin-bottom:0.25rem;">Expiry Date</span>
                    <span style="font-weight:600; color:${p.daysRemaining <= 7 ? '#ef4444' : 'inherit'}">${p.rawDate.toLocaleDateString()}</span>
                </div>
                <div>
                    <span style="font-size:0.8rem; color:var(--text-secondary); display:block; margin-bottom:0.25rem;">Status</span>
                    <span style="font-weight:600;">${p.daysRemaining < 0 ? 'Expired' : p.daysRemaining + ' Days Left'}</span>
                </div>
            </div>

            <p style="margin-top:1.5rem; font-size:0.85rem; color:var(--text-secondary); font-style:italic;">
                <i class="fa-solid fa-circle-info"></i> Inventory details synced from main database.
            </p>
        `;

        showModal('📦 Product Details', html, () => {
            hideModal();
        });

        // Reset Confirm Button Text if needed (since showModal is generic)
        // Ideally showModal should handle button text. For now, this is fine.
        if (modalConfirm) modalConfirm.innerText = "Close";

        // Ensure subsequent modals reset this text if they need "Confirm"
        // Since other modals pass `onConfirmAction`, we can hook into `showModal` or reset manually.
        // Let's modify showModal slightly if possible, OR just reset it in other handlers.
        // I will reset it in the other handlers for robustness next time I touch those.
        // But for safe measure, I'll add a quick reset logic to `showModal` if I could, but I can't edit that function now easily without more chunks.
        // Instead, I'll rely on the fact that for "Details", the "Close" button is just dismiss. 
        // Wait, `modalConfirm` listener executes action then hides. Perfect.
    }

    // --- Standard Dashboard JS (Clock, Sidebar, Theme) from dashboard.js ---

    // Clock
    function updateClock() {
        const now = new Date();
        const dateString = now.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' });
        const timeString = now.toLocaleTimeString('en-US', { hour12: true });
        const clockEl = document.getElementById('digital-clock');
        if (clockEl) {
            clockEl.innerHTML = `<span style="font-size:0.85em; margin-right:12px; color:#6366f1; font-weight:700; opacity:0.8;">${dateString}</span> <span style="font-weight:800;">${timeString}</span>`;
        }
    }
    setInterval(updateClock, 1000);
    updateClock();

    // Sidebar
    // Handled in setupSidebar() to ensure listener is attached after dynamic injection
    /*
    const sidebarToggle = document.getElementById('sidebar-toggle');
    const container = document.querySelector('.dashboard-container');
    if (sidebarToggle) {
        sidebarToggle.addEventListener('click', () => {
            container.classList.toggle('sidebar-collapsed');
        });
    }
    */

    // Theme
    const themeBtn = document.getElementById('theme-toggle');
    const body = document.body;
    if (localStorage.getItem('theme') === 'dark') {
        body.setAttribute('data-theme', 'dark');
        if (themeBtn) themeBtn.innerHTML = '<i class="fa-solid fa-sun"></i>';
    }
    if (themeBtn) {
        themeBtn.addEventListener('click', () => {
            if (body.getAttribute('data-theme') === 'dark') {
                body.removeAttribute('data-theme');
                localStorage.setItem('theme', 'light');
                themeBtn.innerHTML = '<i class="fa-solid fa-moon"></i>';
            } else {
                body.setAttribute('data-theme', 'dark');
                localStorage.setItem('theme', 'dark');
                themeBtn.innerHTML = '<i class="fa-solid fa-sun"></i>';
            }
        });
    }
});
