import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals'
import { UnifiedMonitoring } from '../index'
import { SentryMonitoring } from '../sentry'
import { DataDogMonitoring } from '../datadog'

// Mock environment variables
const originalEnv = process.env

beforeEach(() => {
  jest.clearAllMocks()
  process.env = { ...originalEnv }
})

afterEach(() => {
  process.env = originalEnv
})

describe('UnifiedMonitoring', () => {
  describe('initialization', () => {
    it('should initialize with Sentry when configured', () => {
      process.env.SENTRY_DSN = 'https://test@sentry.io/123456'
      process.env.MONITORING_PROVIDER = 'sentry'
      
      const monitoring = new UnifiedMonitoring()
      expect(monitoring).toBeDefined()
    })

    it('should initialize with DataDog when configured', () => {
      process.env.DD_API_KEY = 'test_api_key'
      process.env.MONITORING_PROVIDER = 'datadog'
      
      const monitoring = new UnifiedMonitoring()
      expect(monitoring).toBeDefined()
    })

    it('should use console monitoring when no provider configured', () => {
      delete process.env.MONITORING_PROVIDER
      
      const monitoring = new UnifiedMonitoring()
      expect(monitoring).toBeDefined()
    })
  })

  describe('error tracking', () => {
    let monitoring: UnifiedMonitoring

    beforeEach(() => {
      monitoring = new UnifiedMonitoring()
    })

    it('should capture errors', () => {
      const error = new Error('Test error')
      const context = { userId: '123', action: 'test' }
      
      expect(() => monitoring.captureError(error, context)).not.toThrow()
    })

    it('should capture messages', () => {
      const message = 'Test message'
      const level = 'info' as const
      
      expect(() => monitoring.captureMessage(message, level)).not.toThrow()
    })

    it('should handle null errors gracefully', () => {
      expect(() => monitoring.captureError(null as any)).not.toThrow()
    })

    it('should handle undefined context', () => {
      const error = new Error('Test error')
      expect(() => monitoring.captureError(error, undefined)).not.toThrow()
    })
  })

  describe('performance tracking', () => {
    let monitoring: UnifiedMonitoring

    beforeEach(() => {
      monitoring = new UnifiedMonitoring()
    })

    it('should start and end transactions', () => {
      const transaction = monitoring.startTransaction('test-transaction', 'test')
      expect(transaction).toBeDefined()
      
      expect(() => monitoring.endTransaction(transaction)).not.toThrow()
    })

    it('should measure operation time', async () => {
      const operation = async () => {
        await new Promise(resolve => setTimeout(resolve, 10))
        return 'result'
      }
      
      const result = await monitoring.time('test-operation', operation)
      expect(result).toBe('result')
    })

    it('should handle operation errors', async () => {
      const operation = async () => {
        throw new Error('Operation failed')
      }
      
      await expect(monitoring.time('test-operation', operation)).rejects.toThrow('Operation failed')
    })

    it('should track custom metrics', () => {
      expect(() => monitoring.trackMetric('custom.metric', 100)).not.toThrow()
    })
  })

  describe('user tracking', () => {
    let monitoring: UnifiedMonitoring

    beforeEach(() => {
      monitoring = new UnifiedMonitoring()
    })

    it('should set user context', () => {
      const user = {
        id: '123',
        email: 'test@example.com',
        username: 'testuser'
      }
      
      expect(() => monitoring.setUser(user)).not.toThrow()
    })

    it('should add context breadcrumb', () => {
      const breadcrumb = {
        message: 'User clicked button',
        category: 'ui',
        level: 'info' as const,
        data: { buttonId: 'submit' }
      }
      
      expect(() => monitoring.addBreadcrumb(breadcrumb)).not.toThrow()
    })

    it('should set tags', () => {
      const tags = {
        environment: 'test',
        feature: 'inventory'
      }
      
      expect(() => monitoring.setTags(tags)).not.toThrow()
    })

    it('should set extra context', () => {
      const extra = {
        requestId: 'req-123',
        sessionId: 'sess-456'
      }
      
      expect(() => monitoring.setExtra(extra)).not.toThrow()
    })
  })
})

describe('SentryMonitoring', () => {
  it('should require DSN for initialization', () => {
    expect(() => new SentryMonitoring({ dsn: '' })).toThrow()
  })

  it('should initialize with valid config', () => {
    const config = {
      dsn: 'https://test@sentry.io/123456',
      environment: 'test',
      debug: false
    }
    
    const sentry = new SentryMonitoring(config)
    expect(sentry).toBeDefined()
  })

  it('should capture errors with context', () => {
    const config = {
      dsn: 'https://test@sentry.io/123456'
    }
    
    const sentry = new SentryMonitoring(config)
    const error = new Error('Test error')
    const context = { operation: 'test' }
    
    expect(() => sentry.captureError(error, context)).not.toThrow()
  })

  it('should handle performance tracking', () => {
    const config = {
      dsn: 'https://test@sentry.io/123456',
      tracesSampleRate: 1.0
    }
    
    const sentry = new SentryMonitoring(config)
    const transaction = sentry.startTransaction('test-op', 'test')
    
    expect(transaction).toBeDefined()
    expect(() => sentry.endTransaction(transaction)).not.toThrow()
  })
})

describe('DataDogMonitoring', () => {
  it('should require API key for initialization', () => {
    expect(() => new DataDogMonitoring({ apiKey: '' })).toThrow()
  })

  it('should initialize with valid config', () => {
    const config = {
      apiKey: 'test_api_key',
      appKey: 'test_app_key',
      site: 'datadoghq.com',
      service: 'inventory-manager'
    }
    
    const datadog = new DataDogMonitoring(config)
    expect(datadog).toBeDefined()
  })

  it('should send metrics', () => {
    const config = {
      apiKey: 'test_api_key'
    }
    
    const datadog = new DataDogMonitoring(config)
    
    expect(() => datadog.gauge('test.metric', 100)).not.toThrow()
    expect(() => datadog.increment('test.counter')).not.toThrow()
    expect(() => datadog.histogram('test.histogram', 50)).not.toThrow()
  })

  it('should track APM spans', () => {
    const config = {
      apiKey: 'test_api_key',
      enableAPM: true
    }
    
    const datadog = new DataDogMonitoring(config)
    const span = datadog.startSpan('test-operation')
    
    expect(span).toBeDefined()
    expect(() => datadog.finishSpan(span)).not.toThrow()
  })

  it('should send logs', () => {
    const config = {
      apiKey: 'test_api_key',
      enableLogs: true
    }
    
    const datadog = new DataDogMonitoring(config)
    
    expect(() => datadog.log('info', 'Test message', { extra: 'data' })).not.toThrow()
    expect(() => datadog.logError(new Error('Test error'))).not.toThrow()
  })
})