
import { initInteractiveBackground } from '../Shared/interactive-bg.js';
import { togglePasswordVisibility, showError, clearError } from '../Shared/auth-utils.js';

document.addEventListener('DOMContentLoaded', () => {
    // --- Initialize Background ---
    initInteractiveBackground('interactive-bg', { orbCount: 3 });

    // --- Form Elements ---
    const loginForm = document.getElementById('employee-login-form');
    const togglePasswordBtn = document.getElementById('toggle-password');
    const passwordInput = document.getElementById('password');

    // --- Toggle Password Visibility ---
    if (togglePasswordBtn) {
        togglePasswordBtn.addEventListener('click', () => {
            togglePasswordVisibility(togglePasswordBtn);
        });
    }

    // --- Handle Login ---
    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();

            const empIdInput = document.getElementById('employee-id');
            const passwordInput = document.getElementById('password'); // Use local or from outer scope is fine

            const empId = empIdInput.value.trim();
            const password = passwordInput.value.trim();

            // Clear previous errors
            clearError(empIdInput);
            clearError(passwordInput);

            let isValid = true;

            if (!empId) {
                showError(empIdInput, 'Employee ID is required');
                isValid = false;
            }

            if (!password) {
                showError(passwordInput, 'Password is required');
                isValid = false;
            }

            if (!isValid) return;

            // Simulate loading
            const loginBtn = loginForm.querySelector('.btn-login');
            const originalContent = loginBtn.innerHTML;

            loginBtn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Processing...';
            loginBtn.disabled = true;

            setTimeout(() => {
                // 1. Check if Owner credentials entered by mistake
                const owners = JSON.parse(localStorage.getItem('quadstock_users') || '[]');
                const owner = owners.find(o =>
                    (o.email && o.email.toLowerCase() === empId.toLowerCase()) ||
                    (o.uniqueId && o.uniqueId.toUpperCase() === empId.toUpperCase())
                );

                // Note: We don't check owner password here strictly for redirection hint, 
                // but for security we should probably only redirect if password also matches or just hint based on ID format.
                // The prompt says: "If an Owner tries to log in here...". 
                // Let's check password too to be sure it's a valid login attempt.
                const ownerMatch = owner && (passwordInput.value === owner.password);

                if (ownerMatch) {
                    showError(empIdInput, 'Owner credentials detected. Redirecting to Owner Portal...');
                    setTimeout(() => {
                        window.location.href = 'login.html';
                    }, 2000);
                    return;
                }

                // 2. Check Employee Credentials
                const employees = JSON.parse(localStorage.getItem('quadstock_employees') || '[]');
                const employee = employees.find(e => e.empId === empId && e.password === password);

                if (employee) {
                    // Success
                    localStorage.setItem('currentEmployee', JSON.stringify(employee));

                    loginBtn.innerHTML = '<i class="fa-solid fa-check"></i> Success!';
                    loginBtn.style.background = '#22c55e'; // Green

                    setTimeout(() => {
                        window.location.href = '../Employees/staff_dashboard.html'; // Or dashboard based on role
                    }, 500);
                } else {
                    // Fail
                    showError(loginBtn, 'Invalid Employee ID or Password.');
                    loginBtn.innerHTML = originalContent;
                    loginBtn.disabled = false;
                }

            }, 1000);
        });

        // Clear errors on input
        const inputs = loginForm.querySelectorAll('input');
        inputs.forEach(input => {
            input.addEventListener('input', () => clearError(input));
        });
    }
});
