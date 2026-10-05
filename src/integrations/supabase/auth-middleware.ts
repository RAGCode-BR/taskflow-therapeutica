import { createMiddleware } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { createClient } from '@supabase/supabase-js'
import type { Database } from './types'



type AuthContext = {
  supabase: any;
  userId: string | null;
  claims: any;
};

export const requireSupabaseAuth = createMiddleware({ type: 'function' }).server<AuthContext>(
  async ({ next }) => {
    
    const SUPABASE_URL = process.env.SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL;
    const SUPABASE_PUBLISHABLE_KEY =
      process.env.SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

    // Falha fechada: sem configuração não há como validar o login, então nada passa.
    if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
      console.error('[Supabase] Missing credentials. Refusing unauthenticated server call.');
      throw new Error('Servidor sem configuração do Supabase. Avise o administrador.');
    }
    
    const request = getRequest();

    if (!request?.headers) {
      throw new Error('Unauthorized: No request headers available');
    }

    const authHeader = request.headers.get('authorization');

    if (!authHeader) {
      throw new Error('Unauthorized: No authorization header provided');
    }

    if (!authHeader.startsWith('Bearer ')) {
      throw new Error('Unauthorized: Only Bearer tokens are supported');
    }

    const token = authHeader.replace('Bearer ', '');
    if (!token) {
      throw new Error('Unauthorized: No token provided');
    }

    const supabase = createClient<Database>(
      SUPABASE_URL!,
      SUPABASE_PUBLISHABLE_KEY!,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
        auth: {
          storage: undefined,
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    );

    const { data, error } = await supabase.auth.getClaims(token);
    if (error || !data?.claims) {
      throw new Error('Unauthorized: Invalid token');
    }

    if (!data.claims.sub) {
      throw new Error('Unauthorized: No user ID found in token');
    }

    return next<AuthContext>({
      context: {
        supabase,
        userId: data.claims.sub,
        claims: data.claims,
      },
    });
  },
);
