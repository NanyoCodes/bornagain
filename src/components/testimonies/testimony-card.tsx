"use client";

import Image from "next/image";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Testimony } from "@/lib/types";
import { formatDistanceToNow } from 'date-fns';
import { Heart, MessageCircle, Share2 } from "lucide-react";

function MediaPreview({ testimony }: { testimony: Testimony }) {
  if (!testimony.mediaUrl || !testimony.mediaType) {
    return null;
  }

  if (testimony.mediaType === 'image') {
    return (
      <div className="relative aspect-video w-full mt-4 rounded-lg overflow-hidden">
        <Image
          src={testimony.mediaUrl}
          alt={testimony.title}
          fill
          className="object-cover"
        />
      </div>
    );
  }

  if (testimony.mediaType === 'video') {
    return (
      <video controls src={testimony.mediaUrl} className="w-full mt-4 rounded-lg">
        Your browser does not support the video tag.
      </video>
    );
  }

  if (testimony.mediaType === 'audio') {
    return (
      <audio controls src={testimony.mediaUrl} className="w-full mt-4">
        Your browser does not support the audio element.
      </audio>
    );
  }

  return null;
}


export function TestimonyCard({ testimony }: { testimony: Testimony }) {
  const createdAtDate = testimony.createdAt ? new Date(testimony.createdAt.seconds * 1000) : new Date();

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-4">
          <Avatar>
            <AvatarImage src={testimony.authorAvatarUrl} alt={testimony.authorName} />
            <AvatarFallback>{testimony.authorName.charAt(0)}</AvatarFallback>
          </Avatar>
          <div>
            <CardTitle>{testimony.authorName}</CardTitle>
            <CardDescription>{formatDistanceToNow(createdAtDate, { addSuffix: true })}</CardDescription>
          </div>
          <Badge variant="secondary" className="ml-auto">{testimony.category}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <h3 className="font-semibold text-lg mb-2">{testimony.title}</h3>
        <p className="text-muted-foreground whitespace-pre-wrap">{testimony.content}</p>
        <MediaPreview testimony={testimony} />
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
