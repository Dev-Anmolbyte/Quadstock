/* =========================================
   GLOBAL LOGIC (Shared)
   ========================================= */

// Theme Management REMOVED: User requested components stay in Light Mode.
document.addEventListener('DOMContentLoaded', () => {
    // Force remove dark class just in case
    document.documentElement.classList.remove('dark');
});

/* =========================================
   CONTACT PAGE LOGIC
   ========================================= */
const contactForm = document.getElementById('contact-form');
if (contactForm) {
    contactForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const btn = contactForm.querySelector('.btn-send');
        const originalText = btn.textContent;

        // Simulating sending state
        btn.textContent = 'Sending...';
        btn.style.opacity = '0.7';
        btn.disabled = true;

        setTimeout(() => {
            alert('Message Sent Successfully! We will contact you shortly.');
            contactForm.reset();
            btn.textContent = originalText;
            btn.style.opacity = '1';
            btn.disabled = false;
        }, 1500);
    });
}


/* =========================================
   PORTFOLIO PAGE LOGIC (Optional interactivity)
   ========================================= */
// Example: Simple filter or animation could go here
const projectCards = document.querySelectorAll('.project-card');
if (projectCards.length > 0) {
    // Add simple stagger fade-in
    projectCards.forEach((card, index) => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(20px)';
        card.style.transition = 'all 0.5s ease';

        setTimeout(() => {
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
        }, index * 100);
    });
}
