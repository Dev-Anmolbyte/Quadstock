document.addEventListener('DOMContentLoaded', () => {
    // --- Theme Toggle ---
    const themeBtn = document.getElementById('theme-toggle');
    const body = document.body;

    if (localStorage.getItem('theme') === 'dark') {
        body.setAttribute('data-theme', 'dark');
        if (themeBtn) themeBtn.innerHTML = '<i class="fa-solid fa-sun"></i>';
    }

    if (themeBtn) {
        themeBtn.addEventListener('click', () => {
            if (body.getAttribute('data-theme') === 'dark') {
                body.removeAttribute('data-theme');
                localStorage.setItem('theme', 'light');
                themeBtn.innerHTML = '<i class="fa-solid fa-moon"></i>';
            } else {
                body.setAttribute('data-theme', 'dark');
                localStorage.setItem('theme', 'dark');
                themeBtn.innerHTML = '<i class="fa-solid fa-sun"></i>';
            }
        });
    }

    // --- Sidebar Toggle ---
    const sidebarToggle = document.getElementById('sidebar-toggle');
    const dashboardContainer = document.querySelector('.layout-container');
    if (sidebarToggle && dashboardContainer) {
        sidebarToggle.addEventListener('click', () => {
            dashboardContainer.classList.toggle('sidebar-collapsed');
        });
    }

    // --- Authentication & Context ---
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    const currentEmployee = JSON.parse(localStorage.getItem('currentEmployee'));
    const userRole = (currentUser && currentUser.role) || (currentEmployee && currentEmployee.role) || 'staff';
    const currentOwnerId = (currentUser && currentUser.ownerId) || (currentEmployee && currentEmployee.ownerId);

    if (!currentOwnerId) {
        window.location.href = '../Authentication/employee_login.html';
        return;
    }

    // Set Shop Name
    const shopSpans = document.querySelectorAll('.shop-name');
    shopSpans.forEach(span => {
        span.textContent = (currentUser && currentUser.shopName) || 'QuadStock Store';
    });

    // --- Udhaar Management Logic ---
    const allRecords = JSON.parse(localStorage.getItem('udhaarRecords')) || [];
    let udhaarList = allRecords.filter(r => r.ownerId === currentOwnerId);


    // --- Data Migration for Partial Payments Support ---
    udhaarList = udhaarList.map(record => {
        if (!record.transactions) {
            // Convert old format to new format
            const transactions = [{
                id: Date.now() + Math.random(),
                date: record.date,
                type: 'taken',
                amount: record.amount,
                description: record.description || 'Initial Credit'
            }];

            let balance = record.amount;

            // If it was already marked as paid in the old system
            if (record.status === 'paid') {
                transactions.push({
                    id: Date.now() + Math.random() + 1,
                    date: new Date().toISOString().split('T')[0],
                    type: 'payment',
                    amount: record.amount,
                    description: 'Settled (Legacy Record)'
                });
                balance = 0;
            }

            return {
                ...record,
                totalAmount: record.amount, // Original credit amount
                balance: balance,
                transactions: transactions
            };
        }
        return record;
    });
    saveData(); // Save migrated structure

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

    // Contact Number Restriction (Only Numbers, Max 10)
    const contactInput = document.getElementById('u-contact');
    if (contactInput) {
        contactInput.addEventListener('input', (e) => {
            e.target.value = e.target.value.replace(/[^0-9]/g, '').slice(0, 10);
        });

        // Also validate on blur for user feedback
        contactInput.addEventListener('blur', (e) => {
            if (e.target.value.length > 0 && e.target.value.length < 10) {
                alert('Contact number must be exactly 10 digits.');
            }
        });
    }

    // Initial Render
    renderTable();
    updateStats();

    // Modal Events
    addBtn.addEventListener('click', () => {
        modal.classList.add('active');
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
    form.addEventListener('submit', (e) => {
        e.preventDefault();

        const initialAmount = parseFloat(document.getElementById('u-amount').value);
        const date = document.getElementById('u-date').value;
        const dueDate = document.getElementById('u-due-date').value;
        const note = document.getElementById('u-desc').value;
        const contact = document.getElementById('u-contact').value;

        // Validation
        if (!dueDate) {
            alert('Please select an Expected Payment Date.');
            return;
        }

        if (contact && contact.length !== 10) {
            alert('Contact number must be exactly 10 digits.');
            return;
        }

        const newRecord = {
            id: Date.now().toString(),
            ownerId: currentOwnerId,
            date: date,
            dueDate: dueDate,
            name: document.getElementById('u-name').value,
            contact: contact,
            totalAmount: initialAmount,
            balance: initialAmount,
            status: 'pending',
            transactions: [{
                id: Date.now().toString() + '_1',
                date: date,
                type: 'taken',
                amount: initialAmount,
                description: note || 'Initial Credit'
            }]
        };

        udhaarList.unshift(newRecord);
        saveData();
        renderTable();
        updateStats();

        // Reset and close
        form.reset();
        if (dateInput) dateInput.valueAsDate = new Date();
        modal.classList.remove('active');
    });

    // Search
    searchInput.addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();
        const filtered = udhaarList.filter(item => item.name.toLowerCase().includes(term));
        renderTable(filtered);
    });

    // Helper Functions
    function saveData() {
        // Merge current owner list back into global list
        const otherOwnerRecords = allRecords.filter(r => r.ownerId !== currentOwnerId);
        const updatedGlobalList = [...otherOwnerRecords, ...udhaarList];
        localStorage.setItem('udhaarRecords', JSON.stringify(updatedGlobalList));
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
                viewDetails(item.id);
            };
            tr.style.cursor = 'pointer';

            tr.innerHTML = `
                <td>${dateStr}</td>
                <td style="color: #F47C25; font-weight: 600;">${dueDateStr}</td>
                <td><strong>${item.name}</strong></td>
                <td>${item.contact || '-'}</td>
                <td>${item.transactions?.[0]?.description || '-'}</td>
                <td>
                    <div style="display:flex; flex-direction:column; align-items:flex-end;">
                         <span>${formattedBalance}</span>
                         ${item.balance < item.totalAmount && item.balance > 0 ? `<small style="color:#22c55e; font-size:0.7em;">(of ${formattedTotal})</small>` : ''}
                    </div>
                </td>
                <td><span class="status-badge ${statusClass}">${statusText}</span></td>
                <td>
                    <button class="action-btn" onclick="viewDetails('${item.id}')" title="View Details" style="color:#6366f1;"><i class="fa-solid fa-eye"></i></button>
                    <button class="action-btn delete" onclick="deleteRecord('${item.id}')" title="Delete Record"><i class="fa-solid fa-trash"></i></button>
                     ${item.contact ? `<a href="https://wa.me/${item.contact}?text=Hello ${item.name}, regarding your pending payment of ${formattedBalance} due on ${dueDateStr}." target="_blank" class="action-btn" style="color:#25D366;"><i class="fa-brands fa-whatsapp"></i></a>` : ''}
                </td>
            `;
            udhaarTableBody.appendChild(tr);
        });
    }

    function formatCurrency(val) {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR'
        }).format(val);
    }

    // --- Details & Partial Payment Modal ---
    window.viewDetails = (id) => {
        const record = udhaarList.find(r => r.id === id);
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
            <div class="modal-content" style="max-width: 650px; display:flex; flex-direction:column; gap:1.5rem;">
                <div class="modal-header">
                    <h2>${record.name}</h2>
                    <button class="close-details-modal" style="background:none; border:none; font-size:1.5rem; cursor:pointer;" onclick="closeDetailsModal()">&times;</button>
                </div>
                
                <!-- Summary Cards -->
                <div style="display:grid; grid-template-columns: 1fr 1fr 1fr; gap:1rem;">
                     <div style="background:#f8fafc; padding:1rem; border-radius:0.5rem; text-align:center;">
                        <span style="font-size:0.8rem; color:#64748b;">Total Udhaar</span>
                        <h3 style="margin:0.25rem 0; font-size:1.25rem;">${formatCurrency(record.totalAmount)}</h3>
                     </div>
                     <div style="background:#f0fdf4; padding:1rem; border-radius:0.5rem; text-align:center;">
                        <span style="font-size:0.8rem; color:#166534;">Paid So Far</span>
                        <h3 style="margin:0.25rem 0; font-size:1.25rem; color:#16a34a;">${formatCurrency(paidAmount)}</h3>
                     </div>
                      <div style="background:#fef2f2; padding:1rem; border-radius:0.5rem; text-align:center;">
                        <span style="font-size:0.8rem; color:#991b1b;">Balance Due</span>
                        <h3 style="margin:0.25rem 0; font-size:1.25rem; color:#ef4444;">${formatCurrency(record.balance)}</h3>
                     </div>
                </div>

                <!-- Add Payment Form -->
                ${record.balance > 0 ? `
                <div style="background:#f9fafb; padding:1rem; border-radius:0.5rem; border:1px dashed #cbd5e1;">
                    <h4 style="margin-bottom:0.75rem; font-size:0.95rem;">Record New Payment</h4>
                    <form id="payment-form" style="display:grid; grid-template-columns: 1fr 1fr 1fr auto; gap:0.75rem; align-items:end;">
                        <div>
                            <label style="font-size:0.8rem; font-weight:600;">Amount (₹)</label>
                            <input type="number" id="pay-amount" placeholder="Max ${record.balance}" max="${record.balance}" min="1" step="0.01" style="width:100%; padding:0.5rem; border-radius:0.25rem; border:1px solid #ccc;">
                        </div>
                        <div>
                            <label style="font-size:0.8rem; font-weight:600;">Date</label>
                            <input type="date" id="pay-date" style="width:100%; padding:0.5rem; border-radius:0.25rem; border:1px solid #ccc;">
                        </div>
                        <div>
                            <label style="font-size:0.8rem; font-weight:600;">Mode</label>
                            <select id="pay-mode" style="width:100%; padding:0.5rem; border-radius:0.25rem; border:1px solid #ccc;">
                                <option value="Cash">Cash</option>
                                <option value="UPI">UPI</option>
                                <option value="Card">Card</option>
                                <option value="Other">Other</option>
                            </select>
                        </div>
                        <button type="button" onclick="addPayment('${record.id}')" style="background:var(--success-green); color:white; border:none; padding:0.6rem 1rem; border-radius:0.25rem; cursor:pointer; font-weight:700;">
                            Received
                        </button>
                    </form>
                </div>
                ` : '<div style="background:#dcfce7; color:#15803d; padding:1rem; border-radius:0.5rem; text-align:center; font-weight:bold;">Fully Settled! No balance due.</div>'}

                <!-- Transaction Timeline -->
                <div>
                     <h4 style="margin-bottom:1rem; font-size:0.95rem; color:var(--text-secondary);">Transaction History</h4>
                     <div class="payment-timeline" id="history-timeline" style="max-height:250px; overflow-y:auto; padding-right:0.5rem;">
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

    window.addPayment = (id) => {
        const record = udhaarList.find(r => r.id === id);
        const amountInput = document.getElementById('pay-amount');
        const dateInput = document.getElementById('pay-date');
        const modeInput = document.getElementById('pay-mode');

        if (!record || !amountInput.value || !dateInput.value) return alert('Please enter amount and date');

        const amount = parseFloat(amountInput.value);
        if (amount <= 0 || amount > record.balance) return alert(`Amount must be between 1 and ${record.balance}`);

        const mode = modeInput ? modeInput.value : 'Cash';

        // Add Transaction
        record.transactions.push({
            id: Date.now().toString(),
            date: dateInput.value,
            type: 'payment',
            amount: amount,
            mode: mode,
            description: `Partial Payment (${mode})`
        });

        // Update Balance
        record.balance -= amount;

        // Update Status ? handled in renderTable logic dynamically based on balance
        // Just save
        saveData();

        // Refresh View
        viewDetails(id);
        renderTable();
        updateStats();
    };

    function renderTimeline(transactions) {
        if (!transactions || transactions.length === 0) return '<p>No history</p>';

        // Sort by date desc
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
        // Calculate Total Outstanding
        const totalPending = udhaarList.reduce((sum, item) => sum + item.balance, 0);

        const countPending = udhaarList.filter(item => item.balance > 0).length;

        totalAmountEl.textContent = formatCurrency(totalPending);
        pendingCountEl.textContent = countPending;
    }

    // Legacy functions or direct calls
    window.markAsPaid = (id) => {
        // Now redirects to view details to add full payment
        const record = udhaarList.find(r => r.id === id);
        if (record) {
            viewDetails(id);
            // Pre-fill full amount
            setTimeout(() => {
                const input = document.getElementById('pay-amount');
                if (input) input.value = record.balance;
            }, 100);
        }
    };

    window.deleteRecord = (id) => {
        if (userRole === 'staff') {
            alert('Access Denied: Staff cannot delete records.');
            return;
        }

        if (confirm('Are you sure you want to delete this record irrecoverably?')) {
            udhaarList = udhaarList.filter(r => r.id !== id);
            saveData();
            renderTable();
            updateStats();
        }
    };
});

