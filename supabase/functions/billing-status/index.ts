import { corsHeaders } from '../_shared/cors.ts';
import { getMembershipState } from '../_shared/membership.ts';
import { createServiceRoleClient, requireAuthenticatedUser } from '../_shared/supabase.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { user } = await requireAuthenticatedUser(req);
    const serviceClient = createServiceRoleClient();
    const membership = await getMembershipState(serviceClient, user.id);

    return new Response(JSON.stringify({ membership }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    console.error('[billing-status] error:', error);
    const status =
      message === 'Unauthorized' || message === 'Missing Authorization header' ? 401 : 500;

    return new Response(JSON.stringify({ error: message }), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
