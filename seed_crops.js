const { createClient } = require('@supabase/supabase-js');
globalThis.WebSocket = require('ws');

const SUPABASE_URL = 'https://gavmpwcgmvfptfpftlwx.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdhdm1wd2NnbXZmcHRmcGZ0bHd4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg5Nzk0NzUsImV4cCI6MjA5NDU1NTQ3NX0.klJxbNmhzMRHddI1dmOg035LxtP2QqeCA9jkOQbjP2s';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function seed() {
    console.log("Logging in as admin...");
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email: 'admin@farm.com', password: '123456' });
    if (authError) {
        console.error("Auth error:", authError.message);
        return;
    }
    console.log("Logged in. Seeding crops...");
    
    // First, clear existing crops just in case
    await supabase.from('crops').delete().neq('id', 0);
    
    const crops = [
        {
            name: 'Jambe',
            unit: 'kg',
            price: 50,
            quantity: 100,
            image_url: 'https://images.unsplash.com/photo-1628151052601-5259fd773a9e?auto=format&fit=crop&w=500&q=80',
            status: 'available',
            freshness_deadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
            name: 'Guava',
            unit: 'kg',
            price: 60,
            quantity: 150,
            image_url: 'https://images.unsplash.com/photo-1536511394541-b01633512b07?auto=format&fit=crop&w=500&q=80',
            status: 'available',
            freshness_deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
            name: 'Banana',
            unit: 'dozens',
            price: 40,
            quantity: 200,
            image_url: 'https://images.unsplash.com/photo-1603833665858-e61d17a86224?auto=format&fit=crop&w=500&q=80',
            status: 'available',
            freshness_deadline: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
            name: 'Papaya',
            unit: 'pieces',
            price: 80,
            quantity: 50,
            image_url: 'https://images.unsplash.com/photo-1617112848923-cc22343940d8?auto=format&fit=crop&w=500&q=80',
            status: 'available',
            freshness_deadline: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000).toISOString()
        }
    ];

    const { error } = await supabase.from('crops').insert(crops);
    if (error) console.error("Error seeding crops:", error.message);
    else console.log("Crops seeded successfully.");
}

seed();
