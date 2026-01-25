import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
console.log("SUPABASE URL:", import.meta.env.VITE_SUPABASE_URL);

export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey
);
const {
  data: { session },
} = await supabase.auth.getSession();

const accessToken = session?.access_token;
