"use client"

import React, { useState, useEffect } from "react"
import { Calendar } from "lucide-react"
import { cn, isoToDisplay, displayToISO, parseDDMMYYYY } from "@/lib/utils"

interface DateInputProps {
  value: string // ISO format (yyyy-MM-dd)
  onChange: (isoDate: string) => void
  className?: string
  placeholder?: string
  required?: boolean
  disabled?: boolean
  min?: string // ISO format
  max?: string // ISO format
  id?: string
  name?: string
  showCalendarIcon?: boolean // Show/hide calendar icon
}

export function DateInput({
  value,
  onChange,
  className,
  placeholder = "dd/MM/yyyy",
  required = false,
  disabled = false,
  min,
  max,
  id,
  name,
  showCalendarIcon = true,
}: DateInputProps) {
  // Convert ISO to display format for the input
  const [displayValue, setDisplayValue] = useState(() => isoToDisplay(value))
  const [error, setError] = useState<string>("")

  // Update display value when prop value changes
  useEffect(() => {
    setDisplayValue(isoToDisplay(value))
  }, [value])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value
    setDisplayValue(inputValue)
    setError("")

    // If empty, call onChange with empty string
    if (!inputValue) {
      onChange("")
      return
    }

    // Try to parse the input
    const { isValid, isoDate } = parseDDMMYYYY(inputValue)

    if (isValid) {
      // Check min/max constraints
      if (min && isoDate < min) {
        setError(`Date must be on or after ${isoToDisplay(min)}`)
        return
      }
      if (max && isoDate > max) {
        setError(`Date must be on or before ${isoToDisplay(max)}`)
        return
      }

      onChange(isoDate)
    }
  }

  const handleBlur = () => {
    // Validate on blur
    if (displayValue && !parseDDMMYYYY(displayValue).isValid) {
      setError("Invalid date format. Use dd/MM/yyyy")
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Auto-add slashes when typing
    const input = e.currentTarget
    const key = e.key

    if (key === "Backspace" || key === "Delete") return

    // Only allow numbers and slashes
    if (!/[\d/]/.test(key) && key !== "Tab" && key !== "Enter") {
      e.preventDefault()
      return
    }

    const currentValue = input.value.replace(/\//g, "")
    const cursorPos = input.selectionStart || 0

    // Auto-format with slashes
    if (key >= "0" && key <= "9") {
      const newValue = input.value
      if (newValue.length === 2 && cursorPos === 2 && !newValue.includes("/")) {
        setTimeout(() => {
          input.value = newValue + "/"
          input.setSelectionRange(3, 3)
        }, 0)
      } else if (newValue.length === 5 && cursorPos === 5 && newValue.split("/").length === 2) {
        setTimeout(() => {
          input.value = newValue + "/"
          input.setSelectionRange(6, 6)
        }, 0)
      }
    }
  }

  return (
    <div className="relative">
      <div className="relative">
        <input
          type="text"
          id={id}
          name={name}
          value={displayValue}
          onChange={handleChange}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          maxLength={10}
          className={cn(
            "w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500",
            showCalendarIcon ? "pr-10" : "",
            error ? "border-red-500 focus:ring-red-500" : "border-gray-300",
            disabled && "bg-gray-100 cursor-not-allowed",
            className
          )}
        />
        {showCalendarIcon && (
          <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
        )}
      </div>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  )
}
