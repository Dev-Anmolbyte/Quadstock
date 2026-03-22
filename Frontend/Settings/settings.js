import CONFIG from '../Shared/Utils/config.js';

document.addEventListener('DOMContentLoaded', () => {

    // --- Authentication & Context ---
    const ctx = window.authContext;
    if (!ctx || !ctx.isAuthenticated) {
        window.location.href = '../Authentication/login.html';
        return;
    }

    const { role: userRole, ownerRefId: ownerId, user } = ctx;

    // --- Initialize Data ---
    window.loadSettings();
    handleRoleAccess();

    // Sidebar, Theme, Clock and Logout handled by shared sidebar.js

    // --- Settings Functions ---

    window.loadSettings = function () {
        const settings = JSON.parse(localStorage.getItem(`appSettings_${ownerId}`)) || getDefaultSettings();

        // Profile (Real Dynamic Data from Session)
        const activeUser = currentUser || currentEmployee;
        document.getElementById('shop-name').value = activeUser.shopName || '';
        document.getElementById('owner-name').value = activeUser.ownerName || '';
        document.getElementById('contact-info').value = activeUser.phoneNumber || activeUser.phone || '';

        // Preferences (Stay local for now)
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

    window.saveProfile = async function () {
        const shopName = document.getElementById('shop-name').value;
        const ownerName = document.getElementById('owner-name').value;
        const contact = document.getElementById('contact-info').value;

        const userId = currentUser ? currentUser._id : (currentEmployee ? currentEmployee._id : null);
        if (!userId) return;

        try {
            const response = await fetch(`${CONFIG.API_BASE_URL}/owner/update/${userId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ shopName, ownerName, phoneNumber: contact })
            });

            const result = await response.json();
            if (response.ok && result.success) {
                if (currentUser) {
                    Object.assign(currentUser, result.data);
                    localStorage.setItem('currentUser', JSON.stringify(currentUser));
                } else {
                    Object.assign(currentEmployee, result.data);
                    localStorage.setItem('currentEmployee', JSON.stringify(currentEmployee));
                }
                
                // Update UI immediately
                const newShopName = result.data.shopName || shopName;
                const brandTexts = document.querySelectorAll('.brand-text');
                brandTexts.forEach(el => el.textContent = newShopName);
                
                showModal('success', 'Profile Saved', 'Profile updated across your session!');
            } else {
                showModal('error', 'Update Failed', result.message);
            }
        } catch (err) {
            console.error("Profile Save Error:", err);
            showModal('error', 'Error', 'Failed to reach backend.');
        }
    }

    window.savePreferences = function () {
        const settings = getCurrentSettingsObj();
        settings.preferences = {
            lowStockThreshold: parseInt(document.getElementById('low-stock-limit').value),
            defaultTax: parseFloat(document.getElementById('default-tax').value)
        };
        saveToStorage(settings);
        showModal('success', 'Preferences Saved', 'Local preferences updated.');
    }

    window.saveNotifications = function () {
        const settings = getCurrentSettingsObj();
        settings.notifications = {
            lowStock: document.getElementById('notif-lowstock').checked,
            udhaarOverdue: document.getElementById('notif-udhaar').checked,
            paymentReminders: document.getElementById('notif-reminders').checked
        };
        saveToStorage(settings);
        showModal('success', 'Saved', 'Notification settings saved.');
    }

    window.saveRegionSettings = function () {
        const settings = getCurrentSettingsObj();
        settings.region = {
            language: document.getElementById('app-language').value,
            dateFormat: document.getElementById('date-format').value,
            timeFormat: document.getElementById('time-format').value
        };
        saveToStorage(settings);
        showModal('success', 'Saved', 'Region & Time settings updated.');
    }

    window.changePassword = async function () {
        const currentPassword = document.getElementById('current-password').value;
        const newPassword = document.getElementById('new-password').value;
        const confirmPass = document.getElementById('confirm-password').value;

        if (!currentPassword || !newPassword || !confirmPass) {
            showModal('warning', 'Missing Fields', 'Please fill in all password fields.');
            return;
        }

        if (newPassword !== confirmPass) {
            showModal('error', 'Mismatch', 'New passwords do not match!');
            return;
        }

        const userId = currentUser ? currentUser._id : (currentEmployee ? currentEmployee._id : null);
        if (!userId) return;

        try {
            const response = await fetch(`${CONFIG.API_BASE_URL}/owner/password/${userId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ currentPassword, newPassword })
            });

            const result = await response.json();
            if (response.ok && result.success) {
                showModal('success', 'Success', 'Password updated in cloud successfully!');
                document.getElementById('current-password').value = '';
                document.getElementById('new-password').value = '';
                document.getElementById('confirm-password').value = '';
            } else {
                showModal('error', 'Update Failed', result.message);
            }
        } catch (err) {
            console.error("Password Save Error:", err);
            showModal('error', 'Error', 'Failed to reach backend.');
        }
    }

    window.exportData = function () {
        if (userRole === 'staff') {
            showModal('error', 'Access Denied', 'Staff cannot export data.');
            return;
        }

        const data = {
            inventory: JSON.parse(localStorage.getItem(`inventory_${ownerId}`)) || [],
            udhaar: (JSON.parse(localStorage.getItem('udhaarRecords')) || []).filter(r => r.ownerId === ownerId),
            settings: JSON.parse(localStorage.getItem(`appSettings_${ownerId}`)) || {},
            expense: (JSON.parse(localStorage.getItem('expenses')) || []).filter(e => e.ownerId === ownerId)
        };

        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data));
        const downloadAnchor = document.createElement('a');
        downloadAnchor.setAttribute("href", dataStr);
        downloadAnchor.setAttribute("download", `quadstock_backup_${ownerId}_${new Date().toISOString().slice(0, 10)}.json`);
        document.body.appendChild(downloadAnchor);
        downloadAnchor.click();
        downloadAnchor.remove();
    }

    window.clearData = function () {
        if (userRole !== 'owner') {
            showModal('error', 'Access Denied', 'Only the Shop Owner can reset system data.');
            return;
        }

        showModal('warning', 'Reset Data', 'CRITICAL WARNING: This will delete ALL Inventory and Udhaar records for YOUR store. This action cannot be undone. Are you absolutely sure?', () => {
            showModal('warning', 'Final Confirmation', 'Really delete everything? Click Confirm to Wipe Data.', () => {
                localStorage.removeItem(`inventory_${ownerId}`);
                const udhaar = (JSON.parse(localStorage.getItem('udhaarRecords')) || []).filter(r => r.ownerId !== ownerId);
                localStorage.setItem('udhaarRecords', JSON.stringify(udhaar));
                const expenses = (JSON.parse(localStorage.getItem('expenses')) || []).filter(e => e.ownerId !== ownerId);
                localStorage.setItem('expenses', JSON.stringify(expenses));
                localStorage.removeItem(`appSettings_${ownerId}`);

                showModal('success', 'Reset Complete', 'Your store data has been reset.', () => {
                    location.reload();
                });
            });
        });
    }

    function getCurrentSettingsObj() {
        return JSON.parse(localStorage.getItem(`appSettings_${ownerId}`)) || getDefaultSettings();
    }

    function saveToStorage(settings) {
        localStorage.setItem(`appSettings_${ownerId}`, JSON.stringify(settings));
    }

    function getDefaultSettings() {
        return {
            profile: { shopName: 'QuadStock Shop', ownerName: '', contact: '' },
            preferences: { lowStockThreshold: 10, defaultTax: 18 },
            notifications: { lowStock: true, udhaarOverdue: true, paymentReminders: false },
            region: { language: 'en', dateFormat: 'dd-mm-yyyy', timeFormat: '12' }
        };
    }

    // --- Role Management ---
    function handleRoleAccess() {
        // Role-based UI visibility updates
    }


    function closeModal() {
        document.getElementById('custom-modal-overlay').classList.remove('active');
    }

    window.showModal = function (type, title, message, onConfirm = null) {
        const overlay = document.getElementById('custom-modal-overlay');
        const iconEl = document.getElementById('modal-icon');
        const titleEl = document.getElementById('modal-title');
        const msgEl = document.getElementById('modal-message');
        const actionsEl = document.getElementById('modal-actions');

        titleEl.innerText = title;
        msgEl.innerText = message;

        let iconClass = 'fa-circle-check';
        let colorClass = 'success';
        if (type === 'error') { iconClass = 'fa-circle-xmark'; colorClass = 'error'; }
        if (type === 'warning') { iconClass = 'fa-triangle-exclamation'; colorClass = 'warning'; }

        iconEl.className = `modal-icon ${colorClass}`;
        iconEl.innerHTML = `<i class="fa-solid ${iconClass}"></i>`;

        actionsEl.innerHTML = '';
        if (onConfirm) {
            const confirmBtn = document.createElement('button');
            confirmBtn.className = 'modal-btn btn-confirm';
            confirmBtn.innerText = 'Confirm';
            confirmBtn.onclick = () => { closeModal(); onConfirm(); };
            const cancelBtn = document.createElement('button');
            cancelBtn.className = 'modal-btn btn-cancel';
            cancelBtn.innerText = 'Cancel';
            cancelBtn.onclick = closeModal;
            actionsEl.appendChild(cancelBtn);
            actionsEl.appendChild(confirmBtn);
        } else {
            const okBtn = document.createElement('button');
            okBtn.className = 'modal-btn btn-confirm';
            okBtn.innerText = 'OK';
            okBtn.onclick = closeModal;
            actionsEl.appendChild(okBtn);
        }
        overlay.classList.add('active');
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

});
