document.addEventListener('DOMContentLoaded', () => {
    // --- 0. Authentication & Context ---
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    const currentEmployee = JSON.parse(localStorage.getItem('currentEmployee'));

    // Security: Derive role strictly from session data. Ignore URL overrides to prevent privilege escalation.
    const role = (currentUser ? 'owner' : (currentEmployee ? currentEmployee.role : null));
    const ownerId = (currentUser && currentUser.ownerId) || (currentEmployee && currentEmployee.ownerId);

    // If no context, redirect to login
    if (!role || !ownerId) {
        window.location.href = '../Authentication/login.html';
        return;
    }

    // Set User Profile Name dynamically
    const nameSpans = document.querySelectorAll('.user-name');
    nameSpans.forEach(span => {
        if (currentUser) span.textContent = currentUser.ownerName || currentUser.shopName || 'Owner';
        else if (currentEmployee) span.textContent = currentEmployee.name || 'Manager';
    });

    // Set dynamic Initial Icon
    const userImage = document.querySelector('.user-profile img');
    if (userImage) {
        let nameToUse = 'O';
        if (currentUser) nameToUse = currentUser.ownerName || 'O';
        else if (currentEmployee) nameToUse = currentEmployee.name || 'M';
        userImage.src = `https://ui-avatars.com/api/?name=${nameToUse}&background=F47C25&color=fff`;
    }

    if (role === 'staff') {

        // Hide Restricted Actions
        const btnAdd = document.getElementById('add-product-btn');
        if (btnAdd) btnAdd.style.display = 'none';

        // Hide Edit/Delete functionality via CSS injection
        const style = document.createElement('style');
        style.innerHTML = `
            .edit-btn, .delete-btn, .edit-group-btn, .import-btn { display: none !important; }
        `;
        document.head.appendChild(style);
    } else {
        // Ensure buttons are visible for Non-Staff (Owner, Manager, Inventory Manager)
        const btnAdd = document.getElementById('add-product-btn');
        if (btnAdd) btnAdd.style.display = 'flex';
        const btnImport = document.getElementById('import-btn');
        if (btnImport) btnImport.style.display = 'flex';
    }

    // --- 1. State & Constants ---
    // Standard Global Storage with Immediate Tenant Filtering
    const GLOBAL_KEY = 'quadstock_inventory';
    const allInventory = JSON.parse(localStorage.getItem(GLOBAL_KEY)) || [];
    let inventory = allInventory.filter(item => item.ownerId === ownerId);

    let isEditing = false;
    let currentEditId = null;
    let cameraStream = null;
    let productToDeleteId = null;
    const deleteModal = document.getElementById('delete-modal');
    const btnConfirmDelete = document.getElementById('confirm-delete-btn');
    const btnCloseDeleteModal = document.querySelectorAll('.close-delete-modal');

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

    let CATEGORIES = JSON.parse(localStorage.getItem(`categories_${ownerId}`)) || DEFAULT_CATEGORIES;
    let BRANDS = JSON.parse(localStorage.getItem(`brands_${ownerId}`)) || DEFAULT_BRANDS;
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

    const inputBarcode = document.getElementById('product-barcode');
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

    if (inputPP) inputPP.addEventListener('input', calculateMargin);
    if (inputCP) inputCP.addEventListener('input', calculateMargin);
    if (inputSP) inputSP.addEventListener('input', calculateMargin);








    // --- 3. Initialization ---
    initTheme();
    loadSidebar();
    setupSidebar();
    populateSelects();
    updateBrandList();
    calculateDashboardStats(); // Run once on load
    renderTable(); // Initial Render

    // --- 4. Event Listeners ---
    // Safe Event Listener Helper
    const safeListener = (el, event, handler) => {
        if (el) el.addEventListener(event, handler);
    };

    // Debounce Helper
    const debounce = (func, delay) => {
        let timeout;
        return (...args) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => func(...args), delay);
        };
    };

    // Input Events for Filters
    safeListener(searchInput, 'input', debounce((e) => {
        filters.search = e.target.value.toLowerCase();
        renderTable();
    }, 300));
    safeListener(filterCategory, 'change', (e) => { filters.category = e.target.value; renderTable(); });
    safeListener(filterBrand, 'change', (e) => { filters.brand = e.target.value; renderTable(); });
    safeListener(filterStock, 'change', (e) => { filters.stock = e.target.value; renderTable(); });
    safeListener(filterExpiry, 'change', (e) => { filters.expiry = e.target.value; renderTable(); });

    // View Toggle
    const btnToggleView = document.getElementById('toggle-view-btn');
    if (btnToggleView) {
        btnToggleView.addEventListener('click', () => {
            document.body.classList.toggle('full-table-view');
            const icon = btnToggleView.querySelector('i');
            if (document.body.classList.contains('full-table-view')) {
                icon.classList.replace('fa-expand', 'fa-compress');
                btnToggleView.title = "Exit Full View";
            } else {
                icon.classList.replace('fa-compress', 'fa-expand');
                btnToggleView.title = "Maximize Table";
            }
        });
    }

    // Modal Events
    safeListener(btnAddProduct, 'click', () => openModal());
    if (btnCloseModal) btnCloseModal.forEach(btn => btn.addEventListener('click', closeModal));
    // window.addEventListener('click', (e) => { if (e.target === modal) closeModal(); }); // Disabled to prevent accidental closure on window focus

    // Form Logic
    safeListener(productForm, 'submit', handleFormSubmit);
    safeListener(btnGenBatch, 'click', () => { if (inputBatch) inputBatch.value = generateBatchNumber(); });

    // Handle Hardware Barcode Scan
    safeListener(inputBarcode, 'change', (e) => {
        handleScan(e.target.value.trim());
    });


    // Split Batch
    safeListener(btnSplitBatch, 'click', () => {
        if (productForm && productForm.checkValidity()) {
            saveProduct(false);

            // Essential: Reset editing state so next save creates new item
            isEditing = false;
            currentEditId = null;

            // Clear Batch & Qty fields
            if (inputBatch) inputBatch.value = generateBatchNumber();
            if (inputQty) inputQty.value = '';

            // Reset fields based on type
            if (inputType && inputType.value === 'Clothes') {
                if (inputSize) inputSize.value = '';
                if (inputColor) inputColor.value = '';
            } else {
                if (inputExp) inputExp.value = '';
                if (inputMfd) inputMfd.value = '';
                if (expiryHint) {
                    expiryHint.textContent = 'Select date to see alert status';
                    expiryHint.style.color = 'var(--text-secondary)';
                }
            }

            // UI Feedback
            const originalText = btnSplitBatch.innerHTML;
            btnSplitBatch.innerHTML = '<i class="fa-solid fa-check"></i> Added! Next...';
            setTimeout(() => { btnSplitBatch.innerHTML = originalText; }, 1000);
        } else if (productForm) {
            productForm.reportValidity();
        }
    });

    // Dynamic Form Updates (Category Change)
    safeListener(inputType, 'change', (e) => {
        const type = e.target.value;
        populateSubCategories(type);
        toggleAttributes(type);
        if (inputCategory) inputCategory.value = ''; // Clear previous sub-category
    });

    // Margin Calculator (Listeners already attached above)

    safeListener(inputExp, 'change', updateExpiryHint);
    safeListener(btnExport, 'click', exportToCSV);

    // --- Image Handling Listeners ---

    // 1. File Upload with Compression
    safeListener(inputImageFile, 'change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const MAX_WIDTH = 300;
                    const MAX_HEIGHT = 300;
                    let width = img.width;
                    let height = img.height;

                    if (width > height) {
                        if (width > MAX_WIDTH) {
                            height *= MAX_WIDTH / width;
                            width = MAX_WIDTH;
                        }
                    } else {
                        if (height > MAX_HEIGHT) {
                            width *= MAX_HEIGHT / height;
                            height = MAX_HEIGHT;
                        }
                    }
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);

                    // Compress to JPEG with 0.5 quality
                    const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.5);
                    showPreview(compressedDataUrl);
                    if (inputImageURL) inputImageURL.value = ''; // Clear URL if file selected
                };
                img.src = e.target.result;
            };
            reader.readAsDataURL(file);
        }
    });

    // 2. Camera Start
    safeListener(btnCamera, 'click', async () => {
        try {
            cameraStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
            if (videoEl) videoEl.srcObject = cameraStream;
            if (cameraInterface) cameraInterface.style.display = 'block';
            if (previewInterface) previewInterface.style.display = 'none';
            // Hide other inputs while camera is active
            const controls = document.querySelector('.image-controls');
            if (controls) controls.style.display = 'none';
        } catch (err) {
            alert('Could not access camera: ' + err.message);
        }
    });

    // 3. Capture Photo
    safeListener(btnCapture, 'click', () => {
        const context = canvasEl.getContext('2d');
        canvasEl.width = videoEl.videoWidth;
        canvasEl.height = videoEl.videoHeight;
        context.drawImage(videoEl, 0, 0, canvasEl.width, canvasEl.height);

        // Optimization: Use JPEG with 0.5 quality to prevent LocalStorage overflow
        const dataURL = canvasEl.toDataURL('image/jpeg', 0.5);
        showPreview(dataURL);
        stopCamera();
    });


    // 4. Stop Camera
    safeListener(btnStopCamera, 'click', stopCamera);

    // 5. Clear Image
    safeListener(btnClearImage, 'click', () => {
        if (imgPreview) imgPreview.src = '';
        if (previewInterface) previewInterface.style.display = 'none';
        if (inputImageFile) inputImageFile.value = '';
        if (inputImageURL) inputImageURL.value = '';
        const controls = document.querySelector('.image-controls');
        if (controls) controls.style.display = 'flex';
    });

    // 6. URL Input (Show preview if valid URL)
    safeListener(inputImageURL, 'change', (e) => {
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

    function handleScan(scannedCode) {
        if (!scannedCode) return;

        // 1. Get Current Owner Context
        const ownerId = (currentUser && currentUser.ownerId) || (currentEmployee && currentEmployee.ownerId);

        if (!ownerId) {
            QuadModals.alert("Configuration Error", "Owner ID not found. Please log in again.", "error");
            return;
        }

        // Multi-Tenant Aware Matching: 
        // 1. Precise Match (Batch Number) - inventory is already filtered by ownerId
        let match = inventory.find(p => p.batchNumber === scannedCode);

        // 2. Barcode Match (Fallback to latest batch update for this barcode)
        if (!match) {
            match = [...inventory].reverse().find(p => p.barcode === scannedCode);
        }

        if (match) {
            autoFillForm(match);
            QuadModals.showToast("Product Found: " + match.name + (match.batchNumber === scannedCode ? " (Exact Batch)" : ""), "success");
        } else {
            QuadModals.showToast("New Item Detected in this Shop", "info");
            // We keep the barcode in the field so it save with the new product
            inputBarcode.value = scannedCode;
            inputBatch.value = ''; // Reset batch for new entry
        }
    }

    function autoFillForm(product) {
        if (inputName) inputName.value = product.name || '';
        if (inputBrand) inputBrand.value = product.brand || '';
        if (inputType) {
            inputType.value = product.type || 'Kirana';
            populateSubCategories(product.type);
            toggleAttributes(product.type);
        }
        if (inputCategory) inputCategory.value = product.category || '';
        if (inputWeight) inputWeight.value = product.weight || '';
        if (inputDesc) inputDesc.value = product.description || '';

        // Populate Price data (Basic)
        if (inputPP) inputPP.value = product.pp || '';
        if (inputCP) inputCP.value = product.cp || '';
        if (inputSP) inputSP.value = product.price || '';

        // Architecture Fix: Skip Batch-specific fields (Batch#, MFD, EXP) to allow user to enter new batch info
        if (inputReorder) inputReorder.value = product.reorderPoint || 10;
        if (product.image) showPreview(product.image);

        calculateMargin();
    }

    function calculateMargin() {

        const pp = parseFloat(inputPP.value) || 0;
        const cp = parseFloat(inputCP.value) || 0;
        const sp = parseFloat(inputSP.value) || 0;

        // Use PP as the cost basis (since CP is treated as MRP)
        const effectiveCost = pp;

        if (sp > 0) {
            const profit = sp - effectiveCost;
            // Margin = (Profit / Selling Price) * 100
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
        today.setHours(0, 0, 0, 0); // Reset time to midnight for accurate day calculation
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

            inputBarcode.value = item.barcode || '';
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
            inputBarcode.value = '';
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

        // Data-Level RBAC: Enforce critical permission checks inside the action function
        if (role !== 'owner' && role !== 'manager' && role !== 'inventory_manager') {
            QuadModals.alert("Access Denied", "Your role does not have permission to modify inventory data.", "error");
            return;
        }

        saveProduct(true);
    }


    function saveProduct(closeAfterSave = true) {
        if (role !== 'owner' && role !== 'manager' && role !== 'inventory_manager') {
            QuadModals.alert("Access Denied", "Authorization failed for this operation.", "error");
            return;
        }

        // Handle Custom Sub-Category
        const currentType = inputType.value;
        const newCat = inputCategory.value;
        if (currentType && newCat) {
            const exists = CATEGORIES[currentType].some(c => c.toLowerCase() === newCat.toLowerCase());
            if (!exists) {
                CATEGORIES[currentType].push(newCat);
                localStorage.setItem(`categories_${ownerId}`, JSON.stringify(CATEGORIES));
                populateSubCategories(currentType);
            }
        }

        // Handle Custom Brand
        const newBrand = inputBrand.value;
        if (newBrand) {
            const exists = BRANDS.some(b => b.toLowerCase() === newBrand.toLowerCase());
            if (!exists) {
                BRANDS.push(newBrand);
                localStorage.setItem(`brands_${ownerId}`, JSON.stringify(BRANDS));
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
            barcode: inputBarcode.value,
            ownerId: (currentUser && currentUser.ownerId) || (currentEmployee && currentEmployee.ownerId),

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

        // Persist with Global Hub Pattern
        try {
            const currentGlobal = JSON.parse(localStorage.getItem(GLOBAL_KEY)) || [];
            const otherOwners = currentGlobal.filter(item => item.ownerId !== ownerId);
            const updatedGlobal = [...otherOwners, ...inventory];
            localStorage.setItem(GLOBAL_KEY, JSON.stringify(updatedGlobal));
        } catch (e) {
            QuadModals.alert("Storage Full", "Could not save. Please use smaller images or clear old data.", "error");
            console.error('LocalStorage Hub Save Error:', e);
        }


        // Update UI
        calculateDashboardStats();
        renderTable();

        // Scroll to top to show the newly added item (since we use unshift)
        if (!isEditing) {
            const tableCard = document.querySelector('.table-card');
            // 1. Bring the table section into view (in case user was scrolled away)
            if (tableCard) {
                // Use a small timeout to let the modal close animation finish/start
                setTimeout(() => {
                    tableCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }, 300);
            }

            // 2. Reset internal table scroll to show the first item
            const tableContainer = document.querySelector('.table-responsive');
            if (tableContainer) {
                tableContainer.scrollTop = 0;
            }
        }

        if (closeAfterSave) closeModal();
    }

    function deleteProduct(id) {
        // Role Security
        if (role === 'staff') {
            QuadModals.alert("Access Denied", "Staff members cannot delete products.", "error");
            return;
        }

        productToDeleteId = id;
        if (deleteModal) {
            deleteModal.classList.add('show');
            deleteModal.style.display = 'flex';
        } else {
            // Fallback if modal not in DOM for some reason
            if (confirm('Delete this batch?')) {
                executeDeletion(id);
            }
        }
    }


    function executeDeletion(id) {
        inventory = inventory.filter(i => i.id !== id);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(inventory));
        calculateDashboardStats();
        renderTable();
    }


    // Delete Modal Listeners
    if (btnConfirmDelete) {
        btnConfirmDelete.addEventListener('click', () => {
            if (productToDeleteId) {
                executeDeletion(productToDeleteId);
                if (deleteModal) {
                    deleteModal.classList.remove('show');
                    setTimeout(() => { deleteModal.style.display = 'none'; }, 300);
                }
                productToDeleteId = null;
            }
        });
    }

    if (btnCloseDeleteModal) {
        btnCloseDeleteModal.forEach(btn => {
            btn.addEventListener('click', () => {
                if (deleteModal) {
                    deleteModal.classList.remove('show');
                    setTimeout(() => { deleteModal.style.display = 'none'; }, 300);
                    productToDeleteId = null;
                }
            });
        });
    }

    // --- 7. Dashboard Logic ---

    function calculateDashboardStats() {
        let totalVal = 0;
        let expiringCount = 0;
        let lowStockCount = 0;
        let outOfStockCount = 0;
        const today = new Date();
        today.setHours(0, 0, 0, 0);

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



        // Use helper to parse current value to animate from previous value
        // Note: For simplicity in stateless update, we animate from 0 or we could store prev values.
        // Requested: load the number from 0 to actual value.
        animateValue(valTotalValue, 0, totalVal, 1000, formatCurrency);
        animateValue(valExpiringSoon, 0, expiringCount, 800);
        animateValue(valLowStock, 0, lowStockCount, 800);

        const valOutOfStock = document.getElementById('val-out-of-stock');
        if (valOutOfStock) animateValue(valOutOfStock, 0, outOfStockCount, 800);
    }

    function animateValue(obj, start, end, duration, formatFn = null) {
        if (!obj) return;
        let startTimestamp = null;
        const step = (timestamp) => {
            if (!startTimestamp) startTimestamp = timestamp;
            const progress = Math.min((timestamp - startTimestamp) / duration, 1);
            // Ease-out effect
            const easeProgress = 1 - Math.pow(1 - progress, 3);
            const currentVal = Math.floor(progress * (end - start) + start);

            // For currency or float, we might want smoothness, but let's stick to integers for counts.
            // For totalVal (float), we should animate float.
            let displayVal = currentVal;
            if (formatFn) {
                // For currency, animate the raw number then format
                const currentFloat = easeProgress * (end - start) + start;
                obj.textContent = formatFn(currentFloat);
            } else {
                obj.textContent = currentVal;
            }

            if (progress < 1) {
                window.requestAnimationFrame(step);
            } else {
                // Ensure final value is accurate
                obj.textContent = formatFn ? formatFn(end) : end;
            }
        };
        window.requestAnimationFrame(step);
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
                today.setHours(0, 0, 0, 0);
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
                <div style="display:flex; flex-direction:column; gap:4px;">
                    ${item.pp ? `<div style="font-weight:600; color:var(--text-primary);">PP: ₹${item.pp.toFixed(2)}</div>` : ''}
                    <div style="font-weight:600; color:var(--text-primary);">CP: ₹${(item.cp || 0).toFixed(2)}</div>
                    <div style="font-weight:700; color:var(--c-green-text); font-size:1.05em;">SP: ₹${(item.price || 0).toFixed(2)}</div>
                </div>
            </td>
            <td>
                <div style="font-weight: 600; ${status.expiryClass}">
                    ${formatDate(item.exp)}
                </div>
                ${status.daysToExpiry !== null ? `<div class="text-sm">${status.daysToExpiry < 0 ? 'Expired' : status.daysToExpiry + ' days left'}</div>` : ''}
            </td>
            <td>
                ${(item.quantity <= (item.reorderPoint || 10)) ? `
                    <button class="action-btn order-btn" data-id="${item.id}" title="Quick Order (WhatsApp)" 
                            style="color: #25D366; background: rgba(37, 211, 102, 0.1);">
                        <i class="fa-brands fa-whatsapp"></i>
                    </button>
                ` : ''}
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
                    <div style="display:flex; flex-direction:column; gap:4px;">
                        ${item.pp ? `<div style="font-weight:600; color:var(--text-primary);">PP: ₹${item.pp.toFixed(2)}</div>` : ''}
                        <div style="font-weight:600; color:var(--text-primary);">CP: ₹${(item.cp || 0).toFixed(2)}</div>
                        <div style="font-weight:700; color:var(--c-green-text); font-size:1.05em;">SP: ₹${(item.price || 0).toFixed(2)}</div>
                    </div>
                </td>
                <td>
                    <div style="font-size:0.9em; ${status.expiryClass}">
                        ${formatDate(item.exp)}
                    </div>
                </td>
                <td>
                    ${(item.quantity <= (item.reorderPoint || 10)) ? `
                        <button class="action-btn order-btn" data-id="${item.id}" title="Quick Order (WhatsApp)" 
                                style="color: #25D366; background: rgba(37, 211, 102, 0.1);">
                            <i class="fa-brands fa-whatsapp"></i>
                        </button>
                    ` : ''}
                    <button class="action-btn edit-btn" data-id="${item.id}" title="Edit"><i class="fa-solid fa-pen-to-square"></i></button>
                    <button class="action-btn delete-btn" data-id="${item.id}" title="Delete"><i class="fa-solid fa-trash"></i></button>
                </td>
            `;
            tableBody.appendChild(trChild);
        });
    }

    function loadSidebar() {
        const urlParams = new URLSearchParams(window.location.search);
        let role = urlParams.get('role');
        const sidebarTarget = document.getElementById('sidebar-target');
        const mainContainer = document.getElementById('main-container');
        const dashboardCss = document.getElementById('dashboard-css');

        // Also check if logged in as employee and has inventory_manager role
        if (!role) {
            const currentEmployee = JSON.parse(localStorage.getItem('currentEmployee'));
            if (currentEmployee && currentEmployee.role === 'inventory_manager') role = 'inventory_manager';
        }

        if (role === 'manager') {
            if (dashboardCss) dashboardCss.href = '../Managerdashboard/manager_dashboard.css';
            if (mainContainer) mainContainer.className = 'layout-container';

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
                        <a href="../Query/query.html" class="nav-item">
                            <i class="fa-solid fa-clipboard-question"></i>
                            <span>Query</span>
                        </a>
                    </nav>
                </div>
                <div class="nav-section">
                    <h3 class="section-title">Stock & Staff</h3>
                    <nav class="nav-menu">
                        <a href="inventory.html" class="nav-item active">
                            <i class="fa-solid fa-boxes-stacked"></i>
                            <span>Inventory</span>
                        </a>
                         <a href="../Employees/employees.html" class="nav-item">
                            <i class="fa-solid fa-users"></i>
                            <span>Employees</span>
                        </a>
                        <a href="../smartexpiry/smartexpiry.html" class="nav-item">
                            <i class="fa-solid fa-hourglass-end"></i>
                            <span>Smart Expiry</span>
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
                        <a href="../landing/landing.html" class="nav-item" title="Logout">
                            <i class="fa-solid fa-right-from-bracket"></i>
                            <span>Logout</span>
                        </a>
                    </nav>
                </div>
            `;

            // Topbar
            const topbarTarget = document.getElementById('topbar-target');
            if (topbarTarget) {
                topbarTarget.innerHTML = `
                <div id="digital-clock" class="digital-clock-container">00:00:00 AM</div>
                <div class="user-actions">
                    <button class="theme-toggle-btn" id="theme-toggle" style="background: var(--bg-white); border: none; padding: 0.5rem; border-radius: 50%; cursor: pointer; color: var(--text-muted); width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
                        <i class="fa-solid fa-moon"></i>
                    </button>
                    <div class="user-profile" style="background: var(--bg-white); padding: 0.5rem 1rem; border-radius: 3rem; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
                        <div class="user-info">
                            <h5>Manager</h5>
                            <p>Shift Manager</p>
                        </div>
                        <img src="https://ui-avatars.com/api/?name=Ma&background=003f3f&color=fff" alt="Avatar" class="user-avatar" style="width: 40px; height: 40px;">
                    </div>
                </div>
            `;
            }

        } else if (role === 'inventory_manager') {
            // Inventory Manager Sidebar (Restricted)
            if (dashboardCss) dashboardCss.href = '../Managerdashboard/manager_dashboard.css'; // Use unified dashboard css for layout
            if (mainContainer) mainContainer.className = 'layout-container';

            sidebarTarget.innerHTML = `
                 <div class="brand">
                    <button id="sidebar-toggle" class="sidebar-toggle">
                        <i class="fa-solid fa-bars"></i>
                    </button>
                    <h2 class="brand-text">QuadStock</h2>
                </div>
                
                 <div class="nav-section">
                    <h3 class="section-title">Stock Management</h3>
                    <nav class="nav-menu">
                         <a href="inventory.html" class="nav-item active">
                            <i class="fa-solid fa-boxes-stacked"></i>
                            <span>Inventory</span>
                        </a>
                    </nav>
                </div>

                 <div class="nav-section">
                    <h3 class="section-title">System</h3>
                    <nav class="nav-menu">
                         <a href="../Settings/settings.html" class="nav-item">
                            <i class="fa-solid fa-gear"></i>
                            <span>Settings</span>
                        </a>
                        <a href="../landing/landing.html" class="nav-item" title="Logout">
                            <i class="fa-solid fa-right-from-bracket"></i>
                            <span>Logout</span>
                        </a>
                    </nav>
                </div>
            `;
            // Topbar update for inventory manager...
            const topbarTarget = document.getElementById('topbar-target');
            if (topbarTarget) {
                topbarTarget.innerHTML = `
                <div id="digital-clock" class="digital-clock-container">00:00:00 AM</div>
                <div class="user-actions">
                    <button class="theme-toggle-btn" id="theme-toggle">
                        <i class="fa-solid fa-moon"></i>
                    </button>
                    <div class="user-profile">
                        <div class="user-info">
                            <h5>Inv. Manager</h5>
                        </div>
                         <img src="https://ui-avatars.com/api/?name=IM&background=003f3f&color=fff" alt="Avatar" class="user-avatar" style="width: 40px; height: 40px;">
                    </div>
                </div>
            `;
            }

        } else {
            // Owner Sidebar
            sidebarTarget.innerHTML = `
                <div class="brand">
                    <button id="sidebar-toggle" class="sidebar-toggle">
                        <i class="fa-solid fa-bars"></i>
                    </button>
                    <h2 class="brand-text">QuadStock</h2>
                </div>
                <nav class="sidebar-menu">
                    <a href="../Ownerdashboard/dashboard.html" class="menu-item" title="Dashboard">
                        <i class="fa-solid fa-house"></i>
                        <span>Dashboard</span>
                    </a>
                    <a href="../Analytics/analytics.html" class="menu-item" title="Analytics">
                        <i class="fa-solid fa-chart-simple"></i>
                        <span>Analytics</span>
                    </a>
                    <a href="../Query/query.html" class="menu-item" title="Query">
                        <i class="fa-solid fa-clipboard-question"></i>
                        <span>Query</span>
                    </a>
                    <a href="inventory.html" class="menu-item active" title="Inventory">
                        <i class="fa-solid fa-boxes-stacked"></i>
                        <span>Inventory</span>
                    </a>
                     <a href="../Employees/employees.html" class="menu-item" title="Employees">
                        <i class="fa-solid fa-users"></i>
                        <span>Employees</span>
                    </a>
                    <a href="../smartexpiry/smartexpiry.html" class="menu-item" title="Smart Expiry">
                        <i class="fa-solid fa-hourglass-end"></i>
                        <span>Smart Expiry</span>
                    </a>

                    <a href="../Complain/complain.html" class="menu-item" title="Complain">
                        <i class="fa-solid fa-triangle-exclamation"></i>
                        <span>Complain</span>
                    </a>
                    <a href="../Udhaar/udhaar.html" class="menu-item" title="Pending Payments">
                        <i class="fa-solid fa-indian-rupee-sign"></i>
                        <span>Udhaar/Pending</span>
                    </a>
                    <a href="../Settings/settings.html" class="menu-item" title="Settings">
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
        }

        // Attach toggle logic again since we overwrote HTML
        const toggle = document.getElementById('sidebar-toggle');
        const container = document.querySelector('.dashboard-container') || document.querySelector('.layout-container');
        if (toggle && container) {
            toggle.addEventListener('click', () => {
                const isCollapsed = container.classList.toggle('sidebar-collapsed');
            });
        }
    }
    function getStatus(item) {
        let statusClass = 'dot-green';
        let statusTitle = 'Healthy';
        let expiryClass = '';
        const today = new Date();
        today.setHours(0, 0, 0, 0);
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

        document.querySelectorAll('.order-btn').forEach(btn =>
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const id = e.target.closest('button').dataset.id;
                const item = inventory.find(i => i.id === id);
                if (item) {
                    const message = `Hello, I need to order more of ${item.name} (${item.brand || 'No Brand'}). Current stock is ${item.quantity} ${item.unit}.`;
                    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
                    window.open(whatsappUrl, '_blank');
                }
            })
        );
    }

    function exportToCSV() {
        const headers = ['S. No.', 'Batch', 'SKU', 'Name', 'Brand', 'Category', 'Attributes', 'Quantity', 'Unit', 'PP', 'CP', 'SP', 'MFD', 'EXP'];
        const rows = inventory.map((i, index) => {
            const attr = (i.size || i.weight || '') + (i.color ? ' - ' + i.color : '');
            const mfd = i.mfd ? new Date(i.mfd).toLocaleDateString('en-GB') : '-';
            const exp = i.exp ? new Date(i.exp).toLocaleDateString('en-GB') : '-';
            return [
                index + 1,
                i.batchNumber,
                i.sku || '-',
                `"${i.name.replace(/"/g, '""')}"`,
                i.brand || '-',
                i.category || '-',
                attr || '-',
                i.quantity,
                i.unit,
                i.pp || 0,
                i.cp || 0,
                i.price || 0,
                mfd,
                exp
            ];
        });

        let csvContent = "data:text/csv;charset=utf-8,"
            + headers.join(",") + "\n"
            + rows.map(e => e.join(",")).join("\n");

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `QuadStock_Inventory_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    // --- 12. CSV Import (Fix Task 1 - New Feature) ---
    const btnImport = document.getElementById('import-btn');
    const inputImport = document.getElementById('csv-import');

    if (btnImport) {
        btnImport.addEventListener('click', () => inputImport.click());
    }

    if (inputImport) {
        inputImport.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (event) => {
                const text = event.target.result;
                processCSV(text);
            };
            reader.readAsText(file);
            inputImport.value = ''; // Reset for next time
        });
    }

    function processCSV(text) {
        if (role === 'staff') {
            QuadModals.alert("Access Denied", "Staff members cannot import data.", "error");
            return;
        }

        const lines = text.split('\n').filter(line => line.trim().length > 0);
        if (lines.length < 2) {
            QuadModals.alert("Import Error", "CSV file is empty or missing headers.", "error");
            return;
        }

        // Simple CSV Parser (doesn't handle all edge cases but good for standard export)
        const parseLine = (line) => {
            const result = [];
            let current = '';
            let inQuotes = false;
            for (let i = 0; i < line.length; i++) {
                const char = line[i];
                if (char === '"' && line[i + 1] === '"') {
                    current += '"'; i++;
                } else if (char === '"') {
                    inQuotes = !inQuotes;
                } else if (char === ',' && !inQuotes) {
                    result.push(current.trim());
                    current = '';
                } else {
                    current += char;
                }
            }
            result.push(current.trim());
            return result;
        };

        const headers = parseLine(lines[0]);
        const newItems = [];

        for (let i = 1; i < lines.length; i++) {
            const data = parseLine(lines[i]);
            if (data.length < 5) continue; // Skip malformed lines

            // Basic Mapping (Assumes export format headers)
            // ['S. No.', 'Batch', 'SKU', 'Name', 'Brand', 'Category', 'Attributes', 'Quantity', 'Unit', 'PP', 'CP', 'SP', 'MFD', 'EXP']
            const item = {
                id: Date.now().toString() + '-' + i,
                batchNumber: data[1] || 'BATCH-' + i,
                sku: data[2] || '',
                name: data[3] || 'Imported Product',
                brand: data[4] || '',
                category: data[5] || 'General',
                quantity: parseInt(data[7]) || 0,
                unit: data[8] || 'pcs',
                pp: parseFloat(data[9]) || 0,
                cp: parseFloat(data[10]) || 0,
                price: parseFloat(data[11]) || 0,
                mfd: null,
                exp: null,
                type: 'Kirana' // Default
            };
            newItems.push(item);
        }

        if (newItems.length > 0) {
            inventory = [...inventory, ...newItems];
            localStorage.setItem(STORAGE_KEY, JSON.stringify(inventory));
            calculateDashboardStats();
            renderTable();
            QuadModals.alert("Success", `Imported ${newItems.length} products successfully!`, "success");
        }
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



    // --- 11. Barcode Scanner (Improved) ---
    const btnScan = document.getElementById('btn-scan-barcode');
    const scannerContainer = document.getElementById('barcode-reader');
    let html5QrCode = null;

    if (btnScan) {
        btnScan.addEventListener('click', async () => {
            if (!html5QrCode) {
                // Ensure photo camera is stopped if running
                if (cameraStream) stopCamera();

                scannerContainer.style.display = 'block';
                html5QrCode = new Html5Qrcode("barcode-reader");

                // Responsive QR Box for 1D/2D Barcodes
                const qrboxFunction = (viewfinderWidth, viewfinderHeight) => {
                    let minEdgePercentage = 0.7; // 70%
                    let minEdgeSize = Math.min(viewfinderWidth, viewfinderHeight);
                    let qrboxSize = Math.floor(minEdgeSize * minEdgePercentage);
                    return {
                        width: Math.max(250, qrboxSize),
                        height: Math.max(150, Math.floor(qrboxSize / 1.5))
                    };
                };

                const config = {
                    fps: 10,
                    qrbox: qrboxFunction,
                    aspectRatio: 1.0
                };

                btnScan.innerHTML = '<i class="fa-solid fa-xmark"></i>';
                btnScan.classList.add('active-scanning');
                btnScan.style.background = 'var(--c-red-text)';

                html5QrCode.start(
                    { facingMode: "environment" },
                    config,
                    (decodedText) => {
                        // Success
                        if (inputBarcode) inputBarcode.value = decodedText;
                        handleScan(decodedText);
                        stopScanner();
                    },
                    (errorMessage) => {
                        // Parse error, usually can be ignored
                    }
                ).catch(err => {
                    console.error("Scanner Error:", err);
                    scannerContainer.style.display = 'none';
                    if (window.QuadModals) {
                        QuadModals.alert("Scanner Error", "Could not start camera. Please ensure permissions are granted.", "error");
                    } else {
                        alert("Camera Error: Please ensure permissions are granted.");
                    }
                    resetScannerUI();
                    html5QrCode = null;
                });
            } else {
                stopScanner();
            }
        });
    }

    function stopScanner() {
        if (html5QrCode) {
            html5QrCode.stop().then(() => {
                html5QrCode = null;
                scannerContainer.style.display = 'none';
                resetScannerUI();
            }).catch(err => {
                console.error("Error stopping scanner:", err);
                // Force cleanup if stop fails
                html5QrCode = null;
                scannerContainer.style.display = 'none';
                resetScannerUI();
            });
        }
    }

    function resetScannerUI() {
        if (btnScan) {
            btnScan.innerHTML = '<i class="fa-solid fa-barcode"></i>';
            btnScan.classList.remove('active-scanning');
            btnScan.style.background = '';
        }
    }

    // Stop scanner/camera if modal is closed
    const modalCloseElements = document.querySelectorAll('.close-modal, .close-modal-btn');
    modalCloseElements.forEach(el => {
        el.addEventListener('click', () => {
            stopScanner();
            stopCamera();
        });
    });

    // Architecture Fix: Ensure hardware is released even if modal transition is forced closed
    if (modal) {
        modal.addEventListener('transitionend', () => {
            if (!modal.classList.contains('show')) {
                stopScanner();
                stopCamera();
            }
        });
    }

    setupSidebar();
});

