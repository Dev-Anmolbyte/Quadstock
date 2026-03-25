import CONFIG from '../Shared/Utils/config.js';

document.addEventListener('DOMContentLoaded', () => {

    const ctx = window.authContext;
    if (!ctx || !ctx.isAuthenticated) {
        window.location.href = '../Authentication/login.html';
        return;
    }

    const { role: userRole, ownerRefId: ownerId, user } = ctx;

    let inventory = [];
    let selectedItems = new Set();
    let stats = { expired: 0, critical: 0, warning: 0, healthy: 0 };
    let activeFilter = 'all';
    let searchQuery = '';

    function initialize() {
        fetchInventory();
        setupEventListeners();
    }

    async function fetchInventory() {
        try {
            const token = localStorage.getItem('authToken');
            const response = await fetch(`${CONFIG.API_BASE_URL}/products?limit=1000`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const result = await response.json();
            if (response.ok && result.success) {
                // Ensure dates are parsed and we only show items with exp dates
                inventory = result.data.filter(item => item.exp).map(item => ({
                    ...item,
                    expiryDate: new Date(item.exp) 
                }));
                processInventory();
            } else {
                inventory = [];
                processInventory();
            }
        } catch (err) {
            console.error("Fetch Error:", err);
            inventory = [];
            processInventory();
        }
    }

    function processInventory() {
        calculateStats();
        renderStats();
        renderTimeline();
    }

    function calculateStats() {
        const now = new Date();
        stats = { expired: 0, critical: 0, warning: 0, healthy: 0 };

        inventory.forEach(item => {
            if (!item.expiryDate) return;
            const daysLeft = Math.ceil((item.expiryDate - now) / (1000 * 60 * 60 * 24));

            if (daysLeft <= 0) stats.expired++;
            else if (daysLeft <= 7) stats.critical++;
            else if (daysLeft <= 30) stats.warning++;
            else stats.healthy++;
        });
    }

    function renderStats() {
        document.getElementById('stat-expired').textContent = stats.expired;
        document.getElementById('stat-7days').textContent = stats.critical;
        document.getElementById('stat-30days').textContent = stats.warning;
    }

    function getStatusClass(daysLeft) {
        if (daysLeft <= 0) return 'expired';
        if (daysLeft <= 7) return 'warning';
        if (daysLeft <= 30) return 'soon';
        return 'healthy';
    }

    function renderTimeline() {
        const listContainer = document.getElementById('expiry-list');
        listContainer.innerHTML = '';

        let filtered = inventory.filter(item => {
            const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (item.barcode && item.barcode.toLowerCase().includes(searchQuery.toLowerCase()));

            const daysLeft = Math.ceil((item.expiryDate - new Date()) / (1000 * 60 * 60 * 24));

            if (activeFilter === 'expired') return matchesSearch && daysLeft <= 0;
            if (activeFilter === '7days') return matchesSearch && daysLeft > 0 && daysLeft <= 7;
            if (activeFilter === '14days') return matchesSearch && daysLeft > 7 && daysLeft <= 14;
            if (activeFilter === '30days') return matchesSearch && daysLeft > 14 && daysLeft <= 30;
            return matchesSearch;
        });

        filtered.sort((a, b) => a.expiryDate - b.expiryDate);

        if (filtered.length === 0) {
            listContainer.innerHTML = `<div style="padding:2rem; text-align:center; color: var(--text-secondary);">No products match the selected criteria.</div>`;
            return;
        }

        filtered.forEach(item => {
            const daysLeft = Math.ceil((item.expiryDate - new Date()) / (1000 * 60 * 60 * 24));
            const statusClass = getStatusClass(daysLeft);
            let dayText = daysLeft <= 0 ? 'Expired' : `${daysLeft} Days left`;
            let badgeColor = daysLeft <= 0 ? 'red' : (daysLeft <= 7 ? 'orange' : (daysLeft <= 30 ? 'yellow' : 'blue'));

            const isChecked = selectedItems.has(item._id) ? 'checked' : '';

            // discount info
            let discountHtml = item.discount > 0 
                ? `<span style="color:var(--c-green-text); font-size: 0.8rem; margin-left: 10px;">${item.discountType === 'percentage' ? item.discount+'%' : '₹'+item.discount} Discount</span>`
                : '';

            const el = document.createElement('div');
            el.className = `timeline-item ${statusClass}`;
            // Simple inline layout to match timeline styles usually used
            el.innerHTML = `
                <div style="display:flex; align-items:center; gap: 1rem; width: 100%; border-bottom: 1px solid var(--border-color); padding-bottom: 15px; margin-bottom: 15px;">
                    <input type="checkbox" class="item-check" data-id="${item._id}" ${isChecked}>
                    <div class="item-info" style="flex:1;">
                        <h4>${item.name} ${discountHtml}</h4>
                        <p>Batch: ${item.batchNumber || 'N/A'} | Qty: ${item.quantity} ${item.unit || 'pcs'}</p>
                        <p>Expiry: ${item.expiryDate.toLocaleDateString()}</p>
                    </div>
                    <div>
                        <div class="days-badge ${badgeColor}">${dayText}</div>
                        <button class="btn-icon" onclick="viewHistory('${item._id}')" title="Discount History" style="margin-top:10px; font-size:0.8rem; cursor:pointer; background:none; border:none; color:var(--c-blue-text); display:flex; margin-left:auto;"><i class="fa-solid fa-clock-rotate-left"></i> History</button>
                    </div>
                </div>
            `;
            listContainer.appendChild(el);
        });

        // Add checkbox listeners
        document.querySelectorAll('.item-check').forEach(chk => {
            chk.addEventListener('change', (e) => {
                const id = e.target.dataset.id;
                if (e.target.checked) selectedItems.add(id);
                else selectedItems.delete(id);
                updateBulkActions();
            });
        });

        updateBulkActions();
    }

    function updateBulkActions() {
        document.getElementById('selected-count').textContent = selectedItems.size;
        document.getElementById('bulk-actions').style.display = 'flex'; // always show it based on html layout but selectedItems size highlights it
    }

    function setupEventListeners() {
        // Filters
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                activeFilter = btn.dataset.filter;
                renderTimeline();
            });
        });

        // Search
        const searchInput = document.getElementById('search-input');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                searchQuery = e.target.value;
                renderTimeline();
            });
        }

        // Apply Discount
        document.querySelector('.btn-discount').addEventListener('click', () => {
            if (selectedItems.size === 0) {
                showToast("Please select at least one item", "error");
                return;
            }
            showDiscountModal();
        });
        
        // Setup Modal generic closing
        document.getElementById('modal-cancel').addEventListener('click', closeModal);
    }

    function showDiscountModal() {
        const modal = document.getElementById('action-modal');
        document.getElementById('modal-title').textContent = "Apply Discount";
        document.getElementById('modal-body').innerHTML = `
            <p style="margin-bottom:15px; font-size:0.9rem; color:var(--text-secondary);">Apply discount to ${selectedItems.size} selected items.</p>
            <div style="margin-bottom:15px;">
                <label style="display:block; margin-bottom:5px; font-weight:600; font-size:0.85rem;">Discount Type</label>
                <select id="discount-type" style="width:100%; padding:0.75rem; border-radius:10px; border:1px solid var(--border-color); background:var(--bg-white); color:var(--text-primary);">
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed">Fixed Amount (₹)</option>
                </select>
            </div>
            <div style="margin-bottom:15px;">
                <label style="display:block; margin-bottom:5px; font-weight:600; font-size:0.85rem;">Discount Value</label>
                <input type="number" id="discount-value" value="0" min="0" style="width:100%; padding:0.75rem; border-radius:10px; border:1px solid var(--border-color); background:var(--bg-white); color:var(--text-primary);">
            </div>
            <div style="margin-bottom:15px;">
                <label style="display:block; margin-bottom:5px; font-weight:600; font-size:0.85rem;">Reason</label>
                <input type="text" id="discount-reason" placeholder="e.g. Near expiry sale" style="width:100%; padding:0.75rem; border-radius:10px; border:1px solid var(--border-color); background:var(--bg-white); color:var(--text-primary);">
            </div>
        `;
        
        const confirmBtn = document.getElementById('modal-confirm');
        // Remove old listeners
        const newConfirmBtn = confirmBtn.cloneNode(true);
        confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
        
        newConfirmBtn.addEventListener('click', async () => {
            const type = document.getElementById('discount-type').value;
            const value = parseFloat(document.getElementById('discount-value').value);
            const reason = document.getElementById('discount-reason').value;

            if (isNaN(value) || value < 0) {
                showToast("Please enter a valid discount value", "error");
                return;
            }

            try {
                const token = localStorage.getItem('authToken');
                const req = await fetch(`${CONFIG.API_BASE_URL}/products/bulk/discount`, {
                    method: 'PUT',
                    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        productIds: Array.from(selectedItems),
                        discount: value,
                        discountType: type,
                        reason: reason || "Smart Expiry Clearance"
                    })
                });

                const res = await req.json();
                if (res.success) {
                    showToast("Discount applied successfully!", "success");
                    closeModal();
                    selectedItems.clear();
                    fetchInventory(); // refresh list
                } else {
                    showToast(res.message || "Failed to apply discount", "error");
                }
            } catch (err) {
                showToast("Server error", "error");
            }
        });

        modal.classList.add('visible');
    }

    // Attach to window so onclick works
    window.viewHistory = (id) => {
        const item = inventory.find(p => p._id === id);
        if (!item) return;

        const modal = document.getElementById('action-modal');
        document.getElementById('modal-title').textContent = `Discount History: ${item.name}`;
        
        let historyHtml = '';
        if (item.discountHistory && item.discountHistory.length > 0) {
            historyHtml = item.discountHistory.map(h => `
                <div style="border-bottom:1px solid var(--border-color); padding: 10px 0;">
                    <strong style="color:var(--text-primary)">
                        ${h.type === 'percentage' ? h.amount+'%' : '₹'+h.amount} Discount
                    </strong>
                    <div style="font-size:0.8rem; color:var(--text-secondary); margin-top:5px;">
                        By: ${h.appliedBy || 'System'} | ${new Date(h.date).toLocaleString()}
                        <br> Reason: <em>${h.reason}</em>
                    </div>
                </div>
            `).join('');
        } else {
            historyHtml = `<p style="color:var(--text-secondary)">No discount history available.</p>`;
        }

        document.getElementById('modal-body').innerHTML = `
            <div style="max-height: 300px; overflow-y: auto;">
                ${historyHtml}
            </div>
        `;
        
        const confirmBtn = document.getElementById('modal-confirm');
        confirmBtn.style.display = 'none'; // hide confirm for view only
        
        document.getElementById('modal-cancel').textContent = "Close";
        document.getElementById('modal-cancel').addEventListener('click', () => {
            confirmBtn.style.display = 'inline-block'; // restore
            document.getElementById('modal-cancel').textContent = "Cancel";
        }, {once: true});

        modal.classList.add('visible');
    };

    function closeModal() {
        document.getElementById('action-modal').classList.remove('visible');
    }

    function showToast(message, type = 'info') {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        // simple inline css for toast appearance since we don't know if smartexpiry.css has good ones
        toast.style.cssText = `
            padding: 12px 24px;
            background: ${type === 'error' ? '#ef4444' : '#10b981'};
            color: white;
            border-radius: 8px;
            margin-bottom: 10px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
            animation: slideIn 0.3s ease;
        `;
        container.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    }

    initialize();
});
