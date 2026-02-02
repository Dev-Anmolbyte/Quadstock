

// --- Main Logic ---
document.addEventListener('DOMContentLoaded', () => {
    // --- Interactive Background Logic ---
    const bgContainer = document.getElementById('interactive-bg');
    if (bgContainer) {
        initInteractiveBackground(bgContainer);
    }

    function initInteractiveBackground(container) {
        const orbCount = 4;
        const orbs = [];
        const mouse = { x: window.innerWidth / 2, y: window.innerHeight / 2, isActive: false };
        let mouseTimer = null;


        // Initialize Orbs
        for (let i = 1; i <= orbCount; i++) {
            const orb = document.createElement('div');
            orb.classList.add('bg-orb');
            orb.style.backgroundColor = `var(--orb-${i})`;

            // Random sizes
            const size = Math.random() * 300 + 400; // 400-700px
            orb.style.width = `${size}px`;
            orb.style.height = `${size}px`;

            container.appendChild(orb);

            orbs.push({
                element: orb,
                x: Math.random() * window.innerWidth,
                y: Math.random() * window.innerHeight,
                vx: (Math.random() - 0.5) * 4, // FASTER Random velocity (increased from 1.5 to 4)
                vy: (Math.random() - 0.5) * 4,
                targetX: Math.random() * window.innerWidth,
                targetY: Math.random() * window.innerHeight,
                size: size
            });
        }

        // Mouse Events (Only active when moving ON the window)
        window.addEventListener('mousemove', (e) => {
            mouse.x = e.clientX;
            mouse.y = e.clientY;
            mouse.isActive = true;

            // Reset idle timer
            clearTimeout(mouseTimer);
            mouseTimer = setTimeout(() => {
                mouse.isActive = false;
            }, 2000); // 2 seconds idle
        });


        // Animation Loop
        function animate() {
            orbs.forEach((orb, index) => {
                // Active if mouse moving OR user is typing
                const isActiveMode = mouse.isActive;

                if (isActiveMode) {
                    // MOUSE/TYPING FOLLOW MODE (Swarming TIGHTER)
                    // Reduce lag to make them converge faster
                    const lag = 0.05 + (index * 0.015);

                    // Reduce wobble to make them cluster tighter
                    const wobble = Math.sin(Date.now() / 800 + index) * 20;

                    const dx = mouse.x - orb.x + wobble;
                    const dy = mouse.y - orb.y + wobble;

                    orb.x += dx * lag;
                    orb.y += dy * lag;
                } else {
                    // IDLE MODE (FAST Random Floating)
                    // Move towards random targets
                    const dx = orb.targetX - orb.x;
                    const dy = orb.targetY - orb.y;

                    // Distance check
                    if (Math.sqrt(dx * dx + dy * dy) < 100) {
                        // Pick new target
                        orb.targetX = Math.random() * window.innerWidth;
                        orb.targetY = Math.random() * window.innerHeight;
                    }

                    // Move smooth but faster
                    orb.x += orb.vx;
                    orb.y += orb.vy;

                    // Bounce off walls
                    if (orb.x < -200 || orb.x > window.innerWidth + 200) orb.vx *= -1;
                    if (orb.y < -200 || orb.y > window.innerHeight + 200) orb.vy *= -1;
                }

                // Apply transform
                orb.element.style.transform = `translate(${orb.x}px, ${orb.y}px) translate(-50%, -50%)`;
            });
            requestAnimationFrame(animate);
        }

        animate();
    }

    // --- Password Visibility Toggle ---
    const toggleButtons = document.querySelectorAll('.input-icon');

    toggleButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            // Find the input element within the same parent wrapper
            const input = btn.previousElementSibling;
            const icon = btn.querySelector('i');

            if (input && input.tagName === 'INPUT') {
                if (input.type === 'password') {
                    input.type = 'text';
                    icon.classList.remove('fa-eye');
                    icon.classList.add('fa-eye-slash');
                } else {
                    input.type = 'password';
                    icon.classList.remove('fa-eye-slash');
                    icon.classList.add('fa-eye');
                }
            }
        });
    });

    // --- Password Strength Meter (Signup Page) ---
    const passwordInput = document.getElementById('signup-password');
    const strengthSegment = document.getElementById('strength-segment');
    const strengthText = document.getElementById('strength-text');

    if (passwordInput && strengthSegment && strengthText) {
        passwordInput.addEventListener('input', () => {
            const val = passwordInput.value;
            const result = calculateStrength(val);

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

    function calculateStrength(password) {
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

    // --- Input Validations (Email & Phone) ---
    const emailInput = document.getElementById('email');
    const phoneInput = document.getElementById('phone');

    if (emailInput) {
        // Enforce Lowercase and Valid Email characters (roughly)
        emailInput.addEventListener('input', (e) => {
            let val = e.target.value;
            // Force lowercase
            val = val.toLowerCase();
            // Remove any spaces
            val = val.replace(/\s/g, '');

            // Note: Preventing *all* non-alphanumeric would break email structure (@ and .)
            // User requested "only lowercase character and number". 
            // If strictly interpreted, that's not an email.
            // I will assume they mean "standard email format but strictly lowercase".

            if (val !== e.target.value) {
                e.target.value = val;
            }
        });
    }

    if (phoneInput) {
        // Enforce Numbers Only and Max Length 10
        phoneInput.addEventListener('input', (e) => {
            let val = e.target.value;
            // Remove non-digits
            val = val.replace(/\D/g, '');

            // Limit to 10 chars
            if (val.length > 10) {
                val = val.slice(0, 10);
            }

            if (val !== e.target.value) {
                e.target.value = val;
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

            const email = document.getElementById('email').value;
            const password = document.getElementById('signup-password').value;
            const confirmPass = document.getElementById('confirm-password').value;
            const ownerName = document.getElementById('owner-name').value;
            const shopName = document.getElementById('shop-name').value;
            const phone = document.getElementById('phone').value;

            // Basic Validation
            if (password !== confirmPass) {
                alert('Passwords do not match!');
                return;
            }

            if (password.length < 6) { // Simple check, strength meter handles visual
                alert('Password is too weak. Please use at least 6 characters.');
                return;
            }

            if (phone.length !== 10) {
                alert('Phone number must be exactly 10 digits.');
                return;
            }

            // Check if user exists
            const users = getUsers();
            if (users.find(u => u.email === email)) {
                alert('User already exists with this email. Please Login.');
                window.location.href = 'login.html';
                return;
            }

            // Register User
            const newUser = {
                email,
                password, // In real app, hash this!
                ownerName,
                shopName,
                phone
            };

            saveUser(newUser);

            // Redirect
            window.location.href = 'login.html';
        });
    }

    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();

            const emailOrId = document.getElementById('login-id').value.toLowerCase(); // Treat as email mostly
            const password = document.getElementById('password').value;

            const users = getUsers();
            const user = users.find(u => u.email === emailOrId || u.phone === emailOrId); // Allow login by email or phone

            if (!user) {
                if (loginError) {
                    loginError.style.display = 'block';
                    loginError.textContent = 'Account not found. Please sign up first. Redirecting...';
                }
                setTimeout(() => {
                    window.location.href = 'signup.html';
                }, 1500);
            } else {
                if (user.password === password) {
                    // Success
                    localStorage.setItem('currentUser', JSON.stringify(user)); // Session
                    // Redirect to Landing or Dashboard (Simulating login success)
                    // Assuming for now it goes back to landing or a dashboard if it existed
                    // Since specific dashboard URL isn't clear, we'll go to landing as "Logged In" state is managed there maybe?
                    // Or just reload/alert for now.
                    // Actually usually goes to index or dashboard. Let's go to landing.html
                    window.location.href = '../landing/landing.html';
                } else {
                    if (loginError) {
                        loginError.style.display = 'block';
                        loginError.textContent = 'Invalid credentials. Please try again.';
                    } else {
                        alert('Invalid credentials.');
                    }
                }
            }
        });

        // Hide error on input
        const inputs = loginForm.querySelectorAll('input');
        inputs.forEach(inp => {
            inp.addEventListener('input', () => {
                if (loginError) loginError.style.display = 'none';
            });
        });
    }

});
