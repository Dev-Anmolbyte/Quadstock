
document.addEventListener('DOMContentLoaded', () => {
    // --- RBAC & Initialization ---
    const currentUser = JSON.parse(localStorage.getItem('currentUser')); // Owner
    const currentEmployee = JSON.parse(localStorage.getItem('currentEmployee')); // Manager/Staff

    let userRole = 'staff';
    if (currentUser) userRole = 'owner';
    else if (currentEmployee && currentEmployee.role === 'manager') userRole = 'manager';

    // Redirect if staff tries to access this page
    if (userRole === 'staff') {
        alert('Access Denied. Redirecting to Staff Dashboard.');
        window.location.href = 'staff_dashboard.html';
        return;
    }

    // --- Mock Data Initialization (If empty) ---
    let employees = JSON.parse(localStorage.getItem('quadstock_employees') || '[]');
    if (employees.length === 0) {
        // Seed some data for demo
        employees = [
            { empId: 'EMP-1001', name: 'Ramesh Kumar', role: 'manager', shiftStart: '09:00', shiftEnd: '18:00', status: 'active', salary: 25000, phone: '9876543210', email: 'ramesh@shop.com', password: 'password123' },
            { empId: 'EMP-1002', name: 'Suresh Singh', role: 'staff', shiftStart: '10:00', shiftEnd: '19:00', status: 'offline', salary: 15000, phone: '8765432109', email: 'suresh@shop.com', password: 'password123' },
            { empId: 'EMP-1003', name: 'Anita Desai', role: 'staff', shiftStart: '09:00', shiftEnd: '18:00', status: 'pending', salary: 18000, phone: '7654321098', email: 'anita@shop.com', password: 'password123' },
            { empId: 'EMP-1004', name: 'Vikram Malhotra', role: 'staff', shiftStart: '14:00', shiftEnd: '22:00', status: 'pending', salary: 16000, phone: '6543210987', email: 'vikram@shop.com', password: 'password123' }
        ];
        localStorage.setItem('quadstock_employees', JSON.stringify(employees));
    }

    // --- Module 2: The Employee Directory ---
    renderPendingAlert(employees, userRole);
    renderEmployeeTable(employees, userRole);

    // --- Event Listeners ---
    document.getElementById('add-employee-btn').addEventListener('click', openAddEmployeeModal);
    document.querySelector('.close-drawer').addEventListener('click', closeAddEmployeeModal);
    document.querySelector('.close-profile').addEventListener('click', closeProfileModal);

    // Form Submission
    document.getElementById('add-employee-form').addEventListener('submit', handleAddEmployee);

    // Sidebar Toggle (Mobile)
    // Sidebar Toggle (Match Dashboard Logic)
    const sidebarToggle = document.getElementById('sidebar-toggle');
    const dashboardContainer = document.querySelector('.dashboard-container');

    if (sidebarToggle && dashboardContainer) {
        sidebarToggle.addEventListener('click', () => {
            document.getElementById('sidebar').classList.toggle('active'); // Mobile specific
            dashboardContainer.classList.toggle('sidebar-collapsed'); // Desktop specific
        });
    }
});

// --- Render Functions ---

function renderPendingAlert(employees, userRole) {
    const alertContainer = document.getElementById('pending-alert-container');
    if (userRole !== 'owner') {
        alertContainer.style.display = 'none';
        return;
    }

    const pendingCount = employees.filter(e => e.status === 'pending').length;
    if (pendingCount > 0) {
        alertContainer.innerHTML = `
            <div class="pending-alert">
                <i class="fa-solid fa-circle-exclamation"></i>
                <span><strong>⚠️ Action Required:</strong> You have ${pendingCount} new employees pending approval.</span>
                <button class="btn-warning alert-btn" onclick="filterPending()">Review Now</button>
            </div>
        `;
        alertContainer.style.display = 'block';
    } else {
        alertContainer.style.display = 'none';
    }
}

function renderEmployeeTable(employees, userRole) {
    const tableBody = document.getElementById('employee-table-body');
    tableBody.innerHTML = '';

    employees.forEach(emp => {
        const isOnline = emp.status === 'active';
        const statusClass = isOnline ? 'status-active' : (emp.status === 'pending' ? 'status-pending' : 'status-offline');
        const statusColor = isOnline ? '#22c55e' : (emp.status === 'pending' ? '#eab308' : '#cbd5e1'); // Green, Yellow, Gray

        // Actions
        let actions = `
            <button class="action-btn" onclick="viewProfile('${emp.empId}')" title="View Profile"><i class="fa-regular fa-eye"></i></button>
        `;

        // Edit Button Logic
        if (userRole === 'owner' || (userRole === 'manager' && emp.role === 'staff')) {
            actions += `<button class="action-btn" onclick="editEmployee('${emp.empId}')" title="Edit"><i class="fa-regular fa-pen-to-square"></i></button>`;
        }

        // Approve Button (Owner Only for Pending)
        if (userRole === 'owner' && emp.status === 'pending') {
            actions += `<button class="action-btn" style="color:#16a34a; border-color:#16a34a;" onclick="approveEmployee('${emp.empId}')" title="Approve"><i class="fa-solid fa-check"></i></button>`;
        }

        const row = document.createElement('tr');
        row.innerHTML = `
            <td><span style="font-family:monospace; font-weight:600; color:#475569;">${emp.empId}</span></td>
            <td>
                <div style="display:flex; align-items:center;">
                    <span class="status-dot" style="background:${statusColor}; box-shadow: ${isOnline ? '0 0 0 2px rgba(34, 197, 94, 0.2)' : 'none'}"></span>
                    <span style="font-weight:500;">${emp.name}</span>
                </div>
            </td>
            <td><span class="badge ${emp.role}">${emp.role.charAt(0).toUpperCase() + emp.role.slice(1)}</span></td>
            <td>${emp.shiftStart} - ${emp.shiftEnd}</td>
            <td>${actions}</td>
        `;
        tableBody.appendChild(row);
    });
}

// --- Modal Functions ---

function openAddEmployeeModal() {
    document.getElementById('add-modal-overlay').classList.add('active');

    // Generate Next ID
    const employees = JSON.parse(localStorage.getItem('quadstock_employees') || '[]');
    const lastId = employees.length > 0 ? parseInt(employees[employees.length - 1].empId.split('-')[1]) : 1000;
    document.getElementById('new-emp-id').value = `EMP-${lastId + 1}`;

    // Check Role for Privacy Section visibility
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    const privacySection = document.getElementById('privacy-section');
    if (!currentUser) {
        // Manager
        if (privacySection) privacySection.style.display = 'none';
        // Restrict Role to Staff only
        const roleSelect = document.getElementById('new-role');
        if (roleSelect) {
            roleSelect.value = 'staff';
            roleSelect.disabled = true; // Manager can only add Staff
        }
    } else {
        // Owner
        if (privacySection) privacySection.style.display = 'block';
        const roleSelect = document.getElementById('new-role');
        if (roleSelect) roleSelect.disabled = false;
    }
}

function closeAddEmployeeModal() {
    document.getElementById('add-modal-overlay').classList.remove('active');
}

function handleAddEmployee(e) {
    e.preventDefault();

    const empId = document.getElementById('new-emp-id').value;
    const name = document.getElementById('new-name').value;
    const email = document.getElementById('new-email').value;
    const phone = document.getElementById('new-phone').value;

    let roleElement = document.getElementById('new-role');
    let role = roleElement.value;

    const salary = document.getElementById('new-salary').value;
    const shiftStart = document.getElementById('new-shift-start').value;
    const shiftEnd = document.getElementById('new-shift-end').value;

    const address = document.getElementById('new-address').value; // Module 3
    const targetHours = document.getElementById('new-target-hours').value || 8; // Module 3

    // Module 3: Privacy
    const privacyCheckbox = document.getElementById('allow-manager-view');
    const privacyAllowed = privacyCheckbox ? privacyCheckbox.checked : true;

    // Determine Status
    const currentUser = JSON.parse(localStorage.getItem('currentUser')); // Owner exists?
    const status = currentUser ? 'offline' : 'pending'; // Owner -> Approved (offline), Manager -> Pending

    if (!currentUser) {
        role = 'staff'; // Enforce
    }

    const newEmp = {
        empId, name, email, phone, role, salary, shiftStart, shiftEnd,
        address, targetHours, privacyAllowed,
        status: status,
        password: 'password123', // Default password
        joinedDate: new Date().toISOString().split('T')[0]
    };

    const employees = JSON.parse(localStorage.getItem('quadstock_employees') || '[]');
    employees.push(newEmp);
    localStorage.setItem('quadstock_employees', JSON.stringify(employees));

    alert(currentUser ? 'Employee Added Successfully!' : 'Employee added and sent for Owner Approval.');
    closeAddEmployeeModal();

    // Re-render (pass role)
    const renderRole = currentUser ? 'owner' : 'manager';
    renderEmployeeTable(employees, renderRole);
    renderPendingAlert(employees, renderRole);
}

// --- 360 Profile Logic ---

window.viewProfile = function (empId) {
    const employees = JSON.parse(localStorage.getItem('quadstock_employees') || '[]');
    const emp = employees.find(e => e.empId === empId);

    if (!emp) return;

    // Populate Data
    document.getElementById('profile-emp-id').innerText = emp.empId;
    document.getElementById('profile-name').innerText = emp.name;
    document.getElementById('profile-role').innerText = emp.role.toUpperCase();

    // Show Modal
    // Show Modal
    document.getElementById('profile-modal-overlay').classList.add('active');

    // Tab 1: Profile & Identity (RBAC Padlock)
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    const isOwner = !!currentUser;
    const canViewSensitive = isOwner || emp.privacyAllowed;

    // Module 4: Change Role Button (Defect 4.2)
    const actionContainer = document.getElementById('role-action-container');
    if (actionContainer) {
        if (isOwner && emp.role !== 'owner') {
            const actionText = emp.role === 'manager' ? 'Demote to Staff' : 'Promote to Manager';
            const btnClass = emp.role === 'manager' ? 'btn-danger' : 'btn-success';
            const btnStyle = emp.role === 'manager' ? 'background:#ef4444; color:white;' : 'background:#16a34a; color:white;';

            actionContainer.innerHTML = `<button onclick="toggleRole('${emp.empId}')" style="margin-top:1rem; padding:0.5rem 1rem; border:none; border-radius:0.5rem; cursor:pointer; font-size:0.85rem; ${btnStyle}">${actionText}</button>`;
        } else {
            actionContainer.innerHTML = '';
        }
    }



    const sensitiveFieldStyle = canViewSensitive ? '' : 'filter: blur(6px); user-select: none; pointer-events: none; opacity: 0.6;';
    const lockIcon = canViewSensitive ? '' : '<i class="fa-solid fa-lock" style="color:#64748b; margin-left:8px;" title="Restricted Access"></i>';

    const emailEl = document.getElementById('view-email');
    emailEl.innerHTML = canViewSensitive ? `<span>${emp.email}</span>` : `<span>****@****.com</span> ${lockIcon}`;
    emailEl.style = 'font-weight:600;';

    const phoneEl = document.getElementById('view-phone');
    phoneEl.innerHTML = canViewSensitive ? `<span>${emp.phone}</span>` : `<span>+91 **********</span> ${lockIcon}`;
    phoneEl.style = 'font-weight:600;';

    const salaryEl = document.getElementById('view-salary');
    salaryEl.innerHTML = canViewSensitive ? `<span>₹ ${emp.salary}</span>` : `<span>₹ *****</span> ${lockIcon}`;
    salaryEl.style = canViewSensitive ? 'font-weight:600; color:#16a34a;' : 'font-weight:600; color:#64748b;';

    // Module 4: Render Tabs
    renderTimesheet(emp);
    renderSales(emp);

    // Activate Tab 1 by default
    switchTab('tab-1');
};

// --- Module 4: Timesheet Engine ---
// --- Module 4: Timesheet Engine (Updated for v2 Multi-Punch) ---
function renderTimesheet(emp) {
    const tableBody = document.getElementById('timesheet-body');
    tableBody.innerHTML = '';

    const attendance = JSON.parse(localStorage.getItem('quadstock_attendance_v2') || '[]');
    // Sort desc by date
    const empRecords = attendance.filter(r => r.empId === emp.empId).sort((a, b) => new Date(b.date) - new Date(a.date));

    if (empRecords.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:1rem; color:#94a3b8;">No attendance records found.</td></tr>';
        return;
    }

    const target = emp.targetHours || 8;

    empRecords.forEach(record => {
        const sessions = record.sessions || [];

        // Calculate Total Duration
        let totalMs = 0;
        let firstIn = '-';
        let lastOut = '-';

        if (sessions.length > 0) {
            firstIn = new Date(sessions[0].in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

            sessions.forEach(s => {
                if (s.out && s.in) totalMs += (s.out - s.in);
            });

            const lastSession = sessions[sessions.length - 1];
            if (lastSession.out) {
                lastOut = new Date(lastSession.out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            } else {
                lastOut = '<span style="color:#eab308">Active</span>';
            }
        }

        const durationHrs = (totalMs / (1000 * 60 * 60));
        const hrs = Math.floor(durationHrs);
        const mins = Math.round((durationHrs - hrs) * 60);
        const hoursDisplay = `${hrs}h ${mins}m`;

        // Smart Badge
        let statusBadge = '<span class="badge" style="background:#f1f5f9; color:#64748b;">Ongoing</span>';
        if (sessions.length > 0 && sessions[sessions.length - 1].out) {
            if (durationHrs >= target) {
                statusBadge = '<span class="badge" style="background:#f0fdf4; color:#16a34a; border:1px solid #bbf7d0;">Goal Met</span>';
            } else {
                statusBadge = '<span class="badge" style="background:#fef2f2; color:#ef4444; border:1px solid #fecaca;">Short</span>';
            }
        }

        const row = document.createElement('tr');
        row.innerHTML = `
            <td style="padding:0.75rem; border-bottom:1px solid #f1f5f9; font-size:0.9rem;">${record.date}</td>
            <td style="padding:0.75rem; border-bottom:1px solid #f1f5f9; font-family:monospace;">${firstIn}</td>
            <td style="padding:0.75rem; border-bottom:1px solid #f1f5f9; font-family:monospace;">${lastOut}</td>
            <td style="padding:0.75rem; border-bottom:1px solid #f1f5f9; font-weight:600;">${hoursDisplay}</td>
            <td style="padding:0.75rem; border-bottom:1px solid #f1f5f9;">${statusBadge}</td>
        `;
        tableBody.appendChild(row);
    });
}

function formatTimeForDisplay(val) {
    if (!val) return { display: '-', raw: null };
    // If it's a number (timestamp)
    if (typeof val === 'number') {
        return { display: new Date(val).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), raw: val };
    }
    // If it's a legacy string (Module 5 migration fallback)
    return { display: val, raw: null };
}

// --- Module 4: Sales Performance (Mock) ---
function renderSales(emp) {
    const tableBody = document.getElementById('sales-body');
    const revEl = document.getElementById('sales-revenue');
    const countEl = document.getElementById('sales-count');

    // Mock Data Generator
    // logic: randomly generate 2-3 sales for demo
    tableBody.innerHTML = '';

    // Check if sales data exists (Mocking for now as no quadstock_sales required in prompt)
    // We will simulate data based on EmpID
    const seed = emp.empId.charCodeAt(emp.empId.length - 1);
    const isSalesRole = true;

    if (!isSalesRole) {
        tableBody.innerHTML = '<tr><td colspan="2" style="text-align:center;">No sales data.</td></tr>';
        return;
    }

    const items = [
        { name: 'Wireless Mouse', price: 450 },
        { name: 'Mechanical Keyboard', price: 2500 },
        { name: 'USB-C Hub', price: 1200 },
        { name: 'Monitor Stand', price: 800 }
    ];

    let totalRev = 0;
    let totalItems = 0;

    // Generate 3 random sales
    for (let i = 0; i < 3; i++) {
        const item = items[(seed + i) % items.length];
        const row = document.createElement('tr');
        row.innerHTML = `
            <td style="padding:0.75rem; border-bottom:1px solid #f1f5f9; font-size:0.9rem;">
                <div style="font-weight:500; color:#334155;">${item.name}</div>
                <div style="font-size:0.75rem; color:#94a3b8;">INV-${1000 + i}</div>
            </td>
            <td style="padding:0.75rem; border-bottom:1px solid #f1f5f9; text-align:right; font-weight:600; color:#0f172a;">₹ ${item.price}</td>
        `;
        tableBody.appendChild(row);
        totalRev += item.price;
        totalItems++;
    }

    revEl.innerText = `₹ ${totalRev}`;
    countEl.innerText = totalItems;



}

window.closeProfileModal = function () {
    document.getElementById('profile-modal-overlay').classList.remove('active');
};

window.switchTab = function (tabId) {
    // Hide all
    document.querySelectorAll('.tab-content').forEach(el => el.style.display = 'none');
    document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));

    // Show selected
    document.getElementById(tabId).style.display = 'block';

    // Find button
    const btn = Array.from(document.querySelectorAll('.tab-btn')).find(b => b.getAttribute('onclick').includes(tabId));
    if (btn) btn.classList.add('active');
};

// Expose filter pending for button
window.filterPending = function () {
    // Simple alert for now
    alert("Filtering pending employees... (Implementation note: This would update the table filter)");
};

window.approveEmployee = function (empId) {
    const employees = JSON.parse(localStorage.getItem('quadstock_employees') || '[]');
    const empIndex = employees.findIndex(e => e.empId === empId);
    if (empIndex > -1) {
        employees[empIndex].status = 'offline'; // Approved (but offline initially)
        localStorage.setItem('quadstock_employees', JSON.stringify(employees));
        renderEmployeeTable(employees, 'owner');
        renderPendingAlert(employees, 'owner');
    }
}

window.toggleRole = function (empId) {
    const employees = JSON.parse(localStorage.getItem('quadstock_employees') || '[]');
    const index = employees.findIndex(e => e.empId === empId);
    if (index > -1) {
        // Toggle Role
        const currentRole = employees[index].role;
        const newRole = currentRole === 'manager' ? 'staff' : 'manager';

        employees[index].role = newRole;
        localStorage.setItem('quadstock_employees', JSON.stringify(employees));

        // Update UI
        document.getElementById('profile-role').innerText = newRole.toUpperCase();
        viewProfile(empId); // Refresh modal logic

        // Refresh Table logic behind modal
        renderEmployeeTable(employees, 'owner');

        alert(`Role updated to ${newRole.toUpperCase()}`);
    }
};

window.logout = function () {
    const currentUser = localStorage.getItem('currentUser');
    const currentEmployee = localStorage.getItem('currentEmployee');

    // Clear Session
    localStorage.removeItem('currentUser');
    localStorage.removeItem('currentEmployee');

    // Redirect
    if (currentUser) {
        window.location.href = '../Authentication/owner_login.html';
    } else {
        window.location.href = '../Authentication/employee_login.html';
    }
};
