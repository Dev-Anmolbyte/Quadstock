document.addEventListener('DOMContentLoaded', () => {

    // --- Initialize Data ---
    loadSettings();
    handleRoleAccess();

    // --- Sidebar & Theme Toggle (Reused Logic) ---
    const sidebarToggle = document.getElementById('sidebar-toggle');
    const sidebar = document.getElementById('sidebar');
    if (sidebarToggle) {
        sidebarToggle.addEventListener('click', () => {
            sidebar.classList.toggle('active');
        });

        // Mobile Sidebar Close on Click Outside
        document.addEventListener('click', (e) => {
            if (window.innerWidth <= 768 &&
                sidebar.classList.contains('active') &&
                !sidebar.contains(e.target) &&
                e.target !== sidebarToggle &&
                !sidebarToggle.contains(e.target)) {
                sidebar.classList.remove('active');
            }
        });
    }

    const themeBtn = document.getElementById('theme-toggle');
    const body = document.body;

    // Apply Saved Theme
    const savedTheme = localStorage.getItem('theme') || 'light';
    body.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);

    if (themeBtn) {
        themeBtn.addEventListener('click', () => {
            const current = body.getAttribute('data-theme');
            const newTheme = current === 'dark' ? 'light' : 'dark';
            body.setAttribute('data-theme', newTheme);
            localStorage.setItem('theme', newTheme);
            updateThemeIcon(newTheme);
        });
    }

    function updateThemeIcon(theme) {
        if (themeBtn) themeBtn.innerHTML = theme === 'dark' ? '<i class="fa-solid fa-sun"></i>' : '<i class="fa-solid fa-moon"></i>';
    }

    // --- Logout Logic ---
    document.getElementById('logout-btn').addEventListener('click', () => {
        showModal('warning', 'Logout', 'Are you sure you want to logout?', () => {
            sessionStorage.removeItem('activeUser');
            sessionStorage.removeItem('activeRole');
            window.location.href = '../Ownerlogin/login.html';
        });
    });

});

// --- Settings Logic ---

function loadSettings() {
    const settings = JSON.parse(localStorage.getItem('appSettings')) || getDefaultSettings();

    // Profile
    document.getElementById('shop-name').value = settings.profile.shopName || '';
    document.getElementById('owner-name').value = settings.profile.ownerName || '';
    document.getElementById('contact-info').value = settings.profile.contact || '';

    // Preferences
    document.getElementById('low-stock-limit').value = settings.preferences.lowStockThreshold || 10;
    document.getElementById('default-tax').value = settings.preferences.defaultTax || 18;

    // Notifications
    const notif = settings.notifications || getDefaultSettings().notifications;
    document.getElementById('notif-lowstock').checked = notif.lowStock;
    document.getElementById('notif-udhaar').checked = notif.udhaarOverdue;
    document.getElementById('notif-reminders').checked = notif.paymentReminders;

    // Region
    const region = settings.region || getDefaultSettings().region;
    document.getElementById('app-language').value = region.language;
    document.getElementById('date-format').value = region.dateFormat;
    document.getElementById('time-format').value = region.timeFormat;
}

function getDefaultSettings() {
    return {
        profile: { shopName: 'QuadStock Shop', ownerName: '', contact: '' },
        preferences: { lowStockThreshold: 10, defaultTax: 18 },
        notifications: { lowStock: true, udhaarOverdue: true, paymentReminders: false },
        region: { language: 'en', dateFormat: 'dd-mm-yyyy', timeFormat: '12' }
    };
}

function saveProfile() {
    const settings = getCurrentSettingsObj();
    settings.profile = {
        shopName: document.getElementById('shop-name').value,
        ownerName: document.getElementById('owner-name').value,
        contact: document.getElementById('contact-info').value
    };
    saveToStorage(settings);
    showModal('success', 'Profile Saved', 'Profile updated successfully!');
}

function savePreferences() {
    const settings = getCurrentSettingsObj();
    settings.preferences = {
        lowStockThreshold: parseInt(document.getElementById('low-stock-limit').value),
        defaultTax: parseFloat(document.getElementById('default-tax').value)
    };
    saveToStorage(settings);
    showModal('success', 'Preferences Saved', 'Preferences updated. Dashboard metrics will reflect this shortly.');
}

function saveNotifications() {
    const settings = getCurrentSettingsObj();
    settings.notifications = {
        lowStock: document.getElementById('notif-lowstock').checked,
        udhaarOverdue: document.getElementById('notif-udhaar').checked,
        paymentReminders: document.getElementById('notif-reminders').checked
    };
    saveToStorage(settings);
    showModal('success', 'Saved', 'Notification settings saved.');
}

function saveRegionSettings() {
    const settings = getCurrentSettingsObj();
    settings.region = {
        language: document.getElementById('app-language').value,
        dateFormat: document.getElementById('date-format').value,
        timeFormat: document.getElementById('time-format').value
    };
    saveToStorage(settings);
    showModal('success', 'Saved', 'Region & Time settings updated.');
}

function getCurrentSettingsObj() {
    return JSON.parse(localStorage.getItem('appSettings')) || getDefaultSettings();
}

function saveToStorage(settings) {
    localStorage.setItem('appSettings', JSON.stringify(settings));
}

// --- Role Management ---
function handleRoleAccess() {
    // Check URL params first (simple check)
    const urlParams = new URLSearchParams(window.location.search);
    const roleParam = urlParams.get('role');

    // Or check localStorage auth
    const userRole = roleParam || (localStorage.getItem('currentEmployee') ? 'manager' : 'owner');

    if (userRole === 'manager') {
        const dataSection = document.getElementById('data-mgmt-section');
        if (dataSection) {
            dataSection.style.display = 'none'; // Hide sensitive section
        }

        // Adjust back link
        const dashLink = document.querySelector('a[href*="Ownerdashboard"]');
        if (dashLink) {
            dashLink.href = '../Managerdashboard/manager_dashboard.html';
            dashLink.innerHTML = '<i class="fa-solid fa-house"></i><span>Manager Dashboard</span>';
        }
    }
}


// --- Data Actions ---
function exportData() {
    const data = {
        inventory: JSON.parse(localStorage.getItem('inventory')) || [], // Updated key
        udhaar: JSON.parse(localStorage.getItem('udhaarRecords')) || [],
        settings: JSON.parse(localStorage.getItem('appSettings')) || {},
        expense: JSON.parse(localStorage.getItem('expenses')) || []
    };

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", "quadstock_backup_" + new Date().toISOString().slice(0, 10) + ".json");
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
}

function clearData() {
    showModal('warning', 'Reset Data', 'CRITICAL WARNING: This will delete ALL Inventory and Udhaar records. This action cannot be undone. Are you absolutely sure?', () => {
        // Second step: Prompt replacement - simpler to just ask double confirmation or use a custom input modal.
        // For now, simpler double check. Use a second modal.
        showModal('warning', 'Final Confirmation', 'Really delete everything? Click Confirm to Wipe Data.', () => {
            localStorage.removeItem('inventory');
            localStorage.removeItem('udhaarRecords');
            localStorage.removeItem('expenses');
            showModal('success', 'Reset Complete', 'System data has been reset.', () => {
                location.reload();
            });
        });
    });
}

// --- Password Logic ---
function changePassword() {
    const currentPass = document.getElementById('current-password').value;
    const newPass = document.getElementById('new-password').value;
    const confirmPass = document.getElementById('confirm-password').value;

    if (!currentPass || !newPass || !confirmPass) {
        showModal('warning', 'Missing Fields', 'Please fill in all password fields.');
        return;
    }

    if (newPass !== confirmPass) {
        showModal('error', 'Mismatch', 'New passwords do not match!');
        return;
    }

    const activeUser = sessionStorage.getItem('activeUser');

    if (!activeUser) {
        showModal('error', 'Session Expired', 'Please login again.', () => {
            window.location.href = '../Ownerlogin/login.html';
        });
        return;
    }

    // Role check for data source
    const role = sessionStorage.getItem('activeRole');
    let users = [];
    let storageKey = '';

    if (role === 'owner') {
        users = JSON.parse(localStorage.getItem('quadstock_users')) || [];
        storageKey = 'quadstock_users';
    } else {
        users = JSON.parse(localStorage.getItem('employees')) || [];
        storageKey = 'employees';
    }

    // Find user (checking both username and email to be safe as per login systems)
    const userIndex = users.findIndex(u => u.username === activeUser || u.email === activeUser);

    if (userIndex !== -1) {
        // Verify current password
        if (users[userIndex].password !== currentPass) {
            showModal('error', 'Incorrect', 'The current password you entered is wrong.');
            return;
        }

        // Update password and save
        users[userIndex].password = newPass;
        localStorage.setItem(storageKey, JSON.stringify(users));

        showModal('success', 'Success', 'Password updated successfully!');

        // Clear fields
        document.getElementById('current-password').value = '';
        document.getElementById('new-password').value = '';
        document.getElementById('confirm-password').value = '';
    } else {
        showModal('error', 'Error', 'User record not found in database.');
    }
}

function getUserRole() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('role') || sessionStorage.getItem('activeRole') || 'owner';
}

window.togglePassword = function (inputId, iconElement) {
    const input = document.getElementById(inputId);
    if (input.type === 'password') {
        input.type = 'text';
        iconElement.classList.remove('fa-eye');
        iconElement.classList.add('fa-eye-slash');
    } else {
        input.type = 'password';
        iconElement.classList.remove('fa-eye-slash');
        iconElement.classList.add('fa-eye');
    }
};

// --- Custom Modal Logic ---
function showModal(type, title, message, onConfirm = null) {
    const overlay = document.getElementById('custom-modal-overlay');
    const iconEl = document.getElementById('modal-icon');
    const titleEl = document.getElementById('modal-title');
    const msgEl = document.getElementById('modal-message');
    const actionsEl = document.getElementById('modal-actions');

    // Set Content
    titleEl.innerText = title;
    msgEl.innerText = message;

    // Set Icon
    let iconClass = 'fa-circle-check';
    let colorClass = 'success';
    if (type === 'error') { iconClass = 'fa-circle-xmark'; colorClass = 'error'; }
    if (type === 'warning') { iconClass = 'fa-triangle-exclamation'; colorClass = 'warning'; }

    iconEl.className = `modal-icon ${colorClass}`;
    iconEl.innerHTML = `<i class="fa-solid ${iconClass}"></i>`;

    // Set Actions
    actionsEl.innerHTML = '';
    if (onConfirm) {
        // Confirmation Mode (Yes/No)
        const confirmBtn = document.createElement('button');
        confirmBtn.className = 'modal-btn btn-confirm';
        confirmBtn.innerText = 'Confirm';
        confirmBtn.onclick = () => {
            closeModal();
            onConfirm();
        };

        const cancelBtn = document.createElement('button');
        cancelBtn.className = 'modal-btn btn-cancel';
        cancelBtn.innerText = 'Cancel';
        cancelBtn.onclick = closeModal;

        actionsEl.appendChild(cancelBtn);
        actionsEl.appendChild(confirmBtn);
    } else {
        // Alert Mode (OK)
        const okBtn = document.createElement('button');
        okBtn.className = 'modal-btn btn-confirm';
        okBtn.innerText = 'OK';
        okBtn.onclick = closeModal;
        actionsEl.appendChild(okBtn);
    }

    // Show
    overlay.classList.add('active');
}

function closeModal() {
    document.getElementById('custom-modal-overlay').classList.remove('active');
}

// Override existing alerts in this file
window.alert = function (msg) {
    showModal('success', 'Notification', msg);
};

// For confirms, we need to refactor usages to use callbacks, can't easily override sync confirm()
// So we will manually update usage sites below.

