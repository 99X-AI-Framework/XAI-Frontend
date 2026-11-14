import { useRef } from 'react'
import type { ClipboardEvent, KeyboardEvent } from 'react'

interface OtpInputProps {
  length?: number
  value: string
  onChange: (next: string) => void
  disabled?: boolean
  autoFocus?: boolean
}

export function OtpInput({ length = 6, value, onChange, disabled = false, autoFocus = true }: OtpInputProps) {
  const refs = useRef<Array<HTMLInputElement | null>>([])
  const digits = Array.from({ length }, (_, idx) => value[idx] ?? '')

  const setDigitAt = (index: number, char: string) => {
    const arr = Array.from({ length }, (_, idx) => value[idx] ?? '')
    arr[index] = char
    onChange(arr.join(''))
  }

  const handleChange = (index: number, raw: string) => {
    const cleaned = raw.replace(/\D/g, '')
    if (!cleaned) {
      setDigitAt(index, '')
      return
    }
    if (cleaned.length > 1) {
      // Handle autofill / multi-char input
      const next = (value.slice(0, index) + cleaned).slice(0, length)
      onChange(next)
      refs.current[Math.min(index + cleaned.length, length - 1)]?.focus()
      return
    }
    setDigitAt(index, cleaned[0])
    if (index < length - 1) {
      refs.current[index + 1]?.focus()
    }
  }

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      refs.current[index - 1]?.focus()
    } else if (e.key === 'ArrowLeft' && index > 0) {
      e.preventDefault()
      refs.current[index - 1]?.focus()
    } else if (e.key === 'ArrowRight' && index < length - 1) {
      e.preventDefault()
      refs.current[index + 1]?.focus()
    }
  }

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length)
    if (!pasted) return
    onChange(pasted)
    refs.current[Math.min(pasted.length, length - 1)]?.focus()
  }

  return (
    <div className="my-5 flex justify-center gap-2" role="group" aria-label="Verification code">
      {digits.map((digit, index) => (
        <input
          key={index}
          ref={(el) => {
            refs.current[index] = el
          }}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={1}
          autoComplete={index === 0 ? 'one-time-code' : 'off'}
          autoFocus={autoFocus && index === 0}
          disabled={disabled}
          value={digit}
          aria-label={`Digit ${index + 1} of ${length}`}
          onChange={(e) => handleChange(index, e.target.value)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          onPaste={handlePaste}
          className="h-12 w-11 rounded-[10px] border border-slate-200 bg-slate-50 text-center text-xl font-bold text-slate-900 transition focus:border-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 disabled:opacity-60"
        />
      ))}
    </div>
  )
}

