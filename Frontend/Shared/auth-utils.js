
/**
 * Shared Validation and Form Utils
 */

export function togglePasswordVisibility(btn) {
    const input = btn.previousElementSibling;
    const icon = btn.querySelector('i');

    if (input && input.tagName === 'INPUT') {
        if (input.type === 'password') {
            input.type = 'text';
            icon.classList.remove('fa-eye');
            icon.classList.add('fa-eye-slash');
            btn.setAttribute('aria-label', 'Hide password');
            btn.setAttribute('aria-expanded', 'true');
        } else {
            input.type = 'password';
            icon.classList.remove('fa-eye-slash');
            icon.classList.add('fa-eye');
            btn.setAttribute('aria-label', 'Show password');
            btn.setAttribute('aria-expanded', 'false');
        }
    }
}

export function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

export function validatePhone(phone) {
    const re = /^\d{10}$/;
    return re.test(phone);
}

export function calculatePasswordStrength(password) {
    let score = 0;
    if (!password) return 'weak';

    if (password.length > 6) score += 1;
    if (password.length > 10) score += 1;
    if (/[A-Z]/.test(password)) score += 1;
    if (/[0-9]/.test(password)) score += 1;
    if (/[^A-Za-z0-9]/.test(password)) score += 1;

    if (score < 3) return 'weak';
    if (score < 5) return 'medium';
    return 'strong';
}

/**
 * Shows an error message for a specific input field
 * @param {HTMLElement} inputElement - The input element related to the error
 * @param {string} message - The error message to display
 */
export function showError(inputElement, message) {
    const formGroup = inputElement.closest('.form-group') || inputElement.parentElement;
    let errorDisplay = formGroup.querySelector('.error-message-inline');

    if (!errorDisplay) {
        errorDisplay = document.createElement('div');
        errorDisplay.className = 'error-message-inline';
        errorDisplay.setAttribute('role', 'alert');
        errorDisplay.style.color = '#ef4444';
        errorDisplay.style.fontSize = '0.8rem';
        errorDisplay.style.marginTop = '0.25rem';
        formGroup.appendChild(errorDisplay);
    }

    errorDisplay.textContent = message;
    inputElement.classList.add('input-error');
    inputElement.setAttribute('aria-invalid', 'true');
    inputElement.setAttribute('aria-describedby', errorDisplay.id || '');
}

/**
 * Clears error message for a specific input field
 * @param {HTMLElement} inputElement - The input element to clear error for
 */
export function clearError(inputElement) {
    const formGroup = inputElement.closest('.form-group') || inputElement.parentElement;
    const errorDisplay = formGroup.querySelector('.error-message-inline');

    if (errorDisplay) {
        errorDisplay.textContent = '';
        errorDisplay.remove();
    }

    inputElement.classList.remove('input-error');
    inputElement.removeAttribute('aria-invalid');
    inputElement.removeAttribute('aria-describedby');
}
