import { updateDashboardStats, resetNotification } from '../Shared/Utils/dashboard_stats.js';
import CONFIG from '../Shared/Utils/config.js';
import apiRequest from '../Shared/Utils/api.js';


// --- Authentication Check ---
const currentUser = JSON.parse(localStorage.getItem('currentUser'));
const currentEmployee = JSON.parse(localStorage.getItem('currentEmployee'));

const ownerId = (currentUser && currentUser.ownerId) || (currentEmployee && currentEmployee.ownerId);

if (!currentUser) {
    window.location.href = '../Authentication/login.html';
}


document.addEventListener('DOMContentLoaded', function () {
    // --- Live Data Refresh Logic ---
    async function refreshDashboardData() {
        if (!ownerId) return;

        try {
            // 1. Fetch Stats (Inventory + Udhaar)
            const statsResult = await apiRequest('/stats/owner');


            if (statsResult.success) {
                const d = statsResult.data;

                const formatter = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' });

                document.getElementById('dash-stock-value').textContent = formatter.format(d.totalStockValue);
                document.getElementById('dash-inventory-count').textContent = d.totalItems.toLocaleString();
                document.getElementById('dash-low-stock').textContent = d.lowStockCount;
                document.getElementById('dash-low-stock-count').textContent = d.lowStockCount;
                document.getElementById('dash-total-udhaar').textContent = formatter.format(d.totalUdhaarPending);
                document.getElementById('dash-expiring-alert').textContent = d.expiringSoonCount;
                document.getElementById('dash-expiry-count').textContent = d.expiringSoonCount;
            }

            // 2. Fetch Complaints/Queries
            const compResult = await apiRequest('/complaints/');


            if (compResult.success) {
                const openComplaints = compResult.data.filter(c => c.type === 'complaint' && c.status === 'open').length;

                const openQueries = compResult.data.filter(c => c.type === 'query' && c.status === 'pending').length;

                document.getElementById('dash-complain-count').textContent = openComplaints;
                document.getElementById('dash-query-count').textContent = openQueries;
                
                // Update Nav Badge
                const navBadge = document.getElementById('nav-badge-complain');
                if (navBadge) {
                    const total = openComplaints + openQueries;
                    navBadge.style.display = total > 0 ? 'flex' : 'none';
                    navBadge.textContent = total;
                }
            }

        } catch (err) {
            console.error("Dashboard Refresh Error:", err);
        }
    }

    // Initial load and set interval (Every 15s)
    refreshDashboardData();
    setInterval(refreshDashboardData, 15000);

    // Fetch User Info dynamically
    const shopSpans = document.querySelectorAll('.shop-name');
    const storeIdBadge = document.getElementById('store-id-badge');
    const shopName = (currentUser?.storeId?.name) || (currentUser?.shopName) || (currentEmployee?.shopName) || 'QuadStock Store';
    const storeUniqueId = (currentUser?.storeId?.storeUniqueId) || 'QS-XXXXX';

    shopSpans.forEach(span => {
        span.textContent = shopName;
    });

    if (storeIdBadge && storeUniqueId && storeUniqueId !== 'QS-XXXXX') {
        storeIdBadge.textContent = `ID: ${storeUniqueId}`;
        storeIdBadge.style.display = 'inline-block';
    }


    // Initialize Shared Stats (Legacy Sync if needed)
    updateDashboardStats();

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


    // --- Digital Clock ---
    function updateClock() {
        const now = new Date();
        const dateString = now.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' });
        const timeString = now.toLocaleTimeString('en-US', { hour12: true });
        const clockEl = document.getElementById('digital-clock');
        if (clockEl) {
            clockEl.innerHTML = `<span style="font-size:0.85em; margin-right:12px; color:#6366f1; font-weight:700; opacity:0.8;">${dateString}</span> <span style="font-weight:800;">${timeString}</span>`;
        }
    }
    if (window.clockInterval) clearInterval(window.clockInterval);
    window.clockInterval = setInterval(updateClock, 1000);
    updateClock();

    // --- Theme Toggle ---
    const themeBtn = document.getElementById('theme-toggle');
    const body = document.body;
    const savedTheme = localStorage.getItem('theme') || 'light';
    body.setAttribute('data-theme', savedTheme);
    if (themeBtn) {
        themeBtn.innerHTML = savedTheme === 'dark' ? '<i class="fa-solid fa-sun"></i>' : '<i class="fa-solid fa-moon"></i>';
        themeBtn.addEventListener('click', () => {
            const currentTheme = body.getAttribute('data-theme');
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            body.setAttribute('data-theme', newTheme);
            localStorage.setItem('theme', newTheme);
            themeBtn.innerHTML = newTheme === 'dark' ? '<i class="fa-solid fa-sun"></i>' : '<i class="fa-solid fa-moon"></i>';
        });
    }

    // --- Sidebar Toggle ---
    const sidebarToggle = document.getElementById('sidebar-toggle');
    const container = document.querySelector('.layout-container');
    if (sidebarToggle) {
        sidebarToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            if (container) container.classList.toggle('sidebar-collapsed');
            else document.body.classList.toggle('sidebar-collapsed');
        });
    }

    // --- Dropdowns Initialization ---
    const monthSelect = document.getElementById('revenue-month-select');
    if (monthSelect) {
        const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
        const currentMonthIndex = new Date().getMonth();
        months.forEach((month, index) => {
            const option = document.createElement('option');
            option.value = index;
            option.textContent = month;
            if (index === currentMonthIndex) option.selected = true;
            monthSelect.appendChild(option);
        });
    }

    const yearSelect = document.getElementById('revenue-year-select');
    if (yearSelect) {
        const currentYear = new Date().getFullYear();
        for (let i = 0; i < 5; i++) {
            const year = currentYear - i;
            const option = document.createElement('option');
            option.value = year;
            option.textContent = year;
            yearSelect.appendChild(option);
        }
    }
});

