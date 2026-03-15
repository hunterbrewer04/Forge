import { Loader2 } from '@/components/ui/icons'

export default function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center py-16">
      <Loader2 size={24} className="text-primary animate-spin" />
    </div>
  )
}
