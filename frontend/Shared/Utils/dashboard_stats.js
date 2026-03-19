
// --- Dashboard Integration for Udhaar & Expenses ---

export function updateDashboardStats() {
    // Authentication & Context
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    const currentEmployee = JSON.parse(localStorage.getItem('currentEmployee'));
    const ownerId = (currentUser && currentUser.ownerId) || (currentEmployee && currentEmployee.ownerId);

    if (!ownerId) return;

    // 1. Get Udhaar Data (Filtered by Owner)
    const udhaarList = JSON.parse(localStorage.getItem('udhaarRecords')) || [];
    const ownerUdhaar = udhaarList.filter(item => item.ownerId === ownerId);

    const totalPending = ownerUdhaar
        .filter(item => item.balance > 0)
        .reduce((sum, item) => sum + item.balance, 0);

    const udhaarEl = document.getElementById('dash-total-udhaar');
    if (udhaarEl) {
        udhaarEl.innerText = formatCurrency(totalPending);
    }

    // 2. Get Expense Data (Filtered by Owner)
    let expenses = JSON.parse(localStorage.getItem('expenses')) || [];
    const ownerExpenses = expenses.filter(exp => exp.ownerId === ownerId);

    // Calculate Today's Expense
    const today = new Date().toISOString().split('T')[0];
    const todayExpense = ownerExpenses
        .filter(exp => exp.date === today)
        .reduce((sum, exp) => sum + exp.amount, 0);

    const expenseEl = document.getElementById('dash-today-expense');
    if (expenseEl) {
        expenseEl.innerText = formatCurrency(todayExpense);
    }

    updateNotifications(ownerId);
}



export function updateNotifications(ownerId) {
    if (!ownerId) return;

    // 1. Queries (Filtered by Owner)
    const queries = JSON.parse(localStorage.getItem('queries')) || [];
    const unreadQueries = queries.filter(q => q.ownerId === ownerId && !q.read).length;

    // 2. Complaints (Filtered by Owner)
    const complaints = JSON.parse(localStorage.getItem('quadstock_complaints')) || [];
    const unresolvedComplaints = complaints.filter(c => c.ownerId === ownerId && c.status !== 'resolved').length;

    let notifs = JSON.parse(localStorage.getItem(`adminNotifications_${ownerId}`)) || { query: 0, complain: 0 };
    notifs.query = unreadQueries;
    notifs.complain = unresolvedComplaints;

    // Update Badges
    updateBadge('query', notifs.query);
    updateBadge('complain', notifs.complain);
}


function updateBadge(type, count) {
    const badge = document.getElementById(`nav-badge-${type}`);
    if (badge) {
        if (count > 0) {
            badge.style.display = 'flex';
            badge.innerText = count > 99 ? '99+' : count;
        } else {
            badge.style.display = 'none';
        }
    }
}

// Global function to reset, called onclick
export function resetNotification(type) {
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    const currentEmployee = JSON.parse(localStorage.getItem('currentEmployee'));
    const ownerId = (currentUser && currentUser.ownerId) || (currentEmployee && currentEmployee.ownerId);

    if (!ownerId) return;

    let notifs = JSON.parse(localStorage.getItem(`adminNotifications_${ownerId}`)) || { query: 0, complain: 0 };
    notifs[type] = 0;
    localStorage.setItem(`adminNotifications_${ownerId}`, JSON.stringify(notifs));
    updateBadge(type, 0);
};


function formatCurrency(val) {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0
    }).format(val);
}

// --- Clock Logic ---
export function updateClock() {
    const timeElements = document.querySelectorAll('.current-time-display');
    if (timeElements.length === 0) return;

    const settings = JSON.parse(localStorage.getItem('appSettings')) || { region: { timeFormat: '12' } };
    const timeFormat = (settings.region && settings.region.timeFormat) ? settings.region.timeFormat : '12';

    const now = new Date();
    let hours = now.getHours();
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const seconds = now.getSeconds().toString().padStart(2, '0');
    let ampm = '';

    if (timeFormat === '12') {
        ampm = hours >= 12 ? ' PM' : ' AM';
        hours = hours % 12;
        hours = hours ? hours : 12; // the hour '0' should be '12'
        hours = hours.toString();
    } else {
        hours = hours.toString().padStart(2, '0');
    }

    const timeString = `${hours}:${minutes}:${seconds}${ampm}`;

    timeElements.forEach(el => {
        el.innerText = timeString;
    });
}
