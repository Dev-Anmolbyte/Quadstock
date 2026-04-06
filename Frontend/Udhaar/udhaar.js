import CONFIG from '../Shared/Utils/config.js';
import { apiRequest } from '../Shared/Utils/api.js';


document.addEventListener('DOMContentLoaded', async () => {
    // --- Authentication & Context ---
    const ctx = window.authContext;
    if (!ctx || !ctx.isAuthenticated) {
        window.location.href = '../Authentication/login.html';
        return;
    }

    const { role: userRole, ownerRefId: currentOwnerId, user } = ctx;

    // --- State & Constants ---
    let udhaarList = [];
    let isEditingRecord = false;
    let editingRecordId = null;

    async function refreshUdhaarData() {
        try {
            const result = await apiRequest('/udhaar/');
            if (result.success) {
                udhaarList = result.data || [];
                renderTable();
                updateStats();
            }
        } catch (err) {

            console.error("Fetch Udhaar Error:", err);
        }
    }

    // DOM Elements
    const udhaarTableBody = document.getElementById('udhaar-table-body');
    const totalAmountEl = document.getElementById('total-udhaar-amount');
    const pendingCountEl = document.getElementById('pending-count');
    const searchInput = document.getElementById('search-udhaar');
    const modal = document.getElementById('add-udhaar-modal');
    const addBtn = document.getElementById('btn-add-udhaar');
    const closeBtns = document.querySelectorAll('.close-modal');
    const form = document.getElementById('udhaar-form');
    const dateInput = document.getElementById('u-date');

    // Set default date to today
    if (dateInput) {
        dateInput.valueAsDate = new Date();
    }

    // Live Preview for Modal
    const amountInput = document.getElementById('u-amount');
    const previewTotalEl = document.getElementById('preview-new-total');
    const previewCountEl = document.getElementById('preview-new-count');

    function updateModalPreview() {
        if (!amountInput || !previewTotalEl || !previewCountEl) return;
        
        const currentTotal = udhaarList.reduce((sum, item) => sum + item.balance, 0);
        const addedAmount = parseFloat(amountInput.value) || 0;
        const newTotal = currentTotal + addedAmount;
        
        previewTotalEl.textContent = formatCurrency(newTotal);
        previewCountEl.textContent = `+1 (${udhaarList.length + 1} total)`;
        
        // Add a little highlight effect
        previewTotalEl.style.color = addedAmount > 0 ? 'var(--primary)' : 'var(--text-main)';
    }

    if (amountInput) {
        amountInput.addEventListener('input', updateModalPreview);
    }

    // Contact Number Restriction (Only Numbers, Max 10)
    const contactInput = document.getElementById('u-contact');
    if (contactInput) {
        contactInput.addEventListener('input', (e) => {
            e.target.value = e.target.value.replace(/[^0-9]/g, '').slice(0, 10);
        });

        // Also validate on blur for user feedback
        contactInput.addEventListener('blur', (e) => {
            if (e.target.value.length > 0 && e.target.value.length < 10) {
                // Subtle validation instead of alert
                contactInput.style.borderColor = '#ef4444';
            } else {
                contactInput.style.borderColor = '';
            }
        });
    }

    // Initial Render
    renderTable();
    updateStats();

    // Modal Events
    addBtn.addEventListener('click', () => {
        isEditingRecord = false;
        editingRecordId = null;
        form.reset();
        if (dateInput) dateInput.valueAsDate = new Date();
        document.getElementById('u-amount').setAttribute('required', 'required');
        document.getElementById('amount-group').style.display = 'block';
        document.getElementById('modal-summary-preview').style.display = 'flex';
        modal.querySelector('h2').textContent = 'Add Udhaar Record';
        form.querySelector('.btn-submit').innerHTML = '<i class="fa-solid fa-save"></i> Save Record';
        
        modal.classList.add('active');
        updateModalPreview(); // Initial preview
    });

    window.editRecord = (id) => {
        const record = udhaarList.find(r => r._id === id);
        if (!record) return;

        isEditingRecord = true;
        editingRecordId = id;
        
        // Populate
        document.getElementById('u-name').value = record.name;
        document.getElementById('u-contact').value = record.contact || '';
        document.getElementById('u-amount').value = record.totalAmount;
        document.getElementById('u-amount').setAttribute('required', 'required');
        document.getElementById('u-date').value = record.date ? record.date.split('T')[0] : '';
        document.getElementById('u-due-date').value = record.dueDate ? record.dueDate.split('T')[0] : '';
        document.getElementById('u-desc').value = record.transactions?.[0]?.description || '';

        // UI Adjustments
        document.getElementById('amount-group').style.display = 'block'; // Keep it visible for adjustment
        document.getElementById('modal-summary-preview').style.display = 'none';
        modal.querySelector('h2').textContent = 'Edit Record Details';
        form.querySelector('.btn-submit').innerHTML = '<i class="fa-solid fa-save"></i> Update Record';

        modal.classList.add('active');
    };

    closeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            modal.classList.remove('active');
        });
    });

    window.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.remove('active');
        }
        // Details Modal Outside Click handled inside its creator or via global listener below
        const detailsModal = document.getElementById('udhaarHistoryModal');
        if (detailsModal && e.target === detailsModal) {
            detailsModal.classList.remove('active');
        }
    });

    // Form Submit (Add or Edit Record)
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const name = document.getElementById('u-name').value;
        const contact = document.getElementById('u-contact').value;
        const date = document.getElementById('u-date').value;
        const dueDate = document.getElementById('u-due-date').value;
        const note = document.getElementById('u-desc').value;

        if (!dueDate) {
            QuadModals.alert("Selection Missing", "Please select an Expected Payment Date.", "warning");
            return;
        }
        if (contact && contact.length !== 10) {
            QuadModals.alert("Invalid Data", "Contact number must be exactly 10 digits.", "warning");
            return;
        }

        if (isEditingRecord) {
            // --- UPDATE Mode ---
            try {
                const updateData = {
                    name,
                    contact,
                    date,
                    dueDate,
                    totalAmount: parseFloat(document.getElementById('u-amount').value),
                    description: note
                };

                const result = await apiRequest(`/udhaar/${editingRecordId}`, {
                    method: 'PUT',
                    body: JSON.stringify(updateData)
                });

                if (result.success) {
                    QuadModals.showToast("Record Updated Successfully!", "success");
                    await refreshUdhaarData();
                    modal.classList.remove('active');
                } else {
                    QuadModals.alert("Update Failed", result.message || "Failed to update record.", "error");
                }
            } catch (err) {
                console.error("Update Error:", err);
                QuadModals.alert("Network Error", "Technical issue or session expired.", "error");
            }
        } else {
            // --- CREATE Mode ---
            const initialAmount = parseFloat(document.getElementById('u-amount').value);
            
            const newRecord = {
                ownerId: currentOwnerId,
                date: date,
                dueDate: dueDate,
                name: name,
                contact: contact,
                totalAmount: initialAmount,
                balance: initialAmount,
                status: 'pending',
                transactions: [{
                    date: date,
                    type: 'taken',
                    amount: initialAmount,
                    description: note || 'Initial Credit'
                }]
            };

            try {
                const result = await apiRequest('/udhaar/', {
                    method: 'POST',
                    body: JSON.stringify(newRecord)
                });

                if (result.success) {
                    QuadModals.showToast("New Record Created!", "success");
                    // Success feedback
                    const submitBtn = form.querySelector('.btn-submit');
                    const originalContent = submitBtn.innerHTML;
                    submitBtn.innerHTML = '<i class="fa-solid fa-check-circle"></i> Saved!';
                    submitBtn.style.background = 'var(--accent-green)';

                    setTimeout(async () => {
                        await refreshUdhaarData();
                        form.reset();
                        if (dateInput) dateInput.valueAsDate = new Date();
                        modal.classList.remove('active');
                        
                        // Reset button
                        submitBtn.innerHTML = originalContent;
                        submitBtn.style.background = '';
                    }, 1000);
                } else {
                    QuadModals.alert("Failed", result.message || "Failed to save record.", "error");
                }
            } catch (err) {
                console.error("Save Error:", err);
                QuadModals.alert("Network Error", "Failed to connect to the server.", "error");
            }
        }
    });

    // Search
    searchInput.addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();
        const filtered = udhaarList.filter(item => item.name.toLowerCase().includes(term));
        renderTable(filtered);
    });

    function formatCurrency(val) {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0
        }).format(val);
    }

    function renderTable(data = udhaarList) {
        udhaarTableBody.innerHTML = '';

        if (data.length === 0) {
            udhaarTableBody.innerHTML = '<tr><td colspan="8" style="text-align:center; padding: 2rem;">No records found.</td></tr>';
            return;
        }

        data.forEach(item => {
            const tr = document.createElement('tr');

            // Determine Status Badge
            let statusClass = 'pending';
            let statusText = 'Pending';

            const today = new Date();
            today.setHours(0, 0, 0, 0);

            let isDateOverdue = false;
            if (item.dueDate) {
                const due = new Date(item.dueDate);
                due.setHours(0, 0, 0, 0);
                if (due < today) {
                    isDateOverdue = true;
                }
            }

            if (item.balance <= 0) {
                statusClass = 'paid';
                statusText = 'Settled';
            } else if (isDateOverdue) {
                statusClass = 'overdue';
                statusText = 'Overdue';
            } else if (item.balance < item.totalAmount) {
                statusClass = 'pending';
                statusText = 'Partial';
            } else if (item.totalAmount > 5000) {
                // Keep high value alert if needed, or just default to pending
                statusClass = 'pending';
                statusText = 'Pending';
            }

            // Format Values
            const formattedTotal = formatCurrency(item.totalAmount);
            const formattedBalance = formatCurrency(item.balance);

            // Format Dates
            const dateObj = new Date(item.date);
            const dateStr = dateObj.toLocaleDateString('en-GB');

            let dueDateStr = '-';
            if (item.dueDate) {
                const dueDateObj = new Date(item.dueDate);
                dueDateStr = dueDateObj.toLocaleDateString('en-GB');
            }

            // Row click to open details
            tr.onclick = (e) => {
                // Prevent opening if clicking action buttons or links
                if (e.target.closest('button') || e.target.closest('a')) return;
                viewDetails(item._id);
            };
            tr.style.cursor = 'pointer';

            tr.innerHTML = `
                <td data-label="Date">${dateStr}</td>
                <td data-label="Due Date" style="color: #F47C25; font-weight: 600;">${dueDateStr}</td>
                <td data-label="Customer"><strong>${item.name}</strong></td>
                <td data-label="Contact">${item.contact || '-'}</td>
                <td data-label="Description">${item.transactions?.[0]?.description || '-'}</td>
                <td data-label="Balance">
                    <div style="display:flex; flex-direction:column; align-items:flex-end;">
                         <span>${formattedBalance}</span>
                         ${item.balance < item.totalAmount && item.balance > 0 ? `<small style="color:#22c55e; font-size:0.7em;">(of ${formattedTotal})</small>` : ''}
                    </div>
                </td>
                <td data-label="Status"><span class="status-badge ${statusClass}">${statusText}</span></td>
                <td data-label="Actions">
                    <button class="action-btn view" onclick="viewDetails('${item._id}')" title="View Details"><i class="fa-solid fa-eye"></i></button>
                    <button class="action-btn edit" onclick="editRecord('${item._id}')" title="Edit Entry"><i class="fa-solid fa-edit"></i></button>
                    <button class="action-btn delete" onclick="deleteRecord('${item._id}')" title="Delete Record"><i class="fa-solid fa-trash"></i></button>
                    ${item.contact ? `<a href="https://wa.me/${item.contact}?text=Hello ${item.name}, regarding your pending payment of ${formattedBalance} due on ${dueDateStr}." target="_blank" class="action-btn whatsapp"><i class="fa-brands fa-whatsapp"></i></a>` : ''}
                </td>
            `;
            udhaarTableBody.appendChild(tr);
        });
    }

    // Add RGB helper for glass effects
    const primaryColor = getComputedStyle(document.documentElement).getPropertyValue('--primary').trim();
    if (primaryColor) {
        // Convert #f97316 to 249, 115, 22
        const r = parseInt(primaryColor.slice(1, 3), 16);
        const g = parseInt(primaryColor.slice(3, 5), 16);
        const b = parseInt(primaryColor.slice(5, 7), 16);
        document.documentElement.style.setProperty('--primary-rgb', `${r}, ${g}, ${b}`);
    }

    // --- Details & Partial Payment Modal ---
    window.viewDetails = (id) => {
        const record = udhaarList.find(r => r._id === id);
        if (!record) return;

        // Create or get modal
        let detailsModal = document.getElementById('udhaarHistoryModal');
        if (!detailsModal) {
            detailsModal = document.createElement('div');
            detailsModal.id = 'udhaarHistoryModal';
            detailsModal.className = 'modal';
            document.body.appendChild(detailsModal);
        }

        const paidAmount = record.totalAmount - record.balance;

        detailsModal.innerHTML = `
            <div class="modal-content" style="max-width: 700px;">
                <div class="modal-header">
                    <h2>Credit Profile: ${record.name}</h2>
                    <button class="close-modal" onclick="closeDetailsModal()">&times;</button>
                </div>
                
                <!-- Summary Section -->
                <div class="summary-cards" style="grid-template-columns: repeat(3, 1fr); margin-bottom: 2.5rem; gap: 1rem;">
                     <div class="stat-card" style="padding: 1.25rem; flex-direction: column; gap: 0.25rem;">
                        <span class="label" style="font-size: 0.65rem;">Initial Udhaar</span>
                        <h4 style="font-size: 1.2rem; font-weight:900;">${formatCurrency(record.totalAmount)}</h4>
                     </div>
                     <div class="stat-card" style="padding: 1.25rem; flex-direction: column; gap: 0.25rem; border-color: var(--accent-green-light);">
                        <span class="label" style="font-size: 0.65rem; color: var(--accent-green);">Received</span>
                        <h4 style="font-size: 1.2rem; font-weight:900; color: var(--accent-green);">${formatCurrency(paidAmount)}</h4>
                     </div>
                      <div class="stat-card" style="padding: 1.25rem; flex-direction: column; gap: 0.25rem; border-color: var(--accent-red-light);">
                        <span class="label" style="font-size: 0.65rem; color: var(--accent-red);">Remaining</span>
                        <h4 style="font-size: 1.2rem; font-weight:900; color: var(--accent-red);">${formatCurrency(record.balance)}</h4>
                     </div>
                </div>

                <!-- Tabs -->
                <div class="transaction-tabs">
                    <button class="tab-btn active" onclick="switchTxTab('payment')" id="tab-payment">
                        <i class="fa-solid fa-receipt"></i> Payment Recv.
                    </button>
                    <button class="tab-btn" onclick="switchTxTab('taken')" id="tab-credit">
                        <i class="fa-solid fa-plus-circle"></i> Add Credit
                    </button>
                </div>

                <!-- Entry Form -->
                <div id="tx-form-container" class="payment-entry-form">
                    <h4 id="tx-title" class="entry-title">New Payment Entry</h4>
                    <form id="payment-form" class="modal-grid">
                        <div class="form-group" style="margin: 0; position: relative;">
                            <label>Amount (₹)</label>
                            <input type="number" id="pay-amount" placeholder="0.00" min="1" step="0.01" required>
                            <div id="pay-amount-error" style="color: var(--accent-red); font-size: 0.7rem; font-weight: 700; margin-top: 0.25rem; display: none;"></div>
                        </div>
                        <div class="form-group" style="margin: 0;">
                            <label>Transaction Date</label>
                            <input type="date" id="pay-date">
                        </div>
                        <div class="form-group" style="margin: 0;" id="mode-group">
                            <label>Payment Mode</label>
                            <select id="pay-mode">
                                <option value="Cash">Cash</option>
                                <option value="UPI">UPI / Digital</option>
                                <option value="Card">Card</option>
                            </select>
                        </div>
                        <div class="form-group" style="margin: 0;">
                            <label>Internal Note</label>
                            <input type="text" id="pay-desc" placeholder="e.g. Paid via PhonePe">
                        </div>
                        <button type="button" id="btn-confirm-tx" onclick="submitTransaction('${record._id}')" class="btn-submit" style="grid-column: span 2;">
                            <i class="fa-solid fa-check-circle"></i> Post Transaction
                        </button>
                    </form>
                </div>

                <!-- History -->
                <h4 style="margin-bottom: 1.5rem; font-size: 0.8rem; font-weight: 850; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.1em;">Transaction Timeline</h4>
                <div class="payment-timeline" id="history-timeline" style="max-height: 280px; overflow-y: auto; padding-right: 1rem;">
                    ${renderTimeline(record.transactions)}
                </div>
            </div>
        `;

        detailsModal.classList.add('active');
        
        // Add dynamic validation for "proper way" message
        const amountInput = document.getElementById('pay-amount');
        const errorDiv = document.getElementById('pay-amount-error');
        if (amountInput && errorDiv) {
            amountInput.addEventListener('input', () => {
                const val = parseFloat(amountInput.value) || 0;
                if (currentTxType === 'payment' && val > record.balance) {
                    errorDiv.textContent = `Payment (₹${val}) cannot exceed remaining balance (₹${record.balance})`;
                    errorDiv.style.display = 'block';
                    errorDiv.style.animation = 'shake 0.3s ease';
                } else {
                    errorDiv.style.display = 'none';
                }
            });
        }

        const payDate = document.getElementById('pay-date');
        if (payDate) payDate.valueAsDate = new Date();
    };

    window.closeDetailsModal = () => {
        document.getElementById('udhaarHistoryModal').classList.remove('active');
    };

    let currentTxType = 'payment';
    window.switchTxTab = (type) => {
        currentTxType = type;
        const pBtn = document.getElementById('tab-payment');
        const cBtn = document.getElementById('tab-credit');
        const title = document.getElementById('tx-title');
        const modeGroup = document.getElementById('mode-group');
        const errorDiv = document.getElementById('pay-amount-error');
        if (errorDiv) errorDiv.style.display = 'none'; // Clear error on tab switch

        if (type === 'payment') {
            pBtn.classList.add('active');
            cBtn.classList.remove('active');
            title.textContent = 'New Payment Entry';
            if (modeGroup) modeGroup.style.display = 'block';
        } else {
            cBtn.classList.add('active');
            pBtn.classList.remove('active');
            title.textContent = 'Additional Credit Entry';
            if (modeGroup) modeGroup.style.display = 'none';
        }
    };

    window.submitTransaction = async (id) => {
        const record = udhaarList.find(r => r._id === id);
        const amountInput = document.getElementById('pay-amount');
        const dateInput = document.getElementById('pay-date');
        const modeInput = document.getElementById('pay-mode');
        const descInput = document.getElementById('pay-desc');

        if (!record || !amountInput.value || !dateInput.value) {
            QuadModals.alert("Selection Details Missing", "Please enter payment amount and date.", "warning");
            return;
        }

        const amount = parseFloat(amountInput.value);
        if (amount <= 0) {
            QuadModals.alert("Invalid Input", "Amount must be positive.", "warning");
            return;
        }
        
        if (currentTxType === 'payment' && amount > record.balance) {
            QuadModals.alert("Limit Exceeded", `Payment (₹${amount}) cannot exceed remaining balance (₹${record.balance})`, "error");
            return;
        }

        const txData = {
            type: currentTxType,
            amount,
            date: dateInput.value,
            mode: modeInput ? modeInput.value : 'Cash',
            description: descInput ? descInput.value : ''
        };

        try {
            const result = await apiRequest(`/udhaar/${id}`, {
                method: 'PATCH',
                body: JSON.stringify(txData)
            });

            if (result.success) {
                QuadModals.showToast("Transaction Recorded!", "success");
                await refreshUdhaarData();
                viewDetails(id); 
            } else {
                QuadModals.alert("Failed", result.message || "Could not save transaction", "error");
            }
        } catch (err) {
            console.error("Transaction Error:", err);
            QuadModals.alert("Network Error", "Technical issue or session expired.", "error");
        }
    };

    window.deleteRecord = async (id) => {
        if (userRole === 'staff') {
            QuadModals.alert("Access Denied", "Only administrators can delete financial records permanently.", "error");
            return;
        }

        if (confirm('Are you sure you want to delete this record irrecoverably?')) {
            try {
                const result = await apiRequest(`/udhaar/${id}`, {
                    method: 'DELETE'
                });
                if (result.success) {
                    QuadModals.showToast("Record Deleted", "success");
                    refreshUdhaarData();
                } else {
                    QuadModals.alert("Delete Failed", result.message || "Operation failed", "error");
                }

            } catch (err) {
                console.error("Delete Error:", err);
                QuadModals.alert("Error", "Could not delete record.", "error");
            }
        }
    };

    // --- TIMELINE RENDERER (New Styling) ---
    function renderTimeline(transactions) {
        if (!transactions || transactions.length === 0) return '<p style="text-align:center; color:var(--text-secondary); font-style:italic;">No history</p>';
        const sorted = [...transactions].sort((a, b) => new Date(b.date) - new Date(a.date));
        return sorted.map(t => {
            const isPayment = t.type === 'payment' || t.type === 'taken';
            const isNeutral = t.type === 'taken';
            const color = t.type === 'payment' ? 'var(--accent-green)' : 'var(--accent-red)';
            const icon = t.type === 'payment' ? 'fa-arrow-down' : 'fa-arrow-up';
            const dateStr = new Date(t.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
            
            return `
                <div class="timeline-item">
                    <div class="timeline-dot" style="background: ${color}20; color: ${color};">
                        <i class="fa-solid ${icon}"></i>
                    </div>
                    <div class="timeline-line"></div>
                    <div class="timeline-content">
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 0.5rem;">
                            <span style="font-weight:850; font-size:0.95rem;">${t.type === 'payment' ? 'Payment Received' : 'Udhaar Taken'}</span>
                            <span style="font-weight:900; color:${color}; font-size: 1.1rem;">
                                ${t.type === 'payment' ? '-' : '+'} ${formatCurrency(t.amount)}
                            </span>
                        </div>
                        <div style="font-size:0.8rem; font-weight: 700; color:var(--text-secondary);">
                            <i class="fa-solid fa-clock"></i> ${dateStr} 
                            ${t.mode ? ` • <i class="fa-solid fa-wallet"></i> ${t.mode}` : ''}
                        </div>
                        ${t.description ? `<div style="margin-top: 0.75rem; font-size: 0.85rem; color: var(--text-main); font-weight: 600;">${t.description}</div>` : ''}
                    </div>
                </div>
            `;
        }).join('');
    }

    function updateStats() {
        const totalPending = udhaarList.reduce((sum, item) => sum + item.balance, 0);
        const totalRecovered = udhaarList.reduce((sum, item) => sum + (item.totalAmount - item.balance), 0);
        const countPending = udhaarList.filter(item => item.balance > 0).length;

        const totalAmountEl = document.getElementById('total-udhaar-amount');
        const pendingCountEl = document.getElementById('pending-count');
        const totalRecoveredEl = document.getElementById('total-recovered-amount');

        if (totalAmountEl) totalAmountEl.textContent = formatCurrency(totalPending);
        if (pendingCountEl) pendingCountEl.textContent = countPending;
        if (totalRecoveredEl) totalRecoveredEl.textContent = formatCurrency(totalRecovered);
    }

    window.markAsPaid = (id) => {
        const record = udhaarList.find(r => r._id === id);
        if (record) {
            viewDetails(id);
            setTimeout(() => {
                const input = document.getElementById('pay-amount');
                if (input) input.value = record.balance;
            }, 100);
        }
    };

    // Init
    refreshUdhaarData(); // Initial load
    setInterval(refreshUdhaarData, 15000); // Live refresh every 15s
});

