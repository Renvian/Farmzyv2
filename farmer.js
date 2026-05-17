document.addEventListener('DOMContentLoaded', () => {
    checkAuth('farmer').then(() => {
        initFarmerDashboard();
    });
});

let farmerTargets = [];
let farmerSubmissions = [];

async function initFarmerDashboard() {
    await Promise.all([
        loadFarmerTargets(),
        loadSubmissionHistory()
    ]);
    updateDashboardStats();
}

// Tab Switching
function switchTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
    document.querySelectorAll('.sidebar-link').forEach(el => el.classList.remove('active'));
    
    document.getElementById(`tab-${tabId}`).classList.remove('hidden');
    event.currentTarget.classList.add('active');
    
    if (tabId === 'submit') {
        populateSubmitDropdown();
    }
}
window.switchTab = switchTab;

// Load Targets
async function loadFarmerTargets() {
    // Show skeleton
    const container = document.getElementById('targets-list');
    const dashContainer = document.getElementById('dashboard-targets');
    if (container) container.innerHTML = `<div class="card skeleton"><div class="skeleton-img"></div></div>`;
    
    const { data: targets, error } = await _supabase
        .from('farmer_targets')
        .select(`*, crops (name, unit)`)
        .eq('farmer_id', currentUser.id)
        .order('created_at', { ascending: false });
        
    if (error) {
        if (container) container.innerHTML = `<p class="text-danger">Error: ${error.message}</p>`;
        return;
    }
    
    farmerTargets = targets || [];
    
    // Calculate progress for each target
    for (let target of farmerTargets) {
        const { data: submissions } = await _supabase
            .from('farmer_submissions')
            .select('submitted_quantity')
            .eq('farmer_id', currentUser.id)
            .eq('crop_id', target.crop_id)
            .neq('status', 'rejected');
            
        const totalSubmitted = (submissions || []).reduce((sum, sub) => sum + sub.submitted_quantity, 0);
        target.submitted = totalSubmitted;
        target.remaining = Math.max(0, target.target_quantity - totalSubmitted);
        target.progressPct = Math.min(100, Math.round((totalSubmitted / target.target_quantity) * 100));
    }
    
    renderTargets();
}

function renderTargets() {
    const container = document.getElementById('targets-list');
    const dashContainer = document.getElementById('dashboard-targets');
    
    if (!container) return;
    
    if (farmerTargets.length === 0) {
        const emptyMsg = '<p class="text-muted">No targets assigned to you currently.</p>';
        container.innerHTML = emptyMsg;
        if (dashContainer) dashContainer.innerHTML = emptyMsg;
        return;
    }
    
    container.innerHTML = '';
    if (dashContainer) dashContainer.innerHTML = '';
    
    farmerTargets.forEach((t, i) => {
        let colorClass = 'var(--danger-color)';
        if (t.progressPct >= 100) colorClass = 'var(--success-color)';
        else if (t.progressPct >= 50) colorClass = 'var(--warning-color)';
        else if (t.progressPct >= 25) colorClass = 'var(--info-color)';
        
        const cardHtml = `
            <div class="card" style="animation: slideDown 0.3s ease forwards; animation-delay: ${i*0.1}s; opacity: 0;">
                <div class="card-content">
                    <div class="flex justify-between items-center mb-4">
                        <h3 style="margin: 0;">${t.crops?.name || 'Unknown'}</h3>
                        <span class="badge ${t.progressPct >= 100 ? 'badge-success' : 'badge-neutral'}">${t.progressPct}%</span>
                    </div>
                    
                    <div class="flex justify-between text-sm mb-2">
                        <span class="text-muted">Target: ${t.target_quantity} ${t.crops?.unit}</span>
                        <span class="font-bold" style="color: ${colorClass}">${t.submitted} ${t.crops?.unit}</span>
                    </div>
                    
                    <div class="freshness-track mt-2 mb-4">
                        <div class="freshness-fill" style="width: ${t.progressPct}%; background: ${colorClass}; transition: width 1s;"></div>
                    </div>
                    
                    <div class="flex justify-between items-center text-sm">
                        <span class="text-muted">Remaining: ${t.remaining} ${t.crops?.unit}</span>
                        ${t.progressPct < 100 ? `<button class="outline" style="padding: 4px 12px; width: auto;" onclick="goToSubmit(${t.crop_id})">Submit</button>` : `<span class="text-success font-bold">Completed ✓</span>`}
                    </div>
                </div>
            </div>
        `;
        
        container.innerHTML += cardHtml;
        if (dashContainer && i < 3) dashContainer.innerHTML += cardHtml;
    });
}

function goToSubmit(cropId) {
    document.querySelectorAll('.sidebar-link')[2].click(); // Click Submit tab
    setTimeout(() => {
        const select = document.getElementById('submit-target');
        if (select) {
            select.value = cropId;
            updateRemainingDisplay();
        }
    }, 100);
}
window.goToSubmit = goToSubmit;

function populateSubmitDropdown() {
    const select = document.getElementById('submit-target');
    if (!select) return;
    
    select.innerHTML = '<option value="">-- Select a crop --</option>';
    
    farmerTargets.forEach(t => {
        if (t.remaining > 0) {
            select.innerHTML += `<option value="${t.crop_id}" data-remaining="${t.remaining}" data-unit="${t.crops?.unit}">${t.crops?.name} (Target: ${t.target_quantity})</option>`;
        }
    });
    
    select.addEventListener('change', updateRemainingDisplay);
}

function updateRemainingDisplay() {
    const select = document.getElementById('submit-target');
    const remainingEl = document.getElementById('submit-remaining');
    
    if (select && select.value) {
        const option = select.options[select.selectedIndex];
        remainingEl.innerText = `${option.getAttribute('data-remaining')} ${option.getAttribute('data-unit')}`;
    } else {
        remainingEl.innerText = '-';
    }
}

// Submit Crop
async function submitCrop() {
    const cropId = document.getElementById('submit-target').value;
    const qtyInput = document.getElementById('submit-qty').value;
    const qty = parseInt(qtyInput);
    
    if (!cropId) return showToast("Please select a crop target", "error");
    if (!Validation.isPositiveNumber(qty)) return showToast("Please enter a valid quantity", "error");
    
    const target = farmerTargets.find(t => t.crop_id == cropId);
    if (qty > target.remaining * 1.5) { // 50% buffer for over-submission
        return showToast("Quantity is unusually high. Please double check.", "warning");
    }

    showModal("Confirm Submission", `Are you sure you want to submit <strong>${qty} ${target.crops?.unit}</strong> of <strong>${target.crops?.name}</strong>?`, async () => {
        const { error } = await _supabase.from('farmer_submissions').insert([{
            farmer_id: currentUser.id,
            crop_id: cropId,
            submitted_quantity: qty,
            status: 'pending'
        }]);
        
        if (error) {
            showToast(error.message, "error");
        } else {
            showToast("Submission sent for approval", "success");
            document.getElementById('submit-qty').value = '';
            
            // Reload data
            await loadFarmerTargets();
            await loadSubmissionHistory();
            updateDashboardStats();
            
            // Switch to history tab
            document.querySelectorAll('.sidebar-link')[3].click();
        }
    });
}
window.submitCrop = submitCrop;

// Load History
async function loadSubmissionHistory() {
    const tbody = document.getElementById('history-table-body');
    if (!tbody) return;
    
    tbody.innerHTML = '<tr><td colspan="5" class="text-center">Loading...</td></tr>';
    
    const { data: submissions, error } = await _supabase
        .from('farmer_submissions')
        .select(`*, crops (name, unit)`)
        .eq('farmer_id', currentUser.id)
        .order('submitted_at', { ascending: false });
        
    if (error) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-center text-danger">Error: ${error.message}</td></tr>`;
        return;
    }
    
    farmerSubmissions = submissions || [];
    
    if (farmerSubmissions.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">No submissions yet.</td></tr>';
        return;
    }
    
    tbody.innerHTML = '';
    
    farmerSubmissions.forEach(s => {
        let statusBadge = 'badge-neutral';
        if (s.status === 'approved') statusBadge = 'badge-success';
        if (s.status === 'rejected') statusBadge = 'badge-danger';
        if (s.status === 'pending') statusBadge = 'badge-warning';
        
        const canEdit = s.status === 'pending';
        
        tbody.innerHTML += `
            <tr>
                <td>${new Date(s.submitted_at || s.created_at || new Date()).toLocaleDateString()}</td>
                <td class="font-bold">${s.crops?.name}</td>
                <td>${s.submitted_quantity} ${s.crops?.unit}</td>
                <td><span class="badge ${statusBadge}">${s.status.toUpperCase()}</span></td>
                <td>
                    ${canEdit ? `<button class="outline" style="padding: 4px 8px; width: auto;" onclick="editSubmission(${s.id}, ${s.submitted_quantity}, '${s.crops?.name}')">Edit</button>` : '-'}
                </td>
            </tr>
        `;
    });
}
window.loadSubmissionHistory = loadSubmissionHistory;

// Edit Submission
function editSubmission(id, currentQty, cropName) {
    showModal(`Edit ${cropName} Submission`, `
        <label>New Quantity:</label>
        <input type="number" id="edit-sub-qty" value="${currentQty}">
    `, async () => {
        const newQty = parseInt(document.getElementById('edit-sub-qty').value);
        if (!Validation.isPositiveNumber(newQty)) {
            showToast("Invalid quantity", "error");
            return;
        }
        
        const { error } = await _supabase
            .from('farmer_submissions')
            .update({ submitted_quantity: newQty })
            .eq('id', id);
            
        if (error) {
            showToast(error.message, "error");
        } else {
            showToast("Submission updated successfully", "success");
            loadFarmerTargets();
            loadSubmissionHistory();
        }
    });
}
window.editSubmission = editSubmission;

function updateDashboardStats() {
    const activeTargetsEl = document.getElementById('stat-active-targets');
    const totalSubmissionsEl = document.getElementById('stat-total-submissions');
    const pendingApprovalEl = document.getElementById('stat-pending-approval');
    
    if (activeTargetsEl) activeTargetsEl.innerText = farmerTargets.filter(t => t.progressPct < 100).length;
    if (totalSubmissionsEl) totalSubmissionsEl.innerText = farmerSubmissions.length;
    if (pendingApprovalEl) pendingApprovalEl.innerText = farmerSubmissions.filter(s => s.status === 'pending').length;
}
