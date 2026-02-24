document.addEventListener('DOMContentLoaded', () => {
    const emp = JSON.parse(localStorage.getItem('currentEmployee'));
    if (!emp) {
        window.location.href = '../Authentication/employee_login.html';
        return;
    }

    document.getElementById('staff-name').textContent = emp.name;

    const btnPunch = document.getElementById('btn-punch');
    const statusDiv = document.getElementById('punch-status');

    // --- Attendance Logic (Fix Task 2) ---
    const today = new Date().toISOString().split('T')[0];
    let attendance = JSON.parse(localStorage.getItem('quadstock_attendance')) || [];

    // Find today's record for this employee
    let dailyRecord = attendance.find(r => r.empId === emp.empId && r.date === today);

    if (!dailyRecord) {
        dailyRecord = { empId: emp.empId, date: today, sessions: [] };
        attendance.push(dailyRecord);
    }

    function updateUI() {
        const lastSession = dailyRecord.sessions[dailyRecord.sessions.length - 1];
        const isClockedIn = lastSession && !lastSession.out;

        if (isClockedIn) {
            btnPunch.textContent = 'Punch Out';
            btnPunch.style.background = '#ef4444';
            statusDiv.textContent = 'Clocked In at ' + new Date(lastSession.in).toLocaleTimeString();
            addActivity('Clocked In', new Date(lastSession.in).toLocaleTimeString());
        } else {
            btnPunch.textContent = 'Punch In';
            btnPunch.style.background = 'var(--primary)';
            statusDiv.textContent = dailyRecord.sessions.length > 0 ? 'Last Punch Out: ' + new Date(lastSession.out).toLocaleTimeString() : '';
            if (lastSession && lastSession.out) {
                addActivity('Clocked Out', new Date(lastSession.out).toLocaleTimeString());
            }
        }
        updateSalesProgress();
        renderActivityFeed();
    }

    // --- Activity Feed Logic ---
    let activities = JSON.parse(localStorage.getItem(`activities_${emp.empId}`)) || [];

    function addActivity(type, time) {
        const activity = { type, time, date: new Date().toLocaleDateString() };
        // Check if already exist to avoid duplicates on refresh
        const exists = activities.some(a => a.type === type && a.time === time && a.date === activity.date);
        if (!exists) {
            activities.unshift(activity);
            if (activities.length > 5) activities.pop(); // Keep last 5
            localStorage.setItem(`activities_${emp.empId}`, JSON.stringify(activities));
        }
    }

    function renderActivityFeed() {
        const feed = document.getElementById('activity-feed');
        if (!feed) return;
        if (activities.length === 0) {
            feed.innerHTML = '<p class="text-sm text-muted">No recent activity recorded.</p>';
            return;
        }
        feed.innerHTML = activities.map(a => `
            <div class="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div class="flex items-center gap-3">
                    <div class="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center text-accent">
                        <i class="fa-solid ${a.type.includes('In') ? 'fa-sign-in-alt' : 'fa-sign-out-alt'}"></i>
                    </div>
                    <div>
                        <p class="text-sm font-semibold">${a.type}</p>
                        <p class="text-xs text-muted">${a.date}</p>
                    </div>
                </div>
                <span class="text-xs font-bold text-accent">${a.time}</span>
            </div>
        `).join('');
    }

    // --- Sales Progress Logic (Mocked) ---
    function updateSalesProgress() {
        const target = 10000;
        const current = 6500; // Mock current sales for demonstration
        const percent = (current / target) * 100;

        const progressBar = document.getElementById('target-progress-bar');
        const targetPercent = document.getElementById('target-percent');
        const currentSales = document.getElementById('current-sales');

        if (progressBar) progressBar.style.width = `${percent}%`;
        if (targetPercent) targetPercent.textContent = `${Math.round(percent)}%`;
        if (currentSales) currentSales.textContent = `₹${current.toLocaleString()}`;
    }

    btnPunch.addEventListener('click', () => {
        const now = new Date().toISOString();
        const lastSession = dailyRecord.sessions[dailyRecord.sessions.length - 1];
        const isClockedIn = lastSession && !lastSession.out;

        if (isClockedIn) {
            lastSession.out = now;
        } else {
            dailyRecord.sessions.push({ in: now, out: null });
        }

        const index = attendance.findIndex(r => r.empId === emp.empId && r.date === today);
        if (index !== -1) attendance[index] = dailyRecord;
        else attendance.push(dailyRecord);

        localStorage.setItem('quadstock_attendance', JSON.stringify(attendance));
        updateUI();
    });

    updateUI();
});

window.logout = () => {
    localStorage.removeItem('activeUser');
    localStorage.removeItem('activeRole');
    localStorage.removeItem('currentEmployee');
    window.location.href = '../Authentication/employee_login.html';
};
