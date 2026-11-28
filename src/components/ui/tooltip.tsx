"use client"

import * as React from "react"
import { Tooltip as TooltipPrimitive } from "@base-ui/react/tooltip"
import { cn } from "cn"

function TooltipProvider({
  delay = 160,
  ...props
}: TooltipPrimitive.Provider.Props) {
  return (
    <TooltipPrimitive.Provider
      data-slot="tooltip-provider"
      delay={delay}
      {...props}
    />
  )
}

function Tooltip({ ...props }: TooltipPrimitive.Root.Props) {
  return <TooltipPrimitive.Root data-slot="tooltip" {...props} />
}

function TooltipTrigger({ ...props }: TooltipPrimitive.Trigger.Props) {
  return <TooltipPrimitive.Trigger data-slot="tooltip-trigger" {...props} />
}

function TooltipContent({
  className,
  side = "top",
  sideOffset = 6,
  align = "center",
  alignOffset = 0,
  children,
  ...props
}: TooltipPrimitive.Popup.Props &
  Pick<
    TooltipPrimitive.Positioner.Props,
    "align" | "alignOffset" | "side" | "sideOffset"
  >) {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Positioner
        align={align}
        alignOffset={alignOffset}
        side={side}
        sideOffset={sideOffset}
        className="isolate z-[80]"
      >
        <TooltipPrimitive.Popup
          data-slot="tooltip-content"
          className={cn(
            "z-[80] inline-flex w-fit max-w-[260px] origin-(--transform-origin) items-center gap-2 rounded-[10px] border border-oled-border bg-oled px-3 py-1.5 text-[11.5px] leading-relaxed text-oled-foreground shadow-[0_14px_34px_rgba(11,14,16,0.34)] data-[side=bottom]:slide-in-from-top-1.5 data-[side=left]:slide-in-from-right-1.5 data-[side=right]:slide-in-from-left-1.5 data-[side=top]:slide-in-from-bottom-1.5 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
            className
          )}
          {...props}
        >
          {children}
        </TooltipPrimitive.Popup>
      </TooltipPrimitive.Positioner>
    </TooltipPrimitive.Portal>
  )
}

interface HintProps {
  content?: React.ReactNode
  kbd?: string
  side?: "top" | "bottom" | "left" | "right"
  delay?: number
  children: React.ReactElement
}

function Hint({ content, kbd, side = "bottom", delay = 160, children }: HintProps) {
  if (!content) return children
  return (
    <Tooltip>
      <TooltipTrigger delay={delay} render={children} />
      <TooltipContent side={side}>
        <span className="leading-snug">{content}</span>
        {kbd && (
          <kbd className="shrink-0 rounded-[4px] border border-oled-border bg-oled-elevated px-1.5 py-0.5 font-mono text-[10px] font-semibold text-oled-muted">
            {kbd}
          </kbd>
        )}
      </TooltipContent>
    </Tooltip>
  )
}

interface HelpHintProps {
  content?: React.ReactNode
  side?: "top" | "bottom" | "left" | "right"
  className?: string
  ariaLabel?: string
}

function HelpHint({ content, side = "top", className, ariaLabel = "Help" }: HelpHintProps) {
  if (!content) return null
  return (
    <Tooltip>
      <TooltipTrigger
        delay={80}
        closeOnClick={false}
        render={
          <span
            role="button"
            tabIndex={0}
            data-slot="help-hint"
            aria-label={ariaLabel}
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
            }}
            onPointerDown={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault()
                e.stopPropagation()
              }
            }}
            className={cn(
              "inline-flex size-4 shrink-0 items-center justify-center rounded-full border border-muted-foreground/35 bg-muted-foreground/12 font-mono text-[10px] font-semibold leading-none text-muted-foreground hover:border-primary/60 hover:bg-primary/15 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 transition-colors duration-200 cursor-help select-none align-middle",
              className
            )}
          >
            ?
          </span>
        }
      />
      <TooltipContent side={side}>{content}</TooltipContent>
    </Tooltip>
  )
}

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider, Hint, HelpHint }
