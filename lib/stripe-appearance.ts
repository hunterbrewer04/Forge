import type { Appearance } from '@stripe/stripe-js'

export function getStripeAppearance(isDark: boolean): Appearance {
  if (isDark) {
    return {
      theme: 'night',
      variables: {
        colorPrimary: '#E8923A',
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
          border: '1px solid #E8923A',
          boxShadow: 'none',
        },
        '.Label': {
          color: '#9ca3af',
          fontSize: '13px',
        },
        '.Tab--selected': {
          borderColor: '#ffffff',
          color: '#ffffff',
        },
        '.Tab--selected .TabIcon': {
          fill: '#ffffff',
        },
        '.Tab--selected .TabLabel': {
          color: '#ffffff',
        },
      },
    }
  }

  return {
    theme: 'stripe',
    variables: {
      colorPrimary: '#E8923A',
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
        border: '1px solid #E8923A',
        boxShadow: 'none',
      },
      '.Label': {
        color: '#60728a',
        fontSize: '13px',
      },
      '.Tab--selected': {
        borderColor: '#111418',
        color: '#111418',
      },
      '.Tab--selected .TabIcon': {
        fill: '#111418',
      },
      '.Tab--selected .TabLabel': {
        color: '#111418',
      },
    },
  }
}
