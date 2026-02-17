import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { mockUser } from "@/lib/data";
import { Edit, Globe, Mail, MapPin, Newspaper, Phone, Target, UserCheck2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

function AchievementBadge({ achievement }: { achievement: (typeof mockUser.achievements)[0] }) {
  return (
    <div className="flex flex-col items-center text-center gap-2">
      <div className="relative">
        <svg viewBox="0 0 100 100" className="w-20 h-20">
          <path
            d="M50 2.5 L90 25 L90 75 L50 97.5 L10 75 L10 25 Z"
            className="fill-secondary"
          />
          <path
            d="M50 2.5 L90 25 L90 75 L50 97.5 L10 75 L10 25 Z"
            className="fill-transparent stroke-primary"
            strokeWidth="3"
          />
          <text x="50" y="58" textAnchor="middle" className="font-bold text-4xl fill-primary">
            {achievement.level}
          </text>
        </svg>
      </div>
      <p className="font-semibold text-sm">{achievement.name}</p>
      <p className="text-xs text-muted-foreground">{achievement.description}</p>
    </div>
  );
}

export default function ProfilePage() {
  const { name, bio, avatarUrl, coverBannerUrl, location, phone, email, website, stats, achievements } = mockUser;

  return (
    <div className="space-y-8">
      <Card className="overflow-hidden">
        <div className="relative">
          <Image
            src={coverBannerUrl}
            alt="Cover Banner"
            width={1200}
            height={300}
            className="w-full h-48 object-cover"
            data-ai-hint="abstract gradient"
          />
          <div className="absolute top-24 left-8">
            <Image
              src={avatarUrl}
              alt={name}
              width={128}
              height={128}
              className="rounded-full border-4 border-background"
              data-ai-hint="woman portrait"
            />
          </div>
          <div className="absolute top-4 right-4">
            <Button>
              <Edit className="mr-2 h-4 w-4" />
              Edit Profile
            </Button>
          </div>
        </div>
        <div className="pt-20 px-8 pb-8">
          <h1 className="text-3xl font-bold font-headline">{name}</h1>
          <p className="text-muted-foreground">{bio}</p>
          <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
            <div className="flex items-center gap-2"><MapPin className="h-4 w-4" /> {location}</div>
            <div className="flex items-center gap-2"><Mail className="h-4 w-4" /> {email}</div>
            <div className="flex items-center gap-2"><Phone className="h-4 w-4" /> {phone}</div>
            <div className="flex items-center gap-2"><Globe className="h-4 w-4" /> <a href={website} className="text-primary hover:underline">{website}</a></div>
          </div>
        </div>
      </Card>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>Activity Statistics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center"><span className="flex items-center gap-2 text-muted-foreground"><Newspaper className="h-4 w-4" />Testimonies</span> <Badge variant="secondary">{stats.testimonies}</Badge></div>
            <div className="flex justify-between items-center"><span className="flex items-center gap-2 text-muted-foreground"><Target className="h-4 w-4" />Campaigns</span> <Badge variant="secondary">{stats.campaignsJoined}</Badge></div>
            <div className="flex justify-between items-center"><span className="flex items-center gap-2 text-muted-foreground"><UserCheck2 className="h-4 w-4" />Souls Won</span> <Badge variant="secondary">{stats.soulsWon}</Badge></div>
          </CardContent>
        </Card>
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Achievements</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 sm:grid-cols-3 gap-6">
            {achievements.map(ach => <AchievementBadge key={ach.id} achievement={ach} />)}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
