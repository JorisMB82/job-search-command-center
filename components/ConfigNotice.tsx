import { getSupabaseConfig } from "../lib/supabase";

export function ConfigNotice() {
  const { isConfigured } = getSupabaseConfig();
  if (isConfigured) {
    return null;
  }
  return (
    <div className="card error" role="alert">
      Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to enable saving and loading data.
    </div>
  );
}
