import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://fwsqhdkawaptfaktyuui.supabase.co";
const supabaseAnonKey = "sb_publishable_5nsbaMd2ar6cm1QRT8L9iQ_08ZKpme5";

export const supabase = createClient(supabaseUrl, supabaseAnonKey); // <-- Pas de "default" ici
