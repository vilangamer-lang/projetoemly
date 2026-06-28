# Supabase backend

Use `supabase/schema.sql` in the SQL editor to create the `patient_portal` table and demo record.

Set these Vercel environment variables:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_TABLE` if you want a different table name

The frontend calls `/api/patient?key=...`, and the Vercel function reads the matching patient record from Supabase using the service role key.

The SQL file also enables RLS and grants the `service_role` role access to read the table, which is required for the server-side API route.
