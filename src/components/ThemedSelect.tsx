import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export type ThemedOption = { value: string; label: string };

/**
 * Theme-consistent dropdown used across the app instead of the native <select>,
 * which renders an unstyled OS popup that clashes with the dark/orange theme.
 * Built on the Radix-based Select so the popup is fully themed everywhere.
 */
export function ThemedSelect({
  value,
  onValueChange,
  options,
  placeholder,
  className,
  contentClassName,
  ariaLabel,
}: {
  value: string;
  onValueChange: (value: string) => void;
  options: ThemedOption[];
  placeholder?: string;
  className?: string;
  contentClassName?: string;
  ariaLabel?: string;
}) {
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger
        aria-label={ariaLabel}
        className={cn("border-border bg-background/60 focus:border-primary focus:ring-0", className)}
      >
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent className={cn("border-border bg-card text-foreground", contentClassName)}>
        {options.map((o) => (
          <SelectItem
            key={o.value}
            value={o.value}
            className="cursor-pointer focus:bg-primary/15 focus:text-primary data-[state=checked]:text-primary"
          >
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
