import { createClient } from "@supabase/supabase-js";

export const propertyImagesBucket =
  process.env.SUPABASE_PROPERTY_IMAGES_BUCKET ?? "property-images";

let supabaseClient: ReturnType<typeof createClient> | null = null;

export const getSupabaseClient = () => {
  if (supabaseClient) {
    return supabaseClient;
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.SUPABASE_ANON_KEY ??
    process.env.SUPABASE_KEY;

  if (!supabaseUrl) {
    throw new Error("Missing SUPABASE_URL environment variable.");
  }

  if (!supabaseKey) {
    throw new Error(
      "Missing Supabase key. Set SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY, or SUPABASE_KEY.",
    );
  }

  supabaseClient = createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return supabaseClient;
};
