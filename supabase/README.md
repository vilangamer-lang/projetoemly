# Supabase backend

Use `supabase/schema.sql` in the SQL editor to create the `patient_portal` table and demo record.

Set these Vercel environment variables:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY` or `SUPABASE_SECRET_KEY` if your Vercel/Supabase setup uses the newer secret-key naming
- `SUPABASE_TABLE` if you want a different table name
- `ADMIN_PASSWORD`
- `ADMIN_SESSION_SECRET`

The frontend calls `/api/patient?slug=...`, and the Vercel function reads the matching patient record from Supabase using the service role key.

If you use a legacy Supabase service role JWT, the server sends it in both `apikey` and `Authorization`. If you use a newer opaque secret key, the server sends it only as `apikey`, which is the format Supabase expects for that key type.

The SQL file also enables RLS and grants the `service_role` role access to read the table, which is required for the server-side API route.

The admin panel sits at `/` and uses the password/session pair above to protect the create/edit flow.
