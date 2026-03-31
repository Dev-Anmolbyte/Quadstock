import CONFIG from '../Shared/Utils/config.js';

document.addEventListener('DOMContentLoaded', () => {
    // --- 1. Authentication & Session ---
    // Switched to sessionStorage for consistency with guard.js
    const sessionToken = sessionStorage.getItem('authToken');
    const currentEmployee = JSON.parse(sessionStorage.getItem('currentEmployee'));
    const emp = currentEmployee;

    if (!emp || !sessionToken) {
        window.location.href = '../Authentication/employee_login.html';
        return;
    }

    const API_BASE = CONFIG.API_BASE_URL;
    const HEADERS = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${sessionToken}`
    };

    // --- Live Status Sync ---
    async function syncStatusToBackend(status) {
        try {
            const response = await fetch(`${API_BASE}/employees/status`, {
                method: 'PATCH',
                headers: HEADERS,
                body: JSON.stringify({ status })
            });
            const result = await response.json();
            if (!result.success) {
                console.error("Failed to sync status:", result.message);
            }
        } catch (error) {
            console.error("Network error while syncing status:", error);
        }
    }

    const userRole = emp.role || 'staff';

    // --- 2. Initial Setup ---
    document.getElementById('staff-name').textContent = emp.name;
    const shopNameTarget = document.getElementById('shop-name-target');
    if (shopNameTarget) {
        const shopName = (currentUser && currentUser.shopName) || (currentEmployee && currentEmployee.shopName) || 'QuadStock Store';
        shopNameTarget.querySelector('.shop-name').textContent = shopName;
    }

    // --- 3. Sidebar Rendering ---
    function renderSidebar(role) {
        const target = document.getElementById('sidebar-target');
        if (!target) return;

        let menuHtml = `
            <a href="staff_dashboard.html" class="menu-item active" title="Dashboard">
                <i class="fa-solid fa-house-chimney"></i>
                <span>Dashboard</span>
            </a>
            <a href="../Sales/sales.html" class="menu-item" title="POS Billing"><i class="fa-solid fa-cash-register"></i><span>POS Billing</span></a>
            <a href="../Query/query.html" class="menu-item" title="Query"><i class="fa-solid fa-clipboard-question"></i><span>Query</span></a>
            <a href="../Complain/complain.html" class="menu-item" title="Complain"><i class="fa-solid fa-triangle-exclamation"></i><span>Complain</span></a>
        `;



        menuHtml += `<a href="#" class="menu-item" id="logout-btn-sidebar"><i class="fa-solid fa-right-from-bracket"></i><span>Logout</span></a>`;
        target.innerHTML = `
            <div class="brand"><button id="sidebar-toggle" class="sidebar-toggle"><i class="fa-solid fa-bars"></i></button><h2 class="brand-text">QuadStock</h2></div>
            <nav class="sidebar-menu">${menuHtml}</nav>
            <div class="sidebar-footer-card"><div class="support-illustration"><svg viewBox="0 0 100 100" class="illus-svg"><circle cx="50" cy="35" r="15" fill="#333" /><path d="M20,80 Q50,70 80,80 V100 H20 Z" fill="#333" /><rect x="15" y="45" width="25" height="15" rx="2" fill="#555" transform="rotate(-15 27 52)" /></svg></div>
            <a href="../Footer/contact.html" class="btn-support" style="text-decoration:none;"><i class="fa-regular fa-life-ring"></i> Support</a></div>
        `;

        document.getElementById('logout-btn-sidebar').onclick = (e) => { e.preventDefault(); logout(); };
        document.getElementById('sidebar-toggle').onclick = (e) => {
            e.stopPropagation();
            document.querySelector('.layout-container').classList.toggle('sidebar-collapsed');
        };
    }
    renderSidebar(userRole);

    // --- 4. Clock Logic ---
    function updateClock() {
        const clockEl = document.getElementById('digital-clock');
        if (clockEl) {
            const now = new Date();
            clockEl.innerHTML = `<span style="opacity:0.6; margin-right:8px;">${now.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' })}</span> <b>${now.toLocaleTimeString('en-US', { hour12: true })}</b>`;
        }
    }
    setInterval(updateClock, 1000);
    updateClock();

    // --- 5. Theme Logic ---
    const themeBtn = document.getElementById('theme-toggle');
    function applyTheme(theme) {
        document.body.setAttribute('data-theme', theme);
        document.documentElement.setAttribute('data-theme', theme);
        if (themeBtn) themeBtn.innerHTML = theme === 'dark' ? '<i class="fa-solid fa-sun"></i>' : '<i class="fa-solid fa-moon"></i>';
    }
    applyTheme(localStorage.getItem('theme') || 'light');
    if (themeBtn) themeBtn.onclick = () => {
        const next = document.body.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
        localStorage.setItem('theme', next);
        applyTheme(next);
    };

    // --- 6. Attendance Logic ---
    const today = new Date().toISOString().split('T')[0];
    let attendance = JSON.parse(localStorage.getItem('quadstock_attendance')) || [];
    let dailyRecord = attendance.find(r => r.empId === emp.empId && r.date === today);
    if (!dailyRecord) {
        dailyRecord = { empId: emp.empId, date: today, sessions: [] };
        attendance.push(dailyRecord);
    }

    const btnMain = document.getElementById('btn-main-action');
    const btnSub = document.getElementById('btn-sub-action');
    const badge = document.getElementById('status-badge');
    const label = document.getElementById('status-label');
    const timeEl = document.getElementById('status-time');
    const desc = document.getElementById('status-desc');

    function updateUI() {
        const lastSession = dailyRecord.sessions[dailyRecord.sessions.length - 1];
        const isWorking = lastSession && !lastSession.out;
        const timeStr = lastSession ? new Date(isWorking ? lastSession.in : lastSession.out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '00:00';

        if (isWorking) {
            // Working State
            badge.style.background = 'rgba(16, 185, 129, 0.1)';
            badge.style.color = '#10b981';
            label.textContent = 'Active Duty';
            timeEl.textContent = timeStr;
            desc.textContent = 'You are currently on shift.';
            
            btnMain.innerHTML = '<i class="fa-solid fa-stop"></i> <span>End Shift</span>';
            btnMain.style.background = '#ef4444';
            btnSub.style.display = 'flex';
            btnSub.innerHTML = '<i class="fa-solid fa-mug-hot"></i> <span>Go on Break</span>';
            addActivity('Started Shift', timeStr);
        } else if (lastSession && lastSession.isBreak) {
            // Break State
            badge.style.background = 'rgba(245, 158, 11, 0.1)';
            badge.style.color = '#f59e0b';
            label.textContent = 'On Break';
            timeEl.textContent = timeStr;
            desc.textContent = 'Relax, you are on break.';

            btnMain.innerHTML = '<i class="fa-solid fa-stop"></i> <span>End Shift</span>';
            btnMain.style.background = '#ef4444';
            btnSub.style.display = 'flex';
            btnSub.innerHTML = '<i class="fa-solid fa-play"></i> <span>Resume Duty</span>';
            addActivity('Went on Break', timeStr);
        } else {
            // Off State
            badge.style.background = 'var(--bg-body)';
            badge.style.color = 'var(--text-secondary)';
            label.textContent = 'Off Duty';
            timeEl.textContent = lastSession ? timeStr : '00:00';
            desc.textContent = lastSession ? 'Shift ended for today.' : 'Start your shift to begin.';

            btnMain.innerHTML = '<i class="fa-solid fa-play"></i> <span>Start Shift</span>';
            btnMain.style.background = 'var(--primary-color)';
            btnSub.style.display = 'none';
            if (lastSession) addActivity('Ended Shift', timeStr);
        }
        updateSalesProgress();
        renderActivityFeed();
    }

    btnMain.onclick = () => {
        const now = new Date();
        const lastSession = dailyRecord.sessions[dailyRecord.sessions.length - 1];
        if (lastSession && !lastSession.out) {
            lastSession.out = now.toISOString();
            lastSession.isBreak = false;
        } else {
            dailyRecord.sessions.push({ in: now.toISOString(), out: null, isBreak: false });
        }
        
        saveAttendance();
        updateUI();
        
        // SYNC TO BACKEND
        const syncedSession = dailyRecord.sessions[dailyRecord.sessions.length - 1];
        const status = (syncedSession && !syncedSession.out) ? 'active' : 'offline';
        syncStatusToBackend(status);
    };

    btnSub.onclick = () => {
        const now = new Date();
        const lastSession = dailyRecord.sessions[dailyRecord.sessions.length - 1];
        let status = 'active';

        if (lastSession && !lastSession.out) {
            // Take Break
            lastSession.out = now.toISOString();
            lastSession.isBreak = true;
            status = 'break';
        } else if (lastSession && lastSession.isBreak) {
            // Resume Duty
            dailyRecord.sessions.push({ in: now.toISOString(), out: null, isBreak: false });
            status = 'active';
        }

        saveAttendance();
        updateUI();

        // SYNC TO BACKEND
        syncStatusToBackend(status);
    };

    function saveAttendance() {
        const idx = attendance.findIndex(r => r.empId === emp.empId && r.date === today);
        if (idx !== -1) attendance[idx] = dailyRecord;
        localStorage.setItem('quadstock_attendance', JSON.stringify(attendance));
    }

    // --- 7. Activity & Target Logic ---
    function addActivity(type, time) {
        let activities = JSON.parse(localStorage.getItem(`activities_${emp.empId}`)) || [];
        const exists = activities.some(a => a.type === type && a.time === time && a.date === new Date().toLocaleDateString());
        if (!exists) {
            activities.unshift({ type, time, date: new Date().toLocaleDateString() });
            if (activities.length > 5) activities.pop();
            localStorage.setItem(`activities_${emp.empId}`, JSON.stringify(activities));
        }
    }

    function renderActivityFeed() {
        const feed = document.getElementById('activity-feed');
        if (!feed) return;
        const activities = JSON.parse(localStorage.getItem(`activities_${emp.empId}`)) || [];
        if (activities.length === 0) { feed.innerHTML = '<p style="color:var(--text-secondary); font-size:0.9rem;">No activity yet.</p>'; return; }
        feed.innerHTML = activities.map(a => `
            <div style="display:flex; justify-content:space-between; align-items:center; padding:0.8rem 0; border-bottom:1px solid var(--border-color);">
                <div style="display:flex; align-items:center; gap:0.75rem;">
                    <div style="width:32px; height:32px; border-radius:50%; background:var(--bg-body); display:flex; align-items:center; justify-content:center; color:var(--primary-color);">
                        <i class="fa-solid ${a.type.includes('Shift') ? 'fa-clock' : 'fa-mug-hot'}"></i>
                    </div>
                    <span>${a.type}</span>
                </div>
                <b style="font-size:0.85rem;">${a.time}</b>
            </div>
        `).join('');
    }

    function updateSalesProgress() {
        const target = 10000, current = 6500, percent = Math.min(100, (current / target) * 100);
        const pb = document.getElementById('target-progress-bar'), tp = document.getElementById('target-percent'), cs = document.getElementById('current-sales');
        if (pb) pb.style.width = `${percent}%`;
        if (tp) tp.textContent = `${Math.round(percent)}%`;
        if (cs) cs.textContent = `₹${current.toLocaleString()}`;
    }

    updateUI();
});

function logout() {
    sessionStorage.clear();
    window.location.href = '../Authentication/employee_login.html';
}
