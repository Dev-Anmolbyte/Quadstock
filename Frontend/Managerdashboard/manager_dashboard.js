document.addEventListener('DOMContentLoaded', function () {



    // --- Digital Clock ---
    function updateClock() {
        const now = new Date();
        const timeElement = document.querySelector('#digital-clock .time');
        const dateElement = document.querySelector('#digital-clock .date');

        if (timeElement && dateElement) {
            timeElement.textContent = now.toLocaleTimeString('en-US', { hour12: true, hour: '2-digit', minute: '2-digit', second: '2-digit' });
            dateElement.textContent = now.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' });
        }
    }

    if (document.querySelector('#digital-clock')) {
        setInterval(updateClock, 1000);
        updateClock();
    }

    // --- Chart Management ---
    try {
        if (typeof Chart === 'undefined') {
            console.warn("Chart.js is not loaded.");
        } else {
            Chart.defaults.font.family = "'Plus Jakarta Sans', sans-serif";
            Chart.defaults.color = '#9ca3af';
            Chart.defaults.scale.grid.color = '#f3f4f6';

            const createChart = (id, config) => {
                const canvas = document.getElementById(id);
                if (canvas) {
                    return new Chart(canvas.getContext('2d'), config);
                }
                return null;
            };

            // Total Orders Chart
            createChart('totalOrdersChart', {
                type: 'bar',
                data: {
                    labels: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11'],
                    datasets: [{
                        label: 'Orders',
                        data: [150, 240, 380, 250, 120, 100, 180, 250, 240, 160, 260],
                        backgroundColor: (context) => {
                            const value = context.raw;
                            return value > 300 ? '#4ade80' : '#bbf7d0';
                        },
                        borderRadius: 4,
                        barPercentage: 0.6,
                        categoryPercentage: 0.8
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            backgroundColor: '#1f2937',
                            padding: 10,
                            cornerRadius: 8,
                            displayColors: false
                        }
                    },
                    scales: {
                        y: {
                            display: true,
                            border: { display: false },
                            grid: { drawBorder: false, color: '#f3f4f6' },
                            ticks: { stepSize: 100 }
                        },
                        x: {
                            display: false,
                            grid: { display: false }
                        }
                    }
                }
            });

            // Revenue Analytics Chart
            createChart('revenueChart', {
                type: 'bar',
                data: {
                    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sept'],
                    datasets: [{
                        label: 'Revenue',
                        data: [100, 500, 600, 400, 550, 450, 650, 700, 300],
                        backgroundColor: (context) => {
                            return context.dataIndex % 2 === 0 ? '#86efac' : '#4ade80';
                        },
                        borderRadius: 4,
                        barPercentage: 0.5,
                        categoryPercentage: 0.7
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            backgroundColor: '#1f2937',
                            padding: 10,
                            cornerRadius: 8,
                            displayColors: false,
                            callbacks: {
                                label: function (context) { return '$' + context.raw; }
                            }
                        }
                    },
                    scales: {
                        y: {
                            border: { display: false },
                            grid: { color: '#f3f4f6' },
                            ticks: {
                                callback: function (value) { return '$' + value; }
                            }
                        },
                        x: {
                            grid: { display: false },
                            border: { display: false }
                        }
                    }
                }
            });
        }
    } catch (e) {
        console.error("Error initializing charts:", e);
    }

    // --- Active Link Handling ---
    const menuItems = document.querySelectorAll('.menu-item');
    menuItems.forEach(item => {
        item.addEventListener('click', (e) => {
            menuItems.forEach(k => k.classList.remove('active'));
            item.classList.add('active');
        });
    });

});
