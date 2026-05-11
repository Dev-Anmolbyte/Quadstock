import { apiRequest } from '../Shared/Utils/api.js';

document.addEventListener('DOMContentLoaded', async () => {
    // --- 1. Context & Authentication ---
    const ctx = window.authContext;
    if (!ctx || !ctx.isAuthenticated) {
        window.location.href = '../Authentication/login.html';
        return;
    }
    const { ownerRefId: ownerId, user, role } = ctx;

    // --- 2. State Management ---
    let inventory = [];
    let cart = [];
    let activeProduct = null; // For loose selection
    let isProcessing = false;

    // --- 3. DOM Elements ---
    const unifiedSearchInput = document.getElementById('unified-search-input');
    const categoryBtns = document.querySelectorAll('.cat-pill');
    const productGrid = document.getElementById('product-grid');
    
    const cartItemsList = document.getElementById('cart-items');
    const cartSubtotal = document.getElementById('cart-subtotal');
    const cartTotal = document.getElementById('cart-total');
    const discountTypeSelect = document.getElementById('discount-type');
    const discountValueInput = document.getElementById('discount-value');
    const discountRow = document.getElementById('discount-row');
    const cartDiscount = document.getElementById('cart-discount');
    const checkoutBtn = document.getElementById('pos-checkout-btn');
    const clearCartBtn = document.getElementById('clear-cart');
    const mainCartModal = document.getElementById('main-cart-modal');
    const closeMainCartBtn = document.getElementById('close-main-cart');
    const cartFloatingBar = document.getElementById('cart-floating-bar');
    const floatingCartCount = document.getElementById('floating-cart-count');
    const floatingCartTotal = document.getElementById('floating-cart-total');
    const viewCartBtn = document.getElementById('view-cart-btn');

    const looseModal = document.getElementById('loose-modal');
    const looseModalName = document.getElementById('loose-modal-name');
    const looseModalPriceLabel = document.getElementById('loose-modal-price-label');
    const looseModalQty = document.getElementById('loose-modal-qty');
    const looseModalUnit = document.getElementById('loose-modal-unit');
    const looseModalTotal = document.getElementById('loose-modal-total');
    const looseModalStock = document.getElementById('loose-modal-stock');
    const looseModalAdd = document.getElementById('loose-modal-add');
    const looseModalCancel = document.getElementById('loose-modal-cancel');

    const posStoreName = document.getElementById('pos-store-name');
    const posEmployeeName = document.getElementById('pos-employee-name');
    const posDatetime = document.getElementById('pos-datetime');

    // Update Top Bar branding with latest storage data
    const freshUser = JSON.parse(sessionStorage.getItem('currentUser')) || user;
    if (posStoreName) posStoreName.textContent = (freshUser.storeId?.name || 'QuadStock POS').toUpperCase();
    if (posEmployeeName) posEmployeeName.textContent = freshUser.name || 'Staff Member';
    const posLogoutBtn = document.getElementById('pos-logout-btn');
    
    const cartItemCount = document.getElementById('cart-item-count');
    const posCategoryFilter = document.getElementById('pos-category-filter');
    const paymentBtns = document.querySelectorAll('.pay-method');

    let selectedType = 'all'; // 'all', 'packed', 'loose'
    let selectedCategory = 'all'; // 'all' or category name
    let selectedPaymentMethod = 'cash';

    // --- Helper: Calculate Effective Price (Smart Expiry Discounts) ---
    function getEffectivePrice(p) {
        const originalPrice = parseFloat(p.price || p.pricePerUnit || 0);
        let finalPrice = originalPrice;
        let discountInfo = null;

        if (p.discount > 0) {
            if (p.discountType === 'percentage') {
                finalPrice = originalPrice - (originalPrice * (p.discount / 100));
                discountInfo = { amount: p.discount, type: 'percentage', label: `-${p.discount}%` };
            } else {
                finalPrice = originalPrice - p.discount;
                discountInfo = { amount: p.discount, type: 'fixed', label: `-₹${p.discount}` };
            }
        }
        return { 
            originalPrice, 
            finalPrice: Math.max(0, finalPrice), 
            discountInfo 
        };
    }

    // --- 6. Render Visual Product Grid ---
    const renderProductGrid = function() {
        if (!productGrid) return;
        
        const query = unifiedSearchInput.value.toLowerCase().trim();
        let filtered = inventory;

        if (selectedType !== 'all') {
            filtered = filtered.filter(p => p.productType === selectedType);
        }

        if (selectedCategory !== 'all') {
            filtered = filtered.filter(p => 
                (p.categoryName && p.categoryName.toLowerCase() === selectedCategory) || 
                (p.category && p.category.toLowerCase() === selectedCategory)
            );
        }

        if (query) {
            filtered = filtered.filter(p => 
                p.name.toLowerCase().includes(query) || 
                (p.brand && p.brand.toLowerCase().includes(query)) ||
                (p.barcode && p.barcode.includes(query))
            );
        }

        filtered.sort((a, b) => {
            const stockA = a.quantity || a.stockQuantity || 0;
            const stockB = b.quantity || b.stockQuantity || 0;
            if (stockA > 0 && stockB <= 0) return -1;
            if (stockA <= 0 && stockB > 0) return 1;
            return a.name.localeCompare(b.name);
        });

        if (filtered.length === 0) {
            productGrid.innerHTML = '<div class="empty-state"><i class="fa-solid fa-box-open" style="font-size: 2.5rem; margin-bottom: 1rem;"></i><p>No products found</p></div>';
            return;
        }

        productGrid.innerHTML = filtered.map(p => {
            const imgSrc = p.image || 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=400';
            const stockQty = p.quantity || p.stockQuantity || 0;
            const cardClass = stockQty <= 0 ? 'out-of-stock' : '';
            const { finalPrice, originalPrice, discountInfo } = getEffectivePrice(p);

            const batch = p.batchNumber || 'N/A';
            const mfdDate = p.mfd ? new Date(p.mfd).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A';
            const expDate = p.exp ? new Date(p.exp).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A';
            
            // Only show expired state if the item is actually in stock. 
            // If out of stock, "Out of Stock" takes priority.
            const isExpired = stockQty > 0 && p.exp && new Date(p.exp) < new Date();
            const expClass = isExpired ? 'text-danger' : '';

            return `
                <div class="v-product-card ${cardClass} ${isExpired ? 'expired' : ''}" data-id="${p._id}">
                    <div class="v-product-img">
                        <img src="${imgSrc}" alt="${p.name}" loading="lazy" onerror="this.src='https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=400'">
                        <span class="badge-v2 ${p.productType === 'loose' ? 'badge-loose' : 'badge-packed'}">
                            ${p.productType === 'loose' ? 'LOOSE' : 'PACKED'}
                        </span>
                        ${isExpired ? `
                            <span class="badge-expired">EXPIRED</span>
                        ` : ''}
                        ${discountInfo ? `
                            <div class="discount-tag-container">
                                <span class="badge-expiry-discount">
                                    ${ (p.discountReason || p.reason || 'OFFER').toUpperCase() }
                                </span>
                                <span class="discount-value-badge">
                                    -${p.discountType === 'percentage' ? p.discount + '%' : '₹' + p.discount}
                                </span>
                            </div>
                        ` : ''}
                    </div>
                    <div class="v-product-info">
                        <div class="v-product-brand">${p.brand || 'No Brand'}</div>
                        <h4 class="v-product-name" title="${p.name}">${p.name}</h4>
                        
                        <div class="v-product-details-grid">
                            <div class="detail-row">
                                <span class="label">BATCH</span>
                                <span class="value">${batch}</span>
                            </div>
                            <div class="detail-row">
                                <span class="label">MFD</span>
                                <span class="value">${mfdDate}</span>
                            </div>
                            <div class="detail-row">
                                <span class="label">EXP</span>
                                <span class="value ${expClass}">${expDate}</span>
                            </div>
                            <div class="detail-row">
                                <span class="label">VOL / WT</span>
                                <span class="value">${p.size || p.weight || 'N/A'}</span>
                            </div>
                            <div class="detail-row">
                                <span class="label">STOCK</span>
                                <span class="value highlight">${stockQty} ${p.unit || 'pcs'}</span>
                            </div>
                        </div>

                        <div class="v-product-footer">
                            <div class="v-product-price-container">
                                <div class="v-product-price">₹${finalPrice.toFixed(2)}${p.productType === 'loose' ? `/${p.unit || 'kg'}` : ''}</div>
                                ${discountInfo ? `<div class="v-product-original-price">₹${originalPrice.toFixed(2)}</div>` : ''}
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        productGrid.querySelectorAll('.v-product-card').forEach(card => {
            card.onclick = () => {
                const product = inventory.find(p => p._id === card.dataset.id);
                if (product) selectProduct(product);
            };
        });
    };
    window.renderProductGrid = renderProductGrid;

    // --- 4. Initialization ---
    async function fetchInventory() {
        try {
            productGrid.innerHTML = '<div class="loading-state"><i class="fa-solid fa-spinner fa-spin" style="font-size: 2.5rem; margin-bottom: 1rem;"></i><p>Loading Inventory...</p></div>';
            const result = await apiRequest('/products/');
            if (result.success) {
                inventory = result.data || [];

                // Migration (Safe Extension)
                inventory.forEach(p => {
                    if (!p.productType) p.productType = "packed";
                });

                // Populate category dropdown
                const categories = new Set();
                inventory.forEach(p => {
                    if (p.categoryName) categories.add(p.categoryName);
                    else if (p.category) categories.add(p.category);
                });
                categories.forEach(c => {
                    const opt = document.createElement('option');
                    opt.value = c.toLowerCase();
                    opt.textContent = c;
                    posCategoryFilter.appendChild(opt);
                });

                renderProductGrid();
            }
        } catch (err) {
            console.error("Fetch Error:", err);
        }
    }
    await fetchInventory();

    // Set POS Header
    posStoreName.textContent = user?.storeName || 'QuadStock POS';
    posEmployeeName.textContent = user?.name || 'Staff';
    
    function updateClock() {
        const now = new Date();
        posDatetime.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
    }
    setInterval(updateClock, 1000);
    updateClock();

    posLogoutBtn.onclick = () => {
        if (role === 'owner') {
            window.location.href = '../Ownerdashboard/dashboard.html';
        } else {
            window.location.href = '../StaffDashboard/staff_dashboard.html';
        }
    };


    posCategoryFilter.addEventListener('change', (e) => {
        selectedCategory = e.target.value;
        renderProductGrid();
    });

    paymentBtns.forEach(btn => {
        btn.onclick = () => {
            paymentBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            selectedPaymentMethod = btn.dataset.method;

            // If Udhaar is selected, prompt for customer info immediately if cart not empty
            if (selectedPaymentMethod === 'udhaar' && cart.length > 0) {
                // Change modal title and hide skip button
                document.querySelector('#customer-modal h3').innerHTML = '<i class="fa-solid fa-indian-rupee-sign" style="color: var(--primary-color); margin-right: 0.75rem;"></i> Udhaar Details';
                document.getElementById('skip-customer-btn').style.display = 'none';
                document.getElementById('udhaar-due-group').style.display = 'block';
                
                // Default due date to today + 7 days
                const dueDateInput = document.getElementById('customer-due-date');
                if (dueDateInput) {
                    const future = new Date();
                    future.setDate(future.getDate() + 7);
                    dueDateInput.valueAsDate = future;
                }

                customerNameInput.value = '';
                customerPhoneInput.value = '';
                customerModal.classList.add('show');
            } else {
                // Reset modal for other methods
                document.querySelector('#customer-modal h3').innerHTML = '<i class="fa-solid fa-user-tag" style="color: var(--primary-color); margin-right: 0.75rem;"></i> Customer Details';
                document.getElementById('skip-customer-btn').style.display = 'block';
                document.getElementById('udhaar-due-group').style.display = 'none';
            }
        };
    });


    // --- 5. Unified Search & Filtering ---
    let searchTimeout;
    unifiedSearchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            renderProductGrid();
        }, 100); // 100ms debounce for speed
    });

    unifiedSearchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            const code = unifiedSearchInput.value.trim();
            if (code) {
                const match = inventory.find(p => p.barcode === code && p.productType === 'packed');
                if (match) {
                    selectProduct(match);
                    unifiedSearchInput.value = '';
                    renderProductGrid();
                }

            }
        }
    });

    categoryBtns.forEach(btn => {
        btn.onclick = () => {
            categoryBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            selectedType = btn.dataset.cat;
            renderProductGrid();
        };
    });



    // --- 8. Product Selection (Packed vs Loose) ---
    const toastTimestamps = new Map();

    function selectProduct(product) {
        const stockQty = product.quantity || product.stockQuantity || 0;
        const now = Date.now();
        const lastToast = toastTimestamps.get(product._id) || 0;
        const canShowToast = (now - lastToast > 2000);

        if (stockQty <= 0) {
            if (canShowToast) {
                QuadModals.showToast(`${product.name} is out of stock`, 'error');
                toastTimestamps.set(product._id, now);
            }
            return;
        }

        const isExpired = product.exp && new Date(product.exp) < new Date();
        if (isExpired) {
            if (canShowToast) {
                QuadModals.showToast(`${product.name} is expired and cannot be sold`, 'error');
                toastTimestamps.set(product._id, now);
            }
            return;
        }

        if (product.productType === 'loose') {
            activeProduct = product;
            showLooseArea(product);
        } else {
            // Check if adding another would exceed stock
            const existing = cart.find(item => item._id === product._id);
            const currentInCart = existing ? existing.cartQty : 0;
            
            if (currentInCart + 1 > stockQty) {
                if (canShowToast) {
                    QuadModals.showToast(`Max stock reached: ${stockQty}`, 'warning');
                    toastTimestamps.set(product._id, now);
                }
                return;
            }

            addToCart(product, 1);
            
            if (canShowToast) {
                QuadModals.showToast(`Added: ${product.name}`, 'success');
                toastTimestamps.set(product._id, now);
            }
        }
    }



    function showLooseArea(item) {
        looseModalName.textContent = item.name;
        const unit = item.unit || 'kg';
        const { finalPrice } = getEffectivePrice(item);
        looseModalPriceLabel.textContent = `₹${finalPrice.toFixed(2)} / ${unit}`;
        looseModalUnit.textContent = unit;
        looseModalStock.textContent = `${item.stockQuantity || 0} ${unit}`;
        looseModalQty.value = '';
        looseModalTotal.textContent = '₹0.00';
        
        looseModal.style.display = 'flex';
        looseModal.classList.add('show');
        setTimeout(() => looseModalQty.focus(), 100);
    }

    looseModalQty.addEventListener('input', () => {
        if (!activeProduct) return;
        const qty = parseFloat(looseModalQty.value) || 0;
        const { finalPrice } = getEffectivePrice(activeProduct);
        const total = qty * finalPrice;
        looseModalTotal.textContent = `₹${total.toFixed(2)}`;
    });

    looseModalAdd.onclick = () => {
        const qty = parseFloat(looseModalQty.value);
        if (!qty || qty <= 0) {
            QuadModals.showToast("Enter valid quantity", "warning");
            return;
        }

        // Check Stock
        const maxStock = activeProduct.stockQuantity || 0;
        let finalQty = qty;
        if (qty > maxStock) {
            QuadModals.showToast(`Max stock reached: ${maxStock} ${activeProduct.unit}`, "warning");
            finalQty = maxStock;
        }

        addToCart(activeProduct, finalQty);
        looseModal.classList.remove('show');
        setTimeout(() => { looseModal.style.display = 'none'; }, 300);
        activeProduct = null;
    };

    looseModalCancel.onclick = () => {
        looseModal.classList.remove('show');
        setTimeout(() => { looseModal.style.display = 'none'; }, 300);
        activeProduct = null;
    };

    // --- 9. Cart Management ---
    function addToCart(product, qty) {
        const { finalPrice, originalPrice, discountInfo } = getEffectivePrice(product);
        const existing = cart.find(item => item._id === product._id);
        
        if (existing) {
            if (product.productType === 'packed') {
                existing.cartQty += qty;
            } else {
                existing.cartQty = qty;
            }
        } else {
            cart.push({
                ...product,
                price: finalPrice, // Use discounted price as the base price for the cart
                originalPrice: originalPrice,
                discountInfo: discountInfo,
                cartQty: qty
            });
        }
        renderCart();
    }

    function renderCart() {
        if (cart.length === 0) {
            cartItemsList.innerHTML = `
                <div class="empty-cart-state">
                    <div class="empty-icon-bg"><i class="fa-solid fa-cart-plus"></i></div>
                    <h4>Empty Cart</h4>
                    <p>Scan items or select from grid</p>
                </div>
            `;
            updateSummary(0);
            checkoutBtn.classList.add('disabled');
            checkoutBtn.disabled = true;
            cartFloatingBar.style.display = 'none';
            mainCartModal.classList.remove('show');
            return;
        }

        cartFloatingBar.style.display = 'flex';
        floatingCartCount.textContent = `${cart.length} Item${cart.length > 1 ? 's' : ''}`;


        cartItemCount.textContent = cart.length;

        cartItemsList.innerHTML = cart.map((item, index) => {
            const itemTotal = item.cartQty * item.price;
            return `
                <div class="cart-item-row">
                    <div class="cart-item-main">
                        <div class="cart-item-details">
                            <span class="cart-item-name">${item.name}</span>
                            <div class="cart-item-meta-info">
                                <span>Batch: ${item.batchNumber || 'N/A'}</span>
                                <span>Size: ${item.size || item.weight || 'N/A'}</span>
                                <span class="stock-badge">Stock: ${item.stockQuantity || 0}</span>
                            </div>
                        </div>
                        <span class="cart-item-total">₹${itemTotal.toFixed(2)}</span>
                    </div>
                    
                    <div class="cart-item-controls">
                        ${item.productType === 'packed' ? `
                            <div class="qty-stepper">
                                <button onclick="changeQty(${index}, -1)">-</button>
                                <input type="number" class="qty-val" value="${item.cartQty}" min="1" onchange="updateCartQty(${index}, this.value)">
                                <button onclick="changeQty(${index}, 1)">+</button>
                            </div>
                        ` : `
                            <button onclick="editLooseCartItem(${index})" class="item-delete-btn" style="color: var(--pos-primary); opacity: 1;">
                                <i class="fa-solid fa-pen-to-square"></i> ${item.cartQty} ${item.unit || 'kg'}
                            </button>
                        `}
                        <button onclick="removeCartItem(${index})" class="item-delete-btn">
                            <i class="fa-solid fa-trash-can"></i> Remove
                        </button>
                    </div>
                </div>
            `;
        }).join('');

        const total = cart.reduce((sum, item) => sum + (item.cartQty * item.price), 0);
        updateSummary(total);
        checkoutBtn.classList.remove('disabled');
        checkoutBtn.disabled = false;
    }

    window.changeQty = (index, delta) => {
        const item = cart[index];
        const newQty = item.cartQty + delta;
        if (newQty <= 0) {
            cart.splice(index, 1);
        } else {
            // Check Stock
            const baseProduct = inventory.find(p => p._id === item._id);
            const maxStock = baseProduct.quantity || 0;
            if (delta > 0 && newQty > maxStock) {
                QuadModals.showToast(`Max stock: ${maxStock}`, "warning");
                item.cartQty = maxStock;
                renderCart();
                return;
            }
            item.cartQty = newQty;
        }
        renderCart();
    };

    window.updateCartQty = (index, value) => {
        const item = cart[index];
        let newQty = parseInt(value);
        
        if (isNaN(newQty) || newQty <= 0) {
            newQty = 1;
        }

        const baseProduct = inventory.find(p => p._id === item._id);
        const maxStock = baseProduct.quantity || 0;
        if (newQty > maxStock) {
            QuadModals.showToast(`Max stock: ${maxStock}`, "warning");
            newQty = maxStock;
        }
        
        item.cartQty = newQty;
        renderCart();
    };

    window.removeCartItem = (index) => {
        cart.splice(index, 1);
        renderCart();
    };

    window.editLooseCartItem = (index) => {
        const item = cart[index];
        selectProduct(item);
    };

    let currentDiscount = { type: 'none', value: 0 };

    discountTypeSelect.addEventListener('change', (e) => {
        currentDiscount.type = e.target.value;
        discountValueInput.disabled = currentDiscount.type === 'none';
        if (currentDiscount.type === 'none') {
            discountValueInput.value = '';
            currentDiscount.value = 0;
        }
        renderCart();
    });

    discountValueInput.addEventListener('input', (e) => {
        let val = parseFloat(e.target.value) || 0;
        if (val < 0) {
            val = 0;
            discountValueInput.value = 0;
        }
        currentDiscount.value = val;
        renderCart();
    });


    function updateSummary(subtotal) {
        let discountAmount = 0;
        if (currentDiscount.type === 'flat') {
            discountAmount = currentDiscount.value;
        } else if (currentDiscount.type === 'percentage') {
            discountAmount = subtotal * (currentDiscount.value / 100);
        }

        // Cap discount at subtotal
        if (discountAmount > subtotal) discountAmount = subtotal;

        const total = subtotal - discountAmount;

        cartSubtotal.textContent = `₹${subtotal.toFixed(2)}`;
        
        if (discountAmount > 0) {
            discountRow.style.display = 'flex';
            cartDiscount.textContent = `-₹${discountAmount.toFixed(2)}`;
        } else {
            discountRow.style.display = 'none';
        }

        cartTotal.textContent = `₹${total.toFixed(2)}`;
        if (floatingCartTotal) floatingCartTotal.textContent = `₹${total.toFixed(2)}`;
        return total;
    }

    clearCartBtn.onclick = () => {
        cart = [];
        renderCart();
    };

    viewCartBtn.onclick = () => {
        console.log("Opening Cart Modal");
        if (mainCartModal) {
            mainCartModal.classList.add('show');
        } else {
            console.error("mainCartModal not found");
        }
    };

    closeMainCartBtn.onclick = () => {
        mainCartModal.classList.remove('show');
    };
    const customerModal = document.getElementById('customer-modal');
    const customerNameInput = document.getElementById('customer-name');
    const customerPhoneInput = document.getElementById('customer-phone');
    
    // Allow only numeric input for phone
    customerPhoneInput.addEventListener('input', (e) => {
        e.target.value = e.target.value.replace(/\D/g, '').slice(0, 10);
    });

    checkoutBtn.onclick = () => {
        if (cart.length === 0) {
            QuadModals.showToast("Cart is empty", "error");
            return;
        }
        if (isProcessing) return;

        mainCartModal.classList.remove('show');
        customerNameInput.value = '';
        customerPhoneInput.value = '';
        customerModal.classList.add('show');
    };

    document.getElementById('cancel-customer-btn').onclick = () => {
        customerModal.classList.remove('show');
    };

    document.getElementById('skip-customer-btn').onclick = () => {
        customerModal.classList.remove('show');
        processCheckout('', '');
    };

    document.getElementById('confirm-customer-btn').onclick = () => {
        const dueDate = document.getElementById('customer-due-date').value;
        
        const phone = customerPhoneInput.value.trim();
        if (phone && phone.length !== 10) {
            QuadModals.showToast("Phone number must be exactly 10 digits", "warning");
            return;
        }

        // If Udhaar, validation
        if (selectedPaymentMethod === 'udhaar') {
            if (!customerNameInput.value.trim() || !phone) {
                QuadModals.showToast("Customer Name and Phone required for Udhaar", "warning");
                return;
            }
            if (!dueDate) {
                QuadModals.showToast("Please select an Expected Payment Date", "warning");
                return;
            }
        }

        customerModal.classList.remove('show');
        processCheckout(customerNameInput.value.trim(), customerPhoneInput.value.trim(), dueDate);
    };

    async function processCheckout(customerName, customerPhone, dueDate = null) {
        if (isProcessing) return;

        const subtotal = cart.reduce((s, i) => s + (i.cartQty * i.price), 0);
        const finalTotal = updateSummary(subtotal);

        const confirmed = await QuadModals.confirm(
            "Confirm Sale",
            `Total Payable: ₹${finalTotal.toFixed(2)}`,
            { confirmText: 'Process Payment', confirmClass: 'btn-primary' }
        );

        if (!confirmed) return;

        // Store a snapshot of cart for PDF generation
        const cartSnapshot = [...cart];
        const subtotalSnapshot = subtotal;
        const discountSnapshot = {
            type: currentDiscount.type,
            value: currentDiscount.value
        };

        try {
            isProcessing = true;
            checkoutBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Processing...';
            checkoutBtn.disabled = true;

            const saleData = {
                items: cart.map(item => ({
                    productId: item._id,
                    productType: item.productType,
                    quantity: item.cartQty,
                    price: item.price,
                    total: item.cartQty * item.price,
                    unit: item.unit
                })),
                total: finalTotal,
                discount: discountSnapshot,
                customerName: customerName,
                customerPhone: customerPhone,
                paymentMethod: selectedPaymentMethod,
                dueDate: dueDate
            };

            const result = await apiRequest('/sales', {
                method: 'POST',
                body: JSON.stringify(saleData)
            });

            if (result.success) {
                const orderId = result.data?._id || 'SYS-' + Math.floor(Math.random() * 1000000);
                showSuccessModal(finalTotal, customerName, customerPhone, cartSnapshot, subtotalSnapshot, discountSnapshot, orderId, selectedPaymentMethod, dueDate);
                cart = [];
                renderCart();
                fetchInventory(); // Refresh stock localy
            } else {
                QuadModals.alert("Sale Failed", result.message || "Could not process sale", "error");
            }
        } catch (err) {
            console.error("Checkout Error:", err);
            QuadModals.alert("Network Error", "Could not connect to server", "error");
        } finally {
            isProcessing = false;
            checkoutBtn.disabled = cart.length === 0;
            checkoutBtn.innerHTML = 'CHECKOUT <i class="fa-solid fa-arrow-right"></i>';
        }
    }

    function showSuccessModal(total, customerName, customerPhone, items, subtotal, discount, orderId, paymentMethod, dueDate = null) {
        const modal = document.getElementById('success-modal');
        document.getElementById('success-msg').innerHTML = `Total: <span style="color: var(--primary-color);">₹${total.toFixed(2)}</span>${paymentMethod === 'udhaar' ? `<br><small style="color: var(--text-muted); font-size: 0.8rem;">Due: ${new Date(dueDate).toLocaleDateString()}</small>` : ''}`;
        modal.classList.add('show');
        
        // Refresh user/store data from storage to ensure it's ASAP (in case settings changed)
        const freshUser = JSON.parse(sessionStorage.getItem('currentUser')) || {};
        const store = freshUser.storeId || {};
        const storeName = store.name || 'QuadStock POS';

        const waBtn = document.getElementById('whatsapp-btn');
        const viewUdhaarBtn = document.getElementById('view-udhaar-btn');
        
        if (paymentMethod === 'udhaar') {
            viewUdhaarBtn.style.display = 'block';
            viewUdhaarBtn.onclick = () => {
                window.location.href = '../Udhaar/udhaar.html';
            };
        } else {
            viewUdhaarBtn.style.display = 'none';
        }
        
        if (waBtn) {

            waBtn.style.display = 'block';
            waBtn.onclick = () => {
                generatePDFAndShare(total, customerName, customerPhone, items, subtotal, discount, orderId, storeName, store, paymentMethod, dueDate);
            };
        }

        document.getElementById('new-sale-btn').onclick = () => {
            modal.classList.remove('show');
            const barcodeInput = document.getElementById('barcode-input');
            if (barcodeInput) barcodeInput.focus();
        };
    }

    async function generatePDFAndShare(total, customerName, customerPhone, items, subtotal, discount, orderId, storeName, store, paymentMethod, dueDate = null) {
        const element = document.getElementById('invoice-template');
        element.style.display = 'block'; // Temporarily show it to populate

        // 1. Branding & Header
        const invStoreName = document.getElementById('inv-store-name');
        const invStoreAddress = document.getElementById('inv-store-address');
        const invStorePhone = document.getElementById('inv-store-phone');
        const invGstNumber = document.getElementById('inv-gst-number');
        
        if (store.logoUrl) {
            const logoImg = document.getElementById('inv-logo');
            const logoContainer = document.getElementById('inv-logo-container');
            logoImg.src = store.logoUrl;
            logoContainer.style.display = 'block';
        } else {
            document.getElementById('inv-logo-container').style.display = 'none';
        }

        invStoreName.textContent = storeName.toUpperCase();
        invStoreAddress.textContent = store.address || 'India';
        invStorePhone.textContent = store.phoneNumber || 'N/A';
        invGstNumber.textContent = store.gstNumber || 'N/A';
        
        const invStoreEmail = document.getElementById('inv-store-email');
        if (invStoreEmail) invStoreEmail.textContent = store.email || 'N/A';
        
        const invOwnerName = document.getElementById('inv-owner-name');
        if (invOwnerName) invOwnerName.textContent = store.ownerId?.name || (freshUser.role === 'owner' ? freshUser.name : 'N/A');
        
        const invFooterStoreName = document.getElementById('inv-footer-store-name');
        if (invFooterStoreName) invFooterStoreName.textContent = storeName.toUpperCase();
        
        const invTerms = document.getElementById('inv-terms');
        if (invTerms) invTerms.innerHTML = (store.storeTerms || '1. All sales are final.<br>2. Warranty as per manufacturer.').replace(/\n/g, '<br>');

        // 2. Order, Customer & Date Info
        const orderIdElems = document.querySelectorAll('#inv-order-id');
        const orderIdHeader = document.getElementById('inv-order-id-header');
        const orderIdShort = `#${orderId.toString().slice(-8).toUpperCase()}`;
        
        orderIdElems.forEach(el => el.textContent = orderIdShort);
        if (orderIdHeader) orderIdHeader.textContent = orderIdShort;
        
        document.getElementById('inv-customer-name').textContent = (customerName || 'Walking Customer').toUpperCase();
        document.getElementById('inv-customer-phone').textContent = customerPhone || 'N/A';
        document.getElementById('inv-date').textContent = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
        
        document.getElementById('inv-payment-method').textContent = paymentMethod.toUpperCase();
        
        const invDueContainer = document.getElementById('inv-due-date-container');
        if (paymentMethod === 'udhaar' && dueDate) {
            invDueContainer.style.display = 'block';
            document.getElementById('inv-due-date').textContent = new Date(dueDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
        } else {
            invDueContainer.style.display = 'none';
        }

        // 3. QR Code Logic
        const qrContainer = document.getElementById('inv-qr-container');
        const staticQrImg = document.getElementById('inv-static-qr');
        const dynamicQrImg = document.getElementById('inv-upi-qr');

        staticQrImg.style.display = 'none';
        dynamicQrImg.style.display = 'none';
        qrContainer.style.display = 'none';

        if (store.staticQrUrl) {
            staticQrImg.src = store.staticQrUrl;
            staticQrImg.style.display = 'block';
            qrContainer.style.display = 'block';
            document.getElementById('inv-upi-id-label').textContent = store.upiId || '';
        } else if (store.upiId) {
            const upiUrl = `upi://pay?pa=${store.upiId}&pn=${encodeURIComponent(storeName)}&am=${total.toFixed(2)}&cu=INR`;
            dynamicQrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(upiUrl)}`;
            dynamicQrImg.style.display = 'block';
            qrContainer.style.display = 'block';
            document.getElementById('inv-upi-id-label').textContent = store.upiId;
        }

        // 4. Items List (4 Columns: Item, Description, Price, Total)
        const itemsBody = document.getElementById('inv-items');
        itemsBody.innerHTML = items.map((item, idx) => {
            const hasDiscount = item.discountInfo != null;
            return `
                <tr style="background: ${idx % 2 === 0 ? '#ffffff' : '#f9fafb'};">
                    <td style="padding: 15px 20px; text-align: left; border: 1px solid #e2e8f0; font-weight: 700; color: #1e293b;">
                        ${item.name}
                        ${hasDiscount ? `<br><small style="color: #16a34a; font-weight: 800;">${item.discountInfo.label} Expiry Discount applied</small>` : ''}
                    </td>
                    <td style="padding: 15px 20px; text-align: left; border: 1px solid #e2e8f0; color: #64748b; font-size: 12px;">${item.brand || 'General'} - ${item.category || 'Product'}</td>
                    <td style="padding: 15px 20px; text-align: right; border: 1px solid #e2e8f0; color: #475569; font-weight: 600;">
                        ₹${item.price.toFixed(2)} x ${item.cartQty}
                        ${hasDiscount ? `<br><small style="text-decoration: line-through; opacity: 0.6;">₹${item.originalPrice.toFixed(2)}</small>` : ''}
                    </td>
                    <td style="padding: 15px 20px; text-align: right; border: 1px solid #e2e8f0; font-weight: 800; color: #0f172a;">₹${(item.cartQty * item.price).toFixed(2)}</td>
                </tr>
            `;
        }).join('');

        // 5. Summary
        let discountAmount = 0;
        if (discount.type === 'flat') discountAmount = discount.value;
        else if (discount.type === 'percentage') discountAmount = subtotal * (discount.value / 100);
        if (discountAmount > subtotal) discountAmount = subtotal;

        document.getElementById('inv-subtotal').textContent = `₹${subtotal.toFixed(2)}`;
        const invDiscountRow = document.getElementById('inv-discount-row');
        const invDiscount = document.getElementById('inv-discount');
        
        if (discountAmount > 0) {
            invDiscountRow.style.display = 'table-row';
            invDiscount.textContent = `-₹${discountAmount.toFixed(2)}`;
        } else {
            invDiscountRow.style.display = 'none';
        }
        
        document.getElementById('inv-total').textContent = `₹${total.toFixed(2)}`;


        // 8. Generate PDF
        QuadModals.showToast("Generating Professional Bill...", "info");
        
        const safeName = (customerName || 'Walking_Customer').replace(/[^a-z0-9]/gi, '_');
        const opt = {
            margin: 0,
            filename: `Bill_${orderId.toString().slice(-8).toUpperCase()}_${safeName}.pdf`,
            image: { type: 'jpeg', quality: 1 },
            html2canvas: { scale: 3, useCORS: true, letterRendering: true },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };

        try {
            const pdfBlob = await html2pdf().set(opt).from(element).output('blob');
            element.style.display = 'none';

            // Automatic Download for user reference
            const url = URL.createObjectURL(pdfBlob);
            const link = document.createElement('a');
            link.href = url;
            link.download = opt.filename;
            link.click();

            // 8. Open WhatsApp
            let phone = customerPhone ? customerPhone.replace(/\D/g, '') : '';
            if (phone && phone.length === 10) phone = '91' + phone;

            const message = `Hello ${customerName || 'Customer'}!\n\nThank you for shopping at *${storeName}*.\nYour total bill is *₹${total.toFixed(2)}*${dueDate ? `\n*Due Date:* ${new Date(dueDate).toLocaleDateString()}` : ''}.\n\nYour PDF invoice (#${orderId.toString().slice(-8).toUpperCase()}) has been generated and downloaded. Please attach it here.\n\nRegards,\n${storeName}`;
            
            const waUrl = phone ? 
                `https://wa.me/${phone}?text=${encodeURIComponent(message)}` : 
                `https://wa.me/?text=${encodeURIComponent(message)}`;
                
            QuadModals.showToast("Opening WhatsApp...", "success");
            setTimeout(() => {
                window.open(waUrl, '_blank');
            }, 1200);

        } catch (err) {
            console.error("PDF/WA Error:", err);
            element.style.display = 'none';
            QuadModals.showToast("Failed to generate PDF", "error");
        }
    }

    // Expose to window for inline onclick handlers

    window.changeQty = changeQty;
    window.updateCartQty = updateCartQty;
    window.removeCartItem = removeCartItem;
    window.editLooseCartItem = editLooseCartItem;
});
