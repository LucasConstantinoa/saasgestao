import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://mqhzrmladohpujiigazq.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1xaHpybWxhZG9ocHVqaWlnYXpxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI3NTA1NTYsImV4cCI6MjA4ODMyNjU1Nn0.CwMbX-cRYqZqNyuqgwGWZOfVzxj9QUy053KJf9MUuvA";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);