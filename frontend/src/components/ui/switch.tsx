import * as React from "react"
import * as SwitchPrimitives from "@radix-ui/react-switch"
import { Moon, Sun } from "lucide-react"

import { cn } from "@/lib/utils"

interface SwitchProps extends React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root> {
  checked: boolean
  onCheckedChange: (checked: boolean) => void
}

const DayNightSwitch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitives.Root>,
  SwitchProps
>(({ className, checked, onCheckedChange, ...props }, ref) => {
  return (
    <SwitchPrimitives.Root
      checked={checked}
      onCheckedChange={onCheckedChange}
      className={cn(
        "peer inline-flex h-10 w-36 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=unchecked]:bg-input relative",
        className
      )}
      {...props}
      ref={ref}
    >
      <SwitchPrimitives.Thumb
        className={cn(
          "pointer-events-none flex items-center justify-center h-7 w-7 rounded-full bg-background shadow-lg ring-0 transition-transform",
          checked ? "translate-x-28" : "translate-x-0"
        )}
      >
        {checked ? (
          <Moon className="h-3 w-3 text-muted-foreground" />
        ) : (
          <Sun className="h-3 w-3 text-muted-foreground" />
        )}
      </SwitchPrimitives.Thumb>
    </SwitchPrimitives.Root>
  )
})

DayNightSwitch.displayName = SwitchPrimitives.Root.displayName

export { DayNightSwitch }
