import CONFIG from '../Shared/Utils/config.js';
import { apiRequest } from '../Shared/Utils/api.js';


document.addEventListener('DOMContentLoaded', () => {

    // --- Authentication & Context ---
    const ctx = window.authContext;
    if (!ctx || !ctx.isAuthenticated) {
        window.location.href = '../Authentication/login.html';
        return;
    }

    const { role: userRole, ownerRefId: ownerId, user } = ctx;

    // Sidebar and Top Bar handled by shared sidebar.js

    // --- State and Storage ---
    const QUICK_REPLIES = [
        { text: "I'm looking into this.", icon: "fa-magnifying-glass" },
        { text: "Approved.", icon: "fa-check" },
        { text: "Please meet me in the office.", icon: "fa-user-tie" },
        { text: "Issue resolved.", icon: "fa-thumbs-up" },
        { text: "Noted, thank you.", icon: "fa-clipboard-check" }
    ];

    let complaints = [];
    let uploadedImages = []; // Temp storage for modal
    let tempReplyImages = {}; // Temp storage for replies by id: []

    function getCurrentUserName() {
        if (!user) return 'Admin';
        if (userRole === 'owner') return user.ownerName || user.shopName || 'Owner';
        if (userRole === 'staff') return user.name || 'Staff';

        return 'Admin';
    }

    const CURRENT_USER = getCurrentUserName();

    // --- Dynamic Data Fetching ---
    async function fetchComplaints() {
        try {
            const result = await apiRequest('/complaints/');
            if (result.success) {
                complaints = result.data.filter(c => c.type === 'complaint');
                renderComplaints();
            }
        } catch (err) {
            console.error("Complaint Fetch Error:", err);
        }
    }


    // --- DOM Elements ---
    const listContainer = document.getElementById('complaints-list');
    const raiseBtn = document.getElementById('btn-raise-complaint');
    const modalOverlay = document.getElementById('raise-modal');
    const closeModalBtn = document.getElementById('btn-modal-cancel');
    const submitComplaintBtn = document.getElementById('btn-modal-submit');
    const staffNameInput = document.getElementById('staff-name');
    const subjectInput = document.getElementById('complaint-subject');
    const descInput = document.getElementById('complaint-desc');
    const roleSelect = document.getElementById('staff-role');
    const fileInput = document.getElementById('complaint-files');
    const previewContainer = document.getElementById('image-preview-container');

    // --- Image Handling (Modal) ---
    if (fileInput) {
        fileInput.addEventListener('change', (e) => {
            const files = Array.from(e.target.files);
            if (uploadedImages.length + files.length > 5) {
                alert('You can upload a maximum of 5 images.');
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
    }

    function renderImagePreviews() {
        if (!previewContainer) return;
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

    function renderComplaints() {
        if (!listContainer) return;
        listContainer.innerHTML = '';

        let sorted = [...complaints];
        if (userRole !== 'owner' && userRole !== 'admin') {
            sorted = sorted.filter(c => c.staffName === CURRENT_USER);
        }
        sorted = sorted.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        if (sorted.length === 0) {
            listContainer.innerHTML = `<div style="text-align:center; padding:2rem; color:var(--text-secondary);">No complaints yet.</div>`;
            return;
        }

        sorted.forEach(c => {
            const card = document.createElement('div');
            card.className = `complaint-card status-${c.status === 'open' ? 'open' : 'closed'}`;

            const timeDisplay = formatTimeDisplay(c.createdAt);
            const statusText = c.status === 'open' ? 'Open' : 'Closed';
            const authorInitial = c.staffName.charAt(0).toUpperCase();

            let imagesHtml = '';
            if (c.images && c.images.length > 0) {
                imagesHtml = `<div class="complaint-images-display">
                    ${c.images.map(img => `<img src="${img.data}" class="complaint-img-view" onclick="viewImage('${img.data}')">`).join('')}
                </div>`;
            }

            const repliesHtml = c.replies.map(r => {
                const isMe = r.author === CURRENT_USER;
                const replyClass = isMe ? 'reply-item self-reply' : 'reply-item';
                return `
                    <div class="${replyClass}">
                        <div class="reply-avatar">${r.author.charAt(0)}</div>
                        <div class="reply-bubble">
                            <span class="reply-author-name">${isMe ? 'You' : r.author} <span style="font-weight:400; opacity:0.7;">${formatTimeDisplay(r.timestamp)}</span></span>
                            <div class="reply-text">${r.text}</div>
                        </div>
                    </div>
                `;
            }).join('');

            let actionAreaHtml = '';
            if (c.status === 'closed') {
                actionAreaHtml = `
                    <div class="closed-overlay">
                        <span><i class="fa-solid fa-lock"></i> Complaint closed by ${c.closedBy || 'Admin'}</span>
                        ${userRole === 'owner' ? `<button class="btn-action-outline success" onclick="updateComplaintStatus('${c._id}', 'open')"><i class="fa-solid fa-unlock"></i> Re-open</button>` : ''}
                        ${userRole === 'owner' ? `<button class="btn-action-outline danger" onclick="deleteComplaintAction('${c._id}')" style="margin-left: 0.5rem;"><i class="fa-solid fa-trash"></i> Delete</button>` : ''}
                    </div>
                `;
            } else {
                const pillsHtml = QUICK_REPLIES.map(q => `<div class="quick-pill" onclick="fillReply('${c._id}', '${q.text.replace(/'/g, "\\'")}')"><i class="fa-solid ${q.icon}"></i> ${q.text}</div>`).join('');
                actionAreaHtml = `
                    <div class="action-area">
                        <div class="quick-replies">${pillsHtml}</div>
                        <div id="reply-preview-${c._id}" class="reply-preview-container"></div>
                        <div class="input-row">
                            <input type="text" class="main-input" id="reply-input-${c._id}" placeholder="Type your reply..." onkeyup="if(event.key === 'Enter') addReply('${c._id}')">
                            <button class="btn-send-reply" onclick="addReply('${c._id}')"><i class="fa-solid fa-paper-plane"></i></button>
                            ${userRole === 'owner' ? `<button class="btn-action-outline danger" onclick="closeComplaint('${c._id}')"><i class="fa-solid fa-check"></i> Close</button>` : ''}
                            ${userRole === 'owner' ? `<button class="btn-action-outline danger" onclick="deleteComplaintAction('${c._id}')" style="margin-left: 0.5rem;"><i class="fa-solid fa-trash"></i></button>` : ''}
                        </div>
                    </div>
                `;
            }

            const hasManyReplies = c.replies.length > 3;
            const chatListClass = hasManyReplies ? 'reply-list collapsed' : 'reply-list';
            const showMoreBtn = hasManyReplies ? `<button class="show-more-replies" onclick="toggleChat(this, ${c.replies.length})"><i class="fa-solid fa-angles-down"></i> Show all ${c.replies.length} messages</button>` : '';

            card.innerHTML = `
                <div class="card-top-content">
                    <div class="card-header-row">
                        <div class="staff-info">
                            <div class="staff-avatar">${authorInitial}</div>
                            <div class="staff-details">
                                <h4>${c.staffName}</h4>
                                <span class="role-badge">${c.role || 'Staff'}</span>
                            </div>
                        </div>
                        <div class="complaint-meta">
                            <span class="status-badge ${c.status === 'open' ? 'open' : 'closed'}">${statusText}</span>
                            <span class="time-pill">${timeDisplay}</span>
                        </div>
                    </div>
                    <div class="complaint-body-content">
                        <span class="complaint-subject">${c.subject}</span>
                        <p class="complaint-text">${c.description}</p>
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

    window.toggleChat = function (btn, count) {
        const list = btn.previousElementSibling;
        const isNowCollapsed = list.classList.toggle('collapsed');
        if (isNowCollapsed) {
            btn.innerHTML = `<i class="fa-solid fa-angles-down"></i> Show all ${count} messages`;
        } else {
            btn.innerHTML = `<i class="fa-solid fa-angles-up"></i> Show less`;
        }
    };

    // --- Window Actions ---
    window.viewImage = (data) => { const w = window.open(""); w.document.write(`<img src="${data}" style="max-width:100%;">`); };
    window.fillReply = (id, text) => { const input = document.getElementById(`reply-input-${id}`); if (input) { input.value = text; input.focus(); } };

    window.addReply = async function (id) {
        const input = document.getElementById(`reply-input-${id}`);
        const text = input.value.trim();
        if (!text) return;

        try {
            const result = await apiRequest(`/complaints/${id}/reply`, {
                method: 'POST',
                body: JSON.stringify({ author: CURRENT_USER, text })
            });
            if (result.success) {
                input.value = '';
                fetchComplaints();
            }
        } catch (err) {
            console.error("Reply Error:", err);
        }
    };

    const confirmModal = document.getElementById('confirm-modal');
    const confirmProceedBtn = document.getElementById('btn-confirm-proceed');
    const confirmCancelBtn = document.getElementById('btn-confirm-cancel');
    let actionTargetId = null;
    let actionType = 'close'; // 'close' or 'delete' or 'reopen'

    window.updateComplaintStatus = async function (id, status) {
        try {
            const result = await apiRequest(`/complaints/${id}`, {
                method: 'PATCH',
                body: JSON.stringify({ status, closedBy: status === 'closed' ? CURRENT_USER : null })
            });
            if (result.success) {
                fetchComplaints();
                return true;
            }
        } catch (err) {
            console.error("Status Update Error:", err);
            return false;
        }
    };

    window.closeComplaint = function (id) {
        actionTargetId = id;
        actionType = 'close';
        if (!confirmModal) {
            if (confirm('Close this complaint?')) window.updateComplaintStatus(id, 'closed');
            return;
        }
        
        const confirmTitle = confirmModal.querySelector('h3');
        const confirmDesc = confirmModal.querySelector('p');
        const confirmIcon = confirmModal.querySelector('.fa-circle-question');

        confirmTitle.innerText = "Close Complaint?";
        confirmDesc.innerText = "Are you sure you want to mark this complaint as closed? This will move it to the resolved section.";
        confirmProceedBtn.innerText = "Yes, Close It";
        confirmProceedBtn.style.background = "var(--accent)";
        confirmProceedBtn.style.boxShadow = "0 10px 15px -3px rgba(22, 163, 74, 0.3)";
        if (confirmIcon) {
            confirmIcon.className = "fa-solid fa-circle-check";
            confirmIcon.parentElement.style.color = "var(--accent)";
        }

        confirmModal.classList.add('active');
    };

    window.deleteComplaintAction = function (id) {
        actionTargetId = id;
        actionType = 'delete';
        if (!confirmModal) {
            if (confirm('Delete this complaint?')) performDelete(id);
            return;
        }

        const confirmTitle = confirmModal.querySelector('h3');
        const confirmDesc = confirmModal.querySelector('p');
        const confirmIcon = confirmModal.querySelector('.fa-circle-question');

        confirmTitle.innerText = "Delete Complaint?";
        confirmDesc.innerText = "This will permanently remove the complaint and all its histories. This action cannot be undone.";
        confirmProceedBtn.innerText = "Yes, Delete It";
        confirmProceedBtn.style.background = "var(--danger)";
        confirmProceedBtn.style.boxShadow = "0 10px 15px -3px rgba(239, 68, 68, 0.3)";
        if (confirmIcon) {
            confirmIcon.className = "fa-solid fa-trash-can";
            confirmIcon.parentElement.style.color = "var(--danger)";
        }

        confirmModal.classList.add('active');
    };

    async function performDelete(id) {
        try {
            const result = await apiRequest(`/complaints/${id}`, {
                method: 'DELETE'
            });
            if (result.success) {
                fetchComplaints();
            }
        } catch (err) {
            console.error("Delete Error:", err);
        }
    }

    if (confirmProceedBtn) {
        confirmProceedBtn.onclick = async () => {
            if (actionTargetId) {
                if (actionType === 'close') {
                    await window.updateComplaintStatus(actionTargetId, 'closed');
                } else if (actionType === 'delete') {
                    await performDelete(actionTargetId);
                }
            }
            confirmModal.classList.remove('active');
            actionTargetId = null;
        };
    }

    if (confirmCancelBtn) {
        confirmCancelBtn.onclick = () => {
            confirmModal.classList.remove('active');
            actionTargetId = null;
        };
    }

    if (confirmModal) {
        confirmModal.onclick = (e) => { 
            if (e.target === confirmModal) { 
                confirmModal.classList.remove('active'); 
                actionTargetId = null; 
            } 
        };
    }

    // --- Modal Logic for Raising Complaint ---
    if (raiseBtn) {
        raiseBtn.onclick = () => {
            modalOverlay.classList.add('active');
            staffNameInput.value = CURRENT_USER;
            staffNameInput.readOnly = true; // Auto-fetch and lock the name

            // Dynamic Role Handling
            if (roleSelect) {
                roleSelect.innerHTML = '';
                const displayRole = userRole === 'owner' ? 'Owner' : 'Staff';
                const opt = document.createElement('option');
                opt.value = displayRole;
                opt.textContent = displayRole;
                roleSelect.appendChild(opt);
                roleSelect.value = displayRole;
            }

            subjectInput.value = '';
            descInput.value = '';
            uploadedImages = [];
            renderImagePreviews();
        };
    }

    if (closeModalBtn) closeModalBtn.onclick = () => modalOverlay.classList.remove('active');

    if (submitComplaintBtn) {
        submitComplaintBtn.onclick = async () => {
            const subject = subjectInput.value.trim();
            const description = descInput.value.trim();
            if (subject && description) {
                try {
                    const result = await apiRequest('/complaints/', {
                        method: 'POST',
                        body: JSON.stringify({
                            ownerId,
                            type: 'complaint',
                            staffName: CURRENT_USER,
                            role: userRole,
                            subject,
                            description,
                            images: uploadedImages
                        })
                    });
                    if (result.success) {
                        modalOverlay.classList.remove('active');
                        fetchComplaints();
                    }
                } catch (err) {
                    console.error("Submit Error:", err);
                }
            } else alert('Fill all fields');
        };
    }

    if (modalOverlay) {
        modalOverlay.onclick = (e) => { if (e.target === modalOverlay) modalOverlay.classList.remove('active'); };
    }

    fetchComplaints(); // Initial load
});
