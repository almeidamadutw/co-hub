import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl) {
  throw new Error("https://lfufcgsfblslppduiwed.supabase.co/rest/v1/");
}

if (!supabaseKey) {
  throw new Error("sb_publishable_h6qaJ0onhlTVQbA4_vM-VA_HYe-1tS1");
}

export const supabase = createClient(supabaseUrl, supabaseKey);