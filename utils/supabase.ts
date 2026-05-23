import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl) {
  throw new Error("Variável NEXT_PUBLIC_SUPABASE_URL não encontrada no .env.local");
}

if (!supabaseKey) {
  throw new Error(
    "Variável NEXT_PUBLIC_SUPABASE_ANON_KEY ou NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY não encontrada no .env.local"
  );
}

export const supabase = createClient(supabaseUrl, supabaseKey);