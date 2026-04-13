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
    const nameEl = document.getElementById('staff-name');
    if (nameEl && emp) {
        nameEl.textContent = emp.name || 'User';
    }

    const shopNameTarget = document.getElementById('shop-name-target');
    if (shopNameTarget) {
        const shopName = (typeof currentUser !== 'undefined' && currentUser?.shopName) || (currentEmployee && currentEmployee?.shopName) || 'QuadStock Store';
        const innerNameEl = shopNameTarget.querySelector('.shop-name');
        if (innerNameEl) innerNameEl.textContent = shopName;
    }

    // Sidebar & Topbar are now handled by Shared/Components/sidebar.js
    // clock and theme are also handled by sidebar.js


    // --- 6. Attendance API Logic ---
    let dailyRecord = { sessions: [] };

    async function loadAttendance() {
        try {
            const month = new Date().toISOString().slice(0, 7);
            const response = await fetch(`${API_BASE}/attendance/me?month=${month}`, { headers: HEADERS });
            const result = await response.json();
            
            if (result.success && result.data.length > 0) {
                const todayStr = new Date().toISOString().split('T')[0];
                const todayRecord = result.data.find(r => r.date === todayStr);
                if (todayRecord) {
                    dailyRecord = todayRecord;
                }
            }
            updateUI();
        } catch (error) {
            console.error("Failed to load attendance:", error);
        }
    }

    const btnMain = document.getElementById('btn-main-action');
    const btnSub = document.getElementById('btn-sub-action');
    const badge = document.getElementById('status-badge');
    const label = document.getElementById('status-label');
    const timeEl = document.getElementById('status-time');
    const desc = document.getElementById('status-desc');

    function updateUI() {
        if (!badge) return;
        const lastSession = dailyRecord.sessions[dailyRecord.sessions.length - 1];
        const isWorking = lastSession && !lastSession.out;
        
        let displayTime = '00:00';
        if (lastSession) {
            const timeToUse = isWorking ? lastSession.in : lastSession.out;
            displayTime = new Date(timeToUse).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }

        badge.className = 'status-pill';

        if (isWorking) {
            badge.classList.add('online');
            label.textContent = 'Active Duty';
            timeEl.textContent = displayTime;
            desc.textContent = 'You are currently on shift.';
            
            btnMain.innerHTML = '<i class="fa-solid fa-stop"></i> <span>End Shift</span>';
            btnMain.style.background = '#ef4444';
            btnSub.style.display = 'flex';
            btnSub.innerHTML = '<i class="fa-solid fa-mug-hot"></i> <span>Go on Break</span>';
        } else if (lastSession && lastSession.isBreak) {
            badge.classList.add('break');
            label.textContent = 'On Break';
            timeEl.textContent = displayTime;
            desc.textContent = 'Relax, you are on break.';

            btnMain.innerHTML = '<i class="fa-solid fa-stop"></i> <span>End Shift</span>';
            btnMain.style.background = '#ef4444';
            btnSub.style.display = 'flex';
            btnSub.innerHTML = '<i class="fa-solid fa-play"></i> <span>Resume Duty</span>';
        } else {
            badge.classList.add('offline');
            label.textContent = 'Off Duty';
            timeEl.textContent = lastSession ? displayTime : '00:00';
            desc.textContent = lastSession ? 'Shift ended for today.' : 'Start your shift to begin.';

            btnMain.innerHTML = '<i class="fa-solid fa-play"></i> <span>Start Shift</span>';
            btnMain.style.background = 'var(--primary)';
            btnSub.style.display = 'none';
        }
    }

    if (btnMain) {
        btnMain.addEventListener('click', async () => {
            const lastSession = dailyRecord.sessions[dailyRecord.sessions.length - 1];
            
            if (lastSession && !lastSession.out) {
                // End Shift
                const confirmed = (typeof QuadModals !== 'undefined') 
                    ? await QuadModals.confirm("End Shift", "Are you sure you want to end your shift for today?", { isDanger: true, confirmText: 'End Shift' }) 
                    : confirm("Are you sure you want to end your shift for today?");
                    
                if (!confirmed) return;
                
                await syncPunchOut(false);
            } else {
                // Start Shift
                await syncPunchIn();
            }
        });
    }

    if (btnSub) {
        btnSub.addEventListener('click', async () => {
            const lastSession = dailyRecord.sessions[dailyRecord.sessions.length - 1];

            if (lastSession && !lastSession.out) {
                // Currently working -> Take Break
                await syncPunchOut(true);
            } else if (lastSession && lastSession.isBreak) {
                // Currently on break -> Resume Duty
                await syncPunchIn();
            }
        });
    }

    async function syncPunchIn() {
        try {
            const res = await fetch(`${API_BASE}/attendance/punch-in`, {
                method: 'POST',
                headers: HEADERS
            });
            const result = await res.json();
            if (result.success) {
                dailyRecord = result.data;
                updateUI();
                syncStatusToBackend('active');
            }
        } catch (error) {
            console.error("Punch in failed:", error);
        }
    }

    async function syncPunchOut(isBreak) {
        try {
            const res = await fetch(`${API_BASE}/attendance/punch-out`, {
                method: 'PATCH',
                headers: HEADERS,
                body: JSON.stringify({ isBreak })
            });
            const result = await res.json();
            if (result.success) {
                dailyRecord = result.data;
                updateUI();
                syncStatusToBackend(isBreak ? 'break' : 'offline');
            }
        } catch (error) {
            console.error("Punch out failed:", error);
        }
    }

    // --- 7. Sales Performance Logic (API Based) ---
    async function fetchSalesPerformance() {
        try {
            const response = await fetch(`${API_BASE}/sales/my-sales`, { headers: HEADERS });
            const result = await response.json();
            
            if (result.success && result.data) {
                const summary = result.data;
                const dVal = document.getElementById('current-sales');
                const pBar = document.getElementById('target-progress-bar');
                const pText = document.getElementById('target-percent');
                
                // For weekly/monthly we can either have specific endpoints or just use current summary
                // The backend currently provides monthly summary. Let's update UI.
                const mVal = document.getElementById('monthly-sales-val');
                if (mVal) mVal.textContent = `₹${summary.totalSales.toLocaleString()}`;
                if (dVal) dVal.textContent = `₹${summary.totalSales.toLocaleString()}`; // Simplified for now

                if (pBar && pText) {
                    const monthlyTarget = 300000; // Example
                    let percent = Math.min((summary.totalSales / monthlyTarget) * 100, 100).toFixed(0);
                    pText.textContent = `${percent}%`;
                    pBar.style.width = `${percent}%`;
                }
            }
        } catch (error) {
            console.error("Failed to fetch sales performance:", error);
        }
    }

    loadAttendance();
    fetchSalesPerformance();
});


function logout() {
    sessionStorage.clear();
    window.location.href = '../Authentication/employee_login.html';
}
