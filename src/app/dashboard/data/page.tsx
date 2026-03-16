
'use client';

import React, { useState, useEffect, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import { format } from "date-fns";
import { useCollection, useFirestore, useUser } from "@/firebase";
import { collection, query, where, orderBy } from "firebase/firestore";
import type { Soul, Testimony, Campaign, Chat } from "@/lib/types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useSearch } from "@/context/search-context";

function ListSkeleton() {
    return (
        <div className="p-1 space-y-1">
            {[...Array(5)].map((_, i) => (
                <div key={i} className="p-2 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                </div>
            ))}
        </div>
    );
}

function DataList({ loading, items, titleKey, subtitleKey, dateKey, linkPrefix }: { loading: boolean, items: any[] | null, titleKey: string, subtitleKey: string, dateKey: string, linkPrefix?: string }) {
    if (loading) {
        return <ListSkeleton />;
    }
    
    if (!items || items.length === 0) {
        return <p className="text-sm text-center text-muted-foreground py-4">No data available.</p>;
    }

    return (
        <div className="p-1 space-y-1">
            {items.map(item => {
                const date = item[dateKey]?.toDate ? item[dateKey].toDate() : null;
                const ItemWrapper = linkPrefix ? Link : 'div';
                
                const props: any = linkPrefix ? { href: `${linkPrefix}/${item.id}` } : {};
                if(ItemWrapper === Link) {
                  props.className="block p-2 rounded-md hover:bg-muted";
                } else {
                  props.className="p-2 rounded-md";
                }

                const title = item[titleKey] || '';
                const subtitle = item[subtitleKey] || '';

                return (
                    <ItemWrapper key={item.id} {...props}>
                        <div className="flex justify-between items-start">
                            <div className="min-w-0">
                                <p className="font-medium text-sm truncate">{title}</p>
                                {subtitle && <p className="text-xs text-muted-foreground truncate">{subtitle}</p>}
                            </div>
                            {date && <p className="text-xs text-muted-foreground shrink-0 ml-2">{format(date, "PPP")}</p>}
                        </div>
                    </ItemWrapper>
                );
            })}
        </div>
    );
}


export default function DataExplorerPage() {
    const { user, loading: userLoading } = useUser();
    const firestore = useFirestore();
    const { searchTerm, setSearchPlaceholder, setIsSearchVisible, setSearchTerm } = useSearch();
    const [activeTab, setActiveTab] = useState("testimonies");

    useEffect(() => {
        setIsSearchVisible(true);
        return () => {
          setIsSearchVisible(false);
          setSearchTerm("");
        };
    }, [setIsSearchVisible, setSearchTerm]);

    useEffect(() => {
        const placeholders: { [key: string]: string } = {
            testimonies: "Search testimonies by content, author...",
            campaigns: "Search campaigns by title, goal, location...",
            souls: "Search souls by name...",
            chats: "Search chats by campaign title or name...",
        };
        setSearchPlaceholder(placeholders[activeTab] ?? 'Search...');
    }, [activeTab, setSearchPlaceholder]);
    
    // Testimonies Query
    const testimoniesQuery = useMemo(() => query(collection(firestore, "testimonies"), orderBy("createdAt", "desc")), [firestore]);
    const { data: testimonies, loading: loadingTestimonies } = useCollection<Testimony>(testimoniesQuery);
    
    // Campaigns Query
    const campaignsQuery = useMemo(() => query(collection(firestore, "campaigns"), where('status', '==', 'active'), orderBy("createdAt", "desc")), [firestore]);
    const { data: campaigns, loading: loadingCampaigns } = useCollection<Campaign>(campaignsQuery);
    
    // Global Souls Query
    const soulsQuery = useMemo(() => query(collection(firestore, "souls"), orderBy("wonAt", "desc")), [firestore]);
    const { data: souls, loading: loadingSouls } = useCollection<Soul>(soulsQuery);

    // User's Chats Query
    const chatsQuery = useMemo(() => {
        if (!user?.uid) return null;
        return query(
            collection(firestore, 'chats'),
            where('participantIds', 'array-contains', user.uid),
            orderBy('lastUpdatedAt', 'desc')
        );
    }, [user?.uid, firestore]);
    const { data: chats, loading: loadingChats } = useCollection<Chat>(chatsQuery);

    const filteredTestimonies = useMemo(() => {
        if (!testimonies || !searchTerm) return testimonies;
        const term = searchTerm.toLowerCase();
        return testimonies.filter(t => t.content.toLowerCase().includes(term) || t.category.toLowerCase().includes(term) || `${t.authorFirstName} ${t.authorLastName}`.toLowerCase().includes(term));
    }, [testimonies, searchTerm]);

    const filteredCampaigns = useMemo(() => {
        if (!campaigns || !searchTerm) return campaigns;
        const term = searchTerm.toLowerCase();
        return campaigns.filter(c => c.title.toLowerCase().includes(term) || c.location.toLowerCase().includes(term) || (c.goal && c.goal.toLowerCase().includes(term)));
    }, [campaigns, searchTerm]);

    const filteredSouls = useMemo(() => {
        if (!souls || !searchTerm) return souls;
        const term = searchTerm.toLowerCase();
        return souls.filter(s => `${s.firstName} ${s.lastName}`.toLowerCase().includes(term));
    }, [souls, searchTerm]);
    
    const filteredChats = useMemo(() => {
        if (!chats || !searchTerm) return chats;
        const term = searchTerm.toLowerCase();
        return chats.filter(c => {
             if (c.isGroupChat) {
                return c.campaignTitle?.toLowerCase().includes(term);
            }
            const otherParticipantId = c.participantIds.find(id => id !== user?.uid);
            if (otherParticipantId && c.participantInfo) {
                const info = c.participantInfo[otherParticipantId];
                if (info) {
                    return `${info.firstName} ${info.lastName}`.toLowerCase().includes(term);
                }
            }
            return false;
        });
    }, [chats, searchTerm, user]);

    return (
        <div className="space-y-8">
            <div className="space-y-2">
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight font-headline">
                    Data Explorer
                </h1>
                <p className="text-muted-foreground">
                    A global view of public data across the platform.
                </p>
            </div>
             <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-2 md:grid-cols-4">
                    <TabsTrigger value="testimonies">Testimonies</TabsTrigger>
                    <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
                    <TabsTrigger value="souls">Souls</TabsTrigger>
                    <TabsTrigger value="chats">My Chats</TabsTrigger>
                </TabsList>
                <Card className="mt-4">
                    <CardContent className="p-2 sm:p-4">
                        <TabsContent value="testimonies" className="mt-0">
                            <ScrollArea className="h-96">
                                <DataList loading={loadingTestimonies} items={filteredTestimonies} titleKey="category" subtitleKey="content" dateKey="createdAt" />
                            </ScrollArea>
                        </TabsContent>
                         <TabsContent value="campaigns" className="mt-0">
                             <ScrollArea className="h-96">
                                <DataList loading={loadingCampaigns} items={filteredCampaigns} titleKey="title" subtitleKey="location" dateKey="createdAt" linkPrefix="/dashboard/campaigns" />
                            </ScrollArea>
                        </TabsContent>
                         <TabsContent value="souls" className="mt-0">
                             <ScrollArea className="h-96">
                                {loadingSouls ? <ListSkeleton/> : (
                                    <div className="p-1 space-y-1">
                                        {filteredSouls && filteredSouls.length > 0 ? filteredSouls.map(soul => (
                                             <div key={soul.id} className="p-2 rounded-md">
                                                <div className="flex justify-between items-start">
                                                    <p className="font-medium text-sm truncate">{soul.firstName} {soul.lastName}</p>
                                                    {soul.wonAt?.toDate && <p className="text-xs text-muted-foreground shrink-0 ml-2">{format(soul.wonAt.toDate(), "PPP")}</p>}
                                                </div>
                                             </div>
                                        )) : <p className="text-sm text-center text-muted-foreground py-4">No souls found.</p>}
                                    </div>
                                )}
                            </ScrollArea>
                        </TabsContent>
                         <TabsContent value="chats" className="mt-0">
                             <ScrollArea className="h-96">
                                {(loadingChats || userLoading) ? <ListSkeleton/> : (
                                    <div className="p-1 space-y-1">
                                        {filteredChats && filteredChats.length > 0 ? filteredChats.map(chat => {
                                            const date = chat.lastUpdatedAt?.toDate ? chat.lastUpdatedAt.toDate() : null;
                                            const otherParticipant = !chat.isGroupChat && user ? chat.participantIds.find(id => id !== user.uid) : null;
                                            const otherInfo = otherParticipant ? chat.participantInfo[otherParticipant] : null;
                                            const title = chat.isGroupChat ? (chat.campaignTitle || "Group Chat") : (otherInfo ? `${otherInfo.firstName} ${otherInfo.lastName}` : 'Private Chat');

                                            return (
                                                <Link key={chat.id} href={`/dashboard/chats/${chat.id}`} className="block p-2 rounded-md hover:bg-muted">
                                                    <div className="flex justify-between items-start">
                                                         <p className="font-medium text-sm truncate">{title}</p>
                                                         {date && <p className="text-xs text-muted-foreground shrink-0 ml-2">{format(date, "PPP")}</p>}
                                                    </div>
                                                </Link>
                                            )
                                        }) : <p className="text-sm text-center text-muted-foreground py-4">No chats found.</p>}
                                    </div>
                                )}
                            </ScrollArea>
                        </TabsContent>
                    </CardContent>
                </Card>
            </Tabs>
        </div>
    );
}
