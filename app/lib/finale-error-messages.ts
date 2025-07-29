/**
 * Finale API Error Messages and Troubleshooting Helper
 * Maps error codes and messages to user-friendly explanations with solutions
 */

interface ErrorInfo {
  message: string
  details?: string
  solutions: string[]
  debugInfo?: Record<string, any>
}

export class FinaleErrorHelper {
  /**
   * Get user-friendly error information based on error response
   */
  static getErrorInfo(error: any, context?: string): ErrorInfo {
    // Handle different error types
    if (error instanceof Response || error?.response) {
      const response = error.response || error
      const status = response.status
      
      switch (status) {
        case 401:
          return {
            message: 'Authentication failed - Invalid API credentials',
            details: 'The API key or secret you provided is incorrect.',
            solutions: [
              'Check your API Key and Secret in the settings',
              'Make sure you\'re using the API credentials, not your login username/password',
              'Verify the credentials match exactly what\'s shown in Finale (no extra spaces)',
              'Try generating new API credentials in Finale if the current ones aren\'t working'
            ]
          }
          
        case 403:
          return {
            message: 'Access denied - Insufficient permissions',
            details: 'Your API credentials don\'t have permission to access this resource.',
            solutions: [
              'Check that your Finale user account has API access enabled',
              'Verify your account has permissions for inventory/product access',
              'Contact your Finale administrator to check your account permissions'
            ]
          }
          
        case 404:
          return {
            message: 'Resource not found - Check your account path',
            details: 'The API endpoint or account path could not be found.',
            solutions: [
              'Verify your Account Path in settings',
              'Use only your account name (e.g., "buildasoil"), not the full URL',
              'Remove any slashes or "api" from the account path',
              'Example: If your Finale URL is app.finaleinventory.com/buildasoil/, use "buildasoil"'
            ]
          }
          
        case 429:
          return {
            message: 'Rate limit exceeded - Too many requests',
            details: 'You\'ve made too many API requests in a short time.',
            solutions: [
              'Wait a few minutes before trying again',
              'The system now includes automatic rate limiting to prevent this',
              'If this persists, contact support'
            ]
          }
          
        case 500:
        case 502:
        case 503:
          return {
            message: 'Finale server error - Service temporarily unavailable',
            details: 'Finale\'s servers are experiencing issues.',
            solutions: [
              'Wait a few minutes and try again',
              'Check Finale\'s status page for any reported outages',
              'If the problem persists, contact Finale support'
            ]
          }
          
        default:
          return {
            message: `HTTP Error ${status}`,
            details: 'An unexpected error occurred while communicating with Finale.',
            solutions: [
              'Check your internet connection',
              'Verify all settings are correct',
              'Try again in a few minutes',
              'Contact support if the issue persists'
            ]
          }
      }
    }
    
    // Handle network errors
    if (error?.message?.toLowerCase().includes('fetch')) {
      return {
        message: 'Network error - Unable to connect to Finale',
        details: 'Could not establish a connection to Finale\'s servers.',
        solutions: [
          'Check your internet connection',
          'Verify Finale\'s service is available',
          'Check if your firewall is blocking the connection',
          'Try using a different network'
        ]
      }
    }
    
    // Handle specific error messages
    const errorMessage = error?.message?.toLowerCase() || ''
    
    if (errorMessage.includes('invalid') && errorMessage.includes('credentials')) {
      return {
        message: 'Invalid credentials',
        details: 'The API credentials provided are not valid.',
        solutions: [
          'Double-check your API Key and Secret',
          'Make sure there are no extra spaces or characters',
          'Try regenerating your API credentials in Finale'
        ]
      }
    }
    
    if (errorMessage.includes('account') && (errorMessage.includes('not found') || errorMessage.includes('404'))) {
      return {
        message: 'Account not found',
        details: 'The account path you provided could not be found.',
        solutions: [
          'Check your Account Path in settings',
          'Use only the account identifier, not the full URL',
          'Example: "buildasoil" not "https://app.finaleinventory.com/buildasoil"'
        ]
      }
    }
    
    if (errorMessage.includes('timeout')) {
      return {
        message: 'Request timeout',
        details: 'The request took too long to complete.',
        solutions: [
          'Finale may be slow to respond - try again',
          'Consider syncing smaller date ranges',
          'Check your internet connection speed'
        ]
      }
    }
    
    // Generic error fallback
    return {
      message: 'Unexpected error',
      details: error?.message || 'An unknown error occurred.',
      solutions: [
        'Check all your settings are correct',
        'Try the test connection button first',
        'Review the error details for more information',
        'Contact support with the error details'
      ],
      debugInfo: {
        error: error?.toString(),
        context,
        timestamp: new Date().toISOString()
      }
    }
  }
  
  /**
   * Format error for display in UI
   */
  static formatErrorForUI(error: any, context?: string): {
    title: string
    message: string
    solutions: string[]
    showDebug: boolean
    debugInfo?: string
  } {
    const errorInfo = this.getErrorInfo(error, context)
    
    return {
      title: errorInfo.message,
      message: errorInfo.details || '',
      solutions: errorInfo.solutions,
      showDebug: !!errorInfo.debugInfo,
      debugInfo: errorInfo.debugInfo ? JSON.stringify(errorInfo.debugInfo, null, 2) : undefined
    }
  }
  
  /**
   * Get troubleshooting steps for common scenarios
   */
  static getTroubleshootingSteps(scenario: string): string[] {
    const steps: Record<string, string[]> = {
      'first-setup': [
        '1. Go to Finale > Settings > Integrations > API',
        '2. Generate new API credentials if you don\'t have them',
        '3. Copy the API Key and Secret exactly as shown',
        '4. In our app settings, paste the credentials',
        '5. For Account Path, use only your account name (e.g., "buildasoil")',
        '6. Click "Test Connection" to verify',
        '7. If successful, click "Save Settings"'
      ],
      
      'no-data': [
        '1. Verify the connection test passes',
        '2. Check that you have products in Finale',
        '3. Try a dry run sync first to see what would be imported',
        '4. If dry run shows data, proceed with full sync',
        '5. Check the date filter - try "Last 2 years" for initial sync',
        '6. Look for any error messages in the sync results'
      ],
      
      'sync-failed': [
        '1. Check the error message for specific issues',
        '2. Verify your credentials are still valid',
        '3. Ensure Finale\'s service is available',
        '4. Try syncing a smaller date range',
        '5. Check for any stuck syncs and clean them up',
        '6. Review the sync logs for detailed error information'
      ],
      
      'rate-limit': [
        '1. Wait at least 5 minutes before trying again',
        '2. The system now includes automatic rate limiting',
        '3. Avoid running multiple syncs simultaneously',
        '4. Consider syncing during off-peak hours',
        '5. Contact support if rate limits persist'
      ]
    }
    
    return steps[scenario] || []
  }
  
  /**
   * Check if error is retryable
   */
  static isRetryableError(error: any): boolean {
    if (error instanceof Response || error?.response) {
      const status = (error.response || error).status
      // Retry on rate limits, server errors, and timeouts
      return status === 429 || status >= 500 || status === 408
    }
    
    const message = error?.message?.toLowerCase() || ''
    return message.includes('timeout') || 
           message.includes('network') ||
           message.includes('fetch')
  }
  
  /**
   * Get retry delay based on error type
   */
  static getRetryDelay(error: any, attemptNumber: number): number {
    const baseDelay = 1000 // 1 second
    
    if (error instanceof Response || error?.response) {
      const response = error.response || error
      
      // Check for Retry-After header
      const retryAfter = response.headers?.get?.('Retry-After')
      if (retryAfter) {
        const delay = parseInt(retryAfter)
        if (!isNaN(delay)) {
          return delay * 1000 // Convert to milliseconds
        }
      }
      
      // Rate limit errors get longer delays
      if (response.status === 429) {
        return baseDelay * Math.pow(2, attemptNumber) * 2
      }
    }
    
    // Default exponential backoff
    return baseDelay * Math.pow(2, attemptNumber)
  }
}

// Export convenience functions
export const getFinaleErrorInfo = FinaleErrorHelper.getErrorInfo
export const formatFinaleError = FinaleErrorHelper.formatErrorForUI
export const getFinaleErrorSteps = FinaleErrorHelper.getTroubleshootingSteps
export const isRetryableFinaleError = FinaleErrorHelper.isRetryableError
export const getFinaleRetryDelay = FinaleErrorHelper.getRetryDelay