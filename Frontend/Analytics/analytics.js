document.addEventListener('DOMContentLoaded', function () {

    // --- Authentication & Context ---
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    const currentEmployee = JSON.parse(localStorage.getItem('currentEmployee'));
    const userRole = (currentUser && currentUser.role) || (currentEmployee && currentEmployee.role) || 'staff';
    const ownerId = (currentUser && currentUser.ownerId) || (currentEmployee && currentEmployee.ownerId);

    if (!ownerId) {
        window.location.href = '../Authentication/employee_login.html';
        return;
    }

    // Set User Profile Name
    const nameSpans = document.querySelectorAll('.user-name');
    nameSpans.forEach(span => {
        if (currentUser) {
            span.textContent = currentUser.ownerName || currentUser.shopName || 'Owner';
        } else if (currentEmployee) {
            span.textContent = currentEmployee.name || 'Manager';
        }
    });
    const initialIcons = document.querySelectorAll('.user-profile > div:first-child');
    initialIcons.forEach(icon => {
        if (currentUser) {
            const nameToUse = currentUser.ownerName || 'O';
            icon.textContent = nameToUse.charAt(0).toUpperCase();
        } else if (currentEmployee) {
            const nameToUse = currentEmployee.name || 'M';
            icon.textContent = nameToUse.charAt(0).toUpperCase();
        }
    });

    // --- Digital Clock ---
    function updateClock() {
        const now = new Date();
        const dateString = now.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' });
        const timeString = now.toLocaleTimeString('en-US', { hour12: true });
        const clockEl = document.getElementById('digital-clock');
        if (clockEl) {
            clockEl.innerHTML = `<span style="font-size:0.8em; margin-right:10px; color:#4f46e5;">${dateString}</span> ${timeString}`;
        }
    }
    setInterval(updateClock, 1000);
    updateClock();

    // --- Theme Toggle ---
    const themeBtn = document.getElementById('theme-toggle');
    const body = document.body;

    function applyTheme(theme) {
        if (theme === 'dark') {
            body.setAttribute('data-theme', 'dark');
            if (themeBtn) themeBtn.innerHTML = '<i class="fa-solid fa-sun"></i>';
        } else {
            body.removeAttribute('data-theme');
            if (themeBtn) themeBtn.innerHTML = '<i class="fa-solid fa-moon"></i>';
        }
    }

    applyTheme(localStorage.getItem('theme') || 'light');

    if (themeBtn) {
        themeBtn.addEventListener('click', () => {
            const newTheme = body.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
            localStorage.setItem('theme', newTheme);
            applyTheme(newTheme);
            setTimeout(initCharts, 50);
        });
    }

    // --- Scoped Data Loading ---
    const inventory = JSON.parse(localStorage.getItem(`inventory_${ownerId}`)) || [];
    const udhaarList = (JSON.parse(localStorage.getItem('udhaarRecords')) || []).filter(r => r.ownerId === ownerId);

    // Update summary cards with real scoped data
    function updateSummaryCards() {
        const totalItemsEl = document.querySelector('.stat-card:nth-child(2) h3');
        if (totalItemsEl) totalItemsEl.innerText = inventory.length;

        const totalUdhaarEl = document.querySelector('.stat-card:nth-child(4) h3');
        if (totalUdhaarEl) {
            const totalPending = udhaarList.reduce((sum, r) => sum + (r.balance || 0), 0);
            totalUdhaarEl.innerText = '₹' + totalPending.toLocaleString();
        }
    }
    updateSummaryCards();

    // --- Submenu Logic ---
    window.toggleSubmenu = function (element) {
        const parent = element.parentElement;
        const submenu = parent.querySelector('.submenu');

        element.classList.toggle('active');
        submenu.classList.toggle('show');

        // Optional: Close other submenus
        document.querySelectorAll('.menu-group').forEach(group => {
            if (group !== parent) {
                const otherMenu = group.querySelector('.menu-item');
                const otherSub = group.querySelector('.submenu');
                if (otherMenu) otherMenu.classList.remove('active');
                if (otherSub) otherSub.classList.remove('show');
            }
        });
    };

    // --- Chart Management ---
    let revenueExpensesChart;
    let categoryDistributionChart;
    let weeklySalesChart;

    const getChartColors = () => {
        const isDark = body.getAttribute('data-theme') === 'dark';
        return {
            text: isDark ? '#94a3b8' : '#64748b',
            grid: isDark ? '#334155' : '#f3f4f6',
            tooltipBg: isDark ? '#1e293b' : '#ffffff',
            tooltipText: isDark ? '#f8fafc' : '#1e293b'
        };
    };

    // --- Dynamic Chart Rendering ---
    window.switchChartType = function (chartId, newType, btn) {
        let chartInstance;
        let config;

        // Determine which chart we are switching
        if (chartId === 'revenueExpensesChart') {
            chartInstance = revenueExpensesChart;
            config = getRevenueChartConfig(newType);
        } else if (chartId === 'categoryDistributionChart') {
            chartInstance = categoryDistributionChart;
            config = getPaymentSplitConfig(newType);
        } else if (chartId === 'weeklySalesChart') {
            chartInstance = weeklySalesChart;
            config = getTrafficChartConfig(newType);
        }

        if (chartInstance) {
            chartInstance.destroy();
            const ctx = document.getElementById(chartId).getContext('2d');

            // Re-create chart with new type
            if (chartId === 'revenueExpensesChart') {
                revenueExpensesChart = new Chart(ctx, config);
            } else if (chartId === 'categoryDistributionChart') {
                categoryDistributionChart = new Chart(ctx, config);
            } else if (chartId === 'weeklySalesChart') {
                weeklySalesChart = new Chart(ctx, config);
            }
        }

        // Update Button State
        if (btn) {
            const parent = btn.parentElement;
            parent.querySelectorAll('.chart-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        }
    };

    // Config Generators
    function getRevenueChartConfig(type) {
        const colors = getChartColors();
        return {
            type: type,
            data: {
                labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
                datasets: [
                    {
                        label: 'Revenue',
                        data: [45000, 52000, 38000, 65000, 80000, 95000, 42000],
                        borderColor: '#6366f1',
                        backgroundColor: type === 'line' ? 'rgba(99, 102, 241, 0.1)' : '#6366f1',
                        fill: type === 'line',
                        tension: 0.4,
                        borderRadius: 4
                    },
                    {
                        label: 'Credit (Udhaar)',
                        data: [12000, 8000, 15000, 5000, 9000, 20000, 10000],
                        borderColor: '#ef4444',
                        backgroundColor: type === 'line' ? 'rgba(239, 68, 68, 0.1)' : '#ef4444',
                        fill: type === 'line',
                        tension: 0.4,
                        borderRadius: 4
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: { beginAtZero: true, grid: { color: colors.grid }, ticks: { callback: v => '₹' + v.toLocaleString() } },
                    x: { grid: { display: false } }
                },
                plugins: { legend: { position: 'top' } }
            }
        };
    }

    function getPaymentSplitConfig(type) {
        return {
            type: type, // donut, pie, or bar
            data: {
                labels: ['UPI', 'Cash', 'Card'],
                datasets: [{
                    label: 'Transactions',
                    data: [70, 20, 10],
                    backgroundColor: ['#6366f1', '#22c55e', '#f97316'],
                    borderWidth: 0,
                    borderRadius: type === 'bar' ? 4 : 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: type === 'doughnut' ? '70%' : '0%',
                plugins: { legend: { position: 'bottom' } },
                scales: type === 'bar' ? {
                    y: { beginAtZero: true, grid: { display: false } },
                    x: { grid: { display: false } }
                } : {
                    x: { display: false },
                    y: { display: false }
                }
            }
        };
    }

    function getTrafficChartConfig(type) {
        const colors = getChartColors();
        const data = [15, 45, 30, 25, 60, 85, 40];

        // Dynamic colors based on rush intensity
        const backgroundColors = data.map(value => {
            if (value >= 70) return '#ef4444'; // High Rush (Red)
            if (value >= 40) return '#f97316'; // Medium Rush (Orange)
            return '#22c55e'; // Low Rush (Green)
        });

        return {
            type: type, // bar or line
            data: {
                labels: ['10AM', '12PM', '2PM', '4PM', '6PM', '8PM', '10PM'],
                datasets: [{
                    label: 'Customer Footfall',
                    data: data,
                    backgroundColor: type === 'line' ? 'rgba(168, 85, 247, 0.1)' : backgroundColors,
                    borderColor: type === 'line' ? '#a855f7' : backgroundColors,
                    fill: type === 'line',
                    tension: 0.4,
                    borderRadius: type === 'bar' ? 8 : 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: { beginAtZero: true, grid: { color: colors.grid } },
                    x: { grid: { display: false } }
                }
            }
        };
    }

    function initCharts() {
        const colors = getChartColors();
        Chart.defaults.color = colors.text;
        Chart.defaults.borderColor = colors.grid;

        // Cleanup
        [revenueExpensesChart, categoryDistributionChart, weeklySalesChart].forEach(chart => {
            if (chart) chart.destroy();
        });

        // 1. Revenue vs Credit Trends (Default: Line)
        const ctxRevExp = document.getElementById('revenueExpensesChart')?.getContext('2d');
        if (ctxRevExp) {
            revenueExpensesChart = new Chart(ctxRevExp, getRevenueChartConfig('line'));
        }

        // 2. Payment Method Split (Default: Doughnut)
        const ctxCat = document.getElementById('categoryDistributionChart')?.getContext('2d');
        if (ctxCat) {
            categoryDistributionChart = new Chart(ctxCat, getPaymentSplitConfig('doughnut'));
        }

        // 3. Peak Traffic Hours (Vyapaar Meter) - Default: Bar
        const ctxWeekly = document.getElementById('weeklySalesChart')?.getContext('2d');
        if (ctxWeekly) {
            weeklySalesChart = new Chart(ctxWeekly, getTrafficChartConfig('bar'));
        }

        // --- Sparklines ---
        const sparklineOptions = {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false }, tooltip: { enabled: false } },
            scales: { x: { display: false }, y: { display: false } },
            elements: { line: { tension: 0.4, borderWidth: 2 }, point: { radius: 0 } }
        };

        const initSparkline = (id, data, color) => {
            const ctx = document.getElementById(id)?.getContext('2d');
            if (ctx) {
                new Chart(ctx, {
                    type: 'line',
                    data: {
                        labels: [1, 2, 3, 4, 5, 6, 7],
                        datasets: [{ data: data, borderColor: color, backgroundColor: 'transparent', fill: false }]
                    },
                    options: sparklineOptions
                });
            }
        };

        initSparkline('dailyRevenueSparkline', [30, 45, 32, 60, 55, 80, 70], '#0ea5e9');
        initSparkline('outstandingCreditSparkline', [20, 35, 40, 30, 50, 45, 60], '#ef4444');
        initSparkline('paymentSplitSparkline', [70, 65, 75, 70, 80, 72, 85], '#a855f7');

        // New Inventory Sparklines
        initSparkline('lowStockSparkline', [10, 15, 12, 18, 20, 15, 18], '#f97316');
        initSparkline('expirySoonSparkline', [5, 8, 12, 10, 8, 15, 8], '#ef4444');
        initSparkline('deadStockSparkline', [30, 28, 25, 24, 22, 24, 24], '#0ea5e9');

        // --- Update Summary Card Numbers Dynamically ---

        // 1. Low Stock Count
        const lowStockRows = document.querySelectorAll('#low-stock tbody tr').length;
        const lowStockSummary = document.querySelector('#low-stock-summary h3');
        if (lowStockSummary) lowStockSummary.innerText = lowStockRows;

        // 2. Expiry Soon Count
        const expiryRows = document.querySelectorAll('#expiry-report tbody tr').length;
        const expirySummary = document.querySelector('#expiry-soon-summary h3');
        if (expirySummary) expirySummary.innerText = expiryRows;

        // 3. Dead Stock Count
        const deadStockRows = document.querySelectorAll('#dead-stock tbody tr').length;
        const deadStockSummary = document.querySelector('#dead-stock-summary h3');
        if (deadStockSummary) deadStockSummary.innerText = deadStockRows;
    }

    // --- Modal Logic for Godam Alert ---
    window.openGodamModal = function (type) {
        const modal = document.getElementById('godamModal');
        const modalTitle = document.getElementById('modalTitle');
        const modalTable = document.getElementById('modalTable');

        if (!modal || !modalTitle || !modalTable) return;

        let title = '';
        let headers = [];
        let data = [];

        // Mock Data Generation based on Type
        if (type === 'low-stock') {
            title = '⚠️ Low Stock Items';
            headers = ['Product Name', 'Current Stock', 'Reorder Level', 'Status', 'Action'];
            data = [
                ['Premium Cotton Tee', '5 units', '20 units', '<span class="badge warning">Critical</span>', '<button class="badge info">Reorder</button>'],
                ['Slim Fit Jeans', '8 units', '15 units', '<span class="badge low-stock">Low</span>', '<button class="badge info">Reorder</button>'],
                ['Wireless Mouse', '12 units', '30 units', '<span class="badge low-stock">Low</span>', '<button class="badge info">Reorder</button>'],
                ['Running Shoes', '4 units', '10 units', '<span class="badge warning">Critical</span>', '<button class="badge info">Reorder</button>'],
                ['Bluetooth Speaker', '6 units', '15 units', '<span class="badge warning">Critical</span>', '<button class="badge info">Reorder</button>']
            ];
        } else if (type === 'expiry') {
            title = '⏳ Expiry Report';
            headers = ['Product Name', 'Batch ID', 'Expiry Date', 'Days Left', 'Action'];
            data = [
                ['Fresh Milk', 'BATCH-001', 'Oct 24, 2024', '<strong class="text-red">2 Days</strong>', '<button class="badge success">Discount</button>'],
                ['Whole Wheat Bread', 'BATCH-042', 'Oct 25, 2024', '<strong class="text-red">3 Days</strong>', '<button class="badge success">Discount</button>'],
                ['Yogurt Cups', 'BATCH-105', 'Oct 27, 2024', '<strong class="text-orange">5 Days</strong>', '<button class="badge success">Discount</button>'],
                ['Protein Shake', 'BATCH-099', 'Oct 30, 2024', '<strong class="text-orange">8 Days</strong>', '<button class="badge success">Discount</button>']
            ];
        } else if (type === 'dead-stock') {
            title = '📦 Dead Stock Report';
            headers = ['Product Name', 'Last Sold', 'Inactive Days', 'Total Value', 'Action'];
            data = [
                ['Heavy Winter Jacket', 'July 12, 2024', '95 Days', '₹4,500', '<button class="badge warning">Clearance</button>'],
                ['Old Series Canvas', 'June 10, 2024', '120 Days', '₹8,200', '<button class="badge warning">Clearance</button>'],
                ['Type-B Charger', 'May 05, 2024', '150 Days', '₹2,100', '<button class="badge warning">Clearance</button>'],
                ['Wired Earphones', 'April 20, 2024', '180 Days', '₹1,500', '<button class="badge warning">Clearance</button>']
            ];
        } else if (type === 'best-sellers') {
            title = '🔥 Best Selling Items';
            headers = ['Item Name', 'Category', 'Total Sold', 'Growth Rate', 'Revenue'];
            data = [
                ['Premium Cotton Tee', 'Apparel', '520', '<span class="text-green">+15%</span>', '₹2,60,000'],
                ['Slim Fit Blue Jeans', 'Apparel', '410', '<span class="text-green">+8%</span>', '₹4,10,000'],
                ['Wireless Mouse M1', 'Electronics', '380', '<span class="text-green">+12%</span>', '₹1,90,000'],
                ['Sports Cap', 'Accessories', '350', '<span class="text-red">-2%</span>', '₹87,500'],
                ['Running Shoes', 'Footwear', '310', '<span class="text-green">+5%</span>', '₹6,20,000']
            ];
        } else if (type === 'top-profits') {
            title = '💰 Top Profit Earners';
            headers = ['Item Name', 'Cost Price', 'Selling Price', 'Profit/Unit', 'Margin'];
            data = [
                ['Leather Boots', '₹1,200', '₹2,500', '₹1,300', '<span class="text-green">52%</span>'],
                ['Winter Jacket', '₹2,000', '₹3,500', '₹1,500', '<span class="text-green">42%</span>'],
                ['Smart Watch Gen2', '₹3,500', '₹5,500', '₹2,000', '<span class="text-green">36%</span>'],
                ['Designer Sunglasses', '₹800', '₹1,800', '₹1,000', '<span class="text-green">55%</span>'],
                ['Mechanical Keyboard', '₹2,800', '₹4,200', '₹1,400', '<span class="text-green">33%</span>']
            ];
        }

        // Build Table header
        let thead = '<thead><tr>';
        headers.forEach(h => thead += `<th>${h}</th>`);
        thead += '</tr></thead>';

        // Build Table body
        let tbody = '<tbody>';
        data.forEach(row => {
            tbody += '<tr>';
            row.forEach(cell => tbody += `<td>${cell}</td>`);
            tbody += '</tr>';
        });
        tbody += '</tbody>';

        modalTitle.innerText = title;
        modalTable.innerHTML = thead + tbody;

        // Show Modal
        modal.classList.add('open');
    };

    window.closeGodamModal = function () {
        const modal = document.getElementById('godamModal');
        if (modal) modal.classList.remove('open');
    };

    // --- Udhaar History Logic ---
    window.openUdhaarHistory = function (name, total, balance) {
        const modal = document.getElementById('udhaarHistoryModal');
        const title = document.getElementById('udhaarModalTitle');
        const summaryTotal = document.getElementById('summaryTotal');
        const summaryBalance = document.getElementById('summaryBalance');
        const timeline = document.getElementById('paymentTimeline');

        if (!modal) return;

        title.innerText = `${name}'s Udhaar Ledger`;
        summaryTotal.innerText = `₹${total.toLocaleString()}`;
        summaryBalance.innerText = `₹${balance.toLocaleString()}`;
        summaryBalance.className = balance > 0 ? 'text-red' : 'text-green';

        // Mock Timeline Data
        let history = [
            { date: 'Jan 15, 2024', time: '11:30 AM', type: 'taken', amount: total, desc: 'Udhaar taken for Grocery' }
        ];

        if (total > balance) {
            // Add some split payments for mock
            history.push({ date: 'Jan 22, 2024', time: '05:45 PM', type: 'payment', amount: (total - balance) * 0.4, desc: 'Partial payment via Cash' });
            history.push({ date: 'Jan 25, 2024', time: '10:15 AM', type: 'payment', amount: (total - balance) * 0.6, desc: 'Partial payment via UPI' });
        }

        if (balance === 0) {
            history.push({ date: 'Feb 05, 2024', time: '02:00 PM', type: 'payment', amount: 0, desc: 'Udhaar Fully Settled', isSettled: true });
        }

        let timelineHTML = '';
        history.forEach(item => {
            const typeClass = item.type === 'payment' ? 'payment' : 'taken';
            const itemClass = item.isSettled ? 'settled' : (item.type === 'taken' ? 'credit' : '');

            timelineHTML += `
                <div class="timeline-item ${itemClass}">
                    <div class="timeline-content">
                        <div class="timeline-header">
                            <span class="timeline-date">${item.date} • ${item.time}</span>
                            <span class="timeline-type ${typeClass}">${item.type === 'payment' ? 'Received' : 'Credit Taken'}</span>
                        </div>
                        <div class="timeline-body">
                            <span class="timeline-desc">${item.desc}</span>
                            <span class="timeline-amount" style="color: ${item.type === 'payment' ? 'var(--c-green-text)' : 'var(--c-red-text)'}">
                                ${item.amount > 0 ? (item.type === 'payment' ? '-' : '+') + '₹' + item.amount.toLocaleString() : ''}
                            </span>
                        </div>
                    </div>
                </div>
            `;
        });

        timeline.innerHTML = timelineHTML;
        modal.classList.add('open');
    };

    window.closeUdhaarHistory = function () {
        const modal = document.getElementById('udhaarHistoryModal');
        if (modal) modal.classList.remove('open');
    };

    // Close modals on outside click
    window.addEventListener('click', function (event) {
        const godamModal = document.getElementById('godamModal');
        const udhaarModal = document.getElementById('udhaarHistoryModal');
        if (event.target === godamModal) closeGodamModal();
        if (event.target === udhaarModal) closeUdhaarHistory();
    });

    // Initialize Charts with Error Handling
    try {
        if (typeof Chart !== 'undefined') {
            initCharts();
        } else {
            console.warn('Chart.js not loaded. Charts will not be displayed.');
        }
    } catch (e) {
        console.error('Error initializing charts:', e);
    }

    // Sidebar Collapse Support (if implemented in other dashboards)
    const sidebarToggle = document.getElementById('sidebar-toggle');
    const dashboardContainer = document.querySelector('.dashboard-container');
    if (sidebarToggle && dashboardContainer) {
        sidebarToggle.addEventListener('click', () => {
            dashboardContainer.classList.toggle('sidebar-collapsed');
            setTimeout(initCharts, 350);
        });
    }

    // --- Dynamic Entrance Animations ---
    function applyEntranceAnimations() {
        const elements = document.querySelectorAll('.stat-card, .card, .analytics-section > div');
        let delayIndex = 1;

        elements.forEach((el) => {
            // Check if element is visible/part of main view
            if (el.offsetParent !== null) {
                el.classList.add('animate-on-load');

                // Cycle through delays 100-500ms
                const delay = (delayIndex % 5) + 1;
                el.classList.add(`delay-${delay}00`);
                delayIndex++;
            }
        });
    }

    // --- Number Counter Animation ---
    function animateNumbers() {
        const stats = document.querySelectorAll('.stat-info h3, .analytics-table .text-green, .analytics-table .text-red, .analytics-table .price');

        stats.forEach(stat => {
            const originalText = stat.innerText;
            // Extract number from text (e.g., "₹10,500" -> 10500)
            const numericValue = parseFloat(originalText.replace(/[^0-9.]/g, ''));

            if (!isNaN(numericValue) && numericValue > 0) {
                let start = 0;
                const duration = 1500; // 1.5s animation
                const stepTime = 20;
                const steps = duration / stepTime;
                const increment = numericValue / steps;

                const timer = setInterval(() => {
                    start += increment;
                    if (start >= numericValue) {
                        stat.innerText = originalText; // Restore exact original formatting at end
                        clearInterval(timer);
                    } else {
                        // Attempt to maintain basic currency formatting during count
                        let formattedValue;
                        if (originalText.includes('₹')) {
                            // If it has decimals, show some
                            formattedValue = '₹' + (numericValue % 1 !== 0 ? start.toFixed(2) : Math.floor(start)).toLocaleString();
                        } else if (originalText.includes('%')) {
                            formattedValue = '+' + Math.floor(start) + '%';
                        } else {
                            formattedValue = Math.floor(start).toLocaleString();
                        }
                        stat.innerText = formattedValue;
                    }
                }, stepTime);
            }
        });
    }

    // Trigger Animations
    applyEntranceAnimations();
    // Delay number animation slightly to wait for entrance
    setTimeout(animateNumbers, 600);
});
