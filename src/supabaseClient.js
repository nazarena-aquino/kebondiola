import { createClient } from "@supabase/supabase-js";

// Reemplazá estos valores con los de tu proyecto
// Supabase → Project Settings → API
const SUPABASE_URL = "https://ttbqeqduzgluldoplpzn.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR0YnFlcWR1emdsdWxkb3BscHpuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgwMTQyMDAsImV4cCI6MjA5MzU5MDIwMH0.-3bzHL4VyIrO4I79vIQ7VvGqN9qmoMrPzZlnF4a0QRg";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
