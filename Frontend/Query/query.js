document.addEventListener('DOMContentLoaded', () => {

    // --- Authentication & Context ---
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    const currentEmployee = JSON.parse(localStorage.getItem('currentEmployee'));
    const userRole = (currentUser && currentUser.role) || (currentEmployee && currentEmployee.role) || 'staff';
    const ownerId = (currentUser && currentUser.ownerId) || (currentEmployee && currentEmployee.ownerId);

    if (!ownerId) {
        window.location.href = '../Authentication/employee_login.html';
        return;
    }

    // --- Layout Hub ---
    function setupLayout() {
        const sidebarTarget = document.getElementById('sidebar-target');
        const mainContainer = document.getElementById('main-container');
        const dashboardCss = document.getElementById('dashboard-css');

        if (userRole === 'manager' || userRole === 'staff') {
            dashboardCss.href = '../Managerdashboard/manager_dashboard.css';
            mainContainer.className = 'layout-container';

            sidebarTarget.innerHTML = `
                <div class="brand">
                    <button id="sidebar-toggle" style="width: 40px; height: 40px; background: var(--primary); border: none; border-radius: 12px; display: flex; align-items: center; justify-content: center; color: white; cursor: pointer;">
                        <i class="fa-solid fa-bars"></i>
                    </button>
                    <h2 class="brand-name">QuadStock</h2>
                </div>
                <div class="nav-section">
                    <h3 class="section-title">Main Menu</h3>
                    <nav class="nav-menu">
                        <a href="../Managerdashboard/manager_dashboard.html" class="nav-item">
                            <i class="fa-solid fa-house-chimney"></i>
                            <span>Dashboard</span>
                        </a>
                        <a href="../Analytics/analytics.html" class="nav-item">
                            <i class="fa-solid fa-chart-simple"></i>
                            <span>Analytics</span>
                        </a>
                        <a href="query.html" class="nav-item active">
                            <i class="fa-solid fa-clipboard-question"></i>
                            <span>Query</span>
                        </a>
                    </nav>
                </div>
                <div class="nav-section">
                    <h3 class="section-title">Stock & Staff</h3>
                    <nav class="nav-menu">
                        <a href="../Inventory/inventory.html" class="nav-item">
                            <i class="fa-solid fa-boxes-stacked"></i>
                            <span>Inventory</span>
                        </a>
                        <a href="../smartexpiry/smartexpiry.html" class="nav-item">
                            <i class="fa-solid fa-hourglass-end"></i>
                            <span>Smart Expiry</span>
                        </a>
                        <a href="../Employees/employees.html" class="nav-item">
                            <i class="fa-solid fa-users"></i>
                            <span>Employees</span>
                        </a>

                    </nav>
                </div>
                <div class="nav-section">
                    <h3 class="section-title">Business</h3>
                    <nav class="nav-menu">
                        <a href="../Complain/complain.html" class="nav-item">
                            <i class="fa-solid fa-triangle-exclamation"></i>
                            <span>Complain</span>
                        </a>
                        <a href="../Udhaar/udhaar.html" class="nav-item">
                            <i class="fa-solid fa-indian-rupee-sign"></i>
                            <span>Udhaar/Pending</span>
                        </a>
                        <a href="../Settings/settings.html" class="nav-item">
                            <i class="fa-solid fa-gear"></i>
                            <span>Settings</span>
                        </a>
                    </nav>
                </div>
            `;

            document.getElementById('topbar-target').innerHTML = `
                <div id="digital-clock" class="digital-clock-container">00:00:00 AM</div>
                <div class="user-actions">
                    <button class="theme-toggle-btn" id="theme-toggle" style="background: var(--bg-white); border: none; padding: 0.5rem; border-radius: 50%; cursor: pointer; color: var(--text-muted); width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
                        <i class="fa-solid fa-moon"></i>
                    </button>
                    <div class="user-profile" style="background: var(--bg-white); padding: 0.5rem 1rem; border-radius: 3rem; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
                        <div class="user-info">
                            <h5>${currentEmployee ? currentEmployee.name : 'Employee'}</h5>
                            <p>${currentEmployee ? currentEmployee.role : 'Staff'}</p>
                        </div>
                        <img src="${currentEmployee && currentEmployee.photo ? currentEmployee.photo : 'https://ui-avatars.com/api/?name=' + encodeURIComponent(currentEmployee ? currentEmployee.name : 'User')}" alt="Avatar" class="user-avatar" style="width: 40px; height: 40px;">
                        <i class="fa-solid fa-chevron-up-down" style="font-size: 0.8rem; color: #9ca3af;"></i>
                    </div>
                </div>
            `;
        } else {
            dashboardCss.href = '../Ownerdashboard/dashboard.css';
            mainContainer.className = 'layout-container';

            sidebarTarget.innerHTML = `

            <div class="brand">
                <button id="sidebar-toggle" class="sidebar-toggle">
                    <i class="fa-solid fa-bars"></i>
                </button>
                <h2 class="brand-text">QuadStock</h2>
            </div>
            <nav class="sidebar-menu">
                <a href="../Ownerdashboard/dashboard.html" class="menu-item " title="Dashboard">
                    <i class="fa-solid fa-house"></i>
                    <span>Dashboard</span>
                </a>
                <a href="../Analytics/analytics.html" class="menu-item " title="Analytics">
                    <i class="fa-solid fa-chart-simple"></i>
                    <span>Analytics</span>
                </a>
                <a href="../Query/query.html" class="menu-item active" title="Query">
                    <i class="fa-solid fa-clipboard-question"></i>
                    <span>Query</span>
                </a>
                <a href="../Inventory/inventory.html" class="menu-item " title="Inventory">
                    <i class="fa-solid fa-boxes-stacked"></i>
                    <span>Inventory</span>
                </a>
                <a href="../Employees/employees.html" class="menu-item " title="Employees">
                    <i class="fa-solid fa-users"></i>
                    <span>Employees</span>
                </a>
                <a href="../smartexpiry/smartexpiry.html" class="menu-item " title="Smart Expiry">
                    <i class="fa-solid fa-hourglass-end"></i>
                    <span>Smart Expiry</span>
                </a>

                <a href="../Complain/complain.html" class="menu-item " title="Complaints">
                    <div style="position:relative;">
                        <i class="fa-solid fa-triangle-exclamation"></i>
                        <span id="nav-badge-complain" class="nav-badge" style="display:none;">0</span>
                    </div>
                    <span>Complaints</span>
                </a>
                <a href="../Udhaar/udhaar.html" class="menu-item " title="Pending Payments">
                    <i class="fa-solid fa-indian-rupee-sign"></i>
                    <span>Udhaar/Pending</span>
                </a>
                <a href="../Settings/settings.html" class="menu-item " title="Settings">
                    <i class="fa-solid fa-gear"></i>
                    <span>Settings</span>
                </a>
                <a href="../landing/landing.html" class="menu-item" title="Logout">
                    <i class="fa-solid fa-right-from-bracket"></i>
                    <span>Logout</span>
                </a>
            </nav>
            <div class="sidebar-footer-card">
                <div class="support-illustration">
                    <svg viewBox="0 0 100 100" class="illus-svg">
                        <circle cx="50" cy="35" r="15" fill="#333" />
                        <path d="M20,80 Q50,70 80,80 V100 H20 Z" fill="#333" />
                        <rect x="15" y="45" width="25" height="15" rx="2" fill="#555" transform="rotate(-15 27 52)" />
                    </svg>
                </div>
                <a href="../Footer/contact.html" class="btn-support" style="text-decoration: none; display: inline-block; text-align: center;">
                    <i class="fa-regular fa-life-ring"></i> Support
                </a>
            </div>

`;

            const displayName = currentUser ? (currentUser.ownerName || currentUser.shopName || 'Owner') : 'Owner';
            document.getElementById('user-profile-target').innerHTML = `
                <img src="https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=random" alt="User">
                <span class="user-name">${displayName}</span>
                <i class="fa-solid fa-chevron-down"></i>
            `;
        }

        initializeCommonUI();
    }

    function initializeCommonUI() {
        // Digital Clock
        function updateClock() {
            const clockEl = document.getElementById('digital-clock');
            if (clockEl) {
                const now = new Date();
                clockEl.textContent = now.toLocaleTimeString('en-US', { hour12: true });
            }
        }
        setInterval(updateClock, 1000);
        updateClock();

        const themeBtn = document.getElementById('theme-toggle');

        // --- Theme Persistence Logic ---
        function applyTheme(theme) {
            if (theme === 'dark') {
                document.documentElement.setAttribute('data-theme', 'dark');
                document.body.setAttribute('data-theme', 'dark');
                if (themeBtn) themeBtn.innerHTML = '<i class="fa-solid fa-sun"></i>';
            } else {
                document.documentElement.removeAttribute('data-theme');
                document.body.removeAttribute('data-theme');
                if (themeBtn) themeBtn.innerHTML = '<i class="fa-solid fa-moon"></i>';
            }
            localStorage.setItem('theme', theme);
        }

        // Load initial theme
        const savedTheme = localStorage.getItem('theme') || 'light';
        applyTheme(savedTheme);

        if (themeBtn) {
            themeBtn.addEventListener('click', () => {
                const current = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
                applyTheme(current);
            });
        }

        const sidebarToggle = document.getElementById('sidebar-toggle');
        if (sidebarToggle) {
            sidebarToggle.addEventListener('click', () => {
                const mainContainer = document.getElementById('main-container');
                if (mainContainer) {
                    mainContainer.classList.toggle('sidebar-collapsed');
                }
            });
        }
    }

    setupLayout();

    // --- State and Storage ---
    const STORAGE_KEY = 'queries';
    const QUICK_REPLIES = [
        { text: "I'll get back to you soon.", icon: "fa-clock" },
        { text: "Query resolved.", icon: "fa-check" },
        { text: "Please clarify your doubt.", icon: "fa-comment-dots" },
        { text: "Thank you for asking.", icon: "fa-heart" },
        { text: "Checking with the team.", icon: "fa-users" }
    ];

    let allQueries = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    let queries = allQueries.filter(q => q.ownerId === ownerId);
    let uploadedImages = []; // Temp storage for modal
    let tempReplyImages = {}; // Temp storage for replies by id: []
    let expandedQueryIds = new Set(); // Track expanded states

    function getCurrentUserName() {
        if (currentUser) return currentUser.ownerName || currentUser.shopName || 'Owner';
        if (currentEmployee) return currentEmployee.name || 'Manager';
        return 'Admin';
    }

    const CURRENT_USER = getCurrentUserName();

    if (queries.length === 0 && ownerId === 'OWN-DEMO') { // Only auto-fill for demo or first load
        queries = [
            {
                id: 'qry_' + Date.now(),
                ownerId: ownerId,
                staffName: 'Aarav Gupta',
                role: 'Sales Staff',
                timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
                subject: 'Leave Procedure Query',
                description: 'What is the procedure to apply for medical leave?',
                status: 'open',
                closedBy: null,
                replies: [],
                images: []
            }
        ];
        saveQueries();
    }

    // --- DOM Elements ---
    const listContainer = document.getElementById('queries-list');
    const raiseBtn = document.getElementById('btn-raise-query');
    const modalOverlay = document.getElementById('raise-modal');
    const closeModalBtn = document.getElementById('btn-modal-cancel');
    const submitQueryBtn = document.getElementById('btn-modal-submit');
    const staffNameInput = document.getElementById('staff-name');
    const subjectInput = document.getElementById('query-subject');
    const descInput = document.getElementById('query-desc');
    const roleSelect = document.getElementById('staff-role');
    const fileInput = document.getElementById('query-files');
    const previewContainer = document.getElementById('image-preview-container');

    // --- Image Handling (Modal) ---
    fileInput.addEventListener('change', (e) => {
        const files = Array.from(e.target.files);
        if (uploadedImages.length + files.length > 5) {
            alert('You can upload a maximum of 5 attachments.');
            return;
        }

        files.forEach(file => {
            const reader = new FileReader();
            reader.onload = (ev) => {
                uploadedImages.push({ name: file.name, data: ev.target.result });
                renderImagePreviews();
            };
            reader.readAsDataURL(file);
        });
        fileInput.value = '';
    });

    function renderImagePreviews() {
        previewContainer.innerHTML = '';
        uploadedImages.forEach((img, index) => {
            const wrapper = document.createElement('div');
            wrapper.className = 'thumb-wrapper';
            wrapper.innerHTML = `
                <img src="${img.data}" class="preview-thumb">
                <div class="remove-img-btn" onclick="removeImage(${index})">
                    <i class="fa-solid fa-xmark"></i>
                </div>
            `;
            previewContainer.appendChild(wrapper);
        });
    }

    window.removeImage = function (index) {
        uploadedImages.splice(index, 1);
        renderImagePreviews();
    };

    // --- Image Handling (Replies) ---
    window.handleReplyImageUpload = function (id, input) {
        const files = Array.from(input.files);
        if (!tempReplyImages[id]) tempReplyImages[id] = [];

        if (tempReplyImages[id].length + files.length > 5) {
            alert('You can upload a maximum of 5 images per reply.');
            return;
        }

        files.forEach(file => {
            const reader = new FileReader();
            reader.onload = (e) => {
                tempReplyImages[id].push({ name: file.name, data: e.target.result });
                renderReplyImagePreviews(id);
            };
            reader.readAsDataURL(file);
        });
        input.value = '';
    };

    function renderReplyImagePreviews(id) {
        const container = document.getElementById(`reply-preview-${id}`);
        if (!container) return;
        container.innerHTML = '';

        const imgs = tempReplyImages[id] || [];
        imgs.forEach((img, index) => {
            const wrapper = document.createElement('div');
            wrapper.className = 'thumb-wrapper';
            wrapper.innerHTML = `
                <img src="${img.data}" class="preview-thumb">
                <div class="remove-img-btn" onclick="removeReplyImage('${id}', ${index})">
                    <i class="fa-solid fa-xmark"></i>
                </div>
            `;
            container.appendChild(wrapper);
        });
    }

    window.removeReplyImage = function (id, index) {
        if (tempReplyImages[id]) {
            tempReplyImages[id].splice(index, 1);
            renderReplyImagePreviews(id);
        }
    };

    // --- Rendering Logic ---
    function formatTimeDisplay(isoString) {
        const date = new Date(isoString);
        const now = new Date();
        const diffMs = now - date;
        const diffHours = diffMs / (1000 * 60 * 60);

        if (diffHours < 24) {
            if (diffHours < 1) {
                const minutes = Math.floor(diffMs / (1000 * 60));
                return minutes <= 0 ? 'Just now' : `${minutes} mins ago`;
            }
            return `${Math.floor(diffHours)} hrs ago`;
        }
        return date.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
    }

    function renderQueries() {
        listContainer.innerHTML = '';
        const sorted = [...queries].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        if (sorted.length === 0) {
            listContainer.innerHTML = `<div style="text-align:center; padding:2rem; color:var(--text-secondary);">No queries yet.</div>`;
            return;
        }

        sorted.forEach(q => {
            const card = document.createElement('div');
            card.className = `query-card status-${q.status}`;

            const timeDisplay = formatTimeDisplay(q.timestamp);
            const statusText = q.status === 'open' ? 'Open' : 'Seen';
            const authorInitial = q.staffName.charAt(0).toUpperCase();

            let imagesHtml = '';
            if (q.images && q.images.length > 0) {
                imagesHtml = `<div class="query-images-display">
                    ${q.images.map(img => `<img src="${img.data}" class="query-img-view" onclick="viewImage('${img.data}')">`).join('')}
                </div>`;
            }

            const repliesHtml = q.replies.map(r => `
                <div class="reply-item ${r.author.toLowerCase().includes('admin') || r.author.toLowerCase().includes('owner') ? 'owner-reply' : ''}">
                    <div class="reply-avatar">${r.author.charAt(0)}</div>
                    <div class="reply-bubble">
                        <span class="reply-author-name">${r.author} <span style="font-weight:400; opacity:0.7;">${formatTimeDisplay(r.timestamp)}</span></span>
                        <div class="reply-text">${r.text}</div>
                        ${r.images && r.images.length > 0 ? `<div class="reply-images">${r.images.map(img => `<img src="${img.data}" class="reply-img-view" onclick="viewImage('${img.data}')">`).join('')}</div>` : ''}
                    </div>
                </div>
            `).join('');

            let actionAreaHtml = '';
            if (q.status === 'closed') {
                actionAreaHtml = `
                    <div class="closed-overlay">
                        <span><i class="fa-solid fa-lock"></i> Query marked as seen by ${q.closedBy}</span>
                        <button class="btn-action-outline success" onclick="reopenQuery('${q.id}')"><i class="fa-solid fa-unlock"></i> Re-open</button>
                    </div>
                `;
            } else {
                const pillsHtml = QUICK_REPLIES.map(qr => `<div class="quick-pill" onclick="fillReply('${q.id}', '${qr.text.replace(/'/g, "\\'")}')"><i class="fa-solid ${qr.icon}"></i> ${qr.text}</div>`).join('');
                actionAreaHtml = `
                    <div class="action-area">
                        <div class="quick-replies">${pillsHtml}</div>
                        <div id="reply-preview-${q.id}" class="reply-preview-container"></div>
                        <div class="input-row">
                            <div class="upload-btn-wrapper">
                                <button class="mini-upload-btn" onclick="document.getElementById('reply-file-${q.id}').click()"><i class="fa-solid fa-camera"></i></button>
                                <input type="file" id="reply-file-${q.id}" accept="image/*" multiple style="display:none" onchange="handleReplyImageUpload('${q.id}', this)">
                            </div>
                            <input type="text" class="main-input" id="reply-input-${q.id}" placeholder="Type your answer..." onkeyup="if(event.key === 'Enter') addReply('${q.id}')">
                            <button class="btn-send-reply" onclick="addReply('${q.id}')"><i class="fa-solid fa-paper-plane"></i></button>
                            <button class="btn-action-outline success" onclick="closeQuery('${q.id}')"><i class="fa-solid fa-check"></i> Mark Seen</button>
                        </div>
                    </div>
                `;
            }

            const hasManyReplies = q.replies.length > 2;
            const isExpanded = expandedQueryIds.has(q.id);
            const shouldCollapse = !isExpanded && hasManyReplies;

            const chatListClass = shouldCollapse ? 'reply-list collapsed' : 'reply-list';
            const btnText = shouldCollapse
                ? `<i class="fa-solid fa-angles-down"></i> Show all ${q.replies.length} messages`
                : `<i class="fa-solid fa-angles-up"></i> Show less`;

            const showMoreBtn = hasManyReplies
                ? `<button class="show-more-replies" onclick="toggleChat(this, '${q.id}')">${btnText}</button>`
                : '';

            card.innerHTML = `
                <div class="card-top-content">
                    <div class="card-header-row">
                        <div class="staff-info">
                            <div class="staff-avatar">${authorInitial}</div>
                            <div class="staff-details">
                                <h4>${q.staffName}</h4>
                                <span class="role-badge">${q.role || 'Staff'}</span>
                            </div>
                        </div>
                        <div class="query-meta">
                            <span class="status-badge ${q.status}">${statusText}</span>
                            <span class="time-pill">${timeDisplay}</span>
                        </div>
                    </div>
                    <div class="query-body-content">
                        <span class="query-subject">${q.subject}</span>
                        <p class="query-text">${q.description}</p>
                        ${imagesHtml}
                    </div>
                </div>
                <div class="replies-section">
                    <div class="${chatListClass}">${repliesHtml}</div>
                    ${showMoreBtn}
                    ${actionAreaHtml}
                </div>
            `;
            listContainer.appendChild(card);
        });
    }

    window.toggleChat = function (btn, id) {
        const list = btn.previousElementSibling;
        const isCollapsed = list.classList.toggle('collapsed');
        const count = list.children.length;

        if (isCollapsed) {
            expandedQueryIds.delete(id);
            btn.innerHTML = `<i class="fa-solid fa-angles-down"></i> Show all ${count} messages`;
            list.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        } else {
            expandedQueryIds.add(id);
            btn.innerHTML = `<i class="fa-solid fa-angles-up"></i> Show less`;
        }
    };

    // --- Window Actions ---
    window.viewImage = (data) => { const w = window.open(""); w.document.write(`<img src="${data}" style="max-width:100%;">`); };
    window.fillReply = (id, text) => { const input = document.getElementById(`reply-input-${id}`); if (input) { input.value = text; input.focus(); } };

    window.addReply = function (id) {
        const input = document.getElementById(`reply-input-${id}`);
        const text = input.value.trim();
        const imgs = tempReplyImages[id] || [];
        if (!text && imgs.length === 0) return;

        const query = queries.find(q => q.id === id);
        if (query && query.status === 'open') {
            query.replies.push({
                author: CURRENT_USER,
                text: text,
                timestamp: new Date().toISOString(),
                images: [...imgs]
            });
            tempReplyImages[id] = [];
            expandedQueryIds.add(id); // Auto-expand when replying
            saveQueries();
            renderQueries();
        }
    };

    // --- Confirmation Modal Logic ---
    const confirmModal = document.getElementById('confirm-modal');
    const confirmProceedBtn = document.getElementById('btn-confirm-proceed');
    const confirmCancelBtn = document.getElementById('btn-confirm-cancel');
    let itemToClose = null;

    window.closeQuery = (id) => {
        itemToClose = id;
        confirmModal.classList.add('active');
    };

    if (confirmCancelBtn) {
        confirmCancelBtn.onclick = () => {
            confirmModal.classList.remove('active');
            itemToClose = null;
        };
    }

    if (confirmProceedBtn) {
        confirmProceedBtn.onclick = () => {
            if (itemToClose) {
                const q = queries.find(item => item.id === itemToClose);
                if (q) {
                    q.status = 'closed';
                    q.closedBy = CURRENT_USER;
                    saveQueries();
                    renderQueries();
                }
            }
            confirmModal.classList.remove('active');
            itemToClose = null;
        };
    }

    // Close on overlay click
    if (confirmModal) {
        confirmModal.onclick = (e) => {
            if (e.target === confirmModal) {
                confirmModal.classList.remove('active');
                itemToClose = null;
            }
        };
    }

    window.reopenQuery = (id) => {
        const q = queries.find(item => item.id === id);
        if (q) { q.status = 'open'; q.closedBy = null; saveQueries(); renderQueries(); }
    };

    function saveQueries() {
        // Merge current owner's queries back into the global list
        const otherQueries = allQueries.filter(q => q.ownerId !== ownerId);
        const updatedAll = [...otherQueries, ...queries];
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedAll));
        allQueries = updatedAll; // Sync local state
    }

    // --- Modal Logic ---
    raiseBtn.onclick = () => {
        modalOverlay.classList.add('active');
        staffNameInput.value = CURRENT_USER;
        subjectInput.value = '';
        descInput.value = '';
        uploadedImages = [];
        renderImagePreviews();
    };

    closeModalBtn.onclick = () => modalOverlay.classList.remove('active');

    submitQueryBtn.onclick = () => {
        const name = staffNameInput.value.trim();
        const subject = subjectInput.value.trim();
        const desc = descInput.value.trim();
        if (name && subject && desc) {
            queries.unshift({
                id: 'qry_' + Date.now(),
                ownerId: ownerId, // Multi-Owner Fix
                staffName: name,
                role: roleSelect.value,
                timestamp: new Date().toISOString(),
                subject: subject,
                description: desc,
                status: 'open',
                replies: [],
                images: [...uploadedImages]
            });
            saveQueries();
            renderQueries();
            modalOverlay.classList.remove('active');
        } else alert('Fill all fields');
    };

    modalOverlay.onclick = (e) => { if (e.target === modalOverlay) modalOverlay.classList.remove('active'); };

    renderQueries();
});
\n\n