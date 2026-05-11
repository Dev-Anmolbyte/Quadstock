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
            console.log("Loading attendance history...");
            const month = new Date().toISOString().slice(0, 7);
            const response = await fetch(`${API_BASE}/attendance/me?month=${month}`, { headers: HEADERS });
            
            if (!response.ok) {
                console.warn("Attendance Load failed with status:", response.status);
                if (response.status === 401) {
                    window.alert("Session expired. Please re-login.");
                    logout();
                    return;
                }
            }

            const result = await response.json();
            
            if (result.success) {
                const todayStr = new Date().toISOString().split('T')[0];
                const todayRecord = (result.data || []).find(r => r.date === todayStr);
                dailyRecord = todayRecord || { sessions: [] };
            }
            updateUI();
        } catch (error) {
            console.error("Failed to load attendance:", error);
            window.alert("Critical Error: Could not load your attendance data. Please refresh.");
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
        
        const sessions = dailyRecord.sessions || [];
        const firstSession = sessions[0];
        const lastSession = sessions[sessions.length - 1];
        
        const isWorking = lastSession && !lastSession.out;
        const isOnBreak = lastSession && lastSession.out && lastSession.isBreak;
        
        // Fixed Start Time: Always show the in-time of the first session of the day
        let displayTime = '00:00';
        if (firstSession) {
            displayTime = new Date(firstSession.in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }

        // Update Circular Ring
        const ring = document.querySelector('.ring-progress');
        if (ring) {
            ring.style.strokeDashoffset = isWorking ? '140' : (isOnBreak ? '210' : '283');
        }

        const card = document.querySelector('.attendance-card-v2');
        if (card) {
            if (isWorking) card.classList.add('active-shift');
            else card.classList.remove('active-shift');
        }

        const endTimeEl = document.getElementById('status-end-time');
        const endTimeContainer = document.getElementById('end-time-container');
        let displayEndTime = '--:--';

        if (isWorking) {
            badge.className = 'status-pill-v2 online';
            label.textContent = 'Active Duty';
            timeEl.textContent = displayTime;
            desc.textContent = 'You are currently on shift. Crush your goals!';
            
            btnMain.innerHTML = '<i class="fa-solid fa-stop"></i> <span>End Shift</span>';
            btnMain.className = 'btn-action-primary state-end';
            btnSub.style.display = 'flex';
            btnSub.innerHTML = '<i class="fa-solid fa-mug-hot"></i> <span>Go on Break</span>';
            btnSub.className = 'btn-action-secondary';
            
            if (endTimeContainer) endTimeContainer.style.display = 'none';
        } else if (isOnBreak) {
            badge.className = 'status-pill-v2 break';
            label.textContent = 'On Break';
            timeEl.textContent = displayTime;
            desc.textContent = 'Relax and recharge. You deserve it!';

            btnMain.innerHTML = '<i class="fa-solid fa-stop"></i> <span>End Shift</span>';
            btnMain.className = 'btn-action-primary state-end';
            btnSub.style.display = 'flex';
            btnSub.innerHTML = '<i class="fa-solid fa-play"></i> <span>Resume Duty</span>';
            btnSub.className = 'btn-action-secondary state-resume';
            
            if (endTimeContainer) endTimeContainer.style.display = 'none';
        } else {
            badge.className = 'status-pill-v2 offline';
            label.textContent = 'Off Duty';
            timeEl.textContent = displayTime;
            
            if (lastSession && lastSession.out && !lastSession.isBreak) {
                displayEndTime = new Date(lastSession.out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                if (endTimeContainer) endTimeContainer.style.display = 'block';
                desc.textContent = 'Shift ended. Great work today!';
            } else {
                if (endTimeContainer) endTimeContainer.style.display = 'none';
                desc.textContent = 'Start your shift to begin tracking.';
            }

            btnMain.innerHTML = '<i class="fa-solid fa-play"></i> <span>Start Shift</span>';
            btnMain.className = 'btn-action-primary';
            btnSub.style.display = 'none';
        }

        if (endTimeEl) endTimeEl.textContent = displayEndTime;
    }

    if (btnMain) {
        btnMain.addEventListener('click', async () => {
            console.log("Shift action triggered. Current record:", dailyRecord);
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
            if (typeof QuadModals !== 'undefined') QuadModals.showToast("Starting shift...", "info");
            console.log("Attempting Punch In to:", `${API_BASE}/attendance/punch-in`);

            const res = await fetch(`${API_BASE}/attendance/punch-in`, {
                method: 'POST',
                headers: HEADERS
            });
            console.log("Punch In Status:", res.status);
            const result = await res.json();
            console.log("Punch In Result:", result);
            
            if (result.success) {
                dailyRecord = result.data;
                updateUI();
                syncStatusToBackend('active');
                if (typeof QuadModals !== 'undefined') QuadModals.showToast("Shift started successfully!", "success");
            } else {
                if (typeof QuadModals !== 'undefined') QuadModals.alert("Action Failed", result.message || "Could not start shift", "error");
            }
        } catch (error) {
            console.error("Punch in failed:", error);
            if (typeof QuadModals !== 'undefined') QuadModals.showToast("Network error while starting shift", "error");
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
                if (typeof QuadModals !== 'undefined') QuadModals.showToast(isBreak ? "Break started" : "Shift ended", "info");
            } else {
                if (typeof QuadModals !== 'undefined') QuadModals.alert("Action Failed", result.message || "Could not update shift", "error");
            }
        } catch (error) {
            console.error("Punch out failed:", error);
            if (typeof QuadModals !== 'undefined') QuadModals.showToast("Network error", "error");
        }
    }


    // --- 7. Sales Performance Logic (API Based) ---
    async function fetchSalesPerformance() {
        try {
            const response = await fetch(`${API_BASE}/sales/my-sales`, { headers: HEADERS });
            const result = await response.json();
            
            if (result.success && result.data) {
                const summary = result.data;
                const pBar = document.getElementById('target-progress-bar');
                const pText = document.getElementById('target-percent');
                
                // For weekly/monthly we can either have specific endpoints or just use current summary
                // Update UI for Weekly and Monthly Sales
                const mVal = document.getElementById('monthly-sales-val');
                const wVal = document.getElementById('weekly-sales-val');
                
                if (mVal) mVal.textContent = `₹${summary.totalSales.toLocaleString()}`;
                if (wVal) wVal.textContent = `₹${(summary.weeklySales || 0).toLocaleString()}`;

                if (pBar && pText) {
                    const monthlyTarget = 300000; 
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
    
    // --- NEW: Periodic Sync (Every 5 minutes) ---
    setInterval(() => {
        loadAttendance();
        fetchSalesPerformance();
    }, 300000);
});


async function logout() {
    try {
        const sessionToken = sessionStorage.getItem('authToken');
        if (sessionToken) {
            await fetch(`${CONFIG.API_BASE_URL}/users/logout`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${sessionToken}`
                }
            });
        }
    } catch (error) {
        console.error("Logout API failed:", error);
    }
    sessionStorage.clear();
    window.location.href = '../Authentication/employee_login.html';
}

