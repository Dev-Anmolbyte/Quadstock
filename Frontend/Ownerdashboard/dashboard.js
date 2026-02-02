document.addEventListener('DOMContentLoaded', function () {

    // --- Digital Clock ---
    function updateClock() {
        const now = new Date();
        const dateString = now.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' });
        const timeString = now.toLocaleTimeString('en-US', { hour12: true });
        document.getElementById('digital-clock').innerHTML = `<span style="font-size:0.8em; margin-right:10px; color:#4f46e5;">${dateString}</span> ${timeString}`;
    }
    setInterval(updateClock, 1000);
    updateClock(); // Initial call

    // --- Theme Toggle ---
    const themeBtn = document.getElementById('theme-toggle');
    const body = document.body;

    // Check local storage
    if (localStorage.getItem('theme') === 'dark') {
        body.setAttribute('data-theme', 'dark');
        themeBtn.innerHTML = '<i class="fa-solid fa-sun"></i>';
    } else {
        themeBtn.innerHTML = '<i class="fa-solid fa-moon"></i>'; // Set initial icon for light theme
    }

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
    });

    // --- Count Up Animation ---
    const stats = [
        { el: document.querySelectorAll('.stat-info h3')[0], end: 50000, prefix: '₹' },
        { el: document.querySelectorAll('.stat-info h3')[1], end: 1250, prefix: '₹' },
        { el: document.querySelectorAll('.stat-info h3')[2], end: 2453, prefix: '' },
        // The last one is a percentage text, usually static or minor change, skipping for simplicity or can animate number
    ];

    stats.forEach(stat => {
        let start = 0;
        const duration = 2000;
        const step = Math.floor(stat.end / (duration / 16)); // ~60 frames per second

        function counter() {
            start += step;
            if (start >= stat.end) {
                stat.el.textContent = stat.prefix + stat.end.toLocaleString();
            } else {
                stat.el.textContent = stat.prefix + start.toLocaleString();
                requestAnimationFrame(counter);
            }
        }
        counter();
    });

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

        // Net Income Chart
        const ctxBar = document.getElementById('netIncomeChart').getContext('2d');
        netIncomeChart = new Chart(ctxBar, {
            type: 'bar',
            data: {
                labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug'],
                datasets: [
                    { label: 'Rome', data: [25, 30, 35, 45, 20, 15, 60, 40], backgroundColor: '#6366f1', borderRadius: 4, barPercentage: 0.6, categoryPercentage: 0.5 },
                    { label: 'Berlin', data: [15, 35, 20, 15, 25, 30, 40, 50], backgroundColor: '#22c55e', borderRadius: 4, barPercentage: 0.6, categoryPercentage: 0.5 },
                    { label: 'Paris', data: [35, 10, 45, 20, 30, 40, 20, 30], backgroundColor: '#db2777', borderRadius: 4, barPercentage: 0.6, categoryPercentage: 0.5 }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: { color: colors.grid, drawBorder: false },
                        ticks: { callback: v => v + 'k', color: colors.text },
                        border: { display: false }
                    },
                    x: {
                        grid: { display: false },
                        ticks: { color: colors.text },
                        border: { display: false }
                    }
                },
                interaction: { mode: 'index', intersect: false },
                plugins: {
                    tooltip: {
                        backgroundColor: colors.tooltipBg,
                        titleColor: colors.tooltipText,
                        bodyColor: colors.tooltipText,
                        padding: 10,
                        cornerRadius: 8,
                        titleFont: { size: 12 },
                        bodyFont: { size: 12 },
                        borderColor: colors.grid,
                        borderWidth: 1
                    }
                }
            }
        });

        // Money Stats Chart
        const ctxDonut = document.getElementById('moneyStatsChart').getContext('2d');
        moneyStatsChart = new Chart(ctxDonut, {
            type: 'doughnut',
            data: {
                labels: ['Total spent', 'Money saved'],
                datasets: [{
                    data: [42, 58],
                    backgroundColor: ['#db2777', '#818cf8'],
                    borderWidth: 0,
                    cutout: '75%',
                    hoverOffset: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { tooltip: { enabled: false } }
            }
        });
    }

    // Initialize charts on load
    initCharts();

    // Re-init charts on theme toggle
    themeBtn.addEventListener('click', () => {
        // ... (existing toggle logic handled in previous block, we just need to re-render charts after)
        // We need to wrap the existing listener or append this one. 
        // Since we replaced the listener block above, we can just call initCharts() here if we modified that block.
        // But wait, I can't easily modify the *previous* listener in this tool call without replacing it again.
        // Instead, I'll add a SECOND listener for the same button.
        setTimeout(initCharts, 50); // Small delay to let DOM update attributes
    });

});
