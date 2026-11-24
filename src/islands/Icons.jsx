import {
  Volume2,
  X,
  Check,
  CircleX,
  CircleCheck,
  ArrowLeft,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Star,
  Settings,
  Info,
} from 'lucide-preact';

/**
 * Standard Icon Registry for Synapse Hanzi
 * Ensures uniform strokeWidth, size, and styling across all islands.
 */

export function AudioIcon({ size = 18, strokeWidth = 2, className = '', color = 'currentColor', ...props }) {
  return <Volume2 size={size} strokeWidth={strokeWidth} class={className} color={color} {...props} />;
}

// Modal / Drawer / Dialog close button
export function CloseIcon({ size = 18, strokeWidth = 2, className = '', color = 'currentColor', ...props }) {
  return <X size={size} strokeWidth={strokeWidth} class={className} color={color} {...props} />;
}

// Cancel ongoing action
export function CancelIcon({ size = 18, strokeWidth = 2, className = '', color = 'currentColor', ...props }) {
  return <X size={size} strokeWidth={strokeWidth} class={className} color={color} {...props} />;
}

// Clear input search field
export function ClearIcon({ size = 16, strokeWidth = 2, className = '', color = 'currentColor', ...props }) {
  return <CircleX size={size} strokeWidth={strokeWidth} class={className} color={color} {...props} />;
}

// Wrong / Incorrect answer in quiz & exams (red tone by default)
export function WrongIcon({ size = 18, strokeWidth = 2, className = '', color = '#ef4444', ...props }) {
  return <CircleX size={size} strokeWidth={strokeWidth} class={className} color={color} {...props} />;
}

// Correct answer in quiz & exams (green tone by default)
export function CorrectIcon({ size = 18, strokeWidth = 2, className = '', color = '#22c55e', ...props }) {
  return <CircleCheck size={size} strokeWidth={strokeWidth} class={className} color={color} {...props} />;
}

// Standard check mark
export function CheckIcon({ size = 18, strokeWidth = 2, className = '', color = 'currentColor', ...props }) {
  return <Check size={size} strokeWidth={strokeWidth} class={className} color={color} {...props} />;
}

export function ArrowLeftIcon({ size = 18, strokeWidth = 2, className = '', color = 'currentColor', ...props }) {
  return <ArrowLeft size={size} strokeWidth={strokeWidth} class={className} color={color} {...props} />;
}

export function ArrowRightIcon({ size = 18, strokeWidth = 2, className = '', color = 'currentColor', ...props }) {
  return <ArrowRight size={size} strokeWidth={strokeWidth} class={className} color={color} {...props} />;
}

export function ChevronLeftIcon({ size = 18, strokeWidth = 2, className = '', color = 'currentColor', ...props }) {
  return <ChevronLeft size={size} strokeWidth={strokeWidth} class={className} color={color} {...props} />;
}

export function ChevronRightIcon({ size = 18, strokeWidth = 2, className = '', color = 'currentColor', ...props }) {
  return <ChevronRight size={size} strokeWidth={strokeWidth} class={className} color={color} {...props} />;
}

export function RotateIcon({ size = 18, strokeWidth = 2, className = '', color = 'currentColor', ...props }) {
  return <RotateCcw size={size} strokeWidth={strokeWidth} class={className} color={color} {...props} />;
}

export function StarIcon({ size = 18, strokeWidth = 2, filled = false, className = '', color = 'currentColor', ...props }) {
  return (
    <Star
      size={size}
      strokeWidth={strokeWidth}
      fill={filled ? '#fbbf24' : 'none'}
      color={filled ? '#fbbf24' : color}
      class={className}
      {...props}
    />
  );
}

export function SettingsIcon({ size = 18, strokeWidth = 2, className = '', color = 'currentColor', ...props }) {
  return <Settings size={size} strokeWidth={strokeWidth} class={className} color={color} {...props} />;
}

export function InfoIcon({ size = 18, strokeWidth = 2, className = '', color = 'currentColor', ...props }) {
  return <Info size={size} strokeWidth={strokeWidth} class={className} color={color} {...props} />;
}
