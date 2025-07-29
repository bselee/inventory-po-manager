'use client'

import { useState } from 'react'
import { AlertCircle, CheckCircle, XCircle, Loader2, Copy, Download } from 'lucide-react'

interface DebugResult {
  test: string
  success: boolean
  message?: string
  error?: string
  details?: any
  recommendation?: string
}

export default function FinaleDebugPanel({ settings }: { settings: any }) {
  const [debugging, setDebugging] = useState(false)
  const [results, setResults] = useState<DebugResult[]>([])
  const [summary, setSummary] = useState<any>(null)
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied'>('idle')

  const runDebug = async () => {
    setDebugging(true)
    setResults([])
    setSummary(null)

    try {
      const response = await fetch('/api/finale-debug-v2', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      })

      const data = await response.json()
      console.log('Debug Response:', data)
      
      setResults(data.results || [])
      setSummary(data.summary)
      
      // Also log to console for debugging
      console.log('=== FINALE DEBUG RESULTS ===')
      data.results?.forEach((r: DebugResult) => {
        console.log(`${r.success ? '✓' : '✗'} ${r.test}`)
        if (r.details) console.log('  Details:', r.details)
        if (r.error) console.log('  Error:', r.error)
        if (r.recommendation) console.log('  Fix:', r.recommendation)
      })
      
    } catch (error) {
      console.error('Debug error:', error)
      setResults([{
        test: 'Debug Request',
        success: false,
        error: error instanceof Error ? error.message : 'Failed to run debug'
      }])
    } finally {
      setDebugging(false)
    }
  }

  const copyDebugInfo = async () => {
    const debugInfo = {
      timestamp: new Date().toISOString(),
      settings: {
        account_path: settings.finale_account_path,
        has_api_key: !!settings.finale_api_key,
        has_api_secret: !!settings.finale_api_secret,
        has_username: !!settings.finale_username,
        has_password: !!settings.finale_password
      },
      results: results,
      summary: summary
    }

    try {
      await navigator.clipboard.writeText(JSON.stringify(debugInfo, null, 2))
      setCopyStatus('copied')
      setTimeout(() => setCopyStatus('idle'), 2000)
    } catch (error) {
      console.error('Failed to copy:', error)
    }
  }

  const downloadDebugInfo = () => {
    const debugInfo = {
      timestamp: new Date().toISOString(),
      settings: {
        account_path: settings.finale_account_path,
        has_api_key: !!settings.finale_api_key,
        has_api_secret: !!settings.finale_api_secret,
        has_username: !!settings.finale_username,
        has_password: !!settings.finale_password
      },
      results: results,
      summary: summary,
      userAgent: navigator.userAgent,
      url: window.location.href
    }

    const blob = new Blob([JSON.stringify(debugInfo, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `finale-debug-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="mt-6 border-t pt-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-700">Debug Finale Connection</h3>
        <div className="flex items-center gap-2">
          {results.length > 0 && (
            <>
              <button
                onClick={copyDebugInfo}
                className="flex items-center gap-2 px-3 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 text-sm"
                title="Copy debug info to clipboard"
              >
                <Copy className="h-4 w-4" />
                {copyStatus === 'copied' ? 'Copied!' : 'Copy'}
              </button>
              <button
                onClick={downloadDebugInfo}
                className="flex items-center gap-2 px-3 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 text-sm"
                title="Download debug info as JSON"
              >
                <Download className="h-4 w-4" />
                Download
              </button>
            </>
          )}
          <button
            onClick={runDebug}
            disabled={debugging}
            className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:bg-gray-400 text-sm"
          >
            {debugging ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <AlertCircle className="h-4 w-4" />
            )}
            Run Detailed Debug
          </button>
        </div>
      </div>

      {results.length > 0 && (
        <div className="space-y-3">
          {summary && (
            <div className="bg-gray-50 p-3 rounded-md text-sm">
              <p className="font-medium">
                Tests: {summary.testsPassed}/{summary.testsRun} passed
                <span className="text-gray-500 ml-2">({summary.duration}ms)</span>
              </p>
            </div>
          )}

          {results.map((result, index) => (
            <div
              key={index}
              className={`p-3 rounded-md border ${
                result.success 
                  ? 'bg-green-50 border-green-200' 
                  : 'bg-red-50 border-red-200'
              }`}
            >
              <div className="flex items-start gap-2">
                {result.success ? (
                  <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                )}
                <div className="flex-1">
                  <p className="font-medium text-sm">{result.test}</p>
                  {result.message && (
                    <p className="text-sm text-gray-700 mt-1">{result.message}</p>
                  )}
                  {result.error && (
                    <p className="text-sm text-red-700 mt-1">{result.error}</p>
                  )}
                  {result.recommendation && (
                    <p className="text-sm text-blue-700 mt-1">
                      💡 {result.recommendation}
                    </p>
                  )}
                  {result.details && (
                    <details className="mt-2">
                      <summary className="text-xs text-gray-500 cursor-pointer">
                        Technical Details
                      </summary>
                      <pre className="text-xs bg-gray-100 p-2 rounded mt-1 overflow-x-auto">
                        {JSON.stringify(result.details, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 space-y-3">
        <div className="p-3 bg-blue-50 rounded-md">
          <p className="text-sm text-blue-800">
            <strong>Current Account Path:</strong> {settings.finale_account_path || '(not set)'}
          </p>
          <p className="text-xs text-blue-600 mt-1">
            Should be your account identifier like "buildasoilorganics" from your Finale URL
          </p>
        </div>
        
        {results.length > 0 && (
          <div className="p-3 bg-gray-50 rounded-md">
            <p className="text-sm font-medium text-gray-700 mb-2">Debug Summary</p>
            <div className="text-xs space-y-1">
              <p><strong>Tests Run:</strong> {results.length}</p>
              <p><strong>Passed:</strong> {results.filter(r => r.success).length}</p>
              <p><strong>Failed:</strong> {results.filter(r => !r.success).length}</p>
              {summary?.duration && <p><strong>Duration:</strong> {summary.duration}ms</p>}
              <p><strong>Timestamp:</strong> {new Date().toLocaleString()}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}