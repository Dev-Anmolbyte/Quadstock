/**
 * QuadStock Dynamic Footer Logic
 * Fetches page content from the backend based on data-slug attribute.
 */

import CONFIG from '../Shared/Utils/config.js';

const API_BASE = CONFIG.API_BASE_URL;

document.addEventListener('DOMContentLoaded', async () => {
    const slug = document.body.dataset.slug;
    if (slug) {
        await loadPageData(slug);
    }
    
    // Theme Management: Components stay in Light Mode as per user request.
    document.documentElement.classList.remove('dark');
});

/**
 * Load Dynamic Content from Backend
 */
async function loadPageData(slug) {
    const dynamicContainer = document.getElementById('dynamic-sections');
    if (!dynamicContainer) return;

    try {
        const response = await fetch(`${API_BASE}/pages/${slug}`);
        const result = await response.json();

        if (result.success && result.data) {
            const page = result.data;
            
            // Update Title & Description if they exist
            const h1 = document.querySelector('h1');
            if (h1 && page.title) h1.textContent = page.title;
            
            const pHeader = document.querySelector('.portfolio-header p, .contact-hero p, .policy-content > p');
            if (pHeader && page.description) pHeader.textContent = page.description;

            // Render Sections
            if (page.sections && page.sections.length > 0) {
                dynamicContainer.innerHTML = page.sections.map(section => {
                    if (slug === 'contact') return renderContactCard(section);
                    if (slug === 'portfolio') return renderProjectCard(section);
                    return renderPolicySection(section);
                }).join('');
            }

            // Stagger animations for cards if any
            applyStaggerAnimation();
        }
    } catch (err) {
        console.error("Failed to fetch dynamic page data:", err);
        // Fallback or keep empty
    }
}

function renderContactCard(s) {
    return `
        <div class="contact-card">
            <div class="icon-box"><i class="fa-solid ${s.icon || 'fa-info-circle'}"></i></div>
            <h3>${s.title}</h3>
            <p style="color: var(--text-muted); margin: 0.5rem 0;">${s.content}</p>
        </div>
    `;
}

function renderProjectCard(s) {
    return `
        <div class="project-card">
            <div class="project-thumb">
                <i class="fa-solid ${s.icon || 'fa-laptop-code'}"></i>
            </div>
            <div class="project-info">
                <h3>${s.title}</h3>
                <p style="color: var(--text-muted); font-size: 0.9rem; margin-bottom: 0.5rem;">${s.content}</p>
                <div class="project-tags">
                    ${s.title.includes('App') ? '<span class="tag">App Dev</span>' : '<span class="tag">Solution</span>'}
                    <span class="tag">Digital</span>
                </div>
            </div>
        </div>
    `;
}

function renderPolicySection(s) {
    return `
        <div class="policy-section">
            <h2>${s.title}</h2>
            <p>${s.content}</p>
        </div>
    `;
}

function applyStaggerAnimation() {
    const cards = document.querySelectorAll('.project-card, .contact-card, .policy-section');
    cards.forEach((card, index) => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(20px)';
        card.style.transition = 'all 0.5s ease';
        setTimeout(() => {
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
        }, index * 100);
    });
}

/**
 * Support Form Logic
 */
const contactForm = document.getElementById('contact-form');
if (contactForm) {
    contactForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const btn = contactForm.querySelector('.btn-send');
        const originalText = btn.textContent;

        btn.textContent = 'Sending...';
        btn.style.opacity = '0.7';
        btn.disabled = true;

        // In a real scenario, we would POST to /api/complaints/add
        // For now, simulating successfully
        setTimeout(() => {
            alert('Support Request Received! Our team will reach out to you shortly.');
            contactForm.reset();
            btn.textContent = originalText;
            btn.style.opacity = '1';
            btn.disabled = false;
        }, 1500);
    });
}
