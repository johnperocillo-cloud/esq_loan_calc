const SUPABASE_URL = "https://guazatodmqohiyjkconv.supabase.co/rest/v1/";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd1YXphdG9kbXFvaGl5amtjb252Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM4ODAxNjEsImV4cCI6MjA5OTQ1NjE2MX0.A8XyVrjBuV3qOvPiUB_aawVQBPZsu0-ipHs5BaPU00o";

const supabaseClient = supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);
