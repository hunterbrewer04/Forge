/**
 * Environment Variable Validation Utility
 *
 * This module validates that all required environment variables are present
 * and properly configured before the application starts.
 *
 * SECURITY: Prevents the app from running with missing or invalid configuration,
 * reducing the risk of runtime errors or security vulnerabilities.
 */

interface EnvVarConfig {
  name: string
  required: boolean
  description: string
  clientSide: boolean
}

/**
 * List of all environment variables used in the application.
 *
 * clientSide: true = exposed to the browser (NEXT_PUBLIC_*)
 * clientSide: false = server-side only, never sent to client
 */
const ENV_VARS: EnvVarConfig[] = [
  {
    name: 'NEXT_PUBLIC_SUPABASE_URL',
    required: true,
    description: 'Supabase project URL',
    clientSide: true,
  },
  {
    name: 'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    required: true,
    description: 'Supabase anonymous/public key (protected by RLS)',
    clientSide: true,
  },
  {
    name: 'SUPABASE_SERVICE_ROLE_KEY',
    required: false, // Optional for now, but recommended for admin operations
    description: 'Supabase service role key (server-side only, bypasses RLS)',
    clientSide: false,
  },
]

class EnvironmentValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'EnvironmentValidationError'
  }
}

/**
 * Validates all environment variables according to the configuration.
 *
 * @throws {EnvironmentValidationError} If required variables are missing
 */
export function validateEnvironmentVariables(): void {
  const missingVars: EnvVarConfig[] = []
  const warnings: string[] = []

  for (const config of ENV_VARS) {
    const value = process.env[config.name]

    // Check if required variable is missing
    if (config.required && !value) {
      missingVars.push(config)
      continue
    }

    // Warn about optional but recommended variables
    if (!config.required && !value) {
      warnings.push(
        `Optional environment variable "${config.name}" is not set. ${config.description}`
      )
      continue
    }

    // Validate client-side variables have the NEXT_PUBLIC_ prefix
    if (config.clientSide && !config.name.startsWith('NEXT_PUBLIC_')) {
      throw new EnvironmentValidationError(
        `Client-side variable "${config.name}" must start with NEXT_PUBLIC_`
      )
    }

    // Warn if server-side variables accidentally start with NEXT_PUBLIC_
    if (!config.clientSide && config.name.startsWith('NEXT_PUBLIC_')) {
      warnings.push(
        `Server-side variable "${config.name}" should not start with NEXT_PUBLIC_ (will be exposed to client!)`
      )
    }

    // Validate URL format for Supabase URL
    if (config.name === 'NEXT_PUBLIC_SUPABASE_URL' && value) {
      try {
        const url = new URL(value)
        if (!url.hostname.includes('supabase')) {
          warnings.push(
            `NEXT_PUBLIC_SUPABASE_URL doesn't appear to be a Supabase URL: ${value}`
          )
        }
      } catch (error) {
        throw new EnvironmentValidationError(
          `NEXT_PUBLIC_SUPABASE_URL is not a valid URL: ${value}`
        )
      }
    }

    // Validate key format (basic check for JWT format)
    if (config.name.includes('KEY') && value) {
      if (value.length < 20) {
        warnings.push(
          `${config.name} appears to be too short. Are you sure it's correct?`
        )
      }
    }
  }

  // Report missing required variables
  if (missingVars.length > 0) {
    const errorMessage = [
      '❌ Missing required environment variables:',
      '',
      ...missingVars.map(
        (v) => `  • ${v.name}: ${v.description}`
      ),
      '',
      '💡 Copy .env.example to .env.local and fill in the values.',
      '   Get your Supabase credentials from: https://app.supabase.com/project/_/settings/api',
    ].join('\n')

    throw new EnvironmentValidationError(errorMessage)
  }

  // Log warnings to console
  if (warnings.length > 0) {
    console.warn('⚠️  Environment variable warnings:')
    warnings.forEach((warning) => {
      console.warn(`  • ${warning}`)
    })
    console.warn('')
  }

  // Success message
  if (process.env.NODE_ENV === 'development') {
    console.log('✅ Environment variables validated successfully')
  }
}

/**
 * Gets an environment variable with runtime type safety.
 *
 * @param name - The name of the environment variable
 * @param fallback - Optional fallback value if variable is not set
 * @returns The environment variable value or fallback
 *
 * @example
 * const apiUrl = getEnvVar('NEXT_PUBLIC_SUPABASE_URL')
 * const optionalKey = getEnvVar('OPTIONAL_KEY', 'default-value')
 */
export function getEnvVar(name: string, fallback?: string): string {
  const value = process.env[name]

  if (!value) {
    if (fallback !== undefined) {
      return fallback
    }
    throw new EnvironmentValidationError(
      `Environment variable "${name}" is required but not set.`
    )
  }

  return value
}

/**
 * Type-safe access to validated environment variables.
 * Use this instead of process.env for better type safety.
 */
export const env = {
  // Public (client-side) variables
  supabaseUrl: () => getEnvVar('NEXT_PUBLIC_SUPABASE_URL'),
  supabaseAnonKey: () => getEnvVar('NEXT_PUBLIC_SUPABASE_ANON_KEY'),

  // Server-side only variables
  supabaseServiceRoleKey: () => getEnvVar('SUPABASE_SERVICE_ROLE_KEY', ''),

  // Node environment
  nodeEnv: () => process.env.NODE_ENV || 'development',
  isDevelopment: () => process.env.NODE_ENV === 'development',
  isProduction: () => process.env.NODE_ENV === 'production',
} as const
