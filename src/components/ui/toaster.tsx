"use client"

import Image from "next/image";
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

const logo = PlaceHolderImages.find((img) => img.id === 'logo');

export function Toaster() {
  const { toasts } = useToast()

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, ...props }) {
        return (
          <Toast key={id} {...props}>
            <div className="flex items-start gap-4">
              {logo && (
                <Image
                  src={logo.imageUrl}
                  alt={logo.description}
                  width={32}
                  height={32}
                  className="rounded-md mt-1"
                  data-ai-hint={logo.imageHint}
                />
              )}
              <div className="grid gap-1">
                {title && <ToastTitle>{title}</ToastTitle>}
                {description && (
                  <ToastDescription>{description}</ToastDescription>
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
