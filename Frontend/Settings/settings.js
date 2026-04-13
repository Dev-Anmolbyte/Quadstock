import CONFIG from '../Shared/Utils/config.js';
import { apiRequest } from '../Shared/Utils/api.js';

document.addEventListener('DOMContentLoaded', () => {
    console.log("[Settings] Initializing module...");

    // --- Authentication & Context ---
    const ctx = window.authContext;
    if (!ctx || !ctx.isAuthenticated) {
        console.warn("[Settings] Not authenticated, redirecting...");
        window.location.href = '../Authentication/login.html';
        return;
    }

    const { role: userRole, user } = ctx;
    console.log(`[Settings] User role: ${userRole}`);

    // --- Define Global Functions ---
    let initialState = {};

    window.loadSettings = async function () {
        console.log("[Settings] Loading store and profile data...");
        try {
            // 1. Initial UI from context (owner profile)
            const activeUser = user;
            if (document.getElementById('owner-name')) document.getElementById('owner-name').value = activeUser.name || '';
            if (document.getElementById('contact-info')) document.getElementById('contact-info').value = activeUser.phoneNumber || '';

            // 2. Fetch Store Data from backend
            const dbData = await apiRequest('/stores/details');
            
            if (dbData.success) {
                const store = dbData.data;
                console.log("[Settings] Store data fetched successfully.");
                
                // Profile & Business
                if (document.getElementById('shop-name')) document.getElementById('shop-name').value = store.name || '';
                
                // Business Preferences
                if (document.getElementById('low-stock-limit')) document.getElementById('low-stock-limit').value = store.lowStockThreshold || 10;
                if (document.getElementById('default-tax')) document.getElementById('default-tax').value = store.defaultTax || 18;

                // Smart Expiry
                if (document.getElementById('high-stock-limit')) document.getElementById('high-stock-limit').value = store.highStockThreshold || 100;
                if (document.getElementById('healthy-expiry-limit')) document.getElementById('healthy-expiry-limit').value = store.healthyExpiryThreshold || 30;

                // Notifications
                if (document.getElementById('notif-lowstock')) document.getElementById('notif-lowstock').checked = store.notifLowStock ?? true;
                if (document.getElementById('notif-udhaar')) document.getElementById('notif-udhaar').checked = store.notifUdhaarOverdue ?? true;
                if (document.getElementById('notif-reminders')) document.getElementById('notif-reminders').checked = store.notifPaymentReminders ?? false;

                // Region
                if (document.getElementById('app-language')) document.getElementById('app-language').value = store.language || 'en';
                if (document.getElementById('date-format')) document.getElementById('date-format').value = store.dateFormat || 'dd-mm-yyyy';
                if (document.getElementById('time-format')) document.getElementById('time-format').value = store.timeFormat || '12';

                // Save initial state for "nothing changed" detection
                initialState = {
                    shopName: document.getElementById('shop-name')?.value,
                    ownerName: document.getElementById('owner-name')?.value,
                    contactInfo: document.getElementById('contact-info')?.value,
                    lowStock: parseInt(document.getElementById('low-stock-limit')?.value),
                    tax: parseFloat(document.getElementById('default-tax')?.value),
                    highStock: parseInt(document.getElementById('high-stock-limit')?.value),
                    healthyExpiry: parseInt(document.getElementById('healthy-expiry-limit')?.value),
                    notifLowStock: document.getElementById('notif-lowstock')?.checked,
                    notifUdhaar: document.getElementById('notif-udhaar')?.checked,
                    notifReminders: document.getElementById('notif-reminders')?.checked,
                    language: document.getElementById('app-language')?.value,
                    dateFormat: document.getElementById('date-format')?.value,
                    timeFormat: document.getElementById('time-format')?.value,
                };

            } else {
                console.error("[Settings] DB data indicated failure:", dbData);
            }
        } catch (e) {
            console.error("[Settings] Failed to load settings from server:", e);
            showModal('error', 'Sync Error', 'Failed to load settings from cloud. ' + e.message);
        }
    };

    window.saveProfile = async function () {
        console.log("[Settings] Saving profile...");
        const shopName = document.getElementById('shop-name').value;
        const ownerName = document.getElementById('owner-name').value;
        const contact = document.getElementById('contact-info').value;

        if (shopName === initialState.shopName && ownerName === initialState.ownerName && contact === initialState.contactInfo) {
            showModal('info', 'No Changes', 'Profile settings are already up to date.');
            return;
        }

        try {
            // 1. Update User Profile (Works for both Owner and Staff)
            const userResult = await apiRequest('/users/update-profile', {
                method: 'PATCH',
                body: JSON.stringify({ name: ownerName, phoneNumber: contact })
            });

            // 2. Update Store Details (Only for Owner)
            let storeResult = { success: true };
            if (userRole === 'owner') {
                storeResult = await apiRequest('/stores/update', {
                    method: 'PUT',
                    body: JSON.stringify({ name: shopName, phoneNumber: contact })
                });
            }

            if (userResult.success && storeResult.success) {
                // Update storage for immediate UI sync
                const updatedUser = { ...user, ...userResult.data.user };
                sessionStorage.setItem('currentUser', JSON.stringify(updatedUser));
                
                // Update UI Header (Shop Name)
                if (userRole === 'owner') {
                    const brandTexts = document.querySelectorAll('.brand-text');
                    brandTexts.forEach(el => el.textContent = shopName);
                }
                
                initialState.shopName = shopName;
                initialState.ownerName = ownerName;
                initialState.contactInfo = contact;
                
                showModal('success', 'Profile Saved', 'Credentials and shop details updated.');
            }
        } catch (err) {
            console.error("[Settings] Profile Save Error:", err);
            showModal('error', 'Update Failed', err.message);
        }
    };

    window.savePreferences = async function () {
        if (userRole !== 'owner') {
            showModal('error', 'Forbidden', 'Only owners can modify business rules.');
            return;
        }
        console.log("[Settings] Saving preferences...");
        const lowStock = parseInt(document.getElementById('low-stock-limit').value);
        const tax = parseFloat(document.getElementById('default-tax').value);

        if (lowStock === initialState.lowStock && tax === initialState.tax) {
            showModal('info', 'No Changes', 'Business preferences are already up to date.');
            return;
        }

        try {
            const result = await apiRequest('/stores/update', {
                method: 'PUT',
                body: JSON.stringify({ lowStockThreshold: lowStock, defaultTax: tax })
            });
            if (result.success) {
                initialState.lowStock = lowStock;
                initialState.tax = tax;
                showModal('success', 'Preferences Saved', 'Business rules updated.');
            }
        } catch (err) {
            showModal('error', 'Error', err.message);
        }
    };

    window.saveNotifications = async function () {
        console.log("[Settings] Saving notifications...");
        const notifLowStock = document.getElementById('notif-lowstock').checked;
        const notifUdhaar = document.getElementById('notif-udhaar').checked;
        const notifReminders = document.getElementById('notif-reminders').checked;

        if (notifLowStock === initialState.notifLowStock && notifUdhaar === initialState.notifUdhaar && notifReminders === initialState.notifReminders) {
            showModal('info', 'No Changes', 'Notification preferences are already up to date.');
            return;
        }

        try {
            // Usually global notifications are store-wide, but we allow modification if owner
            if (userRole !== 'owner') {
                 showModal('error', 'Access Denied', 'Notifications settings are global to the store.');
                 return;
            }

            const result = await apiRequest('/stores/update', {
                method: 'PUT',
                body: JSON.stringify({ 
                    notifLowStock, 
                    notifUdhaarOverdue: notifUdhaar, 
                    notifPaymentReminders: notifReminders 
                })
            });
            if (result.success) {
                initialState.notifLowStock = notifLowStock;
                initialState.notifUdhaar = notifUdhaar;
                initialState.notifReminders = notifReminders;
                showModal('success', 'Saved', 'Notifications synced.');
            }
        } catch (err) {
            showModal('error', 'Error', err.message);
        }
    };

    window.saveRegionSettings = async function () {
        if (userRole !== 'owner') {
            showModal('error', 'Access Denied', 'Region settings must be changed by the store owner.');
            return;
        }
        console.log("[Settings] Saving region settings...");
        const language = document.getElementById('app-language').value;
        const dateFormat = document.getElementById('date-format').value;
        const timeFormat = document.getElementById('time-format').value;

        if (language === initialState.language && dateFormat === initialState.dateFormat && timeFormat === initialState.timeFormat) {
            showModal('info', 'No Changes', 'Language & Region settings are already up to date.');
            return;
        }

        try {
            const result = await apiRequest('/stores/update', {
                method: 'PUT',
                body: JSON.stringify({ language, dateFormat, timeFormat })
            });
            if (result.success) {
                initialState.language = language;
                initialState.dateFormat = dateFormat;
                initialState.timeFormat = timeFormat;
                showModal('success', 'Saved', 'Region & Localization updated.');
                // Optional: Refresh page to apply formatting everywhere
                setTimeout(() => window.location.reload(), 1500);
            }
        } catch (err) {
            showModal('error', 'Error', err.message);
        }
    };

    window.saveExpirySettings = async function () {
        if (userRole !== 'owner') {
            showModal('error', 'Access Denied', 'Staff members cannot update global store thresholds.');
            return;
        }
        console.log("[Settings] Saving expiry thresholds...");
        const highStock = parseInt(document.getElementById('high-stock-limit').value);
        const healthyExpiry = parseInt(document.getElementById('healthy-expiry-limit').value);
        
        if (highStock === initialState.highStock && healthyExpiry === initialState.healthyExpiry) {
            showModal('info', 'No Changes', 'Smart Expiry settings are already up to date.');
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
                initialState.highStock = highStock;
                initialState.healthyExpiry = healthyExpiry;
                showModal('success', 'Synced', 'Store thresholds updated.');
            }
        } catch (err) {
            showModal('error', 'Sync Failed', err.message);
        }
    };

    window.changePassword = async function () {
        console.log("[Settings] Attempting password change...");
        const currentPassword = document.getElementById('current-password').value;
        const newPassword = document.getElementById('new-password').value;
        const confirmPass = document.getElementById('confirm-password').value;

        if (!currentPassword || !newPassword || !confirmPass) {
            showModal('warning', 'Missing Fields', 'All fields are required.');
            return;
        }

        if (newPassword !== confirmPass) {
            showModal('error', 'Mismatch', 'Passwords do not match.');
            return;
        }

        try {
            const result = await apiRequest('/users/change-password', {
                method: 'PATCH',
                body: JSON.stringify({ currentPassword, newPassword })
            });

            if (result.success) {
                showModal('success', 'Success', 'Password updated successfully.');
                document.getElementById('current-password').value = '';
                document.getElementById('new-password').value = '';
                document.getElementById('confirm-password').value = '';
            }
        } catch (err) {
            console.error("[Settings] Change Password Error:", err);
            showModal('error', 'Failed', err.message);
        }
    };

    window.exportData = async function () {
        showModal('info', 'Generating Backup', 'Please wait while we gather your shop data...');
        try {
            const result = await apiRequest('/stores/export-data', { method: 'GET' });
            if (result.success) {
                const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(result.data, null, 2));
                const dl = document.createElement('a');
                dl.setAttribute("href", dataStr);
                const date = new Date().toISOString().split('T')[0];
                const shopName = document.getElementById('shop-name')?.value || 'QuadStock';
                dl.setAttribute("download", `QuadStock_Backup_${shopName.replace(/\s+/g, '_')}_${date}.json`);
                dl.click();
                showModal('success', 'Backup Ready', 'Your full data backup has been downloaded.');
            }
        } catch (err) {
            showModal('error', 'Export Failed', 'Could not generate backup file.');
        }
    };

    window.clearData = function () {
        showModal('warning', 'Master Reset', 'CRITICAL: This will PERMANENTLY DELETE all products, sales, and employee data from the database. This cannot be undone. Are you absolutely sure?', async () => {
             showModal('info', 'Resetting', 'Wiping database records for this store...');
             try {
                 const result = await apiRequest('/stores/reset-data', { method: 'DELETE' });
                 if (result.success) {
                     localStorage.clear();
                     sessionStorage.clear();
                     showModal('success', 'Wipe Complete', 'All store transactional data has been removed. You will now be logged out.', () => {
                         window.location.href = '../landing/landing.html';
                     });
                 }
             } catch (err) {
                 showModal('error', 'Reset Failed', err.message);
             }
        });
    };

    // --- UI Helpers ---
    function handleRoleAccess() {
        if (userRole === 'staff') {
            const ownerOnlySections = ['data-mgmt-section', 'region-section']; 
            
            // Explicitly hide elements if they exist
            ownerOnlySections.forEach(id => {
                const el = document.getElementById(id);
                if (el) el.style.setProperty('display', 'none');
            });
            
            // Disable inputs for business rules
            const toDisable = ['low-stock-limit', 'default-tax', 'shop-name', 'high-stock-limit', 'healthy-expiry-limit'];
            toDisable.forEach(id => {
                const el = document.getElementById(id);
                if (el) {
                    el.disabled = true;
                    el.style.background = '#f1f5f9';
                    el.style.opacity = '0.7';
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
        else if (type === 'warning') { iconClass = 'fa-triangle-exclamation'; colorClass = 'warning'; }
        else if (type === 'info') { iconClass = 'fa-circle-info'; colorClass = 'info'; }

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
    };

    window.togglePassword = function (inputId, iconElement) {
        const input = document.getElementById(inputId);
        if (input.type === 'password') {
            input.type = 'text';
            iconElement.classList.replace('fa-eye', 'fa-eye-slash');
        } else {
            input.type = 'password';
            iconElement.classList.replace('fa-eye-slash', 'fa-eye');
        }
    };

    // --- Final Execution ---
    window.loadSettings();
    handleRoleAccess();
});
