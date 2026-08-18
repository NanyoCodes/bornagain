'use client';

import { useEffect } from 'react';
import { useUser, useFirestore, useUserProfile } from '@/firebase';
import { collection, query, where, getDocs, doc, addDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { format } from 'date-fns';
import { safeToDate } from '@/lib/utils';
import type { Soul, UserProfile, Notification } from '@/lib/types';

/**
 * @fileOverview Background birthday checker that detects birthdays for souls and partners.
 * Creates local notifications for the user if a birthday is detected today.
 */
export function BirthdayChecker() {
    const { user } = useUser();
    const { userProfile } = useUserProfile();
    const firestore = useFirestore();

    useEffect(() => {
        if (!user || !userProfile || !firestore) return;

        const checkBirthdays = async () => {
            const today = new Date();
            const todayKey = format(today, 'yyyy-MM-dd');
            const lastCheckKey = `last_birthday_check_${user.uid}`;
            const lastCheck = localStorage.getItem(lastCheckKey);
            
            // Only check once per day to optimize Firestore usage
            if (lastCheck === todayKey) return;

            try {
                // 1. Check User's Souls
                const soulsRef = collection(firestore, `users/${user.uid}/souls`);
                const soulsSnap = await getDocs(soulsRef);
                
                for (const soulDoc of soulsSnap.docs) {
                    const soul = soulDoc.data() as Soul;
                    const dob = safeToDate(soul.dateOfBirth);
                    if (dob && dob.getDate() === today.getDate() && dob.getMonth() === today.getMonth()) {
                        await createNotification(
                            `Soul Birthday: ${soul.firstName} ${soul.lastName}`,
                            `Today is ${soul.firstName}'s birthday! Reach out with a Kingdom word of blessing.`,
                            `/souls-won`,
                            `soul_${soulDoc.id}`
                        );
                    }
                }

                // 2. Check Accountability Partners
                const partners = userProfile.accountabilityPartners || [];
                for (const partner of partners) {
                    // Fetch current profile for birthday info
                    const partnerDoc = await getDoc(doc(firestore, 'users', partner.userId));
                    if (partnerDoc.exists()) {
                        const pData = partnerDoc.data() as UserProfile;
                        const dob = safeToDate(pData.dateOfBirth);
                        if (dob && dob.getDate() === today.getDate() && dob.getMonth() === today.getMonth()) {
                            await createNotification(
                                `Partner Birthday: ${partner.firstName}`,
                                `It's your partner ${partner.firstName}'s birthday! Celebrate their life and walk today.`,
                                `/accountability`,
                                `partner_${partner.userId}`
                            );
                        }
                    }
                }

                localStorage.setItem(lastCheckKey, todayKey);
            } catch (error) {
                console.error("Birthday check error:", error);
            }
        };

        const createNotification = async (title: string, message: string, link: string, targetId: string) => {
            const today = new Date();
            const uniqueId = `bday_${targetId}_${format(today, 'yyyyMMdd')}`;
            
            // Check if already notified for this person today to avoid duplicate alerts
            const notifQuery = query(
                collection(firestore, `users/${user.uid}/notifications`),
                where('type', '==', 'birthday_reminder'),
                where('targetId', '==', uniqueId)
            );
            
            const existing = await getDocs(notifQuery);
            if (!existing.empty) return;

            await addDoc(collection(firestore, `users/${user.uid}/notifications`), {
                userId: user.uid,
                type: 'birthday_reminder',
                title,
                message,
                link,
                targetId: uniqueId,
                isRead: false,
                createdAt: serverTimestamp()
            });
        };

        // Run after initial boot stabilization
        const timeoutId = setTimeout(checkBirthdays, 6000);
        return () => clearTimeout(timeoutId);
    }, [user, userProfile, firestore]);

    return null;
}
