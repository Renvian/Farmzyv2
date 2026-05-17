document.addEventListener('DOMContentLoaded', () => {
    const path = window.location.pathname;
    
    // Page Routing Logic
    if (path.includes('home.html')) {
        checkAuth('user').then(() => {
            loadCrops();
            loadUserOrders();
        });
    } else if (path.includes('crop.html')) {
        const urlParams = new URLSearchParams(window.location.search);
        const cropId = urlParams.get('id');
        if (cropId) {
            checkAuth('user').then(() => {
                loadCropDetails(cropId);
            });
        } else {
            window.location.href = 'home.html';
        }
    }
});

// Helper: Calculate Freshness Percentage
function calculateFreshness(deadline) {
    const now = new Date();
    const expiry = new Date(deadline);
    
    // Assume a 7-day total lifespan for percentage calculation if not stored
    // For this prototype, we'll just calculate based on days left relative to a max of 7 days
    const totalLifespanMs = 7 * 24 * 60 * 60 * 1000;
    const timeLeftMs = expiry - now;
    
    if (timeLeftMs <= 0) return 0;
    
    let percentage = Math.round((timeLeftMs / totalLifespanMs) * 100);
    if (percentage > 100) percentage = 100;
    
    return percentage;
}

function getFreshnessColor(percentage) {
    if (percentage > 60) return 'var(--success-color)';
    if (percentage > 25) return 'var(--warning-color)';
    return 'var(--danger-color)';
}

// 1. Load Crops
async function loadCrops() {
    const now = new Date().toISOString();
    
    const container = document.getElementById('crop-list');
    if (!container) return;
    
    // Show skeleton loaders
    container.innerHTML = `
        <div class="card skeleton">
            <div class="skeleton-img"></div>
            <div class="card-content"><div class="skeleton-text"></div><div class="skeleton-text short"></div></div>
        </div>
        <div class="card skeleton">
            <div class="skeleton-img"></div>
            <div class="card-content"><div class="skeleton-text"></div><div class="skeleton-text short"></div></div>
        </div>
        <div class="card skeleton">
            <div class="skeleton-img"></div>
            <div class="card-content"><div class="skeleton-text"></div><div class="skeleton-text short"></div></div>
        </div>
    `;

    const { data: crops, error } = await _supabase
        .from('crops')
        .select('*')
        .gt('quantity', 0)
        .gt('freshness_deadline', now);

    if (error) {
        container.innerHTML = '<p class="text-danger">Error loading crops.</p>';
        return;
    }

    if (!crops || crops.length === 0) {
        container.innerHTML = '<p class="text-muted">No fresh crops available right now.</p>';
        return;
    }

    container.innerHTML = '';

    crops.forEach((crop, index) => {
        const freshnessPct = calculateFreshness(crop.freshness_deadline);
        const freshnessColor = getFreshnessColor(freshnessPct);
        
        // Ensure crop object is safely passed to onclick
        const cropJson = JSON.stringify(crop).replace(/"/g, '&quot;');

        const div = document.createElement('div');
        div.className = 'card';
        div.style.animationDelay = `${index * 0.1}s`;
        div.style.animation = `slideDown 0.5s ease forwards`;
        div.style.opacity = '0';
        
        let statusBadgeClass = 'badge-neutral';
        if (crop.status === 'available') statusBadgeClass = 'badge-success';
        if (crop.status === 'coming_soon') statusBadgeClass = 'badge-warning';

        div.innerHTML = `
            <img src="${crop.image_url}" class="crop-img" onclick="window.location.href='crop.html?id=${crop.id}'" style="cursor: pointer;">
            <div class="card-content">
                <div class="flex justify-between items-center mb-2">
                    <h3 style="margin: 0;">${crop.name}</h3>
                    <span class="badge ${statusBadgeClass}">${crop.status.replace('_', ' ')}</span>
                </div>
                
                <p class="font-bold text-lg">₹${crop.price} <span class="text-sm text-muted">/ ${crop.unit}</span></p>
                <p class="text-sm text-muted mb-4">Qty left: ${crop.quantity} ${crop.unit}</p>
                
                <div class="freshness-container">
                    <div class="freshness-header">
                        <span>Freshness</span>
                        <span style="color: ${freshnessColor}">${freshnessPct}%</span>
                    </div>
                    <div class="freshness-track">
                        <div class="freshness-fill" style="width: 0%; background: ${freshnessColor};" data-width="${freshnessPct}%"></div>
                    </div>
                </div>
                
                <div class="flex gap-2 mt-4">
                    <button class="outline" onclick="window.location.href='crop.html?id=${crop.id}'">View</button>
                    <button onclick="Cart.addItem(${cropJson})">Add to Cart</button>
                </div>
            </div>
        `;
        container.appendChild(div);
    });

    // Animate freshness bars
    setTimeout(() => {
        document.querySelectorAll('.freshness-fill').forEach(fill => {
            fill.style.width = fill.getAttribute('data-width');
        });
    }, 100);
}

// 2. Load Crop Details
async function loadCropDetails(id) {
    const { data: crop, error } = await _supabase
        .from('crops')
        .select('*')
        .eq('id', id)
        .single();
    
    const div = document.getElementById('crop-details');
    if (!div) return;

    if (error || !crop) {
        div.innerHTML = `<p class="text-danger">Crop not found.</p>`;
        return;
    }

    const freshnessPct = calculateFreshness(crop.freshness_deadline);
    const freshnessColor = getFreshnessColor(freshnessPct);
    const deadline = new Date(crop.freshness_deadline);
    
    const cropJson = JSON.stringify(crop).replace(/"/g, '&quot;');
    
    div.innerHTML = `
        <img src="${crop.image_url}" class="crop-img" style="height: 300px; border-radius: var(--border-radius-lg); margin-bottom: var(--spacing-md);">
        <div class="flex justify-between items-center mb-2">
            <h2 style="margin: 0;">${crop.name}</h2>
            <span class="badge badge-success">${crop.status.replace('_', ' ')}</span>
        </div>
        
        <p class="text-muted mb-4">Farm-fresh produce sourced directly from local farmers.</p>
        
        <div class="flex justify-between mb-4">
            <div>
                <p class="text-sm text-muted">Price</p>
                <p class="font-bold" style="font-size: 1.5rem;">₹${crop.price} <span class="text-sm text-muted">/ ${crop.unit}</span></p>
            </div>
            <div class="text-right">
                <p class="text-sm text-muted">Available</p>
                <p class="font-bold" style="font-size: 1.5rem;">${crop.quantity} ${crop.unit}</p>
            </div>
        </div>
        
        <div class="freshness-container mb-4">
            <div class="freshness-header">
                <span>Current Freshness</span>
                <span style="color: ${freshnessColor}; font-weight: bold;">${freshnessPct}%</span>
            </div>
            <div class="freshness-track">
                <div class="freshness-fill" style="width: ${freshnessPct}%; background: ${freshnessColor};"></div>
            </div>
            <p class="text-sm text-muted mt-2" style="color: var(--danger-color);">Best before: ${deadline.toLocaleDateString()} ${deadline.toLocaleTimeString()}</p>
        </div>
        
        <hr>
        
        <h3 class="mb-2">Order Options</h3>
        <label>Quantity (${crop.unit}):</label>
        <input type="number" id="order-qty" max="${crop.quantity}" min="1" value="1" oninput="updateTotal(${crop.price})">
        
        <label>Delivery Address:</label>
        <input type="text" id="order-addr" value="${userProfile ? userProfile.address : ''}">
        
        <div class="flex justify-between items-center mt-4 mb-4">
            <span class="font-bold">Total Price:</span>
            <span class="font-bold" style="font-size: 1.5rem;">₹<span id="total-price">${crop.price}</span></span>
        </div>
        
        <div class="flex gap-4">
            <button class="outline" onclick="addToCartFromDetail(${cropJson})">Add to Cart</button>
            <button onclick="placeOrder(${cropJson})">Buy Now</button>
        </div>
    `;
}

function addToCartFromDetail(crop) {
    const qty = parseInt(document.getElementById('order-qty').value);
    if (!Validation.isPositiveNumber(qty)) {
        showToast("Invalid quantity", "error");
        return;
    }
    if (qty > crop.quantity) {
        showToast("Not enough stock available", "error");
        return;
    }
    Cart.addItem(crop, qty);
}

// 3. Helper for Price Calculation
function updateTotal(price) {
    const qtyInput = document.getElementById('order-qty');
    const qty = parseInt(qtyInput.value) || 0;
    
    // Prevent negative
    if (qty < 0) qtyInput.value = 0;
    
    document.getElementById('total-price').innerText = (qty * price).toLocaleString();
}

// 4. Place Order Logic (Direct Buy)
async function placeOrder(crop) {
    const qty = parseInt(document.getElementById('order-qty').value);
    const address = document.getElementById('order-addr').value;

    if (!Validation.isPositiveNumber(qty)) return showToast("Please enter a valid quantity", "error");
    if (qty > crop.quantity) return showToast("Not enough stock!", "error");
    if (!address.trim()) return showToast("Please enter a delivery address", "error");

    showModal("Confirm Order", `<p>Are you sure you want to buy <strong>${qty}</strong> units for <strong>₹${(qty * crop.price).toLocaleString()}</strong>?</p>`, async () => {
        
        const { error: orderError } = await _supabase.from('orders').insert([{
            user_id: currentUser.id,
            crop_id: crop.id,
            quantity: qty,
            total_price: qty * crop.price,
            address: address,
            status: 'pending', // Changed from placed to pending
            snapshot_name: crop.name,
            snapshot_unit: crop.unit,
            snapshot_image: crop.image_url
        }]);

        if (orderError) return showToast(orderError.message, "error");

        // Update Stock
        await _supabase.from('crops').update({ quantity: crop.quantity - qty }).eq('id', crop.id);
        
        showToast("Order Placed Successfully!", "success");
        setTimeout(() => window.location.href = 'home.html', 1500);
    });
}

// 5. Order History
async function loadUserOrders() {
    const { data: { session } } = await _supabase.auth.getSession();
    if (!session) return;

    const list = document.getElementById('user-order-history');
    if (!list) return;

    list.innerHTML = `
        <div class="card skeleton"><div class="card-content"><div class="skeleton-text"></div></div></div>
    `;

    const { data: orders, error } = await _supabase
        .from('orders')
        .select(`id, quantity, total_price, status, created_at, address, snapshot_name, snapshot_unit, snapshot_image, crops ( name, unit, image_url )`)
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });

    if (error || !orders || orders.length === 0) {
        list.innerHTML = '<p class="text-muted">No orders found.</p>';
        return;
    }

    list.innerHTML = '';

    orders.forEach((o, index) => {
        let badgeClass = 'badge-neutral';
        if (o.status === 'delivered') badgeClass = 'badge-success';
        if (o.status === 'cancelled') badgeClass = 'badge-danger';
        if (o.status === 'confirmed' || o.status === 'approved') badgeClass = 'badge-info';
        if (o.status === 'pending') badgeClass = 'badge-warning';

        const d = document.createElement('div');
        d.className = `card ${o.status === 'cancelled' ? 'opacity-50' : ''}`;
        d.style.animationDelay = `${index * 0.1}s`;
        d.style.animation = `slideDown 0.5s ease forwards`;
        d.style.opacity = '0';
        
        const isPending = o.status === 'pending';
        
        // Simple timeline representation
        const isDelivered = o.status === 'delivered';
        const isConfirmed = o.status === 'confirmed' || o.status === 'approved' || isDelivered;
        const isCancelled = o.status === 'cancelled';
        
        let timelineHtml = '';
        if (!isCancelled) {
            timelineHtml = `
                <div class="timeline mt-4">
                    <div class="timeline-step ${isPending || isConfirmed ? 'completed' : 'active'}">
                        <span class="text-sm ${isPending && !isConfirmed ? 'font-bold' : ''}">Order Pending</span>
                    </div>
                    <div class="timeline-step ${isConfirmed ? 'completed' : (isPending ? '' : 'active')}">
                        <span class="text-sm ${isConfirmed && !isDelivered ? 'font-bold' : ''}">Order Confirmed</span>
                    </div>
                    <div class="timeline-step ${isDelivered ? 'completed font-bold' : ''}">
                        <span class="text-sm">Delivered</span>
                    </div>
                </div>
            `;
        } else {
            timelineHtml = `
                <div class="timeline mt-4">
                    <div class="timeline-step cancelled">
                        <span class="text-sm font-bold text-danger">Order Cancelled</span>
                    </div>
                </div>
            `;
        }

        d.innerHTML = `
            <div class="card-content">
                <div class="flex justify-between items-start mb-2">
                    <div class="flex gap-4 items-center">
                        <img src="${o.snapshot_image || (o.crops ? o.crops.image_url : '')}" style="width: 50px; height: 50px; border-radius: var(--border-radius-sm); object-fit: cover;">
                        <div>
                            <h3 style="margin: 0;">${o.snapshot_name || (o.crops ? o.crops.name : 'Deleted Crop')}</h3>
                            <p class="text-sm text-muted">${new Date(o.created_at).toLocaleDateString()}</p>
                        </div>
                    </div>
                    <span class="badge ${badgeClass}">${o.status.toUpperCase()}</span>
                </div>
                
                <p class="mt-2"><strong>${o.quantity} ${o.snapshot_unit || (o.crops ? o.crops.unit : 'units')}</strong> for <strong>₹${o.total_price}</strong></p>
                <p class="text-sm text-muted mt-2">📍 ${o.address}</p>
                
                ${timelineHtml}
                
                ${isPending ? `<button class="danger outline mt-4" onclick="cancelOrder(${o.id})">Cancel Order</button>` : ''}
            </div>
        `;
        list.appendChild(d);
    });
}

// 6. Cancel Order
function cancelOrder(orderId) {
    showModal("Cancel Order", "<p>Are you sure you want to cancel this order? This cannot be undone.</p>", async () => {
        // Fetch order to return quantity to inventory
        const { data: order } = await _supabase.from('orders').select('crop_id, quantity').eq('id', orderId).single();
        
        if (order) {
            // Restore inventory
            const { data: crop } = await _supabase.from('crops').select('quantity').eq('id', order.crop_id).single();
            if (crop) {
                await _supabase.from('crops').update({ quantity: crop.quantity + order.quantity }).eq('id', order.crop_id);
            }
        }
        
        const { error } = await _supabase.from('orders').update({ status: 'cancelled' }).eq('id', orderId);
        
        if (error) {
            showToast(error.message, "error");
        } else {
            showToast("Order cancelled successfully", "success");
            loadUserOrders(); // Reload orders
        }
    }, "Yes, Cancel Order", "Keep Order");
}

// 7. Cart UI Logic
function toggleCart() {
    const overlay = document.getElementById('cart-overlay');
    const drawer = document.getElementById('cart-drawer');
    
    if (drawer.classList.contains('active')) {
        overlay.classList.remove('active');
        drawer.classList.remove('active');
    } else {
        renderCart();
        overlay.classList.add('active');
        drawer.classList.add('active');
    }
}
window.toggleCart = toggleCart;

function renderCart() {
    const body = document.getElementById('cart-body');
    const totalEl = document.getElementById('cart-total');
    const items = Cart.getItems();
    
    if (items.length === 0) {
        body.innerHTML = `
            <div class="flex flex-col items-center justify-center" style="height: 100%; text-align: center;">
                <span style="font-size: 3rem; margin-bottom: 16px;">🛒</span>
                <p class="text-muted">Your cart is empty.</p>
                <button class="outline mt-4" onclick="toggleCart()" style="width: auto;">Continue Shopping</button>
            </div>
        `;
        totalEl.innerText = '₹0';
        return;
    }
    
    let html = '';
    items.forEach(item => {
        html += `
            <div class="cart-item">
                <img src="${item.image_url}" class="cart-item-img">
                <div class="flex-1" style="flex: 1;">
                    <div class="flex justify-between">
                        <h4 style="margin: 0;">${item.name}</h4>
                        <span class="font-bold">₹${(item.price * item.cartQty).toLocaleString()}</span>
                    </div>
                    <p class="text-sm text-muted">₹${item.price} / ${item.unit}</p>
                    <div class="flex justify-between items-center mt-2">
                        <div class="qty-controls">
                            <button class="qty-btn" onclick="updateCartItemQty(${item.id}, ${item.cartQty - 1})">-</button>
                            <span style="min-width: 20px; text-align: center;">${item.cartQty}</span>
                            <button class="qty-btn" onclick="updateCartItemQty(${item.id}, ${item.cartQty + 1})">+</button>
                        </div>
                        <span style="cursor: pointer; color: var(--danger-color); font-size: 0.85rem;" onclick="Cart.removeItem(${item.id}); renderCart();">Remove</span>
                    </div>
                </div>
            </div>
        `;
    });
    
    body.innerHTML = html;
    totalEl.innerText = `₹${Cart.getTotal().toLocaleString()}`;
}
window.renderCart = renderCart;

function updateCartItemQty(id, qty) {
    Cart.updateQty(id, qty);
    renderCart();
}
window.updateCartItemQty = updateCartItemQty;

// Checkout all cart items
async function checkout() {
    const items = Cart.getItems();
    if (items.length === 0) return showToast("Cart is empty", "warning");
    
    // We need an address. Since this is a drawer, let's ask for it in a modal
    const address = userProfile ? userProfile.address : '';
    
    showModal("Checkout", `
        <p>You are about to order <strong>${items.length}</strong> items for a total of <strong>₹${Cart.getTotal().toLocaleString()}</strong>.</p>
        <label class="mt-4">Confirm Delivery Address:</label>
        <input type="text" id="checkout-address" value="${address}">
    `, async () => {
        const confirmAddress = document.getElementById('checkout-address').value;
        if (!confirmAddress.trim()) {
            showToast("Address is required", "error");
            return;
        }
        
        // Process each order sequentially
        // Note: For a robust system, this should be an RPC call or a batch insert
        let successCount = 0;
        let failCount = 0;
        
        for (const item of items) {
            // Verify stock first
            const { data: crop } = await _supabase.from('crops').select('quantity').eq('id', item.id).single();
            if (!crop || crop.quantity < item.cartQty) {
                showToast(`Not enough stock for ${item.name}`, "error");
                failCount++;
                continue;
            }
            
            const { error: orderError } = await _supabase.from('orders').insert([{
                user_id: currentUser.id,
                crop_id: item.id,
                quantity: item.cartQty,
                total_price: item.cartQty * item.price,
                address: confirmAddress,
                status: 'pending',
                snapshot_name: item.name,
                snapshot_unit: item.unit,
                snapshot_image: item.image_url
            }]);
            
            if (!orderError) {
                // Update stock
                await _supabase.from('crops').update({ quantity: crop.quantity - item.cartQty }).eq('id', item.id);
                successCount++;
            } else {
                failCount++;
            }
        }
        
        toggleCart();
        
        if (successCount > 0) {
            Cart.clear();
            showToast(`Successfully placed ${successCount} order(s)!`, "success");
            loadUserOrders();
            loadCrops();
        }
        if (failCount > 0) {
            showToast(`Failed to place ${failCount} order(s)`, "error");
        }
        
    }, "Place Order");
}
window.checkout = checkout;
