import CONFIG from '../Shared/Utils/config.js';
import { apiRequest } from '../Shared/Utils/api.js';

document.addEventListener('DOMContentLoaded', () => {

    // --- Authentication & Context ---
    const ctx = window.authContext;
    if (!ctx || !ctx.isAuthenticated) {
        window.location.href = '../Authentication/login.html';
        return;
    }

    const { role: userRole, user } = ctx;

    // --- Initialize Data ---
    window.loadSettings();
    handleRoleAccess();

    // Sidebar, Theme, Clock and Logout handled by shared sidebar.js

    // --- Settings Functions ---

    window.loadSettings = async function () {
        try {
            // 1. Initial UI from context
            const activeUser = user;
            document.getElementById('owner-name').value = activeUser.name || '';
            document.getElementById('contact-info').value = activeUser.phoneNumber || '';

            // 2. Fetch Store Data from backend
            const dbData = await apiRequest('/stores/details');
            
            if (dbData.success) {
                const store = dbData.data;
                
                // Profile & Business
                document.getElementById('shop-name').value = store.name || '';
                
                // Business Preferences
                document.getElementById('low-stock-limit').value = store.lowStockThreshold || 10;
                document.getElementById('default-tax').value = store.defaultTax || 18;

                // Smart Expiry
                document.getElementById('high-stock-limit').value = store.highStockThreshold || 100;
                document.getElementById('healthy-expiry-limit').value = store.healthyExpiryThreshold || 30;

                // Notifications
                document.getElementById('notif-lowstock').checked = store.notifLowStock ?? true;
                document.getElementById('notif-udhaar').checked = store.notifUdhaarOverdue ?? true;
                document.getElementById('notif-reminders').checked = store.notifPaymentReminders ?? false;

                // Region
                document.getElementById('app-language').value = store.language || 'en';
                document.getElementById('date-format').value = store.dateFormat || 'dd-mm-yyyy';
                document.getElementById('time-format').value = store.timeFormat || '12';

            }
        } catch (e) {
            console.error("Failed to load settings from server", e);
            showModal('error', 'Sync Error', 'Failed to load settings from cloud. Some features may be static.');
        }
    }

    window.saveProfile = async function () {
        const shopName = document.getElementById('shop-name').value;
        const ownerName = document.getElementById('owner-name').value;
        const contact = document.getElementById('contact-info').value;

        try {
            // 1. Update User Profile
            const userResult = await apiRequest('/users/update-profile', {
                method: 'PATCH',
                body: JSON.stringify({ name: ownerName, phoneNumber: contact })
            });

            // 2. Update Store Details
            const storeResult = await apiRequest('/stores/update', {
                method: 'PUT',
                body: JSON.stringify({ name: shopName, phoneNumber: contact })
            });

            if (userResult.success && storeResult.success) {
                // Update local storage to keep it in sync
                const updatedUser = { ...user, ...userResult.data.user };
                localStorage.setItem('currentUser', JSON.stringify(updatedUser));
                
                // Update UI Header (Shop Name)
                const brandTexts = document.querySelectorAll('.brand-text');
                brandTexts.forEach(el => el.textContent = shopName);
                
                showModal('success', 'Profile Saved', 'Your profile and shop details have been updated successfully!');
            }
        } catch (err) {
            console.error("Profile Save Error:", err);
            showModal('error', 'Update Failed', err.message || 'Failed to reach servers.');
        }
    }

    window.savePreferences = async function () {
        const lowStock = parseInt(document.getElementById('low-stock-limit').value);
        const tax = parseFloat(document.getElementById('default-tax').value);

        try {
            const result = await apiRequest('/stores/update', {
                method: 'PUT',
                body: JSON.stringify({ lowStockThreshold: lowStock, defaultTax: tax })
            });
            if (result.success) {
                showModal('success', 'Preferences Saved', 'Business rules updated in cloud.');
            }
        } catch (err) {
            showModal('error', 'Error', 'Failed to update preferences: ' + err.message);
        }
    }

    window.saveNotifications = async function () {
        const notifLowStock = document.getElementById('notif-lowstock').checked;
        const notifUdhaar = document.getElementById('notif-udhaar').checked;
        const notifReminders = document.getElementById('notif-reminders').checked;

        try {
            const result = await apiRequest('/stores/update', {
                method: 'PUT',
                body: JSON.stringify({ 
                    notifLowStock, 
                    notifUdhaarOverdue: notifUdhaar, 
                    notifPaymentReminders: notifReminders 
                })
            });
            if (result.success) {
                showModal('success', 'Saved', 'Notification preferences synced.');
            }
        } catch (err) {
            showModal('error', 'Error', 'Failed to update notifications: ' + err.message);
        }
    }

    window.saveRegionSettings = async function () {
        const language = document.getElementById('app-language').value;
        const dateFormat = document.getElementById('date-format').value;
        const timeFormat = document.getElementById('time-format').value;

        try {
            const result = await apiRequest('/stores/update', {
                method: 'PUT',
                body: JSON.stringify({ language, dateFormat, timeFormat })
            });
            if (result.success) {
                showModal('success', 'Saved', 'Region & Localization settings updated.');
            }
        } catch (err) {
            showModal('error', 'Error', 'Failed to update region settings: ' + err.message);
        }
    }

    window.saveExpirySettings = async function () {
        if (userRole === 'staff') {
            showModal('error', 'Access Denied', 'Staff members cannot update global store thresholds.');
            return;
        }

        const highStock = parseInt(document.getElementById('high-stock-limit').value);
        const healthyExpiry = parseInt(document.getElementById('healthy-expiry-limit').value);
        
        if (isNaN(highStock) || highStock < 1 || isNaN(healthyExpiry) || healthyExpiry < 8) {
             showModal('error', 'Invalid Format', 'Please enter valid threshold numerals before saving.');
             return;
        }

        try {
            const result = await apiRequest('/stores/update', {
                method: 'PUT',
                body: JSON.stringify({ 
                    highStockThreshold: highStock, 
                    healthyExpiryThreshold: healthyExpiry 
                })
            });

            if (result.success) {
                showModal('success', 'Database Synced', 'Store thresholds updated synchronously everywhere!');
            }
        } catch (err) {
            console.error("Backend Save Error:", err);
            showModal('error', 'Sync Failed', err.message || 'Connection Error.');
        }
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

        try {
            const result = await apiRequest('/users/change-password', {
                method: 'PATCH',
                body: JSON.stringify({ currentPassword, newPassword })
            });

            if (result.success) {
                showModal('success', 'Success', 'Password updated in cloud successfully!');
                document.getElementById('current-password').value = '';
                document.getElementById('new-password').value = '';
                document.getElementById('confirm-password').value = '';
            }
        } catch (err) {
            console.error("Password Save Error:", err);
            showModal('error', 'Update Failed', err.message || 'Error updating password.');
        }
    }

    window.exportData = function () {
        if (userRole === 'staff') {
            showModal('error', 'Access Denied', 'Staff cannot export data.');
            return;
        }

        const data = {
            backupDate: new Date().toISOString(),
            user: user,
            preferences: {
                lowStock: document.getElementById('low-stock-limit').value,
                tax: document.getElementById('default-tax').value
            }
        };

        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data));
        const downloadAnchor = document.createElement('a');
        downloadAnchor.setAttribute("href", dataStr);
        downloadAnchor.setAttribute("download", `quadstock_config_backup_${new Date().toISOString().slice(0, 10)}.json`);
        document.body.appendChild(downloadAnchor);
        downloadAnchor.click();
        downloadAnchor.remove();
    }

    window.clearData = function () {
        if (userRole !== 'owner') {
            showModal('error', 'Access Denied', 'Only the Shop Owner can reset system data.');
            return;
        }

        showModal('warning', 'Reset Data', 'CRITICAL WARNING: This will sign you out and clear all your browser cache for QuadStock. This action cannot be undone. Are you absolutely sure?', () => {
             localStorage.clear();
             window.location.href = '../landing/landing.html';
        });
    }


    // --- UI Helpers ---
    function handleRoleAccess() {
        if (userRole === 'staff') {
            const dangerZone = document.getElementById('data-mgmt-section');
            if (dangerZone) dangerZone.style.display = 'none';
            
            // Disable expiry threshold inputs
            const expiryInputs = ['high-stock-limit', 'healthy-expiry-limit'];
            expiryInputs.forEach(id => {
                const el = document.getElementById(id);
                if (el) {
                    el.disabled = true;
                    el.style.background = '#f1f5f9';
                    el.style.cursor = 'not-allowed';
                }
            });
        }
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
