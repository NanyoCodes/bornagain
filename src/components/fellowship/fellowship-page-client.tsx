'use client';

import { useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useDoc, useFirestore, useUser, useCollection } from '@/firebase';
import type { Fellowship, UserProfile, FellowshipMember } from '@/lib/types';
import { doc, collection, query, orderBy } from 'firebase/firestore';
import { Loader2, ArrowLeft, Users, Calendar, PlayCircle, MapPin } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import Link from 'next/link';
import { ScrollArea } from '@/components/ui/scroll-area';

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
        return fellowship.organizerId === user.uid);
    }, [user, fellowship]);

    const membersQuery = useMemo(() => {
        if (!firestore || !fellowshipId || !(isMember || isOrganizer)) return null;
        return query(collection(firestore, 'fellowships', fellowshipId, 'members'), orderBy('joinedAt', 'desc'));
    }, [firestore, fellowshipId, isMember, isOrganizer]);
    const { data: members, loading: membersLoading } = useCollection<FellowshipMember>(membersQuery);

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
                                <Users className="h-5 w-5" /> Members ({fellowship.memberCount})
                            </CardTitle>
                             <CardDescription>
                                {isMember || isOrganizer 
                                    ? "Fellowship members are listed below." 
                                    : "Join the fellowship to see who else is part of this group."}
                             </CardDescription>
                        </CardHeader>
                        <CardContent>
                           {(isMember || isOrganizer) ? (
                               membersLoading ? (
                                   <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
                               ) : members && members.length > 0 ? (
                                   <ScrollArea className="h-96 pr-4">
                                       <div className="space-y-4">
                                           {members.map(member => (
                                               <div key={member.id} className="flex items-center gap-4 p-2 rounded-lg border bg-muted/20">
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
                                   <p className="text-sm text-muted-foreground text-center py-8">No members found.</p>
                               )
                           ) : (
                               <div className="p-8 text-center bg-muted/30 rounded-lg border-2 border-dashed">
                                   <p className="text-sm text-muted-foreground italic">List is restricted to fellowship members.</p>
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