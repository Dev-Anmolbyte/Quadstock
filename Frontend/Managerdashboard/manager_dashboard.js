document.addEventListener('DOMContentLoaded', function () {
    // --- Chart Colors ---
    const getChartColors = () => {
        const isDark = document.body.getAttribute('data-theme') === 'dark';
        return {
            text: isDark ? '#94a3b8' : '#64748b',
            grid: isDark ? '#334155' : '#e2e8f0',
            primary: '#003f3f',
            blue: '#0ea5e9',
            green: '#22c55e',
            pink: '#db2777',
            grey: '#9ca3af',
            white: '#ffffff'
        };
    };

    // --- Digital Clock ---
    function updateClock() {
        const now = new Date();
        const dateString = now.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' });
        const timeString = now.toLocaleTimeString('en-US', { hour12: true });
        const clockEl = document.getElementById('digital-clock');
        if (clockEl) {
            clockEl.innerHTML = `<span style="font-size:0.85em; margin-right:12px; color:var(--primary); font-weight:700; opacity:0.8;">${dateString}</span> <span style="color:var(--text-main); font-weight:800;">${timeString}</span>`;
        }
    }
    setInterval(updateClock, 1000);
    updateClock();

    // --- Month & Year Select Initialization (From Owner Dashboard) ---
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

    // --- Theme Toggle ---
    const themeBtn = document.getElementById('theme-toggle');
    const body = document.body;

    // --- Sidebar Toggle ---
    const sidebarToggle = document.getElementById('sidebar-toggle');
    const layoutContainer = document.querySelector('.layout-container');

    if (sidebarToggle && layoutContainer) {
        sidebarToggle.addEventListener('click', () => {
            layoutContainer.classList.toggle('sidebar-collapsed');
            // Re-init charts after layout change transition
            setTimeout(initCharts, 350);
        });
    }

    function setTheme(theme) {
        if (theme === 'dark') {
            document.documentElement.setAttribute('data-theme', 'dark');
            body.setAttribute('data-theme', 'dark');
            if (themeBtn) themeBtn.innerHTML = '<i class="fa-solid fa-sun"></i>';
        } else {
            document.documentElement.removeAttribute('data-theme');
            body.removeAttribute('data-theme');
            if (themeBtn) themeBtn.innerHTML = '<i class="fa-solid fa-moon"></i>';
        }
        localStorage.setItem('theme', theme);
        setTimeout(initCharts, 100);
    }

    if (localStorage.getItem('theme') === 'dark') {
        setTheme('dark');
    }

    if (themeBtn) {
        themeBtn.addEventListener('click', () => {
            const current = localStorage.getItem('theme') === 'dark' ? 'light' : 'dark';
            setTheme(current);
        });
    }

    // --- Stats Animation ---
    function animateValue(el, start, end, duration, prefix = '', suffix = '') {
        const startTime = Date.now();
        function update() {
            const now = Date.now();
            const progress = Math.min((now - startTime) / duration, 1);
            let current = progress * (end - start) + start;
            el.textContent = prefix + Math.floor(current).toLocaleString() + suffix;
            if (progress < 1) requestAnimationFrame(update);
        }
        update();
    }

    const statH3s = document.querySelectorAll('.stat-value');

    function parseAndAnimate(el, newValue) {
        const prefix = el.textContent.includes('₹') ? '₹' : '';
        animateValue(el, 0, newValue, 1500, prefix);
    }

    // Initial Animation for all
    statH3s.forEach(el => {
        const raw = el.textContent.replace(/[^0-9]/g, '');
        const val = parseInt(raw) || 0;
        parseAndAnimate(el, val);
    });

    // --- Dropdown Change Handlers ---
    document.getElementById('products-period-select')?.addEventListener('change', (e) => {
        const val = e.target.value;
        let num = 20000;
        if (val === 'today') num = 550;
        else if (val === 'yesterday') num = 480;
        else if (val === 'weekly') num = 3400;
        parseAndAnimate(statH3s[2], num);
    });

    document.getElementById('returns-period-select')?.addEventListener('change', (e) => {
        const val = e.target.value;
        let num = 12;
        if (val === 'today') num = 2;
        else if (val === 'yesterday') num = 5;
        else if (val === 'weekly') num = 45;
        else if (val === 'monthly') num = 120;
        parseAndAnimate(statH3s[6], num);
    });

    document.getElementById('revenue-month-select')?.addEventListener('change', () => {
        parseAndAnimate(statH3s[1], 600000 + Math.floor(Math.random() * 50000));
    });

    document.getElementById('revenue-year-select')?.addEventListener('change', () => {
        parseAndAnimate(statH3s[0], 10000000 + Math.floor(Math.random() * 1000000));
    });

    // --- Charts Logic ---
    let netIncomeChart;
    let moneyStatsChart;

    function initCharts() {
        if (netIncomeChart) netIncomeChart.destroy();
        if (moneyStatsChart) moneyStatsChart.destroy();

        const colors = getChartColors();

        // 1. Net Income Bar Chart (Owner Dashboard Content)
        const ctxNet = document.getElementById('netIncomeChart')?.getContext('2d');
        if (ctxNet) {
            netIncomeChart = new Chart(ctxNet, {
                type: 'bar',
                data: {
                    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug'],
                    datasets: [
                        { label: 'Rome', data: [25, 30, 35, 45, 20, 15, 60, 40], backgroundColor: colors.blue, borderRadius: 10, barPercentage: 0.6 },
                        { label: 'Berlin', data: [15, 35, 20, 15, 25, 30, 40, 50], backgroundColor: colors.green, borderRadius: 10, barPercentage: 0.6 }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: { beginAtZero: true, grid: { color: colors.grid, drawBorder: false }, ticks: { color: colors.text, callback: v => v + 'k' } },
                        x: { grid: { display: false }, ticks: { color: colors.text } }
                    },
                    plugins: {
                        legend: { display: false }
                    }
                }
            });
        }

        // 2. Money Stats Donut Chart (Owner Dashboard Content)
        const ctxMoney = document.getElementById('moneyStatsChart')?.getContext('2d');
        if (ctxMoney) {
            moneyStatsChart = new Chart(ctxMoney, {
                type: 'doughnut',
                data: {
                    labels: ['Total spent', 'Money saved'],
                    datasets: [{
                        data: [42, 58],
                        backgroundColor: [colors.pink, colors.blue],
                        borderWidth: 0,
                        cutout: '75%',
                        hoverOffset: 4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false },
                        tooltip: { enabled: true }
                    }
                }
            });
        }
    }

    // --- Interactivity ---
    document.querySelectorAll('.qty-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const span = btn.parentElement.querySelector('span');
            let val = parseInt(span.innerText);
            if (btn.classList.contains('plus')) val++;
            else if (val > 1) val--;
            span.innerText = val;
        });
    });

    initCharts();
});
