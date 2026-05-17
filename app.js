// 1. Initialize Supabase
// REPLACE THESE WITH YOUR OWN SUPABASE CREDENTIALS
const SUPABASE_URL = 'https://gavmpwcgmvfptfpftlwx.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdhdm1wd2NnbXZmcHRmcGZ0bHd4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg5Nzk0NzUsImV4cCI6MjA5NDU1NTQ3NX0.klJxbNmhzMRHddI1dmOg035LxtP2QqeCA9jkOQbjP2s';

const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// 2. Global State
let currentUser = null;
let userProfile = null;

// 3. Auth Checker & Redirect
async function checkAuth(requiredRole = null) {
    const { data: { session } } = await _supabase.auth.getSession();
    
    if (!session) {
        if (!window.location.pathname.includes('login') && !window.location.pathname.includes('signup')) {
            window.location.href = 'login.html';
        }
        return;
    }

    currentUser = session.user;
    
    // Fetch Profile
    const { data: profile } = await _supabase
        .from('profiles')
        .select('*')
        .eq('id', currentUser.id)
        .single();

    userProfile = profile;

    // Role Guard
    if (requiredRole && profile.role !== requiredRole) {
        alert('Unauthorized access');
        if (profile.role === 'admin') window.location.href = 'admin.html';
        else if (profile.role === 'farmer') window.location.href = 'farmer.html';
        else window.location.href = 'home.html';
    }

    // Add Dynamic Welcome Message for Non-Admins
    if (userProfile && userProfile.role !== 'admin') {
        const mainContent = document.querySelector('.main-content');
        if (mainContent && !document.getElementById('welcome-msg')) {
            const welcomeDiv = document.createElement('div');
            welcomeDiv.className = 'section-box slide-down';
            welcomeDiv.style.marginBottom = 'var(--spacing-lg)';
            welcomeDiv.style.background = 'linear-gradient(135deg, var(--primary-light) 0%, var(--surface-color) 100%)';
            welcomeDiv.style.borderLeft = '4px solid var(--primary-color)';
            
            const msg = document.createElement('h2');
            msg.id = 'welcome-msg';
            msg.innerText = `Welcome back, ${profile.name}! 👋`;
            msg.style.margin = '0';
            msg.style.color = 'var(--primary-dark)';
            
            welcomeDiv.appendChild(msg);
            mainContent.insertBefore(welcomeDiv, mainContent.firstChild);
        }
    }
}

// 4. Logout Function
async function handleLogout() {
    await _supabase.auth.signOut();
    window.location.href = 'login.html';
}





// ==========================================
// UTILITY FUNCTIONS
// ==========================================

// 1. Toast Notifications
function showToast(message, type = 'info') {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    let icon = 'ℹ️';
    if (type === 'success') icon = '✅';
    if (type === 'error') icon = '❌';
    if (type === 'warning') icon = '⚠️';

    toast.innerHTML = `<span>${icon}</span><span>${message}</span>`;
    container.appendChild(toast);

    // Trigger animation
    setTimeout(() => toast.classList.add('show'), 10);

    // Remove after 3 seconds
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}
window.showToast = showToast;

// 2. Modal System
function showModal(title, contentHtml, onConfirm = null, confirmText = 'Confirm', cancelText = 'Cancel') {
    let overlay = document.getElementById('global-modal-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'global-modal-overlay';
        overlay.className = 'modal-overlay';
        overlay.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3 id="global-modal-title"></h3>
                </div>
                <div id="global-modal-body"></div>
                <div class="modal-actions" id="global-modal-actions">
                    <button class="outline" id="global-modal-cancel">${cancelText}</button>
                    <button id="global-modal-confirm">${confirmText}</button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);
    }

    document.getElementById('global-modal-title').innerText = title;
    document.getElementById('global-modal-body').innerHTML = contentHtml;
    
    const cancelBtn = document.getElementById('global-modal-cancel');
    const confirmBtn = document.getElementById('global-modal-confirm');
    
    cancelBtn.innerText = cancelText;
    confirmBtn.innerText = confirmText;
    
    // Reset listeners
    const newCancel = cancelBtn.cloneNode(true);
    const newConfirm = confirmBtn.cloneNode(true);
    cancelBtn.parentNode.replaceChild(newCancel, cancelBtn);
    confirmBtn.parentNode.replaceChild(newConfirm, confirmBtn);

    newCancel.addEventListener('click', () => {
        overlay.classList.remove('active');
    });

    if (onConfirm) {
        newConfirm.style.display = 'block';
        newConfirm.addEventListener('click', () => {
            onConfirm();
            overlay.classList.remove('active');
        });
    } else {
        newConfirm.style.display = 'none';
        newCancel.innerText = 'Close';
    }

    overlay.classList.add('active');
}
window.showModal = showModal;

// 3. Validation Utils
const Validation = {
    isPositiveNumber: (val) => !isNaN(val) && val > 0,
    isRealisticQuantity: (val, max = 5000) => val > 0 && val <= max
};
window.Validation = Validation;

// 4. Cart Helpers (localStorage)
const Cart = {
    getItems: () => JSON.parse(localStorage.getItem('farmzy_cart') || '[]'),
    
    addItem: (product, qty = 1) => {
        const items = Cart.getItems();
        const existing = items.find(i => i.id === product.id);
        if (existing) {
            existing.cartQty += qty;
        } else {
            items.push({ ...product, cartQty: qty });
        }
        localStorage.setItem('farmzy_cart', JSON.stringify(items));
        Cart.updateBadge();
        showToast(`${product.name} added to cart`, 'success');
    },
    
    removeItem: (productId) => {
        const items = Cart.getItems().filter(i => i.id !== productId);
        localStorage.setItem('farmzy_cart', JSON.stringify(items));
        Cart.updateBadge();
    },
    
    updateQty: (productId, qty) => {
        if (qty <= 0) return Cart.removeItem(productId);
        const items = Cart.getItems();
        const item = items.find(i => i.id === productId);
        if (item) {
            item.cartQty = qty;
            localStorage.setItem('farmzy_cart', JSON.stringify(items));
            Cart.updateBadge();
        }
    },
    
    clear: () => {
        localStorage.removeItem('farmzy_cart');
        Cart.updateBadge();
    },
    
    getTotal: () => {
        return Cart.getItems().reduce((sum, item) => sum + (item.price * item.cartQty), 0);
    },
    
    updateBadge: () => {
        const badge = document.getElementById('cart-badge');
        if (badge) {
            const totalItems = Cart.getItems().reduce((sum, item) => sum + item.cartQty, 0);
            badge.innerText = totalItems;
            badge.style.display = totalItems > 0 ? 'flex' : 'none';
        }
    }


};
window.Cart = Cart;

// Init cart badge on load
document.addEventListener('DOMContentLoaded', () => Cart.updateBadge());



