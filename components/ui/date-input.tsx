"use client"

import React from "react"
import { cn } from "@/lib/utils"

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
}

export function DateInput({
  value,
  onChange,
  className,
  placeholder,
  required = false,
  disabled = false,
  min,
  max,
  id,
  name,
}: DateInputProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value)
  }

  return (
    <input
      type="date"
      id={id}
      name={name}
      value={value}
      onChange={handleChange}
      placeholder={placeholder}
      required={required}
      disabled={disabled}
      min={min}
      max={max}
      className={cn(
        "w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500",
        disabled && "bg-gray-100 cursor-not-allowed",
        className
      )}
    />
  )
}
