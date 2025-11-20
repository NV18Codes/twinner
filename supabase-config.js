// Supabase Configuration
const SUPABASE_URL = 'https://ygdgseszosvavgvvcfkj.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlnZGdzZXN6b3N2YXZndnZjZmtqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM1NTk4MjAsImV4cCI6MjA3OTEzNTgyMH0.JZcAp9Wip09ZjDYoWiLMSBaMhxinSgp-HqWtP1qKBZ0';

// Initialize Supabase client (wait for supabase library to load)
function initSupabase() {
    if (typeof supabase !== 'undefined') {
        const client = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        window.supabaseClient = client;
        console.log('✅ Supabase client initialized');
        return client;
    } else {
        console.warn('⚠️ Supabase library not loaded yet');
        // Retry after a short delay
        setTimeout(initSupabase, 100);
        return null;
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSupabase);
} else {
    initSupabase();
}
