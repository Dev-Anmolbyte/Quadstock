
import { initInteractiveBackground } from '../Shared/Components/interactive-bg.js';
import { togglePasswordVisibility, calculatePasswordStrength, validateEmail, validatePhone, showError, clearError } from '../Shared/Auth/auth-utils.js';

// --- Main Logic ---
document.addEventListener('DOMContentLoaded', () => {
    // --- Interactive Background Logic ---
    // Pass the container ID
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

    // --- Input Validations (Email & Phone) ---
    const emailInput = document.getElementById('email');
    const phoneInput = document.getElementById('phone');

    if (emailInput) {
        emailInput.addEventListener('blur', (e) => { // Validate on blur, not input
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
        // Enforce Numbers Only and Max Length 10
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

    // --- Authentication Logic (Simulation) ---
    const loginForm = document.getElementById('login-form');
    const signupForm = document.getElementById('signup-form');
    const loginError = document.getElementById('login-error');

    // MOCK DATABASE HELPER
    const getUsers = () => JSON.parse(localStorage.getItem('quadstock_users') || '[]');
    const saveUser = (user) => {
        const users = getUsers();
        users.push(user);
        localStorage.setItem('quadstock_users', JSON.stringify(users));
    };

    if (signupForm) {
        signupForm.addEventListener('submit', (e) => {
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

            const email = document.getElementById('email').value;
            const password = document.getElementById('signup-password').value;
            const confirmPass = document.getElementById('confirm-password').value;
            const ownerName = document.getElementById('owner-name').value;
            const shopName = document.getElementById('shop-name').value;
            const phone = document.getElementById('phone').value;

            let isValid = true;

            // Basic Validation
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

            if (!validatePhone(phone)) {
                showError(document.getElementById('phone'), 'Phone number must be exactly 10 digits.');
                isValid = false;
            } else {
                clearError(document.getElementById('phone'));
            }

            if (!isValid) { restoreBtn(); return; }

            // Check if user exists
            const users = getUsers();
            if (users.find(u => u.email === email)) {
                showError(document.getElementById('email'), 'User already exists with this email. Please Login.');
                // setTimeout(() => window.location.href = 'login.html', 2000); // Optional auto-redirect
                restoreBtn();
                return;
            } else {
                clearError(document.getElementById('email'));
            }

            // Generate Owner ID
            const ownerId = 'QS-' + Math.floor(10000 + Math.random() * 90000);

            // Register User
            const newUser = {
                email,
                password: btoa(password), // Storing Base64 encoded password for basic obfuscation
                ownerName,
                shopName,
                phone,
                ownerId: ownerId
            };

            saveUser(newUser);

            // Show Success Modal
            const modal = document.getElementById('signup-success-modal');
            const ownerIdDisplay = document.getElementById('generated-owner-id');
            const copyBtn = document.getElementById('copy-id-btn');

            restoreBtn(); // Done processing

            if (modal && ownerIdDisplay) {
                ownerIdDisplay.textContent = ownerId;
                modal.classList.add('active');

                // Copy Functionality
                if (copyBtn) {
                    copyBtn.onclick = () => { // Use onclick to avoid multiple bindings if re-run
                        navigator.clipboard.writeText(ownerId).then(() => {
                            const originalIcon = '<i class="fa-regular fa-copy"></i>';
                            copyBtn.innerHTML = '<i class="fa-solid fa-check"></i>';
                            copyBtn.style.color = 'var(--primary-green)';
                            setTimeout(() => {
                                copyBtn.innerHTML = originalIcon;
                                copyBtn.style.color = '';
                            }, 2000);
                        }).catch(err => {
                            console.error('Failed to copy: ', err);
                            // Fallback for non-secure contexts
                            const textArea = document.createElement("textarea");
                            textArea.value = ownerId;
                            document.body.appendChild(textArea);
                            textArea.select();
                            try {
                                document.execCommand('copy');
                                const originalIcon = '<i class="fa-regular fa-copy"></i>';
                                copyBtn.innerHTML = '<i class="fa-solid fa-check"></i>';
                                copyBtn.style.color = 'var(--primary-green)';
                                setTimeout(() => {
                                    copyBtn.innerHTML = originalIcon;
                                    copyBtn.style.color = '';
                                }, 2000);
                            } catch (err) {
                                console.error('Fallback copy failed', err);
                            }
                            document.body.removeChild(textArea);
                        });
                    };
                }
            } else {
                // Fallback if modal elements missing
                alert(`Registration Successful! Your Owner ID is: ${ownerId}`);
                window.location.href = 'login.html';
            }
        });
    }

    if (loginForm) {
        // Also clear error on input
        const inputs = loginForm.querySelectorAll('input');
        inputs.forEach(inp => {
            inp.addEventListener('input', () => {
                if (loginError) {
                    loginError.style.display = 'none';
                    loginError.textContent = '';
                }
            });
        });

        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();

            const submitBtn = loginForm.querySelector('button[type="submit"]');
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.dataset.originalText = submitBtn.innerText;
                submitBtn.innerText = 'Loggin in...';
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

            const users = getUsers();
            const user = users.find(u =>
                (u.email && u.email.toLowerCase() === emailOrId.toLowerCase()) ||
                (u.phone && u.phone === emailOrId) ||
                (u.ownerId && u.ownerId.toUpperCase() === emailOrId.toUpperCase())
            );

            if (user) {
                // Owner Found
                let isPasswordValid = false;

                if (user.password === password) {
                    // Plain text match - Upgrade to Base64
                    user.password = btoa(password);
                    localStorage.setItem('quadstock_users', JSON.stringify(users));
                    isPasswordValid = true;
                } else if (user.password === btoa(password)) {
                    // Base64 match
                    isPasswordValid = true;
                }

                if (isPasswordValid) {
                    localStorage.setItem('currentUser', JSON.stringify(user));
                    window.location.href = '../Ownerdashboard/dashboard.html';
                } else {
                    if (loginError) {
                        loginError.style.display = 'block';
                        loginError.textContent = 'Invalid credentials. Please try again.';
                    }
                    restoreBtn();
                }
            } else {
                // Not Owner. Check if Employee Credentials.
                const employees = JSON.parse(localStorage.getItem('quadstock_employees') || '[]');
                const employee = employees.find(e =>
                    ((e.empId && e.empId.toUpperCase() === emailOrId.toUpperCase()) ||
                        (e.email && e.email.toLowerCase() === emailOrId.toLowerCase())) &&
                    e.password === password
                );

                if (employee) {
                    if (loginError) {
                        loginError.style.display = 'block';
                        loginError.style.backgroundColor = 'rgba(239, 68, 68, 0.1)';
                        loginError.style.borderColor = '#ef4444';
                        loginError.style.color = '#ef4444';
                        loginError.innerHTML = '<strong>Access Denied.</strong> Employee credentials detected.<br>Redirecting to Staff Portal...';
                    }
                    setTimeout(() => {
                        window.location.href = 'employee_login.html';
                    }, 3000);
                    return; // Don't restore button here to prevent double clicks during redirect wait
                }

                // Not found anywhere
                if (loginError) {
                    loginError.style.display = 'block';
                    loginError.textContent = 'User not found. Redirecting to signup...';
                }
                setTimeout(() => {
                    window.location.href = 'signup.html';
                }, 1500);
            }
        });
    }
});
