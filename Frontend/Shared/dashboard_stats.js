
// --- Dashboard Integration for Udhaar & Expenses ---

export function updateDashboardStats() {
    // 1. Get Udhaar Data
    const udhaarList = JSON.parse(localStorage.getItem('udhaarRecords')) || [];
    const totalPending = udhaarList
        .filter(item => item.balance > 0) // Changed from status 'pending' to check balance
        .reduce((sum, item) => sum + item.balance, 0);

    const udhaarEl = document.getElementById('dash-total-udhaar');
    if (udhaarEl) {
        udhaarEl.innerText = formatCurrency(totalPending);
    }

    // 2. Get Expense Data (Mock for now, or from future Expense Module)
    // For now, let's use a mock value or empty. 
    // Ideally user will create an 'Expense' module later.
    // Let's create a placeholder in localStorage if not exists
    let expenses = JSON.parse(localStorage.getItem('expenses')) || [];

    // Calculate Today's Expense
    const today = new Date().toISOString().split('T')[0];
    const todayExpense = expenses
        .filter(exp => exp.date === today)
        .reduce((sum, exp) => sum + exp.amount, 0);

    const expenseEl = document.getElementById('dash-today-expense');
    if (expenseEl) {
        // Mocking a value if 0 for demonstration, remove in production
        const displayValue = todayExpense > 0 ? todayExpense : 0;
        expenseEl.innerText = formatCurrency(displayValue);
    }

    updateNotifications();
}


export function updateNotifications() {
    // 1. Queries
    const queries = JSON.parse(localStorage.getItem('queries')) || []; // Assuming 'queries' key
    const unreadQueries = queries.filter(q => !q.read).length; // Assuming 'read' property, or just count all if not tracked
    // For demo, let's assume we simulate unread count based on list length if 'read' logic isn't fully there yet
    // Or better, store 'unreadCount' explicitly if user wants persistent notification until 'seen'.
    // User said: "The notification is still there until user see the complain"
    // So we need a way to mark them as seen.
    // Simplest: Store 'lastSeenQueryCount' or similar, or actually mark items.
    // Let's assume for now any item not marked 'read' is new. 
    // If 'read' property doesn't exist, we treat all as unread? No, that might be annoying.
    // Let's rely on a separate 'notifications' object in localStorage for simplicity across pages.

    let notifs = JSON.parse(localStorage.getItem('adminNotifications')) || { query: 0, complain: 0 };

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
    let notifs = JSON.parse(localStorage.getItem('adminNotifications')) || { query: 0, complain: 0 };
    notifs[type] = 0;
    localStorage.setItem('adminNotifications', JSON.stringify(notifs));
    updateBadge(type, 0);
    // Continue to link navigation default behavior
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
