import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://dgmdamywncseqnpzttkm.supabase.co";
const supabaseKey = "sb_publishable_3uE1faYWsUpbL40J09ijBg_cyOC7_0C";

export const supabase = createClient(supabaseUrl, supabaseKey);
