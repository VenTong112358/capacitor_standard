import { createClient, type SupabaseClient, type User } from 'jsr:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

export function createUserClient(authHeader: string): SupabaseClient {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      headers: {
        Authorization: authHeader,
      },
    },
  });
}

export function createServiceRoleClient(): SupabaseClient {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export function getAuthHeader(req: Request): string {
  const authHeader = req.headers.get('Authorization') ?? req.headers.get('authorization');
  if (!authHeader) {
    throw new Error('Missing Authorization header');
  }
  return authHeader;
}

export async function requireAuthenticatedUser(req: Request): Promise<{ authHeader: string; user: User }> {
  const authHeader = getAuthHeader(req);
  const userClient = createUserClient(authHeader);
  const {
    data: { user },
    error,
  } = await userClient.auth.getUser();

  if (error || !user) {
    throw new Error('Unauthorized');
  }

  return { authHeader, user };
}

export async function getPublicUserIdForAuthId(
  serviceClient: SupabaseClient,
  authId: string,
): Promise<string | null> {
  const { data, error } = await serviceClient
    .from('users')
    .select('id')
    .eq('auth_id', authId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to resolve public user: ${error.message}`);
  }

  return data?.id ?? null;
}

export function isUuidLike(value: string | null | undefined): value is string {
  if (!value) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
