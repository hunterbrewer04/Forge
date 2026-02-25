export type WizardStep = 'account' | 'plans' | 'payment' | 'success'

export const STEP_LABELS = ['Create Account', 'Choose Plan', 'Payment', 'Confirmation']
export const STEP_ORDER: WizardStep[] = ['account', 'plans', 'payment', 'success']

export function stepIndex(step: WizardStep): number {
  return STEP_ORDER.indexOf(step)
}

export const STEP_HEADINGS: Record<WizardStep, { title: string; description?: string }> = {
  account: { title: 'Create your account', description: 'Join to book sessions and manage your training.' },
  plans: { title: 'Choose your plan', description: 'Pick a membership to unlock the full booking calendar.' },
  payment: { title: 'Payment details', description: 'Your membership starts immediately after payment.' },
  success: { title: '', description: '' },
}
