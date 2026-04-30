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
    const categoryBtns = document.querySelectorAll('.cat-btn');
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
    const maximizeCartBtn = document.getElementById('maximize-cart');
    const maximizeCartModal = document.getElementById('maximize-cart-modal');
    const closeMaximizeCart = document.getElementById('close-maximize-cart');
    const maxCartItemsList = document.getElementById('max-cart-items');
    const maxCartCount = document.getElementById('max-cart-count');
    const maxCartTotal = document.getElementById('max-cart-total');

    const looseModal = document.getElementById('loose-modal');
    const looseModalName = document.getElementById('loose-modal-name');
    const looseModalPriceLabel = document.getElementById('loose-modal-price-label');
    const looseModalQty = document.getElementById('loose-modal-qty');
    const looseModalUnit = document.getElementById('loose-modal-unit');
    const looseModalTotal = document.getElementById('loose-modal-total');
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
    const paymentBtns = document.querySelectorAll('.payment-btn');

    let selectedType = 'all'; // 'all', 'packed', 'loose'
    let selectedCategory = 'all'; // 'all' or category name
    let selectedPaymentMethod = 'cash';

    // --- Helper: Calculate Effective Price (Smart Expiry Discounts) ---
    function getEffectivePrice(p) {
        const originalPrice = p.price || p.pricePerUnit || 0;
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

        // 1. Filter by Product Type (Packed/Loose)
        if (selectedType !== 'all') {
            filtered = filtered.filter(p => p.productType === selectedType);
        }

        // 2. Filter by Category
        if (selectedCategory !== 'all') {
            filtered = filtered.filter(p => 
                (p.categoryName && p.categoryName.toLowerCase() === selectedCategory) || 
                (p.category && p.category.toLowerCase() === selectedCategory)
            );
        }

        // 3. Search Query
        if (query) {
            filtered = filtered.filter(p => 
                p.name.toLowerCase().includes(query) || 
                (p.brand && p.brand.toLowerCase().includes(query)) ||
                (p.barcode && p.barcode.includes(query))
            );
        }

        // 4. Sort: In-stock items first
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
            const stockLabel = p.productType === 'packed' ? `${stockQty} pcs left` : `${stockQty} ${p.unit || 'kg'} left`;
            let stockClass = 'stock-normal';
            let cardClass = '';
            
            if (stockQty <= 0) {
                stockClass = 'stock-out';
                cardClass = 'out-of-stock';
            } else if (stockQty <= 5) {
                stockClass = 'stock-low';
            }

            const { originalPrice, finalPrice, discountInfo } = getEffectivePrice(p);
            const priceDisplay = discountInfo 
                ? `<div class="v-product-price">
                    <span class="final-price">₹${finalPrice.toFixed(2)}</span>
                    <span class="original-price" style="text-decoration: line-through; font-size: 0.75rem; opacity: 0.6; margin-left: 4px;">₹${originalPrice.toFixed(2)}</span>
                    <span class="discount-tag" style="background: var(--c-green-bg); color: var(--c-green-text); font-size: 0.65rem; padding: 1px 4px; border-radius: 4px; margin-left: 4px; font-weight: 800;">${discountInfo.label}</span>
                   </div>`
                : `<div class="v-product-price">₹${originalPrice.toFixed(2)}${p.productType === 'loose' ? `/${p.unit || 'kg'}` : ''}</div>`;

            const mfdDate = p.mfd ? new Date(p.mfd).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }) : 'N/A';
            const expDate = p.exp ? new Date(p.exp).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }) : 'N/A';

            return `
                <div class="v-product-card ${cardClass}" data-id="${p._id}">
                    <div class="v-product-img">
                        <img src="${imgSrc}" alt="${p.name}" loading="lazy" onerror="this.src='https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=400'">
                        ${discountInfo ? `
                            <span class="badge-expiry-discount" style="position: absolute; top: 8px; right: 8px; background: #ef4444; color: white; font-size: 10px; font-weight: 900; padding: 2px 6px; border-radius: 6px; box-shadow: 0 4px 10px rgba(239, 68, 68, 0.3); text-transform: uppercase;">
                                ${p.discountReason && p.discountReason.toLowerCase().includes('stock') ? 'STOCK SALE' : 
                                  p.discountReason && p.discountReason.toLowerCase().includes('expiry') ? 'EXPIRY SALE' : 
                                  p.discountReason ? p.discountReason.toUpperCase() : 'PROMO SALE'}
                            </span>
                        ` : ''}
                    </div>
                    <div class="v-product-info">
                        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 2px;">
                            <div class="v-product-brand" style="font-size: 0.7rem; font-weight: 800; color: var(--primary-color); text-transform: uppercase; letter-spacing: 0.5px;">${p.brand || 'No Brand'}</div>
                            <span class="badge ${p.productType === 'loose' ? 'badge-loose' : 'badge-packed'}" style="position: static; font-size: 9px; padding: 1px 4px; border-radius: 4px;">
                                ${p.productType === 'loose' ? 'LOOSE' : 'PACKED'}
                            </span>
                        </div>
                        <h4 class="v-product-name" title="${p.name}" style="margin-bottom: 8px;">${p.name}</h4>
                        
                        <div class="v-product-details" style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-bottom: 12px; font-size: 0.8rem; font-weight: 600;">
                            <div title="Batch Number" style="grid-column: span 2; background: rgba(var(--primary-rgb), 0.05); padding: 6px 10px; border-radius: 8px; color: var(--primary-color); border: 1px solid rgba(var(--primary-rgb), 0.1); display: flex; align-items: center; gap: 8px;">
                                <i class="fa-solid fa-hashtag" style="font-size: 0.85rem;"></i>
                                <span style="letter-spacing: 0.5px;">${p.batchNumber || 'N/A'}</span>
                            </div>
                            <div title="Stock Quantity" class="${stockClass}" style="background: rgba(0,0,0,0.03); padding: 5px 8px; border-radius: 6px;">
                                <i class="fa-solid fa-boxes-stacked" style="width: 14px; color: var(--primary-color);"></i> ${stockQty} ${p.unit || 'pcs'}
                            </div>
                            <div title="MFD" style="background: rgba(0,0,0,0.03); padding: 5px 8px; border-radius: 6px; color: var(--text-secondary);">
                                <i class="fa-solid fa-industry" style="width: 14px; color: var(--primary-color);"></i> <span style="font-size: 0.65rem; opacity: 0.7;">M:</span> ${mfdDate}
                            </div>
                            <div title="Expiry" style="grid-column: span 2; background: ${p.exp && new Date(p.exp) < new Date() ? 'rgba(239, 68, 68, 0.1)' : 'rgba(0,0,0,0.03)'}; padding: 6px 10px; border-radius: 8px; color: ${p.exp && new Date(p.exp) < new Date() ? '#ef4444' : 'var(--text-secondary)'}; border: 1px solid ${p.exp && new Date(p.exp) < new Date() ? 'rgba(239, 68, 68, 0.2)' : 'transparent'};">
                                <i class="fa-solid fa-calendar-xmark" style="width: 14px; color: ${p.exp && new Date(p.exp) < new Date() ? '#ef4444' : 'var(--primary-color)'};"></i> <span style="font-size: 0.7rem; opacity: 0.8;">EXPIRY DATE:</span> <span style="font-weight: 800;">${expDate}</span>
                            </div>
                        </div>

                        <div class="v-product-bottom" style="border-top: 1px solid var(--border-color); padding-top: 8px;">
                            ${priceDisplay}
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
                    if (!p.productType) {
                        p.productType = "packed";
                    }
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
        if (qty > (activeProduct.stockQuantity || 0)) {
            QuadModals.alert("Stock Error", `Available stock: ${activeProduct.stockQuantity} ${activeProduct.unit}`, "error");
            return;
        }

        addToCart(activeProduct, qty);
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
                    <i class="fa-solid fa-cart-shopping"></i>
                    <p>Cart is empty</p>
                </div>
            `;
            updateSummary(0);
            checkoutBtn.classList.add('disabled');
            checkoutBtn.disabled = true;
            return;
        }

        cartItemCount.textContent = cart.length;

        cartItemsList.innerHTML = cart.map((item, index) => {
            const itemTotal = item.cartQty * item.price;
            return `
                <div class="cart-item-row">
                    <div class="cart-item-main">
                        <span class="cart-item-name">
                            ${item.name} 
                            <span class="badge ${item.productType === 'loose' ? 'badge-loose' : 'badge-packed'}">
                                ${item.productType === 'loose' ? 'LOOSE' : 'PACKED'}
                            </span>
                        </span>
                        <span class="cart-item-total">₹${itemTotal.toFixed(2)}</span>
                    </div>
                    
                    ${item.productType === 'packed' ? `
                    <div class="cart-item-sub">
                        <div class="qty-control">
                            <span>Qty:</span>
                            <div class="qty-btns">
                                <button onclick="changeQty(${index}, -1)">-</button>
                                <input type="number" class="qty-val" value="${item.cartQty}" min="1" onchange="updateCartQty(${index}, this.value)">
                                <button onclick="changeQty(${index}, 1)">+</button>
                            </div>
                        </div>
                        <span class="item-rate">Price: ₹${item.price.toFixed(2)}</span>
                    </div>
                    <div class="cart-item-actions">
                        <button onclick="removeCartItem(${index})" class="text-red">
                            <i class="fa-solid fa-trash"></i> Remove
                        </button>
                    </div>
                    ` : `
                    <div class="cart-item-sub">
                        <span>Qty: <strong class="text-primary">${item.cartQty} ${item.unit || 'kg'}</strong></span>
                        <span class="item-rate">Rate: ₹${item.price.toFixed(2)}/${item.unit || 'kg'}</span>
                    </div>
                    <div class="cart-item-actions">
                        <button onclick="editLooseCartItem(${index})" class="text-primary">
                            <i class="fa-solid fa-pen"></i> Edit
                        </button>
                        <button onclick="removeCartItem(${index})" class="text-red">
                            <i class="fa-solid fa-trash"></i> Remove
                        </button>
                    </div>
                    `}
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
            if (delta > 0 && newQty > (baseProduct.quantity || 0)) {
                QuadModals.showToast("No more stock available", "error");
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
        if (newQty > (baseProduct.quantity || 0)) {
            QuadModals.showToast(`Max stock: ${baseProduct.quantity}`, "error");
            newQty = baseProduct.quantity;
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
        return total;
    }

    clearCartBtn.onclick = () => {
        cart = [];
        renderCart();
    };

    window.maximizeCartModal = maximizeCartModal;

    maximizeCartBtn.onclick = () => {
        if (cart.length === 0) {
            QuadModals.showToast("Cart is empty", "info");
            return;
        }
        renderMaximizedCart();
        window.maximizeCartModal.classList.add('show');
    };

    closeMaximizeCart.onclick = () => {
        window.maximizeCartModal.classList.remove('show');
    };

    const maxCheckoutBtn = document.getElementById('max-checkout-btn');
    
    maxCheckoutBtn.onclick = () => {
        window.maximizeCartModal.classList.remove('show');
        checkoutBtn.click();
    };

    function renderMaximizedCart() {
        maxCartCount.textContent = cart.length;
        const subtotal = cart.reduce((sum, item) => sum + (item.cartQty * item.price), 0);
        
        let discountAmount = 0;
        if (currentDiscount.type === 'flat') {
            discountAmount = currentDiscount.value;
        } else if (currentDiscount.type === 'percentage') {
            discountAmount = subtotal * (currentDiscount.value / 100);
        }
        if (discountAmount > subtotal) discountAmount = subtotal;
        const finalTotal = subtotal - discountAmount;
        
        maxCartTotal.textContent = `₹${finalTotal.toFixed(2)}`;

        if (cart.length === 0) {
            maxCartItemsList.innerHTML = '<div style="text-align:center; padding: 3rem; color: var(--text-secondary);"><i class="fa-solid fa-cart-arrow-down" style="font-size: 3rem; margin-bottom: 1rem;"></i><p>Your cart is empty</p></div>';
            return;
        }

        maxCartItemsList.innerHTML = cart.map((item, index) => {
            const itemTotal = item.cartQty * item.price;
            const mfdDate = item.mfd ? new Date(item.mfd).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A';
            const expDate = item.exp ? new Date(item.exp).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A';

            return `
                <div class="cart-item-row" style="margin-bottom: 1rem; padding: 1.5rem; border-left: 5px solid var(--primary-color); display: flex; justify-content: space-between; align-items: center; background: var(--bg-card); border-radius: 0 16px 16px 0;">
                    <div style="display: flex; align-items: center; gap: 2rem; flex: 1;">
                        <span style="font-size: 1.25rem; font-weight: 800; color: var(--text-muted); min-width: 40px;">${index + 1}.</span>
                        <div style="flex: 1;">
                            <div style="font-size: 1.2rem; font-weight: 700; color: var(--text-primary); margin-bottom: 0.25rem;">${item.name}</div>
                            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.75rem; font-size: 0.8rem; color: var(--text-secondary);">
                                <span><i class="fa-solid fa-tag" style="color: var(--primary-color);"></i> <b>Brand:</b> ${item.brand || 'N/A'}</span>
                                <span><i class="fa-solid fa-hashtag"></i> <b>Batch:</b> ${item.batchNumber || 'N/A'}</span>
                                <span><i class="fa-solid fa-industry"></i> <b>MFD:</b> ${mfdDate}</span>
                                <span style="color: ${item.exp && new Date(item.exp) < new Date() ? '#ef4444' : 'inherit'}"><i class="fa-solid fa-calendar-xmark"></i> <b>EXP:</b> ${expDate}</span>
                            </div>
                        </div>
                    </div>

                    <div style="display: flex; align-items: center; gap: 3rem;">
                        <div style="display: flex; flex-direction: column; align-items: center; gap: 0.5rem;">
                            <span style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase;">Adjust Quantity</span>
                            ${item.productType === 'packed' ? `
                            <div class="qty-btns" style="transform: scale(1.1);">
                                <button onclick="changeQty(${index}, -1); renderMaximizedCart();">-</button>
                                <input type="number" class="qty-val" value="${item.cartQty}" min="1" style="width: 50px; text-align: center;" onchange="updateCartQty(${index}, this.value); renderMaximizedCart();">
                                <button onclick="changeQty(${index}, 1); renderMaximizedCart();">+</button>
                            </div>
                            ` : `
                            <button onclick="editLooseCartItem(${index}); maximizeCartModal.classList.remove('show');" class="btn-secondary small-btn" style="padding: 0.5rem 1rem;">
                                Edit: ${item.cartQty} ${item.unit || 'kg'}
                            </button>
                            `}
                        </div>

                        <div style="text-align: right; min-width: 120px;">
                            <div style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 2px;">Item Subtotal</div>
                            <div style="font-size: 1.35rem; font-weight: 900; color: var(--primary-color);">₹${itemTotal.toFixed(2)}</div>
                            <div style="font-size: 0.85rem; color: var(--text-secondary);">₹${item.price.toFixed(2)} per ${item.productType === 'loose' ? (item.unit || 'kg') : 'unit'}</div>
                        </div>

                        <button onclick="removeCartItem(${index}); renderMaximizedCart();" class="btn-clear-cart" style="background: rgba(239, 68, 68, 0.1); color: #ef4444; border-color: rgba(239, 68, 68, 0.2);">
                            <i class="fa-solid fa-trash-can"></i>
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    }

    const customerModal = document.getElementById('customer-modal');
    const customerNameInput = document.getElementById('customer-name');
    const customerPhoneInput = document.getElementById('customer-phone');

    checkoutBtn.onclick = () => {
        if (cart.length === 0) {
            QuadModals.showToast("Cart is empty", "error");
            return;
        }
        if (isProcessing) return;

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
        
        // If Udhaar, validation
        if (selectedPaymentMethod === 'udhaar') {
            if (!customerNameInput.value.trim() || !customerPhoneInput.value.trim()) {
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
        } else if (store.upiId) {
            const upiUrl = `upi://pay?pa=${store.upiId}&pn=${encodeURIComponent(storeName)}&am=${total.toFixed(2)}&cu=INR`;
            dynamicQrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(upiUrl)}`;
            dynamicQrImg.style.display = 'block';
            qrContainer.style.display = 'block';
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
        
        const opt = {
            margin: 0,
            filename: `Invoice_${orderId}.pdf`,
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
    window.renderMaximizedCart = renderMaximizedCart;
    window.changeQty = changeQty;
    window.removeCartItem = removeCartItem;
    window.editLooseCartItem = editLooseCartItem;
});
