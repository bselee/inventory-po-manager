/**
 * Production-safe logging utility
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LogEntry {
  level: LogLevel
  message: string
  data?: any
  timestamp: Date
  context?: string
}

class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development'
  private isDebugEnabled = process.env.DEBUG === 'true'

  private log(level: LogLevel, message: string, data?: any, context?: string) {
    const entry: LogEntry = {
      level,
      message,
      data,
      timestamp: new Date(),
      context
    }

    // In production, only log warnings and errors
    if (!this.isDevelopment && level !== 'warn' && level !== 'error') {
      return
    }

    // In development or debug mode, log everything
    if (this.isDevelopment || this.isDebugEnabled) {
      let logMethod
      if (level === 'error') {
        logMethod = console.error
      } else if (level === 'warn') {
        logMethod = console.warn
      } else {
        logMethod = console.log
      }
      
      const prefix = context ? `[${context}]` : ''
      logMethod(`${prefix} ${message}`, data || '')
    }

    // In production, you could send to monitoring service here
    // Example: sendToMonitoring(entry)
  }

  debug(message: string, data?: any, context?: string) {
    this.log('debug', message, data, context)
  }

  info(message: string, data?: any, context?: string) {
    this.log('info', message, data, context)
  }

  warn(message: string, data?: any, context?: string) {
    this.log('warn', message, data, context)
  }

  error(message: string, error?: any, context?: string) {
    const errorData = error instanceof Error ? {
      message: error.message,
      stack: error.stack,
      name: error.name
    } : error
    
    this.log('error', message, errorData, context)
  }
}

// Export singleton instance
export const logger = new Logger()

// Export convenience functions
export const logDebug = (message: string, data?: any, context?: string) => 
  logger.debug(message, data, context)

export const logInfo = (message: string, data?: any, context?: string) => 
  logger.info(message, data, context)

export const logWarn = (message: string, data?: any, context?: string) => 
  logger.warn(message, data, context)

export const logError = (message: string, error?: any, context?: string) => 
  logger.error(message, error, context)