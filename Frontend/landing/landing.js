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

    // --- 5. Smooth Scrolling for Navigation ---
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            const href = this.getAttribute('href');
            if (href === '#') return;
            
            e.preventDefault();
            const targetId = href.slice(1);
            const targetEl = document.getElementById(targetId);
            
            if (targetEl) {
                const navHeight = 100; // Account for fixed navbar
                const targetPosition = targetEl.getBoundingClientRect().top + window.pageYOffset - navHeight;
                
                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });
                
                // If it's a mobile link, close the sidebar
                if (window.toggleMobileSidebar) {
                    window.toggleMobileSidebar(false);
                }
            }
        });
    });

    // --- 6. Pricing Toggle Logic ---
    const pricingBtns = document.querySelectorAll('.pricing-toggle-btn');
    const pricePro = document.getElementById('price-pro');
    const priceEnterprise = document.getElementById('price-enterprise');
    const periodPro = document.getElementById('period-pro');
    const periodEnterprise = document.getElementById('period-enterprise');

    window.currentCycle = 'monthly'; // Global for button access

    const pricingData = {
        monthly: {
            pro: '499',
            enterprise: '1,199',
            period: '/month'
        },
        quarter: {
            pro: '1,349',
            enterprise: '3,249',
            period: '/quarter'
        },
        half: {
            pro: '2,399',
            enterprise: '5,759',
            period: '/6 months'
        },
        yearly: {
            pro: '4,199',
            enterprise: '9,999',
            period: '/year'
        }
    };

    pricingBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // Update UI State
            pricingBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const cycle = btn.getAttribute('data-cycle');
            window.currentCycle = cycle;
            const data = pricingData[cycle];

            if (data) {
                // Animate price change
                animatePriceChange(pricePro, data.pro);
                animatePriceChange(priceEnterprise, data.enterprise);
                
                periodPro.textContent = data.period;
                periodEnterprise.textContent = data.period;
            }
        });
    });

    function animatePriceChange(el, newPrice) {
        el.style.opacity = '0';
        el.style.transform = 'translateY(10px)';
        
        setTimeout(() => {
            el.textContent = newPrice;
            el.style.opacity = '1';
            el.style.transform = 'translateY(0)';
        }, 200);
    }

    // --- 7. Razorpay Integration ---
    window.handleSubscription = async (plan, cycle) => {
        console.log(`[Subscription] Initiating ${plan} plan for ${cycle} cycle...`);
        
        const btn = event.currentTarget;
        const originalHtml = btn.innerHTML;
        
        const token = sessionStorage.getItem('authToken');
        if (!token) {
            alert("Please login as an owner to subscribe to a plan.");
            window.location.href = "../Authentication/owner_login.html";
            return;
        }

        try {
            // Add Loading State
            btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Processing...';
            btn.disabled = true;

            // 1. Create Order on Backend
            const orderRes = await apiRequest('/subscriptions/create-order', {
                method: 'POST',
                body: JSON.stringify({ plan, cycle })
            });

            if (!orderRes.success) throw new Error(orderRes.message);

            const order = orderRes.data;

            // --- NEW: Handle Upgrade Confirmation ---
            if (order.discountApplied > 0) {
                const confirmed = confirm(`Plan Upgrade detected!\n\nWe've deducted ₹${order.discountApplied.toLocaleString()} from your current plan's remaining days.\n\nYou only pay: ₹${order.adjustedAmount.toLocaleString()}\n\nProceed to payment?`);
                if (!confirmed) {
                    btn.innerHTML = originalHtml;
                    btn.disabled = false;
                    return;
                }
            }

            // 2. Open Razorpay Modal
            const options = {
                key: "rzp_test_Sgou2ajCjV28E6", 
                amount: order.amount, // amount in paise from backend
                currency: "INR",
                name: "QuadStock",
                description: `${plan.toUpperCase()} Plan - ${cycle.toUpperCase()}`,
                order_id: order.id,
                handler: async function (response) {
                    // 3. Verify Payment on Backend
                    try {
                        const verifyRes = await apiRequest('/subscriptions/verify-payment', {
                            method: 'POST',
                            body: JSON.stringify({
                                razorpay_order_id: response.razorpay_order_id,
                                razorpay_payment_id: response.razorpay_payment_id,
                                razorpay_signature: response.razorpay_signature,
                                plan,
                                cycle
                            })
                        });

                        if (verifyRes.success) {
                            // Update Local Session with new Plan
                            const user = JSON.parse(sessionStorage.getItem('currentUser'));
                            if (user && user.storeId) {
                                user.storeId.subscriptionPlan = plan;
                                user.storeId.subscriptionStatus = 'active';
                                sessionStorage.setItem('currentUser', JSON.stringify(user));
                            }
                            
                            alert("Congratulations! Your subscription has been upgraded successfully.");
                            window.location.href = "../Ownerdashboard/dashboard.html";
                        } else {
                            alert("Payment verification failed. Please contact support.");
                        }
                    } catch (err) {
                        alert("Error verifying payment: " + err.message);
                    }
                },
                prefill: {
                    name: JSON.parse(sessionStorage.getItem('currentUser'))?.name || "",
                    email: JSON.parse(sessionStorage.getItem('currentUser'))?.email || ""
                },
                theme: {
                    color: "#FF7E36"
                }
            };

            const rzp = new Razorpay(options);
            rzp.open();

        } catch (err) {
            console.error("[Subscription Error]", err);
            alert("Failed to initiate payment: " + err.message);
        } finally {
            if (btn) {
                btn.innerHTML = originalHtml;
                btn.disabled = false;
            }
        }
    };

});
