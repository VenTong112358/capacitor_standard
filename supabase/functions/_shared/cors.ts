/**
 * Standard CORS headers for Edge Functions (same contract as DemoLingoMock `vertex-auth`).
 */
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
