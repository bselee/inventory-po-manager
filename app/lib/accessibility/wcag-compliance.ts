/**
 * WCAG 2.1 AA Compliance Utilities
 * 
 * Comprehensive accessibility helpers and validators to ensure
 * the application meets WCAG 2.1 Level AA standards
 */

/**
 * Color contrast ratios required by WCAG 2.1 AA
 */
export const WCAG_CONTRAST_RATIOS = {
  NORMAL_TEXT: 4.5,      // Normal text requires 4.5:1
  LARGE_TEXT: 3,          // Large text (18pt+) requires 3:1
  NON_TEXT: 3,            // UI components and graphics require 3:1
} as const

/**
 * Calculate relative luminance of a color
 */
function getRelativeLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map(c => {
    c = c / 255
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  })
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs
}

/**
 * Calculate contrast ratio between two colors
 */
export function getContrastRatio(color1: string, color2: string): number {
  const rgb1 = hexToRgb(color1)
  const rgb2 = hexToRgb(color2)
  
  if (!rgb1 || !rgb2) return 1
  
  const l1 = getRelativeLuminance(rgb1.r, rgb1.g, rgb1.b)
  const l2 = getRelativeLuminance(rgb2.r, rgb2.g, rgb2.b)
  
  const lighter = Math.max(l1, l2)
  const darker = Math.min(l1, l2)
  
  return (lighter + 0.05) / (darker + 0.05)
}

/**
 * Convert hex color to RGB
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null
}

/**
 * Check if contrast ratio meets WCAG AA requirements
 */
export function meetsContrastRequirements(
  foreground: string,
  background: string,
  isLargeText: boolean = false
): boolean {
  const ratio = getContrastRatio(foreground, background)
  const requiredRatio = isLargeText ? WCAG_CONTRAST_RATIOS.LARGE_TEXT : WCAG_CONTRAST_RATIOS.NORMAL_TEXT
  return ratio >= requiredRatio
}

/**
 * Generate accessible color palette
 */
export function generateAccessiblePalette(baseColor: string) {
  const palette = {
    primary: baseColor,
    text: '#000000',
    background: '#FFFFFF',
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
    info: '#3B82F6'
  }
  
  // Ensure all colors meet contrast requirements
  Object.entries(palette).forEach(([key, color]) => {
    if (key !== 'background' && !meetsContrastRequirements(color, palette.background)) {
      // Darken color until it meets requirements
      palette[key as keyof typeof palette] = adjustColorForContrast(color, palette.background)
    }
  })
  
  return palette
}

/**
 * Adjust color to meet contrast requirements
 */
function adjustColorForContrast(foreground: string, background: string): string {
  let adjustedColor = foreground
  let ratio = getContrastRatio(adjustedColor, background)
  
  while (ratio < WCAG_CONTRAST_RATIOS.NORMAL_TEXT) {
    // Darken or lighten the color
    const rgb = hexToRgb(adjustedColor)
    if (!rgb) break
    
    const isLightBg = getRelativeLuminance(255, 255, 255) > 0.5
    const adjustment = isLightBg ? -10 : 10
    
    rgb.r = Math.max(0, Math.min(255, rgb.r + adjustment))
    rgb.g = Math.max(0, Math.min(255, rgb.g + adjustment))
    rgb.b = Math.max(0, Math.min(255, rgb.b + adjustment))
    
    adjustedColor = `#${[rgb.r, rgb.g, rgb.b].map(c => c.toString(16).padStart(2, '0')).join('')}`
    ratio = getContrastRatio(adjustedColor, background)
  }
  
  return adjustedColor
}

/**
 * Keyboard navigation helpers
 */
export class KeyboardNavigationHelper {
  /**
   * Trap focus within a container
   */
  static trapFocus(container: HTMLElement) {
    const focusableElements = container.querySelectorAll(
      'a[href], button, textarea, input[type="text"], input[type="radio"], input[type="checkbox"], select, [tabindex]:not([tabindex="-1"])'
    )
    
    const firstFocusable = focusableElements[0] as HTMLElement
    const lastFocusable = focusableElements[focusableElements.length - 1] as HTMLElement
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        if (e.shiftKey) {
          if (document.activeElement === firstFocusable) {
            e.preventDefault()
            lastFocusable.focus()
          }
        } else {
          if (document.activeElement === lastFocusable) {
            e.preventDefault()
            firstFocusable.focus()
          }
        }
      }
      
      if (e.key === 'Escape') {
        // Close modal/dialog
        container.dispatchEvent(new CustomEvent('close'))
      }
    }
    
    container.addEventListener('keydown', handleKeyDown)
    
    return () => {
      container.removeEventListener('keydown', handleKeyDown)
    }
  }
  
  /**
   * Handle arrow key navigation in lists
   */
  static handleListNavigation(listElement: HTMLElement) {
    const items = listElement.querySelectorAll('[role="option"], [role="menuitem"], li')
    let currentIndex = 0
    
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          currentIndex = Math.min(currentIndex + 1, items.length - 1)
          ;(items[currentIndex] as HTMLElement).focus()
          break
        case 'ArrowUp':
          e.preventDefault()
          currentIndex = Math.max(currentIndex - 1, 0)
          ;(items[currentIndex] as HTMLElement).focus()
          break
        case 'Home':
          e.preventDefault()
          currentIndex = 0
          ;(items[currentIndex] as HTMLElement).focus()
          break
        case 'End':
          e.preventDefault()
          currentIndex = items.length - 1
          ;(items[currentIndex] as HTMLElement).focus()
          break
      }
    }
    
    listElement.addEventListener('keydown', handleKeyDown)
    
    return () => {
      listElement.removeEventListener('keydown', handleKeyDown)
    }
  }
}

/**
 * ARIA live region announcer
 */
export class AriaAnnouncer {
  private static announcer: HTMLElement | null = null
  
  /**
   * Initialize the announcer
   */
  static init() {
    if (typeof document === 'undefined') return
    
    if (!this.announcer) {
      this.announcer = document.createElement('div')
      this.announcer.setAttribute('role', 'status')
      this.announcer.setAttribute('aria-live', 'polite')
      this.announcer.setAttribute('aria-atomic', 'true')
      this.announcer.className = 'sr-only'
      document.body.appendChild(this.announcer)
    }
  }
  
  /**
   * Announce a message to screen readers
   */
  static announce(message: string, priority: 'polite' | 'assertive' = 'polite') {
    this.init()
    
    if (this.announcer) {
      this.announcer.setAttribute('aria-live', priority)
      this.announcer.textContent = message
      
      // Clear after announcement
      setTimeout(() => {
        if (this.announcer) {
          this.announcer.textContent = ''
        }
      }, 1000)
    }
  }
}

/**
 * Focus management utilities
 */
export class FocusManager {
  private static previousFocus: HTMLElement | null = null
  
  /**
   * Save current focus
   */
  static saveFocus() {
    this.previousFocus = document.activeElement as HTMLElement
  }
  
  /**
   * Restore previous focus
   */
  static restoreFocus() {
    if (this.previousFocus) {
      this.previousFocus.focus()
      this.previousFocus = null
    }
  }
  
  /**
   * Move focus to first error
   */
  static focusFirstError() {
    const firstError = document.querySelector('[aria-invalid="true"]') as HTMLElement
    if (firstError) {
      firstError.focus()
      AriaAnnouncer.announce('Error found. Please correct the highlighted field.', 'assertive')
    }
  }
  
  /**
   * Skip to main content
   */
  static skipToMain() {
    const main = document.querySelector('main') || document.querySelector('[role="main"]')
    if (main) {
      (main as HTMLElement).focus()
      AriaAnnouncer.announce('Skipped to main content')
    }
  }
}

/**
 * Form accessibility helpers
 */
export class FormAccessibility {
  /**
   * Add required ARIA attributes to form fields
   */
  static enhanceFormField(input: HTMLInputElement, options: {
    label?: string
    description?: string
    error?: string
    required?: boolean
  }) {
    const id = input.id || `field-${Math.random().toString(36).substr(2, 9)}`
    input.id = id
    
    if (options.label) {
      input.setAttribute('aria-label', options.label)
    }
    
    if (options.description) {
      const descId = `${id}-desc`
      input.setAttribute('aria-describedby', descId)
      // Assume description element exists with this ID
    }
    
    if (options.error) {
      const errorId = `${id}-error`
      input.setAttribute('aria-invalid', 'true')
      input.setAttribute('aria-errormessage', errorId)
      // Assume error element exists with this ID
    } else {
      input.removeAttribute('aria-invalid')
      input.removeAttribute('aria-errormessage')
    }
    
    if (options.required) {
      input.setAttribute('aria-required', 'true')
      input.setAttribute('required', '')
    }
  }
  
  /**
   * Group related form fields
   */
  static groupFields(container: HTMLElement, legend: string) {
    container.setAttribute('role', 'group')
    container.setAttribute('aria-labelledby', `legend-${legend.replace(/\s+/g, '-').toLowerCase()}`)
  }
}

/**
 * Table accessibility helpers
 */
export class TableAccessibility {
  /**
   * Add proper ARIA attributes to table
   */
  static enhanceTable(table: HTMLTableElement, caption: string) {
    table.setAttribute('role', 'table')
    table.setAttribute('aria-label', caption)
    
    // Add scope to headers
    const headers = table.querySelectorAll('th')
    headers.forEach(header => {
      const isColHeader = header.parentElement?.parentElement?.tagName === 'THEAD'
      header.setAttribute('scope', isColHeader ? 'col' : 'row')
    })
    
    // Add row headers if applicable
    const rows = table.querySelectorAll('tbody tr')
    rows.forEach((row, index) => {
      row.setAttribute('aria-rowindex', (index + 2).toString()) // +2 for header row
    })
  }
  
  /**
   * Make table sortable with keyboard
   */
  static makeSortable(table: HTMLTableElement) {
    const headers = table.querySelectorAll('th[data-sortable]')
    
    headers.forEach(header => {
      header.setAttribute('tabindex', '0')
      header.setAttribute('role', 'button')
      header.setAttribute('aria-sort', 'none')
      
      header.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          ;(header as HTMLElement).click()
        }
      })
    })
  }
}

/**
 * Skip links component
 */
export function createSkipLinks() {
  const skipLinks = [
    { href: '#main', text: 'Skip to main content' },
    { href: '#navigation', text: 'Skip to navigation' },
    { href: '#search', text: 'Skip to search' },
    { href: '#footer', text: 'Skip to footer' }
  ]
  
  const container = document.createElement('div')
  container.className = 'skip-links'
  container.setAttribute('role', 'navigation')
  container.setAttribute('aria-label', 'Skip links')
  
  skipLinks.forEach(link => {
    const a = document.createElement('a')
    a.href = link.href
    a.textContent = link.text
    a.className = 'skip-link'
    container.appendChild(a)
  })
  
  return container
}

/**
 * Accessibility audit function
 */
export async function auditAccessibility(element?: HTMLElement): Promise<AccessibilityIssue[]> {
  const issues: AccessibilityIssue[] = []
  const root = element || document.body
  
  // Check images for alt text
  const images = root.querySelectorAll('img')
  images.forEach(img => {
    if (!img.getAttribute('alt')) {
      issues.push({
        type: 'error',
        element: img,
        message: 'Image missing alt text',
        wcagCriteria: '1.1.1'
      })
    }
  })
  
  // Check form inputs for labels
  const inputs = root.querySelectorAll('input, select, textarea')
  inputs.forEach(input => {
    const id = input.getAttribute('id')
    const label = id ? root.querySelector(`label[for="${id}"]`) : null
    const ariaLabel = input.getAttribute('aria-label')
    
    if (!label && !ariaLabel) {
      issues.push({
        type: 'error',
        element: input,
        message: 'Form input missing label',
        wcagCriteria: '3.3.2'
      })
    }
  })
  
  // Check heading hierarchy
  const headings = Array.from(root.querySelectorAll('h1, h2, h3, h4, h5, h6'))
  let previousLevel = 0
  
  headings.forEach(heading => {
    const level = parseInt(heading.tagName[1])
    if (level - previousLevel > 1) {
      issues.push({
        type: 'warning',
        element: heading,
        message: `Heading level skipped (h${previousLevel} to h${level})`,
        wcagCriteria: '1.3.1'
      })
    }
    previousLevel = level
  })
  
  // Check color contrast
  const textElements = root.querySelectorAll('p, span, div, h1, h2, h3, h4, h5, h6, a, button')
  textElements.forEach(element => {
    const styles = window.getComputedStyle(element as HTMLElement)
    const color = styles.color
    const bgColor = styles.backgroundColor
    
    if (color && bgColor && bgColor !== 'transparent') {
      const contrast = getContrastRatio(color, bgColor)
      if (contrast < WCAG_CONTRAST_RATIOS.NORMAL_TEXT) {
        issues.push({
          type: 'error',
          element: element,
          message: `Insufficient color contrast (${contrast.toFixed(2)}:1)`,
          wcagCriteria: '1.4.3'
        })
      }
    }
  })
  
  return issues
}

interface AccessibilityIssue {
  type: 'error' | 'warning'
  element: Element
  message: string
  wcagCriteria: string
}