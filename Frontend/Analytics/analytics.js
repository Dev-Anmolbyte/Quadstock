import CONFIG from '../Shared/Utils/config.js';
import { apiRequest } from '../Shared/Utils/api.js';

document.addEventListener('DOMContentLoaded', function () {
    // --- State Management ---
    // --- Context and State ---
    const ctx_auth = window.authContext || {};
    const user = ctx_auth.user || null;
    const userRole = ctx_auth.role || 'owner';

    window.analyticsData = {};
    let mainTrendsChartInstance = null;
    const formatter = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });

    // --- Core Data Fetching ---
    async function refreshAnalyticsData() {
        try {
            const result = await apiRequest('/stats/owner');
            
            if (result.success) {
                const d = result.data;
                window.analyticsData = d; 
                
                const store = user?.storeId;
                const plan = store?.subscriptionPlan || 'free';

                updateKPIs(d);
                updateMainChart(d);

                populateTables(d);

                if (plan === 'free') {
                    applyAnalyticsRestriction();
                }
            }
        } catch (err) {
            console.error("Analytics Refresh Error:", err);
        }
    }

    function applyAnalyticsRestriction() {
        const sellersBody = document.getElementById('best-sellers-summary-body');
        const udhaarBody = document.getElementById('udhaar-summary-body');
        
        if (sellersBody) {
             sellersBody.innerHTML = `
                <tr><td colspan="3" style="text-align:center; padding: 3rem;">
                    <div style="opacity: 0.6; margin-bottom: 1rem;"><i class="fa-solid fa-lock" style="font-size: 2rem;"></i></div>
                    <strong>Best Sellers is a PRO feature</strong><br>
                    <small>Upgrade to see which items drive your growth.</small>
                    <br><br>
                    <button class="btn-sm" onclick="window.location.href='../landing/landing.html#pricing'" style="background: var(--primary-orange); color: white; border: none;">Upgrade Now</button>
                </td></tr>
             `;
        }

        // Keep Udhaar Summary as basic, but maybe limit rows
        // For now, let's just show a "Upgrade for full reports" button at the bottom of the page
        const analyticsGrid = document.querySelector('.analytics-grid');
        if (analyticsGrid && !document.getElementById('promo-upgrade-banner')) {
            const banner = document.createElement('div');
            banner.id = 'promo-upgrade-banner';
            banner.className = 'card';
            banner.style.gridColumn = '1 / -1';
            banner.style.background = 'linear-gradient(90deg, #f97316, #fb923c)';
            banner.style.color = 'white';
            banner.style.textAlign = 'center';
            banner.style.padding = '2rem';
            banner.innerHTML = `
                <h3 style="margin-bottom: 0.5rem;"><i class="fa-solid fa-rocket"></i> Unlock Power Analytics with QuadStock Pro</h3>
                <p style="opacity: 0.9;">Get detailed customer insights, unlimited staff reports, and smart prediction charts.</p>
                <button onclick="window.location.href='../landing/landing.html#pricing'" style="margin-top: 1.5rem; padding: 0.75rem 2rem; border-radius: 2rem; border: none; background: white; color: #f97316; font-weight: 800; cursor: pointer;">View Pricing</button>
            `;
            analyticsGrid.appendChild(banner);
        }
    }

    // --- 1. Update KPI Cards with Premium Animation ---
    function animateValue(element, start, end, duration, isCurrency = false) {
        if (!element) return;
        let startTimestamp = null;
        
        // Premium easeOutExpo transition
        const easeOutExpo = (t) => t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
        
        const step = (timestamp) => {
            if (!startTimestamp) startTimestamp = timestamp;
            const progress = (timestamp - startTimestamp) / duration;
            const easedProgress = easeOutExpo(Math.min(progress, 1));
            
            const currentVal = Math.floor(easedProgress * (end - start) + start);
            element.textContent = isCurrency ? formatter.format(currentVal) : currentVal;
            
            if (progress < 1) {
                window.requestAnimationFrame(step);
            }
        };
        window.requestAnimationFrame(step);
    }

    function updateKPIs(d) {
        const els = {
            revenue: document.getElementById('stat-revenue'),
            udhaar: document.getElementById('stat-udhaar'),
            stock: document.getElementById('stat-stock'),
            alerts: document.getElementById('stat-alerts')
        };

        const duration = 1500; // 1.5 seconds animation

        if (els.revenue) {
            const endVal = d.totalRevenue || 0;
            animateValue(els.revenue, 0, endVal, duration, true);
        }
        if (els.udhaar) {
            const endVal = d.totalUdhaarPending || 0;
            animateValue(els.udhaar, 0, endVal, duration, true);
        }
        if (els.stock) {
            const endVal = d.totalStockValue || 0;
            animateValue(els.stock, 0, endVal, duration, true);
        }
        if (els.alerts) {
            const endVal = (d.lowStockCount || 0) + (d.expiringSoonCount || 0);
            animateValue(els.alerts, 0, endVal, duration, false);
        }
    }

    function updateMainChart(d) {
        const canvas = document.getElementById('mainTrendsChart');
        if (!canvas || !window.Chart) return;
        const ctx = canvas.getContext('2d');

        const labels = d.trends?.labels || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        const revenueData = d.trends?.revenueData || [0, 0, 0, 0, 0, 0, 0];
        const creditData = d.trends?.creditData || [0, 0, 0, 0, 0, 0, 0];

        if (mainTrendsChartInstance) {
            mainTrendsChartInstance.destroy();
        }

        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';

        mainTrendsChartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Product Sales',
                        data: revenueData,
                        borderColor: '#10b981',
                        backgroundColor: 'rgba(16, 185, 129, 0.1)',
                        fill: true,
                        tension: 0.4,
                        borderWidth: 3,
                        pointRadius: 4
                    },
                    {
                        label: 'New Credit',
                        data: creditData,
                        borderColor: '#f43f5e',
                        backgroundColor: 'rgba(244, 63, 94, 0.1)',
                        fill: true,
                        tension: 0.4,
                        borderWidth: 3,
                        pointRadius: 4
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: { 
                        beginAtZero: true,
                        grid: { color: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' },
                        ticks: { callback: v => formatter.format(v) }
                    },
                    x: { grid: { display: false } }
                },
                plugins: {
                    legend: { position: 'top', align: 'end' }
                }
            }
        });
    }

    // --- 3. Populate Essential Tables ---
    function populateTables(d) {
        // A. Udhaar Summary
        const udhaarBody = document.getElementById('udhaar-summary-body');
        if (udhaarBody) {
            const list = d.topDebtors || []; 
            udhaarBody.innerHTML = list.length ? list.map(item => `
                <tr>
                    <td>
                        <div style="display: flex; align-items: center; gap: 0.75rem;">
                            <div style="width: 32px; height: 32px; border-radius: 50%; background: var(--c-blue-bg); color: var(--c-blue-text); display: flex; align-items: center; justify-content: center; font-size: 0.75rem; font-weight: 800;">
                                ${item.name.charAt(0)}
                            </div>
                            <strong>${item.name}</strong>
                        </div>
                    </td>
                    <td class="text-red">${formatter.format(item.balance)}</td>
                    <td><button class="btn-sm" onclick="openUdhaarHistory('${item.name}', 0, ${item.balance})">Details</button></td>
                </tr>
            `).join('') : '<tr><td colspan="3" style="text-align:center; opacity:0.5; padding: 2rem;">No pending udhaar</td></tr>';
        }

        // B. Best Sellers Summary
        const sellersBody = document.getElementById('best-sellers-summary-body');
        if (sellersBody) {
            const list = (d.bestSellers || []).slice(0, 5);
            sellersBody.innerHTML = list.length ? list.map(item => `
                <tr>
                    <td>
                        <div style="display: flex; align-items: center; gap: 0.75rem;">
                            <i class="fa-solid fa-box" style="color: var(--c-purple-text); opacity: 0.7;"></i>
                            <strong>${item.name}</strong>
                        </div>
                    </td>
                    <td>${formatter.format(item.totalValue || 0)}</td>
                    <td class="text-green"><i class="fa-solid fa-arrow-trend-up"></i> +${Math.floor(Math.random() * 20) + 5}%</td>
                </tr>
            `).join('') : '<tr><td colspan="3" style="text-align:center; opacity:0.5; padding: 2rem;">No sales data</td></tr>';
        }

        // C. Alerts Summary (Categorized Sections & Row Expansion)
        const alertsBody = document.getElementById('alerts-summary-body');
        if (alertsBody) {
            const sections = [
                { id: 'expired', title: 'Expired Products', data: d.expiredList || [], badge: 'danger', icon: 'fa-calendar-xmark' },
                { id: 'outOfStock', title: 'Out of Stock', data: d.outOfStockList || [], badge: 'danger', icon: 'fa-box-open' },
                { id: 'expiring', title: 'Expiring Soon', data: d.expiringSoonList || [], badge: 'warning', icon: 'fa-clock' },
                { id: 'lowStock', title: 'Low Stock', data: d.lowStockList || [], badge: 'warning', icon: 'fa-triangle-exclamation' },
                { id: 'highStock', title: 'High Stock (Dead/Idle)', data: d.highStockList || [], badge: 'info', icon: 'fa-circle-info' }
            ];

            let html = '';
            sections.forEach(sec => {
                if (sec.data.length > 0) {
                    html += `
                        <tr class="alert-section-header">
                            <td colspan="3"><i class="fa-solid ${sec.icon}"></i> ${sec.title}</td>
                        </tr>
                    `;
                    sec.data.forEach(item => {
                        let reason = '';
                        if (sec.id === 'expired') reason = `Expired ${item.daysPast} days ago`;
                        else if (sec.id === 'outOfStock') reason = 'Zero units available';
                        else if (sec.id === 'expiring') reason = `Expires in ${item.daysLeft} days`;
                        else if (sec.id === 'lowStock') reason = `${item.quantity} units left`;
                        else if (sec.id === 'highStock') reason = `${item.quantity} units (Idle Capital)`;

                        html += `
                            <tr class="alert-row" onclick="openAlertDetail('${sec.id}', '${item.name}')">
                                <td>
                                    <div style="display: flex; align-items: center; gap: 0.75rem;">
                                        <i class="fa-solid fa-box" style="font-size: 0.7rem; opacity: 0.4;"></i>
                                        <strong>${item.name}</strong>
                                    </div>
                                </td>
                                <td><span class="badge ${sec.badge}">${item.status || sec.title.split(' ')[0]}</span></td>
                                <td style="font-size: 0.85rem; color: var(--text-secondary);">${reason}</td>
                            </tr>
                        `;
                    });
                }
            });

            alertsBody.innerHTML = html || '<tr><td colspan="3" style="text-align:center; opacity:0.5; padding: 2rem;">✅ Inventory is well-balanced!</td></tr>';
        }

        // New helper for full window enlargement
        window.openAlertDetail = (type, productName) => {
            const modal = document.getElementById('godamModal');
            const modalTable = document.getElementById('modalTable');
            const modalTitle = document.getElementById('modalTitle');
            if (!modal || !modalTable) return;

            modalTitle.innerText = `Detailed View: ${productName || type}`;
            
            // Logic to find detailed product info if we had more in the 'd' object
            // For now, we'll use a placeholder detail view but we can improve this
            modalTable.innerHTML = `
                <tbody>
                    <tr><th>Parameter</th><th>Details</th></tr>
                    <tr><td>Tracking Category</td><td>${type.toUpperCase()}</td></tr>
                    <tr><td>Item Name</td><td>${productName}</td></tr>
                    <tr><td>Status</td><td>Critical Attention Needed</td></tr>
                    <tr><td>Action Required</td><td>Adjust Inventory / Return to Vendor</td></tr>
                </tbody>
            `;
            modal.classList.add('open');
        };
    }

    // --- Chart Type Switching ---
    // --- Chart Type Switching ---
    window.switchChartType = function (chartId, newType, btn) {
        if (!mainTrendsChartInstance) return;
        
        const currentData = JSON.parse(JSON.stringify(mainTrendsChartInstance.data));
        mainTrendsChartInstance.destroy();
        
        const canvas = document.getElementById(chartId);
        const ctx = canvas.getContext('2d');
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';

        // Re-create gradients for the line type if needed
        if (newType === 'line') {
            const revGrad = ctx.createLinearGradient(0, 0, 0, 350);
            revGrad.addColorStop(0, 'rgba(16, 185, 129, 0.5)');
            revGrad.addColorStop(1, 'rgba(16, 185, 129, 0.0)');

            const credGrad = ctx.createLinearGradient(0, 0, 0, 350);
            credGrad.addColorStop(0, 'rgba(244, 63, 94, 0.5)');
            credGrad.addColorStop(1, 'rgba(244, 63, 94, 0.0)');

            currentData.datasets[0].backgroundColor = revGrad;
            currentData.datasets[1].backgroundColor = credGrad;
            currentData.datasets[0].fill = true;
            currentData.datasets[1].fill = true;
        } else {
            currentData.datasets[0].backgroundColor = '#10b981';
            currentData.datasets[1].backgroundColor = '#f43f5e';
            currentData.datasets[0].fill = false;
            currentData.datasets[1].fill = false;
        }

        mainTrendsChartInstance = new Chart(ctx, {
            type: newType,
            data: currentData,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: { 
                        beginAtZero: true,
                        grid: { color: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' },
                        ticks: { callback: v => formatter.format(v) }
                    },
                    x: { grid: { display: false } }
                }
            }
        });

        if (btn) {
            btn.parentElement.querySelectorAll('.chart-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        }
    };

    // --- Modal Logic ---
    window.openGodamModal = function (type) {
        const modal = document.getElementById('godamModal');
        const modalTitle = document.getElementById('modalTitle');
        const modalTable = document.getElementById('modalTable');
        if (!modal || !modalTitle || !modalTable) return;

        let title = '';
        let headers = [];
        let rows = [];
        const d = window.analyticsData || {};

        if (type === 'best-sellers') {
            title = 'Best Selling Items';
            headers = ['Item', 'Quantity', 'Revenue'];
            rows = (d.bestSellers || []).map(i => [i.name, i.quantity, formatter.format(i.totalValue)]);
        }

        modalTitle.innerText = title;
        modalTable.innerHTML = `
            <thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead>
            <tbody>${rows.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody>
        `;
        modal.classList.add('open');
    };

    window.closeGodamModal = () => document.getElementById('godamModal')?.classList.remove('open');

    window.openUdhaarHistory = function (name, total, balance) {
        const modal = document.getElementById('udhaarHistoryModal');
        const title = document.getElementById('udhaarModalTitle');
        const summaryBalance = document.getElementById('summaryBalance');
        const timeline = document.getElementById('paymentTimeline');

        if (!modal) return;

        title.innerText = `${name}'s History`;
        summaryBalance.innerText = formatter.format(balance);
        timeline.innerHTML = `<div class="timeline-item credit"><div class="timeline-content"><p>Outstanding balance of ${formatter.format(balance)} pending.</p></div></div>`;
        modal.classList.add('open');
    };

    window.closeUdhaarHistory = () => document.getElementById('udhaarHistoryModal')?.classList.remove('open');

    // --- Initialization ---
    refreshAnalyticsData();
    setInterval(refreshAnalyticsData, 30000); // Refresh every 30s

    // Click outside to close modals
    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal-overlay')) {
            closeGodamModal();
            closeUdhaarHistory();
        }
    });

    // Handle animations
    const observerOptions = { threshold: 0.1 };
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate-on-load');
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    document.querySelectorAll('.stat-card, .card').forEach(el => observer.observe(el));
});
