/**
 * staff_details.js - Handles the "Staff 360" modal with real backend integration
 */

let CURRENT_EMP = null;
let API_CONFIG = { base: '', headers: {} };
let currentViewDate = new Date();

function initStaffDetails(apiBase, headers, userRole) {
    API_CONFIG.base = apiBase;
    API_CONFIG.headers = headers;
    
    const modal = document.getElementById('details-modal-overlay');
    if (!modal) return;

    const closeBtn = document.getElementById('close-details-btn');
    const saveBtn = document.getElementById('btn-save-details');
    const tabs = modal.querySelectorAll('.section-tab-header');
    const sections = modal.querySelectorAll('.detail-section-col');
    const prevMonthBtn = document.getElementById('prev-month');
    const nextMonthBtn = document.getElementById('next-month');

    // Tab switching logic
    const switchTab = (tabIndex) => {
        tabs.forEach((t, idx) => {
            if (idx === tabIndex) t.classList.add('active');
            else t.classList.remove('active');
        });
        sections.forEach((s, idx) => {
            if (idx === tabIndex) s.classList.add('active');
            else s.classList.remove('active');
        });
    };

    tabs.forEach((tab, index) => {
        tab.onclick = () => switchTab(index);
    });

    if (closeBtn) closeBtn.onclick = () => modal.classList.remove('active');
    
    if (prevMonthBtn) prevMonthBtn.onclick = () => { currentViewDate.setMonth(currentViewDate.getMonth() - 1); renderAttendance(); };
    if (nextMonthBtn) nextMonthBtn.onclick = () => { currentViewDate.setMonth(currentViewDate.getMonth() + 1); renderAttendance(); };

    // Export function to global scope
    window.showStaffDetails = async (employee) => {
        CURRENT_EMP = employee;
        modal.classList.add('active');
        switchTab(0);
        
        // Populate profile
        document.getElementById('detail-header-name').textContent = employee.name;
        document.getElementById('detail-header-id').textContent = employee.username;
        document.getElementById('detail-header-role').textContent = employee.role;
        
        const avatarContainer = document.getElementById('detail-header-initial');
        if (employee.photo) {
            avatarContainer.innerHTML = `<img src="${employee.photo}" style="width:100%; height:100%; object-fit:cover;">`;
        } else {
            avatarContainer.textContent = employee.name.charAt(0).toUpperCase();
        }

        document.getElementById('edit-name').value = employee.name;
        document.getElementById('edit-phone').value = employee.phoneNumber || '';
        document.getElementById('edit-email').value = employee.email;
        document.getElementById('edit-aadhaar').value = employee.aadhaar || '';
        document.getElementById('edit-role').value = employee.role;
        document.getElementById('edit-salary').value = employee.salary || 0;
        document.getElementById('edit-address').value = employee.address || '';

        // Role restriction for salary
        const salaryGroup = document.getElementById('edit-salary').parentElement;
        if (userRole !== 'owner' && salaryGroup) salaryGroup.style.display = 'none';

        // Load other data
        renderAttendance();
        renderSales();
        renderLeaves();

        // Update Action Section state
        if (roleSelect) roleSelect.value = employee.role;
        if (btnBlock) {
            const isBlocked = employee.status === 'offline';
            btnBlock.querySelector('span').textContent = isBlocked ? 'Unblock Access' : 'Block Access';
        }
    };

    // --- Action Buttons ---
    const btnUpdateRole = document.getElementById('btn-update-role-modal');
    const roleSelect = document.getElementById('modal-role-select');
    const btnBlock = document.getElementById('btn-block-employee-modal');
    const btnDelete = document.getElementById('btn-delete-employee-modal');
    const btnActionPayslip = document.getElementById('btn-generate-payslip-action');
    const btnProfilePayslip = document.getElementById('btn-generate-payslip');
    const btnManageLeave = document.getElementById('btn-manage-leave');

    if (btnUpdateRole) {
        btnUpdateRole.onclick = async () => {
            const newRole = roleSelect.value;
            try {
                const res = await fetch(`${API_CONFIG.base}/employees/${CURRENT_EMP._id}`, {
                    method: 'PATCH',
                    headers: API_CONFIG.headers,
                    body: JSON.stringify({ role: newRole })
                });
                const result = await res.json();
                if (result.success) {
                    QuadModals.showToast("Role updated", "success");
                    if (window.refreshEmployeeList) window.refreshEmployeeList();
                }
            } catch (err) { console.error(err); }
        };
    }

    if (btnBlock) {
        btnBlock.onclick = async () => {
            const isBlocked = CURRENT_EMP.status === 'offline';
            const newStatus = isBlocked ? 'active' : 'offline';
            try {
                const res = await fetch(`${API_CONFIG.base}/employees/${CURRENT_EMP._id}`, {
                    method: 'PATCH',
                    headers: API_CONFIG.headers,
                    body: JSON.stringify({ status: newStatus })
                });
                const result = await res.json();
                if (result.success) {
                    CURRENT_EMP.status = newStatus;
                    btnBlock.querySelector('span').textContent = newStatus === 'offline' ? 'Unblock Access' : 'Block Access';
                    QuadModals.showToast(newStatus === 'offline' ? "Access Blocked" : "Access Restored", "info");
                    if (window.refreshEmployeeList) window.refreshEmployeeList();
                }
            } catch (err) { console.error(err); }
        };
    }

    if (btnDelete) {
        btnDelete.onclick = async () => {
            const confirmed = await QuadModals.confirm("Delete Employee", "Permanent action. Are you sure?", { isDanger: true });
            if (!confirmed) return;
            try {
                const res = await fetch(`${API_CONFIG.base}/employees/${CURRENT_EMP._id}`, {
                    method: 'DELETE',
                    headers: API_CONFIG.headers
                });
                const result = await res.json();
                if (result.success) {
                    QuadModals.showToast("Employee deleted", "success");
                    modal.classList.remove('active');
                    if (window.refreshEmployeeList) window.refreshEmployeeList();
                }
            } catch (err) { console.error(err); }
        };
    }

    if (btnActionPayslip) {
        btnActionPayslip.onclick = () => generatePayslipAction();
    }
    if (btnProfilePayslip) {
        btnProfilePayslip.onclick = () => generatePayslipAction();
    }

    async function generatePayslipAction() {
        const month = new Date().toISOString().slice(0, 7);
        try {
            const res = await fetch(`${API_CONFIG.base}/payslips/generate`, {
                method: 'POST',
                headers: API_CONFIG.headers,
                body: JSON.stringify({
                    employeeId: CURRENT_EMP._id,
                    month,
                    basicSalary: CURRENT_EMP.salary,
                    allowances: 0,
                    deductions: 0
                })
            });
            const result = await res.json();
            if (result.success) {
                QuadModals.showToast("Payslip generated successfully!", "success");
            } else {
                QuadModals.showToast(result.message || "Generation failed", "error");
            }
        } catch (err) {
            console.error(err);
            QuadModals.showToast("Network error during payslip generation", "error");
        }
    }

    if (btnManageLeave) {
        btnManageLeave.onclick = () => switchTab(3); // Leaves Tab
    }

    // Save Logic
    if (saveBtn) {

        saveBtn.onclick = async () => {
            const formData = {
                name: document.getElementById('edit-name').value,
                phoneNumber: document.getElementById('edit-phone').value,
                email: document.getElementById('edit-email').value,
                aadhaar: document.getElementById('edit-aadhaar').value,
                role: document.getElementById('edit-role').value,
                salary: document.getElementById('edit-salary').value,
                address: document.getElementById('edit-address').value,
            };

            try {
                const res = await fetch(`${API_CONFIG.base}/employees/${CURRENT_EMP._id}`, {
                    method: 'PATCH',
                    headers: API_CONFIG.headers,
                    body: JSON.stringify(formData)
                });
                const result = await res.json();
                if (result.success) {
                    QuadModals.showToast("Profile updated", "success");
                    modal.classList.remove('active');
                    if (window.refreshEmployeeList) window.refreshEmployeeList();
                }
            } catch (err) {
                console.error(err);
                QuadModals.showToast("Update failed", "error");
            }
        };
    }
}

async function renderAttendance() {
    const month = currentViewDate.toISOString().slice(0, 7);
    const calLabel = document.getElementById('calendar-month-year');
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    calLabel.textContent = `${monthNames[currentViewDate.getMonth()]} ${currentViewDate.getFullYear()}`;

    try {
        const res = await fetch(`${API_CONFIG.base}/attendance/${CURRENT_EMP._id}?month=${month}`, { headers: API_CONFIG.headers });
        const result = await res.json();
        const records = result.success ? result.data : [];
        
        const daysContainer = document.getElementById('calendar-days');
        daysContainer.innerHTML = '';
        
        const year = currentViewDate.getFullYear();
        const m = currentViewDate.getMonth();
        const firstDay = new Date(year, m, 1).getDay();
        const daysInMonth = new Date(year, m + 1, 0).getDate();

        for (let i = 0; i < firstDay; i++) {
            const empty = document.createElement('div');
            empty.className = 'cal-day empty';
            daysContainer.appendChild(empty);
        }

        let presentCount = 0;
        records.forEach(r => { if(r.status === 'present') presentCount++; });
        document.getElementById('month-present').textContent = presentCount;

        for (let d = 1; d <= daysInMonth; d++) {
            const dayDiv = document.createElement('div');
            dayDiv.className = 'cal-day';
            dayDiv.textContent = d;
            
            const dateStr = `${year}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            const record = records.find(r => r.date === dateStr);
            
            if (record) {
                dayDiv.classList.add('status-present');
            }
            
            dayDiv.onclick = () => selectAttendanceDay(dateStr, record);
            daysContainer.appendChild(dayDiv);
        }
    } catch (err) {
        console.error("Attendance fetch failed", err);
    }
}

function selectAttendanceDay(dateStr, record) {
    const content = document.getElementById('day-stats-content');
    const nameSpan = document.getElementById('selected-day-name');
    const dateSpan = document.getElementById('selected-date-full');
    
    nameSpan.textContent = new Date(dateStr).toLocaleDateString('en-US', { weekday: 'long' });
    dateSpan.textContent = dateStr;

    if (!record || record.sessions.length === 0) {
        content.innerHTML = '<p class="empty-detail-msg">No activity logs for this day.</p>';
        return;
    }

    content.innerHTML = record.sessions.map((s, idx) => `
        <div class="punch-group" style="margin-bottom: 0.8rem; border-bottom: 1px dashed var(--border-color); padding-bottom: 0.5rem;">
            <p style="font-size: 0.75rem; font-weight: 700; color: var(--text-muted); margin-bottom: 4px;">Session ${idx + 1} ${s.isBreak ? '(Break)' : ''}</p>
            <div style="display: flex; justify-content: space-between; font-size: 0.85rem;">
                <span><i class="fa-solid fa-arrow-right-to-bracket" style="color: var(--c-green-text);"></i> ${new Date(s.in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                ${s.out ? `<span><i class="fa-solid fa-arrow-right-from-bracket" style="color: var(--c-red-text);"></i> ${new Date(s.out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>` : '<span>Active</span>'}
            </div>
        </div>
    `).join('');
}

async function renderSales() {
    const salesContainer = document.querySelector('.detail-section-col:nth-child(3) .section-body');
    if (!salesContainer) return;

    try {
        const res = await fetch(`${API_CONFIG.base}/sales/employee/${CURRENT_EMP._id}`, { headers: API_CONFIG.headers });
        const result = await res.json();
        
        if (result.success) {
            const data = result.data;
            salesContainer.innerHTML = `
                <div class="sales-performance-card" style="padding: 1.5rem; text-align: center;">
                    <div style="font-size: 2.5rem; color: var(--primary); margin-bottom: 0.5rem;">
                        <i class="fa-solid fa-sack-dollar"></i>
                    </div>
                    <h3 style="font-size: 1.5rem; font-weight: 800; margin-bottom: 0.25rem;">₹${data.totalSales.toLocaleString()}</h3>
                    <p style="color: var(--text-secondary); font-size: 0.9rem;">Total Sales this Month</p>
                    <div style="margin-top: 1.5rem; height: 8px; background: var(--bg-light); border-radius: 4px; overflow: hidden;">
                        <div style="width: ${Math.min((data.totalSales/200000)*100, 100)}%; height: 100%; background: var(--primary);"></div>
                    </div>
                    <p style="margin-top: 0.5rem; font-size: 0.75rem; color: var(--text-muted);">Goal: ₹2,00,000 (${Math.round((data.totalSales/200000)*100)}%)</p>
                    
                    <div style="margin-top: 2rem; display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                        <div style="background: var(--bg-light); padding: 1rem; border-radius: 12px;">
                            <h4 style="font-size: 1.2rem; font-weight: 700;">${data.count}</h4>
                            <p style="font-size: 0.7rem; color: var(--text-secondary);">Orders</p>
                        </div>
                        <div style="background: var(--bg-light); padding: 1rem; border-radius: 12px;">
                            <h4 style="font-size: 1.2rem; font-weight: 700;">₹${Math.round(data.totalSales / (data.count || 1)).toLocaleString()}</h4>
                            <p style="font-size: 0.7rem; color: var(--text-secondary);">Avg. Value</p>
                        </div>
                    </div>
                </div>
            `;
        }
    } catch (err) {
        console.error("Sales fetch failed", err);
    }
}

async function renderLeaves() {
    const container = document.getElementById('leave-list-container');
    if (!container) return;

    try {
        const res = await fetch(`${API_CONFIG.base}/leaves`, { headers: API_CONFIG.headers });
        const result = await res.json();
        
        if (result.success) {
            // Filter leaves for the current employee
            const leaves = result.data.filter(l => (l.employeeId?._id || l.employeeId) === CURRENT_EMP._id);
            
            if (leaves.length === 0) {
                container.innerHTML = '<p class="empty-detail-msg">No leave requests found.</p>';
                return;
            }

            container.innerHTML = leaves.map(l => `
                <div class="leave-item">
                    <div class="leave-item-header">
                        <span class="leave-dates">${new Date(l.startDate).toLocaleDateString()} - ${new Date(l.endDate).toLocaleDateString()}</span>
                        <span class="leave-status status-${l.status}">${l.status}</span>
                    </div>
                    <p class="leave-reason">${l.reason}</p>
                    ${l.status === 'pending' ? `
                        <div class="leave-actions">
                            <button class="btn-approve-leave" onclick="updateLeaveStatus('${l._id}', 'approved')">Approve</button>
                            <button class="btn-reject-leave" onclick="updateLeaveStatus('${l._id}', 'rejected')">Reject</button>
                        </div>
                    ` : ''}
                </div>
            `).join('');
        }
    } catch (err) {
        console.error("Leaves fetch failed", err);
    }
}

window.updateLeaveStatus = async (leaveId, status) => {
    try {
        const res = await fetch(`${API_CONFIG.base}/leaves/${leaveId}/status`, {
            method: 'PATCH',
            headers: API_CONFIG.headers,
            body: JSON.stringify({ status, adminNote: `Status updated to ${status}` })
        });
        const result = await res.json();
        if (result.success) {
            QuadModals.showToast(`Leave ${status}`, "info");
            renderLeaves();
        }
    } catch (err) { console.error(err); }
};

