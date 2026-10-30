'use client';

import * as React from 'react';
import Link from 'next/link';
import { useUser, useFirestore, useCollection } from '@/firebase';
import { collection, query } from 'firebase/firestore';
import { ShoppingBag, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export function MarketplaceCheckoutBar({ category = 'provision' }: { category?: 'provision' | 'kindness' }) {
    const { user } = useUser();
    const firestore = useFirestore();

    const cartQuery = React.useMemo(() => (user && firestore) ? query(collection(firestore, 'users', user.uid, 'cart')) : null, [user, firestore]);
    const { data: cartItems } = useCollection<any>(cartQuery);
    
    const cartCount = React.useMemo(() => cartItems?.reduce((acc, item) => acc + (item.quantity || 0), 0) || 0, [cartItems]);

    if (cartCount === 0) return null;

    const label = category === 'kindness' ? 'Kindness Package' : 'Provision Package';

    return (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-40 w-full max-w-sm px-6 animate-in slide-in-from-bottom-10 duration-500 text-left">
            <Link href="/marketplace/checkout" className="block group text-left">
                <div className="relative overflow-hidden rounded-full bg-[#1c1c21] border-4 border-white/5 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] flex items-center h-16 p-1 transition-all group-hover:scale-[1.02] group-active:scale-95 group-hover:border-primary/20 text-left">
                    {/* Glossy overlay effect */}
                    <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 text-left" />
                    
                    <div className="flex-1 flex items-center gap-4 pl-5 pr-2 relative z-10 text-left">
                        <div className="relative text-left">
                            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg border border-white/10 text-left">
                                <ShoppingBag className="h-5 w-5 text-white/80 text-left" />
                            </div>
                            <div className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-primary flex items-center justify-center border-2 border-[#1c1c21] shadow-xl animate-in zoom-in text-center text-left">
                                <span className="text-[10px] font-black text-white text-center text-left"> {cartCount}</span>
                            </div>
                        </div>
                        <div className="flex flex-col text-left leading-none min-w-0 text-left">
                            <span className="text-[11px] font-black uppercase tracking-[0.2em] text-primary text-left">{label}</span>
                        </div>
                    </div>

                    <div className="h-12 w-12 rounded-full bg-primary text-white flex items-center justify-center shadow-[inset_0_2px_4px_rgba(255,255,255,0.3)] group-hover:shadow-[0_0_20px_rgba(249,116,22,0.4)] transition-all relative z-10 shrink-0 mr-1 text-left">
                        <ArrowRight className="h-6 w-6 transition-transform group-hover:translate-x-1 text-left" />
                    </div>
                </div>
            </Link>
        </div>
    );
}
