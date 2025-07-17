'use client'

import { useEffect } from 'react'

export default function FinaleSuccessCheck() {
  useEffect(() => {
    // Add a global function to help debug
    (window as any).checkFinaleResults = () => {
      console.log('=== CHECKING FINALE RESULTS ===');
      
      // Try to find and display any stored results
      const resultsElements = document.querySelectorAll('[data-testid*="finale"]');
      resultsElements.forEach(el => {
        console.log('Found element:', el.textContent);
      });
      
      // Check localStorage for any saved results
      const keys = Object.keys(localStorage).filter(k => k.includes('finale'));
      keys.forEach(key => {
        console.log(`localStorage[${key}]:`, localStorage.getItem(key));
      });
      
      console.log('Run this in console: checkFinaleResults()');
    };
  }, []);

  return null;
}