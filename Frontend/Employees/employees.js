import CONFIG from '../Shared/Utils/config.js';

document.addEventListener('DOMContentLoaded', () => {

    // --- 1. Authentication & Context ---
    const ctx = window.authContext;
    if (!ctx || !ctx.isAuthenticated) {
        window.location.href = '../Authentication/login.html';
        return;
    }

    const { role: userRole, ownerRefId: currentOwnerId, token } = ctx;
    
    // API Configuration
    const API_BASE = CONFIG.API_BASE_URL;
    const HEADERS = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };

    // --- 3. Data Handling ---
    let ownerEmployees = [];
    let cropper = null;
    let croppedBlob = null;

    const grid = document.getElementById('employee-grid');
    const searchInput = document.getElementById('employee-search');

    async function fetchEmployees(showToast = false) {
        try {
            const response = await fetch(`${API_BASE}/employees`, { headers: HEADERS });
            const result = await response.json();
            
            if (result.success) {
                ownerEmployees = result.data;
                
                // Re-apply search filter if currently active
                if (searchInput && searchInput.value.trim() !== '') {
                    const query = searchInput.value.toLowerCase();
                    const filtered = ownerEmployees.filter(emp => 
                        emp.name.toLowerCase().includes(query) || 
                        emp.username.toLowerCase().includes(query) ||
                        (emp.empId && emp.empId.toLowerCase().includes(query))
                    );
                    renderEmployees(filtered);
                } else {
                    renderEmployees(ownerEmployees);
                }
                
                updateStats();
            } else if (showToast) {
                QuadModals.showToast(result.message || "Failed to fetch employees", "error");
            }
        } catch (error) {
            console.error("Fetch error:", error);
            if (showToast) QuadModals.showToast("Network error while loading employees", "error");
        }
    }

    function updateStats() {
        const total = ownerEmployees.length;
        const present = ownerEmployees.filter(e => e.status === 'active' || e.status === 'working').length;
        const onBreak = ownerEmployees.filter(e => e.status === 'break').length;
        const absent = total - present - onBreak;

        document.getElementById('stat-total').textContent = total;
        document.getElementById('stat-present').textContent = present;
        document.getElementById('stat-absent').textContent = absent;
        document.getElementById('stat-break').textContent = onBreak;
    }

    function renderEmployees(dataToRender) {
        grid.innerHTML = '';

        if (dataToRender.length === 0) {
            grid.innerHTML = `<div class="p-8 text-center text-muted col-span-full" style="grid-column: 1 / -1; padding: 4rem;">No employees found. Add one to get started.</div>`;
            return;
        }

        dataToRender.forEach(emp => {
            const card = document.createElement('div');
            card.className = 'employee-card';
            card.dataset.id = emp._id;

            // Status Logic
            let statusClass = 'status-offline';
            let statusText = (emp.status || 'offline').toLowerCase();

            if (emp.isBlocked) {
                statusClass = 'status-absent';
                statusText = 'blocked';
            } else {
                if (statusText === 'active' || statusText === 'working' || statusText === 'present') statusClass = 'status-active';
                else if (statusText === 'break') statusClass = 'status-break';
                else if (statusText === 'holiday' || statusText === 'leave') statusClass = 'status-holiday';
                else if (statusText === 'absent' || statusText === 'offline') statusClass = 'status-absent';
                else if (statusText === 'pending') statusClass = 'status-pending';
            }

            const initials = emp.name.split(' ').map(n => n[0]).join('').toUpperCase();
            const avatarHtml = emp.photo
                ? `<img src="${emp.photo}" class="avatar-img">`
                : `<div class="avatar">${initials}</div>`;

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
                        <span class="detail-label">Username</span>
                        <span>${emp.username}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Phone</span>
                        <span>${emp.phoneNumber || 'N/A'}</span>
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
                </div>

                <div class="card-actions">
                    <button class="action-btn btn-view-profile" style="background: var(--bg-light); color: var(--primary);" title="View Staff 360"><i class="fa-solid fa-id-card"></i> Profile</button>
                    ${userRole === 'owner' ? `
                        <button class="action-btn btn-delete" title="Remove Employee"><i class="fa-solid fa-trash"></i></button>
                    ` : ''}
                </div>
            `;

            card.querySelector('.btn-view-profile').addEventListener('click', () => openStaffDetail(emp._id));
            
            const btnDel = card.querySelector('.btn-delete');
            if (btnDel) btnDel.addEventListener('click', () => deleteEmployee(emp._id, emp.name));

            grid.appendChild(card);
        });
    }

    // --- Search Logic ---
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase();
            const filtered = ownerEmployees.filter(emp => 
                emp.name.toLowerCase().includes(query) || 
                emp.username.toLowerCase().includes(query) ||
                (emp.empId && emp.empId.toLowerCase().includes(query))
            );
            renderEmployees(filtered);
        });
    }

    // --- 4. Add Employee Logic ---
    const modal = document.getElementById('modal-overlay');
    const btnAdd = document.getElementById('btn-add-employee');
    const btnCancel = document.getElementById('btn-cancel');
    const form = document.getElementById('add-employee-form');

    if (btnAdd) {
        btnAdd.addEventListener('click', () => {
            if (userRole !== 'owner') {
                QuadModals.alert("Access Denied", "Only Owners can add employees.", "error");
                return;
            }
            modal.classList.add('active');
        });
    }

    if (btnCancel) {
        btnCancel.addEventListener('click', () => {
            modal.classList.remove('active');
        });
    }

    // --- Aadhaar Formatting ---
    const aadhaarInput = document.getElementById('emp-aadhaar');
    if (aadhaarInput) {
        aadhaarInput.addEventListener('input', (e) => {
            let val = e.target.value.replace(/\D/g, '').substring(0, 12);
            const formatted = val.match(/.{1,4}/g)?.join(' ') || val;
            e.target.value = formatted;
        });
    }

    // --- Phone Number Validation ---
    const phoneInput = document.getElementById('emp-phone');
    if (phoneInput) {
        phoneInput.addEventListener('input', (e) => {
            let val = e.target.value.replace(/\D/g, '').substring(0, 10);
            e.target.value = val;
        });
    }

    // --- Cropper Logic ---
    const cropperModal = document.getElementById('cropper-modal');
    const cropperImage = document.getElementById('cropper-image');
    let currentCropperCallback = null;
    
    window.openCropper = (file, callback) => {
        if (!file) return;
        currentCropperCallback = callback;

        const reader = new FileReader();
        reader.onload = (event) => {
            cropperImage.src = event.target.result;
            cropperModal.classList.add('active');
            
            if (cropper) cropper.destroy();
            
            cropper = new Cropper(cropperImage, {
                aspectRatio: 1,
                viewMode: 2,
                dragMode: 'move',
                background: false,
                autoCropArea: 1,
                checkOrientation: false
            });
        };
        reader.readAsDataURL(file);
    };

    // Listen for New Employee Photo
    const photoInput = document.getElementById('emp-photo');
    photoInput?.addEventListener('change', (e) => {
        const file = e.target.files[0];
        window.openCropper(file, (blob) => {
            croppedBlob = blob;
        });
    });

    // Cropper Controls
    document.getElementById('crop-rotate-left')?.addEventListener('click', () => cropper?.rotate(-90));
    document.getElementById('crop-rotate-right')?.addEventListener('click', () => cropper?.rotate(90));
    document.getElementById('crop-zoom-in')?.addEventListener('click', () => cropper?.zoom(0.1));
    document.getElementById('crop-zoom-out')?.addEventListener('click', () => cropper?.zoom(-0.1));
    document.getElementById('crop-reset')?.addEventListener('click', () => cropper?.reset());

    document.getElementById('btn-cancel-crop')?.addEventListener('click', () => {
        cropperModal.classList.remove('active');
        if (currentCropperCallback === croppedBlob) {
             photoInput.value = ''; 
        }
        currentCropperCallback = null;
    });

    document.getElementById('btn-save-crop')?.addEventListener('click', () => {
        if (!cropper) return;
        
        cropper.getCroppedCanvas({
            width: 500,
            height: 500
        }).toBlob((blob) => {
            if (currentCropperCallback) currentCropperCallback(blob);
            cropperModal.classList.remove('active');
            QuadModals.showToast("Image adjusted successfully!", "success");
        }, 'image/jpeg', 0.9);
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        if (userRole !== 'owner') {
            QuadModals.alert("Access Denied", "Only Owners can add employees.", "error");
            return;
        }

        const submitBtn = form.querySelector('button[type="submit"]');
        const originalBtnText = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Processing...';
        
        const phone = document.getElementById('emp-phone').value;
        const salary = Number(document.getElementById('emp-salary').value);

        if (phone.length !== 10) {
            QuadModals.alert("Invalid Input", "Phone number must be exactly 10 digits.", "warning");
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalBtnText;
            return;
        }

        if (salary < 0) {
            QuadModals.alert("Invalid Input", "Salary cannot be negative.", "warning");
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalBtnText;
            return;
        }

        const formData = new FormData();
        formData.append('name', document.getElementById('emp-name').value);
        formData.append('email', document.getElementById('emp-email').value);
        formData.append('password', document.getElementById('emp-password').value.trim() || "123456");
        formData.append('phoneNumber', phone);
        formData.append('aadhaar', document.getElementById('emp-aadhaar').value);
        formData.append('address', document.getElementById('emp-address').value);
        formData.append('emergencyContact', document.getElementById('emp-emergency').value);
        formData.append('role', document.getElementById('emp-role').value);
        formData.append('salary', salary);

        const photoInput = document.getElementById('emp-photo');
        if (croppedBlob) {
            formData.append('photo', croppedBlob, 'employee_photo.jpg');
        } else if (photoInput && photoInput.files[0]) {
            formData.append('photo', photoInput.files[0]);
        }

        try {
            const response = await fetch(`${API_BASE}/employees`, {
                method: 'POST',
                headers: {
                    'Authorization': HEADERS.Authorization
                },
                body: formData
            });
            const result = await response.json();

            if (result.success) {
                QuadModals.showToast("Employee added successfully!", "success");
                form.reset();
                croppedBlob = null;
                modal.classList.remove('active');
                fetchEmployees();
            } else {
                QuadModals.alert("Failed to Add", result.message || "Something went wrong", "error");
            }
        } catch (error) {
            console.error("Submission error:", error);
            QuadModals.showToast("Network error while adding employee", "error");
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalBtnText;
        }
    });

    // --- 5. Global Actions ---
    async function deleteEmployee(id, name) {
        const confirmed = await QuadModals.confirm(
            "Remove Employee",
            `Are you sure you want to remove ${name}? This action cannot be undone.`,
            { isDanger: true, confirmText: 'Remove' }
        );

        if (!confirmed) return;

        try {
            const response = await fetch(`${API_BASE}/employees/${id}`, {
                method: 'DELETE',
                headers: HEADERS
            });
            const result = await response.json();

            if (result.success) {
                QuadModals.showToast("Employee removed successfully", 'info');
                fetchEmployees();
            } else {
                QuadModals.showToast(result.message || "Failed to remove employee", "error");
            }
        } catch (error) {
            console.error("Delete error:", error);
            QuadModals.showToast("Network error while removing employee", "error");
        }
    }

    // --- 6. Profile Detail Logic ---
    // Initialize staff_details module
    if (typeof initStaffDetails === 'function') {
        initStaffDetails(API_BASE, HEADERS, userRole);
    }

    window.openStaffDetail = (id) => {
        const emp = ownerEmployees.find(e => e._id === id);
        if (!emp) return;
        
        if (typeof showStaffDetails === 'function') {
            showStaffDetails(emp);
        } else {
            QuadModals.showToast("Profile details module not loaded", "error");
        }
    };

    window.refreshEmployeeList = () => fetchEmployees(false);

    // Init
    fetchEmployees(true); // Initial fetch with toasts enabled

    // Start Real-time Data Sync (Background Polling every 5 minutes)
    setInterval(() => fetchEmployees(false), 300000); 
});

