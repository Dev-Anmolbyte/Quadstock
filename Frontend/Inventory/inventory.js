document.addEventListener('DOMContentLoaded', () => {
    // --- 0. RBAC Security Check ---
    const currentEmployee = JSON.parse(localStorage.getItem('currentEmployee'));
    if (currentEmployee && currentEmployee.role === 'staff') {
        // Hide Restricted Actions
        const btnAdd = document.getElementById('add-product-btn');
        if (btnAdd) btnAdd.style.display = 'none';

        // Add Style to hide edit/delete buttons dynamically
        const style = document.createElement('style');
        style.innerHTML = `
            .edit-btn, .delete-btn, .edit-group-btn { display: none !important; }
        `;
        document.head.appendChild(style);
    }
    // --- 1. State & Constants ---
    let inventory = JSON.parse(localStorage.getItem('inventory')) || [];
    let isEditing = false;
    let currentEditId = null;
    let cameraStream = null;

    // Filters State
    let filters = {
        search: '',
        category: '',
        brand: '',
        stock: '',
        expiry: ''
    };

    const DEFAULT_CATEGORIES = {
        'Kirana': ['Beverages', 'Dairy', 'Snacks', 'Flour & Atta', 'Rice & Dal', 'Spices', 'Oil & Masala', 'Bakery', 'Household', 'Fruits & Veg', 'Pooja Needs'],
        'Clothes': ['Men\'s Wear', 'Women\'s Wear', 'Kids\' Wear', 'Fusion Wear', 'Footwear', 'Accessories']
    };

    const DEFAULT_BRANDS = [
        'Amul', 'Tata', 'Britannia', 'Parle', 'Haldiram', 'Nestle', 'Dabur', 'HUL', 'Patanjali', 'Aashirvaad', 'India Gate', 'Fortune', 'Sunfeast', 'Maggi', 'Brooke Bond', 'Mother Dairy'
    ];

    let CATEGORIES = JSON.parse(localStorage.getItem('categories')) || DEFAULT_CATEGORIES;
    let BRANDS = JSON.parse(localStorage.getItem('brands')) || DEFAULT_BRANDS;
    const UNITS = ['pcs', 'kg', 'g', 'L', 'ml', 'box', 'pack', 'dozen', 'can', 'bottle'];

    // Settings [Caution, Warning, Critical] (Critical currently used for < 0)
    let expirySettings = JSON.parse(localStorage.getItem('expirySettings')) || [30, 14, 7];

    // --- 2. DOM Elements ---
    const tableBody = document.getElementById('inventory-table-body');
    const emptyState = document.getElementById('empty-state');
    const valTotalValue = document.getElementById('val-total-value');
    const valExpiringSoon = document.getElementById('val-expiring-soon');
    const valLowStock = document.getElementById('val-low-stock');
    const valFastMover = document.getElementById('val-fast-mover');

    const searchInput = document.getElementById('inventory-search');
    const filterCategory = document.getElementById('filter-category');
    const filterBrand = document.getElementById('filter-brand');
    const filterStock = document.getElementById('filter-stock');
    const filterExpiry = document.getElementById('filter-expiry');
    const btnExport = document.getElementById('export-btn');
    const btnAddProduct = document.getElementById('add-product-btn');

    const modal = document.getElementById('product-modal');
    const modalTitle = document.getElementById('modal-title');
    const productForm = document.getElementById('product-form');
    const btnCloseModal = document.querySelectorAll('.close-modal, .close-modal-btn');
    const btnGenBatch = document.getElementById('btn-gen-batch');
    const btnSplitBatch = document.getElementById('btn-split-batch');

    const inputType = document.getElementById('product-type');
    const inputCategory = document.getElementById('product-category');
    const datalistCategory = document.getElementById('category-list');
    const inputBrand = document.getElementById('product-brand');
    const datalistBrands = document.getElementById('brand-list');
    const inputName = document.getElementById('product-name');
    const inputBatch = document.getElementById('batch-number');
    const inputQty = document.getElementById('product-quantity');
    const inputUnit = document.getElementById('product-unit');
    const inputMfd = document.getElementById('mfd-date');
    const inputExp = document.getElementById('exp-date');
    const inputPP = document.getElementById('purchase-price');
    const inputCP = document.getElementById('cost-price');
    const inputSP = document.getElementById('selling-price');
    const inputReorder = document.getElementById('reorder-point');
    const inputWeight = document.getElementById('product-weight');
    const inputDesc = document.getElementById('product-desc');
    const marginVal = document.getElementById('margin-val');
    const profitVal = document.getElementById('profit-val');
    const expiryHint = document.getElementById('expiry-hint');

    const divGroceryDates = document.getElementById('grocery-dates');
    const divClothesAttributes = document.getElementById('clothes-attributes');
    const inputSize = document.getElementById('product-size');
    const inputColor = document.getElementById('product-color');
    const inputColorPicker = document.getElementById('color-picker');

    if (inputColorPicker) {
        inputColorPicker.addEventListener('input', (e) => {
            inputColor.value = e.target.value;
        });
    }

    const inputImageURL = document.getElementById('product-image');
    const inputImageFile = document.getElementById('product-image-file');
    const btnCamera = document.getElementById('btn-camera');
    const cameraInterface = document.getElementById('camera-interface');
    const videoEl = document.getElementById('camera-video');

    const canvasEl = document.getElementById('camera-canvas');
    const btnCapture = document.getElementById('btn-capture');
    const btnStopCamera = document.getElementById('btn-stop-camera');
    const previewInterface = document.getElementById('preview-interface');
    const imgPreview = document.getElementById('image-preview');
    const btnClearImage = document.getElementById('btn-clear-image');

    const sidebarToggle = document.getElementById('sidebar-toggle');
    const sidebar = document.querySelector('.sidebar');
    const themeToggle = document.getElementById('theme-toggle');

    const sectionStock = document.getElementById('section-stock');
    const sectionPricing = document.getElementById('section-pricing');

    inputPP.addEventListener('input', calculateMargin);
    inputCP.addEventListener('input', calculateMargin);
    inputSP.addEventListener('input', calculateMargin);








    // --- 3. Initialization ---
    initTheme();
    setupSidebar();
    populateSelects();
    updateBrandList();
    calculateDashboardStats(); // Run once on load
    renderTable(); // Initial Render

    // --- 4. Event Listeners ---

    // Input Events for Filters
    searchInput.addEventListener('input', (e) => { filters.search = e.target.value.toLowerCase(); renderTable(); });
    filterCategory.addEventListener('change', (e) => { filters.category = e.target.value; renderTable(); });
    filterBrand.addEventListener('change', (e) => { filters.brand = e.target.value; renderTable(); });
    filterStock.addEventListener('change', (e) => { filters.stock = e.target.value; renderTable(); });
    filterExpiry.addEventListener('change', (e) => { filters.expiry = e.target.value; renderTable(); });

    // Modal Events
    btnAddProduct.addEventListener('click', () => openModal());
    btnCloseModal.forEach(btn => btn.addEventListener('click', closeModal));
    window.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });

    // Form Logic
    productForm.addEventListener('submit', handleFormSubmit);
    btnGenBatch.addEventListener('click', () => { inputBatch.value = generateBatchNumber(); });

    // Split Batch
    btnSplitBatch.addEventListener('click', () => {
        if (productForm.checkValidity()) {
            saveProduct(false);

            // Essential: Reset editing state so next save creates new item
            isEditing = false;
            currentEditId = null;

            // Clear Batch & Qty fields
            inputBatch.value = generateBatchNumber();
            inputQty.value = '';

            // Reset fields based on type
            if (inputType.value === 'Clothes') {
                inputSize.value = '';
                inputColor.value = '';
            } else {
                inputExp.value = '';
                inputMfd.value = '';
                expiryHint.textContent = 'Select date to see alert status';
                expiryHint.style.color = 'var(--text-secondary)';
            }

            // UI Feedback
            const originalText = btnSplitBatch.innerHTML;
            btnSplitBatch.innerHTML = '<i class="fa-solid fa-check"></i> Added! Next...';
            setTimeout(() => { btnSplitBatch.innerHTML = originalText; }, 1000);
        } else {
            productForm.reportValidity();
        }
    });

    // Dynamic Form Updates (Category Change)
    inputType.addEventListener('change', (e) => {
        const type = e.target.value;
        populateSubCategories(type);
        toggleAttributes(type);
        inputCategory.value = ''; // Clear previous sub-category
    });

    // Margin Calculator
    [inputCP, inputSP].forEach(input => {
        input.addEventListener('input', calculateMargin);
    });

    inputExp.addEventListener('change', updateExpiryHint);
    btnExport.addEventListener('click', exportToCSV);

    // --- Image Handling Listeners ---

    // 1. File Upload
    inputImageFile.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                showPreview(e.target.result);
                inputImageURL.value = ''; // Clear URL if file selected
            };
            reader.readAsDataURL(file);
        }
    });

    // 2. Camera Start
    btnCamera.addEventListener('click', async () => {
        try {
            cameraStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
            videoEl.srcObject = cameraStream;
            cameraInterface.style.display = 'block';
            previewInterface.style.display = 'none';
            // Hide other inputs while camera is active
            document.querySelector('.image-controls').style.display = 'none';
        } catch (err) {
            alert('Could not access camera: ' + err.message);
        }
    });

    // 3. Capture Photo
    btnCapture.addEventListener('click', () => {
        const context = canvasEl.getContext('2d');
        canvasEl.width = videoEl.videoWidth;
        canvasEl.height = videoEl.videoHeight;
        context.drawImage(videoEl, 0, 0, canvasEl.width, canvasEl.height);

        const dataURL = canvasEl.toDataURL('image/png');
        showPreview(dataURL);
        stopCamera();
    });

    // 4. Stop Camera
    btnStopCamera.addEventListener('click', stopCamera);

    // 5. Clear Image
    btnClearImage.addEventListener('click', () => {
        imgPreview.src = '';
        previewInterface.style.display = 'none';
        inputImageFile.value = '';
        inputImageURL.value = '';
        document.querySelector('.image-controls').style.display = 'flex';
    });

    // 6. URL Input (Show preview if valid URL)
    inputImageURL.addEventListener('change', (e) => {
        if (e.target.value) showPreview(e.target.value);
    });


    // --- 5. Core Functions ---

    function generateBatchNumber() {
        const date = new Date();
        const yyyy = date.getFullYear();
        const mm = String(date.getMonth() + 1).padStart(2, '0');
        const dd = String(date.getDate()).padStart(2, '0');
        const random = Math.floor(1000 + Math.random() * 9000);
        return `BAT-${yyyy}${mm}${dd}-${random}`;
    }

    function calculateMargin() {
        const cp = parseFloat(inputCP.value) || 0;
        const sp = parseFloat(inputSP.value) || 0;

        if (cp > 0 && sp > 0) {
            const profit = sp - cp;
            const margin = (profit / sp) * 100;

            profitVal.textContent = `₹${profit.toFixed(2)}`;
            profitVal.style.color = profit < 0 ? 'var(--c-red-text)' : 'var(--c-green-text)';

            marginVal.textContent = `${margin.toFixed(1)}%`;
            marginVal.style.color = margin < 0 ? 'var(--c-red-text)' : 'var(--c-green-text)';
        } else {
            profitVal.textContent = '-';
            profitVal.style.color = 'var(--text-secondary)';
            marginVal.textContent = '-';
            marginVal.style.color = 'var(--text-secondary)';
        }
    }

    function updateExpiryHint() {
        if (!inputExp.value) return;
        const today = new Date();
        const expDate = new Date(inputExp.value);
        const diffDays = Math.ceil((expDate - today) / (1000 * 60 * 60 * 24));

        if (diffDays < 0) {
            expiryHint.textContent = `Expired ${Math.abs(diffDays)} days ago`;
            expiryHint.style.color = 'var(--c-red-text)';
        } else if (diffDays <= expirySettings[0]) {
            expiryHint.textContent = `Expires in ${diffDays} days (Alert)`;
            expiryHint.style.color = 'var(--c-orange-text)';
        } else {
            expiryHint.textContent = `Expires in ${diffDays} days`;
            expiryHint.style.color = 'var(--c-green-text)';
        }
    }

    function populateSelects() {
        // Units
        inputUnit.innerHTML = '';
        UNITS.forEach(u => {
            const opt = document.createElement('option');
            opt.value = u;
            opt.textContent = u;
            inputUnit.appendChild(opt);
        });

        // Filter Categories
        filterCategory.innerHTML = '<option value="">All Categories</option>';
        Object.keys(CATEGORIES).forEach(type => {
            // Main Type
            const optGroup = document.createElement('optgroup');
            optGroup.label = type;
            CATEGORIES[type].forEach(c => {
                const opt = document.createElement('option');
                opt.value = c;
                opt.textContent = c;
                optGroup.appendChild(opt);
            });
            filterCategory.appendChild(optGroup);
        });
    }

    function populateSubCategories(type, selected = null) {
        datalistCategory.innerHTML = ''; // Clear datalist
        if (CATEGORIES[type]) {
            CATEGORIES[type].forEach(cat => {
                const opt = document.createElement('option');
                opt.value = cat;
                datalistCategory.appendChild(opt);
            });
        }
    }

    function toggleAttributes(type) {
        if (type === 'Clothes') {
            divGroceryDates.style.display = 'none';
            divClothesAttributes.style.display = 'grid';
            divClothesAttributes.style.gridTemplateColumns = '1fr 1fr';
            divClothesAttributes.style.gap = '1.5rem';

            inputExp.removeAttribute('required');

            // Restrict Unit to 'pcs'
            inputUnit.innerHTML = '<option value="pcs">pcs</option>';
        } else {
            divGroceryDates.style.display = 'grid';
            divClothesAttributes.style.display = 'none';

            inputExp.setAttribute('required', 'true');

            // Restore All Units
            inputUnit.innerHTML = '';
            UNITS.forEach(u => {
                const opt = document.createElement('option');
                opt.value = u;
                opt.textContent = u;
                inputUnit.appendChild(opt);
            });
        }
    }

    function updateBrandList() {
        datalistBrands.innerHTML = '';
        // Combine Default brands with any custom brands found in inventory
        const usedBrands = new Set([...BRANDS, ...inventory.map(i => i.brand).filter(b => b)]);
        const sortedBrands = [...usedBrands].sort();

        sortedBrands.forEach(b => {
            const opt = document.createElement('option');
            opt.value = b;
            datalistBrands.appendChild(opt);
        });

        // Update Filter
        filterBrand.innerHTML = '<option value="">All Brands</option>';
        sortedBrands.forEach(b => {
            const opt = document.createElement('option');
            opt.value = b;
            opt.textContent = b;
            filterBrand.appendChild(opt);
        });
    }

    function stopCamera() {
        if (cameraStream) {
            cameraStream.getTracks().forEach(track => track.stop());
            cameraStream = null;
        }
        cameraInterface.style.display = 'none';
        videoEl.srcObject = null;
        document.querySelector('.image-controls').style.display = 'flex';
    }

    function showPreview(src) {
        imgPreview.src = src;
        previewInterface.style.display = 'block';
        document.querySelector('.image-controls').style.display = 'none';
    }


    // --- 6. Modal Functions ---

    function openModal(item = null) {
        modal.classList.add('show');
        modal.style.display = 'flex';

        if (item) {
            isEditing = true;
            currentEditId = item.id;
            modalTitle.textContent = 'Edit Product';
            btnSplitBatch.style.display = 'block';

            inputName.value = item.name;
            inputBrand.value = item.brand || '';
            inputType.value = item.type || 'Kirana';
            inputCategory.value = item.category || '';
            populateSubCategories(item.type);
            toggleAttributes(item.type);

            inputPP.value = item.pp || '';
            inputCP.value = item.cp || '';
            inputSP.value = item.price || '';
            inputWeight.value = item.weight || '';
            inputDesc.value = item.description || '';

            if (item.type === 'Clothes') {
                inputSize.value = item.size || '';
                inputColor.value = item.color || '';
            }

            if (item.image) showPreview(item.image);
            else {
                previewInterface.style.display = 'none';
                imgPreview.src = '';
                document.querySelector('.image-controls').style.display = 'flex';
            }

            inputBatch.value = item.batchNumber || '';
            inputQty.value = item.quantity || 0;
            inputUnit.value = item.unit || 'pcs';
            inputMfd.value = item.mfd || '';
            inputExp.value = item.exp || '';
            inputReorder.value = item.reorderPoint || 10;
        } else {
            isEditing = false;
            currentEditId = null;
            modalTitle.textContent = 'Add New Product';
            btnSplitBatch.style.display = 'block';
            productForm.reset();
            stopCamera();
            previewInterface.style.display = 'none';
            imgPreview.src = '';
            document.querySelector('.image-controls').style.display = 'flex';
            inputBatch.value = generateBatchNumber();
            marginVal.textContent = '-';
            expiryHint.textContent = 'Select date to see alert status';
            inputType.value = 'Kirana';
            inputWeight.value = '';
            inputDesc.value = '';
            populateSubCategories('Kirana');
            toggleAttributes('Kirana');
        }
        calculateMargin();
        updateExpiryHint();
    }

    function closeModal() {
        modal.classList.remove('show');
        stopCamera();
        setTimeout(() => { modal.style.display = 'none'; }, 300);
    }

    function handleFormSubmit(e) {
        e.preventDefault();
        saveProduct(true);
    }

    function saveProduct(closeAfterSave = true) {
        // Handle Custom Sub-Category
        const currentType = inputType.value;
        const newCat = inputCategory.value;
        if (currentType && newCat) {
            const exists = CATEGORIES[currentType].some(c => c.toLowerCase() === newCat.toLowerCase());
            if (!exists) {
                CATEGORIES[currentType].push(newCat);
                localStorage.setItem('categories', JSON.stringify(CATEGORIES));
                populateSubCategories(currentType);
            }
        }

        // Handle Custom Brand
        const newBrand = inputBrand.value;
        if (newBrand) {
            const exists = BRANDS.some(b => b.toLowerCase() === newBrand.toLowerCase());
            if (!exists) {
                BRANDS.push(newBrand);
                localStorage.setItem('brands', JSON.stringify(BRANDS));
                updateBrandList();
            }
        }

        const productData = {
            id: isEditing ? currentEditId : Date.now().toString(),
            name: inputName.value,
            brand: inputBrand.value,
            type: inputType.value,
            category: inputCategory.value,
            description: inputDesc.value,
            image: imgPreview.src || inputImageURL.value, // Prefer preview (file/camera)

            batchNumber: inputBatch.value,
            quantity: parseInt(inputQty.value) || 0,
            unit: inputUnit.value,

            // Conditional Fields
            mfd: currentType === 'Clothes' ? null : inputMfd.value,
            exp: currentType === 'Clothes' ? null : inputExp.value,
            size: currentType === 'Clothes' ? inputSize.value : null,
            color: currentType === 'Clothes' ? inputColor.value : null,
            weight: currentType === 'Kirana' ? inputWeight.value : null,

            reorderPoint: parseInt(inputReorder.value) || 10,

            pp: parseFloat(inputPP.value) || 0,
            cp: parseFloat(inputCP.value) || 0,
            price: parseFloat(inputSP.value) || 0
        };

        if (isEditing) {
            const index = inventory.findIndex(i => i.id === currentEditId);
            if (index !== -1) inventory[index] = productData;
        } else {
            inventory.unshift(productData);
        }

        // Persist
        try {
            localStorage.setItem('inventory', JSON.stringify(inventory));
        } catch (e) {
            alert('Storage Full! Could not save product. Please clear old data or compress images.');
            console.error('LocalStorage Save Error:', e);
            // Revert changes in memory if save failed? 
            // Ideally yes, but for now just warn.
        }

        // Update UI
        calculateDashboardStats();
        renderTable();

        if (closeAfterSave) closeModal();
    }

    function deleteProduct(id) {
        if (confirm('Delete this batch?')) {
            inventory = inventory.filter(i => i.id !== id);
            localStorage.setItem('inventory', JSON.stringify(inventory));
            calculateDashboardStats();
            renderTable();
        }
    }

    // --- 7. Dashboard Logic ---

    function calculateDashboardStats() {
        let totalVal = 0;
        let expiringCount = 0;
        let lowStockCount = 0;
        let outOfStockCount = 0;
        const today = new Date();

        inventory.forEach(item => {
            totalVal += (item.cp || 0) * (item.quantity || 0);

            if (item.quantity === 0) {
                outOfStockCount++;
            } else if (item.quantity <= (item.reorderPoint || 10)) {
                lowStockCount++;
            }

            if (item.exp) {
                const expDate = new Date(item.exp);
                const diffTime = expDate - today;
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                if (diffDays <= expirySettings[0] && diffDays >= 0) {
                    expiringCount++;
                }
            }
        });

        valTotalValue.textContent = formatCurrency(totalVal);
        valExpiringSoon.textContent = expiringCount;
        valLowStock.textContent = lowStockCount;

        const valOutOfStock = document.getElementById('val-out-of-stock');
        if (valOutOfStock) valOutOfStock.textContent = outOfStockCount;
    }

    function formatCurrency(val) {
        return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(val);
    }

    function formatDate(dateStr) {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    }

    // --- 8. Table Render ---

    function renderTable() {
        // 1. Filter
        let filtered = inventory.filter(item => {
            const term = filters.search;
            const matchSearch = !term ||
                item.name.toLowerCase().includes(term) ||
                (item.brand && item.brand.toLowerCase().includes(term)) ||
                (item.batchNumber && item.batchNumber.toLowerCase().includes(term)) ||
                (item.sku && item.sku.toLowerCase().includes(term));

            const matchCat = !filters.category || item.category === filters.category;
            const matchBrand = !filters.brand || item.brand === filters.brand;

            let matchStock = true;
            if (filters.stock === 'low-stock') matchStock = item.quantity <= (item.reorderPoint || 10) && item.quantity > 0;
            if (filters.stock === 'out-of-stock') matchStock = item.quantity === 0;
            if (filters.stock === 'in-stock') matchStock = item.quantity > (item.reorderPoint || 10);

            let matchExp = true;
            if (filters.expiry && item.exp) {
                const today = new Date();
                const expDate = new Date(item.exp);
                const diffDays = Math.ceil((expDate - today) / (1000 * 60 * 60 * 24));

                if (filters.expiry === 'expired') matchExp = diffDays < 0;
                if (filters.expiry === 'expiring-soon') matchExp = diffDays >= 0 && diffDays <= 30;
                if (filters.expiry === 'good') matchExp = diffDays > 30;
            }

            return matchSearch && matchCat && matchBrand && matchStock && matchExp;
        });

        tableBody.innerHTML = '';
        if (filtered.length === 0) {
            emptyState.style.display = 'flex';
            document.querySelector('.table-responsive').style.display = 'none';
            return;
        }

        emptyState.style.display = 'none';
        document.querySelector('.table-responsive').style.display = 'block';

        // 2. Group by Name
        const groups = {};
        filtered.forEach(item => {
            const key = item.name.toLowerCase().trim(); // Key by name
            if (!groups[key]) groups[key] = [];
            groups[key].push(item);
        });

        // 3. Render Groups
        Object.values(groups).forEach(group => {
            if (group.length === 1) {
                // Single Item - Render Standard Row
                const item = group[0];
                renderSingleRow(item);
            } else {
                // Multiple Items - Render Parent + Children
                renderGroupRows(group);
            }
        });

        // 4. Attach Listeners
        attachTableListeners();
    }

    function renderSingleRow(item) {
        const tr = document.createElement('tr');
        const status = getStatus(item);

        tr.innerHTML = `
            <td><span class="status-dot ${status.class}" title="${status.title}"></span></td>
            <td>
                <div style="display:flex; gap:10px; align-items:center;">
                    ${item.image ? `<img src="${item.image}" style="width:40px; height:40px; border-radius:4px; object-fit:cover;">` : '<div class="image-placeholder"><i class="fa-solid fa-plus"></i></div>'}
                    <div>
                        <div style="font-weight: 600;">${item.name} <span style="font-weight:400; color:var(--text-secondary); font-size:0.95em;">${(item.size || item.weight) ? '(' + (item.size || item.weight) + ')' : ''} ${item.color ? '(' + item.color + ')' : ''}</span></div>
                        <div class="text-sm">${item.category}</div>
                    </div>
                </div>
            </td>
            <td><div class="badge badge-cat">${item.brand || '-'}</div></td>
            <td>
                <div style="font-family: monospace; font-weight: 600;">${item.batchNumber}</div>
                <div class="text-sm">MFD: ${formatDate(item.mfd)}</div>
            </td>
            <td>
                <div style="font-weight: 700;">${item.quantity} ${item.unit}</div>
                ${item.quantity === 0 ? '<span style="color:var(--c-red-text); font-size:0.75em; font-weight:bold;">Out of Stock</span>' : (item.quantity <= (item.reorderPoint || 10) ? '<span style="color:var(--c-orange-text); font-size:0.75em;">Low Stock</span>' : '')}
            </td>
            <td>
                ${item.pp ? `<div class="text-sm" style="opacity:0.7;">PP: ₹${item.pp.toFixed(2)}</div>` : ''}
                <div class="text-sm">CP: ₹${(item.cp || 0).toFixed(2)}</div>
                <div style="font-weight: 600;">SP: ₹${(item.price || 0).toFixed(2)}</div>
            </td>
            <td>
                <div style="font-weight: 600; ${status.expiryClass}">
                    ${formatDate(item.exp)}
                </div>
                ${status.daysToExpiry !== null ? `<div class="text-sm">${status.daysToExpiry < 0 ? 'Expired' : status.daysToExpiry + ' days left'}</div>` : ''}
            </td>
            <td>
                <button class="action-btn edit-btn" data-id="${item.id}" title="Edit"><i class="fa-solid fa-pen-to-square"></i></button>
                <button class="action-btn delete-btn" data-id="${item.id}" title="Delete"><i class="fa-solid fa-trash"></i></button>
            </td>
        `;
        tableBody.appendChild(tr);
    }

    function renderGroupRows(group) {
        // Parent Row Data
        const parent = group[0]; // Take representative 
        const totalQty = group.reduce((sum, i) => sum + (i.quantity || 0), 0);
        const groupID = `group-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        // Aggregate Status
        let groupStatusClass = 'dot-green';
        let groupStatusTitle = 'Healthy';
        let hasExpired = group.some(i => getStatus(i).class === 'dot-red');
        let hasLow = group.some(i => getStatus(i).class === 'dot-yellow');

        if (hasExpired) { groupStatusClass = 'dot-red'; groupStatusTitle = 'Product has Expired Batches'; }
        else if (hasLow) { groupStatusClass = 'dot-yellow'; groupStatusTitle = 'Product has Low Stock Batches'; }

        // Parent Row
        const trParent = document.createElement('tr');
        trParent.className = 'parent-row';
        trParent.style.cursor = 'pointer';
        trParent.style.background = 'var(--bg-secondary)';
        trParent.dataset.target = groupID;

        trParent.innerHTML = `
            <td><span class="status-dot ${groupStatusClass}" title="${groupStatusTitle}"></span></td>
            <td>
                <div style="display:flex; gap:10px; align-items:center;">
                    ${parent.image ? `<img src="${parent.image}" style="width:40px; height:40px; border-radius:4px; object-fit:cover;">` : '<div class="image-placeholder"><i class="fa-solid fa-plus"></i></div>'}
                    <div>
                        <div style="font-weight: 700;">${parent.name}</div>
                        <div class="text-sm">${group.length} Variants</div>
                    </div>
                </div>
            </td>
            <td><div class="badge badge-cat">${parent.brand || '-'}</div></td>
            <td colspan="2" style="font-style: italic; color: var(--text-secondary);">
                Click to view ${group.length} batches
            </td>
            <td>
                <div style="font-weight: 700;">${totalQty} Total</div>
            </td>
            <td></td>
             <td>
                <div style="display:flex; gap:0.5rem; justify-content: flex-end;">
                     <button class="action-btn edit-group-btn" title="Edit Product / Add Variant">
                        <i class="fa-solid fa-pen-to-square"></i>
                    </button>
                    <button class="action-btn toggle-btn" title="Expand Details" style="transform: rotate(0deg); transition: transform 0.3s;">
                        <i class="fa-solid fa-chevron-down"></i>
                    </button>
                </div>
            </td>
        `;

        // Toggle Logic
        trParent.addEventListener('click', (e) => {
            // Edit Button Click
            const editBtn = e.target.closest('.edit-group-btn');
            if (editBtn) {
                e.preventDefault();
                e.stopPropagation();
                openModal(parent); // Open modal with representative item
                return;
            }

            // Avoid triggering if clicked on inner button if handled separately
            if (e.target.closest('.edit-btn') || e.target.closest('.delete-btn')) return;

            const isExpanded = trParent.classList.contains('expanded');
            const icon = trParent.querySelector('.toggle-btn');

            document.querySelectorAll(`.${groupID}`).forEach(row => {
                row.style.display = isExpanded ? 'none' : 'table-row';
            });

            if (isExpanded) {
                trParent.classList.remove('expanded');
                icon.style.transform = 'rotate(0deg)';
                trParent.style.background = 'var(--bg-secondary)';
            } else {
                trParent.classList.add('expanded');
                icon.style.transform = 'rotate(180deg)';
                trParent.style.background = 'var(--bg-tertiary)'; // Slightly darker/highlighted
            }
        });

        tableBody.appendChild(trParent);

        // Child Rows
        group.forEach(item => {
            const trChild = document.createElement('tr');
            trChild.className = `child-row ${groupID}`;
            trChild.style.display = 'none';
            trChild.style.background = 'var(--bg-primary)';

            const status = getStatus(item);

            trChild.innerHTML = `
                <td></td>
                <td style="padding-left: 3rem; position:relative;">
                    <div style="position: absolute; left: 1.5rem; top: 50%; width: 10px; height: 1px; background: var(--border-color);"></div>
                    <span style="font-size: 0.9em; color: var(--text-secondary);">${item.size || item.weight || ''} ${item.color || ''}</span>
                </td>
                <td><div class="badge badge-cat">${item.brand || ''}</div></td>
                <td>
                    <div style="font-family: monospace;">${item.batchNumber}</div>
                    <div class="text-sm">MFD: ${formatDate(item.mfd)}</div>
                </td>
                <td>
                    <div style="font-weight: 600;">${item.quantity} ${item.unit}</div>
                    ${item.quantity === 0 ? '<span style="color:var(--c-red-text); font-size:0.75em; font-weight:bold;">Out of Stock</span>' : (item.quantity <= (item.reorderPoint || 10) ? '<span style="color:var(--c-orange-text); font-size:0.75em;">Low Stock</span>' : '')}
                </td>
                <td>
                    ${item.pp ? `<div class="text-sm" style="opacity:0.7;">PP: ₹${item.pp.toFixed(2)}</div>` : ''}
                    <div class="text-sm">CP: ₹${(item.cp || 0).toFixed(2)}</div>
                    <div style="font-weight: 600;">SP: ₹${(item.price || 0).toFixed(2)}</div>
                </td>
                <td>
                    <div style="font-size:0.9em; ${status.expiryClass}">
                        ${formatDate(item.exp)}
                    </div>
                </td>
                <td>
                    <button class="action-btn edit-btn" data-id="${item.id}" title="Edit"><i class="fa-solid fa-pen-to-square"></i></button>
                    <button class="action-btn delete-btn" data-id="${item.id}" title="Delete"><i class="fa-solid fa-trash"></i></button>
                </td>
            `;
            tableBody.appendChild(trChild);
        });
    }

    function getStatus(item) {
        let statusClass = 'dot-green';
        let statusTitle = 'Healthy';
        let expiryClass = '';
        const today = new Date();
        let daysToExpiry = null;

        if (item.exp) {
            const expDate = new Date(item.exp);
            daysToExpiry = Math.ceil((expDate - today) / (1000 * 60 * 60 * 24));
            if (daysToExpiry < 0) {
                statusClass = 'dot-red';
                statusTitle = 'Expired';
                expiryClass = 'color:red;';
            }
            else if (daysToExpiry <= expirySettings[0]) {
                statusClass = 'dot-yellow';
                statusTitle = 'Expiring Soon';
                expiryClass = 'color:orange;';
            }
        }
        if (item.quantity === 0) { statusClass = 'dot-red'; statusTitle = 'Out of Stock'; }
        else if (item.quantity <= (item.reorderPoint || 10) && statusClass !== 'dot-red') {
            statusClass = 'dot-yellow'; statusTitle = 'Low Stock';
        }

        return { class: statusClass, title: statusTitle, daysToExpiry, expiryClass };
    }

    function attachTableListeners() {
        document.querySelectorAll('.edit-btn').forEach(btn =>
            btn.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent row expand
                const id = e.target.closest('button').dataset.id;
                const item = inventory.find(i => i.id === id);
                if (item) openModal(item);
            })
        );

        document.querySelectorAll('.delete-btn').forEach(btn =>
            btn.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent row expand
                const id = e.target.closest('button').dataset.id;
                deleteProduct(id);
            })
        );
    }

    function exportToCSV() {
        const headers = ['ID', 'Batch', 'SKU', 'Name', 'Brand', 'Category', 'Attributes', 'Quantity', 'Unit', 'PP', 'CP', 'SP', 'MFD', 'EXP'];
        const rows = inventory.map(i => {
            const attr = (i.size || i.weight || '') + (i.color ? ' - ' + i.color : '');
            return [
                i.id, i.batchNumber, i.sku || '', i.name, i.brand, i.category, attr, i.quantity, i.unit, i.pp || 0, i.cp || 0, i.price || 0, i.mfd || '-', i.exp || '-'
            ];
        });

        let csvContent = "data:text/csv;charset=utf-8,"
            + headers.join(",") + "\n"
            + rows.map(e => e.join(",")).join("\n");

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "inventory_export.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    // --- 9. Helper: Sidebar & Theme (Standard) ---
    function initTheme() {
        const savedTheme = localStorage.getItem('theme') || 'light';
        document.body.setAttribute('data-theme', savedTheme);
        updateThemeIcon(savedTheme);
    }

    function updateThemeIcon(theme) {
        const icon = themeToggle.querySelector('i');
        if (theme === 'dark') {
            icon.classList.remove('fa-moon');
            icon.classList.add('fa-sun');
        } else {
            icon.classList.remove('fa-sun');
            icon.classList.add('fa-moon');
        }
    }

    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            const currentTheme = document.body.getAttribute('data-theme');
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            document.body.setAttribute('data-theme', newTheme);
            localStorage.setItem('theme', newTheme);
            updateThemeIcon(newTheme);
        });
    }

    // --- Settings Modal Logic ---
    const settingsBtn = document.getElementById('settings-btn');
    const settingsModal = document.getElementById('settings-modal');
    const btnSaveSettings = document.getElementById('btn-save-settings');
    const inputExpiryAlert = document.getElementById('setting-expiry-alert');
    const inputExpiryWarning = document.getElementById('setting-expiry-warning');
    const inputExpiryCritical = document.getElementById('setting-expiry-critical');

    if (settingsBtn) {
        settingsBtn.addEventListener('click', () => {
            inputExpiryAlert.value = expirySettings[0];
            inputExpiryWarning.value = expirySettings[1];
            inputExpiryCritical.value = expirySettings[2];
            settingsModal.style.display = 'flex';
            settingsModal.classList.add('show');
        });
    }

    if (btnSaveSettings) {
        btnSaveSettings.addEventListener('click', () => {
            expirySettings = [
                parseInt(inputExpiryAlert.value) || 30,
                parseInt(inputExpiryWarning.value) || 14,
                parseInt(inputExpiryCritical.value) || 7
            ];
            localStorage.setItem('expirySettings', JSON.stringify(expirySettings));
            settingsModal.style.display = 'none';
            alert('Settings Saved!');
            renderTable(); // Re-render to update colored dots
            calculateDashboardStats();
        });
    }



    function setupSidebar() {
        const sidebarToggle = document.getElementById('sidebar-toggle');
        const container = document.querySelector('.layout-container');
        const mobileBtn = document.getElementById('mobile-sidebar-toggle');

        // Desktop Toggle
        if (sidebarToggle) {
            // Remove any existing listeners by cloning (optional but safer not to stack)
            const newToggle = sidebarToggle.cloneNode(true);
            sidebarToggle.parentNode.replaceChild(newToggle, sidebarToggle);

            newToggle.addEventListener('click', (e) => {
                e.stopPropagation();
                if (window.innerWidth > 768) {
                    if (container) container.classList.toggle('sidebar-collapsed');
                } else {
                    // On mobile, if this button is visible (it shouldn't be), just toggle active
                    sidebar.classList.toggle('active');
                }
            });
        }

        // Mobile Header Toggle
        if (mobileBtn) {
            // Clone to remove old listeners
            const newMobileBtn = mobileBtn.cloneNode(true);
            mobileBtn.parentNode.replaceChild(newMobileBtn, mobileBtn);

            newMobileBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                sidebar.classList.toggle('active');
            });
        }

        // Close when clicking outside on mobile
        document.addEventListener('click', (e) => {
            if (window.innerWidth <= 768 &&
                sidebar.classList.contains('active') &&
                !sidebar.contains(e.target) &&
                e.target.id !== 'mobile-sidebar-toggle') {
                sidebar.classList.remove('active');
            }
        });
    }



    setupSidebar();
});
