import { apiRequest } from '../Shared/Utils/api.js';

document.addEventListener('DOMContentLoaded', async () => {
    // --- 0. Authentication & Context ---
    const ctx = window.authContext;
    if (!ctx || !ctx.isAuthenticated) {
        window.location.href = '../Authentication/login.html';
        return;
    }

    const { role, ownerRefId: ownerId, user } = ctx;

    // --- 1. State & Constants ---
    let inventory = []; // Fetched state via backend
    let isEditing = false;
    let isSaving = false; // New flag to prevent double submissions
    let currentEditId = null;
    let cameraStream = null;
    let productToDeleteId = null;

    // Fetch Inventory from DB
    let refreshInterval;
    async function refreshInventoryData() {
        if (isSaving) return; // Don't refresh while saving
        try {
            const result = await apiRequest('/products/');

            if (result.success) {
                inventory = result.data || [];
                renderTable();
                calculateDashboardStats();
            } else {
                console.error("Fetch Inventory Failed:", result.message);
            }
        } catch (err) {
            console.error("Network Error:", err);
            // Fallback to local if server down (optional, but let's stick to real backend)
        }
    }


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

    // --- New DOM Elements for Packed/Loose ---
    const inputTypeRadios = document.querySelectorAll('input[name="product-type-radio"]');
    const packedStockFields = document.getElementById('packed-stock-fields');
    const looseStockFields = document.getElementById('loose-stock-fields');
    const barcodeWrapper = document.getElementById('barcode-wrapper');
    const inputLooseQty = document.getElementById('loose-stock-quantity');
    const inputPricePerUnit = document.getElementById('price-per-unit');
    const inputLooseUnit = document.getElementById('loose-product-unit');

    if (inputPP) inputPP.addEventListener('input', calculateMargin);
    if (inputCP) inputCP.addEventListener('input', calculateMargin);
    if (inputSP) inputSP.addEventListener('input', calculateMargin);
    if (inputPricePerUnit) inputPricePerUnit.addEventListener('input', calculateMargin);








    // Initial Fetchers
    async function loadStoreSettings() {
        try {
            const result = await apiRequest('/stores/details');
            if (result.success) {
                const store = result.data;
                // Sync expiry thresholds from store settings
                expirySettings = [
                    store.healthyExpiryThreshold || 30,
                    store.expiryWarningThreshold || 14,
                    store.expiryCriticalThreshold || 7
                ]; 
                renderTable(); // Re-render once we have real settings
                calculateDashboardStats();
            }
        } catch (err) {
            console.error("Failed to load store settings:", err);
        }
    }

    async function loadCategories() {
        try {
            const result = await apiRequest('/categories/');
            if (result.success) {
                const dbCategories = result.data || [];
                // Update CATEGORIES state for the given type
                // Note: The UI separates by 'Kirana' and 'Clothes'. 
                // We'll merge DB categories into the default structure or just use them if type-agnostic.
                // For now, let's just make sure we populate the selects.
                dbCategories.forEach(cat => {
                    const type = 'Kirana'; // Default fallback type if not specified in DB
                    if (!CATEGORIES[type].includes(cat.name)) {
                        CATEGORIES[type].push(cat.name);
                    }
                });
                populateSelects();
            }
        } catch (err) {
            console.error("Failed to load categories:", err);
        }
    }

    // --- 3. Initialization ---
    await loadStoreSettings();
    await loadCategories();
    populateSelects();
    updateBrandList();
    calculateDashboardStats(); 
    refreshInventoryData(); 
    
    function startRefreshInterval() {
        clearInterval(refreshInterval);
        refreshInterval = setInterval(refreshInventoryData, 30000);
    }
    startRefreshInterval();

    // Enforce Non-Negative Numbers on Input
    const numericInputs = [
        inputQty, inputPP, inputCP, inputSP, inputReorder,
        document.getElementById('setting-expiry-alert'),
        document.getElementById('setting-expiry-warning'),
        document.getElementById('setting-expiry-critical')
    ];
    numericInputs.forEach(input => {
        if (input) {
            input.addEventListener('input', () => {
                if (input.value < 0) {
                    input.value = 0;
                    if (input === inputPP || input === inputCP || input === inputSP) {
                         calculateMargin(); // Re-calculate if price changed
                    }
                }
            });
        }
    });

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

    // Product Type Toggle
    inputTypeRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            const type = e.target.value;
            toggleProductTypeFields(type);
            updateTypePills(type);
        });
    });

    function toggleProductTypeFields(type) {
        if (type === 'loose') {
            packedStockFields.style.display = 'none';
            looseStockFields.style.display = 'block';
            barcodeWrapper.style.display = 'none';
            divGroceryDates.style.display = 'none';
            
            // Remove required from packed fields
            inputBatch.removeAttribute('required');
            inputQty.removeAttribute('required');
            inputExp.removeAttribute('required');
            
            // Add required to loose fields
            inputLooseQty.setAttribute('required', 'true');
            inputPricePerUnit.setAttribute('required', 'true');
        } else {
            packedStockFields.style.display = 'block';
            looseStockFields.style.display = 'none';
            barcodeWrapper.style.display = 'flex';
            
            // Packed can be Kirana or Clothes - check inputType
            const categoryType = inputType.value;
            toggleAttributes(categoryType);
            
            // Add required back to packed fields
            inputBatch.setAttribute('required', 'true');
            inputQty.setAttribute('required', 'true');
            if (categoryType !== 'Clothes') {
                inputExp.setAttribute('required', 'true');
            }
            
            // Remove required from loose fields
            inputLooseQty.removeAttribute('required');
            inputPricePerUnit.removeAttribute('required');
        }
        calculateMargin();
    }

    function updateTypePills(selectedType) {
        inputTypeRadios.forEach(radio => {
            const label = radio.closest('.type-pill');
            if (radio.value === selectedType) {
                label.style.background = 'var(--primary-color)';
                label.style.color = 'white';
                label.style.boxShadow = '0 2px 8px rgba(var(--primary-rgb), 0.3)';
            } else {
                label.style.background = 'transparent';
                label.style.color = 'var(--text-muted)';
                label.style.boxShadow = 'none';
            }
        });
    }

    // Dynamic Form Updates (Category Change)
    safeListener(inputType, 'change', (e) => {
        const type = e.target.value;
        populateSubCategories(type);
        toggleAttributes(type);
        if (inputCategory) inputCategory.value = ''; // Clear previous sub-category
    });

    // Margin Calculator (Listeners already attached above)



    // --- Image Handling Listeners ---

    // 1. File Upload with Compression
    safeListener(inputImageFile, 'change', (e) => {
        const file = e.target.files[0];
        if (file) {
            // Check file size (5MB limit)
            const MAX_SIZE = 5 * 1024 * 1024; // 5MB in bytes
            if (file.size > MAX_SIZE) {
                QuadModals.alert("File Too Large", "Please upload an image smaller than 5MB.", "warning");
                inputImageFile.value = ''; // Clear the input
                return;
            }

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
        const controls = document.querySelector('.image-controls');
        if (controls) controls.style.display = 'flex';
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
            match = [...inventory].reverse().find(p => p.barcode === scannedCode && p.productType !== 'loose');
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
        const ppu = parseFloat(inputPricePerUnit.value) || 0;
        
        const isLoose = Array.from(inputTypeRadios).find(r => r.checked)?.value === 'loose';

        // Use PP as the cost basis (since CP is treated as MRP)
        const effectiveCost = pp;
        const effectiveSelling = isLoose ? ppu : sp;

        if (effectiveSelling > 0) {
            const profit = effectiveSelling - effectiveCost;
            // Margin = (Profit / Selling Price) * 100
            const margin = (profit / effectiveSelling) * 100;
            
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
            populateSubCategories(item.type);
            inputCategory.value = item.categoryName || item.category || '';
            toggleAttributes(item.type);

            inputPP.value = Math.max(0, item.pp || 0) || '';
            inputCP.value = Math.max(0, item.cp || 0) || '';
            inputSP.value = Math.max(0, item.price || 0) || '';
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
            inputQty.value = Math.max(0, item.quantity || 0);
            inputUnit.value = item.unit || 'pcs';
            inputMfd.value = item.mfd || '';
            inputExp.value = item.exp || '';
            inputReorder.value = Math.max(0, item.reorderPoint || 10);
            
            // Loose fields
            inputLooseQty.value = item.stockQuantity || '';
            inputPricePerUnit.value = item.pricePerUnit || '';
            inputLooseUnit.value = item.unit || 'kg';

            // Set Type Option
            const typeToSet = item.productType || 'packed';
            inputTypeRadios.forEach(r => {
                if(r.value === typeToSet) {
                    r.checked = true;
                    updateTypePills(typeToSet);
                    toggleProductTypeFields(typeToSet);
                }
            });

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

            // Default to packed
            inputTypeRadios.forEach(r => {
                if(r.value === 'packed') {
                    r.checked = true;
                    updateTypePills('packed');
                    toggleProductTypeFields('packed');
                }
            });
            inputLooseQty.value = '';
            inputPricePerUnit.value = '';
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
        if (isSaving) return;

        // Data-Level RBAC: Only Owners can modify inventory
        if (role !== 'owner') {
            QuadModals.alert("Access Denied", "Your role does not have permission to modify inventory data.", "error");

            return;
        }

        saveProduct(true);
    }


    async function saveProduct(closeAfterSave = true) {
        if (role !== 'owner') {
            QuadModals.alert("Access Denied", "Authorization failed for this operation.", "error");
            return;
        }

        const qty = parseInt(inputQty.value) || 0;
        const pp = parseFloat(inputPP.value) || 0;
        const cp = parseFloat(inputCP.value) || 0;
        const sp = parseFloat(inputSP.value) || 0;
        const reorder = parseInt(inputReorder.value) || 0;
        const isLoose = Array.from(inputTypeRadios).find(r => r.checked)?.value === 'loose';

        if (pp < 0 || cp < 0 || sp < 0 || reorder < 0) {
            QuadModals.alert("Invalid Input", "Prices, and Reorder Point cannot be negative.", "warning");
            return;
        }

        if (isLoose) {
            if (parseFloat(inputLooseQty.value) < 0 || parseFloat(inputPricePerUnit.value) < 0) {
                QuadModals.alert("Invalid Input", "Quantity and Price Per Unit cannot be negative.", "warning");
                return;
            }
        } else {
            if (parseInt(inputQty.value) < 0) {
                QuadModals.alert("Invalid Input", "Quantity cannot be negative.", "warning");
                return;
            }
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
            name: inputName.value,
            brand: inputBrand.value,
            type: currentType,
            categoryName: inputCategory.value,

            description: inputDesc.value,
            image: imgPreview.src, 
            barcode: isLoose ? null : inputBarcode.value,
            batchNumber: isLoose ? null : inputBatch.value,
            productType: isLoose ? 'loose' : 'packed',

            quantity: isLoose ? 0 : (parseInt(inputQty.value) || 0),
            unit: isLoose ? inputLooseUnit.value : inputUnit.value,
            pricePerUnit: isLoose ? (parseFloat(inputPricePerUnit.value) || 0) : 0,
            stockQuantity: isLoose ? (parseFloat(inputLooseQty.value) || 0) : 0,

            mfd: (isLoose || currentType === 'Clothes') ? null : inputMfd.value,
            exp: (isLoose || currentType === 'Clothes') ? null : inputExp.value,
            size: currentType === 'Clothes' ? inputSize.value : null,
            color: currentType === 'Clothes' ? inputColor.value : null,
            weight: (currentType === 'Kirana' && !isLoose) ? inputWeight.value : null,
            reorderPoint: parseInt(inputReorder.value) || 10,
            pp: parseFloat(inputPP.value) || 0,
            cp: parseFloat(inputCP.value) || 0,
            price: isLoose ? (parseFloat(inputPricePerUnit.value) || 0) : (parseFloat(inputSP.value) || 0)
        };

        const formData = new FormData();
        Object.keys(productData).forEach(key => {
            if (key === 'image') return; // Handle image separately
            if (productData[key] !== null && productData[key] !== undefined) {
                formData.append(key, productData[key]);
            }
        });

        // Handle Image
        const imgSrc = imgPreview.src;
        if (imgSrc && imgSrc.startsWith('data:image')) {
            try {
                const arr = imgSrc.split(',');
                const mime = arr[0].match(/:(.*?);/)[1];
                const bstr = atob(arr[1]);
                let n = bstr.length;
                const u8arr = new Uint8Array(n);
                while(n--){
                    u8arr[n] = bstr.charCodeAt(n);
                }
                const blob = new Blob([u8arr], {type: mime});
                formData.append('image', blob, 'product_image.jpg');
            } catch (e) {
                console.error("Error converting image string to blob", e);
            }
        } else if (imgSrc && imgSrc.startsWith('http')) {
             formData.append('image', imgSrc);
        }

        try {
            isSaving = true;
            let result;
            if (isEditing) {
                // Update - RESTful PUT /products/:id
                result = await apiRequest(`/products/${currentEditId}`, {
                    method: 'PUT',
                    body: formData
                });
            } else {
                // Create - RESTful POST /products/
                result = await apiRequest('/products/', {
                    method: 'POST',
                    body: formData
                });
            }


            if (result && result.success) {
                QuadModals.showToast(isEditing ? "Product Updated!" : "Product Added!", "success");
                
                // Reset interval to prevent immediate background refresh
                startRefreshInterval();
                
                isSaving = false; // Release lock before calling refresh
                await refreshInventoryData();
                
                if (closeAfterSave) closeModal();
            } else {
                QuadModals.alert("Save Failed", result?.message || "Could not save product.", "error");
            }
        } catch (err) {
            console.error("Save Product Error:", err);
            const errorMsg = err.message || "Server connection failed or unauthorized.";
            QuadModals.alert("Save Failed", errorMsg, "error");
        } finally {
            isSaving = false;
        }
    }

    async function deleteProduct(id) {
        if (role === 'staff') {
            QuadModals.alert("Access Denied", "Staff members cannot delete products.", "error");
            return;
        }

        const confirmed = await QuadModals.confirm(
            "Delete Product",
            "Are you sure you want to remove this item? This action cannot be undone.",
            { isDanger: true, confirmText: 'Delete' }
        );

        if (!confirmed) return;

        try {
            const result = await apiRequest(`/products/${id}`, {
                method: 'DELETE'
            });

            if (result.success) {
                QuadModals.showToast("Product deleted successfully", "info");
                refreshInventoryData();
            }
        } catch (err) {
            console.error("Delete Error:", err);
            alert("Network error or unauthorized.");
        }
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
            const isLoose = item.productType === 'loose';
            const qty = isLoose ? (item.stockQuantity || 0) : (item.quantity || 0);

            totalVal += (item.cp || 0) * qty;

            if (qty === 0) {
                outOfStockCount++;
            } else if (qty <= (item.reorderPoint || 10)) {
                lowStockCount++;
            }

            if (item.exp && !isLoose) {
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

            const matchCat = !filters.category || (item.categoryName || item.category) === filters.category;
            const matchBrand = !filters.brand || item.brand === filters.brand;

            let matchStock = true;
            const qty = item.productType === 'loose' ? (item.stockQuantity || 0) : (item.quantity || 0);
            if (filters.stock === 'low-stock') matchStock = qty <= (item.reorderPoint || 10) && qty > 0;
            if (filters.stock === 'out-of-stock') matchStock = qty === 0;
            if (filters.stock === 'in-stock') matchStock = qty > (item.reorderPoint || 10);

            let matchExp = true;
            if (filters.expiry && item.exp && item.productType !== 'loose') {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const expDate = new Date(item.exp);
                const diffDays = Math.ceil((expDate - today) / (1000 * 60 * 60 * 24));

                if (filters.expiry === 'expired') matchExp = diffDays < 0;
                if (filters.expiry === 'expiring-soon') matchExp = diffDays >= 0 && diffDays <= 30;
                if (filters.expiry === 'good') matchExp = diffDays > 30;
            } else if (filters.expiry && item.productType === 'loose') {
                matchExp = false;
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
        const isLoose = item.productType === 'loose';
        const qty = isLoose ? (item.stockQuantity || 0) : (item.quantity || 0);
        const status = isLoose ? { class: (qty === 0 ? 'dot-red' : (qty <= (item.reorderPoint || 10) ? 'dot-yellow' : 'dot-green')), title: 'Stock Levels', expiryClass: '', daysToExpiry: null } : getStatus(item);

        tr.innerHTML = `
            <td><span class="status-dot ${status.class}" title="${status.title}"></span></td>
            <td>
                <div style="display:flex; gap:10px; align-items:center;">
                    ${item.image ? `<img src="${item.image}" style="width:40px; height:40px; border-radius:4px; object-fit:cover;">` : '<div class="image-placeholder"><i class="fa-solid fa-plus"></i></div>'}
                    <div>
                        <div style="font-weight: 600;">${item.name} <span style="font-weight:400; color:var(--text-secondary); font-size:0.95em;">${(item.size || item.weight) ? '(' + (item.size || item.weight) + ')' : ''}</span></div>
                        <div style="display:flex; gap:6px; margin-top:2px;">
                            <span class="badge ${isLoose ? 'badge-loose' : 'badge-packed'}">${isLoose ? 'LOOSE' : 'PACKED'}</span>
                            <span class="text-sm">${item.categoryName || item.category || '-'}</span>
                        </div>
                    </div>
                </div>
            </td>
            <td><div class="badge badge-cat">${item.brand || '-'}</div></td>
            <td>
                ${isLoose ? '<div class="text-muted">N/A</div>' : `
                <div style="font-family: monospace; font-weight: 600;">${item.batchNumber}</div>
                <div class="text-sm">MFD: ${formatDate(item.mfd)}</div>
                `}
            </td>
            <td>
                <div style="font-weight: 700;">${isLoose ? qty.toFixed(3) : qty} ${item.unit}</div>
                ${qty === 0 ? '<span style="color:var(--c-red-text); font-size:0.75em; font-weight:bold;">Out of Stock</span>' : (qty <= (item.reorderPoint || 10) ? '<span style="color:var(--c-orange-text); font-size:0.75em;">Low Stock</span>' : '')}
            </td>
            <td>
                <div style="display:flex; flex-direction:column; gap:4px;">
                    ${item.pp ? `<div style="font-weight:600; color:var(--text-primary);">PP: ₹${item.pp.toFixed(2)}</div>` : ''}
                    <div style="font-weight:600; color:var(--text-primary);">CP: ₹${(item.cp || 0).toFixed(2)}</div>
                    <div style="font-weight:700; color:var(--c-green-text); font-size:1.05em;">SP: ₹${(item.price || 0).toFixed(2)} ${isLoose ? `<small style="font-size:0.7em;">/ ${item.unit}</small>` : ''}</div>
                </div>
            </td>
            <td>
                ${isLoose ? '<div class="text-muted">N/A</div>' : `
                <div style="font-weight: 600; ${status.expiryClass}">
                    ${formatDate(item.exp)}
                </div>
                ${status.daysToExpiry !== null ? `<div class="text-sm">${status.daysToExpiry < 0 ? 'Expired' : status.daysToExpiry + ' days left'}</div>` : ''}
                `}
            </td>
            <td>
                <button class="action-btn edit-btn" data-id="${item._id}" title="Edit"><i class="fa-solid fa-pen-to-square"></i></button>
                <button class="action-btn delete-btn" data-id="${item._id}" title="Delete"><i class="fa-solid fa-trash"></i></button>
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
                    <button class="action-btn edit-btn" data-id="${item._id}" title="Edit"><i class="fa-solid fa-pen-to-square"></i></button>
                    <button class="action-btn delete-btn" data-id="${item._id}" title="Delete"><i class="fa-solid fa-trash"></i></button>
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
                const item = inventory.find(i => i._id === id);
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



    // Theme toggle handled by shared sidebar.js

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



    // Modal Events - settings modal logic
    if (btnSaveSettings) {
        btnSaveSettings.addEventListener('click', async () => {
            const newSettings = {
                healthyExpiryThreshold: parseInt(inputExpiryAlert.value) || 30,
                expiryWarningThreshold: parseInt(inputExpiryWarning.value) || 14,
                expiryCriticalThreshold: parseInt(inputExpiryCritical.value) || 7
            };

            try {
                const result = await apiRequest('/stores/update', {
                    method: 'PUT',
                    body: JSON.stringify(newSettings)
                });

                if (result.success) {
                    expirySettings = [
                        newSettings.healthyExpiryThreshold,
                        newSettings.expiryWarningThreshold,
                        newSettings.expiryCriticalThreshold
                    ];
                    settingsModal.style.display = 'none';
                    QuadModals.showToast("Store alert levels updated!", "success");
                    renderTable(); 
                    calculateDashboardStats();
                }
            } catch (err) {
                QuadModals.alert("Sync Error", "Failed to update thresholds in backend: " + err.message, "error");
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

    // Sidebar setup handled by shared sidebar.js
});


