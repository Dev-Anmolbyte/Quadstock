/* quad-modals.js - Universal Custom Modal System */

const QuadModals = {
    // 1. Toast System
    showToast(message, type = 'success', duration = 3000) {
        let container = document.querySelector('.quad-toast-container');
        if (!container) {
            container = document.createElement('div');
            container.className = 'quad-toast-container';
            document.body.appendChild(container);
        }

        const toast = document.createElement('div');
        toast.className = `quad-toast ${type}`;

        let icon = 'fa-check-circle';
        if (type === 'error') icon = 'fa-exclamation-circle';
        if (type === 'info') icon = 'fa-info-circle';

        toast.innerHTML = `
            <i class="fa-solid ${icon}"></i>
            <span>${message}</span>
        `;

        container.appendChild(toast);

        setTimeout(() => {
            toast.classList.add('fade-out');
            setTimeout(() => toast.remove(), 300);
        }, duration);
    },

    // 2. Dialog System (Confirm/Prompt/Alert Replacements)
    init() {
        if (document.getElementById('quad-dialog-overlay')) return;

        const overlay = document.createElement('div');
        overlay.id = 'quad-dialog-overlay';
        overlay.className = 'quad-dialog-overlay';
        overlay.innerHTML = `
            <div class="quad-dialog">
                <div class="quad-dialog-header">
                    <div id="quad-dialog-icon" class="quad-dialog-icon"></div>
                    <h3 id="quad-dialog-title">Title</h3>
                </div>
                <p id="quad-dialog-text">Message goes here...</p>
                <input type="text" id="quad-dialog-input" class="quad-dialog-input" style="display:none;">
                <div class="quad-dialog-actions">
                    <button id="quad-dialog-cancel" class="quad-btn quad-btn-cancel">Cancel</button>
                    <button id="quad-dialog-confirm" class="quad-btn quad-btn-confirm">Confirm</button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);
    },

    confirm(title, message, options = {}) {
        this.init();
        const overlay = document.getElementById('quad-dialog-overlay');
        const iconDiv = document.getElementById('quad-dialog-icon');
        const confirmBtn = document.getElementById('quad-dialog-confirm');
        const cancelBtn = document.getElementById('quad-dialog-cancel');
        const inputField = document.getElementById('quad-dialog-input');

        document.getElementById('quad-dialog-title').textContent = title;
        document.getElementById('quad-dialog-text').textContent = message;
        inputField.style.display = 'none';

        iconDiv.innerHTML = `<i class="fa-solid ${options.icon || 'fa-triangle-exclamation'}"></i>`;
        iconDiv.className = `quad-dialog-icon ${options.type || 'delete'}`;

        confirmBtn.textContent = options.confirmText || 'Confirm';
        confirmBtn.className = `quad-btn ${options.isDanger ? 'quad-btn-danger' : 'quad-btn-confirm'}`;

        cancelBtn.style.display = options.hideCancel ? 'none' : 'block';

        overlay.classList.add('active');

        return new Promise((resolve) => {
            const handleConfirm = () => {
                cleanup();
                resolve(true);
            };
            const handleCancel = () => {
                cleanup();
                resolve(false);
            };
            const cleanup = () => {
                overlay.classList.remove('active');
                confirmBtn.removeEventListener('click', handleConfirm);
                cancelBtn.removeEventListener('click', handleCancel);
            };

            confirmBtn.addEventListener('click', handleConfirm);
            cancelBtn.addEventListener('click', handleCancel);
        });
    },

    prompt(title, message, defaultValue = "") {
        this.init();
        const overlay = document.getElementById('quad-dialog-overlay');
        const iconDiv = document.getElementById('quad-dialog-icon');
        const confirmBtn = document.getElementById('quad-dialog-confirm');
        const cancelBtn = document.getElementById('quad-dialog-cancel');
        const inputField = document.getElementById('quad-dialog-input');

        document.getElementById('quad-dialog-title').textContent = title;
        document.getElementById('quad-dialog-text').textContent = message;

        inputField.style.display = 'block';
        inputField.value = defaultValue;
        inputField.placeholder = "Type here...";

        iconDiv.innerHTML = `<i class="fa-solid fa-keyboard"></i>`;
        iconDiv.className = `quad-dialog-icon input`;

        confirmBtn.textContent = 'Submit';
        confirmBtn.className = 'quad-btn quad-btn-confirm';
        cancelBtn.style.display = 'block';

        overlay.classList.add('active');
        inputField.focus();

        return new Promise((resolve) => {
            const handleConfirm = () => {
                const val = inputField.value;
                cleanup();
                resolve(val);
            };
            const handleCancel = () => {
                cleanup();
                resolve(null);
            };
            const cleanup = () => {
                overlay.classList.remove('active');
                confirmBtn.removeEventListener('click', handleConfirm);
                cancelBtn.removeEventListener('click', handleCancel);
            };

            confirmBtn.addEventListener('click', handleConfirm);
            cancelBtn.addEventListener('click', handleCancel);
        });
    },

    alert(title, message, type = 'info') {
        return this.confirm(title, message, {
            type: type,
            icon: type === 'success' ? 'fa-circle-check' : 'fa-info-circle',
            hideCancel: true,
            confirmText: 'OK',
            isDanger: false
        });
    }
};

// Export to window
window.QuadModals = QuadModals;
window.quadAlert = (msg) => QuadModals.showToast(msg, 'info');
window.quadSuccess = (msg) => QuadModals.showToast(msg, 'success');
window.quadError = (msg) => QuadModals.showToast(msg, 'error');
