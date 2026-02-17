// --- Authentication Check (Start of file) ---
if (!localStorage.getItem('currentUser')) {
    window.location.href = '../Authentication/login.html';
}

document.addEventListener('DOMContentLoaded', function () {

    // --- Logout Functionality ---
    const logoutBtn = document.querySelector('a[title="Logout"]');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            localStorage.removeItem('currentUser');
            // Prevent back navigation
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
    setInterval(updateClock, 1000);
    updateClock(); // Initial call

    // --- Theme Toggle ---
    const themeBtn = document.getElementById('theme-toggle');
    const body = document.body;

    // --- Sidebar Toggle ---
    const sidebarToggle = document.getElementById('sidebar-toggle');
    const dashboardContainer = document.querySelector('.dashboard-container');

    if (sidebarToggle && dashboardContainer) {
        sidebarToggle.addEventListener('click', () => {
            dashboardContainer.classList.toggle('sidebar-collapsed');
            // Re-init charts after sidebar transition (300ms)
            setTimeout(initCharts, 350);
        });
    }

    // --- Month Select Logic ---
    const monthSelect = document.getElementById('revenue-month-select');
    if (monthSelect) {
        const months = [
            "January", "February", "March", "April", "May", "June",
            "July", "August", "September", "October", "November", "December"
        ];
        const currentMonthIndex = new Date().getMonth();

        months.forEach((month, index) => {
            const option = document.createElement('option');
            option.value = index;
            option.textContent = month;
            if (index === currentMonthIndex) option.selected = true;
            monthSelect.appendChild(option);
        });

        monthSelect.addEventListener('change', (e) => {
            console.log(`Selected month index: ${e.target.value}`);
        });
    }

    // --- Year Select Logic ---
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
        yearSelect.addEventListener('change', (e) => {
            console.log(`Selected year: ${e.target.value}`);
        });
    }

    // --- Animation Function ---
    function animateValue(el, startValue, endValue, duration, prefix = '', suffix = '') {
        const startTime = Date.now();
        const isDecimal = endValue % 1 !== 0;

        function update() {
            const now = Date.now();
            const progress = Math.min((now - startTime) / duration, 1);
            let current = progress * (endValue - startValue) + startValue;

            let displayValue = isDecimal ? current.toFixed(1) : Math.floor(current).toLocaleString();
            el.textContent = prefix + displayValue + suffix;

            if (progress < 1) {
                requestAnimationFrame(update);
            } else {
                el.textContent = prefix + (isDecimal ? endValue.toFixed(1) : endValue.toLocaleString()) + suffix;
            }
        }
        update();
    }

    function parseAndAnimate(el, newValue) {
        const originalText = el.textContent.trim();
        const prefixMatch = originalText.match(/^[^0-9]*/);
        const prefix = prefixMatch ? prefixMatch[0] : '';
        const suffixMatch = originalText.match(/[^0-9.]*$/);
        const suffix = suffixMatch ? suffixMatch[0] : '';

        // If newValue is provided as number, use it. Otherwise parse from element.
        let end = newValue;
        if (end === undefined) {
            const numericString = originalText.replace(/[^0-9.]/g, '');
            end = parseFloat(numericString) || 0;
        }

        animateValue(el, 0, end, 1500, prefix, suffix);
    }

    // --- Period Dropdowns Logic ---
    const allStatsH3 = document.querySelectorAll('.stat-info h3');

    // Products Sold (Card 3)
    const productPeriodSelect = document.getElementById('products-period-select');
    if (productPeriodSelect) {
        productPeriodSelect.addEventListener('change', (e) => {
            const val = e.target.value;
            let num = 20000;
            if (val === 'today') num = 550;
            else if (val === 'yesterday') num = 480;
            else if (val === 'weekly') num = 3400;
            parseAndAnimate(allStatsH3[2], num);
        });
    }



    // Returns (Card 7)
    const returnsPeriodSelect = document.getElementById('returns-period-select');
    if (returnsPeriodSelect) {
        returnsPeriodSelect.addEventListener('change', (e) => {
            const val = e.target.value;
            let num = 12;
            if (val === 'today') num = 2;
            else if (val === 'yesterday') num = 5;
            else if (val === 'weekly') num = 45;
            else if (val === 'monthly') num = 120;
            parseAndAnimate(allStatsH3[6], num);
        });
    }

    // Initial Animation for all
    allStatsH3.forEach(el => parseAndAnimate(el));

    // --- Theme Handling ---
    if (localStorage.getItem('theme') === 'dark') {
        body.setAttribute('data-theme', 'dark');
        if (themeBtn) themeBtn.innerHTML = '<i class="fa-solid fa-sun"></i>';
    } else {
        if (themeBtn) themeBtn.innerHTML = '<i class="fa-solid fa-moon"></i>';
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
            setTimeout(initCharts, 50);
        });
    }

    // --- Chart Management ---
    let netIncomeChart;
    let moneyStatsChart;

    const getChartColors = () => {
        const isDark = document.body.getAttribute('data-theme') === 'dark';
        return {
            text: isDark ? '#94a3b8' : '#64748b',
            grid: isDark ? '#334155' : '#f3f4f6',
            tooltipBg: isDark ? '#1e293b' : '#ffffff',
            tooltipText: isDark ? '#f8fafc' : '#1e293b'
        };
    };

    function initCharts() {
        if (netIncomeChart) netIncomeChart.destroy();
        if (moneyStatsChart) moneyStatsChart.destroy();

        const colors = getChartColors();
        Chart.defaults.color = colors.text;
        Chart.defaults.borderColor = colors.grid;

        const ctxBar = document.getElementById('netIncomeChart');
        if (ctxBar) {
            netIncomeChart = new Chart(ctxBar.getContext('2d'), {
                type: 'bar',
                data: {
                    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug'],
                    datasets: [
                        { label: 'Rome', data: [25, 30, 35, 45, 20, 15, 60, 40], backgroundColor: '#6366f1', borderRadius: 4, barPercentage: 0.6, categoryPercentage: 0.5 },
                        { label: 'Berlin', data: [15, 35, 20, 15, 25, 30, 40, 50], backgroundColor: '#22c55e', borderRadius: 4, barPercentage: 0.6, categoryPercentage: 0.5 },
                        { label: 'Paris', data: [35, 10, 45, 20, 30, 40, 20, 30], backgroundColor: '#db2777', borderRadius: 4, barPercentage: 0.6, categoryPercentage: 0.5 },
                        { label: 'Zurich', data: [10, 25, 15, 30, 25, 35, 30, 45], backgroundColor: '#9ca3af', borderRadius: 4, barPercentage: 0.6, categoryPercentage: 0.5 }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: { beginAtZero: true, grid: { color: colors.grid, drawBorder: false }, ticks: { callback: v => v + 'k', color: colors.text }, border: { display: false } },
                        x: { grid: { display: false }, ticks: { color: colors.text }, border: { display: false } }
                    },
                    interaction: { mode: 'index', intersect: false },
                    plugins: {
                        tooltip: { backgroundColor: colors.tooltipBg, titleColor: colors.tooltipText, bodyColor: colors.tooltipText, padding: 10, cornerRadius: 8, titleFont: { size: 12 }, bodyFont: { size: 12 }, borderColor: colors.grid, borderWidth: 1 }
                    }
                }
            });
        }

        const ctxDonut = document.getElementById('moneyStatsChart');
        if (ctxDonut) {
            moneyStatsChart = new Chart(ctxDonut.getContext('2d'), {
                type: 'doughnut',
                data: {
                    labels: ['Total spent', 'Money saved'],
                    datasets: [{ data: [42, 58], backgroundColor: ['#db2777', '#818cf8'], borderWidth: 0, cutout: '75%', hoverOffset: 4 }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { tooltip: { enabled: false } }
                }
            });
        }
    }

    initCharts();
});
