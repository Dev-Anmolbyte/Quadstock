import CONFIG from '../Shared/Utils/config.js';
import { apiRequest } from '../Shared/Utils/api.js';

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
    let highStockThreshold = 100; // default from backend
    let healthyExpiryThreshold = 30; // default warning threshold

    function initialize() {
        fetchInventory();
        setupEventListeners();
    }

    async function fetchInventory() {
        const listContainer = document.getElementById('expiry-list');
        listContainer.innerHTML = `<div style="padding:4rem; text-align:center; color: var(--text-secondary);">
            <i class="fa-solid fa-spinner fa-spin" style="font-size: 3rem; color: var(--primary); margin-bottom: 2rem; display: block;"></i>
            Analyzing inventory batches...
        </div>`;

        try {
            // Fetch store settings & products simultaneously through centralized apiRequest
            const [storeRes, invRes] = await Promise.all([
                apiRequest('/stores/details').catch(() => null),
                apiRequest('/products?limit=1000').catch(() => null)
            ]);

            if (storeRes && storeRes.success) {
                if (storeRes.data.highStockThreshold !== undefined) highStockThreshold = storeRes.data.highStockThreshold;
                if (storeRes.data.healthyExpiryThreshold !== undefined) healthyExpiryThreshold = storeRes.data.healthyExpiryThreshold;
            }

            if (invRes && invRes.success) {
                inventory = invRes.data.filter(item => item.exp).map(item => ({
                    ...item,
                    expiryDate: new Date(item.exp) 
                }));
            } else {
                inventory = [];
            }
            processInventory();

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
        now.setHours(0,0,0,0);
        stats = { expired: 0, critical: 0, warning: 0, healthy: 0 };

        inventory.forEach(item => {
            if (!item.expiryDate) return;
            const daysLeft = Math.ceil((item.expiryDate - now) / (1000 * 60 * 60 * 24));

            if (daysLeft <= 0) stats.expired++;
            else if (daysLeft <= 7) stats.critical++;
            else if (daysLeft <= healthyExpiryThreshold) stats.warning++;
            else stats.healthy++;
        });
    }

    function renderStats() {
        document.getElementById('stat-expired').textContent = stats.expired;
        document.getElementById('stat-7days').textContent = stats.critical;
        document.getElementById('stat-30days').textContent = stats.warning;
        document.getElementById('stat-healthy').textContent = stats.healthy;

        const labelWarning = document.getElementById('label-warning-days');
        if (labelWarning) labelWarning.textContent = `Expiring (${healthyExpiryThreshold} Days)`;
        
        const filterWarning = document.querySelector('[data-filter="30days"]');
        if (filterWarning) filterWarning.innerHTML = `<i class="dot dot-yellow"></i> Expiring in ${healthyExpiryThreshold} Days`;
    }

    function getStatusClass(daysLeft) {
        if (daysLeft <= 0) return 'expired';
        if (daysLeft <= 7) return 'warning';
        if (daysLeft <= healthyExpiryThreshold) return 'soon';
        return 'healthy';
    }

    function renderTimeline() {
        const listContainer = document.getElementById('expiry-list');
        listContainer.innerHTML = '';
        const now = new Date();
        now.setHours(0,0,0,0);

        let filtered = inventory.filter(item => {
            const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (item.batchNumber && item.batchNumber.toLowerCase().includes(searchQuery.toLowerCase())) ||
                (item.category && item.category.toLowerCase().includes(searchQuery.toLowerCase()));

            const daysLeft = Math.ceil((item.expiryDate - now) / (1000 * 60 * 60 * 24));

            if (activeFilter === 'expired') return matchesSearch && daysLeft <= 0;
            if (activeFilter === 'high-stock') return matchesSearch && item.quantity >= highStockThreshold;
            if (activeFilter === '7days') return matchesSearch && daysLeft > 0 && daysLeft <= 7;
            if (activeFilter === '14days') return matchesSearch && daysLeft > 7 && daysLeft <= 14;
            if (activeFilter === '30days') return matchesSearch && daysLeft > 7 && daysLeft <= healthyExpiryThreshold;
            return matchesSearch;
        });

        // Sorting
        const sortVal = document.getElementById('sort-select')?.value || 'expiry-asc';
        filtered.sort((a, b) => {
            if (sortVal === 'expiry-asc') return a.expiryDate - b.expiryDate;
            if (sortVal === 'expiry-desc') return b.expiryDate - a.expiryDate;
            if (sortVal === 'name-asc') return a.name.localeCompare(b.name);
            if (sortVal === 'quantity-desc') return b.quantity - a.quantity;
            return 0;
        });

        if (filtered.length === 0) {
            listContainer.innerHTML = `<div style="padding:4rem; text-align:center; color: var(--text-secondary); background: var(--card-bg); border-radius: 32px; border: 1px dashed var(--primary); box-shadow: var(--glass-shadow);">
                <i class="fa-solid fa-folder-open" style="font-size: 3rem; opacity: 0.15; margin-bottom: 2rem; display: block; color: var(--primary);"></i>
                <h4 style="font-size: 1.2rem; font-weight: 850; color: var(--text-main); margin-bottom: 0.5rem;">Inventory is looking good!</h4>
                <p style="font-size: 0.9rem; opacity: 0.8;">No products match the selected criteria.</p>
            </div>`;
            return;
        }

        filtered.forEach((item, index) => {
            const daysLeft = Math.ceil((item.expiryDate - now) / (1000 * 60 * 60 * 24));
            const statusClass = getStatusClass(daysLeft);
            let dayText = daysLeft <= 0 ? 'Expired' : `${daysLeft} Days left`;
            let badgeColor = daysLeft <= 0 ? 'red' : (daysLeft <= 7 ? 'orange' : (daysLeft <= healthyExpiryThreshold ? 'yellow' : 'blue'));

            const isChecked = selectedItems.has(item._id) ? 'checked' : '';
            const stockQty = item.quantity || item.stockQuantity || 0;
            const imgSrc = item.image || 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=200';

            // discount info
            let discountHtml = item.discount > 0 
                ? `<span class="days-badge green" style="background: rgba(16, 185, 129, 0.1); color: #10b981; margin-left:0;">-${item.discountType === 'percentage' ? item.discount+'%' : '₹'+item.discount}</span>`
                : '';

            // high stock info (Exclusive of low stock)
            const isLowStock = stockQty <= (item.reorderPoint || 10);
            let highStockBadge = (stockQty >= highStockThreshold && !isLowStock) 
                ? `<span class="days-badge blue" style="margin-left:0;"><i class="fa-solid fa-arrow-trend-up"></i> Bulk</span>`
                : '';

            const sellPrice = item.price || 0;
            let discountedPrice = sellPrice;
            if (item.discount > 0) {
                if (item.discountType === 'percentage') {
                    discountedPrice = sellPrice - (sellPrice * (item.discount / 100));
                } else {
                    discountedPrice = sellPrice - item.discount;
                }
            }

            const el = document.createElement('div');
            el.className = `timeline-item ${statusClass}`;
            el.style.animationDelay = `${index * 0.05}s`;
            
            el.innerHTML = `
                <div class="item-check-wrapper">
                    <input type="checkbox" class="item-check" data-id="${item._id}" ${isChecked}>
                </div>
                <div class="item-image-wrapper">
                    <img src="${imgSrc}" alt="${item.name}" onerror="this.src='https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=200'">
                </div>
                <div class="item-content">
                    <div class="item-main">
                        <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.1rem;">
                            <span class="item-brand">${item.brand || 'No Brand'}</span>
                            <span class="days-badge ${item.productType === 'loose' ? 'blue' : 'green'}" style="padding: 1px 6px; font-size: 0.55rem; border-radius: 4px; box-shadow: none;">
                                ${item.productType === 'loose' ? 'LOOSE' : 'PACKED'}
                            </span>
                        </div>
                        <h4>${item.name}</h4>
                        <div class="item-meta">
                            <span><i class="fa-solid fa-hashtag"></i> ${item.batchNumber || 'Batch-001'}</span>
                            <span class="item-category-tag"><i class="fa-solid fa-folder"></i> ${item.category || 'General'}</span>
                        </div>
                    </div>
                    <div class="item-stock-column">
                        <span class="stock-label">STOCK</span>
                        <strong class="stock-value">${stockQty} ${item.unit || 'pcs'}</strong>
                    </div>
                    <div class="item-price-column">
                        <span class="price-label">PRICE</span>
                        <div class="price-value">
                            ${item.discount > 0 ? `
                                <strong class="discounted-price">₹${discountedPrice.toFixed(2)}</strong>
                                <span class="original-price">₹${sellPrice.toFixed(2)}</span>
                            ` : `
                                <strong>₹${sellPrice.toFixed(2)}</strong>
                            `}
                        </div>
                    </div>
                    <div class="item-expiry-info">
                        <div class="expiry-date-box">
                            <span>EXPIRY DATE</span>
                            <strong>${item.expiryDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</strong>
                        </div>
                        <div class="mfd-date-box">
                            <span>MFD: ${item.mfd ? new Date(item.mfd).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : 'N/A'}</span>
                        </div>
                    </div>
                    <div class="status-section">
                        <div style="display:flex; gap:0.4rem; justify-content:flex-end; flex-wrap: wrap;">
                           ${discountHtml}
                           ${highStockBadge}
                           <div class="days-badge ${badgeColor}">${dayText}</div>
                        </div>
                        <div class="action-links">
                            <a class="history-link" onclick="viewHistory('${item._id}')">
                                <i class="fa-solid fa-clock-rotate-left"></i> History
                            </a>
                        </div>
                    </div>
                </div>
            `;
            listContainer.appendChild(el);
        });

        // Add checkbox listeners (Single-selection logic)
        document.querySelectorAll('.item-check').forEach(chk => {
            chk.addEventListener('change', (e) => {
                const id = e.target.dataset.id;
                
                if (e.target.checked) {
                    // Deselect all others
                    document.querySelectorAll('.item-check').forEach(other => {
                        if (other !== e.target) other.checked = false;
                    });
                    selectedItems.clear();
                    selectedItems.add(id);
                } else {
                    selectedItems.delete(id);
                }
                
                updateBulkActions();
            });
        });

        updateBulkActions();
    }

    function updateBulkActions() {
        const bulkBar = document.getElementById('bulk-actions');
        const countSpan = document.getElementById('selected-count');
        
        if (countSpan) countSpan.textContent = selectedItems.size;
        
        if (selectedItems.size > 0) {
            bulkBar.classList.add('visible');
        } else {
            bulkBar.classList.remove('visible');
        }
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

        // Sort
        const sortSelect = document.getElementById('sort-select');
        if (sortSelect) {
            sortSelect.addEventListener('change', renderTimeline);
        }

        // Select All Logic
        const selectAllChk = document.getElementById('select-all');
        if (selectAllChk) {
            selectAllChk.addEventListener('change', (e) => {
                const isChecked = e.target.checked;
                const visibleChecks = document.querySelectorAll('.item-check');
                
                selectedItems.clear();
                visibleChecks.forEach(chk => {
                    if (chk.id === 'select-all') return;
                    chk.checked = isChecked;
                    if (isChecked) selectedItems.add(chk.dataset.id);
                });
                
                updateBulkActions();
            });
        }
        
        // High Stock Settings Modal
        const settingsBtn = document.getElementById('settings-btn');
        if (settingsBtn) {
            settingsBtn.addEventListener('click', showSettingsModal);
        }

        // Apply Discount
        const btnDiscount = document.querySelector('.btn-discount');
        if (btnDiscount) {
            btnDiscount.addEventListener('click', () => {
                if (selectedItems.size === 0) {
                    showToast("Please select at least one item", "error");
                    return;
                }
                showDiscountModal();
            });
        }


        // Remove from Inventory
        const btnDispose = document.querySelector('.btn-dispose');
        if (btnDispose) {
            btnDispose.addEventListener('click', async () => {
                const id = Array.from(selectedItems)[0];
                if (!id) return;

                const item = inventory.find(p => p._id === id);
                const confirmed = await QuadModals.confirm(
                    "Remove from Inventory",
                    `Are you sure you want to remove ${item?.name} from inventory? This action cannot be undone.`,
                    { isDanger: true, confirmText: 'Remove Now', icon: 'fa-box-archive' }
                );

                if (confirmed) {
                    try {
                        const res = await apiRequest(`/products/${id}`, { method: 'DELETE' });
                        if (res.success) {
                            showToast("Product removed from inventory successfully.", "success");
                            selectedItems.clear();
                            fetchInventory();
                        }
                    } catch (err) {
                        showToast("Failed to remove product.", "error");
                    }
                }
            });
        }
        
        // Setup Modal generic closing
        document.getElementById('modal-cancel').addEventListener('click', closeModal);
    }

    function showDiscountModal() {
        const modal = document.getElementById('action-modal');
        document.getElementById('modal-title').innerHTML = "<i class='fa-solid fa-tags'></i> Apply Discount";
        const firstId = Array.from(selectedItems)[0];
        const product = selectedItems.size === 1 ? inventory.find(p => p._id === firstId) : null;
        
        document.getElementById('modal-body').innerHTML = `
            <p class="modal-subtitle">Apply discount to <strong>${selectedItems.size}</strong> selected items.</p>
            <div class="form-group">
                <label for="discount-type"><i class="fa-solid fa-percent"></i> Discount Type</label>
                <div class="input-wrapper">
                    <select id="discount-type">
                        <option value="percentage" ${product && product.discountType === 'percentage' ? 'selected' : ''}>Percentage (%)</option>
                        <option value="fixed" ${product && product.discountType === 'fixed' ? 'selected' : ''}>Fixed Amount (₹)</option>
                    </select>
                </div>
            </div>
            <div class="form-group">
                <label for="discount-value"><i class="fa-solid fa-indian-rupee-sign"></i> Discount Value</label>
                <div class="input-wrapper">
                    <input type="number" id="discount-value" value="${product ? product.discount : '0'}" min="0" placeholder="0.00" oninput="if(this.value < 0) this.value = 0;">
                </div>
            </div>
            <div style="margin-bottom: 20px;">
                <label for="discount-reason" style="display: block; font-size: 0.9rem; font-weight: 700; color: var(--text-main); margin-bottom: 0.5rem;"><i class="fa-solid fa-comment-dots"></i> Selection Reason</label>
                <div class="input-wrapper">
                    <select id="discount-reason" style="width: 100%; padding: 12px; border-radius: 12px; border: 1px solid var(--border); background: var(--bg-card); color: var(--text-main); font-weight: 600;">
                        <option value="Near Expiry Sale" ${product && (product.discountReason === 'Near Expiry Sale' || product.reason === 'Near Expiry Sale') ? 'selected' : ''}>Near Expiry Sale</option>
                        <option value="Huge Stock Clearance" ${product && (product.discountReason === 'Huge Stock Clearance' || product.reason === 'Huge Stock Clearance') ? 'selected' : ''}>Huge Stock Clearance</option>
                        <option value="Bulk Purchase Offer" ${product && (product.discountReason === 'Bulk Purchase Offer' || product.reason === 'Bulk Purchase Offer') ? 'selected' : ''}>Bulk Purchase Offer</option>
                        <option value="Seasonal Discount" ${product && (product.discountReason === 'Seasonal Discount' || product.reason === 'Seasonal Discount') ? 'selected' : ''}>Seasonal Discount</option>
                        <option value="Damaged Packaging Sale" ${product && (product.discountReason === 'Damaged Packaging Sale' || product.reason === 'Damaged Packaging Sale') ? 'selected' : ''}>Damaged Packaging Sale</option>
                        <option value="Special Promotion" ${product && (product.discountReason === 'Special Promotion' || product.reason === 'Special Promotion') ? 'selected' : ''}>Special Promotion</option>
                    </select>
                </div>
            </div>
        `;
        
        const confirmBtn = document.getElementById('modal-confirm');
        // Remove old listeners
        const newConfirmBtn = confirmBtn.cloneNode(true);
        confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
        newConfirmBtn.innerHTML = "<i class='fa-solid fa-check'></i> Confirm";
        
        newConfirmBtn.addEventListener('click', async () => {
            const type = document.getElementById('discount-type').value;
            const value = parseFloat(document.getElementById('discount-value').value);
            const reason = document.getElementById('discount-reason').value;

            if (isNaN(value) || value < 0) {
                showToast("Please enter a valid discount value", "error");
                return;
            }

            try {
                const res = await apiRequest('/products/bulk/discount', {
                    method: 'PUT',
                    body: JSON.stringify({
                        productIds: Array.from(selectedItems),
                        discount: value,
                        discountType: type,
                        reason: reason || "Smart Expiry Clearance",
                        discountReason: reason || "Smart Expiry Clearance"
                    })
                });

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

    function showSettingsModal() {
        const modal = document.getElementById('action-modal');
        document.getElementById('modal-title').innerHTML = "<i class='fa-solid fa-gear'></i> Smart Expiry Settings";
        document.getElementById('modal-body').innerHTML = `
            <p class="modal-subtitle">Configure thresholds. Changes are saved directly to your store configuration.</p>
            <div class="form-group">
                <label for="setting-high-stock"><i class="fa-solid fa-cubes"></i> High Stock Threshold (Quantity)</label>
                <div class="input-wrapper">
                    <input type="number" id="setting-high-stock" value="${highStockThreshold}" min="1">
                </div>
            </div>
            <div class="form-group">
                <label for="setting-healthy-expiry"><i class="fa-solid fa-calendar-check"></i> Healthy Stock Expiry (Days)</label>
                <div class="input-wrapper">
                    <input type="number" id="setting-healthy-expiry" value="${healthyExpiryThreshold}" min="8" placeholder="e.g. 30">
                </div>
                <p class="input-help">Products expiring in more than this many days are considered "Healthy". Default is 30.</p>
            </div>
        `;
        
        const confirmBtn = document.getElementById('modal-confirm');
        const newConfirmBtn = confirmBtn.cloneNode(true);
        confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
        newConfirmBtn.textContent = "Save Settings";
        
        newConfirmBtn.addEventListener('click', async () => {
            const valStock = parseInt(document.getElementById('setting-high-stock').value);
            const valExpiry = parseInt(document.getElementById('setting-healthy-expiry').value);
            
            if (isNaN(valStock) || valStock < 1 || isNaN(valExpiry) || valExpiry < 8) {
                showToast("Please enter valid thresholds", "error");
                return;
            }

            try {
                const res = await apiRequest('/stores/update', {
                    method: 'PUT',
                    body: JSON.stringify({ 
                        highStockThreshold: valStock,
                        healthyExpiryThreshold: valExpiry 
                    })
                });

                if (res.success) {
                    highStockThreshold = valStock;
                    healthyExpiryThreshold = valExpiry;
                    showToast("Thresholds updated in database!", "success");
                    closeModal();
                    processInventory(); // Re-calculates stats & re-renders list precisely
                } else {
                    showToast(res.message || "Failed to update settings", "error");
                }
            } catch (err) {
                showToast("Server error", "error");
            }
        });

        const cancelBtn = document.getElementById('modal-cancel');
        const newCancelBtn = cancelBtn.cloneNode(true);
        cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);
        newCancelBtn.textContent = "Cancel";
        newCancelBtn.addEventListener('click', closeModal);

        modal.classList.add('visible');
    }

    // Attach to window so onclick works
    window.viewHistory = (id) => {
        const item = inventory.find(p => p._id === id);
        if (!item) return;

        const modal = document.getElementById('action-modal');
        document.getElementById('modal-title').innerHTML = `<i class="fa-solid fa-clock-rotate-left"></i> Discount History`;
        
        let historyHtml = '';
        if (item.discountHistory && item.discountHistory.length > 0) {
            historyHtml = `<div class="history-list">` + 
                item.discountHistory.map(h => `
                <div class="history-item">
                    <div class="history-header">
                        <span class="history-amount">${h.type === 'percentage' ? h.amount+'%' : '₹'+h.amount} Off</span>
                        <span class="history-date">${new Date(h.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</span>
                    </div>
                    <div class="history-detail">
                        <p><i class="fa-solid fa-user-edit"></i> Applied by: <strong>${h.appliedBy || 'System'}</strong></p>
                        <p><i class="fa-solid fa-comment-dots"></i> Reason: <em>${h.reason || 'No reason provided'}</em></p>
                    </div>
                </div>
            `).join('') + `</div>`;
        } else {
            historyHtml = `
            <div class="empty-history">
                <i class="fa-solid fa-ghost"></i>
                <p>No discount history available for this item.</p>
            </div>`;
        }

        document.getElementById('modal-body').innerHTML = `
            <p class="modal-subtitle">Showing all price adjustments for <strong>${item.name}</strong></p>
            <div class="history-scrollable">
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
