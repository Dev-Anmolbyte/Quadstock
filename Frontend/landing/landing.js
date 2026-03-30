import { apiRequest } from '../Shared/Utils/api.js';

document.addEventListener('DOMContentLoaded', () => {
    console.log("[Landing] Initializing dynamic engine...");

    // --- 1. Fetch & Populate Live Statistics ---
    async function initStats() {
        try {
            console.log("[Landing] Fetching live database stats...");
            const result = await apiRequest('/stats/public');
            
            if (result.success && result.data) {
                const { totalStores, timeSavedPercent, totalProducts, totalTransactions } = result.data;
                
                // Update text and trigger counter animations
                animateCounter('stat-stores', totalStores || 150, '+');
                animateCounter('stat-time', timeSavedPercent || 45, '%');
                animateCounter('stat-products', totalProducts || 1000, '+');
                animateCounter('stat-transactions', totalTransactions || 500, '+');
            }
        } catch (err) {
            console.error("[Landing] Stats fetch failed, using fallback UI values:", err.message);
            // Fallback (already in HTML as data-target, but we ensure UI isn't broken)
            animateCounter('stat-stores', 150, '+');
            animateCounter('stat-time', 45, '%');
            animateCounter('stat-products', 10000, '+');
            animateCounter('stat-transactions', 5000, '+');
        }
    }

    function animateCounter(id, target, suffix = '') {
        const el = document.getElementById(id);
        if (!el) return;

        let start = 0;
        const duration = 2000; // 2 seconds
        const startTime = performance.now();

        function update(currentTime) {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Ease out cubic
            const ease = 1 - Math.pow(1 - progress, 3);
            const current = Math.floor(ease * target);
            
            el.textContent = current.toLocaleString() + suffix;

            if (progress < 1) {
                requestAnimationFrame(update);
            }
        }
        requestAnimationFrame(update);
    }

    initStats();

    // --- 2. Intersection Observer for Fade-Up Animations ---
    const observerOptions = {
        threshold: 0.1,
        rootMargin: "0px 0px -50px 0px"
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                // Optional: stop observing once visible
                // observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    document.querySelectorAll('.fade-up').forEach(el => observer.observe(el));

    // --- 3. Theme Management ---
    const themeToggle = document.getElementById('theme-toggle');
    const sunIcon = document.getElementById('sun-icon');
    const moonIcon = document.getElementById('moon-icon');

    function updateThemeIcons(theme) {
        if (theme === 'dark' || document.documentElement.classList.contains('dark')) {
            sunIcon?.classList.remove('hidden');
            moonIcon?.classList.add('hidden');
        } else {
            sunIcon?.classList.add('hidden');
            moonIcon?.classList.remove('hidden');
        }
    }

    // Initialize theme from storage
    const currentTheme = localStorage.getItem('theme') || 'light';
    updateThemeIcons(currentTheme);

    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            const isDark = document.documentElement.classList.toggle('dark');
            const newTheme = isDark ? 'dark' : 'light';
            
            document.documentElement.setAttribute('data-theme', newTheme);
            localStorage.setItem('theme', newTheme);
            updateThemeIcons(newTheme);
            
            console.log(`[Landing] Theme toggled to: ${newTheme}`);
        });
    }

    // --- 4. Mobile Sidebar Logic ---
    const mobileSidebar = document.getElementById('mobile-sidebar');
    const overlay = document.getElementById('mobile-sidebar-overlay');

    window.toggleMobileSidebar = function(show) {
        const isHidden = mobileSidebar.classList.contains('translate-x-full');
        if (show === undefined) show = isHidden;
        
        if (show) {
            mobileSidebar.classList.remove('translate-x-full');
            overlay.classList.remove('hidden');
            setTimeout(() => overlay.classList.add('opacity-100'), 10);
        } else {
            mobileSidebar.classList.add('translate-x-full');
            overlay.classList.remove('opacity-100');
            setTimeout(() => overlay.classList.add('hidden'), 300);
        }
    };

    document.getElementById('open-sidebar-btn').onclick = () => window.toggleMobileSidebar(true);
    document.getElementById('close-sidebar-btn').onclick = () => window.toggleMobileSidebar(false);
    overlay.onclick = () => window.toggleMobileSidebar(false);

});
