import CONFIG from '../Shared/Utils/config.js';
import { apiRequest } from '../Shared/Utils/api.js';
const LocService = window.LocService;



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
                if (document.getElementById('gst-number')) document.getElementById('gst-number').value = store.gstNumber || '';
                if (document.getElementById('store-email')) document.getElementById('store-email').value = store.email || '';
                if (document.getElementById('store-address')) document.getElementById('store-address').value = store.address || '';
                if (document.getElementById('logo-url')) {
                    document.getElementById('logo-url').value = store.logoUrl || '';
                    if (store.logoUrl) {
                        const preview = document.getElementById('logo-preview');
                        const container = document.getElementById('logo-preview-container');
                        const filename = document.getElementById('logo-filename');
                        preview.src = store.logoUrl;
                        filename.textContent = 'Current Logo';
                        container.style.display = 'flex';
                    }
                }
                if (document.getElementById('static-qr-url')) {
                    document.getElementById('static-qr-url').value = store.staticQrUrl || '';
                    if (store.staticQrUrl) {
                        const preview = document.getElementById('qr-preview');
                        const container = document.getElementById('qr-preview-container');
                        const filename = document.getElementById('qr-filename');
                        preview.src = store.staticQrUrl;
                        filename.textContent = 'Current QR';
                        container.style.display = 'flex';
                    }
                }
                if (document.getElementById('store-terms')) document.getElementById('store-terms').value = store.storeTerms || '';
                if (document.getElementById('upi-id')) document.getElementById('upi-id').value = store.upiId || '';
                
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
                if (document.getElementById('app-language')) {
                    document.getElementById('app-language').value = store.language || 'en';
                    document.getElementById('app-language').addEventListener('change', (e) => LocService.setLanguage(e.target.value));
                }
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
                    gstNumber: document.getElementById('gst-number')?.value,
                    logoUrl: document.getElementById('logo-url')?.value,
                    storeTerms: document.getElementById('store-terms')?.value,
                    upiId: document.getElementById('upi-id')?.value,
                    email: document.getElementById('store-email')?.value,
                    address: document.getElementById('store-address')?.value,
                    staticQrUrl: document.getElementById('static-qr-url')?.value,
                };

                // Subscription UI Update
                updateSubscriptionUI(store);
                LocService.applyTranslations();

            } else {
                console.error("[Settings] DB data indicated failure:", dbData);
            }
        } catch (e) {
            console.error("[Settings] Failed to load settings from server:", e);
            showModal('error', 'Sync Error', 'Failed to load settings from cloud. ' + e.message);
        }
    };

    function updateSubscriptionUI(store) {
        const plan = store.subscriptionPlan || 'free';
        const status = store.subscriptionStatus || 'active';
        const expiry = store.subscriptionExpiry;

        const currentPlanBadge = document.getElementById('current-plan-badge');
        const currentPlanName = document.getElementById('current-plan-name');
        const planExpiryText = document.getElementById('plan-expiry-text');
        
        const limitProducts = document.getElementById('limit-products');
        const limitStaff = document.getElementById('limit-staff');
        const barProducts = document.getElementById('bar-products');
        const barStaff = document.getElementById('bar-staff');

        // Plan Labels
        const plans = {
            free: { name: 'Digital Bharat', limitP: 100, limitS: 1, color: '#64748b' },
            pro: { name: 'Vyapaar Pro', limitP: 1000000, limitS: 5, color: '#f97316' },
            enterprise: { name: 'Empire Elite', limitP: 1000000, limitS: 1000000, color: '#3b82f6' }
        };

        const activePlan = plans[plan];
        if (currentPlanBadge) {
            currentPlanBadge.textContent = plan.toUpperCase();
            currentPlanBadge.style.background = activePlan.color;
        }
        if (currentPlanName) currentPlanName.textContent = activePlan.name;

        // Expiry calc
        if (planExpiryText) {
            if (plan === 'free') {
                planExpiryText.textContent = "Plan never expires";
            } else {
                const date = new Date(expiry);
                planExpiryText.textContent = `Expires on ${date.toLocaleDateString()}`;
                if (new Date() > date) {
                    planExpiryText.textContent = "Plan Expired";
                    planExpiryText.style.color = '#ef4444';
                }
            }
        }

        // Feature Limits
        const pCount = store.productCount || 0;
        const sCount = store.employeeCount || 0;

        if (limitProducts) limitProducts.textContent = `${pCount} / ${activePlan.limitP > 10000 ? 'Unlimited' : activePlan.limitP}`;
        if (limitStaff) limitStaff.textContent = `${sCount} / ${activePlan.limitS > 10000 ? 'Unlimited' : activePlan.limitS}`;

        if (barProducts) barProducts.style.width = Math.min((pCount / activePlan.limitP) * 100, 100) + '%';
        if (barStaff) barStaff.style.width = Math.min((sCount / activePlan.limitS) * 100, 100) + '%';
    }

    window.saveProfile = async function () {
        const saveBtn = document.querySelector('button[onclick="saveProfile()"]');
        if (saveBtn?.classList.contains('loading')) return;

        console.log("[Settings] Saving profile...");
        
        const originalBtnText = saveBtn ? saveBtn.innerHTML : 'Save Profile';
        if (saveBtn) {
            saveBtn.classList.add('loading');
            saveBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';
            saveBtn.disabled = true;
        }

        try {
            const shopName = document.getElementById('shop-name')?.value || '';
            const ownerName = document.getElementById('owner-name')?.value || '';
            const contact = document.getElementById('contact-info')?.value || '';
            const gstNumber = document.getElementById('gst-number')?.value || '';
            const logoUrl = document.getElementById('logo-url')?.value || '';
            const storeTerms = document.getElementById('store-terms')?.value || '';
            const upiId = document.getElementById('upi-id')?.value || '';
            const storeEmail = document.getElementById('store-email')?.value || '';
            const storeAddress = document.getElementById('store-address')?.value || '';
            const staticQrUrl = document.getElementById('static-qr-url')?.value || '';

            if (shopName === initialState.shopName && ownerName === initialState.ownerName && 
                contact === initialState.contactInfo && gstNumber === initialState.gstNumber &&
                logoUrl === initialState.logoUrl && storeTerms === initialState.storeTerms &&
                upiId === initialState.upiId && storeEmail === initialState.email && 
                storeAddress === initialState.address && staticQrUrl === initialState.staticQrUrl) {
                
                // No changes, just return silently
                return;
            }


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
                    body: JSON.stringify({ 
                        name: shopName, 
                        phoneNumber: contact, 
                        gstNumber: gstNumber,
                        logoUrl: logoUrl,
                        storeTerms: storeTerms,
                        upiId: upiId,
                        email: storeEmail,
                        address: storeAddress,
                        staticQrUrl: staticQrUrl
                    })
                });
            }

            if (userResult.success && storeResult.success) {
                // Update storage for immediate UI sync
                const updatedUser = { ...user, ...userResult.data.user };
                
                // Update store details in sessionStorage
                if (userRole === 'owner' && storeResult.data.store) {
                    updatedUser.storeId = { ...updatedUser.storeId, ...storeResult.data.store };
                }
                
                sessionStorage.setItem('currentUser', JSON.stringify(updatedUser));
                
                // Update UI Header (Shop Name)
                if (userRole === 'owner') {
                    const brandTexts = document.querySelectorAll('.brand-text');
                    brandTexts.forEach(el => el.textContent = shopName);
                }
                
                initialState = {
                    ...initialState,
                    shopName, ownerName, contactInfo: contact, gstNumber, 
                    logoUrl, storeTerms, upiId, email: storeEmail, 
                    address: storeAddress, staticQrUrl
                };
                
                QuadModals.showToast('Profile settings updated successfully', 'success');
            }

        } catch (err) {
            console.error("[Settings] Profile Save Error:", err);
            showModal('error', 'Update Failed', err.message);
        } finally {
            if (saveBtn) {
                saveBtn.classList.remove('loading');
                saveBtn.innerHTML = originalBtnText;
                saveBtn.disabled = false;
            }
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
            return;
        }


        try {
            const result = await apiRequest('/stores/update', {
                method: 'PUT',
                body: JSON.stringify({ language, dateFormat, timeFormat })
            });
            if (result.success) {
                // Update Local Storage for instant UI reflection
                localStorage.setItem('language', language);
                localStorage.setItem('dateFormat', dateFormat);
                localStorage.setItem('timeFormat', timeFormat);

                // Update LocService state
                if (window.LocService) {
                    window.LocService.settings.language = language;
                    window.LocService.settings.dateFormat = dateFormat;
                    window.LocService.settings.timeFormat = timeFormat;
                    window.LocService.applyTranslations();
                }

                // Trigger storage event for sidebar clock to update instantly
                window.dispatchEvent(new Event('storage'));

                initialState.language = language;
                initialState.dateFormat = dateFormat;
                initialState.timeFormat = timeFormat;
                
                showModal('success', 'Saved', 'Region & Localization updated.');
                
                // Optional: Refresh page after a short delay to ensure all modules are fully synced
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
        showModal('warning', 'Hard Reset Account', 'CRITICAL: This will PERMANENTLY DELETE your entire account, your store, and all associated data (Staff, Products, Sales). You will lose everything and cannot log back in. Are you absolutely sure?', async () => {
             showModal('info', 'Deleting Account', 'Wiping every record from our database...');
             try {
                 const result = await apiRequest('/stores/reset-data', { method: 'DELETE' });
                 if (result.success) {
                     localStorage.clear();
                     sessionStorage.clear();
                     showModal('success', 'Footprint Wiped', 'Your account and store data have been permanently removed. Thank you for using QuadStock.', () => {
                         window.location.href = '../landing/landing.html';
                     });
                 }
             } catch (err) {
                 showModal('error', 'Wipe Failed', err.message);
             }
        });
    };

    // --- UI Helpers ---
    function handleRoleAccess() {
        if (userRole === 'staff') {
            const ownerOnlySections = ['data-mgmt', 'region', 'preferences', 'expiry', 'notifications']; 
            
            // Explicitly hide elements if they exist
            ownerOnlySections.forEach(id => {
                const el = document.getElementById(id);
                if (el) el.style.setProperty('display', 'none', 'important');
                
                // Also hide the nav items
                const navItem = document.querySelector(`.nav-item[href="#${id}"]`);
                if (navItem) navItem.style.setProperty('display', 'none', 'important');
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

    window.handleLogoUpload = function (input) {
        const file = input.files[0];
        if (!file) return;

        // Limit 5MB
        if (file.size > 5 * 1024 * 1024) {
            showModal('error', 'File Too Large', 'Logo size must be less than 5MB.');
            input.value = '';
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            const base64 = e.target.result;
            document.getElementById('logo-url').value = base64;
            document.getElementById('logo-preview').src = base64;
            document.getElementById('logo-filename').textContent = file.name;
            document.getElementById('logo-preview-container').style.display = 'flex';
            document.getElementById('upload-status').textContent = 'Logo ready to save.';
        };
        reader.readAsDataURL(file);
    };

    window.removeUploadedLogo = function () {
        document.getElementById('logo-url').value = '';
        document.getElementById('logo-upload').value = '';
        document.getElementById('logo-preview-container').style.display = 'none';
        document.getElementById('upload-status').textContent = 'Logo removed. Click save to apply.';
    };

    window.handleQrUpload = function (input) {
        const file = input.files[0];
        if (!file) return;

        if (file.size > 5 * 1024 * 1024) {
            showModal('error', 'File Too Large', 'QR size must be less than 5MB.');
            input.value = '';
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            const base64 = e.target.result;
            document.getElementById('static-qr-url').value = base64;
            document.getElementById('qr-preview').src = base64;
            document.getElementById('qr-filename').textContent = file.name;
            document.getElementById('qr-preview-container').style.display = 'flex';
            document.getElementById('qr-upload-status').textContent = 'QR ready to save.';
        };
        reader.readAsDataURL(file);
    };

    window.removeUploadedQr = function () {
        document.getElementById('static-qr-url').value = '';
        document.getElementById('qr-upload').value = '';
        document.getElementById('qr-preview-container').style.display = 'none';
        document.getElementById('qr-upload-status').textContent = 'QR removed. Click save to apply.';
    };

    // --- Navigation Logic ---
    const navItems = document.querySelectorAll('.nav-item');
    const sections = document.querySelectorAll('.settings-section');

    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = item.getAttribute('href').slice(1);
            
            // Update Active Nav
            navItems.forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');

            // Scroll to Section
            const targetSection = document.getElementById(targetId);
            if (targetSection) {
                targetSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    });

    window.closeModal = closeModal;


    // --- Final Execution ---
    LocService.init().then(() => {
        LocService.applyTranslations();
        window.loadSettings();
    });
    handleRoleAccess();
});

