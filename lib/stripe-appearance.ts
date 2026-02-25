import type { Appearance } from '@stripe/stripe-js'

export function getStripeAppearance(isDark: boolean): Appearance {
  if (isDark) {
    return {
      theme: 'night',
      variables: {
        colorPrimary: '#1973f0',
        colorBackground: '#1a2235',
        colorText: '#ffffff',
        colorTextSecondary: '#9ca3af',
        colorDanger: '#f87171',
        fontFamily: 'Manrope, sans-serif',
        borderRadius: '8px',
        spacingUnit: '4px',
      },
      rules: {
        '.Input': {
          border: '1px solid #374151',
          boxShadow: 'none',
        },
        '.Input:focus': {
          border: '1px solid #1973f0',
          boxShadow: 'none',
        },
        '.Label': {
          color: '#9ca3af',
          fontSize: '13px',
        },
      },
    }
  }

  return {
    theme: 'stripe',
    variables: {
      colorPrimary: '#1973f0',
      colorBackground: '#ffffff',
      colorText: '#111418',
      colorTextSecondary: '#60728a',
      colorDanger: '#ef4444',
      fontFamily: 'Manrope, sans-serif',
      borderRadius: '8px',
      spacingUnit: '4px',
    },
    rules: {
      '.Input': {
        border: '1px solid #e5e7eb',
        boxShadow: 'none',
      },
      '.Input:focus': {
        border: '1px solid #1973f0',
        boxShadow: 'none',
      },
      '.Label': {
        color: '#60728a',
        fontSize: '13px',
      },
    },
  }
}
