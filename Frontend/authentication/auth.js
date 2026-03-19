
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

    const emailInput = document.getElementById('email');
    const phoneInput = document.getElementById('phone');
    const usernameInput = document.getElementById('username');
    const usernameFeedback = document.getElementById('username-feedback');

    if (usernameInput) {
        usernameInput.addEventListener('input', debounce(async (e) => {
            let val = e.target.value.toLowerCase();

            // Detect any character that is NOT allowed
            const invalidChars = val.match(/[^a-z0-9@_.]/);

            if (invalidChars) {
                // Warn user about the invalid character
                const badChar = invalidChars[0];
                usernameFeedback.textContent = `⚠ "${badChar}" is not allowed. Only letters, numbers, @, _ and . are permitted.`;
                usernameFeedback.style.color = '#f59e0b';
                // Strip invalid characters so the value stays clean
                val = val.replace(/[^a-z0-9@_.]/g, '');
                e.target.value = val;
                return;
            }

            // Also block usernames that END with a special character
            if (/[@_.]$/.test(val) && val.length > 0) {
                usernameFeedback.textContent = '⚠ Username cannot end with @, _ or .';
                usernameFeedback.style.color = '#f59e0b';
                return;
            }

            if (val.length < 3) {
                usernameFeedback.textContent = val.length > 0 ? 'Username must be at least 3 characters.' : '';
                usernameFeedback.style.color = '#9ca3af';
                return;
            }

            usernameFeedback.textContent = 'Checking...';
            usernameFeedback.style.color = '#9ca3af';

            try {
                const response = await fetch(`${CONFIG.API_BASE_URL}/users/check-username/${encodeURIComponent(val)}`);
                const result = await response.json();
                
                if (result.success) {
                    if (result.data.isAvailable) {
                        usernameFeedback.textContent = '✓ Available';
                        usernameFeedback.style.color = '#22c55e';
                    } else {
                        usernameFeedback.textContent = `✗ Taken. Try: ${result.data.recommendation}`;
                        usernameFeedback.style.color = '#ef4444';
                    }
                }
            } catch (err) {
                usernameFeedback.textContent = '';
                console.error("Username check failed", err);
            }
        }, 500));
    }

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
            const username = document.getElementById('username')?.value.toLowerCase();
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
                const response = await fetch(`${CONFIG.API_BASE_URL}/users/register`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        name: ownerName,
                        username,
                        shopName,
                        email: ownerEmail,
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

                // Store email for OTP page and redirect
                sessionStorage.setItem('pendingVerificationEmail', ownerEmail);
                window.location.href = 'verify_otp.html';

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
                const response = await fetch(`${CONFIG.API_BASE_URL}/users/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ emailOrUsername: emailOrId, password })
                });



                const result = await response.json();

                if (response.ok) {
                    // Success: Save user data and token for authenticated requests
                    localStorage.setItem('currentUser', JSON.stringify(result.data.user));
                    localStorage.setItem('authToken', result.data.accessToken);
                    localStorage.setItem('refreshToken', result.data.refreshToken);

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
    // Helper: Debounce
    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
});
