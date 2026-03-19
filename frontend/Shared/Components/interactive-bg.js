
/**
 * Interactive Background Module
 * Unifies the background animation logic across the application.
 * optimizated for performance using requestAnimationFrame and visibility checks.
 */

export function initInteractiveBackground(containerId, options = {}) {
    const container = document.getElementById(containerId);
    if (!container) return;

    // Check for Reduced Motion Preference
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return; // Exit early if user prefers reduced motion

    const orbCount = options.orbCount || 4;
    const orbs = [];
    const mouse = { x: window.innerWidth / 2, y: window.innerHeight / 2, isActive: false };
    let mouseTimer = null;
    let animationId = null;

    // Check if orbs already exist (for employee_login.html case)
    const existingOrbs = container.querySelectorAll('.orb, .bg-orb');

    if (existingOrbs.length > 0) {
        existingOrbs.forEach((orb, i) => {
            orbs.push({
                element: orb,
                x: Math.random() * window.innerWidth,
                y: Math.random() * window.innerHeight,
                vx: (Math.random() - 0.5) * 1,
                vy: (Math.random() - 0.5) * 1,
            });
        });
    } else {
        // Create Orbs
        for (let i = 1; i <= orbCount; i++) {
            const orb = document.createElement('div');
            orb.classList.add('bg-orb');
            // Use CSS vars for colors if not provided
            orb.style.backgroundColor = `var(--orb-${i})`;

            // Random sizes
            const size = Math.random() * 300 + 400;
            orb.style.width = `${size}px`;
            orb.style.height = `${size}px`;

            container.appendChild(orb);

            orbs.push({
                element: orb,
                x: Math.random() * window.innerWidth,
                y: Math.random() * window.innerHeight,
                vx: (Math.random() - 0.5) * 2,
                vy: (Math.random() - 0.5) * 2,
            });
        }
    }

    function onMouseMove(e) {
        mouse.x = e.clientX;
        mouse.y = e.clientY;
        mouse.isActive = true;

        clearTimeout(mouseTimer);
        mouseTimer = setTimeout(() => {
            mouse.isActive = false;
        }, 2000);
    }

    window.addEventListener('mousemove', onMouseMove);

    function animate() {
        // Stop animation if page is hidden (Performance fix)
        if (document.hidden) {
            animationId = requestAnimationFrame(animate);
            return;
        }

        orbs.forEach((orb, index) => {
            if (mouse.isActive) {
                // Mouse interaction
                // Gentle attraction to mouse
                const dx = mouse.x - orb.x;
                const dy = mouse.y - orb.y;
                orb.x += dx * 0.03;
                orb.y += dy * 0.03;
            } else {
                // Float mode
                orb.x += orb.vx;
                orb.y += orb.vy;

                // Bounce off walls with margin
                const margin = 200;
                if (orb.x < -margin || orb.x > window.innerWidth + margin) orb.vx *= -1;
                if (orb.y < -margin || orb.y > window.innerHeight + margin) orb.vy *= -1;
            }

            // Apply transform
            // 'translate3d' forces GPU acceleration
            orb.element.style.transform = `translate3d(${orb.x}px, ${orb.y}px, 0) translate(-50%, -50%)`;
        });

        animationId = requestAnimationFrame(animate);
    }

    animate();

    return () => {
        window.removeEventListener('mousemove', onMouseMove);
        cancelAnimationFrame(animationId);
    };
}
