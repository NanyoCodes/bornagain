
'use client';

import { useMemo } from 'react';
import { useCollection, useFirestore } from '@/firebase';
import { collection, query, where, documentId, orderBy } from 'firebase/firestore';
import type { Campaign, JoinedCampaign, Testimony, Soul } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ExternalLink } from 'lucide-react';
import { format } from 'date-fns';

function ListItem({ href, title, subtitle }: { href: string; title: string; subtitle: string; }) {
    return (
        <div className="flex items-center justify-between hover:bg-muted/50 p-2 rounded-lg -mx-2">
          <div>
            <p className="font-medium text-sm">{title}</p>
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          </div>
          <Button asChild size="icon" variant="ghost">
            <Link href={href} target="_blank">
              <ExternalLink className="h-4 w-4" />
            </Link>
          </Button>
        </div>
    )
}

function ListSkeleton() {
    return (
        <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
            <div key={i} className="flex items-center justify-between p-2">
                <div className="space-y-1">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-4 w-32" />
                </div>
                <Skeleton className="h-8 w-8 rounded-md" />
            </div>
            ))}
      </div>
    )
}

export function JoinedCampaignsList({ userId }: { userId: string }) {
  const firestore = useFirestore();

  const joinedIdsQuery = useMemo(() => 
    firestore ? query(collection(firestore, `users/${userId}/joinedCampaigns`)) : null,
  [userId, firestore]);
  const { data: joinedCampaignsDocs, loading: joinedIdsLoading } = useCollection<JoinedCampaign>(joinedIdsQuery);

  const joinedCampaignIds = useMemo(() => joinedCampaignsDocs?.map(j => j.id) ?? [], [joinedCampaignsDocs]);

  const joinedQuery = useMemo(() => {
    if (!firestore || joinedCampaignIds.length === 0) return null;
    return query(collection(firestore, 'campaigns'), where(documentId(), 'in', joinedCampaignIds));
  }, [firestore, joinedCampaignIds]);

  const { data: campaigns, loading: joinedLoading } = useCollection<Campaign>(joinedQuery);
  const loading = joinedIdsLoading || (joinedCampaignIds.length > 0 && !!joinedQuery && joinedLoading);

  if (loading) {
    return <ListSkeleton />;
  }
  
  const activeCampaigns = campaigns?.filter(c => c.status !== 'deleted') ?? [];

  if (activeCampaigns.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-4">You haven't joined any campaigns.</p>
  }

  return (
    <div className="space-y-2">
      {activeCampaigns.map(campaign => (
        <ListItem 
            key={campaign.id}
            href="/dashboard/campaigns"
            title={campaign.title}
            subtitle={campaign.location}
        />
      ))}
    </div>
  )
}

export function TestimoniesList({ userId }: { userId: string }) {
  const firestore = useFirestore();
  const testimoniesQuery = useMemo(() => firestore ? query(collection(firestore, 'testimonies'), where('authorId', '==', userId), orderBy('createdAt', 'desc')) : null, [userId, firestore]);
  const { data: testimonies, loading } = useCollection<Testimony>(testimoniesQuery);

  if (loading) return <ListSkeleton />;
  if (!testimonies || testimonies.length === 0) return <p className="text-sm text-muted-foreground text-center py-4">You haven't shared any testimonies.</p>;

  return (
    <div className="space-y-2">
        {testimonies.map(testimony => (
            <ListItem 
                key={testimony.id}
                href="/dashboard/testimonies"
                title={testimony.category}
                subtitle={testimony.content.substring(0, 50) + '...'}
            />
        ))}
    </div>
  )
}

export function CampaignsCreatedList({ userId }: { userId: string }) {
  const firestore = useFirestore();
  const campaignsQuery = useMemo(() => firestore ? query(collection(firestore, 'campaigns'), where('organizerId', '==', userId), orderBy('createdAt', 'desc')) : null, [userId, firestore]);
  const { data: campaigns, loading } = useCollection<Campaign>(campaignsQuery);

  if (loading) return <ListSkeleton />;
  
  const activeCampaigns = campaigns?.filter(c => c.status !== 'deleted') ?? [];
  if (activeCampaigns.length === 0) return <p className="text-sm text-muted-foreground text-center py-4">You haven't created any campaigns.</p>;

  return (
    <div className="space-y-2">
        {activeCampaigns.map(campaign => (
            <ListItem 
                key={campaign.id}
                href="/dashboard/campaigns"
                title={campaign.title}
                subtitle={campaign.location}
            />
        ))}
    </div>
  )
}

export function SoulsWonList({ userId }: { userId: string }) {
  const firestore = useFirestore();
  const soulsQuery = useMemo(() => firestore ? query(collection(firestore, `users/${userId}/souls`), orderBy('wonAt', 'desc')) : null, [userId, firestore]);
  const { data: souls, loading } = useCollection<Soul>(soulsQuery);

  if (loading) return <ListSkeleton />;
  if (!souls || souls.length === 0) return <p className="text-sm text-muted-foreground text-center py-4">You haven't logged any souls won.</p>;

  return (
    <div className="space-y-2">
        {souls.map(soul => (
            <ListItem 
                key={soul.id}
                href="/dashboard/souls-won"
                title={soul.name}
                subtitle={`Won on ${format(soul.wonAt.toDate(), 'PPP')}`}
            />
        ))}
    </div>
  )
}
