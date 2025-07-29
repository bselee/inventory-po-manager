'use client'

export default function TestInlinePage() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Inline JavaScript Test</h1>
      
      <div className="space-y-4">
        <div>
          <button 
            onClick={() => alert('Button works!')}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Test Alert
          </button>
        </div>
        
        <div>
          <button 
            onClick={() => console.log('Console log works!')}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          >
            Test Console Log
          </button>
        </div>
        
        <div>
          <button 
            onClick={() => {
              const div = document.getElementById('result');
              if (div) div.textContent = 'DOM manipulation works!';
            }}
            className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
          >
            Test DOM Update
          </button>
        </div>
        
        <div id="result" className="p-4 bg-gray-100 rounded">
          Click a button to test
        </div>
      </div>
      
      <div className="mt-8 p-4 bg-yellow-100 rounded">
        <h2 className="font-semibold mb-2">If buttons don't work:</h2>
        <ol className="list-decimal list-inside space-y-1">
          <li>Check browser console for errors (F12)</li>
          <li>Make sure JavaScript is enabled</li>
          <li>Try hard refresh (Ctrl+F5)</li>
          <li>Check if React is hydrating properly</li>
        </ol>
      </div>
      
      <div className="mt-4">
        <a href="/inventory" className="text-blue-600 hover:underline">Go to Inventory Page →</a>
      </div>
    </div>
  )
}