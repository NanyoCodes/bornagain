'use client';

import { useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useDoc, useFirestore, useUser, useCollection } from '@/firebase';
import type { Fellowship, UserProfile, FellowshipMember, Soul } from '@/lib/types';
import { doc, collection, query, orderBy, where } from 'firebase/firestore';
import { Loader2, ArrowLeft, Users, Calendar, PlayCircle, MapPin, UserCheck2, Heart } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function FellowshipPageClient() {
    const router = useRouter();
    const params = useParams();
    const fellowshipId = params.fellowshipId as string;
    const firestore = useFirestore();
    const { user } = useUser();

    const fellowshipDocRef = useMemo(() => {
        if (!firestore || !fellowshipId) return null;
        return doc(firestore, 'fellowships', fellowshipId)
    }, [firestore, fellowshipId]);
    const { data: fellowship, loading: fellowshipLoading, error: fellowshipError } = useDoc<Fellowship>(fellowshipDocRef);

    const organizerDocRef = useMemo(() => {
        if (!fellowship?.organizerId || !firestore) return null;
        return doc(firestore, 'users', fellowship.organizerId);
    }, [fellowship?.organizerId, firestore]);
    const { data: organizer, loading: organizerLoading } = useDoc<UserProfile>(organizerDocRef);
    
    const isMember = useMemo(() => {
        if (!user || !fellowship) return false;
        return fellowship.memberIds.includes(user.uid);
    }, [user, fellowship]);

    const isOrganizer = useMemo(() => {
        if (!user || !fellowship) return false;
        return fellowship.organizerId === user.uid;
    }, [user, fellowship]);

    // Query for believers (app users who joined)
    const membersQuery = useMemo(() => {
        if (!firestore || !fellowshipId || !(isMember || isOrganizer)) return null;
        return query(collection(firestore, 'fellowships', fellowshipId, 'members'), orderBy('joinedAt', 'desc'));
    }, [firestore, fellowshipId, isMember, isOrganizer]);
    const { data: members, loading: membersLoading } = useCollection<FellowshipMember>(membersQuery);

    // Query for souls (converts assigned to this group)
    const soulsQuery = useMemo(() => {
        if (!firestore || !fellowshipId || !(isMember || isOrganizer)) return null;
        return query(collection(firestore, 'souls'), where('fellowshipId', '==', fellowshipId));
    }, [firestore, fellowshipId, isMember, isOrganizer]);
    const { data: assignedSouls, loading: soulsLoading } = useCollection<Soul>(soulsQuery);

    const loading = fellowshipLoading || organizerLoading;

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }
    
    if (fellowshipError || !fellowship || fellowship.status === 'deleted') {
        return (
            <div className="text-center py-12 flex flex-col items-center">
                <Users className="h-16 w-16 text-muted-foreground" />
                <h3 className="mt-4 text-xl font-semibold">Fellowship Not Found</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                   This fellowship may have been removed or the link is incorrect.
                </p>
                <Button asChild variant="outline" className="mt-6">
                    <Link href="/dashboard/fellowship"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Fellowships</Link>
                </Button>
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            <Button variant="outline" onClick={() => router.back()} className="w-fit">
                <ArrowLeft className="mr-2 h-4 w-4"/>
                Back
            </Button>

            <header className="space-y-2">
                <h1 className="text-3xl md:text-4xl font-bold font-headline">{fellowship.name}</h1>
                <p className="text-lg text-muted-foreground">{fellowship.description}</p>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Users className="h-5 w-5" /> Fellowship Directory
                            </CardTitle>
                             <CardDescription>
                                {isMember || isOrganizer 
                                    ? "View believers and converts in this fellowship." 
                                    : "Join the fellowship to access the member directory."}
                             </CardDescription>
                        </CardHeader>
                        <CardContent>
                           {(isMember || isOrganizer) ? (
                               <Tabs defaultValue="believers">
                                    <TabsList className="grid w-full grid-cols-2 mb-4">
                                        <TabsTrigger value="believers">Believers ({members?.length || 0})</TabsTrigger>
                                        <TabsTrigger value="souls">Assigned Souls ({assignedSouls?.length || 0})</TabsTrigger>
                                    </TabsList>
                                    <TabsContent value="believers">
                                        {membersLoading ? (
                                            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
                                        ) : members && members.length > 0 ? (
                                            <ScrollArea className="h-96 pr-4">
                                                <div className="space-y-4">
                                                    {members.map(member => (
                                                        <div key={member.id} className="flex items-center gap-4 p-3 rounded-lg border bg-muted/20">
                                                            <Avatar>
                                                                <AvatarImage src={member.photoURL} />
                                                                <AvatarFallback>{member.firstName?.charAt(0)}</AvatarFallback>
                                                            </Avatar>
                                                            <div className="flex-1 min-w-0">
                                                                <p className="font-semibold truncate">{member.firstName} {member.lastName}</p>
                                                                {member.userId === fellowship.organizerId && (
                                                                    <Badge variant="secondary" className="text-[10px] h-4">Organizer</Badge>
                                                                )}
                                                            </div>
                                                            <Button asChild variant="ghost" size="sm">
                                                                <Link href={`/dashboard/profile/${member.userId}`}>Profile</Link>
                                                            </Button>
                                                        </div>
                                                    ))}
                                                </div>
                                            </ScrollArea>
                                        ) : (
                                            <p className="text-sm text-muted-foreground text-center py-8">No believers found.</p>
                                        )}
                                    </TabsContent>
                                    <TabsContent value="souls">
                                        {soulsLoading ? (
                                            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
                                        ) : assignedSouls && assignedSouls.length > 0 ? (
                                            <ScrollArea className="h-96 pr-4">
                                                <div className="space-y-4">
                                                    {assignedSouls.map(soul => (
                                                        <div key={soul.id} className="flex items-center gap-4 p-3 rounded-lg border bg-primary/5 border-primary/10">
                                                            <Avatar>
                                                                <AvatarFallback><Heart className="h-4 w-4 text-primary" /></AvatarFallback>
                                                            </Avatar>
                                                            <div className="flex-1 min-w-0">
                                                                <p className="font-semibold truncate">{soul.firstName} {soul.lastName}</p>
                                                                <p className="text-xs text-muted-foreground">Status: <span className="font-medium text-primary">{soul.status}</span></p>
                                                            </div>
                                                            <Button asChild variant="outline" size="sm">
                                                                <Link href="/dashboard/souls-won">Follow-up</Link>
                                                            </Button>
                                                        </div>
                                                    ))}
                                                </div>
                                            </ScrollArea>
                                        ) : (
                                            <div className="p-8 text-center bg-muted/30 rounded-lg border-2 border-dashed">
                                                <p className="text-sm text-muted-foreground italic">No souls have been assigned to this fellowship yet.</p>
                                            </div>
                                        )}
                                    </TabsContent>
                               </Tabs>
                           ) : (
                               <div className="p-12 text-center bg-muted/30 rounded-lg border-2 border-dashed">
                                   <Users className="h-10 w-10 text-muted-foreground/30 mx-auto mb-4" />
                                   <p className="text-sm text-muted-foreground italic">The member directory is only visible to people who have joined this fellowship.</p>
                               </div>
                           )}
                        </CardContent>
                    </Card>
                </div>
                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2"><Calendar className="h-5 w-5"/> Schedule & Location</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4 text-sm">
                            {fellowship.schedule && (
                                <div>
                                    <p className="font-semibold">Schedule</p>
                                    <p className="text-muted-foreground">{fellowship.schedule}</p>
                                </div>
                            )}
                            {fellowship.location && (
                                <div>
                                    <p className="font-semibold flex items-center gap-1"><MapPin className="h-3 w-3" /> Location</p>
                                    <p className="text-muted-foreground">{fellowship.location}</p>
                                </div>
                            )}
                            {(isMember || isOrganizer) && fellowship.streamUrl && (
                                <Button asChild className="w-full mt-2">
                                    <Link href={fellowship.streamUrl} target="_blank" rel="noopener noreferrer">
                                        <PlayCircle className="mr-2 h-4 w-4" />
                                        Join Stream
                                    </Link>
                                </Button>
                            )}
                            {!(isMember || isOrganizer) && fellowship.streamUrl && (
                                <p className="text-xs text-muted-foreground mt-2 italic text-center">Join the fellowship to access the stream link.</p>
                            )}
                        </CardContent>
                    </Card>

                    {organizer && (
                         <Card>
                            <CardHeader>
                                <CardTitle className="text-lg">Organizer</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <Link href={`/dashboard/profile/${organizer.id}`} className="flex items-center gap-3 group">
                                    <Avatar>
                                        <AvatarImage src={organizer.photoURL ?? undefined} />
                                        <AvatarFallback>{organizer.firstName?.charAt(0)}{organizer.lastName?.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                    <span className="font-semibold group-hover:underline">{organizer.firstName} {organizer.lastName}</span>
                                </Link>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    );
}