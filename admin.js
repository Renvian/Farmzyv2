document.addEventListener('DOMContentLoaded', () => {
    checkAuth('admin').then(() => {
        initAdminDashboard();
    });
});

let inventoryData = [];
let pendingApprovals = [];
let pendingOrders = [];
let farmersList = [];
let cropsList = [];

async function initAdminDashboard() {
    await Promise.all([
        loadInventory(),
        loadApprovals(),
        loadTargets(),
        loadOrders(),
        fetchFarmersList()
    ]);
    updateDashboardStats();
}

// Tab Switching
function switchTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
    document.querySelectorAll('.sidebar-link').forEach(el => el.classList.remove('active'));
    
    document.getElementById(`tab-${tabId}`).classList.remove('hidden');
    event.currentTarget.classList.add('active');
}
window.switchTab = switchTab;

// Load Inventory
async function loadInventory() {
    const tbody = document.getElementById('inventory-table-body');
    if (!tbody) return;
    
    tbody.innerHTML = '<tr><td colspan="6" class="text-center">Loading...</td></tr>';
    
    const { data: crops, error } = await _supabase
        .from('crops')
        .select('*');
        
    if (error) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center text-danger">Error: ${error.message}</td></tr>`;
        return;
    }
    
    inventoryData = crops || [];
    cropsList = crops || [];
    
    if (inventoryData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">No inventory found.</td></tr>';
        return;
    }
    
    tbody.innerHTML = '';
    
    inventoryData.forEach(c => {
        let statusBadge = 'badge-success';
        if (c.status === 'out_of_stock') statusBadge = 'badge-danger';
        if (c.status === 'coming_soon') statusBadge = 'badge-warning';
        
        const dLine = new Date(c.freshness_deadline);
        const freshnessWarning = dLine < new Date() ? 'text-danger font-bold' : '';
        
        tbody.innerHTML += `
            <tr>
                <td class="font-bold">${c.name}</td>
                <td>${c.quantity} ${c.unit}</td>
                <td>₹${c.price} / ${c.unit}</td>
                <td><span class="badge ${statusBadge}">${c.status.replace('_', ' ')}</span></td>
                <td class="${freshnessWarning}">${dLine.toLocaleDateString()}</td>
                <td>
                    <button class="outline" style="padding: 4px 8px; width: auto;" onclick="editCrop(${c.id})">Edit</button>
                    <button class="danger outline" style="padding: 4px 8px; width: auto;" onclick="deleteCrop(${c.id})">Del</button>
                </td>
            </tr>
        `;
    });
}

// Add/Edit Crop
function showAddCropModal() {
    const html = `
        <label>Crop Name</label>
        <select id="add-crop-name">
            <option value="Jambe">Jambe</option>
            <option value="Guava">Guava</option>
            <option value="Banana">Banana</option>
            <option value="Papaya">Papaya</option>
        </select>
        <label>Unit (e.g. kg, boxes)</label><input type="text" id="add-crop-unit" value="kg">
        <label>Price (₹)</label><input type="number" id="add-crop-price">
        <label>Initial Quantity</label><input type="number" id="add-crop-qty" value="0">
        <label>Status</label>
        <select id="add-crop-status">
            <option value="available">Available</option>
            <option value="coming_soon">Coming Soon</option>
            <option value="out_of_stock">Out of Stock</option>
        </select>
        <label>Freshness Deadline</label><input type="datetime-local" id="add-crop-deadline">
    `;
    
    showModal("Add New Crop", html, async () => {
        const name = document.getElementById('add-crop-name').value;
        const unit = document.getElementById('add-crop-unit').value;
        const price = parseFloat(document.getElementById('add-crop-price').value);
        const qty = parseInt(document.getElementById('add-crop-qty').value);
        const status = document.getElementById('add-crop-status').value;
        const deadline = document.getElementById('add-crop-deadline').value;
        
        if (!name || !unit || !price || !deadline) return showToast("All fields are required", "error");
        
        let img = '';
        if (name === 'Jambe') img = 'https://images.unsplash.com/photo-1628151052601-5259fd773a9e?auto=format&fit=crop&w=500&q=80';
        else if (name === 'Guava') img = 'https://images.unsplash.com/photo-1536511394541-b01633512b07?auto=format&fit=crop&w=500&q=80';
        else if (name === 'Banana') img = 'https://images.unsplash.com/photo-1603833665858-e61d17a86224?auto=format&fit=crop&w=500&q=80';
        else if (name === 'Papaya') img = 'https://images.unsplash.com/photo-1617112848923-cc22343940d8?auto=format&fit=crop&w=500&q=80';

        const { error } = await _supabase.from('crops').insert([{
            name, unit, price, image_url: img, quantity: qty, status, freshness_deadline: new Date(deadline).toISOString()
        }]);
        
        if (error) showToast(error.message, "error");
        else {
            showToast("Crop added successfully", "success");
            loadInventory();
        }
    });
}
window.showAddCropModal = showAddCropModal;

function editCrop(id) {
    const crop = inventoryData.find(c => c.id === id);
    if (!crop) return;
    
    // Format date for datetime-local
    const d = new Date(crop.freshness_deadline);
    const dateString = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    
    const html = `
        <label>Crop Name</label>
        <select id="edit-crop-name">
            <option value="Jambe" ${crop.name === 'Jambe' ? 'selected' : ''}>Jambe</option>
            <option value="Guava" ${crop.name === 'Guava' ? 'selected' : ''}>Guava</option>
            <option value="Banana" ${crop.name === 'Banana' ? 'selected' : ''}>Banana</option>
            <option value="Papaya" ${crop.name === 'Papaya' ? 'selected' : ''}>Papaya</option>
        </select>
        <label>Price (₹)</label><input type="number" id="edit-crop-price" value="${crop.price}">
        <label>Quantity</label><input type="number" id="edit-crop-qty" value="${crop.quantity}">
        <label>Status</label>
        <select id="edit-crop-status">
            <option value="available" ${crop.status === 'available' ? 'selected' : ''}>Available</option>
            <option value="coming_soon" ${crop.status === 'coming_soon' ? 'selected' : ''}>Coming Soon</option>
            <option value="out_of_stock" ${crop.status === 'out_of_stock' ? 'selected' : ''}>Out of Stock</option>
        </select>
        <label>Freshness Deadline</label><input type="datetime-local" id="edit-crop-deadline" value="${dateString}">
    `;
    
    showModal("Edit Crop", html, async () => {
        const name = document.getElementById('edit-crop-name').value;
        
        let img = '';
        if (name === 'Jambe') img = 'https://images.unsplash.com/photo-1628151052601-5259fd773a9e?auto=format&fit=crop&w=500&q=80';
        else if (name === 'Guava') img = 'https://images.unsplash.com/photo-1536511394541-b01633512b07?auto=format&fit=crop&w=500&q=80';
        else if (name === 'Banana') img = 'https://images.unsplash.com/photo-1603833665858-e61d17a86224?auto=format&fit=crop&w=500&q=80';
        else if (name === 'Papaya') img = 'https://images.unsplash.com/photo-1617112848923-cc22343940d8?auto=format&fit=crop&w=500&q=80';

        const updates = {
            name: name,
            image_url: img,
            price: parseFloat(document.getElementById('edit-crop-price').value),
            quantity: parseInt(document.getElementById('edit-crop-qty').value),
            status: document.getElementById('edit-crop-status').value,
            freshness_deadline: new Date(document.getElementById('edit-crop-deadline').value).toISOString()
        };
        
        const { error } = await _supabase.from('crops').update(updates).eq('id', id);
        
        if (error) showToast(error.message, "error");
        else {
            showToast("Crop updated", "success");
            loadInventory();
        }
    });
}
window.editCrop = editCrop;

function deleteCrop(id) {
    showModal("Delete Crop", "<p>Are you sure you want to delete this crop? This will break references to existing orders and targets.</p>", async () => {
        const { error } = await _supabase.from('crops').delete().eq('id', id);
        if (error) showToast(error.message, "error");
        else {
            showToast("Crop deleted", "success");
            loadInventory();
        }
    }, "Yes, Delete");
}
window.deleteCrop = deleteCrop;

// Fetch Farmers List
async function fetchFarmersList() {
    const { data } = await _supabase.from('profiles').select('id, name').eq('role', 'farmer');
    farmersList = data || [];
}

// Load Targets
async function loadTargets() {
    const tbody = document.getElementById('targets-table-body');
    if (!tbody) return;
    
    const { data, error } = await _supabase
        .from('farmer_targets')
        .select(`*, profiles(name), crops(name, unit)`)
        .order('created_at', { ascending: false });
        
    if (error || !data) {
        tbody.innerHTML = `<tr><td colspan="5">Error loading targets</td></tr>`;
        return;
    }
    
    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">No targets found.</td></tr>';
        return;
    }
    
    tbody.innerHTML = '';
    data.forEach(t => {
        tbody.innerHTML += `
            <tr>
                <td>${t.profiles?.name}</td>
                <td class="font-bold">${t.crops?.name}</td>
                <td>${t.target_quantity} ${t.crops?.unit}</td>
                <td>${new Date(t.created_at).toLocaleDateString()}</td>
                <td>
                    <button class="danger outline" style="padding: 4px 8px; width: auto;" onclick="deleteTarget(${t.id})">Del</button>
                </td>
            </tr>
        `;
    });
}

function showAssignTargetModal() {
    let farmersOptions = farmersList.map(f => `<option value="${f.id}">${f.name}</option>`).join('');
    let cropsOptions = cropsList.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
    
    const html = `
        <label>Farmer</label>
        <select id="assign-farmer">${farmersOptions}</select>
        <label>Crop</label>
        <select id="assign-crop">${cropsOptions}</select>
        <label>Target Quantity</label>
        <input type="number" id="assign-qty" min="1">
    `;
    
    showModal("Assign Target", html, async () => {
        const farmer_id = document.getElementById('assign-farmer').value;
        const crop_id = document.getElementById('assign-crop').value;
        const target_quantity = parseInt(document.getElementById('assign-qty').value);
        
        if (!Validation.isPositiveNumber(target_quantity)) return showToast("Invalid quantity", "error");
        
        const { error } = await _supabase.from('farmer_targets').insert([{
            farmer_id, crop_id, target_quantity
        }]);
        
        if (error) showToast(error.message, "error");
        else {
            showToast("Target assigned", "success");
            loadTargets();
        }
    });
}
window.showAssignTargetModal = showAssignTargetModal;

function deleteTarget(id) {
    showModal("Delete Target", "<p>Are you sure?</p>", async () => {
        await _supabase.from('farmer_targets').delete().eq('id', id);
        loadTargets();
        showToast("Target deleted", "success");
    });
}
window.deleteTarget = deleteTarget;

// Load Approvals
async function loadApprovals() {
    const tbody = document.getElementById('approvals-table-body');
    if (!tbody) return;
    
    const { data, error } = await _supabase
        .from('farmer_submissions')
        .select(`*, profiles(name), crops(id, name, unit, quantity)`)
        .order('submitted_at', { ascending: false });
        
    if (error || !data) return;
    
    pendingApprovals = data.filter(s => s.status === 'pending');
    
    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">No submissions found.</td></tr>';
        return;
    }
    
    tbody.innerHTML = '';
    data.forEach(s => {
        let badge = 'badge-warning';
        if (s.status === 'approved') badge = 'badge-success';
        if (s.status === 'rejected') badge = 'badge-danger';
        
        const isPending = s.status === 'pending';
        
        // Pass objects as JSON for click handlers
        const sJson = JSON.stringify(s).replace(/"/g, '&quot;');
        
        tbody.innerHTML += `
            <tr>
                <td>${new Date(s.submitted_at || new Date()).toLocaleDateString()}</td>
                <td>${s.profiles?.name}</td>
                <td class="font-bold">${s.crops?.name}</td>
                <td>${s.submitted_quantity} ${s.crops?.unit}</td>
                <td><span class="badge ${badge}">${s.status.toUpperCase()}</span></td>
                <td>
                    ${isPending ? `
                        <div class="flex gap-2">
                            <button style="padding: 4px 8px; width: auto;" onclick="approveSubmission(${sJson})">Approve</button>
                            <button class="danger outline" style="padding: 4px 8px; width: auto;" onclick="rejectSubmission(${s.id})">Reject</button>
                        </div>
                    ` : '-'}
                </td>
            </tr>
        `;
    });
}

async function approveSubmission(sub) {
    showModal("Approve Submission", `<p>Approve ${sub.submitted_quantity} ${sub.crops?.unit} of ${sub.crops?.name}?</p><p class="text-muted text-sm mt-2">This will add the quantity directly to the platform inventory.</p>`, async () => {
        
        // 1. Update Inventory
        const newQty = (sub.crops?.quantity || 0) + sub.submitted_quantity;
        const { error: invError } = await _supabase.from('crops').update({ quantity: newQty, status: 'available' }).eq('id', sub.crop_id);
        
        if (invError) return showToast("Failed to update inventory", "error");
        
        // 2. Update Status
        await _supabase.from('farmer_submissions').update({ status: 'approved' }).eq('id', sub.id);
        
        showToast("Submission Approved & Inventory Updated", "success");
        loadApprovals();
        loadInventory();
        updateDashboardStats();
    });
}
window.approveSubmission = approveSubmission;

async function rejectSubmission(id) {
    showModal("Reject Submission", "<p>Are you sure you want to reject this submission?</p>", async () => {
        await _supabase.from('farmer_submissions').update({ status: 'rejected' }).eq('id', id);
        showToast("Submission Rejected", "success");
        loadApprovals();
        updateDashboardStats();
    }, "Reject", "Cancel");
}
window.rejectSubmission = rejectSubmission;

// Load Consumer Orders
async function loadOrders() {
    const tbody = document.getElementById('orders-table-body');
    if (!tbody) return;
    
    const { data, error } = await _supabase
        .from('orders')
        .select(`*, profiles(name), crops(name, unit)`)
        .order('created_at', { ascending: false });
        
    if (error || !data) return;
    
    pendingOrders = data.filter(o => o.status === 'pending');
    
    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted">No orders found.</td></tr>';
        return;
    }
    
    tbody.innerHTML = '';
    data.forEach(o => {
        let badge = 'badge-neutral';
        if (o.status === 'delivered') badge = 'badge-success';
        if (o.status === 'cancelled') badge = 'badge-danger';
        if (o.status === 'confirmed') badge = 'badge-info';
        if (o.status === 'pending') badge = 'badge-warning';
        
        const isPending = o.status === 'pending';
        const isConfirmed = o.status === 'confirmed';
        
        tbody.innerHTML += `
            <tr>
                <td>${new Date(o.created_at).toLocaleDateString()}</td>
                <td>${o.profiles?.name}</td>
                <td class="font-bold">${o.crops?.name}</td>
                <td>${o.quantity} ${o.crops?.unit}</td>
                <td>₹${o.total_price}</td>
                <td><span class="badge ${badge}">${o.status.toUpperCase()}</span></td>
                <td>
                    <div class="flex gap-2">
                        ${isPending ? `<button style="padding: 4px 8px; width: auto;" onclick="updateOrderStatus(${o.id}, 'confirmed')">Confirm</button>` : ''}
                        ${isConfirmed ? `<button style="padding: 4px 8px; width: auto;" onclick="updateOrderStatus(${o.id}, 'delivered')">Mark Delivered</button>` : ''}
                    </div>
                </td>
            </tr>
        `;
    });
}

async function updateOrderStatus(id, status) {
    const { error } = await _supabase.from('orders').update({ status }).eq('id', id);
    if (error) showToast(error.message, "error");
    else {
        showToast(`Order marked as ${status}`, "success");
        loadOrders();
        updateDashboardStats();
        
        if (status === 'confirmed') {
            // Notifications removed
        }
    }
}
window.updateOrderStatus = updateOrderStatus;

function updateDashboardStats() {
    const pendingAppEl = document.getElementById('stat-pending-approvals');
    const pendingOrdEl = document.getElementById('stat-pending-orders');
    const lowStockEl = document.getElementById('stat-low-stock');
    
    if (pendingAppEl) pendingAppEl.innerText = pendingApprovals.length;
    if (pendingOrdEl) pendingOrdEl.innerText = pendingOrders.length;
    
    if (lowStockEl) {
        const lowStockCount = inventoryData.filter(c => c.quantity < 20).length;
        lowStockEl.innerText = lowStockCount;
        if (lowStockCount > 0) lowStockEl.style.color = 'var(--danger-color)';
        else lowStockEl.style.color = 'var(--text-primary)';
    }
}
