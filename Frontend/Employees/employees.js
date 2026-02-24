
document.addEventListener('DOMContentLoaded', () => {

    // --- 1. Authentication & Context ---
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    const currentEmployee = JSON.parse(localStorage.getItem('currentEmployee'));

    let userRole = 'guest';
    let currentOwnerId = null;
    let addedByRole = null;

    if (currentUser && currentUser.ownerId) {
        userRole = 'owner';
        currentOwnerId = currentUser.ownerId;
        addedByRole = 'owner';
    } else if (currentEmployee && currentEmployee.ownerId) {
        // Fix #3: Secure role fallback - don't promote to manager by default
        userRole = currentEmployee.role || 'staff';
        currentOwnerId = currentEmployee.ownerId;
        addedByRole = 'manager';
    }

    // Fix #2: Stricter access check
    if (!currentOwnerId) {
        QuadModals.alert("Access Denied", "Please login to access the employee management system.", "error")
            .then(() => {
                window.location.href = '../Authentication/employee_login.html';
            });
        return;
    }

    // --- 2. Sidebar & Layout Setup ---
    function renderSidebar(role) {
        const target = document.getElementById('sidebar-target');
        if (!target) return;

        if (role === 'owner') {
            target.innerHTML = `
                <div class="brand">
                    <button id="sidebar-toggle" class="sidebar-toggle" style="background:none; border:none; color:inherit; cursor:pointer;">
                        <i class="fa-solid fa-bars"></i>
                    </button>
                    <h2 class="brand-text">QuadStock</h2>
                </div>
                <nav class="sidebar-menu">
                    <a href="../Ownerdashboard/dashboard.html" class="menu-item" title="Dashboard">
                        <i class="fa-solid fa-house"></i>
                        <span>Dashboard</span>
                    </a>
                    <a href="../Analytics/analytics.html" class="menu-item" title="Analytics">
                        <i class="fa-solid fa-chart-simple"></i>
                        <span>Analytics</span>
                    </a>
                    <a href="../Query/query.html?role=owner" class="menu-item" title="Query">
                        <i class="fa-solid fa-clipboard-question"></i>
                        <span>Query</span>
                    </a>
                    <a href="../Inventory/inventory.html" class="menu-item" title="Inventory">
                        <i class="fa-solid fa-boxes-stacked"></i>
                        <span>Inventory</span>
                    </a>
                    <a href="employees.html" class="menu-item active" title="Employees">
                        <i class="fa-solid fa-users"></i>
                        <span>Employees</span>
                    </a>
                    <a href="../smartexpiry/smartexpiry.html" class="menu-item" title="Smart Expiry">
                        <i class="fa-solid fa-hourglass-end"></i>
                        <span>Smart Expiry</span>
                    </a>
                    <a href="../Complain/complain.html?role=owner" class="menu-item" title="Complain">
                        <i class="fa-solid fa-triangle-exclamation"></i>
                        <span>Complain</span>
                    </a>
                    <a href="../Udhaar/udhaar.html" class="menu-item" title="Pending Payments">
                        <i class="fa-solid fa-indian-rupee-sign"></i>
                        <span>Udhaar/Pending</span>
                    </a>
                    <a href="../Settings/settings.html" class="menu-item" title="Settings">
                        <i class="fa-solid fa-gear"></i>
                        <span>Settings</span>
                    </a>
                    <a href="../landing/landing.html" class="menu-item" title="Logout">
                        <i class="fa-solid fa-right-from-bracket"></i>
                        <span>Logout</span>
                    </a>
                </nav>
                <div class="sidebar-footer-card">
                    <div class="support-illustration">
                        <svg viewBox="0 0 100 100" class="illus-svg">
                            <circle cx="50" cy="35" r="15" fill="#333" />
                            <path d="M20,80 Q50,70 80,80 V100 H20 Z" fill="#333" />
                            <rect x="15" y="45" width="25" height="15" rx="2" fill="#555" transform="rotate(-15 27 52)" />
                        </svg>
                    </div>
                    <a href="../Footer/contact.html" class="btn-support" style="text-decoration: none; display: inline-block; text-align: center;">
                        <i class="fa-regular fa-life-ring"></i> Support
                    </a>
                </div>
            `;
        } else {
            target.innerHTML = `
                <div class="brand">
                    <button id="sidebar-toggle" class="sidebar-toggle" style="background:none; border:none; color:inherit; cursor:pointer;">
                        <i class="fa-solid fa-bars"></i>
                    </button>
                    <h2 class="brand-text">QuadStock</h2>
                </div>
                <div class="nav-section">
                    <h3 class="section-title">Main Menu</h3>
                    <nav class="nav-menu">
                        <a href="../Managerdashboard/manager_dashboard.html" class="nav-item">
                            <i class="fa-solid fa-house-chimney"></i>
                            <span>Dashboard</span>
                        </a>
                        <a href="../Analytics/analytics.html?role=manager" class="nav-item">
                            <i class="fa-solid fa-chart-simple"></i>
                            <span>Analytics</span>
                        </a>
                        <a href="../Query/query.html?role=manager" class="nav-item">
                            <i class="fa-solid fa-clipboard-question"></i>
                            <span>Query</span>
                        </a>
                    </nav>
                </div>
                <div class="nav-section">
                    <h3 class="section-title">Stock & Staff</h3>
                    <nav class="nav-menu">
                        <a href="../Inventory/inventory.html" class="nav-item">
                            <i class="fa-solid fa-boxes-stacked"></i>
                            <span>Inventory</span>
                        </a>
                        <a href="employees.html" class="nav-item active">
                            <i class="fa-solid fa-users"></i>
                            <span>Employees</span>
                        </a>
                        <a href="../smartexpiry/smartexpiry.html?role=manager" class="nav-item">
                            <i class="fa-solid fa-hourglass-end"></i>
                            <span>Smart Expiry</span>
                        </a>
                    </nav>
                </div>
                <div class="nav-section">
                    <h3 class="section-title">Business</h3>
                    <nav class="nav-menu">
                        <a href="../Complain/complain.html?role=manager" class="nav-item">
                            <i class="fa-solid fa-triangle-exclamation"></i>
                            <span>Complain</span>
                        </a>
                        <a href="../Udhaar/udhaar.html" class="nav-item">
                            <i class="fa-solid fa-indian-rupee-sign"></i>
                            <span>Udhaar/Pending</span>
                        </a>
                        <a href="../Settings/settings.html" class="nav-item">
                            <i class="fa-solid fa-gear"></i>
                            <span>Settings</span>
                        </a>
                        <a href="../landing/landing.html" class="nav-item" title="Logout">
                            <i class="fa-solid fa-right-from-bracket"></i>
                            <span>Logout</span>
                        </a>
                    </nav>
                </div>
            `;
        }
    }

    renderSidebar(userRole);

    // Toggle Logic
    const toggle = document.getElementById('sidebar-toggle');
    const container = document.querySelector('.layout-container');
    if (toggle && container) {
        toggle.addEventListener('click', (e) => {
            e.stopPropagation();
            container.classList.toggle('sidebar-collapsed');
        });
    }

    // --- Theme Logic ---
    const themeBtn = document.getElementById('theme-toggle');
    const body = document.body;
    const savedTheme = localStorage.getItem('theme') || 'light';

    // Initial Apply
    if (savedTheme === 'dark') {
        body.setAttribute('data-theme', 'dark');
        if (themeBtn) themeBtn.innerHTML = '<i class="fa-solid fa-sun"></i>';
    } else {
        body.setAttribute('data-theme', 'light');
        if (themeBtn) themeBtn.innerHTML = '<i class="fa-solid fa-moon"></i>';
    }

    if (themeBtn) {
        themeBtn.addEventListener('click', () => {
            const currentTheme = body.getAttribute('data-theme');
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';

            body.setAttribute('data-theme', newTheme);
            localStorage.setItem('theme', newTheme);
            themeBtn.innerHTML = newTheme === 'dark' ? '<i class="fa-solid fa-sun"></i>' : '<i class="fa-solid fa-moon"></i>';
        });
    }

    // --- 3. Data Handling ---
    let employees = JSON.parse(localStorage.getItem('quadstock_employees')) || [];

    // Filter employees for THIS owner
    // Note: If employees don't have ownerId (legacy), we might show them if we can infer, 
    // but strict requirement says "Every employee MUST include ownerId".
    // We will filter by ownerId.
    let ownerEmployees = employees.filter(e => e.ownerId === currentOwnerId);

    const grid = document.getElementById('employee-grid');

    function updateStats() {
        const total = ownerEmployees.length;
        // Logic: 
        // Present = status 'active' or 'working' (if we add that later)
        // Break = status 'break'
        // Absent = status 'offline' or 'leave'
        // Pending = status 'pending' (count as absent for now or ignore? Let's count as absent from work)

        const present = ownerEmployees.filter(e => e.status === 'active' || e.status === 'working').length;
        const onBreak = ownerEmployees.filter(e => e.status === 'break').length;
        const absent = total - present - onBreak;

        document.getElementById('stat-total').textContent = total;
        document.getElementById('stat-present').textContent = present;
        document.getElementById('stat-absent').textContent = absent;
        document.getElementById('stat-break').textContent = onBreak;
    }

    function renderEmployees() {
        grid.innerHTML = '';
        ownerEmployees = employees.filter(e => e.ownerId === currentOwnerId);
        updateStats();

        if (ownerEmployees.length === 0) {
            grid.innerHTML = `<div class="p-8 text-center text-muted col-span-full">No employees found. Add one to get started.</div>`;
            return;
        }

        ownerEmployees.forEach(emp => {
            const card = document.createElement('div');
            card.className = 'employee-card';
            card.dataset.id = emp.empId;

            // Status Logic (Fix #10: Colors)
            let statusClass = 'status-offline';
            let statusText = (emp.status || 'offline').toLowerCase();

            if (statusText === 'active' || statusText === 'working' || statusText === 'present') {
                statusClass = 'status-active'; // Green
            } else if (statusText === 'break') {
                statusClass = 'status-break'; // Yellow
            } else if (statusText === 'holiday' || statusText === 'leave') {
                statusClass = 'status-holiday'; // Blue
            } else if (statusText === 'absent' || statusText === 'offline') {
                statusClass = 'status-absent'; // Red
            } else if (statusText === 'pending') {
                statusClass = 'status-pending'; // Orange
            }

            const avatarHtml = emp.photo
                ? `<img src="${emp.photo}" class="avatar-img" style="width: 48px; height: 48px; border-radius: 12px; object-fit: cover;">`
                : `<div class="avatar">${emp.name.charAt(0).toUpperCase()}</div>`;

            card.innerHTML = `
                <div class="card-header">
                    ${avatarHtml}
                    <div class="emp-info">
                        <h3>${emp.name}</h3>
                        <span class="emp-role">${emp.role}</span>
                    </div>
                </div>
                
                <div class="emp-details">
                    <div class="detail-row">
                        <span class="detail-label">ID</span>
                        <span>${emp.empId}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Phone</span>
                        <span>${emp.phone}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Status</span>
                        <span class="status-badge ${statusClass}">${statusText}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Salary</span>
                        <span class="salary-display">
                            ${userRole === 'owner' ? `₹ ${emp.salary || 0}` : `₹ **** <i class="fa-solid fa-lock" style="font-size:0.7rem; opacity:0.5;"></i>`}
                        </span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Password</span>
                        <div style="display: flex; align-items: center; gap: 0.5rem;">
                            <span class="text-sm text-muted">Password Set ✔</span>
                            <button class="action-btn-sm" onclick="promptChangePassword('${emp.empId}')" title="Reset Password">
                                <i class="fa-solid fa-key"></i> Reset
                            </button>
                        </div>
                    </div>
                </div>

                <div class="card-actions">
                    ${(userRole === 'owner' && emp.status === 'pending') ? `
                        <button class="action-btn btn-approve" title="Approve Employee"><i class="fa-solid fa-check"></i></button>
                    ` : ''}
                    <button class="action-btn btn-change-pass" style="background: var(--bg-light); color: var(--text-dark);" title="Change Password"><i class="fa-solid fa-key"></i></button>
                    <button class="action-btn btn-view-profile" style="background: var(--bg-light); color: var(--primary);" title="View Staff 360"><i class="fa-solid fa-id-card"></i></button>
                    ${userRole === 'owner' ? `
                        <button class="action-btn btn-delete" title="Remove Employee"><i class="fa-solid fa-trash"></i></button>
                    ` : ''}
                </div>
            `;

            // Event Listeners (Fix #7 & #1)
            card.querySelector('.btn-change-pass').addEventListener('click', () => promptChangePassword(emp.empId));
            card.querySelector('.btn-view-profile').addEventListener('click', () => openStaffDetail(emp.empId));

            const btnApprove = card.querySelector('.btn-approve');
            if (btnApprove) btnApprove.addEventListener('click', () => approveEmployee(emp.empId));

            const btnDel = card.querySelector('.btn-delete');
            if (btnDel) btnDel.addEventListener('click', () => deleteEmployee(emp.empId));

            grid.appendChild(card);
        });
    }

    // --- 4. Add Employee Logic ---
    const modal = document.getElementById('modal-overlay');
    const btnAdd = document.getElementById('btn-add-employee');
    const btnCancel = document.getElementById('btn-cancel');
    const form = document.getElementById('add-employee-form');

    // Auto-calculate Hours
    const tStart = document.getElementById('emp-shift-start');
    const tEnd = document.getElementById('emp-shift-end');
    const amStart = document.getElementById('emp-audit-start');
    const amEnd = document.getElementById('emp-audit-end');
    const tHours = document.getElementById('emp-hours');

    function calcHours() {
        if (tStart.value && tEnd.value) {
            // Function to convert 12h time string + AM/PM to Hours (float 0-24)
            const getHours = (timeStr, ampm) => {
                let [h, m] = timeStr.split(':').map(Number);
                if (ampm === 'PM' && h < 12) h += 12;
                if (ampm === 'AM' && h === 12) h = 0;
                return h + (m / 60);
            };

            const startH = getHours(tStart.value, amStart.value);
            const endH = getHours(tEnd.value, amEnd.value);

            let diff = endH - startH;
            if (diff < 0) diff += 24;

            tHours.value = diff.toFixed(1);
        }
    }

    if (tStart && tEnd) {
        tStart.addEventListener('change', calcHours);
        tEnd.addEventListener('change', calcHours);
        amStart.addEventListener('change', calcHours);
        amEnd.addEventListener('change', calcHours);
    }

    btnAdd.addEventListener('click', () => {
        modal.classList.add('active');
    });

    btnCancel.addEventListener('click', () => {
        modal.classList.remove('active');
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        // RBAC Check for Addition
        if (userRole !== 'owner' && userRole !== 'manager') {
            QuadModals.alert("Access Denied", "Only Owners or Managers can add employees.", "error");
            return;
        }

        const name = document.getElementById('emp-name').value;
        const photoInput = document.getElementById('emp-photo');
        const aadhaar = document.getElementById('emp-aadhaar').value;
        const address = document.getElementById('emp-address').value;

        const phone = document.getElementById('emp-phone').value;
        const email = document.getElementById('emp-email').value;
        const emergency = document.getElementById('emp-emergency').value;

        const role = document.getElementById('emp-role').value;
        const salary = document.getElementById('emp-salary').value;

        const shiftStart = document.getElementById('emp-shift-start').value;
        const shiftEnd = document.getElementById('emp-shift-end').value;
        const targetHours = document.getElementById('emp-hours').value;

        const passwordInput = document.getElementById('emp-password').value.trim();
        let finalPassword = passwordInput || "123456";
        const isDefaultPassword = !passwordInput;

        // Process Photo (Compressed for Storage Efficiency)
        let photoData = null;
        if (photoInput.files && photoInput.files[0]) {
            photoData = await new Promise((resolve) => {
                const reader = new FileReader();
                reader.onload = (ev) => {
                    const img = new Image();
                    img.onload = () => {
                        const canvas = document.createElement('canvas');
                        const MAX_WIDTH = 300;
                        const MAX_HEIGHT = 300;
                        let width = img.width;
                        let height = img.height;

                        if (width > height) {
                            if (width > MAX_WIDTH) {
                                height *= MAX_WIDTH / width;
                                width = MAX_WIDTH;
                            }
                        } else {
                            if (height > MAX_HEIGHT) {
                                width *= MAX_HEIGHT / height;
                                height = MAX_HEIGHT;
                            }
                        }
                        canvas.width = width;
                        canvas.height = height;
                        const ctx = canvas.getContext('2d');
                        ctx.drawImage(img, 0, 0, width, height);
                        resolve(canvas.toDataURL('image/jpeg', 0.5));
                    };
                    img.src = ev.target.result;
                };
                reader.readAsDataURL(photoInput.files[0]);
            });
        }

        // 1. Generate ID (Verified Unique)
        let empId;
        let idCounter = ownerEmployees.length + 1;
        let loopSafety = 0;
        const ownerPrefix = currentOwnerId || 'UNKNOWN';

        do {
            empId = `EMP-${ownerPrefix}-${String(idCounter).padStart(3, '0')}`;
            idCounter++;
            loopSafety++;
            if (loopSafety > 200) { alert('Error generating unique ID. Please contact support.'); return; }
        } while (employees.some(e => e.empId === empId));

        // 2. Determine Status
        const initialStatus = (userRole === 'owner') ? 'offline' : 'pending';

        // 3. Create Object
        const newEmployee = {
            empId: empId,
            ownerId: currentOwnerId,
            name: name,
            photo: photoData,
            aadhaar: aadhaar,
            address: address,

            phone: phone,
            email: email,
            emergency: emergency,

            // Fix #15: Store password as base64 but keep it protected
            password: btoa(finalPassword),
            requiresPasswordChange: isDefaultPassword,

            role: role,
            salary: salary,
            shiftStart: `${shiftStart} ${document.getElementById('emp-audit-start').value}`,
            shiftEnd: `${shiftEnd} ${document.getElementById('emp-audit-end').value}`,
            targetHours: targetHours,

            status: initialStatus,
            addedBy: addedByRole,
            joinedDate: new Date().toISOString()
        };

        // 4. Save
        employees.push(newEmployee);
        localStorage.setItem('quadstock_employees', JSON.stringify(employees));

        // 5. Reset & Render
        form.reset();
        modal.classList.remove('active');
        renderEmployees();

        QuadModals.showToast(`Employee Added! ID: ${empId}`, 'success');
    });

    // --- 5. Global Actions (Approve/Delete) ---
    // Attach to window for onclick access
    window.approveEmployee = (id) => {
        if (userRole !== 'owner') {
            QuadModals.alert("Access Denied", "Only the shop owner can approve employees.", "error");
            return;
        }

        const emp = employees.find(e => e.empId === id);
        if (emp && emp.ownerId === currentOwnerId) {
            emp.status = 'offline'; // Approved!
            localStorage.setItem('quadstock_employees', JSON.stringify(employees));
            renderEmployees();
            QuadModals.showToast(`Employee ${emp.name} Approved!`, 'success');
        }
    };

    window.deleteEmployee = async (id) => {
        const confirmed = await QuadModals.confirm(
            "Remove Employee",
            "Are you sure you want to remove this employee? This action cannot be undone.",
            { isDanger: true, confirmText: 'Remove' }
        );

        if (userRole !== 'owner') {
            QuadModals.alert("Access Denied", "Only the shop owner can remove employees.", "error");
            return;
        }

        if (!confirmed) return;

        // Secure Delete: Only remove if ID matches AND belongs to current owner
        employees = employees.filter(e => !(e.empId === id && e.ownerId === currentOwnerId));

        localStorage.setItem('quadstock_employees', JSON.stringify(employees));
        renderEmployees();
        QuadModals.showToast("Employee removed successfully", 'info');
    };

    // (Password display logic removed for security)

    window.promptChangePassword = async (id) => {
        const newPass = await QuadModals.prompt(
            "Change Password",
            "Enter new login password for this employee:"
        );

        if (newPass) {
            const emp = employees.find(e => e.empId === id && e.ownerId === currentOwnerId);
            if (emp) {
                emp.password = btoa(newPass);
                emp.requiresPasswordChange = false;
                localStorage.setItem('quadstock_employees', JSON.stringify(employees));
                renderEmployees();
                QuadModals.showToast("Password updated successfully!", 'success');
            }
        }
    };

    // Init
    renderEmployees();

    // --- 6. Secure Data Handler (Real Architecture) ---
    const handleStaffUpdate = (updatedEmp) => {
        // Find in GLOBAL list using ID + Owner Check for safety
        const globalIndex = employees.findIndex(e => e.empId === updatedEmp.empId && e.ownerId === currentOwnerId);

        if (globalIndex === -1) {
            QuadModals.showToast("Error: Employee record not found in global database.", 'error');
            return;
        }

        // Merge updates securely
        employees[globalIndex] = { ...employees[globalIndex], ...updatedEmp };

        // Save Global
        localStorage.setItem('quadstock_employees', JSON.stringify(employees));

        // Refresh UI
        renderEmployees();
        QuadModals.showToast("Employee details updated successfully!", 'success');
    };

    // Initialize Staff 360 Detail Logic (Securely)
    if (typeof initStaffDetails === 'function') {
        // Fix: Pass as a getter function so reference stays fresh
        initStaffDetails(() => ownerEmployees, currentOwnerId, handleStaffUpdate, userRole);
    }
});
