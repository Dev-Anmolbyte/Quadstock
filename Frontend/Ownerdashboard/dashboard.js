import { updateDashboardStats, resetNotification } from '../Shared/Utils/dashboard_stats.js';

// --- Authentication Check (Start of file) ---
if (!localStorage.getItem('currentUser')) {
    window.location.href = '../Authentication/login.html';
}

document.addEventListener('DOMContentLoaded', function () {

    // Fetch Owner Info dynamically
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    if (currentUser) {
        const nameSpans = document.querySelectorAll('.user-name');
        nameSpans.forEach(span => {
            span.textContent = currentUser.ownerName || currentUser.shopName || 'Owner';
        });
        const initialIcons = document.querySelectorAll('.user-profile > div:first-child');
        initialIcons.forEach(icon => {
            const nameToUse = currentUser.ownerName || 'O';
            icon.textContent = nameToUse.charAt(0).toUpperCase();
        });
    }

    // Initialize Shared Stats
    updateDashboardStats();

    // Attach Notification Reset Listeners
    const complainLink = document.querySelector('a[href*="Complain/complain.html"]');
    if (complainLink) {
        complainLink.addEventListener('click', () => resetNotification('complain'));
    }

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
    // Clear any existing intervals if re-running script context (though unlikely in standard page load)
    if (window.clockInterval) clearInterval(window.clockInterval);
    window.clockInterval = setInterval(updateClock, 1000);
    updateClock();

    // --- Theme Toggle ---
    const themeBtn = document.getElementById('theme-toggle');
    const body = document.body;

    // Load saved theme
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
            if (container) {
                container.classList.toggle('sidebar-collapsed');
            } else {
                // Fallback if structure is different
                document.body.classList.toggle('sidebar-collapsed');
            }
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

    initCharts();
});

