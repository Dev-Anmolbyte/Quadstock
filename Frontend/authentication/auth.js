
import { initInteractiveBackground } from '../Shared/Components/interactive-bg.js';
import { togglePasswordVisibility, calculatePasswordStrength, validateEmail, validatePhone, showError, clearError } from '../Shared/Auth/auth-utils.js';
import CONFIG from '../Shared/Utils/config.js';

// --- Main Logic ---
document.addEventListener('DOMContentLoaded', () => {
    // --- Interactive Background Logic ---
    initInteractiveBackground('interactive-bg', { orbCount: 4 });

    // --- Password Visibility Toggle ---
    const toggleButtons = document.querySelectorAll('.input-icon');

    toggleButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            togglePasswordVisibility(btn);
        });
    });

    // --- Password Strength Meter (Signup Page) ---
    const passwordInput = document.getElementById('signup-password');
    const strengthSegment = document.getElementById('strength-segment');
    const strengthText = document.getElementById('strength-text');

    if (passwordInput && strengthSegment && strengthText) {
        passwordInput.addEventListener('input', () => {
            const val = passwordInput.value;
            const result = calculatePasswordStrength(val);

            // Reset classes
            strengthSegment.className = 'strength-segment';
            strengthSegment.style.width = '0%';
            strengthText.innerText = '';

            if (val.length === 0) return;

            if (result === 'weak') {
                strengthSegment.classList.add('weak');
                strengthText.innerText = 'Weak';
                strengthText.style.color = '#ef4444';
            } else if (result === 'medium') {
                strengthSegment.classList.add('medium');
                strengthText.innerText = 'Medium';
                strengthText.style.color = '#eab308';
            } else if (result === 'strong') {
                strengthSegment.classList.add('strong');
                strengthText.innerText = 'Strong';
                strengthText.style.color = '#22c55e';
            }
        });
    }

    // --- Input Validations ---
    const emailInput = document.getElementById('email');
    const phoneInput = document.getElementById('phone');

    if (emailInput) {
        emailInput.addEventListener('blur', (e) => {
            const val = e.target.value;
            if (val && !validateEmail(val)) {
                showError(emailInput, 'Please enter a valid email address.');
            } else {
                clearError(emailInput);
            }
        });
        emailInput.addEventListener('input', () => clearError(emailInput));
    }

    if (phoneInput) {
        phoneInput.addEventListener('input', (e) => {
            let val = e.target.value;
            val = val.replace(/\D/g, '');
            if (val.length > 10) val = val.slice(0, 10);
            if (val !== e.target.value) e.target.value = val;
            clearError(phoneInput);
        });
        phoneInput.addEventListener('blur', (e) => {
            const val = e.target.value;
            if (val && !validatePhone(val)) {
                showError(phoneInput, 'Phone number must be exactly 10 digits.');
            } else {
                clearError(phoneInput);
            }
        });
    }

    // --- Authentication Logic ---
    const loginForm = document.getElementById('login-form');
    const signupForm = document.getElementById('signup-form');
    const loginError = document.getElementById('login-error');

    if (signupForm) {
        signupForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const submitBtn = signupForm.querySelector('button[type="submit"]');
            
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.dataset.originalText = submitBtn.innerText;
                submitBtn.innerText = 'Creating Account...';
            }

            const restoreBtn = () => {
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.innerText = submitBtn.dataset.originalText || 'Register Shop';
                }
            };

            const ownerEmail = document.getElementById('email').value;
            const password = document.getElementById('signup-password').value;
            const confirmPass = document.getElementById('confirm-password').value;
            const ownerName = document.getElementById('owner-name').value;
            const shopName = document.getElementById('shop-name').value;
            const phoneNumber = document.getElementById('phone').value;

            let isValid = true;

            // Basic Local Validation
            if (password !== confirmPass) {
                showError(document.getElementById('confirm-password'), 'Passwords do not match!');
                isValid = false;
            } else {
                clearError(document.getElementById('confirm-password'));
            }

            if (calculatePasswordStrength(password) === 'weak') {
                showError(document.getElementById('signup-password'), 'Password is too weak. Please use at least 6 characters.');
                isValid = false;
            } else {
                clearError(document.getElementById('signup-password'));
            }

            if (!isValid) { restoreBtn(); return; }

            try {
                // Real API Request
                const response = await fetch(`${CONFIG.API_BASE_URL}/owner/register`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        ownerName,
                        shopName,
                        ownerEmail,
                        phoneNumber,
                        password,
                        role: 'owner'
                    })
                });

                const result = await response.json();

                if (!response.ok) {
                    // API error response
                    if (result.message.toLowerCase().includes('email') || result.message.toLowerCase().includes('user')) {
                        showError(document.getElementById('email'), result.message);
                    } else {
                        alert(`Error: ${result.message}`);
                    }
                    restoreBtn();
                    return;
                }

                // Show Success Modal with Server-Side Owner ID
                const modal = document.getElementById('signup-success-modal');
                const ownerIdDisplay = document.getElementById('generated-owner-id');
                const copyBtn = document.getElementById('copy-id-btn');
                const ownerId = result.data.ownerId;

                restoreBtn();

                if (modal && ownerIdDisplay) {
                    ownerIdDisplay.textContent = ownerId;
                    modal.classList.add('active');

                    if (copyBtn) {
                        copyBtn.onclick = () => {
                            navigator.clipboard.writeText(ownerId).then(() => {
                                const originalIcon = '<i class="fa-regular fa-copy"></i>';
                                copyBtn.innerHTML = '<i class="fa-solid fa-check"></i>';
                                copyBtn.style.color = 'var(--primary-green)';
                                setTimeout(() => {
                                    copyBtn.innerHTML = originalIcon;
                                    copyBtn.style.color = '';
                                }, 2000);
                            });
                        };
                    }
                } else {
                    alert(`Registration Successful! Your Owner ID is: ${ownerId}`);
                    window.location.href = 'login.html';
                }

            } catch (err) {
                console.error('Network Error:', err);
                alert('Connection to backend failed. Make sure the server is running on port 3000.');
                restoreBtn();
            }
        });
    }

    if (loginForm) {
        // Clear error on input
        const inputs = loginForm.querySelectorAll('input');
        inputs.forEach(inp => {
            inp.addEventListener('input', () => {
                if (loginError) {
                    loginError.style.display = 'none';
                    loginError.textContent = '';
                }
            });
        });

        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const submitBtn = loginForm.querySelector('button[type="submit"]');
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.dataset.originalText = submitBtn.innerText;
                submitBtn.innerText = 'Logging in...';
            }
            const restoreBtn = () => {
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.innerText = submitBtn.dataset.originalText || 'Login';
                }
            };

            const emailOrId = document.getElementById('login-id').value.trim();
            const password = document.getElementById('password').value.trim();

            if (!emailOrId || !password) {
                if (loginError) {
                    loginError.style.display = 'block';
                    loginError.textContent = 'Please enter your details.';
                }
                restoreBtn();
                return;
            }

            try {
                // Real API Request for Login
                const response = await fetch(`${CONFIG.API_BASE_URL}/owner/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ emailOrId, password })
                });

                const result = await response.json();

                if (response.ok) {
                    // Success: Save user data and redirect
                    localStorage.setItem('currentUser', JSON.stringify(result.data));
                    window.location.href = '../Ownerdashboard/dashboard.html';
                } else {
                    // Error: Show message from server
                    if (loginError) {
                        loginError.style.display = 'block';
                        loginError.textContent = result.message || 'Invalid credentials. Please try again.';
                    }
                    restoreBtn();
                }

            } catch (err) {
                console.error('Login Network Error:', err);
                if (loginError) {
                    loginError.style.display = 'block';
                    loginError.textContent = 'Server connection failed. Please try again later.';
                }
                restoreBtn();
            }
        });
    }
});
