import CONFIG from '../Shared/Utils/config.js';
import { showError, clearError, togglePasswordVisibility, calculatePasswordStrength } from '../Shared/Auth/auth-utils.js';
import { initInteractiveBackground } from '../Shared/Components/interactive-bg.js';

document.addEventListener('DOMContentLoaded', () => {
    // --- 0. Background Initialization ---
    initInteractiveBackground('interactive-bg');

    const step1 = document.getElementById('step-1');
    const step2 = document.getElementById('step-2');
    const step3 = document.getElementById('step-3');

    const usernameInput = document.getElementById('username');
    const emailInput = document.getElementById('email');
    const otpInput = document.getElementById('otp-input');
    const newPasswordInput = document.getElementById('new-password');
    const confirmPasswordInput = document.getElementById('confirm-password');

    const btnSendOtp = document.getElementById('btn-send-otp');
    const btnVerifyOtp = document.getElementById('btn-verify-otp');
    const btnBackStep1 = document.getElementById('btn-back-step1');
    const passwordForm = document.getElementById('forgot-password-form');

    const API_BASE = CONFIG.API_BASE_URL;

    // --- State Management ---
    function showStep(step) {
        step1.style.display = 'none';
        step2.style.display = 'none';
        step3.style.display = 'none';
        step.style.display = 'block';
    }

    async function apiCall(endpoint, body) {
        try {
            const response = await fetch(`${API_BASE}${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });
            const result = await response.json();
            if (!response.ok) {
                throw new Error(result.message || "Something went wrong. Please try again.");
            }
            return result;
        } catch (error) {
            throw error;
        }
    }

    // --- Step 1: Request Password Reset ---
    btnSendOtp.addEventListener('click', async () => {
        const username = usernameInput.value.trim();
        const email = emailInput.value.trim();

        if (!username) return showError(usernameInput, 'Please enter your Username.');
        clearError(usernameInput);
        
        if (!email) return showError(emailInput, 'Please enter your registered Email.');
        clearError(emailInput);

        btnSendOtp.disabled = true;
        btnSendOtp.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Sending...';

        try {
            const result = await apiCall('/users/forgot-password', { email, username });
            alert(result.message || "OTP has been sent to your email.");
            showStep(step2);
        } catch (error) {
            showError(btnSendOtp, error.message);
        } finally {
            btnSendOtp.disabled = false;
            btnSendOtp.innerText = 'Send Verification Code';
        }
    });

    // --- Step 2: Verify OTP (UI transition only, verify happens in Final Step) ---
    btnVerifyOtp.addEventListener('click', () => {
        const enteredOtp = otpInput.value.trim();
        if (enteredOtp.length === 6) {
            clearError(otpInput);
            showStep(step3);
        } else {
            showError(otpInput, 'Please enter the 6-digit OTP.');
        }
    });

    btnBackStep1.addEventListener('click', () => showStep(step1));

    // --- Step 3: Reset Password ---
    passwordForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        if (step1.style.display !== 'none') {
            btnSendOtp.click();
        } else if (step2.style.display !== 'none') {
            btnVerifyOtp.click();
        } else if (step3.style.display !== 'none') {
            const email = emailInput.value.trim();
            const otp = otpInput.value.trim();
            const newPassword = newPasswordInput.value;
            const confirmPass = confirmPasswordInput.value;

            if (newPassword !== confirmPass) {
                return showError(confirmPasswordInput, 'Passwords do not match.');
            }
            clearError(confirmPasswordInput);

            if (calculatePasswordStrength(newPassword) === 'weak') {
                return showError(newPasswordInput, 'Password is too weak. Needs at least 6 characters.');
            }
            clearError(newPasswordInput);

            const btnSubmit = document.querySelector('.btn-submit');
            btnSubmit.disabled = true;
            btnSubmit.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Saving...';

            try {
                const result = await apiCall('/users/reset-password', { email, otp, newPassword });
                alert(result.message || "Password updated successfully!");
                window.location.href = 'owner_login.html';
            } catch (error) {
                showError(btnSubmit, error.message);
                // If OTP was invalid, user might need to go back or retry
                if (error.message.toLowerCase().includes('otp')) {
                    showStep(step2);
                }
            } finally {
                btnSubmit.disabled = false;
                btnSubmit.innerText = 'Save Changes';
            }
        }
    });

    // Password Toggle Logic
    const toggleBtns = document.querySelectorAll('.input-icon');
    toggleBtns.forEach(btn => {
        btn.addEventListener('click', () => togglePasswordVisibility(btn));
    });

    // Password Strength Meter
    newPasswordInput.addEventListener('input', () => {
        const val = newPasswordInput.value;
        const result = calculatePasswordStrength(val);
        const segment = document.getElementById('strength-segment');
        const text = document.getElementById('strength-text');

        segment.className = 'strength-segment';
        if (val.length === 0) { segment.style.width = '0%'; text.innerText = ''; return; }

        if (result === 'weak') {
            segment.classList.add('weak'); segment.style.width = '33%'; text.innerText = 'Weak'; text.style.color = '#ef4444';
        } else if (result === 'medium') {
            segment.classList.add('medium'); segment.style.width = '66%'; text.innerText = 'Medium'; text.style.color = '#eab308';
        } else if (result === 'strong') {
            segment.classList.add('strong'); segment.style.width = '100%'; text.innerText = 'Strong'; text.style.color = '#22c55e';
        }
    });
});
