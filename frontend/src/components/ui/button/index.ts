import type { VariantProps } from "class-variance-authority"
import { cva } from "class-variance-authority"

export { default as Button } from "./Button.vue"

export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-semibold ring-offset-background transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 active:scale-[0.985] disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-[0_10px_24px_-12px_hsl(var(--primary)/0.9)] hover:bg-primary/92 hover:shadow-[0_16px_32px_-14px_hsl(var(--primary)/0.88)]",
        destructive:
          "bg-destructive text-destructive-foreground shadow-[0_10px_24px_-12px_hsl(var(--destructive)/0.8)] hover:bg-destructive/90",
        outline:
          "border border-input bg-background/88 shadow-sm hover:bg-accent/70 hover:text-accent-foreground hover:shadow-md",
        secondary:
          "bg-secondary/90 text-secondary-foreground shadow-sm hover:bg-secondary hover:shadow-md",
        ghost: "hover:bg-accent/75 hover:text-accent-foreground hover:shadow-sm",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        "default": "h-10 px-4 py-2",
        "sm": "h-9 rounded-md px-3",
        "lg": "h-11 rounded-xl px-8",
        "icon": "h-10 w-10",
        "icon-sm": "size-9",
        "icon-lg": "size-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
)

export type ButtonVariants = VariantProps<typeof buttonVariants>
