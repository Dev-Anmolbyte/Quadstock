// staff_details.js - Staff 360 / Detail View Logic
// FIX: Accept a getter function instead of a static array reference
// This ensures we always access the latest 'ownerEmployees' even after re-renders
function initStaffDetails(getSafeEmployees, currentOwnerId, onSave) {
    const modal = document.getElementById('details-modal-overlay');
    if (!modal) return;

    const container = modal.querySelector('.details-modal-container');
    const sectionsRow = modal.querySelector('.details-sections-row');
    const closeBtn = document.getElementById('close-details-btn');
    const maximizeBtn = document.getElementById('maximize-details-btn');
    const saveBtn = document.getElementById('btn-save-details');

    // Action Elements (Moved to top to prevent ReferenceError)
    const roleSelect = document.getElementById('modal-role-select');
    const btnUpdateRole = document.getElementById('btn-update-role-modal');
    const btnBlock = document.getElementById('btn-block-employee-modal');
    const btnDelete = document.getElementById('btn-delete-employee-modal');

    const tabs = modal.querySelectorAll('.section-tab-header');
    const sections = modal.querySelectorAll('.detail-section-col');

    if (!container || !sectionsRow || !closeBtn || !maximizeBtn) {
        console.error("Staff 360: Critical UI elements missing.");
        return;
    }

    // Calendar Elements
    const calMonthYear = document.getElementById('calendar-month-year');
    const calDaysContainer = document.getElementById('calendar-days');
    const prevMonthBtn = document.getElementById('prev-month');
    const nextMonthBtn = document.getElementById('next-month');
    const selectedDayName = document.getElementById('selected-day-name');
    const selectedDateFull = document.getElementById('selected-date-full');
    const dayStatsContent = document.getElementById('day-stats-content');

    // Local State
    let activeEmpId = null;
    let currentViewDate = new Date();

    // --- 1. Internal Helpers ---

    const closeModal = () => {
        modal.classList.remove('active');
        activeEmpId = null;
    };

    const switchTab = (tabIndex) => {
        const normalizedIndex = tabIndex % sections.length;
        tabs.forEach((t, idx) => {
            if (idx % sections.length === normalizedIndex) t.classList.add('active');
            else t.classList.remove('active');
        });
        sections.forEach((s, idx) => {
            if (idx === normalizedIndex) s.classList.add('active');
            else s.classList.remove('active');
        });
    };

    const getActiveEmp = () => {
        const safeList = typeof getSafeEmployees === 'function' ? getSafeEmployees() : [];
        return safeList.find(e => e.empId === activeEmpId);
    };

    // --- 2. Calendar Logic ---

    const renderCalendar = () => {
        if (!calDaysContainer || !calMonthYear) return;
        calDaysContainer.innerHTML = '';
        const year = currentViewDate.getFullYear();
        const month = currentViewDate.getMonth();

        const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
        calMonthYear.textContent = `${monthNames[month]} ${year}`;

        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        for (let i = 0; i < firstDay; i++) {
            const emptyDiv = document.createElement('div');
            emptyDiv.className = 'cal-day empty';
            calDaysContainer.appendChild(emptyDiv);
        }

        let stats = { present: 0, absent: 0, late: 0, holiday: 0 };
        const today = new Date();

        for (let day = 1; day <= daysInMonth; day++) {
            const dayDiv = document.createElement('div');
            dayDiv.className = 'cal-day';
            dayDiv.textContent = day;

            const cellDate = new Date(year, month, day);
            const isFuture = cellDate > today;

            if (day === today.getDate() && month === today.getMonth() && year === today.getFullYear()) {
                dayDiv.classList.add('today');
            }

            if (!isFuture) {
                const dayOfWeek = cellDate.getDay();
                if (dayOfWeek === 0) {
                    dayDiv.classList.add('status-holiday');
                    stats.holiday++;
                } else if (day % 7 === 0) {
                    dayDiv.classList.add('status-late');
                    stats.late++;
                } else if (day % 5 === 0) {
                    dayDiv.classList.add('status-absent');
                    stats.absent++;
                } else {
                    dayDiv.classList.add('status-present');
                    stats.present++;
                }
            } else if (cellDate.getDay() === 0) {
                dayDiv.classList.add('status-holiday');
            }

            dayDiv.addEventListener('click', () => selectDay(day, month, year, dayDiv));
            calDaysContainer.appendChild(dayDiv);
        }

        const setStat = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
        setStat('month-present', stats.present);
        setStat('month-absent', stats.absent);
        setStat('month-late', stats.late);
        setStat('month-holiday', stats.holiday);
    };

    const selectDay = (day, month, year, element) => {
        modal.querySelectorAll('.cal-day').forEach(d => d.classList.remove('selected'));
        element.classList.add('selected');

        const dateObj = new Date(year, month, day);
        const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

        if (selectedDayName) selectedDayName.textContent = dayNames[dateObj.getDay()];
        if (selectedDateFull) selectedDateFull.textContent = `${day} ${monthNames[month]} ${year}`;

        renderDayDetails(day);
    };

    const renderDayDetails = (day) => {
        if (!dayStatsContent) return;
        const isPresent = day % 3 !== 0;
        if (!isPresent) {
            dayStatsContent.innerHTML = `
                <div class="placeholder-view" style="padding: 1rem;">
                    <i class="fa-solid fa-bed" style="font-size: 2rem;"></i>
                    <h4 style="font-size: 0.9rem;">Absent / Leave</h4>
                    <p style="font-size: 0.8rem;">No punch logs found for this day.</p>
                </div>
            `;
            return;
        }

        dayStatsContent.innerHTML = `
            <div class="punch-log-item">
                <div class="punch-type-icon in"><i class="fa-solid fa-right-to-bracket"></i></div>
                <div class="punch-time-info">
                    <span class="punch-label">Punch In</span>
                    <span class="punch-time">09:15 AM</span>
                </div>
            </div>
            <div class="punch-log-item">
                <div class="punch-type-icon out"><i class="fa-solid fa-right-from-bracket"></i></div>
                <div class="punch-time-info">
                    <span class="punch-label">Punch Out</span>
                    <span class="punch-time">06:30 PM</span>
                </div>
            </div>
        `;
    };

    // --- 3. Public API (Global Window) ---

    window.openStaffDetail = (empId) => {
        const safeList = typeof getSafeEmployees === 'function' ? getSafeEmployees() : [];
        const emp = safeList.find(e => e.empId === empId);
        if (!emp) return;

        activeEmpId = empId;

        container.classList.remove('fullscreen');
        const maxIcon = maximizeBtn.querySelector('i');
        if (maxIcon) maxIcon.className = 'fa-solid fa-expand';
        switchTab(0);

        currentViewDate = new Date();
        renderCalendar();
        if (selectedDayName) selectedDayName.textContent = "Select a date";
        if (selectedDateFull) selectedDateFull.textContent = "--/--/----";
        if (dayStatsContent) dayStatsContent.innerHTML = '<p class="empty-detail-msg">Select a date to view punch logs</p>';

        document.getElementById('detail-header-name').textContent = emp.name;
        document.getElementById('detail-header-id').textContent = emp.empId;
        document.getElementById('detail-header-role').textContent = emp.role;

        const avatarContainer = document.getElementById('detail-header-initial');
        if (emp.photo) {
            avatarContainer.innerHTML = `<img src="${emp.photo}" style="width:100%; height:100%; object-fit:cover; border-radius:inherit;">`;
            avatarContainer.style.backgroundColor = 'transparent';
        } else {
            avatarContainer.innerHTML = emp.name.charAt(0).toUpperCase();
            avatarContainer.style.backgroundColor = 'var(--primary-light)';
        }

        const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.value = val || ''; };
        setVal('edit-name', emp.name);
        setVal('edit-phone', emp.phone);
        setVal('edit-email', emp.email);
        setVal('edit-aadhaar', emp.aadhaar);
        setVal('edit-address', emp.address);
        setVal('edit-role', emp.role);
        setVal('edit-salary', emp.salary);

        if (roleSelect) roleSelect.value = emp.role || 'staff';
        const blockText = btnBlock?.querySelector('span');
        const blockIcon = btnBlock?.querySelector('i');
        if (blockText && blockIcon) {
            if (emp.status === 'offline' || emp.status === 'absent') {
                blockText.textContent = "Unblock Access";
                blockIcon.className = "fa-solid fa-unlock";
            } else {
                blockText.textContent = "Block Access";
                blockIcon.className = "fa-solid fa-lock";
            }
        }

        modal.classList.add('active');
    };

    // --- 4. Event Listeners ---

    if (closeBtn) closeBtn.onclick = closeModal;

    if (maximizeBtn) {
        maximizeBtn.onclick = () => {
            container.classList.toggle('fullscreen');
            const icon = maximizeBtn.querySelector('i');
            if (icon) container.classList.contains('fullscreen') ? icon.classList.replace('fa-expand', 'fa-compress') : icon.classList.replace('fa-compress', 'fa-expand');
        };
    }

    if (prevMonthBtn) prevMonthBtn.onclick = () => { currentViewDate.setMonth(currentViewDate.getMonth() - 1); renderCalendar(); };
    if (nextMonthBtn) nextMonthBtn.onclick = () => { currentViewDate.setMonth(currentViewDate.getMonth() + 1); renderCalendar(); };

    tabs.forEach((tab, index) => {
        tab.onclick = () => switchTab(index);
    });

    if (saveBtn) {
        saveBtn.onclick = () => {
            if (!activeEmpId) return;
            const emp = getActiveEmp();
            if (!emp) return;

            const safeGet = (id) => document.getElementById(id)?.value || '';
            const updatedEmp = {
                ...emp,
                name: safeGet('edit-name'),
                phone: safeGet('edit-phone'),
                email: safeGet('edit-email'),
                aadhaar: safeGet('edit-aadhaar'),
                address: safeGet('edit-address'),
                role: safeGet('edit-role'),
                salary: safeGet('edit-salary')
            };

            if (onSave) onSave(updatedEmp);
            closeModal();
        };
    }

    // --- 5. Action Section Logic ---
    // (Variables now declared at top of function)

    if (btnUpdateRole) {
        btnUpdateRole.onclick = () => {
            const emp = getActiveEmp();
            if (!emp || !roleSelect) return;
            const newRole = roleSelect.value;
            if (newRole === emp.role) return QuadModals.showToast("Role is already " + newRole, 'info');

            QuadModals.confirm("Update Role", `Change role to ${newRole}?`).then(confirmed => {
                if (confirmed) { if (onSave) onSave({ ...emp, role: newRole }); }
            });
        };
    }

    if (btnBlock) {
        btnBlock.onclick = () => {
            const emp = getActiveEmp();
            if (!emp) return;
            const isCurrentlyActive = (emp.status === 'active' || emp.status === 'present');
            const newStatus = isCurrentlyActive ? 'offline' : 'active';
            const actionTitle = isCurrentlyActive ? 'Block Access' : 'Unblock Access';

            QuadModals.confirm(actionTitle, `Are you sure you want to ${actionTitle.toLowerCase()} for ${emp.name}?`, { isDanger: isCurrentlyActive })
                .then(confirmed => {
                    if (confirmed) {
                        // 1. Persist Change
                        if (onSave) onSave({ ...emp, status: newStatus });

                        // 2. Update UI Immediately
                        const blockText = btnBlock.querySelector('span');
                        const blockIcon = btnBlock.querySelector('i');
                        if (blockText && blockIcon) {
                            if (newStatus === 'offline') {
                                blockText.textContent = "Unblock Access";
                                blockIcon.className = "fa-solid fa-unlock";
                            } else {
                                blockText.textContent = "Block Access";
                                blockIcon.className = "fa-solid fa-lock";
                            }
                        }

                        QuadModals.showToast(`Access ${newStatus === 'active' ? 'Restored' : 'Revoked'}`, 'success');
                    }
                });
        };
    }

    if (btnDelete) {
        btnDelete.onclick = () => {
            const emp = getActiveEmp();
            if (!emp) return;
            QuadModals.confirm("Delete Employee", "Irreversible action.", { isDanger: true }).then(confirmed => {
                if (confirmed && window.deleteEmployee) { window.deleteEmployee(emp.empId); closeModal(); }
            });
        };
    }
}
