import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { mockTestimonies } from "@/lib/data";
import { formatDistanceToNow } from 'date-fns';
import { Heart, MessageCircle, Share2, PlusCircle } from "lucide-react";
import { CreateTestimonyForm } from "@/components/testimonies/create-testimony-form";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

function TestimonyCard({ testimony }: { testimony: (typeof mockTestimonies)[0] }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-4">
          <Avatar>
            <AvatarImage src={testimony.author.avatarUrl} alt={testimony.author.name} />
            <AvatarFallback>{testimony.author.name.charAt(0)}</AvatarFallback>
          </Avatar>
          <div>
            <CardTitle>{testimony.author.name}</CardTitle>
            <CardDescription>{formatDistanceToNow(new Date(testimony.createdAt), { addSuffix: true })}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <h3 className="font-semibold text-lg mb-2">{testimony.title}</h3>
        <p className="text-muted-foreground">{testimony.content}</p>
      </CardContent>
      <CardFooter className="flex justify-between">
        <div className="flex gap-4">
          <Button variant="ghost" size="sm" className="flex items-center gap-2 group">
            <Heart className="h-4 w-4 group-hover:text-red-500 group-hover:fill-red-500 transition-colors" />
            <span className="text-muted-foreground">{testimony.likes}</span>
          </Button>
          <Button variant="ghost" size="sm" className="flex items-center gap-2">
            <MessageCircle className="h-4 w-4" />
            <span className="text-muted-foreground">Comment</span>
          </Button>
        </div>
        <Button variant="ghost" size="sm" className="flex items-center gap-2">
          <Share2 className="h-4 w-4" />
          <span>Share</span>
        </Button>
      </CardFooter>
    </Card>
  );
}

export default function TestimoniesPage() {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight font-headline">Testimonies</h1>
          <p className="text-muted-foreground">Read and share what God has done.</p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" />
              Share Testimony
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[625px]">
            <DialogHeader>
              <DialogTitle>Share Your Testimony</DialogTitle>
              <DialogDescription>
                Encourage others by sharing what God has done in your life. Your story matters.
              </DialogDescription>
            </DialogHeader>
            <CreateTestimonyForm />
          </DialogContent>
        </Dialog>
      </div>
      <div className="grid gap-6 md:grid-cols-1 lg:max-w-3xl mx-auto">
        {mockTestimonies.map((testimony) => (
          <TestimonyCard key={testimony.id} testimony={testimony} />
        ))}
      </div>
    </div>
  );
}
