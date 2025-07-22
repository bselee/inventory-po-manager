import { NextRequest, NextResponse } from 'next/server';
import { checkDatabaseHealth } from '../../../lib/supabase';

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // Check database health
    const dbHealth = await checkDatabaseHealth();
    
    // Check environment variables
    const requiredEnvVars = [
      'NEXT_PUBLIC_SUPABASE_URL',
      'NEXT_PUBLIC_SUPABASE_ANON_KEY',
      'SUPABASE_SERVICE_ROLE_KEY',
    ];
    
    const envStatus = requiredEnvVars.every(varName => !!process.env[varName]);
    
    const health = {
      status: dbHealth.connected && envStatus ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      checks: {
        database: {
          connected: dbHealth.connected,
          latency_ms: dbHealth.latency_ms,
          error: dbHealth.error,
        },
        environment: {
          configured: envStatus,
          missing_vars: requiredEnvVars.filter(varName => !process.env[varName]),
        },
        response_time: {
          total_ms: Date.now() - startTime,
        },
      },
      version: process.env.npm_package_version || '1.0.0',
      uptime: process.uptime(),
    };
    
    const statusCode = health.status === 'healthy' ? 200 : 503;
    
    return NextResponse.json(health, { status: statusCode });
  } catch (error) {
    const errorResponse = {
      status: 'error',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
      response_time_ms: Date.now() - startTime,
    };
    
    return NextResponse.json(errorResponse, { status: 500 });
  }
}