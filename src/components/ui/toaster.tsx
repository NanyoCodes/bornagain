"use client"

import { useToast } from "@/hooks/use-toast"
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast"
import { PlaceHolderImages } from "@/lib/placeholder-images";
import { Avatar, AvatarFallback, AvatarImage } from "./avatar";

const logo = PlaceHolderImages.find((img) => img.id === 'logo');

export function Toaster() {
  const { toasts } = useToast()

  return (
    <ToastProvider duration={3000}>
      {toasts.map(function ({ id, title, description, action, ...props }) {
        return (
          <Toast key={id} {...props}>
            <div className="flex items-start gap-4 text-left">
              {logo && (
                <Avatar className="h-7 w-7 mt-1 shrink-0">
                  <AvatarImage src={logo.imageUrl} alt="BornAgain" />
                  <AvatarFallback className="font-black text-[10px]">B</AvatarFallback>
                </Avatar>
              )}
              <div className="grid gap-1">
                {title && <ToastTitle className="text-sm font-black uppercase tracking-tight">{title}</ToastTitle>}
                {description && (
                  <ToastDescription className="text-xs font-medium text-muted-foreground leading-relaxed">{description}</ToastDescription>
                )}
              </div>
            </div>
            {action}
            <ToastClose />
          </Toast>
        )
      })}
      <ToastViewport />
    </ToastProvider>
  )
}
