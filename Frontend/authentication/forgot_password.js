
import { showError, clearError, togglePasswordVisibility, calculatePasswordStrength } from '../Shared/auth-utils.js';

document.addEventListener('DOMContentLoaded', () => {

    const step1 = document.getElementById('step-1');
    const step2 = document.getElementById('step-2');
    const step3 = document.getElementById('step-3');

    const ownerIdInput = document.getElementById('owner-id');
    const emailInput = document.getElementById('email');
    const otpInput = document.getElementById('otp-input');
    const newPasswordInput = document.getElementById('new-password');
    const confirmPasswordInput = document.getElementById('confirm-password');

    const btnSendOtp = document.getElementById('btn-send-otp');
    const btnVerifyOtp = document.getElementById('btn-verify-otp');
    const btnBackStep1 = document.getElementById('btn-back-step1');

    let generatedOtp = '';
    let validatedUser = null;

    // --- State Management ---
    function showStep(step) {
        step1.style.display = 'none';
        step2.style.display = 'none';
        step3.style.display = 'none';
        step.style.display = 'block';
    }

    // --- Step 1: Validate User & Send OTP ---
    btnSendOtp.addEventListener('click', () => {
        const ownerId = ownerIdInput.value.trim();
        const email = emailInput.value.trim();

        if (!ownerId) {
            showError(ownerIdInput, 'Please enter your Owner ID.');
            return;
        } else {
            clearError(ownerIdInput);
        }

        if (!email) {
            showError(emailInput, 'Please enter your registered Email.');
            return;
        } else {
            clearError(emailInput);
        }

        // Mock Validation
        const users = JSON.parse(localStorage.getItem('quadstock_users') || '[]');
        const user = users.find(u => u.uniqueId === ownerId && u.email.toLowerCase() === email.toLowerCase());

        if (user) {
            validatedUser = user;
            // Generate OTP (Mock)
            generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
            // In a real app, this would trigger an API call to send email
            alert(`Your OTP for Password Reset is: ${generatedOtp}`);

            // Transition directly to OTP step for UX smoothness in mock
            showStep(step2);
        } else {
            showError(step1, 'No user found with these details. Please check your ID and Email.');
        }
    });

    // --- Step 2: Verify OTP ---
    btnVerifyOtp.addEventListener('click', () => {
        const enteredOtp = otpInput.value.trim();
        if (enteredOtp === generatedOtp) {
            clearError(otpInput);
            showStep(step3);
        } else {
            showError(otpInput, 'Invalid OTP. Please try again.');
        }
    });

    btnBackStep1.addEventListener('click', () => {
        showStep(step1);
    });

    // --- Step 3: Reset Password ---
    const passwordForm = document.getElementById('forgot-password-form');
    // Note: The form submit event likely wraps all buttons, so we need to be careful.
    // However, since we used type="button" for the first two steps, only the last button (default submit) triggers.

    passwordForm.addEventListener('submit', (e) => {
        e.preventDefault();

        if (step1.style.display !== 'none') {
            btnSendOtp.click();
        } else if (step2.style.display !== 'none') {
            btnVerifyOtp.click();
        } else if (step3.style.display !== 'none') {
            // Final Step Logic
            const newPass = newPasswordInput.value;
            const confirmPass = confirmPasswordInput.value;

            // Validation
            let isValid = true;
            if (newPass !== confirmPass) {
                showError(confirmPasswordInput, 'Passwords do not match.');
                isValid = false;
            } else {
                clearError(confirmPasswordInput);
            }

            if (calculatePasswordStrength(newPass) === 'weak') {
                showError(newPasswordInput, 'Password is too weak. at least 6 characters.');
                isValid = false;
            } else {
                clearError(newPasswordInput);
            }

            if (!isValid) return;

            // Update User Data
            const users = JSON.parse(localStorage.getItem('quadstock_users') || '[]');
            const userIndex = users.findIndex(u => u.uniqueId === validatedUser.uniqueId);

            if (userIndex !== -1) {
                // Update specific user
                users[userIndex].email = validatedUser.email; // Ensure email is same just in case
                users[userIndex].password = newPass;
                localStorage.setItem('quadstock_users', JSON.stringify(users));

                alert('Password reset successfully! Redirecting to login...');
                window.location.href = 'login.html';
            } else {
                showError(step3, 'Error updating user. Please try again later.');
            }
        }
    });

    // --- Helpers ---
    // Password Toggle
    const toggleBtn = document.querySelector('.input-icon');
    if (toggleBtn) {
        toggleBtn.addEventListener('click', () => togglePasswordVisibility(toggleBtn));
    }

    // Password Strength
    const strengthSegment = document.getElementById('strength-segment');
    const strengthText = document.getElementById('strength-text');

    newPasswordInput.addEventListener('input', () => {
        const val = newPasswordInput.value;
        const result = calculatePasswordStrength(val);

        // Reset classes
        strengthSegment.className = 'strength-segment';
        strengthText.innerText = '';

        if (val.length === 0) {
            strengthSegment.style.width = '0%';
            return;
        }

        if (result === 'weak') {
            strengthSegment.classList.add('weak');
            strengthSegment.style.width = '33%';
            strengthText.innerText = 'Weak';
            strengthText.style.color = '#ef4444';
        } else if (result === 'medium') {
            strengthSegment.classList.add('medium');
            strengthSegment.style.width = '66%';
            strengthText.innerText = 'Medium';
            strengthText.style.color = '#eab308';
        } else if (result === 'strong') {
            strengthSegment.classList.add('strong');
            strengthSegment.style.width = '100%';
            strengthText.innerText = 'Strong';
            strengthText.style.color = '#22c55e';
        }
    });

});
