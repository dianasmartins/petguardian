import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
    'https://pmudzrlgvpxxghwurwhi.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBtdWR6cmxndnB4eGdod3Vyd2hpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ3MjU0NDUsImV4cCI6MjA5MDMwMTQ0NX0.l5xYGIXtysPGGDLOosJV_MoCfPpSOyMss3aC0Sabztk'
)