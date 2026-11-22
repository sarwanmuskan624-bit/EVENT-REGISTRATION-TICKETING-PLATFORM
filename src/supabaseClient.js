import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabaseConfigured = Boolean(supabaseUrl && supabaseKey);

// Keep the public website renderable when GitHub Pages has not been given
// the Supabase build-time variables. Admin authentication/data features will
// need the real values configured in the hosting environment.
export const supabase = createClient(
  supabaseUrl || "https://placeholder.supabase.co",
  supabaseKey || "missing-public-anon-key"
);
