'use client'

import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

type PasswordInputProps = Omit<React.ComponentProps<typeof Input>, 'type'>

export function PasswordInput({ className, disabled, id, ...props }: PasswordInputProps) {
  const [visible, setVisible] = useState(false)

  return (
    <span className="relative block">
      <Input
        {...props}
        id={id}
        disabled={disabled}
        type={visible ? 'text' : 'password'}
        className={cn('pr-11', className)}
      />
      <button
        type="button"
        disabled={disabled}
        aria-label={visible ? 'Hide password' : 'Show password'}
        aria-pressed={visible}
        aria-controls={id}
        title={visible ? 'Hide password' : 'Show password'}
        onClick={() => setVisible((current) => !current)}
        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-50"
      >
        {visible ? <EyeOff className="size-4" aria-hidden="true" /> : <Eye className="size-4" aria-hidden="true" />}
      </button>
    </span>
  )
}
