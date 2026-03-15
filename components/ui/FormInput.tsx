import { forwardRef } from 'react'

interface FormInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  hint?: string
}

const FormInput = forwardRef<HTMLInputElement, FormInputProps>(
  ({ label, hint, className, ...props }, ref) => (
    <div>
      {label && (
        <label className="block text-sm font-medium text-text-secondary mb-1.5">
          {label}
        </label>
      )}
      <input
        ref={ref}
        className={`w-full bg-bg-secondary text-text-primary rounded-xl px-4 py-3 text-sm border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none placeholder:text-text-muted ${className || ''}`}
        {...props}
      />
      {hint && (
        <p className="text-text-muted text-xs mt-1">{hint}</p>
      )}
    </div>
  )
)

FormInput.displayName = 'FormInput'

export default FormInput
