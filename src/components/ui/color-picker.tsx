'use client';

import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { COLOR_SWATCHES } from '@/lib/constants/colors';

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
  className?: string;
}

export function ColorPicker({ value, onChange, className }: ColorPickerProps) {
  return (
    <div className={cn('grid grid-cols-6 gap-2', className)}>
      {COLOR_SWATCHES.map((color) => (
        <button
          key={color.value}
          type="button"
          onClick={() => onChange(color.value)}
          className={cn(
            'relative h-10 w-10 rounded-md transition-all hover:scale-110',
            'focus:ring-primary focus:ring-2 focus:ring-offset-2 focus:outline-none'
          )}
          style={{ backgroundColor: color.value }}
          aria-label={`Select ${color.name}`}
          title={color.name}
        >
          {value === color.value && (
            <Check className="absolute inset-0 m-auto h-5 w-5 text-white drop-shadow-md" />
          )}
        </button>
      ))}
    </div>
  );
}
