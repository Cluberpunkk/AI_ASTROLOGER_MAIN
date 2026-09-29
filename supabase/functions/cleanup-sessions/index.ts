import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Sessions without heartbeat for more than 5 minutes are considered abandoned
const ABANDONMENT_THRESHOLD_MINUTES = 5;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  console.log('Starting session cleanup job...');

  try {
    const cutoffTime = new Date();
    cutoffTime.setMinutes(cutoffTime.getMinutes() - ABANDONMENT_THRESHOLD_MINUTES);

    console.log(`Looking for sessions with last heartbeat before: ${cutoffTime.toISOString()}`);

    // Find and update abandoned sessions
    const { data: abandonedSessions, error: selectError } = await supabase
      .from("chat_sessions")
      .select("id, last_heartbeat_at")
      .eq("status", "active")
      .lt("last_heartbeat_at", cutoffTime.toISOString());

    if (selectError) {
      console.error("Error finding abandoned sessions:", selectError);
      throw selectError;
    }

    console.log(`Found ${abandonedSessions?.length || 0} abandoned sessions`);

    if (abandonedSessions && abandonedSessions.length > 0) {
      const sessionIds = abandonedSessions.map(s => s.id);

      const { error: updateError } = await supabase
        .from("chat_sessions")
        .update({
          status: "abandoned",
          ended_at: new Date().toISOString(),
          disconnect_reason: "heartbeat_timeout",
          updated_at: new Date().toISOString()
        })
        .in("id", sessionIds);

      if (updateError) {
        console.error("Error updating abandoned sessions:", updateError);
        throw updateError;
      }

      console.log(`Successfully marked ${sessionIds.length} sessions as abandoned`);
      
      // Log each session for debugging
      abandonedSessions.forEach(session => {
        console.log(`  - Session ${session.id}: last heartbeat at ${session.last_heartbeat_at}`);
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        abandonedCount: abandonedSessions?.length || 0,
        timestamp: new Date().toISOString()
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  } catch (error) {
    console.error("Session cleanup job failed:", error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString()
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});
