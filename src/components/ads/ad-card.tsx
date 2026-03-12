'use client';

import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Image from "next/image";
import { Button } from "../ui/button";
import { ArrowRight } from "lucide-react";
import { PlaceHolderImages } from "@/lib/placeholder-images";
import Link from "next/link";

export function AdCard() {
    const adImage = PlaceHolderImages.find((img) => img.id === 'ad-placeholder-1');

    return (
        <Card className="flex flex-col h-full overflow-hidden shadow-md hover:shadow-lg transition-shadow duration-300">
            <CardHeader className="flex-row items-start justify-between pb-2">
                 <p className="text-sm font-semibold">Sponsored</p>
                 <Badge variant="outline" className="text-xs">Ad</Badge>
            </CardHeader>
            <CardContent className="space-y-4">
                {adImage && (
                    <div className="aspect-video w-full relative rounded-md overflow-hidden">
                        <Image
                            src={adImage.imageUrl}
                            alt={adImage.description}
                            fill
                            className="object-cover"
                            data-ai-hint={adImage.imageHint}
                        />
                    </div>
                )}
                <div className="space-y-1">
                    <h4 className="font-semibold leading-none">Promotional Content Headline</h4>
                    <p className="text-sm text-muted-foreground">
                        This is where the ad copy would go, describing the sponsored product or service.
                    </p>
                </div>
            </CardContent>
            <CardFooter className="mt-auto">
                <Button asChild className="w-full" variant="outline">
                    <Link href="#" target="_blank" rel="noopener noreferrer">
                        Learn More <ArrowRight className="ml-2 h-4 w-4"/>
                    </Link>
                </Button>
            </CardFooter>
        </Card>
    );
}
