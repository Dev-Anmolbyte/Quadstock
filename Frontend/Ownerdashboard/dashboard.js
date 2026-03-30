import { resetNotification } from '../Shared/Utils/dashboard_stats.js';
import CONFIG from '../Shared/Utils/config.js';
import { apiRequest } from '../Shared/Utils/api.js';


// --- Global Chart Reference ---
let revenueChart;

// --- Authentication Check ---
const ctx = window.authContext;
if (!ctx || !ctx.isAuthenticated) {
    window.location.href = '../Authentication/login.html';
}

const { role, ownerRefId: ownerId, user: currentUser } = ctx;


document.addEventListener('DOMContentLoaded', function () {
    // Set Personalized Welcome Greeting
    const welcomeEl = document.getElementById('welcome-store-name');
    if (welcomeEl && (window.authContext && window.authContext.user)) {
        const user = window.authContext.user;
        let ownerName = user.ownerName || user.name || 'Owner';
        // Capitalize name
        ownerName = ownerName.charAt(0).toUpperCase() + ownerName.slice(1);
        
        const now = new Date();
        const hrs = now.getHours();
        let greeting = 'Good evening';
        if (hrs < 12) greeting = 'Good morning';
        else if (hrs < 18) greeting = 'Good afternoon';
        
        welcomeEl.textContent = `${greeting}, ${ownerName}`;
        
        // Tagline with Shop Name
        const shop = user.shopName || 'QuadStock';
        const pEl = welcomeEl.nextElementSibling;
        if (pEl) pEl.textContent = `Shop: ${shop} • Here's what's happening today in your store.`;
    }

    const formatter = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });

    function animateValue(id, start, end, duration, isCurrency = false) {
        const element = document.getElementById(id);
        if (!element) return;
        let startTimestamp = null;
        const easeOutExpo = (t) => t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
        
        const step = (timestamp) => {
            if (!startTimestamp) startTimestamp = timestamp;
            const progress = (timestamp - startTimestamp) / duration;
            const easedProgress = easeOutExpo(Math.min(progress, 1));
            const currentVal = Math.floor(easedProgress * (end - start) + start);
            
            element.textContent = isCurrency ? formatter.format(currentVal) : currentVal.toLocaleString();
            if (progress < 1) {
                window.requestAnimationFrame(step);
            }
        };
        window.requestAnimationFrame(step);
    }

    // --- Live Data Refresh Logic ---
    async function refreshDashboardData() {
        try {
            const m = document.getElementById('revenue-month-select')?.value || new Date().getMonth() + 1;
            const y = new Date().getFullYear();

            // 1. Fetch Stats (Inventory + Udhaar + Selection)
            const statsResult = await apiRequest(`/stats/owner?month=${m}&year=${y}`);

            if (statsResult.success) {
                const d = statsResult.data;
                const duration = 1500;

                // Animate KPI Cards
                animateValue('dash-stock-value', 0, d.totalStockValue, duration, true);
                animateValue('dash-monthly-revenue', 0, d.totalRevenue || 0, duration, true);
                animateValue('dash-expired-count', 0, d.expiredCount || 0, duration, false);
                animateValue('dash-inventory-count', 0, d.totalItems || 0, duration, false);
                animateValue('dash-low-stock', 0, d.lowStockCount || 0, duration, false);
                animateValue('dash-out-of-stock', 0, d.outOfStockCount || 0, duration, false);
                animateValue('dash-total-udhaar', 0, d.totalUdhaarPending || 0, duration, true);
                animateValue('dash-staff-count', 0, d.totalUsers || 0, duration, false);
                animateValue('dash-expiring-alert', 0, d.expiringSoonCount || 0, duration, false);

                // 4. Update Tables (Capped at 6 items by backend)
                const tables = {
                    highValue: document.getElementById('top-products-tbody'),
                    lowStock: document.getElementById('low-stock-tbody'),
                    outOfStock: document.getElementById('out-of-stock-tbody'),
                    soonExpiry: document.getElementById('expiring-soon-tbody')
                };

                // A. High Value Stock
                if (tables.highValue && d.topProducts) {
                    tables.highValue.innerHTML = d.topProducts.map(p => `
                        <tr>
                            <td><div class="prod-name-simple" title="${p.name}">${p.name}</div></td>
                            <td><span class="badge ${p.quantity <= 10 ? 'amber' : 'blue'}">${p.quantity} Units</span></td>
                            <td class="price" style="text-align: right;">${formatter.format(p.totalValue)}</td>
                        </tr>
                    `).join('') || '<tr><td colspan="3" style="text-align:center; padding:2rem; opacity:0.6;">No data</td></tr>';
                }

                // B. Low Stock Items
                if (tables.lowStock && d.lowStockList) {
                    tables.lowStock.innerHTML = d.lowStockList.map(p => `
                        <tr>
                            <td><div class="prod-name-simple">${p.name}</div></td>
                            <td style="text-align: right;"><span class="badge orange">${p.quantity} left</span></td>
                        </tr>
                    `).join('') || '<tr><td colspan="2" style="text-align:center; padding:2rem; opacity:0.5;">✅ Stock OK</td></tr>';
                }

                // C. Out of Stock Items
                if (tables.outOfStock && d.outOfStockList) {
                    tables.outOfStock.innerHTML = d.outOfStockList.map(p => `
                        <tr>
                            <td><div class="prod-name-simple">${p.name}</div></td>
                            <td style="text-align: right;"><span class="badge red">Stock Out</span></td>
                        </tr>
                    `).join('') || '<tr><td colspan="2" style="text-align:center; padding:2rem; opacity:0.5;">✅ Full Stock</td></tr>';
                }

                // D. Soon Expiry Items
                if (tables.soonExpiry && d.expiringSoonList) {
                    tables.soonExpiry.innerHTML = d.expiringSoonList.map(item => `
                        <tr>
                            <td><div class="prod-name-simple">${item.name}</div></td>
                            <td style="text-align: right;"><span class="badge red">${item.daysLeft}d left</span></td>
                        </tr>
                    `).join('') || '<tr><td colspan="2" style="text-align:center; padding: 2rem; opacity: 0.5;">✅ Safe</td></tr>';
                }
            }
        } catch (err) {
            console.error("Dashboard Refresh Error:", err);
        }
    }

    // Initial load and set interval (Every 5 minutes)
    refreshDashboardData();
    setInterval(refreshDashboardData, 300000); // 300,000 ms = 5 minutes

    // Store Info handled by guard.js


    // Attach Notification Reset Listeners

    const complainLink = document.querySelector('a[href*="Complain/complain.html"]');
    if (complainLink) {
        complainLink.addEventListener('click', () => resetNotification('complain'));
    }

    // --- Logout Functionality ---
    const logoutBtn = document.querySelector('a[title="Logout"]');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            try {
                await apiRequest('/users/logout', { method: 'POST' });
            } catch (err) {
                console.error("Logout Error:", err);
            }
            localStorage.removeItem('currentUser');
            localStorage.removeItem('currentEmployee');
            localStorage.removeItem('authToken');
            localStorage.removeItem('refreshToken');
            window.location.replace('../Authentication/login.html');
        });
    }





    // Clock and Theme handled by guard.js

    // Sidebar toggle and theme handled by shared sidebar.js

    // --- Dropdowns Initialization ---
    const monthSelect = document.getElementById('revenue-month-select');
    if (monthSelect) {
        const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
        const currentMonthIndex = new Date().getMonth();
        months.forEach((month, index) => {
            const option = document.createElement('option');
            option.value = index + 1; // 1-12
            option.textContent = month;
            if (index === currentMonthIndex) option.selected = true;
            monthSelect.appendChild(option);
        });

        monthSelect.addEventListener('change', refreshDashboardData);
    }


});

