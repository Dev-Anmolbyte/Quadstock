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
        modal.classList.add('active');
        updateModalPreview(); // Initial preview
    });

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

    // Form Submit (Add New Record)
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const initialAmount = parseFloat(document.getElementById('u-amount').value);
        const date = document.getElementById('u-date').value;
        const dueDate = document.getElementById('u-due-date').value;
        const note = document.getElementById('u-desc').value;
        const contact = document.getElementById('u-contact').value;

        if (!dueDate) return alert('Please select an Expected Payment Date.');
        if (contact && contact.length !== 10) return alert('Contact number must be exactly 10 digits.');

        const newRecord = {
            ownerId: currentOwnerId,
            date: date,
            dueDate: dueDate,
            name: document.getElementById('u-name').value,
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
                alert("Failed to save record.");
            }
        } catch (err) {
            console.error("Save Error:", err);
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
                    <button class="action-btn" onclick="viewDetails('${item._id}')" title="View Details" style="color:#6366f1;"><i class="fa-solid fa-eye"></i></button>
                    <button class="action-btn delete" onclick="deleteRecord('${item._id}')" title="Delete Record"><i class="fa-solid fa-trash"></i></button>
                     ${item.contact ? `<a href="https://wa.me/${item.contact}?text=Hello ${item.name}, regarding your pending payment of ${formattedBalance} due on ${dueDateStr}." target="_blank" class="action-btn" style="color:#25D366;"><i class="fa-brands fa-whatsapp"></i></a>` : ''}
                </td>
            `;
            udhaarTableBody.appendChild(tr);
        });
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

        // Calculate Paid Amount
        const paidAmount = record.totalAmount - record.balance;

        detailsModal.innerHTML = `
            <div class="modal-content" style="max-width: 650px;">
                <div class="modal-header">
                    <h2>${record.name} - Credit Details</h2>
                    <button class="close-modal" onclick="closeDetailsModal()">&times;</button>
                </div>
                
                <!-- Premium Summary Cards -->
                <div style="display:grid; grid-template-columns: 1fr 1fr 1fr; gap:1rem; margin-bottom: 2rem;">
                     <div class="stat-card" style="padding: 1rem; min-width: auto; flex-direction: column; gap: 0.5rem; text-align: center;">
                        <span class="label" style="font-size: 0.75rem;">Total</span>
                        <h4 style="margin:0; font-size: 1.1rem;">${formatCurrency(record.totalAmount)}</h4>
                     </div>
                     <div class="stat-card" style="padding: 1rem; min-width: auto; flex-direction: column; gap: 0.5rem; text-align: center; border-color: var(--accent-green-light);">
                        <span class="label" style="font-size: 0.75rem; color: var(--accent-green);">Paid</span>
                        <h4 style="margin:0; font-size: 1.1rem; color: var(--accent-green);">${formatCurrency(paidAmount)}</h4>
                     </div>
                      <div class="stat-card" style="padding: 1rem; min-width: auto; flex-direction: column; gap: 0.5rem; text-align: center; border-color: var(--accent-red-light);">
                        <span class="label" style="font-size: 0.75rem; color: var(--accent-red);">Due</span>
                        <h4 style="margin:0; font-size: 1.1rem; color: var(--accent-red);">${formatCurrency(record.balance)}</h4>
                     </div>
                </div>

                <!-- Tabs for New Transaction -->
                <div class="transaction-tabs" style="display:flex; gap:0.5rem; margin-bottom:1.5rem; background:var(--primary-light); padding:0.4rem; border-radius:14px;">
                    <button class="tab-btn active" onclick="switchTxTab('payment')" id="tab-payment" style="flex:1; padding:0.8rem; border-radius:10px; border:none; cursor:pointer; font-weight:800; transition:all 0.3s; background:var(--primary); color:white;">
                        <i class="fa-solid fa-hand-holding-dollar"></i> Recv. Payment
                    </button>
                    <button class="tab-btn" onclick="switchTxTab('credit')" id="tab-credit" style="flex:1; padding:0.8rem; border-radius:10px; border:none; cursor:pointer; font-weight:800; transition:all 0.3s; background:transparent; color:var(--primary);">
                        <i class="fa-solid fa-plus-circle"></i> Add Credit
                    </button>
                </div>

                <!-- Record Transaction Form -->
                <div id="tx-form-container" style="background: rgba(var(--primary-rgb), 0.05); padding: 1.5rem; border-radius: 24px; border: 1px solid var(--card-border); margin-bottom: 2rem;">
                    <h4 id="tx-title" style="margin-bottom: 1.25rem; font-size: 0.9rem; font-weight: 800; text-transform: uppercase; color: var(--primary);">Record New Payment</h4>
                    <form id="payment-form" style="display:grid; grid-template-columns: 1fr 1fr; gap: 1.25rem;">
                        <div class="form-group" style="margin-bottom: 0;">
                            <label style="font-size: 0.7rem;">Amount (₹)</label>
                            <input type="number" id="pay-amount" placeholder="0.00" min="1" step="0.01" required>
                        </div>
                        <div class="form-group" style="margin-bottom: 0;">
                            <label style="font-size: 0.7rem;">Date</label>
                            <input type="date" id="pay-date">
                        </div>
                        <div class="form-group" style="margin-bottom: 0;" id="mode-group">
                            <label style="font-size: 0.7rem;">Mode</label>
                            <select id="pay-mode">
                                <option value="Cash">Cash</option>
                                <option value="UPI">UPI</option>
                                <option value="Card">Card</option>
                                <option value="Other">Other</option>
                            </select>
                        </div>
                        <div class="form-group" style="margin-bottom: 0;">
                            <label style="font-size: 0.7rem;">Description / Note</label>
                            <input type="text" id="pay-desc" placeholder="Optional note">
                        </div>
                        <button type="button" id="btn-confirm-tx" onclick="submitTransaction('${record._id}')" class="btn-submit" style="grid-column: span 2; margin-top: 0.5rem; padding: 1rem;">
                            <i class="fa-solid fa-check-circle"></i> Confirm Transaction
                        </button>
                    </form>
                </div>

                <!-- Transaction History -->
                <div>
                     <h4 style="margin-bottom: 1.25rem; font-size: 0.9rem; font-weight: 800; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.05em;">Transaction History</h4>
                     <div class="payment-timeline" id="history-timeline" style="max-height: 250px; overflow-y: auto; padding-right: 0.5rem;">
                        ${renderTimeline(record.transactions)}
                     </div>
                </div>
            </div>
        `;

        detailsModal.classList.add('active');

        // Set Default Date in Payment Form
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

        if (type === 'payment') {
            pBtn.style.background = 'var(--primary)';
            pBtn.style.color = 'white';
            cBtn.style.background = 'transparent';
            cBtn.style.color = 'var(--primary)';
            title.textContent = 'Record New Payment';
            if (modeGroup) modeGroup.style.display = 'block';
        } else {
            cBtn.style.background = 'var(--primary)';
            cBtn.style.color = 'white';
            pBtn.style.background = 'transparent';
            pBtn.style.color = 'var(--primary)';
            title.textContent = 'Add Additional Credit';
            if (modeGroup) modeGroup.style.display = 'none';
        }
    };

    window.submitTransaction = async (id) => {
        const record = udhaarList.find(r => r._id === id);
        const amountInput = document.getElementById('pay-amount');
        const dateInput = document.getElementById('pay-date');
        const modeInput = document.getElementById('pay-mode');
        const descInput = document.getElementById('pay-desc');

        if (!record || !amountInput.value || !dateInput.value) return alert('Please enter amount and date');

        const amount = parseFloat(amountInput.value);
        if (amount <= 0) return alert('Amount must be positive');
        
        if (currentTxType === 'payment' && amount > record.balance) {
            return alert(`Payment (₹${amount}) cannot exceed remaining balance (₹${record.balance})`);
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
                await refreshUdhaarData();
                viewDetails(id); 
            }
        } catch (err) {
            console.error("Transaction Error:", err);
        }
    };

    window.deleteRecord = async (id) => {
        if (userRole === 'staff') return alert('Access Denied: Staff cannot delete records.');

        if (confirm('Are you sure you want to delete this record irrecoverably?')) {
            try {
                const result = await apiRequest(`/udhaar/${id}`, {
                    method: 'DELETE'
                });
                if (result.success) refreshUdhaarData();

            } catch (err) {
                console.error("Delete Error:", err);
            }
        }
    };

    function renderTimeline(transactions) {
        if (!transactions || transactions.length === 0) return '<p>No history</p>';
        const sorted = [...transactions].sort((a, b) => new Date(b.date) - new Date(a.date));
        return sorted.map(t => {
            const isPayment = t.type === 'payment';
            const color = isPayment ? '#22c55e' : '#ef4444';
            const icon = isPayment ? 'fa-arrow-down' : 'fa-arrow-up';
            const dateStr = new Date(t.date).toLocaleDateString('en-GB');
            return `
                <div style="display:flex; gap:1rem; margin-bottom:1.25rem;">
                    <div style="display:flex; flex-direction:column; align-items:center;">
                        <div style="width:30px; height:30px; border-radius:50%; background:${color}20; display:flex; align-items:center; justify-content:center; color:${color};">
                            <i class="fa-solid ${icon}" style="font-size:0.8rem;"></i>
                        </div>
                        <div style="width:2px; height:100%; background:#e2e8f0; margin-top:0.5rem; min-height:20px;"></div>
                    </div>
                    <div style="flex:1;">
                        <div style="display:flex; justify-content:space-between;">
                            <span style="font-weight:600; font-size:0.9rem;">${isPayment ? `Payment Received (${t.mode || 'Cash'})` : 'Udhaar Taken'}</span>
                            <span style="font-weight:700; color:${color};">${isPayment ? '-' : '+'} ${formatCurrency(t.amount)}</span>
                        </div>
                        <div style="font-size:0.8rem; color:var(--text-secondary); margin-top:0.25rem;">
                            ${dateStr} • ${t.description}
                        </div>
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

