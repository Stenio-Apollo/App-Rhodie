import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  // clsx expects variadic arguments, not an array
  return twMerge(clsx(...inputs))
}
