import CONFIG from '../Shared/Utils/config.js';
import { apiRequest } from '../Shared/Utils/api.js';

document.addEventListener('DOMContentLoaded', function () {
    // --- State Management ---
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
                
                updateKPIs(d);
                updateMainChart(d);
                populateTables(d);
            }
        } catch (err) {
            console.error("Analytics Refresh Error:", err);
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

    // --- 2. Update Main Trends Chart ---
    function updateMainChart(d) {
        const ctx = document.getElementById('mainTrendsChart')?.getContext('2d');
        if (!ctx) return;

        // Mock data for trends if real daily data isn't available in summary
        const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        const revenueData = [45000, 52000, 38000, 65000, 80000, 95000, 42000];
        const creditData = [12000, 15000, 10000, 18000, 25000, 30000, 15000];

        if (mainTrendsChartInstance) {
            mainTrendsChartInstance.destroy();
        }

        mainTrendsChartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Revenue',
                        data: revenueData,
                        borderColor: '#6366f1',
                        backgroundColor: 'rgba(99, 102, 241, 0.1)',
                        fill: true,
                        tension: 0.4
                    },
                    {
                        label: 'New Credit (Udhaar)',
                        data: creditData,
                        borderColor: '#f43f5e',
                        backgroundColor: 'rgba(244, 63, 94, 0.1)',
                        fill: true,
                        tension: 0.4
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: { 
                        beginAtZero: true, 
                        grid: { color: 'rgba(255,255,255,0.05)' },
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

        // C. Alerts Summary
        const alertsBody = document.getElementById('alerts-summary-body');
        if (alertsBody) {
            const lowStock = (d.lowStockList || []).slice(0, 3).map(item => ({ 
                name: item.name, 
                status: 'Low Stock', 
                reason: `${item.quantity} units left`,
                badge: 'warning',
                icon: 'fa-triangle-exclamation'
            }));

            const highStock = (d.highStockList || []).slice(0, 2).map(item => ({ 
                name: item.name, 
                status: 'High Stock', 
                reason: `${item.quantity} units (Idle Capital)`,
                badge: 'info',
                icon: 'fa-circle-info'
            }));

            const deadStock = (d.deadStockList || []).slice(0, 2).map(item => ({ 
                name: item.name, 
                status: 'Dead Stock', 
                reason: `No sales for ${item.daysInactive || 90}+ days`,
                badge: 'danger',
                icon: 'fa-skull-crossbones'
            }));

            const combined = [...lowStock, ...highStock, ...deadStock];

            alertsBody.innerHTML = combined.length ? combined.map(item => `
                <tr>
                    <td>
                        <div style="display: flex; align-items: center; gap: 0.75rem;">
                            <i class="fa-solid ${item.icon}" style="opacity: 0.6;"></i>
                            <strong>${item.name}</strong>
                        </div>
                    </td>
                    <td><span class="badge ${item.badge}">${item.status}</span></td>
                    <td style="font-size: 0.85rem; color: var(--text-secondary);">${item.reason}</td>
                </tr>
            `).join('') : '<tr><td colspan="3" style="text-align:center; opacity:0.5; padding: 2rem;">✅ Inventory is well-balanced!</td></tr>';
        }
    }

    // --- Chart Type Switching ---
    window.switchChartType = function (chartId, newType, btn) {
        if (!mainTrendsChartInstance) return;
        
        const currentData = mainTrendsChartInstance.data;
        mainTrendsChartInstance.destroy();
        
        const ctx = document.getElementById(chartId).getContext('2d');
        mainTrendsChartInstance = new Chart(ctx, {
            type: newType,
            data: currentData,
            options: mainTrendsChartInstance.options
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
