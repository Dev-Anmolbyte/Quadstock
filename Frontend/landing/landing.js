import CONFIG from '../Shared/Utils/config.js';

document.addEventListener('DOMContentLoaded', async () => {
    // --- Public Stats Fetching ---
    async function fetchStats() {
        try {
            const response = await fetch(`${CONFIG.API_BASE_URL}/stats/public`);
            const result = await response.json();
            if (response.ok && result.success) {
                const { totalStores, totalProducts, timeSavedPercent } = result.data;
                
                // Map to counter elements
                const counterMap = {
                    'Indian Stores': totalStores,
                    'Time Saved %': timeSavedPercent,
                    'Products Catalog': totalProducts,
                    'Click Billing': 1 // Static/Placeholder
                };

                document.querySelectorAll('.counter').forEach(counter => {
                    const label = counter.nextElementSibling?.textContent?.trim();
                    if (label && counterMap[label] !== undefined) {
                        counter.setAttribute('data-target', counterMap[label]);
                    }
                });
            }
        } catch (err) {
            console.error("Public Stats Error:", err);
            // Fallback to static values already in HTML
        }
    }
    
    // Initial Fetch
    await fetchStats();

    // --- Theme Toggle ---
    const themeToggleBtn = document.getElementById('theme-toggle');
    const sunIcon = document.getElementById('sun-icon');
    const moonIcon = document.getElementById('moon-icon');
    let html = document.documentElement;

    // Check localStorage or system preference
    if (localStorage.theme === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        html.classList.add('dark');
        sunIcon?.classList.remove('hidden');
        moonIcon?.classList.add('hidden');
    } else {
        html.classList.remove('dark');
        sunIcon?.classList.add('hidden');
        moonIcon?.classList.remove('hidden');
    }

    themeToggleBtn?.addEventListener('click', () => {
        html.classList.toggle('dark');
        const isDark = html.classList.contains('dark');
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
        if (isDark) {
            sunIcon?.classList.remove('hidden');
            moonIcon?.classList.add('hidden');
        } else {
            sunIcon?.classList.add('hidden');
            moonIcon?.classList.remove('hidden');
        }
    });

    // --- Intersection Observer for Fade Up ---
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, { threshold: 0.1 });

    document.querySelectorAll('.fade-up').forEach(el => observer.observe(el));

    // --- Counter Animation ---
    const counters = document.querySelectorAll('.counter');
    const animateCounters = () => {
        counters.forEach(counter => {
            const target = +counter.getAttribute('data-target');
            const updateCounter = () => {
                const count = +counter.innerText;
                const increment = Math.max(1, target / 50); // Ensure increment is at least 1
                if (count < target) {
                    counter.innerText = Math.ceil(count + increment);
                    setTimeout(updateCounter, 20);
                } else {
                    counter.innerText = target + (target > 50 ? '+' : '');
                }
            };
            updateCounter();
        });
    };

    const statsSection = document.querySelector('.bg-secondary');
    if (statsSection) {
        const statsObserver = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting) {
                animateCounters();
                statsObserver.disconnect();
            }
        }, { threshold: 0.5 });
        statsObserver.observe(statsSection);
    }

    // --- Mobile Sidebar Logic ---
    const sidebar = document.getElementById('mobile-sidebar');
    const overlay = document.getElementById('mobile-sidebar-overlay');
    const openBtn = document.getElementById('open-sidebar-btn');
    const closeBtn = document.getElementById('close-sidebar-btn');

    // Make function global if needed for inline onclicks, or attach listeners strictly
    window.toggleMobileSidebar = function () {
        if (!sidebar) return;
        const isOpen = !sidebar.classList.contains('translate-x-full');
        if (isOpen) {
            // Close
            sidebar.classList.add('translate-x-full');
            overlay.classList.remove('opacity-100');
            setTimeout(() => overlay.classList.add('hidden'), 300);
            document.body.style.overflow = '';
        } else {
            // Open
            overlay.classList.remove('hidden');
            // Force reflow
            void overlay.offsetWidth;
            overlay.classList.add('opacity-100');
            sidebar.classList.remove('translate-x-full');
            document.body.style.overflow = 'hidden';
        }
    };

    openBtn?.addEventListener('click', toggleMobileSidebar);
    closeBtn?.addEventListener('click', toggleMobileSidebar);
    overlay?.addEventListener('click', toggleMobileSidebar);
});
