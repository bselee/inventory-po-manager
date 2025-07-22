import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Environment validation
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL environment variable');
}

if (!supabaseAnonKey) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable');
}

// Client-side Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
  global: {
    headers: {
      'X-Client-Info': 'inventory-po-manager',
    },
  },
});

// Server-side Supabase client with service role key
export const supabaseAdmin = supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  : null;

// Connection health checker
export async function checkDatabaseHealth(): Promise<{
  connected: boolean;
  latency_ms: number;
  error?: string;
}> {
  const startTime = Date.now();
  
  try {
    const { data, error } = await supabase
      .from('inventory_items')
      .select('count', { count: 'exact', head: true });
    
    if (error) {
      return {
        connected: false,
        latency_ms: Date.now() - startTime,
        error: error.message,
      };
    }
    
    return {
      connected: true,
      latency_ms: Date.now() - startTime,
    };
  } catch (error) {
    return {
      connected: false,
      latency_ms: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// Database integrity checker
export async function validateDatabaseIntegrity() {
  if (!supabaseAdmin) {
    throw new Error('Service role key required for integrity checks');
  }
  
  const { data, error } = await supabaseAdmin.rpc('validate_inventory_integrity');
  
  if (error) {
    throw new Error(`Database integrity check failed: ${error.message}`);
  }
  
  return data;
}

// Enhanced error handler
export class DatabaseError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: any,
    public hint?: string
  ) {
    super(message);
    this.name = 'DatabaseError';
  }
}

// Database operation wrapper with retry logic
export async function withDatabaseRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 1000
): Promise<T> {
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      
      // Don't retry on certain error types
      if (error instanceof DatabaseError && error.code === 'PGRST116') {
        throw error; // Row not found
      }
      
      if (attempt === maxRetries) {
        break;
      }
      
      // Exponential backoff
      await new Promise(resolve => 
        setTimeout(resolve, delayMs * Math.pow(2, attempt - 1))
      );
    }
  }
  
  if (!lastError) {
    throw new Error('Operation failed with no error details');
  }
  
  throw new DatabaseError(
    `Operation failed after ${maxRetries} attempts: ${lastError.message}`,
    'RETRY_EXHAUSTED',
    lastError
  );
}