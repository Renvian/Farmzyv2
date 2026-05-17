const { createClient } = require('@supabase/supabase-js');
globalThis.WebSocket = require('ws');

const SUPABASE_URL = 'https://gavmpwcgmvfptfpftlwx.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdhdm1wd2NnbXZmcHRmcGZ0bHd4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg5Nzk0NzUsImV4cCI6MjA5NDU1NTQ3NX0.klJxbNmhzMRHddI1dmOg035LxtP2QqeCA9jkOQbjP2s';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function setup() {
    // 1. Create Admin
    console.log("Creating admin...");
    const { data: adminAuth, error: e1 } = await supabase.auth.signUp({ email: 'admin@farm.com', password: '123456' });
    if (e1) {
        console.log("Admin auth error:", e1.message);
    } else if (adminAuth.user) {
        const { error: p1 } = await supabase.from('profiles').upsert([{ 
            id: adminAuth.user.id, name: 'Admin User', role: 'admin', phone: '000', address: 'HQ' 
        }]);
        if (p1) console.log("Admin profile error:", p1.message);
        else console.log("Admin created.");
    }

    // 2. Create User
    console.log("Creating consumer...");
    const { data: userAuth, error: e2 } = await supabase.auth.signUp({ email: 'ramesh@gmail.com', password: '123456' });
    if (e2) {
        console.log("User auth error:", e2.message);
    } else if (userAuth.user) {
        const { error: p2 } = await supabase.from('profiles').upsert([{ 
            id: userAuth.user.id, name: 'Ramesh', role: 'user', phone: '123456', address: 'Mumbai' 
        }]);
        if (p2) console.log("User profile error:", p2.message);
        else console.log("Consumer created.");
    }
    
    // 3. Create Farmer
    console.log("Creating farmer...");
    const { data: farmerAuth, error: e3 } = await supabase.auth.signUp({ email: 'farmer1@farm.com', password: '123456' });
    if (e3) {
        console.log("Farmer auth error:", e3.message);
    } else if (farmerAuth.user) {
        const { error: p3 } = await supabase.from('profiles').upsert([{ 
            id: farmerAuth.user.id, name: 'Raju Farmer', role: 'farmer', phone: '987654', address: 'Village 1' 
        }]);
        if (p3) console.log("Farmer profile error:", p3.message);
        else console.log("Farmer created.");
    }
}

setup();
