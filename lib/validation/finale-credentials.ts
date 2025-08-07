/**
 * Frontend validation for Finale API credentials
 */

export interface ValidationResult {
  isValid: boolean
  errors: Record<string, string>
  warnings: Record<string, string>
}

export interface FinaleCredentials {
  finale_api_key?: string
  finale_api_secret?: string
  finale_account_path?: string
  finale_username?: string
  finale_password?: string
}

/**
 * Validate Finale API credentials
 */
export function validateFinaleCredentials(credentials: FinaleCredentials): ValidationResult {
  const errors: Record<string, string> = {}
  const warnings: Record<string, string> = {}
  
  // Check if using API key method
  const hasApiKey = !!credentials.finale_api_key
  const hasApiSecret = !!credentials.finale_api_secret
  
  // Check if using username/password method
  const hasUsername = !!credentials.finale_username
  const hasPassword = !!credentials.finale_password
  
  // Must have account path
  if (!credentials.finale_account_path) {
    errors.finale_account_path = 'Account path is required'
  } else {
    // Validate account path format
    const accountPath = credentials.finale_account_path.trim()
    
    // Check for common mistakes
    if (accountPath.includes('http') || accountPath.includes('://')) {
      errors.finale_account_path = 'Account path should not include URLs. Use only the account name (e.g., "buildasoil")'
    } else if (accountPath.includes('/') || accountPath.includes('\\')) {
      errors.finale_account_path = 'Account path should not include slashes. Use only the account name'
    } else if (accountPath.includes(' ')) {
      errors.finale_account_path = 'Account path should not contain spaces'
    } else if (accountPath.includes('api')) {
      warnings.finale_account_path = 'Account path usually doesn\'t include "api". Use just your account name'
    }
    
    // Check length
    if (accountPath.length < 2) {
      errors.finale_account_path = 'Account path seems too short'
    } else if (accountPath.length > 50) {
      warnings.finale_account_path = 'Account path seems unusually long. Please verify it\'s correct'
    }
  }
  
  // Must have either API credentials OR username/password
  const hasApiCredentials = hasApiKey && hasApiSecret
  const hasUserCredentials = hasUsername && hasPassword
  
  if (!hasApiCredentials && !hasUserCredentials) {
    errors.credentials = 'Please provide either API Key + Secret OR Username + Password'
  }
  
  // If using API key method, validate both fields
  if (hasApiKey || hasApiSecret) {
    if (!hasApiKey) {
      errors.finale_api_key = 'API Key is required when using API authentication'
    } else if (credentials.finale_api_key) {
      // Validate API key format
      const apiKey = credentials.finale_api_key.trim()
      if (apiKey.length < 10) {
        errors.finale_api_key = 'API Key seems too short. Please check if you copied it correctly'
      }
      if (apiKey.includes(' ')) {
        errors.finale_api_key = 'API Key should not contain spaces'
      }
    }
    
    if (!hasApiSecret) {
      errors.finale_api_secret = 'API Secret is required when using API authentication'
    } else if (credentials.finale_api_secret) {
      // Validate API secret format
      const apiSecret = credentials.finale_api_secret.trim()
      if (apiSecret.length < 10) {
        errors.finale_api_secret = 'API Secret seems too short. Please check if you copied it correctly'
      }
      if (apiSecret.includes(' ')) {
        errors.finale_api_secret = 'API Secret should not contain spaces'
      }
    }
    
    // Warn if both methods are provided
    if (hasUserCredentials) {
      warnings.credentials = 'Both API credentials and username/password provided. API credentials will be used.'
    }
  }
  
  // If using username/password method, validate both fields
  if (hasUsername || hasPassword) {
    if (!hasUsername) {
      errors.finale_username = 'Username is required when using username/password authentication'
    }
    if (!hasPassword) {
      errors.finale_password = 'Password is required when using username/password authentication'
    }
    
    // Warn about using username/password
    if (!hasApiCredentials && hasUserCredentials) {
      warnings.auth_method = 'Using username/password is less secure than API keys. Consider generating API credentials in Finale.'
    }
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    warnings
  }
}

/**
 * Get helpful error message for validation errors
 */
export function getValidationErrorMessage(errors: Record<string, string>): string {
  const errorMessages: string[] = []
  
  // Priority order for errors
  if (errors.credentials) {
    errorMessages.push(errors.credentials)
  }
  if (errors.finale_account_path) {
    errorMessages.push(`Account Path: ${errors.finale_account_path}`)
  }
  if (errors.finale_api_key) {
    errorMessages.push(`API Key: ${errors.finale_api_key}`)
  }
  if (errors.finale_api_secret) {
    errorMessages.push(`API Secret: ${errors.finale_api_secret}`)
  }
  if (errors.finale_username) {
    errorMessages.push(`Username: ${errors.finale_username}`)
  }
  if (errors.finale_password) {
    errorMessages.push(`Password: ${errors.finale_password}`)
  }
  
  return errorMessages.join(' | ')
}

/**
 * Format credentials for display (hide sensitive parts)
 */
export function formatCredentialsForDisplay(credentials: FinaleCredentials): Record<string, string> {
  const display: Record<string, string> = {}
  
  if (credentials.finale_account_path) {
    display['Account Path'] = credentials.finale_account_path
  }
  
  if (credentials.finale_api_key) {
    const key = credentials.finale_api_key
    display['API Key'] = key.length > 8 ? `${key.substring(0, 4)}...${key.substring(key.length - 4)}` : '***'
  }
  
  if (credentials.finale_api_secret) {
    display['API Secret'] = '***' // Never show any part of the secret
  }
  
  if (credentials.finale_username) {
    display['Username'] = credentials.finale_username
  }
  
  if (credentials.finale_password) {
    display['Password'] = '***' // Never show password
  }
  
  return display
}
