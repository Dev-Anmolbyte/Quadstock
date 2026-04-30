import { apiRequest } from '../Shared/Utils/api.js';

document.addEventListener('DOMContentLoaded', async () => {
    const ctx = window.authContext;
    if (!ctx || !ctx.isAuthenticated) return;

    const { role, user } = ctx;
    let leaves = [];
    let currentFilter = 'all';

    // --- DOM Elements ---
    const leavesList = document.getElementById('leaves-list');
    const staffOnlyActions = document.getElementById('staff-only-actions');
    const applyBtn = document.getElementById('btn-apply-leave');
    const leaveModal = document.getElementById('leave-modal');
    const statusModal = document.getElementById('status-modal');
    const leaveForm = document.getElementById('leave-form');
    const statusForm = document.getElementById('status-form');
    const filterBtns = document.querySelectorAll('.filter-btn');
    const searchInput = document.getElementById('search-leaves');

    // --- Stats Elements ---
    const statPending = document.getElementById('stat-pending');
    const statApproved = document.getElementById('stat-approved');
    const statRejected = document.getElementById('stat-rejected');

    // --- Role Based UI ---
    if (role === 'owner') {
        staffOnlyActions.style.display = 'none';
        document.querySelector('.page-subtitle').textContent = 'Review and manage staff leave applications';
    }

    // --- Initialization ---
    await fetchLeaves();

    // --- Core Functions ---
    async function fetchLeaves() {
        try {
            const endpoint = role === 'owner' ? '/leave/admin/all' : '/leave/';
            const res = await apiRequest(endpoint);
            if (res.success) {
                leaves = res.data || [];
                renderLeaves();
                updateStats();
            }
        } catch (err) {
            console.error('Error fetching leaves:', err);
        }
    }

    function renderLeaves() {
        let filtered = leaves;
        
        // Filter by status
        if (currentFilter !== 'all') {
            filtered = filtered.filter(l => l.status === currentFilter);
        }

        // Filter by search
        const search = searchInput.value.toLowerCase();
        if (search) {
            filtered = filtered.filter(l => {
                const reason = l.reason?.toLowerCase() || '';
                const staffName = l.employeeId?.name?.toLowerCase() || '';
                return reason.includes(search) || staffName.includes(search);
            });
        }

        if (filtered.length === 0) {
            leavesList.innerHTML = `
                <div class="empty-state" style="padding: 4rem; text-align: center; opacity: 0.6;">
                    <i class="fa-solid fa-calendar-day" style="font-size: 3rem; margin-bottom: 1rem; display: block;"></i>
                    <p>No leave records found.</p>
                </div>
            `;
            return;
        }

        leavesList.innerHTML = filtered.map(l => {
            const start = new Date(l.startDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
            const end = new Date(l.endDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
            const staffName = l.employeeId?.name || 'Staff Member';
            const avatar = staffName.charAt(0).toUpperCase();

            return `
                <div class="leave-card" data-id="${l._id}">
                    <div class="staff-info">
                        <div class="staff-avatar">${avatar}</div>
                        <div class="staff-details">
                            <h4>${staffName}</h4>
                            <p>${l.employeeId?.designation || 'Staff'}</p>
                        </div>
                    </div>
                    <div class="leave-details">
                        <div class="leave-reason">"${l.reason}"</div>
                        <div class="leave-dates">
                            <span><i class="fa-solid fa-calendar-alt"></i> ${start} - ${end}</span>
                        </div>
                        ${l.adminNote ? `
                            <div style="margin-top: 0.5rem; font-size: 0.75rem; color: var(--text-muted); background: var(--bg-soft); padding: 0.4rem 0.8rem; border-radius: 8px;">
                                <strong style="color: var(--primary);">Note:</strong> ${l.adminNote}
                            </div>
                        ` : ''}
                    </div>
                    <div class="leave-status">
                        <span class="status-badge status-${l.status}">${l.status}</span>
                    </div>
                    ${role === 'owner' && l.status === 'pending' ? `
                        <button class="review-btn" onclick="openReviewModal('${l._id}')">Review Request</button>
                    ` : ''}
                </div>
            `;
        }).join('');
    }

    function updateStats() {
        const stats = {
            pending: leaves.filter(l => l.status === 'pending').length,
            approved: leaves.filter(l => l.status === 'approved').length,
            rejected: leaves.filter(l => l.status === 'rejected').length
        };

        statPending.textContent = stats.pending;
        statApproved.textContent = stats.approved;
        statRejected.textContent = stats.rejected;
    }

    // --- Modal Functions ---
    window.openReviewModal = (id) => {
        const leave = leaves.find(l => l._id === id);
        if (!leave) return;

        document.getElementById('target-leave-id').value = id;
        document.getElementById('request-preview').innerHTML = `
            <div style="font-weight: 800; margin-bottom: 0.5rem; color: var(--text-main);">${leave.employeeId?.name || 'Staff'}</div>
            <div style="font-size: 0.9rem; color: var(--text-muted); margin-bottom: 0.8rem; display: flex; align-items: center; gap: 0.5rem;">
                <i class="fa-solid fa-calendar-days"></i>
                ${new Date(leave.startDate).toLocaleDateString()} to ${new Date(leave.endDate).toLocaleDateString()}
            </div>
            <div style="font-style: italic; border-left: 3px solid var(--primary); padding: 0.5rem 1rem; background: var(--bg-card); border-radius: 0 12px 12px 0;">"${leave.reason}"</div>
        `;
        statusModal.classList.add('visible');
    };

    // --- Event Listeners ---
    if (applyBtn) {
        applyBtn.addEventListener('click', () => {
            // Set min date for start date to today
            const today = new Date().toISOString().split('T')[0];
            document.getElementById('startDate').setAttribute('min', today);
            leaveModal.classList.add('visible');
        });
    }

    // Date validation
    const startDateInput = document.getElementById('startDate');
    const endDateInput = document.getElementById('endDate');
    
    if (startDateInput && endDateInput) {
        startDateInput.addEventListener('change', () => {
            endDateInput.setAttribute('min', startDateInput.value);
        });
    }

    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.addEventListener('click', () => {
            leaveModal.classList.remove('visible');
            statusModal.classList.remove('visible');
        });
    });

    // Handle Leave Application
    leaveForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const start = new Date(document.getElementById('startDate').value);
        const end = new Date(document.getElementById('endDate').value);
        
        if (end < start) {
            QuadModals.alert('Invalid Dates', 'End date cannot be before start date.', 'warning');
            return;
        }

        const formData = {
            startDate: document.getElementById('startDate').value,
            endDate: document.getElementById('endDate').value,
            reason: document.getElementById('reason').value
        };

        try {
            const res = await apiRequest('/leave/', 'POST', formData);
            if (res.success) {
                QuadModals.alert('Success', 'Leave request submitted successfully!', 'success');
                leaveModal.classList.remove('visible');
                leaveForm.reset();
                await fetchLeaves();
            } else {
                QuadModals.alert('Error', res.message || 'Submission failed', 'error');
            }
        } catch (err) {
            QuadModals.alert('Error', 'Network error. Please try again.', 'error');
        }
    });

    // Handle Status Update (Approve/Reject)
    document.querySelectorAll('.btn-approve, .btn-reject').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const status = e.target.dataset.status;
            const id = document.getElementById('target-leave-id').value;
            const adminNote = document.getElementById('adminNote').value;

            try {
                const res = await apiRequest(`/leave/${id}/status`, 'PATCH', { status, adminNote });
                if (res.success) {
                    QuadModals.alert('Updated', `Request ${status} successfully`, 'success');
                    statusModal.classList.remove('visible');
                    document.getElementById('adminNote').value = '';
                    await fetchLeaves();
                }
            } catch (err) {
                QuadModals.alert('Error', 'Failed to update status', 'error');
            }
        });
    });

    // Filters
    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentFilter = btn.dataset.status;
            renderLeaves();
        });
    });

    // Search
    searchInput.addEventListener('input', renderLeaves);
});
