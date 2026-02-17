import Image from "next/image";
import Link from "next/link";
import { PlaceHolderImages } from "@/lib/placeholder-images";
import { LoginForm } from "@/components/auth/login-form";
import { Button } from "@/components/ui/button";
import { Icons } from "@/components/icons";

export default function LoginPage() {
  const logo = PlaceHolderImages.find((img) => img.id === "logo");

  return (
    <div className="flex min-h-screen w-full bg-background">
      <div className="flex flex-1 flex-col items-center justify-center gap-6 p-4 md:p-8">
        <div className="w-full max-w-md space-y-6 text-center">
          {logo && (
            <Image
              src={logo.imageUrl}
              alt={logo.description}
              width={160}
              height={160}
              className="mx-auto"
              data-ai-hint={logo.imageHint}
              priority
            />
          )}
          <div className="space-y-2">
            <h1 className="font-headline text-4xl font-bold tracking-tighter text-primary">
              Testify Global
            </h1>
            <p className="text-muted-foreground">
              Empowering believers worldwide to share their faith.
            </p>
          </div>
          <LoginForm />
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                Or continue with
              </span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Button variant="outline">
              <Icons.google className="mr-2 h-5 w-5" />
              Google
            </Button>
            <Button variant="outline">
              <Icons.facebook className="mr-2 h-5 w-5 text-[#1877F2]" />
              Facebook
            </Button>
          </div>
          <p className="px-8 text-center text-sm text-muted-foreground">
            By clicking continue, you agree to our{" "}
            <Link
              href="/terms"
              className="underline underline-offset-4 hover:text-primary"
            >
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link
              href="/privacy"
              className="underline underline-offset-4 hover:text-primary"
            >
              Privacy Policy
            </Link>
            .
          </p>
        </div>
      </div>
      <div className="hidden lg:flex lg:flex-1">
         <Image
            src="https://images.unsplash.com/photo-1543269865-cbf427effbad?q=80&w=2070&auto=format&fit=crop"
            alt="People gathered together in a community setting, smiling and talking."
            width={1920}
            height={1080}
            className="h-full w-full object-cover"
            priority
          />
      </div>
    </div>
  );
}
