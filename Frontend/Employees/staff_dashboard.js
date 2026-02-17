
document.addEventListener('DOMContentLoaded', () => {
    // --- Auth Check ---
    const currentEmployee = JSON.parse(localStorage.getItem('currentEmployee'));
    if (!currentEmployee) {
        alert('Please Login First');
        window.location.href = '../authentication/employee_login.html';
        return;
    }

    // --- Welcome Message ---
    document.getElementById('welcome-msg').innerText = `Welcome, ${currentEmployee.name || 'Employee'}`;

    // --- Live Clock ---
    updateClock();
    setInterval(updateClock, 1000);

    // --- Punch Logic ---
    // --- Punch Logic (Multi-Punch Support) ---
    const punchBtn = document.getElementById('punch-btn');
    const punchStatus = document.getElementById('punch-status');
    const todayStr = new Date().toISOString().split('T')[0];

    // Determine State from Attendance Array
    // Structure: { empId, date, sessions: [{in: ts, out: ts}, ...] }
    function getTodayRecord() {
        const attendance = JSON.parse(localStorage.getItem('quadstock_attendance_v2') || '[]');
        return attendance.find(r => r.empId === currentEmployee.empId && r.date === todayStr);
    }

    function determineState() {
        const record = getTodayRecord();
        if (!record) return 'offline';

        const lastSession = record.sessions[record.sessions.length - 1];
        if (lastSession && !lastSession.out) return 'online';
        return 'offline'; // Either no sessions or last session completed
    }

    let state = determineState();
    renderPunchState(state);

    punchBtn.addEventListener('click', () => {
        const now = new Date();
        const timestamp = now.getTime();
        const timeDisplay = now.toLocaleTimeString();

        let attendance = JSON.parse(localStorage.getItem('quadstock_attendance_v2') || '[]');
        let recordIndex = attendance.findIndex(r => r.empId === currentEmployee.empId && r.date === todayStr);

        if (state === 'offline') {
            // PUNCH IN
            if (recordIndex === -1) {
                // New Day Record
                attendance.push({
                    empId: currentEmployee.empId,
                    date: todayStr,
                    sessions: [{ in: timestamp, out: null }]
                });
            } else {
                // Append New Session
                const record = attendance[recordIndex];
                if (!record.sessions) record.sessions = [];
                attendance[recordIndex].sessions.push({ in: timestamp, out: null });
            }
            state = 'online';
            updateEmployeeStatus(currentEmployee.empId, 'active'); // Update Global Status
            alert(`Punched In at ${timeDisplay}`);
        } else {
            // PUNCH OUT
            if (recordIndex > -1) {
                const sessions = attendance[recordIndex].sessions;
                if (sessions && sessions.length > 0) {
                    sessions[sessions.length - 1].out = timestamp;
                }
            }
            state = 'offline';
            updateEmployeeStatus(currentEmployee.empId, 'offline'); // Update Global Status
            alert(`Punched Out at ${timeDisplay}`);
        }

        localStorage.setItem('quadstock_attendance_v2', JSON.stringify(attendance));
        renderPunchState(state);
    });

    function renderPunchState(currentState) {
        punchBtn.className = 'punch-btn'; // Reset
        punchBtn.disabled = false;

        if (currentState === 'offline') {
            punchBtn.classList.add('punch-in');
            punchBtn.innerHTML = '<i class="fa-solid fa-fingerprint"></i> PUNCH IN';
            punchBtn.style.background = '#16a34a';
            punchBtn.style.color = 'white';
            punchBtn.style.boxShadow = '';

            // Calculate total hours worked so far
            const record = getTodayRecord();
            if (record && record.sessions) {
                const totalMs = record.sessions.reduce((acc, s) => acc + ((s.out || 0) - s.in), 0); // Only completed sessions count roughly
                // If last session is open, it's not counted in 'completed' duration til closed
                if (totalMs > 0) {
                    const hrs = (totalMs / (1000 * 60 * 60)).toFixed(1);
                    punchStatus.innerHTML = `Currently <strong>Offline</strong>. Worked: ${hrs} hrs today.`;
                } else {
                    punchStatus.innerHTML = 'You are currently <strong>Offline</strong>.';
                }
            } else {
                punchStatus.innerHTML = 'You are currently <strong>Offline</strong>.';
            }

        } else {
            punchBtn.classList.add('punch-out');
            punchBtn.innerHTML = '<i class="fa-solid fa-stop"></i> PUNCH OUT';
            punchBtn.style.background = '#ef4444';
            punchBtn.style.color = 'white';
            punchStatus.innerHTML = 'You are currently <strong>Online</strong>.';
        }
    }

    function updateEmployeeStatus(empId, status) {
        const employees = JSON.parse(localStorage.getItem('quadstock_employees') || '[]');
        const idx = employees.findIndex(e => e.empId === empId);
        if (idx > -1) {
            employees[idx].status = status;
            localStorage.setItem('quadstock_employees', JSON.stringify(employees));
        }
    }

    function updateClock() {
        const now = new Date();
        document.getElementById('live-clock').innerText = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        document.getElementById('current-date').innerText = now.toLocaleDateString(undefined, options);
    }
});

window.logout = function () {
    localStorage.removeItem('currentEmployee');
    window.location.href = '../authentication/employee_login.html';
};
