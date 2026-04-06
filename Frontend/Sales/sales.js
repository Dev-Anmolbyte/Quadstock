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
    const barcodeInput = document.getElementById('barcode-input');
    const manualSearch = document.getElementById('manual-search');
    const searchResults = document.getElementById('search-results');
    const cartItemsList = document.getElementById('cart-items');
    const cartSubtotal = document.getElementById('cart-subtotal');
    const cartTotal = document.getElementById('cart-total');
    const checkoutBtn = document.getElementById('checkout-btn');
    const clearCartBtn = document.getElementById('clear-cart');

    const looseInputArea = document.getElementById('loose-input-area');
    const looseItemName = document.getElementById('loose-item-name');
    const looseItemPrice = document.getElementById('loose-item-price');
    const looseQtyInput = document.getElementById('loose-qty-input');
    const looseUnitLabel = document.getElementById('loose-unit-label');
    const looseUnitOverlay = document.getElementById('loose-unit-overlay');
    const looseTotalPrice = document.getElementById('loose-total-price');
    const addLooseBtn = document.getElementById('add-loose-to-cart');
    const cancelLooseBtn = document.getElementById('cancel-loose');

    const tabBarcode = document.getElementById('tab-barcode');
    const tabManual = document.getElementById('tab-manual');
    const barcodeView = document.getElementById('barcode-view');
    const manualView = document.getElementById('manual-view');

    // --- 4. Initialization ---
    async function fetchInventory() {
        try {
            const result = await apiRequest('/products/');
            if (result.success) {
                inventory = result.data || [];
                renderQuickGrid();
            }
        } catch (err) {
            console.error("Fetch Error:", err);
        }
    }
    await fetchInventory();

    // --- 5. Tab Switching ---
    tabBarcode.onclick = () => {
        tabBarcode.classList.add('active');
        tabManual.classList.remove('active');
        barcodeView.style.display = 'block';
        manualView.style.display = 'none';
        barcodeInput.focus();
    };

    tabManual.onclick = () => {
        tabManual.classList.add('active');
        tabBarcode.classList.remove('active');
        manualView.style.display = 'block';
        barcodeView.style.display = 'none';
        manualSearch.focus();
    };

    // --- 6. Barcode Scanning ---
    barcodeInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            const code = barcodeInput.value.trim();
            if (code) {
                handleScan(code);
                barcodeInput.value = '';
            }
        }
    });

    function handleScan(code) {
        // Multi-owner safety: inventory is already filtered by ownerId in backend
        const match = inventory.find(p => p.barcode === code && p.productType === 'packed');
        if (match) {
            addToCart(match, 1);
            QuadModals.showToast(`Added: ${match.name}`, 'success');
        } else {
            QuadModals.showToast("Product not found or invalid type", "error");
        }
    }

    // --- 7. Manual Search & Quick Grid ---
    manualSearch.addEventListener('input', (e) => {
        const val = e.target.value.toLowerCase().trim();
        if (val.length < 2) {
            searchResults.style.display = 'none';
            return;
        }

        const matches = inventory.filter(p => 
            p.name.toLowerCase().includes(val) || 
            (p.brand && p.brand.toLowerCase().includes(val))
        ).slice(0, 5);

        renderSearchResults(matches);
    });

    function renderSearchResults(matches) {
        if (matches.length === 0) {
            searchResults.style.display = 'none';
            return;
        }

        searchResults.innerHTML = matches.map(p => `
            <div class="search-item" data-id="${p._id}">
                <div class="item-info">
                    <span class="item-name">${p.name} ${p.productType === 'loose' ? '<i class="fa-solid fa-scale-balanced" title="Loose Item"></i>' : ''}</span>
                    <span class="item-brand">${p.brand || 'No Brand'} • ${p.productType}</span>
                </div>
                <div class="item-price">₹${p.price.toFixed(2)}</div>
            </div>
        `).join('');
        searchResults.style.display = 'block';

        // Attach listeners to search items
        searchResults.querySelectorAll('.search-item').forEach(item => {
            item.onclick = () => {
                const id = item.dataset.id;
                const product = inventory.find(p => p._id === id);
                if (product) selectProduct(product);
                searchResults.style.display = 'none';
                manualSearch.value = '';
            };
        });
    }

    function renderQuickGrid() {
        const grid = document.getElementById('quick-grid');
        if (!grid) return;
        
        // Pick top 8 products (can be logic based on popularity later)
        const commonItems = inventory.slice(0, 8);
        grid.innerHTML = commonItems.map(p => `
            <div class="grid-item" data-id="${p._id}">
                <i class="fa-solid ${p.productType === 'loose' ? 'fa-scale-balanced' : 'fa-box'}"></i>
                <span>${p.name}</span>
            </div>
        `).join('');

        grid.querySelectorAll('.grid-item').forEach(item => {
            item.onclick = () => {
                const product = inventory.find(p => p._id === item.dataset.id);
                if (product) selectProduct(product);
            };
        });
    }

    // --- 8. Product Selection (Packed vs Loose) ---
    function selectProduct(product) {
        if (product.productType === 'loose') {
            activeProduct = product;
            showLooseArea(product);
        } else {
            addToCart(product, 1);
            QuadModals.showToast(`Added: ${product.name}`, 'success');
        }
    }

    function showLooseArea(item) {
        looseItemName.textContent = item.name;
        const unit = item.unit || 'kg';
        looseItemPrice.textContent = `₹${item.price.toFixed(2)} / ${unit}`;
        looseUnitLabel.textContent = unit;
        looseUnitOverlay.textContent = unit;
        looseQtyInput.value = '';
        looseTotalPrice.textContent = '₹0.00';
        looseInputArea.style.display = 'block';
        looseQtyInput.focus();
    }

    looseQtyInput.addEventListener('input', () => {
        if (!activeProduct) return;
        const qty = parseFloat(looseQtyInput.value) || 0;
        const total = qty * activeProduct.price;
        looseTotalPrice.textContent = `₹${total.toFixed(2)}`;
    });

    addLooseBtn.onclick = () => {
        const qty = parseFloat(looseQtyInput.value);
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
        looseInputArea.style.display = 'none';
        activeProduct = null;
    };

    cancelLooseBtn.onclick = () => {
        looseInputArea.style.display = 'none';
        activeProduct = null;
    };

    // --- 9. Cart Management ---
    function addToCart(product, qty) {
        const existing = cart.find(item => item._id === product._id);
        if (existing) {
            if (product.productType === 'packed') {
                existing.cartQty += qty;
            } else {
                existing.cartQty = qty; // Loose items usually replaced in selection or we can add
            }
        } else {
            cart.push({
                ...product,
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

        cartItemsList.innerHTML = cart.map((item, index) => {
            const itemTotal = item.cartQty * item.price;
            return `
                <div class="cart-item">
                    <div class="cart-item-info">
                        <span class="cart-item-name">${item.name}</span>
                        <span class="cart-item-meta">₹${item.price.toFixed(2)} x ${item.cartQty} ${item.unit}</span>
                    </div>
                    <div class="cart-item-controls">
                        ${item.productType === 'packed' ? `
                            <button class="btn-qty" onclick="changeQty(${index}, -1)"><i class="fa-solid fa-minus"></i></button>
                            <button class="btn-qty" onclick="changeQty(${index}, 1)"><i class="fa-solid fa-plus"></i></button>
                        ` : `
                            <button class="btn-qty" onclick="removeCartItem(${index})"><i class="fa-solid fa-trash"></i></button>
                        `}
                    </div>
                    <div class="cart-item-total">₹${itemTotal.toFixed(2)}</div>
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

    window.removeCartItem = (index) => {
        cart.splice(index, 1);
        renderCart();
    };

    function updateSummary(total) {
        cartSubtotal.textContent = `₹${total.toFixed(2)}`;
        cartTotal.textContent = `₹${total.toFixed(2)}`;
    }

    clearCartBtn.onclick = () => {
        cart = [];
        renderCart();
    };

    // --- 10. Checkout Flow ---
    checkoutBtn.onclick = async () => {
        if (cart.length === 0 || isProcessing) return;

        const confirmed = await QuadModals.confirm(
            "Confirm Sale",
            `Total Payable: ₹${cart.reduce((s, i) => s + (i.cartQty * i.price), 0).toFixed(2)}`,
            { confirmText: 'Process Payment', confirmClass: 'btn-primary' }
        );

        if (!confirmed) return;

        try {
            isProcessing = true;
            checkoutBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Processing...';

            const saleData = {
                items: cart.map(item => ({
                    productId: item._id,
                    productType: item.productType,
                    quantity: item.cartQty,
                    price: item.price,
                    total: item.cartQty * item.price,
                    unit: item.unit
                })),
                total: cart.reduce((sum, item) => sum + (item.cartQty * item.price), 0),
                paymentMethod: 'cash' // Default for now
            };

            const result = await apiRequest('/sales/', {
                method: 'POST',
                body: JSON.stringify(saleData)
            });

            if (result.success) {
                showSuccessModal(saleData.total);
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
            checkoutBtn.innerHTML = '<span>Confirm Sale</span> <i class="fa-solid fa-arrow-right"></i>';
        }
    };

    function showSuccessModal(total) {
        const modal = document.getElementById('success-modal');
        document.getElementById('success-msg').textContent = `Total: ₹${total.toFixed(2)}`;
        modal.style.display = 'flex';
        
        document.getElementById('new-sale-btn').onclick = () => {
            modal.style.display = 'none';
            barcodeInput.focus();
        };
    }

    // Global Click Listener to Close Search Dropdown
    window.addEventListener('click', (e) => {
        if (!manualSearch.contains(e.target) && !searchResults.contains(e.target)) {
            searchResults.style.display = 'none';
        }
    });
});
