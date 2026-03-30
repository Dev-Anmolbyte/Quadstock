
import { initInteractiveBackground } from '../Shared/Components/interactive-bg.js';
import { togglePasswordVisibility, showError, clearError } from '../Shared/Auth/auth-utils.js';
import CONFIG from '../Shared/Utils/config.js';

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
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const empIdInput = document.getElementById('employee-id');
            const passwordInput = document.getElementById('password');

            const emailOrUsername = empIdInput.value.trim();
            const password = passwordInput.value.trim();

            // Clear previous errors
            clearError(empIdInput);
            clearError(passwordInput);

            let isValid = true;
            if (!emailOrUsername) {
                showError(empIdInput, 'Username or Email is required');
                isValid = false;
            }
            if (!password) {
                showError(passwordInput, 'Password is required');
                isValid = false;
            }

            if (!isValid) return;

            const loginBtn = loginForm.querySelector('.btn-login');
            const originalContent = loginBtn.innerHTML;

            loginBtn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Processing...';
            loginBtn.disabled = true;

            try {
                const response = await fetch(`${CONFIG.API_BASE_URL}/users/login`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ emailOrUsername, password })
                });

                const result = await response.json();

                if (result.success) {
                    const user = result.data.user;
                    const token = result.data.accessToken;

                    // Role Check: Employees should not be owners
                    if (user.role === 'owner') {
                        showError(empIdInput, 'Owner account detected. Redirecting to Owner Portal...');
                        setTimeout(() => {
                            window.location.href = 'owner_login.html';
                        }, 2000);
                        return;
                    }

                    // Success Login for Staff
                    // Success Login for Staff in sessionStorage
                    sessionStorage.setItem('authToken', token);
                    sessionStorage.setItem('currentEmployee', JSON.stringify(user));
                    sessionStorage.removeItem('currentUser'); // Ensure no owner session in sessionStorage

                    loginBtn.innerHTML = '<i class="fa-solid fa-check"></i> Success!';
                    loginBtn.style.background = '#22c55e';

                    setTimeout(() => {
                        window.location.href = '../StaffDashboard/staff_dashboard.html';
                    }, 1000);

                } else {
                    showError(loginBtn, result.message || 'Invalid credentials');
                    loginBtn.innerHTML = originalContent;
                    loginBtn.disabled = false;
                }
            } catch (error) {
                console.error("Login Error:", error);
                showError(loginBtn, "Connection error. Please try again.");
                loginBtn.innerHTML = originalContent;
                loginBtn.disabled = false;
            }
        });

        // Clear errors on input
        const inputs = loginForm.querySelectorAll('input');
        inputs.forEach(input => {
            input.addEventListener('input', () => clearError(input));
        });
    }
});
