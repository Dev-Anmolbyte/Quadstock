// --- Theme Syncer ---
(function () {
    function applyTheme() {
        const isDark = localStorage.theme === 'dark' ||
            (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches);

        if (isDark) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }

    // Apply on load
    applyTheme();

    // Listen for changes in other tabs (e.g., Landing Page toggle)
    window.addEventListener('storage', (e) => {
        if (e.key === 'theme') {
            applyTheme();
        }
    });
})();

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
        let isTyping = false; // New flag for typing state

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
                vx: (Math.random() - 0.5) * 1.5, // Random velocity
                vy: (Math.random() - 0.5) * 1.5,
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

        // Typing Events (Trigger active mode when user types)
        const inputs = document.querySelectorAll('input');
        inputs.forEach(input => {
            input.addEventListener('focus', () => { isTyping = true; });
            input.addEventListener('blur', () => { isTyping = false; });
            input.addEventListener('input', () => {
                // Determine a "virtual" mouse position for typing excitement
                // We'll make them swarm towards the center or slightly random spots when typing
                mouse.x = window.innerWidth / 2 + (Math.random() - 0.5) * 200;
                mouse.y = window.innerHeight / 2 + (Math.random() - 0.5) * 200;
            });
        });

        // Animation Loop
        function animate() {
            orbs.forEach((orb, index) => {
                // Active if mouse moving OR user is typing
                const isActiveMode = mouse.isActive || isTyping;

                if (isActiveMode) {
                    // MOUSE/TYPING FOLLOW MODE (Swarming)
                    // Each orb follows the target with different "lag"
                    const lag = 0.02 + (index * 0.01);

                    // Add some noise/wobble
                    const wobble = Math.sin(Date.now() / 1000 + index) * 50;

                    const dx = mouse.x - orb.x + wobble;
                    const dy = mouse.y - orb.y + wobble;

                    orb.x += dx * lag;
                    orb.y += dy * lag;
                } else {
                    // IDLE MODE (Random Floating)
                    // Move towards random targets
                    const dx = orb.targetX - orb.x;
                    const dy = orb.targetY - orb.y;

                    // Distance check
                    if (Math.sqrt(dx * dx + dy * dy) < 50) {
                        // Pick new target
                        orb.targetX = Math.random() * window.innerWidth;
                        orb.targetY = Math.random() * window.innerHeight;
                    }

                    // Move smooth constant speed
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
});
