import CONFIG from '../Shared/Utils/config.js';

document.addEventListener('DOMContentLoaded', () => {

    // --- Authentication & Context ---
    const ctx = window.authContext;
    if (!ctx || !ctx.isAuthenticated) {
        window.location.href = '../Authentication/login.html';
        return;
    }

    const { role: userRole, ownerRefId: ownerId, user } = ctx;

    // Theme, Shop name and Clock are now handled by guard.js

    const INVENTORY_KEY = `inventory_${ownerId}`;
    let inventory = [];

    // --- State ---
    let stats = { expired: 0, critical: 0, warning: 0, healthy: 0 };
    let activeFilter = 'all';
    let searchQuery = '';
    let sortConfig = { key: 'expiryDate', direction: 'asc' };

    // --- UI Logic (Initial) ---
    function initialize() {
        fetchInventory();
        setupEventListeners();
        // Clock handled by sidebar.js
    }

    async function fetchInventory() {
        try {
            const response = await fetch(`${CONFIG.API_BASE_URL}/inventory/all?ownerId=${ownerId}`);
            const result = await response.json();
            if (response.ok && result.success) {
                inventory = result.data;
                processInventory();
            } else {
                // Fallback to local if backend fails for any reason during migration
                inventory = JSON.parse(localStorage.getItem(INVENTORY_KEY)) || [];
                processInventory();
            }
        } catch (err) {
            console.error("Fetch Error:", err);
            inventory = JSON.parse(localStorage.getItem(INVENTORY_KEY)) || [];
            processInventory();
        }
    }

    function processInventory() {
        calculateStats();
        renderStats();
        renderTable();
    }

    function calculateStats() {
        const now = new Date();
        stats = { expired: 0, critical: 0, warning: 0, healthy: 0 };

        inventory.forEach(item => {
            const expiryDate = new Date(item.expiryDate);
            const daysLeft = Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24));

            if (daysLeft <= 0) stats.expired++;
            else if (daysLeft <= 30) stats.critical++;
            else if (daysLeft <= 90) stats.warning++;
            else stats.healthy++;
        });
    }

    function renderStats() {
        document.getElementById('expired-count').textContent = stats.expired;
        document.getElementById('critical-count').textContent = stats.critical;
        document.getElementById('warning-count').textContent = stats.warning;
        document.getElementById('healthy-count').textContent = stats.healthy;
    }

    function getStatusInfo(daysLeft) {
        if (daysLeft <= 0) return { text: 'Expired', class: 'status-expired' };
        if (daysLeft <= 30) return { text: 'Critical', class: 'status-critical' };
        if (daysLeft <= 90) return { text: 'Warning', class: 'status-warning' };
        return { text: 'Healthy', class: 'status-healthy' };
    }

    function renderTable() {
        const tbody = document.getElementById('expiry-tbody');
        tbody.innerHTML = '';

        let filtered = inventory.filter(item => {
            const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (item.sku && item.sku.toLowerCase().includes(searchQuery.toLowerCase()));

            const expiryDate = new Date(item.expiryDate);
            const daysLeft = Math.ceil((expiryDate - new Date()) / (1000 * 60 * 60 * 24));

            if (activeFilter === 'expired') return matchesSearch && daysLeft <= 0;
            if (activeFilter === 'critical') return matchesSearch && daysLeft > 0 && daysLeft <= 30;
            if (activeFilter === 'warning') return matchesSearch && daysLeft > 30 && daysLeft <= 90;
            return matchesSearch;
        });

        // Sorting
        filtered.sort((a, b) => {
            let valA = a[sortConfig.key];
            let valB = b[sortConfig.key];

            if (sortConfig.key === 'expiryDate') {
                valA = new Date(valA);
                valB = new Date(valB);
            }

            if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
            if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });

        if (filtered.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" class="no-data">No products found matching filters.</td></tr>`;
            return;
        }

        filtered.forEach(item => {
            const expiryDate = new Date(item.expiryDate);
            const daysLeft = Math.ceil((expiryDate - new Date()) / (1000 * 60 * 60 * 24));
            const status = getStatusInfo(daysLeft);

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>
                    <div class="product-info">
                        <div class="product-name">${item.name}</div>
                        <div class="product-sku">${item.sku || 'N/A'}</div>
                    </div>
                </td>
                <td>${item.category || 'General'}</td>
                <td>${item.quantity} ${item.unit || 'pcs'}</td>
                <td>
                    <div class="expiry-date-cell">
                        ${expiryDate.toLocaleDateString()}
                        <span class="days-remaining">(${daysLeft <= 0 ? 'Lapsed' : daysLeft + ' days left'})</span>
                    </div>
                </td>
                <td><span class="status-badge ${status.class}">${status.text}</span></td>
                <td>
                    <div class="actions">
                        <button class="btn-icon" onclick="viewProduct('${item._id || item.id}')" title="View"><i class="fa-solid fa-eye"></i></button>
                        <button class="btn-icon" onclick="notifyVendor('${item._id || item.id}')" title="Notify Vendor"><i class="fa-solid fa-envelope"></i></button>
                    </div>
                </td>
            `;
            tbody.appendChild(tr);
        });
    }

    function setupEventListeners() {
        // Filter Tabs
        document.querySelectorAll('.filter-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                activeFilter = tab.dataset.filter;
                renderTable();
            });
        });

        // Search
        document.getElementById('search-products').addEventListener('input', (e) => {
            searchQuery = e.target.value;
            renderTable();
        });

        // Sorting
        document.querySelectorAll('th[data-sort]').forEach(th => {
            th.addEventListener('click', () => {
                const key = th.dataset.sort;
                if (sortConfig.key === key) {
                    sortConfig.direction = sortConfig.direction === 'asc' ? 'desc' : 'asc';
                } else {
                    sortConfig.key = key;
                    sortConfig.direction = 'asc';
                }

                // Update UI icons
                document.querySelectorAll('th i').forEach(i => i.remove());
                const icon = document.createElement('i');
                icon.className = `fa-solid fa-sort-${sortConfig.direction === 'asc' ? 'up' : 'down'} sort-icon`;
                th.appendChild(icon);

                renderTable();
            });
        });

        // Sidebar and Theme handled by shared sidebar.js
    }


    initialize(); // Setup UI & first fetch
    setInterval(fetchInventory, 15000); // Live refresh every 15s

    // Export window functions
    window.viewProduct = (id) => {
        const item = inventory.find(p => (p._id || p.id) === id);
        if (item) alert(`Product: ${item.name}\nExpiry: ${item.expiryDate}\nStock: ${item.quantity}`);
    };

    window.notifyVendor = (id) => {
        const item = inventory.find(p => (p._id || p.id) === id);
        if (item) showToast(`Notification sent to vendor for ${item.name}`, 'success');
    };

    function showToast(message, type = 'info') {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        container.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    }
});
