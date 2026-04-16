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
        } else if (isOnBreak) {
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
            timeEl.textContent = displayTime;
            desc.textContent = lastSession ? 'Shift ended for today.' : 'Start your shift to begin.';

            btnMain.innerHTML = '<i class="fa-solid fa-play"></i> <span>Start Shift</span>';
            btnMain.style.background = 'var(--primary)';
            btnSub.style.display = 'none';
        }
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
    
    // --- 8. Tab Close / Exit Handling ---
    window.addEventListener('beforeunload', (event) => {
        const lastSession = dailyRecord.sessions[dailyRecord.sessions.length - 1];
        const isWorking = lastSession && !lastSession.out;

        if (isWorking) {
            // Standard way to show a confirmation dialog in modern browsers
            event.preventDefault();
            event.returnValue = 'Refreshing or closing the tab will end your shift for today. Are you sure?';
        }
    });

    window.addEventListener('unload', () => {
        const lastSession = dailyRecord.sessions[dailyRecord.sessions.length - 1];
        const isWorking = lastSession && !lastSession.out;

        if (isWorking) {
            // Use keepalive fetch to ensure the request finishes after the tab is closed
            fetch(`${API_BASE}/attendance/punch-out`, {
                method: 'PATCH',
                headers: HEADERS,
                body: JSON.stringify({ isBreak: false }),
                keepalive: true
            }).catch(err => console.error("Exit punch-out failed:", err));
            
            fetch(`${API_BASE}/employees/status`, {
                method: 'PATCH',
                headers: HEADERS,
                body: JSON.stringify({ status: 'offline' }),
                keepalive: true
            }).catch(err => console.error("Exit status sync failed:", err));

            // Clear sessionStorage as part of logout
            sessionStorage.clear();
        }
    });
});


function logout() {
    sessionStorage.clear();
    window.location.href = '../Authentication/employee_login.html';
}

