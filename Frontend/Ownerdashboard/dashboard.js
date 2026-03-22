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

    // --- Live Data Refresh Logic ---
    async function refreshDashboardData() {
        try {
            const m = document.getElementById('revenue-month-select')?.value || new Date().getMonth() + 1;
            const y = document.getElementById('revenue-year-select')?.value || new Date().getFullYear();

            // 1. Fetch Stats (Inventory + Udhaar + Selection)
            const statsResult = await apiRequest(`/stats/owner?month=${m}&year=${y}`);


            if (statsResult.success) {
                const d = statsResult.data;
                const formatter = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' });

                // Update Cards
                document.getElementById('dash-stock-value').textContent = formatter.format(d.totalStockValue);
                document.getElementById('dash-monthly-revenue').textContent = formatter.format(d.totalRevenue || 0);
                document.getElementById('dash-total-sold').textContent = (d.totalSold || 0).toLocaleString();
                
                document.getElementById('dash-inventory-count').textContent = d.totalItems.toLocaleString();
                document.getElementById('dash-low-stock').textContent = d.lowStockCount;
                document.getElementById('dash-total-udhaar').textContent = formatter.format(d.totalUdhaarPending);
                document.getElementById('dash-staff-count').textContent = d.totalUsers.toLocaleString();
                document.getElementById('dash-expiring-alert').textContent = d.expiringSoonCount;

                // Update Top Products Table
                const tbody = document.getElementById('top-products-tbody');
                if (tbody && d.topProducts) {
                    tbody.innerHTML = d.topProducts.map(p => `
                        <tr>
                            <td>
                                <div class="prod-cell">
                                    <div class="prod-img bg-gray-100">
                                        <img src="${p.image || '../Assets/product_placeholder.png'}" alt="${p.name}" onerror="this.src='../Assets/product_placeholder.png'">
                                    </div>
                                    <span>${p.name}</span>
                                </div>
                            </td>
                            <td>
                                <span class="badge ${p.quantity === 0 ? 'red' : (p.quantity <= 10 ? 'orange' : 'blue')}">
                                    ${p.quantity === 0 ? 'Out of Stock' : `${p.quantity} In Stock`}
                                </span>
                            </td>
                            <td class="price">${formatter.format(p.totalValue)}</td>
                        </tr>
                    `).join('') || '<tr><td colspan="3" style="text-align:center; padding:2rem; opacity:0.6;">No products found</td></tr>';
                }
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

            // 3. Update Expiring Soon Table
            const expiryTbody = document.getElementById('expiring-soon-tbody');
            const stats = statsResult?.data;
            if (expiryTbody && stats) {
                if (stats.expiringSoonList && stats.expiringSoonList.length > 0) {
                    expiryTbody.innerHTML = stats.expiringSoonList.map(item => `
                        <tr>
                            <td>
                                <div class="prod-name-simple">${item.name}</div>
                            </td>
                            <td style="text-align: right;">
                                <span class="badge red">${item.daysLeft}d left</span>
                            </td>
                        </tr>
                    `).join('');
                } else {
                    expiryTbody.innerHTML = '<tr><td colspan="2" style="text-align:center; padding: 2rem; opacity: 0.5;">Stable (No expiries)</td></tr>';
                }
            }

            // 4. Initialize/Update Chart
            initDashboardChart(stats);
        } catch (err) {
            console.error("Dashboard Refresh Error:", err);
        }
    }

    // Initial load and set interval (Every 15s)
    refreshDashboardData();
    setInterval(refreshDashboardData, 15000);

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


    // --- Charting Logic ---
    function initDashboardChart(data) {
        const ctx = document.getElementById('revenueChart');
        if (!ctx) return;

        const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        const revenueData = [12000, 19000, 15000, 25000, 22000, 30000, 28000];
        const expenseData = [8000, 12000, 10000, 15000, 13000, 18000, 16000];

        if (revenueChart) {
            revenueChart.destroy();
        }

        const isDark = document.body.getAttribute('data-theme') === 'dark';
        const gridColor = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)';
        const textColor = isDark ? '#94a3b8' : '#64748b';

        revenueChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels,
                datasets: [
                    {
                        label: 'Revenue',
                        data: revenueData,
                        borderColor: '#6366f1',
                        backgroundColor: 'rgba(99, 102, 241, 0.1)',
                        borderWidth: 3,
                        tension: 0.4,
                        fill: true
                    },
                    {
                        label: 'Expenditure',
                        data: expenseData,
                        borderColor: '#f43f5e',
                        backgroundColor: 'transparent',
                        borderWidth: 2,
                        borderDash: [5, 5],
                        tension: 0.4
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                        labels: { color: textColor, font: { family: 'Plus Jakarta Sans', weight: '600' } }
                    }
                },
                scales: {
                    x: {
                        grid: { display: false },
                        ticks: { color: textColor }
                    },
                    y: {
                        beginAtZero: true,
                        grid: { color: gridColor },
                        ticks: { color: textColor, callback: (v) => '₹' + v.toLocaleString() }
                    }
                }
            }
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

        yearSelect.addEventListener('change', refreshDashboardData);
    }
});

