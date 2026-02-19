
'use client';

import { useMemo, useState } from 'react';
import { useCollection, useFirestore, useUser } from '@/firebase';
import { collection, query, where, documentId, orderBy } from 'firebase/firestore';
import type { Campaign, JoinedCampaign, Testimony, Soul } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowRight, CalendarIcon, XCircle } from 'lucide-react';
import { format, isSameMonth } from 'date-fns';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';

function FilterControls({
  searchTerm,
  setSearchTerm,
  filterDate,
  setFilterDate,
  searchPlaceholder,
}: {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  filterDate: Date | undefined;
  setFilterDate: (date: Date | undefined) => void;
  searchPlaceholder: string;
}) {
  return (
    <div className="flex flex-col sm:flex-row gap-2 mb-4">
      <Input
        placeholder={searchPlaceholder}
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="flex-grow"
      />
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant={"outline"}
            className={cn(
              "w-full sm:w-[240px] justify-start text-left font-normal",
              !filterDate && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {filterDate ? format(filterDate, "MMMM yyyy") : <span>Filter by month</span>}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={filterDate}
            onSelect={setFilterDate}
            captionLayout="dropdown-buttons"
            fromYear={2020}
            toYear={new Date().getFullYear() + 1}
            initialFocus
          />
        </PopoverContent>
      </Popover>
      {filterDate && (
        <Button variant="ghost" size="icon" onClick={() => setFilterDate(undefined)}>
          <XCircle className="h-5 w-5 text-muted-foreground" />
          <span className="sr-only">Clear date filter</span>
        </Button>
      )}
    </div>
  );
}


function ListItem({ href, title, subtitle }: { href: string; title: string; subtitle: string; }) {
    return (
        <div className="flex items-center justify-between hover:bg-muted/50 p-2 rounded-lg -mx-2">
          <div>
            <p className="font-medium text-sm">{title}</p>
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          </div>
          <Button asChild size="sm" variant="ghost">
            <Link href={href}>
                <ArrowRight className="h-4 w-4" />
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
  const { user, loading: authLoading } = useUser();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDate, setFilterDate] = useState<Date>();

  const joinedIdsQuery = useMemo(() => {
    if (authLoading || !user?.uid || !firestore) return null;
    return query(collection(firestore, `users/${userId}/joinedCampaigns`));
  },[authLoading, user?.uid, userId, firestore]);
  const { data: joinedCampaignsDocs, loading: joinedIdsLoading } = useCollection<JoinedCampaign>(joinedIdsQuery);

  const joinedCampaignIds = useMemo(() => joinedCampaignsDocs?.map(j => j.id) ?? [], [joinedCampaignsDocs]);

  const joinedQuery = useMemo(() => {
    if (authLoading || !user || !firestore || joinedCampaignIds.length === 0) return null;
    return query(collection(firestore, 'campaigns'), where(documentId(), 'in', joinedCampaignIds));
  }, [authLoading, user, firestore, joinedCampaignIds]);

  const { data: campaigns, loading: joinedLoading } = useCollection<Campaign>(joinedQuery);
  const loading = authLoading || joinedIdsLoading || (joinedCampaignIds.length > 0 && !!joinedQuery && joinedLoading);

  const enrichedCampaigns = useMemo(() => {
    if (!campaigns || !joinedCampaignsDocs) return [];
    
    const campaignMap = new Map(campaigns.map(c => [c.id, c]));
    
    return joinedCampaignsDocs
        .map(jcd => {
            const campaign = campaignMap.get(jcd.id);
            if (!campaign || campaign.status === 'deleted' || campaign.organizerId === userId) {
                return null;
            }
            return {
                ...campaign,
                joinedAt: jcd.joinedAt,
            };
        })
        .filter((c): c is (Campaign & { joinedAt: any }) => !!c);

  }, [campaigns, joinedCampaignsDocs, userId]);

  const filteredCampaigns = useMemo(() => {
    if (!enrichedCampaigns) return [];

    return enrichedCampaigns.filter(campaign => {
        const searchLower = searchTerm.toLowerCase();
        const matchesSearch = searchTerm ?
            campaign.title.toLowerCase().includes(searchLower) ||
            campaign.location.toLowerCase().includes(searchLower) ||
            (campaign.goal && campaign.goal.toLowerCase().includes(searchLower))
            : true;
        
        const matchesDate = filterDate && campaign.joinedAt ?
            isSameMonth(campaign.joinedAt.toDate(), filterDate)
            : true;

        return matchesSearch && matchesDate;
    });
  }, [enrichedCampaigns, searchTerm, filterDate]);


  if (loading) {
    return <ListSkeleton />;
  }
  
  if (enrichedCampaigns.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-4">You haven't joined any campaigns created by others.</p>
  }

  return (
    <div className="space-y-2">
      <FilterControls
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        filterDate={filterDate}
        setFilterDate={setFilterDate}
        searchPlaceholder="Search by title, location..."
      />
      {filteredCampaigns.length > 0 ? (
        filteredCampaigns.map(campaign => (
          <ListItem 
              key={campaign.id}
              href="/dashboard/campaigns"
              title={campaign.title}
              subtitle={`Joined on ${format(campaign.joinedAt.toDate(), 'PPP')}`}
          />
        ))
      ) : (
        <p className="text-sm text-muted-foreground text-center py-4">No campaigns match your filters.</p>
      )}
    </div>
  )
}

export function TestimoniesList({ userId }: { userId: string }) {
  const firestore = useFirestore();
  const { user, loading: authLoading } = useUser();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDate, setFilterDate] = useState<Date>();

  const testimoniesQuery = useMemo(() => {
    if (authLoading || !user?.uid || !firestore) return null;
    return query(collection(firestore, 'testimonies'), where('authorId', '==', userId), orderBy('createdAt', 'desc'));
  }, [authLoading, user?.uid, userId, firestore]);
  const { data: testimonies, loading } = useCollection<Testimony>(testimoniesQuery);

  const filteredTestimonies = useMemo(() => {
    if (!testimonies) return [];
    return testimonies.filter(testimony => {
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = searchTerm ?
        testimony.category.toLowerCase().includes(searchLower) ||
        testimony.content.toLowerCase().includes(searchLower)
        : true;
      
      const matchesDate = filterDate && testimony.createdAt ?
        isSameMonth(testimony.createdAt.toDate(), filterDate)
        : true;

      return matchesSearch && matchesDate;
    });
  }, [testimonies, searchTerm, filterDate]);

  if (loading || authLoading) return <ListSkeleton />;
  if (!testimonies || testimonies.length === 0) return <p className="text-sm text-muted-foreground text-center py-4">You haven't shared any testimonies.</p>;

  return (
    <div className="space-y-2">
       <FilterControls
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        filterDate={filterDate}
        setFilterDate={setFilterDate}
        searchPlaceholder="Search by content, category..."
      />
      {filteredTestimonies.length > 0 ? (
        filteredTestimonies.map(testimony => (
            <ListItem 
                key={testimony.id}
                href="/dashboard/testimonies"
                title={testimony.category}
                subtitle={testimony.content.substring(0, 50) + '...'}
            />
        ))
      ) : (
         <p className="text-sm text-muted-foreground text-center py-4">No testimonies match your filters.</p>
      )}
    </div>
  )
}

export function CampaignsCreatedList({ userId }: { userId: string }) {
  const firestore = useFirestore();
  const { user, loading: authLoading } = useUser();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDate, setFilterDate] = useState<Date>();

  const campaignsQuery = useMemo(() => {
    if (authLoading || !user?.uid || !firestore) return null;
    return query(collection(firestore, 'campaigns'), where('organizerId', '==', userId), orderBy('createdAt', 'desc'));
  }, [authLoading, user?.uid, userId, firestore]);
  const { data: campaigns, loading } = useCollection<Campaign>(campaignsQuery);
  
  const activeCampaigns = useMemo(() => campaigns?.filter(c => c.status !== 'deleted') ?? [], [campaigns]);

  const filteredCampaigns = useMemo(() => {
    return activeCampaigns.filter(campaign => {
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = searchTerm ?
        campaign.title.toLowerCase().includes(searchLower) ||
        campaign.location.toLowerCase().includes(searchLower) ||
        (campaign.goal && campaign.goal.toLowerCase().includes(searchLower))
        : true;
      
      const matchesDate = filterDate && campaign.createdAt ?
        isSameMonth(campaign.createdAt.toDate(), filterDate)
        : true;

      return matchesSearch && matchesDate;
    });
  }, [activeCampaigns, searchTerm, filterDate]);


  if (loading || authLoading) return <ListSkeleton />;
  
  if (activeCampaigns.length === 0) return <p className="text-sm text-muted-foreground text-center py-4">You haven't created any campaigns.</p>;

  return (
    <div className="space-y-2">
      <FilterControls
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        filterDate={filterDate}
        setFilterDate={setFilterDate}
        searchPlaceholder="Search by title, location..."
      />
      {filteredCampaigns.length > 0 ? (
        filteredCampaigns.map(campaign => (
            <ListItem 
                key={campaign.id}
                href="/dashboard/campaigns"
                title={campaign.title}
                subtitle={campaign.location}
            />
        ))
      ) : (
         <p className="text-sm text-muted-foreground text-center py-4">No campaigns match your filters.</p>
      )}
    </div>
  )
}

export function SoulsWonList({ userId }: { userId: string }) {
  const firestore = useFirestore();
  const { user, loading: authLoading } = useUser();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDate, setFilterDate] = useState<Date>();

  const soulsQuery = useMemo(() => {
    if (authLoading || !user?.uid || !firestore) return null;
    return query(collection(firestore, `users/${userId}/souls`), orderBy('wonAt', 'desc'));
  }, [authLoading, user?.uid, userId, firestore]);
  const { data: souls, loading } = useCollection<Soul>(soulsQuery);

  const filteredSouls = useMemo(() => {
    if (!souls) return [];
    return souls.filter(soul => {
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = searchTerm ?
        soul.name.toLowerCase().includes(searchLower) ||
        soul.source.toLowerCase().includes(searchLower) ||
        (soul.sourceDetails && soul.sourceDetails.toLowerCase().includes(searchLower))
        : true;
      
      const matchesDate = filterDate && soul.wonAt ?
        isSameMonth(soul.wonAt.toDate(), filterDate)
        : true;

      return matchesSearch && matchesDate;
    });
  }, [souls, searchTerm, filterDate]);

  if (loading || authLoading) return <ListSkeleton />;
  if (!souls || souls.length === 0) return <p className="text-sm text-muted-foreground text-center py-4">You haven't logged any souls won.</p>;

  return (
    <div className="space-y-2">
      <FilterControls
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        filterDate={filterDate}
        setFilterDate={setFilterDate}
        searchPlaceholder="Search by name, source..."
      />
      {filteredSouls.length > 0 ? (
        filteredSouls.map(soul => (
            <ListItem 
                key={soul.id}
                href="/dashboard/souls-won"
                title={soul.name}
                subtitle={`Won on ${format(soul.wonAt.toDate(), 'PPP')}`}
            />
        ))
      ) : (
        <p className="text-sm text-muted-foreground text-center py-4">No records match your filters.</p>
      )}
    </div>
  )
}
