import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap font-bold transition-all duration-[400ms] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        // Primary orange button with solid shadow
        default: "bg-[#FF4612] text-white hover:bg-[#FF4612]/90 shadow-[0_4px_0_0_#FDFDE1] hover:shadow-none hover:translate-y-1",
        
        // Accent lime button with solid shadow
        accent: "bg-[#BFF747] text-black hover:bg-[#BFF747]/90 shadow-[0_4px_0_0_#FDFDE1] hover:shadow-none hover:translate-y-1",
        
        // Yellow/Corn button with solid shadow
        yellow: "bg-[#F4B905] text-black hover:bg-[#F4B905]/90 shadow-[0_4px_0_0_#FDFDE1] hover:shadow-none hover:translate-y-1",
        
        // Green button with solid shadow
        green: "bg-green-600 text-white hover:bg-green-700 shadow-[0_4px_0_0_#FDFDE1] hover:shadow-none hover:translate-y-1",
        
        // Blue button with solid shadow
        blue: "bg-blue-600 text-white hover:bg-blue-700 shadow-[0_4px_0_0_#FDFDE1] hover:shadow-none hover:translate-y-1",
        
        // Secondary outline style
        secondary: "border-2 border-[#000000] bg-transparent text-[#000000] hover:bg-[#000000] hover:text-white",
        
        // Ghost/link style
        ghost: "hover:bg-[#F6F5EF] hover:text-[#6B7280]",
        
        // Link style
        link: "text-[#000000] underline-offset-4 hover:underline",
      },
      size: {
        default: "h-[60px] px-10 text-[16px] font-bold", // Template exact size
        sm: "h-[45px] px-6 text-[14px] font-bold",
        lg: "h-[70px] px-12 text-[18px] font-bold",
        icon: "h-10 w-10",
        pill: "h-[60px] px-10 text-[16px] font-bold",
      },
      radius: {
        default: "rounded-[3px]", // Template exact radius
        sm: "rounded-sm",
        md: "rounded-md", 
        lg: "rounded-lg",
        pill: "rounded-[50px]",
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default",
      radius: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const DesignWorksButton = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, radius, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, radius, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
DesignWorksButton.displayName = "DesignWorksButton"

export { DesignWorksButton, buttonVariants }