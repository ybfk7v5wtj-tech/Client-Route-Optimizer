import { createClient } from '@supabase/supabase-js';


// Initialize database client
const supabaseUrl = 'https://kzgjrdsnoqatgkrjfldd.databasepad.com';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6Ijc3NWI5YzhjLTJhMDAtNGY2ZC05YjdjLTMwMGVhYTA5ZWZlNyJ9.eyJwcm9qZWN0SWQiOiJremdqcmRzbm9xYXRna3JqZmxkZCIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNzY3MDM5MTMzLCJleHAiOjIwODIzOTkxMzMsImlzcyI6ImZhbW91cy5kYXRhYmFzZXBhZCIsImF1ZCI6ImZhbW91cy5jbGllbnRzIn0.xdWkYPv_wpWUJYHKyINJHQd6HUqYSx1KPRjuxrCSOac';
const supabase = createClient(supabaseUrl, supabaseKey);


export { supabase };