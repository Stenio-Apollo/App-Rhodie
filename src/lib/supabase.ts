import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  (Constants.expoConfig?.extra as any)?.supabaseUrl ??
  process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey =
  (Constants.expoConfig?.extra as any)?.supabaseAnonKey ??
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    "[supabase] Missing URL or anon key. Set them in app.json extra or EXPO_PUBLIC_* env vars."
  );
}

export const supabase = createClient(supabaseUrl || "", supabaseAnonKey || "", {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
