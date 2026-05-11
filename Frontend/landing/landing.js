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
    const planOrder = { 'free': 0, 'pro': 1, 'enterprise': 2 };

    window.handleSubscription = async (plan, cycle) => {
        const btn = event?.currentTarget || document.activeElement;
        console.log(`[Subscription] Initiating ${plan} plan for ${cycle} cycle...`);
        
        const sessionUser = sessionStorage.getItem('currentUser');
        const sessionEmployee = sessionStorage.getItem('currentEmployee');
        const token = sessionStorage.getItem('authToken');

        // Rule 3: First time visit / Guest check
        if (!token) {
            if (typeof QuadModals !== 'undefined') {
                QuadModals.alert("Account Required", "You are viewing our plans as a guest. To subscribe, please create an account or login to your shop first.", "info");
            } else {
                alert("Please login as an owner to subscribe to a plan.");
            }
            setTimeout(() => {
                window.location.href = "../Authentication/owner_login.html";
            }, 3000);
            return;
        }

        // Rule 1: Signed in check (Specifically for Employees)
        if (sessionEmployee && !sessionUser) {
             if (typeof QuadModals !== 'undefined') {
                QuadModals.alert("Owner Access Only", "Subscription management is restricted to Store Owners. Please contact your manager.", "error");
            } else {
                alert("Only Store Owners can manage subscriptions.");
            }
            return;
        }

        // Rule 2: No degradation (Upgrade Only)
        let user = null;
        try { user = JSON.parse(sessionUser); } catch(e) {}
        
        const currentPlan = user?.storeId?.subscriptionPlan || 'free';
        
        if (planOrder[plan] < planOrder[currentPlan]) {
            QuadModals.alert("Invalid Choice", `You are currently on the ${currentPlan.toUpperCase()} plan. Degrading to ${plan.toUpperCase()} is not allowed. You can only upgrade your plan.`, "warning");
            return;
        }

        if (planOrder[plan] === planOrder[currentPlan] && currentPlan !== 'free') {
            QuadModals.alert("Already Active", `You are already on the ${plan.toUpperCase()} plan. If you wish to extend your validity, please visit Settings.`, "info");
            return;
        }

        const originalHtml = btn.innerHTML;
        
        try {
            // Add Loading State
            btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Processing...';
            btn.disabled = true;

            // 1. Create Order on Backend
            const orderRes = await apiRequest('/subscriptions/create-order', {
                method: 'POST',
                body: JSON.stringify({ plan, cycle })
            });

            if (!orderRes.success) throw new Error(orderRes.message);

            const order = orderRes.data;

            // --- Handle Upgrade Confirmation ---
            if (order.discountApplied > 0) {
                const confirmed = await QuadModals.confirm("Plan Upgrade", `We've detected an active plan. We will deduct ₹${order.discountApplied.toLocaleString()} (remaining value) from your new total.\n\nFinal Payable: ₹${order.adjustedAmount.toLocaleString()}`, {
                    confirmText: "Proceed to Payment",
                    icon: "fa-rocket"
                });
                
                if (!confirmed) {
                    btn.innerHTML = originalHtml;
                    btn.disabled = false;
                    return;
                }
            }

            // 2. Open Razorpay Modal
            if (typeof Razorpay === 'undefined') {
                throw new Error("Payment gateway failed to load. Please refresh and try again.");
            }

            const options = {
                key: "rzp_test_Sgou2ajCjV28E6", 
                amount: order.amount,
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
                            // Update Local Session
                            if (user && user.storeId) {
                                user.storeId.subscriptionPlan = plan;
                                user.storeId.subscriptionStatus = 'active';
                                sessionStorage.setItem('currentUser', JSON.stringify(user));
                            }
                            
                            QuadModals.alert("Upgrade Successful", "Congratulations! Your shop has been upgraded. Please refresh your dashboard to see new features.", "success");
                            setTimeout(() => {
                                window.location.href = "../Ownerdashboard/dashboard.html";
                            }, 2000);
                        } else {
                            QuadModals.alert("Verification Failed", "Payment verification failed. Please contact support with Order ID: " + order.id, "error");
                        }
                    } catch (err) {
                        QuadModals.alert("Error", "Error verifying payment: " + err.message, "error");
                    }
                },
                prefill: {
                    name: user?.name || "",
                    email: user?.email || ""
                },
                theme: {
                    color: "#FF7E36"
                }
            };

            const rzp = new Razorpay(options);
            rzp.open();

        } catch (err) {
            console.error("[Subscription Error]", err);
            QuadModals.alert("Payment Error", err.message, "error");
        } finally {
            if (btn) {
                btn.innerHTML = originalHtml;
                btn.disabled = false;
            }
        }
    };

    // --- 8. Highlight Active Plan ---
    function highlightActivePlan() {
        const sessionUser = sessionStorage.getItem('currentUser');
        const sessionEmployee = sessionStorage.getItem('currentEmployee');
        if (!sessionUser || sessionEmployee) return; // Only for owners

        try {
            const user = JSON.parse(sessionUser);
            const currentPlan = user?.storeId?.subscriptionPlan || 'free';
            
            const activeCard = document.getElementById(`plan-card-${currentPlan.toLowerCase()}`);
            if (activeCard) {
                // Add "Current Plan" Badge
                const badge = document.createElement('div');
                badge.className = "absolute -top-5 left-1/2 -translate-x-1/2 bg-accent text-white text-[10px] font-black uppercase tracking-[0.2em] px-6 py-2 rounded-full shadow-xl shadow-accent/20 z-10";
                badge.innerHTML = '<i class="fa-solid fa-circle-check mr-1"></i> Current Plan';
                activeCard.appendChild(badge);
                
                // Style adjustment
                activeCard.style.borderColor = 'var(--accent, #22C55E)';
                activeCard.classList.add('ring-4', 'ring-accent/10');

                // Update button text
                const btn = activeCard.querySelector('button, a.nav-btn');
                if (btn) {
                    if (currentPlan === 'free') {
                        btn.innerHTML = 'Active Plan';
                    } else {
                        btn.innerHTML = '<i class="fa-solid fa-check mr-2"></i> Active';
                    }
                    btn.classList.replace('btn-primary', 'bg-accent');
                    btn.style.background = '#22C55E';
                }
            }
        } catch (e) {
            console.error("[Landing] Failed to highlight active plan:", e);
        }
    }

    highlightActivePlan();
});
