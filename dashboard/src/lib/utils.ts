// Diseñado por: Edward Labrador  ·  Para: ELITE GROUP - Integral Services LLC
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, formatDistanceToNow } from 'date-fns';
import { enUS } from 'date-fns/locale';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style:    'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(date: string | Date, fmt = 'dd MMM yyyy'): string {
  return format(new Date(date), fmt, { locale: enUS });
}

export function formatDateTime(date: string | Date): string {
  return format(new Date(date), 'dd MMM yyyy HH:mm', { locale: enUS });
}

export function timeAgo(date: string | Date): string {
  return formatDistanceToNow(new Date(date), { addSuffix: true, locale: enUS });
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
}

export function formatDistance(miles: number): string {
  return miles < 0.1 ? `${(miles * 5280).toFixed(0)} ft` : `${miles.toFixed(1)} mi`;
}

export const STATUS_DRIVER: Record<string, { label: string; color: string }> = {
  pending:      { label: 'Pending',      color: 'text-gray-600  bg-gray-100' },
  under_review: { label: 'Under review', color: 'text-amber-700 bg-amber-100' },
  active:       { label: 'Active',       color: 'text-green-700 bg-green-100' },
  inactive:     { label: 'Inactive',     color: 'text-gray-600  bg-gray-100' },
  suspended:    { label: 'Suspended',    color: 'text-red-700   bg-red-100' },
  rejected:     { label: 'Rejected',     color: 'text-red-700   bg-red-100' },
};

export const STATUS_RIDE: Record<string, { label: string; color: string }> = {
  searching:    { label: 'Searching',    color: 'text-blue-700  bg-blue-100' },
  assigned:     { label: 'Assigned',     color: 'text-indigo-700 bg-indigo-100' },
  arrived:      { label: 'Arrived',      color: 'text-purple-700 bg-purple-100' },
  in_progress:  { label: 'In progress',  color: 'text-amber-700 bg-amber-100' },
  completed:    { label: 'Completed',    color: 'text-green-700 bg-green-100' },
  cancelled:    { label: 'Cancelled',    color: 'text-red-700   bg-red-100' },
};
