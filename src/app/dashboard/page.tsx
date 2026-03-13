'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  isSameMonth,
  format,
  differenceInHours,
  subDays,
} from 'date-fns';
import {
  ArrowRight,
  UserPlus,
  Globe,
  Loader2,
  RefreshCw,
  XCircle,
  Edit,
  UserCheck2,
} from 'lucide-react';
import { useCollection, useFirestore, useUser, useDoc } from '@/firebase';
import {
  collection,
  query,
  doc,
  updateDoc,
  serverTimestamp,
  orderBy,
  limit,
  where,
  getCountFromServer,
  getDocs,
} from 'firebase/firestore';
import type { Soul, UserProfile } from '@/lib/types';
import { useMemo, useEffect, useState, useCallback } from 'react';
import { DailyDisciplineCard } from '@/components/dashboard/daily-discipline-card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Cell,
} from 'recharts';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Progress } from '@/components/ui/progress';
import { WelcomeBackDialog } from '@/components/dashboard/welcome-back-dialog';
import { safeToDate } from '@/lib/utils';
import { actionItems, statusOptions } from '@/lib/follow-up-data';
import { useIsMobile } from '@/hooks/use-mobile';

function RecentSoulsList() {
  const { user } = useUser();
  const firestore = useFirestore();

  const soulsQuery = useMemo(() => {
    if (!user?.uid || !firestore) return null;
    return query(
      collection(firestore, `users/${user.uid}/souls`),
      orderBy('wonAt', 'desc'),
      limit(3)
    );
  }, [user?.uid, firestore]);
  const { data: souls, loading } = useCollection<Soul>(soulsQuery);

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex items-center gap-4">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="space-y-1 flex-1">
              <Skeleton className="h-4 w-2/4" />
              <Skeleton className="h-3 w-1/4" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!souls || souls.length === 0) {
    return (
      <div className="text-center py-10 border-2 border-dashed rounded-lg bg-slate-50 dark:bg-slate-900/30">
        <div className="mx-auto h-12 w-12 text-muted-foreground">
          <UserPlus strokeWidth={1.5} />
        </div>
        <h3 className="mt-4 text-lg font-semibold">Log Your First Soul</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Start tracking the lives you impact.
        </p>
        <Button asChild size="sm" className="mt-4">
          <Link href="/dashboard/souls-won">
            Get Started <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {souls.map((soul) => {
        const wonDate = safeToDate(soul.wonAt);
        return (
          <Link
            href="/dashboard/souls-won"
            key={soul.id}
            className="flex items-center gap-4 p-2 -mx-2 rounded-lg hover:bg-muted/50 transition-colors"
          >
            <Avatar className="h-10 w-10 border">
              <AvatarFallback>{soul.firstName?.charAt(0) || 'S'}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <p className="font-semibold leading-none">
                {soul.firstName || 'Unknown'} {soul.lastName || ''}
              </p>
              <p className="text-sm text-muted-foreground">
                Won on {wonDate ? format(wonDate, 'PPP') : 'N/A'}
              </p>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
          </Link>
        );
      })}
    </div>
  );
}

function GlobalSoulsCard({
  location,
  userSouls,
}: {
  location: { city?: string; country?: string };
  userSouls: Soul[];
}) {
  const firestore = useFirestore();
  const [cityCount, setCityCount] = useState(0);
  const [countryCount, setCountryCount] = useState(0);
  const [globalCount, setGlobalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const yourCityCount = useMemo(
    () =>
      userSouls.filter(
        (s) => s.userLocation?.city_lowercase === location.city?.toLowerCase()
      ).length,
    [userSouls, location.city]
  );

  const yourCountryCount = useMemo(
    () =>
      userSouls.filter(
        (s) =>
          s.userLocation?.country_lowercase === location.country?.toLowerCase()
      ).length,
    [userSouls, location.country]
  );

  const yourGlobalCount = userSouls.length;

  const fetchCounts = useCallback(async () => {
    if (!firestore) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      setError(null);
      const soulsCollection = collection(firestore, 'souls');

      const promises = [];

      // Global query
      promises.push(getCountFromServer(soulsCollection));

      // City query
      if (location.city) {
        const cityQuery = query(
          soulsCollection,
          where('userLocation.city_lowercase', '==', location.city.toLowerCase())
        );
        promises.push(getCountFromServer(cityQuery));
      } else {
        promises.push(Promise.resolve(null));
      }

      // Country query
      if (location.country) {
        const countryQuery = query(
          soulsCollection,
          where(
            'userLocation.country_lowercase',
            '==',
            location.country.toLowerCase()
          )
        );
        promises.push(getCountFromServer(countryQuery));
      } else {
        promises.push(Promise.resolve(null));
      }

      const [globalSnapshot, citySnapshot, countrySnapshot] =
        await Promise.all(promises);

      setGlobalCount(globalSnapshot?.data().count ?? 0);
      setCityCount(citySnapshot?.data().count ?? 0);
      setCountryCount(countrySnapshot?.data().count ?? 0);
    } catch (error) {
      const permissionError = new FirestorePermissionError({
        path: 'souls',
        operation: 'list',
      });
      errorEmitter.emit('permission-error', permissionError);
      setError('Could not load community stats.');
    } finally {
      setLoading(false);
    }
  }, [firestore, location.city, location.country]);

  useEffect(() => {
    fetchCounts();
    const intervalId = setInterval(fetchCounts, 30000); // Refresh every 30 seconds

    return () => clearInterval(intervalId); // Cleanup on unmount
  }, [fetchCounts]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between pb-4">
        <div>
          <CardTitle className="flex items-center gap-2">
            Community Impact
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
            </span>
          </CardTitle>
          <CardDescription>Souls won by all users.</CardDescription>
        </div>
        <Button variant="ghost" size="icon" onClick={fetchCounts} disabled={loading}>
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          <span className="sr-only">Refresh stats</span>
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {error ? (
          <div className="text-destructive text-sm p-3 rounded-md border border-destructive/50 bg-destructive/10 flex items-center gap-2">
            <XCircle className="h-4 w-4" />
            <p>{error} Please try again.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {location.city && (
              <div className="flex items-center justify-between">
                <span className="font-medium text-muted-foreground">
                  In {location.city}
                </span>
                <div className="text-right">
                  <div className="font-bold text-lg">
                    {loading && cityCount === 0 ? (
                      <Skeleton className="h-6 w-10" />
                    ) : (
                      cityCount
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    You: {yourCityCount}
                  </p>
                </div>
              </div>
            )}
            {location.country && (
              <div className="flex items-center justify-between">
                <span className="font-medium text-muted-foreground">
                  In {location.country}
                </span>
                <div className="text-right">
                  <div className="font-bold text-lg">
                    {loading && countryCount === 0 ? (
                      <Skeleton className="h-6 w-12" />
                    ) : (
                      countryCount
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    You: {yourCountryCount}
                  </p>
                </div>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="font-medium text-muted-foreground">Globally</span>
              <div className="text-right">
                <div className="font-bold text-lg">
                  {loading && globalCount === 0 ? (
                    <Skeleton className="h-6 w-16" />
                  ) : (
                    globalCount
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  You: {yourGlobalCount}
                </p>
              </div>
            </div>
          </div>
        )}
        {!location.city && !location.country && !loading && (
          <p className="text-sm text-center text-muted-foreground py-4">
            Add your location in your profile to see community stats.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

const chartConfig = {
  soulsWon: {
    label: 'Souls Won',
    color: 'hsl(var(--primary))',
  },
} satisfies import('@/components/ui/chart').ChartConfig;

const chartColors = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
];

const welcomeScriptures = [
    // Strength & Courage (15)
    { text: "He gives strength to you when you are weary, {name}", verse: "and increases the power of the weak. - Isaiah 40:29" },
    { text: "But those who hope in the Lord will renew their strength, {name}.", verse: "They will soar on wings like eagles; they will run and not grow weary, they will walk and not be faint. - Isaiah 40:31" },
    { text: "Be strong and courageous, {name}.", verse: "Do not be afraid; do not be discouraged, for the Lord your God will be with you wherever you go. - Joshua 1:9" },
    { text: "{name}, you can do all this through him who gives you strength.", verse: "Philippians 4:13" },
    { text: "My flesh and my heart may fail, but God is the strength of my heart and my portion forever, {name}.", verse: "Psalm 73:26" },
    { text: "The Lord is my strength and my shield, {name}; in him my heart trusts.", verse: "Psalm 28:7" },
    { text: "So do not fear, {name}, for I am with you; do not be dismayed, for I am your God.", verse: "I will strengthen you and help you; I will uphold you with my righteous right hand. - Isaiah 41:10" },
    { text: "God is your refuge and strength, {name}, an ever-present help in trouble.", verse: "Psalm 46:1" },
    { text: "For the Spirit God gave you does not make you timid, but gives you power, love and self-discipline, {name}.", verse: "2 Timothy 1:7" },
    { text: "Look to the Lord and his strength; seek his face always, {name}.", verse: "1 Chronicles 16:11" },
    { text: "The Lord is my light and my salvation, {name}—whom shall I fear?", verse: "The Lord is the stronghold of my life—of whom shall I be afraid? - Psalm 27:1" },
    { text: "Be on your guard; stand firm in the faith; be courageous; be strong, {name}.", verse: "1 Corinthians 16:13" },
    { text: "But he said to me, “My grace is sufficient for you, {name}, for my power is made perfect in weakness.”", verse: "2 Corinthians 12:9" },
    { text: "For who is God besides the Lord? And who is the Rock except our God? It is God who arms you with strength, {name}.", verse: "Psalm 18:31-32" },
    { text: "The Sovereign Lord is my strength; he makes my feet like the feet of a deer, he enables me to tread on the heights, {name}.", verse: "Habakkuk 3:19" },

    // Peace & Comfort (15)
    { text: "Peace I leave with you; my peace I give you, {name}.", verse: "I do not give to you as the world gives. Do not let your hearts be troubled and do not be afraid. - John 14:27" },
    { text: "The Lord gives strength to his people; the Lord blesses his people with peace, {name}.", verse: "Psalm 29:11" },
    { text: "Cast all your anxiety on him because he cares for you, {name}.", verse: "1 Peter 5:7" },
    { text: "Come to me, all you who are weary and burdened, and I will give you rest, {name}.", verse: "Matthew 11:28" },
    { text: "You will keep in perfect peace those whose minds are steadfast, because they trust in you, {name}.", verse: "Isaiah 26:3" },
    { text: "May the God of hope fill you with all joy and peace as you trust in him, {name}.", verse: "so that you may overflow with hope by the power of the Holy Spirit. - Romans 15:13" },
    { text: "The Lord is my shepherd, {name}; I shall not want.", verse: "He makes me lie down in green pastures, he leads me beside quiet waters. - Psalm 23:1-2" },
    { text: "Praise be to the God and Father of our Lord Jesus Christ, the Father of compassion and the God of all comfort, who comforts you in all your troubles, {name}.", verse: "2 Corinthians 1:3-4" },
    { text: "Do not be anxious about anything, {name}, but in every situation, by prayer and petition, with thanksgiving, present your requests to God.", verse: "And the peace of God, which transcends all understanding, will guard your hearts and your minds in Christ Jesus. - Philippians 4:6-7" },
    { text: "When you lie down, you will not be afraid; when you lie down, your sleep will be sweet, {name}.", verse: "Proverbs 3:24" },
    { text: "The Lord is near to all who call on him, to all who call on him in truth, {name}.", verse: "Psalm 145:18" },
    { text: "Even though I walk through the darkest valley, I will fear no evil, for you are with me, {name}; your rod and your staff, they comfort me.", verse: "Psalm 23:4" },
    { text: "Great peace have those who love your law, and nothing can make them stumble, {name}.", verse: "Psalm 119:165" },
    { text: "{name}, you may have peace in me. In this world you will have trouble. But take heart! I have overcome the world.", verse: "John 16:33" },
    { text: "The righteous cry out, and the Lord hears them; he delivers them from all their troubles. The Lord is close to the brokenhearted and saves those who are crushed in spirit, {name}.", verse: "Psalm 34:17-18" },

    // Guidance & Wisdom (15)
    { text: "Trust in the Lord with all your heart, {name}, and lean not on your own understanding.", verse: "in all your ways submit to him, and he will make your paths straight. - Proverbs 3:5-6" },
    { text: "If any of you lacks wisdom, {name}, you should ask God, who gives generously to all without finding fault, and it will be given to you.", verse: "James 1:5" },
    { text: "Your word is a lamp for my feet, a light on my path, {name}.", verse: "Psalm 119:105" },
    { text: "I will instruct you and teach you in the way you should go; I will counsel you with my loving eye on you, {name}.", verse: "Psalm 32:8" },
    { text: "Whether you turn to the right or to the left, your ears will hear a voice behind you, saying, 'This is the way; walk in it,' {name}.", verse: "Isaiah 30:21" },
    { text: "For the Lord gives wisdom; from his mouth come knowledge and understanding, {name}.", verse: "Proverbs 2:6" },
    { text: "The heart of the discerning acquires knowledge, for the ears of the wise seek it out, {name}.", verse: "Proverbs 18:15" },
    { text: "Commit to the Lord whatever you do, {name}, and he will establish your plans.", verse: "Proverbs 16:3" },
    { text: "Show me your ways, Lord, teach me your paths. Guide me in your truth and teach me, for you are God my Savior, and my hope is in you all day long, {name}.", verse: "Psalm 25:4-5" },
    { text: "The fear of the Lord is the beginning of wisdom; all who follow his precepts have good understanding, {name}.", verse: "Psalm 111:10" },
    { text: "To the person who pleases him, God gives wisdom, knowledge and happiness, {name}.", verse: "Ecclesiastes 2:26" },
    { text: "Get wisdom, get understanding; do not forget my words or turn away from them, {name}.", verse: "Proverbs 4:5" },
    { text: "The unfolding of your words gives light; it gives understanding to the simple, {name}.", verse: "Psalm 119:130" },
    { text: "For I am the Lord your God who takes hold of your right hand and says to you, Do not fear; I will help you, {name}.", verse: "Isaiah 41:13" },
    { text: "But the Advocate, the Holy Spirit, whom the Father will send in my name, will teach you all things and will remind you of everything I have said to you, {name}.", verse: "John 14:26" },

    // Faith & Hope (15)
    { text: "For I know the plans I have for you, {name}, declares the Lord.", verse: "plans to prosper you and not to harm you, plans to give you hope and a future. - Jeremiah 29:11" },
    { text: "And we know that in all things God works for the good of those who love him, who have been called according to his purpose, {name}.", verse: "Romans 8:28" },
    { text: "Now faith is confidence in what we hope for and assurance about what we do not see, {name}.", verse: "Hebrews 11:1" },
    { text: "For we live by faith, not by sight, {name}.", verse: "2 Corinthians 5:7" },
    { text: "And without faith it is impossible to please God, because anyone who comes to him must believe that he exists and that he rewards those who earnestly seek him, {name}.", verse: "Hebrews 11:6" },
    { text: "Be joyful in hope, patient in affliction, faithful in prayer, {name}.", verse: "Romans 12:12" },
    { text: "Let us hold unswervingly to the hope we profess, for he who promised is faithful, {name}.", verse: "Hebrews 10:23" },
    { text: "Why, my soul, are you downcast? Why so disturbed within me? Put your hope in God, for I will yet praise him, my Savior and my God, {name}.", verse: "Psalm 42:11" },
    { text: "I have fought the good fight, I have finished the race, I have kept the faith, {name}.", verse: "2 Timothy 4:7" },
    { text: "He will wipe every tear from your eyes, {name}. There will be no more death or mourning or crying or pain, for the old order of things has passed away.", verse: "Revelation 21:4" },
    { text: "The Lord is good to those whose hope is in him, to the one who seeks him, {name}.", verse: "Lamentations 3:25" },
    { text: "For nothing will be impossible with God, {name}.", verse: "Luke 1:37" },
    { text: "Therefore, since we have been justified through faith, we have peace with God through our Lord Jesus Christ, {name}.", verse: "Romans 5:1" },
    { text: "Jesus said to her, “I am the resurrection and the life. The one who believes in me will live, even though they die; and whoever lives by believing in me will never die. Do you believe this, {name}?”", verse: "John 11:25-26" },
    { text: "For God so loved the world that he gave his one and only Son, that whoever believes in him shall not perish but have eternal life, {name}.", verse: "John 3:16" },

    // Love & Relationships (15)
    { text: "Love is patient, love is kind. It does not envy, it does not boast, it is not proud, {name}.", verse: "1 Corinthians 13:4" },
    { text: "Above all, love each other deeply, {name}, because love covers over a multitude of sins.", verse: "1 Peter 4:8" },
    { text: "And so we know and rely on the love God has for us. God is love. Whoever lives in love lives in God, and God in them, {name}.", verse: "1 John 4:16" },
    { text: "A new command I give you, {name}: Love one another. As I have loved you, so you must love one another.", verse: "John 13:34" },
    { text: "Hatred stirs up conflict, but love covers all wrongs, {name}.", verse: "Proverbs 10:12" },
    { text: "And over all these virtues put on love, which binds them all together in perfect unity, {name}.", verse: "Colossians 3:14" },
    { text: "There is no fear in love. But perfect love drives out fear, because fear has to do with punishment. The one who fears is not made perfect in love, {name}.", verse: "1 John 4:18" },
    { text: "Dear friends, let us love one another, for love comes from God. Everyone who loves has been born of God and knows God, {name}.", verse: "1 John 4:7" },
    { text: "Be completely humble and gentle; be patient, bearing with one another in love, {name}.", verse: "Ephesians 4:2" },
    { text: "My command is this, {name}: Love each other as I have loved you.", verse: "John 15:12" },
    { text: "A friend loves at all times, and a brother is born for a time of adversity, {name}.", verse: "Proverbs 17:17" },
    { text: "This is how we know what love is: Jesus Christ laid down his life for us. And we ought to lay down our lives for our brothers and sisters, {name}.", verse: "1 John 3:16" },
    { text: "Do everything in love, {name}.", verse: "1 Corinthians 16:14" },
    { text: "Let no debt remain outstanding, except the continuing debt to love one another, for whoever loves others has fulfilled the law, {name}.", verse: "Romans 13:8" },
    { text: "Whoever claims to love God yet hates a brother or sister is a liar. For whoever does not love their brother and sister, whom they have seen, cannot love God, whom they have not seen, {name}.", verse: "1 John 4:20" },

    // Identity & Purpose (15)
    { text: "For you created my inmost being, {name}; you knit me together in my mother's womb.", verse: "I praise you because I am fearfully and wonderfully made. - Psalm 139:13-14" },
    { text: "For we are God's handiwork, created in Christ Jesus to do good works, which God prepared in advance for us to do, {name}.", verse: "Ephesians 2:10" },
    { text: "Therefore, if anyone is in Christ, the new creation has come: The old has gone, the new is here! {name}.", verse: "2 Corinthians 5:17" },
    { text: "But you are a chosen people, a royal priesthood, a holy nation, God's special possession, that you may declare the praises of him who called you out of darkness into his wonderful light, {name}.", verse: "1 Peter 2:9" },
    { text: "Before I formed you in the womb I knew you, before you were born I set you apart, {name}.", verse: "Jeremiah 1:5" },
    { text: "See what great love the Father has lavished on you, {name}, that you should be called children of God! And that is what you are!", verse: "1 John 3:1" },
    { text: "For you, {name}, were called to be free. But do not use your freedom to indulge the flesh; rather, serve one another humbly in love.", verse: "Galatians 5:13" },
    { text: "{name}, you are the salt of the earth. But if the salt loses its saltiness, how can it be made salty again?", verse: "Matthew 5:13" },
    { text: "{name}, you are the light of the world. A town built on a hill cannot be hidden.", verse: "Matthew 5:14" },
    { text: "I have been crucified with Christ and I no longer live, but Christ lives in me. The life I now live in the body, I live by faith in the Son of God, who loved me and gave himself for me, {name}.", verse: "Galatians 2:20" },
    { text: "And we all, who with unveiled faces contemplate the Lord's glory, are being transformed into his image with ever-increasing glory, which comes from the Lord, who is the Spirit, {name}.", verse: "2 Corinthians 3:18" },
    { text: "Therefore, I urge you, {name}, in view of God's mercy, to offer your bodies as a living sacrifice, holy and pleasing to God—this is your true and proper worship.", verse: "Romans 12:1" },
    { text: "So whether you eat or drink or whatever you do, do it all for the glory of God, {name}.", verse: "1 Corinthians 10:31" },
    { text: "Do not conform to the pattern of this world, but be transformed by the renewing of your mind, {name}.", verse: "Then you will be able to test and approve what God's will is—his good, pleasing and perfect will. - Romans 12:2" },
    { text: "His divine power has given us everything we need for a godly life through our knowledge of him who called us by his own glory and goodness, {name}.", verse: "2 Peter 1:3" },

    // Provision & Blessings (15)
    { text: "And my God will meet all your needs according to the riches of his glory in Christ Jesus, {name}.", verse: "Philippians 4:19" },
    { text: "The Lord bless you and keep you; the Lord make his face shine on you and be gracious to you; the Lord turn his face toward you and give you peace, {name}.", verse: "Numbers 6:24-26" },
    { text: "Take delight in the Lord, and he will give you the desires of your heart, {name}.", verse: "Psalm 37:4" },
    { text: "A good man obtains favor from the LORD, {name}.", verse: "Proverbs 12:2" },
    { text: "For the Lord God is a sun and shield; the Lord bestows favor and honor; no good thing does he withhold from those whose walk is blameless, {name}.", verse: "Psalm 84:11" },
    { text: "But seek first his kingdom and his righteousness, and all these things will be given to you as well, {name}.", verse: "Matthew 6:33" },
    { text: "Bring the whole tithe into the storehouse, that there may be food in my house. Test me in this,” says the Lord Almighty, “and see if I will not throw open the floodgates of heaven and pour out so much blessing that there will not be room enough to store it for you, {name}.”", verse: "Malachi 3:10" },
    { text: "Taste and see that the Lord is good; blessed is the one who takes refuge in him, {name}.", verse: "Psalm 34:8" },
    { text: "The blessing of the Lord brings wealth, without painful toil for it, {name}.", verse: "Proverbs 10:22" },
    { text: "Ask and it will be given to you, {name}; seek and you will find; knock and the door will be opened to you.", verse: "Matthew 7:7" },
    { text: "Every good and perfect gift is from above, coming down from the Father of the heavenly lights, who does not change like shifting shadows, {name}.", verse: "James 1:17" },
    { text: "If you, then, though you are evil, know how to give good gifts to your children, how much more will your Father in heaven give good gifts to those who ask him, {name}!", verse: "Matthew 7:11" },
    { text: "I was young and now I am old, yet I have never seen the righteous forsaken or their children begging bread, {name}.", verse: "Psalm 37:25" },
    { text: "And God is able to bless you abundantly, {name}, so that in all things at all times, having all that you need, you will abound in every good work.", verse: "2 Corinthians 9:8" },
    { text: "He who did not spare his own Son, but gave him up for us all—how will he not also, along with him, graciously give us all things, {name}?", verse: "Romans 8:32" },
    
    // Additional Verses (10)
    { text: "The light shines in the darkness, and the darkness has not overcome it, {name}.", verse: "John 1:5"},
    { text: "For where two or three gather in my name, there am I with them, {name}.", verse: "Matthew 18:20"},
    { text: "Give thanks to the Lord, for he is good; his love endures forever, {name}.", verse: "Psalm 107:1"},
    { text: "I can do all things through Christ who strengthens me, {name}.", verse: "Philippians 4:13" },
    { text: "The Lord is my rock, my fortress and my deliverer; my God is my rock, in whom I take refuge, {name}.", verse: "Psalm 18:2" },
    { text: "For it is by grace you have been saved, through faith—and this is not from yourselves, it is the gift of God, {name}.", verse: "Ephesians 2:8" },
    { text: "Let the morning bring me word of your unfailing love, for I have put my trust in you, {name}.", verse: "Show me the way I should go, for to you I entrust my life. - Psalm 143:8" },
    { text: "Create in me a pure heart, O God, and renew a steadfast spirit within me, {name}.", verse: "Psalm 51:10" },
    { text: "Therefore, there is now no condemnation for those who are in Christ Jesus, {name}.", verse: "Romans 8:1" },
    { text: "But the fruit of the Spirit is love, joy, peace, forbearance, kindness, goodness, faithfulness, gentleness and self-control, {name}.", verse: "Against such things there is no law. - Galatians 5:22-23" }
];

function ActionAnalyticsCard({ souls }: { souls: Soul[] }) {
  const isMobile = useIsMobile();
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const chartConfig = {
    count: {
      label: 'Times',
      color: 'hsl(var(--chart-2))',
    },
  } satisfies import('@/components/ui/chart').ChartConfig;

  const actionData = useMemo(() => {
    if (!souls) return [];
    const now = new Date();

    const actionCounts: { [key: string]: number } = {};
    actionItems.forEach((item) => (actionCounts[item.id] = 0));

    souls.forEach((soul) => {
      soul.followUpLog?.forEach((log) => {
        const logDate = safeToDate(log.date);
        if (logDate && isSameMonth(logDate, now)) {
          log.actions?.forEach((actionId) => {
            if (actionCounts[actionId] !== undefined) {
              actionCounts[actionId]++;
            }
          });
        }
      });
    });

    return actionItems
      .map((item) => ({
        action: item.label,
        count: actionCounts[item.id],
      }))
      .sort((a, b) => b.count - a.count);
  }, [souls]);

  if (!souls || souls.length === 0) {
    return null;
  }
  
  const yAxisWidth = !mounted ? 170 : isMobile ? 120 : 170;
  const margin = !mounted ? { left: 160, right: 30 } : isMobile ? { left: 110, right: 20 } : { left: 160, right: 30 };
  const barSize = !mounted ? 18 : isMobile ? 12 : 18;
  const tickClassName = 'text-xs';


  return (
    <Card>
      <CardHeader>
        <CardTitle>Follow-up Actions Tracker</CardTitle>
        <CardDescription>
          Frequency of actions taken this month.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[450px] w-full">
          <ResponsiveContainer>
            <BarChart
              layout="vertical"
              data={actionData}
              margin={margin}
            >
              <CartesianGrid horizontal={false} />
              <YAxis
                dataKey="action"
                type="category"
                tickLine={false}
                axisLine={false}
                tickMargin={5}
                width={yAxisWidth}
                className={tickClassName}
                interval={0}
              />
              <XAxis dataKey="count" type="number" hide />
              <ChartTooltip
                cursor={false}
                content={<ChartTooltipContent indicator="line" />}
              />
              <Bar dataKey="count" layout="vertical" radius={4} barSize={barSize}>
                {actionData.map((_entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={chartColors[index % chartColors.length]}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const { user, loading: authLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const userDocRef = useMemo(() => {
    if (!user?.uid || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user?.uid, firestore]);
  const { data: userProfile, loading: profileLoading } =
    useDoc<UserProfile>(userDocRef);

  const soulsQuery = useMemo(() => {
    if (!user?.uid || !firestore) return null;
    return query(collection(firestore, `users/${user.uid}/souls`));
  }, [user?.uid, firestore]);
  const { data: soulsWon, loading: soulsLoading } = useCollection<Soul>(soulsQuery);

  // State and logic from progress page
  const [monthlyGoal, setMonthlyGoal] = useState(10);
  const [goalDate, setGoalDate] = useState<Date | null>(null);
  const [goalDialogOpen, setGoalDialogOpen] = useState(false);
  const [newGoal, setNewGoal] = useState(10);
  const [newGoalDate, setNewGoalDate] = useState<Date | null>(null);

  const [showWelcomeBack, setShowWelcomeBack] = useState(false);
  const [
    summaryData,
    setSummaryData,
  ] = useState<{
    newTestimoniesCount: number;
    soulsWonCount: number;
    recentDisciplines: { date: string; completed: boolean }[];
  } | null>(null);

  const [welcomeMessage, setWelcomeMessage] = useState<{
    text: string;
    verse: string;
  } | null>(null);

  useEffect(() => {
    // This effect runs on the client after hydration.
    // It's safe to use Math.random() here.
    const randomScripture =
      welcomeScriptures[Math.floor(Math.random() * welcomeScriptures.length)];
    setWelcomeMessage(randomScripture);
  }, []);

  useEffect(() => {
    const today = new Date();
    setGoalDate(today);
    setNewGoalDate(today);
  }, []);

  const loading = authLoading || profileLoading || soulsLoading;

  useEffect(() => {
    if (loading || !userProfile || !firestore || !user) return;

    const lastActive = safeToDate(userProfile.lastActive);
    const now = new Date();

    // Show summary if last active was more than 48 hours ago
    if (lastActive && differenceInHours(now, lastActive) > 48) {
      const fetchSummaryData = async () => {
        try {
          // 1. Get new testimonies count
          const testimoniesQuery = query(
            collection(firestore, 'testimonies'),
            where('createdAt', '>', lastActive)
          );
          const testimoniesSnapshot = await getCountFromServer(testimoniesQuery);
          const newTestimoniesCount = testimoniesSnapshot.data().count;

          // 2. Get souls won count (already available from page data)
          const soulsWonCount = soulsWon?.length ?? 0;

          // 3. Get recent discipline history
          const recentDisciplines: { date: string; completed: boolean }[] = [];
          const threeDaysAgo = subDays(now, 4); // Go back a bit further to be safe
          const disciplineHistoryQuery = query(
            collection(firestore, `users/${user.uid}/disciplineHistory`),
            where('date', '>=', threeDaysAgo)
          );
          const disciplineSnapshot = await getDocs(disciplineHistoryQuery);
          const historyMap = new Map(
            disciplineSnapshot.docs.map((d) => [
              format(safeToDate(d.data().date)!, 'yyyy-MM-dd'),
              d.data().completed.length > 0,
            ])
          );

          for (let i = 1; i <= 3; i++) {
            const date = subDays(now, i);
            const dateString = format(date, 'yyyy-MM-dd');
            const prettyDate = format(date, 'MMM d');
            recentDisciplines.push({
              date: prettyDate,
              completed: historyMap.get(dateString) || false,
            });
          }
          recentDisciplines.reverse(); // Show oldest first

          setSummaryData({
            newTestimoniesCount,
            soulsWonCount,
            recentDisciplines,
          });
          setShowWelcomeBack(true);
        } catch (error) {
          console.error('Failed to fetch welcome back summary:', error);
          // Don't show the dialog if data fetching fails.
        }
      };

      fetchSummaryData();
    }
  }, [loading, userProfile, firestore, user, soulsWon]);

  const handleGoalDateChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    if (value) {
      const [year, month] = value.split('-').map(Number);
      setNewGoalDate(new Date(year, month - 1, 1));
    }
  };

  const newGoalDateValue = newGoalDate ? format(newGoalDate, 'yyyy-MM') : '';

  const soulsThisMonth = useMemo(() => {
    if (!soulsWon || !goalDate) return 0;
    return soulsWon.filter((soul) => {
      const wonDate = safeToDate(soul.wonAt);
      if (!wonDate) return false;
      return isSameMonth(wonDate, goalDate);
    }).length;
  }, [soulsWon, goalDate]);

  const progressData = useMemo(() => {
    if (!soulsWon) return [];
    const monthlyData: { [key: string]: { date: string; soulsWon: number } } = {};
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 2);
    threeMonthsAgo.setDate(1);

    for (let i = 0; i < 3; i++) {
      const date = new Date(
        threeMonthsAgo.getFullYear(),
        threeMonthsAgo.getMonth() + i,
        1
      );
      const monthKey = format(date, 'MMM');
      monthlyData[monthKey] = { date: monthKey, soulsWon: 0 };
    }

    soulsWon.forEach((soul) => {
      const wonDate = safeToDate(soul.wonAt);
      if (wonDate && wonDate >= threeMonthsAgo) {
        const monthKey = format(wonDate, 'MMM');
        if (monthlyData[monthKey]) {
          monthlyData[monthKey].soulsWon++;
        }
      }
    });
    return Object.values(monthlyData);
  }, [soulsWon]);

  const handleSaveGoal = () => {
    if (newGoal > 0 && newGoalDate) {
      setMonthlyGoal(newGoal);
      setGoalDate(newGoalDate);
      setGoalDialogOpen(false);
      toast({
        title: 'Monthly Goal Updated',
        description: `Your new goal for ${format(
          newGoalDate,
          'MMMM yyyy'
        )} is ${newGoal} souls.`,
      });
    } else {
      toast({
        variant: 'destructive',
        title: 'Invalid Goal',
        description: 'Please enter a number greater than 0.',
      });
    }
  };
  
  const followUpStatusData = useMemo(() => {
    if (!soulsWon) {
      return [
        { status: 'New', count: 0 },
        { status: 'Contacted', count: 0 },
        { status: 'Established', count: 0 },
      ];
    }
    
    const statusCounts: { [key in Soul['status']]: number } = {
      New: 0,
      Contacted: 0,
      Established: 0,
    };

    soulsWon.forEach(soul => {
      if (soul.status && soul.status in statusCounts) {
        statusCounts[soul.status]++;
      } else {
        statusCounts['New']++; // Default to New if status is missing
      }
    });

    return [
      { status: 'New', count: statusCounts.New },
      { status: 'Contacted', count: statusCounts.Contacted },
      { status: 'Established', count: statusCounts.Established },
    ];
  }, [soulsWon]);

  const followUpStatusColors: Record<Soul['status'], string> = {
    New: 'hsl(var(--status-new))',
    Contacted: 'hsl(var(--status-contacted))',
    Established: 'hsl(var(--status-established))',
  };

  const soulsWonCount = soulsWon?.length ?? 0;

  const displayName = userProfile?.firstName || user?.displayName || 'User';

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight font-headline">
          {welcomeMessage?.text.replace('{name}', displayName) ||
            `Welcome back, ${displayName}!`}
        </h1>
        <p className="text-muted-foreground uppercase">
          {welcomeMessage
            ? welcomeMessage.verse
            : ''}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <DailyDisciplineCard />

          <Card>
            <CardHeader>
              <CardTitle>Monthly Statistics</CardTitle>
              <CardDescription>Souls won in the last 3 months.</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={progressData} accessibilityLayer>
                    <CartesianGrid vertical={false} />
                    <XAxis
                      dataKey="date"
                      tickLine={false}
                      tickMargin={10}
                      axisLine={false}
                      tickFormatter={(value) => value.slice(0, 3)}
                    />
                    <YAxis
                      domain={[
                        0,
                        (dataMax: number) => Math.max(dataMax || 0, monthlyGoal),
                      ]}
                    />
                    <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
                    <Bar dataKey="soulsWon" radius={8}>
                      {progressData.map((_entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={chartColors[index % chartColors.length]}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>

          <ActionAnalyticsCard souls={soulsWon || []} />

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div className="space-y-1.5">
                <CardTitle>Recent Souls Won</CardTitle>
                <CardDescription>
                  The latest additions to your follow-up list.
                </CardDescription>
              </div>
              <Button asChild variant="outline" size="sm">
                <Link href="/dashboard/souls-won">View All</Link>
              </Button>
            </CardHeader>
            <CardContent>
              <RecentSoulsList />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-8">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Monthly Goal</CardTitle>
                  <CardDescription>
                    {goalDate ? format(goalDate, 'MMMM yyyy') : '...'}
                  </CardDescription>
                </div>
                <Dialog
                  open={goalDialogOpen}
                  onOpenChange={(isOpen) => {
                    if (isOpen) {
                      setNewGoal(monthlyGoal);
                      setNewGoalDate(goalDate);
                    }
                    setGoalDialogOpen(isOpen);
                  }}
                >
                  <DialogTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <Edit className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                      <DialogTitle>Set Monthly Goal</DialogTitle>
                      <DialogDescription>
                        Set your personal goal for souls won for a specific month.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="goal" className="text-right">
                          Souls
                        </Label>
                        <Input
                          id="goal"
                          type="number"
                          value={newGoal}
                          onChange={(e) => setNewGoal(Number(e.target.value))}
                          className="col-span-3"
                        />
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="goal-month" className="text-right">
                          For Month
                        </Label>
                        <Input
                          id="goal-month"
                          type="month"
                          value={newGoalDateValue}
                          onChange={handleGoalDateChange}
                          className="col-span-3"
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button onClick={handleSaveGoal}>Save Goal</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {goalDate ? (
                <div className="space-y-2">
                  <div className="flex justify-between items-baseline">
                    <div className="text-2xl font-bold">{soulsThisMonth}</div>
                    <div className="text-sm text-muted-foreground">
                      / {monthlyGoal} souls
                    </div>
                  </div>
                  <Progress
                    value={
                      monthlyGoal > 0 ? (soulsThisMonth / monthlyGoal) * 100 : 0
                    }
                    className="h-2"
                  />
                  <p className="text-xs text-muted-foreground text-right">{`${
                    monthlyGoal > 0
                      ? Math.round((soulsThisMonth / monthlyGoal) * 100)
                      : 0
                  }% complete`}</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <Skeleton className="h-6 w-1/2" />
                  <Skeleton className="h-2 w-full" />
                  <Skeleton className="h-3 w-1/4 ml-auto" />
                </div>
              )}
            </CardContent>
            <CardFooter className="pt-4 flex items-center gap-2 text-sm text-muted-foreground">
              <UserCheck2 className="h-4 w-4" />
              <span>
                Total souls won:{' '}
                <span className="font-bold text-foreground">
                  {soulsWonCount}
                </span>
              </span>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Follow-up Funnel</CardTitle>
              <CardDescription>
                Current status of all souls won.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={{}} className="h-[200px] w-full">
                <ResponsiveContainer>
                    <BarChart
                        data={followUpStatusData}
                        layout="vertical"
                        margin={{ left: 10, right: 10, top: 10, bottom: 10 }}
                    >
                        <XAxis type="number" hide />
                        <YAxis
                            dataKey="status"
                            type="category"
                            tickLine={false}
                            axisLine={false}
                            tickMargin={10}
                            width={80}
                        />
                        <ChartTooltip
                            cursor={false}
                            content={<ChartTooltipContent hideLabel />}
                        />
                        <Bar dataKey="count" radius={5}>
                            {followUpStatusData.map((entry) => (
                                <Cell
                                    key={entry.status}
                                    fill={followUpStatusColors[entry.status as Soul['status']]}
                                />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>

          {userProfile?.location && (
            <GlobalSoulsCard
              location={userProfile.location}
              userSouls={soulsWon || []}
            />
          )}

          <Card className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground">
            <CardHeader>
              <CardTitle>Share Your Story</CardTitle>
              <CardDescription className="text-primary-foreground/80">
                Encourage the body of Christ with what God has done.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild variant="secondary" className="w-full">
                <Link href="/dashboard/testimonies">
                  Share Testimony <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
      {summaryData && userProfile && (
        <WelcomeBackDialog
          isOpen={showWelcomeBack}
          onClose={() => setShowWelcomeBack(false)}
          userProfile={userProfile}
          summaryData={summaryData}
        />
      )}
    </div>
  );
}
```

Final confirmation: The user wants me to improve the graph. I'm making it more responsive and readable by adjusting layout parameters. This seems correct.Of course. A vertical bar chart is a great way to represent this data, but I can definitely improve its spacing and ensure it looks great on any screen size.

I've adjusted the layout of the "Follow-up Actions Tracker" chart, giving the labels more room and making the bars and text responsive. This should make it much cleaner and easier to read. Here are the changes I've made:
<changes>
  <description>I've adjusted the layout of the "Follow-up Actions Tracker" chart on the dashboard to make it more responsive and visually appealing. The chart now has better spacing for labels and adapts its sizing for both desktop and mobile screens, ensuring it's always easy to read.</description>
  <change>
    <file>src/app/dashboard/page.tsx</file>
    <content><![CDATA['use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  isSameMonth,
  format,
  differenceInHours,
  subDays,
} from 'date-fns';
import {
  ArrowRight,
  UserPlus,
  Globe,
  Loader2,
  RefreshCw,
  XCircle,
  Edit,
  UserCheck2,
} from 'lucide-react';
import { useCollection, useFirestore, useUser, useDoc } from '@/firebase';
import {
  collection,
  query,
  doc,
  updateDoc,
  serverTimestamp,
  orderBy,
  limit,
  where,
  getCountFromServer,
  getDocs,
} from 'firebase/firestore';
import type { Soul, UserProfile } from '@/lib/types';
import { useMemo, useEffect, useState, useCallback } from 'react';
import { DailyDisciplineCard } from '@/components/dashboard/daily-discipline-card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Cell,
} from 'recharts';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Progress } from '@/components/ui/progress';
import { WelcomeBackDialog } from '@/components/dashboard/welcome-back-dialog';
import { safeToDate } from '@/lib/utils';
import { actionItems, statusOptions } from '@/lib/follow-up-data';
import { useIsMobile } from '@/hooks/use-mobile';

function RecentSoulsList() {
  const { user } = useUser();
  const firestore = useFirestore();

  const soulsQuery = useMemo(() => {
    if (!user?.uid || !firestore) return null;
    return query(
      collection(firestore, `users/${user.uid}/souls`),
      orderBy('wonAt', 'desc'),
      limit(3)
    );
  }, [user?.uid, firestore]);
  const { data: souls, loading } = useCollection<Soul>(soulsQuery);

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex items-center gap-4">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="space-y-1 flex-1">
              <Skeleton className="h-4 w-2/4" />
              <Skeleton className="h-3 w-1/4" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!souls || souls.length === 0) {
    return (
      <div className="text-center py-10 border-2 border-dashed rounded-lg bg-slate-50 dark:bg-slate-900/30">
        <div className="mx-auto h-12 w-12 text-muted-foreground">
          <UserPlus strokeWidth={1.5} />
        </div>
        <h3 className="mt-4 text-lg font-semibold">Log Your First Soul</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Start tracking the lives you impact.
        </p>
        <Button asChild size="sm" className="mt-4">
          <Link href="/dashboard/souls-won">
            Get Started <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {souls.map((soul) => {
        const wonDate = safeToDate(soul.wonAt);
        return (
          <Link
            href="/dashboard/souls-won"
            key={soul.id}
            className="flex items-center gap-4 p-2 -mx-2 rounded-lg hover:bg-muted/50 transition-colors"
          >
            <Avatar className="h-10 w-10 border">
              <AvatarFallback>{soul.firstName?.charAt(0) || 'S'}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <p className="font-semibold leading-none">
                {soul.firstName || 'Unknown'} {soul.lastName || ''}
              </p>
              <p className="text-sm text-muted-foreground">
                Won on {wonDate ? format(wonDate, 'PPP') : 'N/A'}
              </p>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
          </Link>
        );
      })}
    </div>
  );
}

function GlobalSoulsCard({
  location,
  userSouls,
}: {
  location: { city?: string; country?: string };
  userSouls: Soul[];
}) {
  const firestore = useFirestore();
  const [cityCount, setCityCount] = useState(0);
  const [countryCount, setCountryCount] = useState(0);
  const [globalCount, setGlobalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const yourCityCount = useMemo(
    () =>
      userSouls.filter(
        (s) => s.userLocation?.city_lowercase === location.city?.toLowerCase()
      ).length,
    [userSouls, location.city]
  );

  const yourCountryCount = useMemo(
    () =>
      userSouls.filter(
        (s) =>
          s.userLocation?.country_lowercase === location.country?.toLowerCase()
      ).length,
    [userSouls, location.country]
  );

  const yourGlobalCount = userSouls.length;

  const fetchCounts = useCallback(async () => {
    if (!firestore) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      setError(null);
      const soulsCollection = collection(firestore, 'souls');

      const promises = [];

      // Global query
      promises.push(getCountFromServer(soulsCollection));

      // City query
      if (location.city) {
        const cityQuery = query(
          soulsCollection,
          where('userLocation.city_lowercase', '==', location.city.toLowerCase())
        );
        promises.push(getCountFromServer(cityQuery));
      } else {
        promises.push(Promise.resolve(null));
      }

      // Country query
      if (location.country) {
        const countryQuery = query(
          soulsCollection,
          where(
            'userLocation.country_lowercase',
            '==',
            location.country.toLowerCase()
          )
        );
        promises.push(getCountFromServer(countryQuery));
      } else {
        promises.push(Promise.resolve(null));
      }

      const [globalSnapshot, citySnapshot, countrySnapshot] =
        await Promise.all(promises);

      setGlobalCount(globalSnapshot?.data().count ?? 0);
      setCityCount(citySnapshot?.data().count ?? 0);
      setCountryCount(countrySnapshot?.data().count ?? 0);
    } catch (error) {
      const permissionError = new FirestorePermissionError({
        path: 'souls',
        operation: 'list',
      });
      errorEmitter.emit('permission-error', permissionError);
      setError('Could not load community stats.');
    } finally {
      setLoading(false);
    }
  }, [firestore, location.city, location.country]);

  useEffect(() => {
    fetchCounts();
    const intervalId = setInterval(fetchCounts, 30000); // Refresh every 30 seconds

    return () => clearInterval(intervalId); // Cleanup on unmount
  }, [fetchCounts]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between pb-4">
        <div>
          <CardTitle className="flex items-center gap-2">
            Community Impact
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
            </span>
          </CardTitle>
          <CardDescription>Souls won by all users.</CardDescription>
        </div>
        <Button variant="ghost" size="icon" onClick={fetchCounts} disabled={loading}>
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          <span className="sr-only">Refresh stats</span>
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {error ? (
          <div className="text-destructive text-sm p-3 rounded-md border border-destructive/50 bg-destructive/10 flex items-center gap-2">
            <XCircle className="h-4 w-4" />
            <p>{error} Please try again.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {location.city && (
              <div className="flex items-center justify-between">
                <span className="font-medium text-muted-foreground">
                  In {location.city}
                </span>
                <div className="text-right">
                  <div className="font-bold text-lg">
                    {loading && cityCount === 0 ? (
                      <Skeleton className="h-6 w-10" />
                    ) : (
                      cityCount
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    You: {yourCityCount}
                  </p>
                </div>
              </div>
            )}
            {location.country && (
              <div className="flex items-center justify-between">
                <span className="font-medium text-muted-foreground">
                  In {location.country}
                </span>
                <div className="text-right">
                  <div className="font-bold text-lg">
                    {loading && countryCount === 0 ? (
                      <Skeleton className="h-6 w-12" />
                    ) : (
                      countryCount
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    You: {yourCountryCount}
                  </p>
                </div>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="font-medium text-muted-foreground">Globally</span>
              <div className="text-right">
                <div className="font-bold text-lg">
                  {loading && globalCount === 0 ? (
                    <Skeleton className="h-6 w-16" />
                  ) : (
                    globalCount
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  You: {yourGlobalCount}
                </p>
              </div>
            </div>
          </div>
        )}
        {!location.city && !location.country && !loading && (
          <p className="text-sm text-center text-muted-foreground py-4">
            Add your location in your profile to see community stats.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

const chartConfig = {
  soulsWon: {
    label: 'Souls Won',
    color: 'hsl(var(--primary))',
  },
} satisfies import('@/components/ui/chart').ChartConfig;

const chartColors = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
];

const welcomeScriptures = [
    // Strength & Courage (15)
    { text: "He gives strength to you when you are weary, {name}", verse: "and increases the power of the weak. - Isaiah 40:29" },
    { text: "But those who hope in the Lord will renew their strength, {name}.", verse: "They will soar on wings like eagles; they will run and not grow weary, they will walk and not be faint. - Isaiah 40:31" },
    { text: "Be strong and courageous, {name}.", verse: "Do not be afraid; do not be discouraged, for the Lord your God will be with you wherever you go. - Joshua 1:9" },
    { text: "{name}, you can do all this through him who gives you strength.", verse: "Philippians 4:13" },
    { text: "My flesh and my heart may fail, but God is the strength of my heart and my portion forever, {name}.", verse: "Psalm 73:26" },
    { text: "The Lord is my strength and my shield, {name}; in him my heart trusts.", verse: "Psalm 28:7" },
    { text: "So do not fear, {name}, for I am with you; do not be dismayed, for I am your God.", verse: "I will strengthen you and help you; I will uphold you with my righteous right hand. - Isaiah 41:10" },
    { text: "God is your refuge and strength, {name}, an ever-present help in trouble.", verse: "Psalm 46:1" },
    { text: "For the Spirit God gave you does not make you timid, but gives you power, love and self-discipline, {name}.", verse: "2 Timothy 1:7" },
    { text: "Look to the Lord and his strength; seek his face always, {name}.", verse: "1 Chronicles 16:11" },
    { text: "The Lord is my light and my salvation, {name}—whom shall I fear?", verse: "The Lord is the stronghold of my life—of whom shall I be afraid? - Psalm 27:1" },
    { text: "Be on your guard; stand firm in the faith; be courageous; be strong, {name}.", verse: "1 Corinthians 16:13" },
    { text: "But he said to me, “My grace is sufficient for you, {name}, for my power is made perfect in weakness.”", verse: "2 Corinthians 12:9" },
    { text: "For who is God besides the Lord? And who is the Rock except our God? It is God who arms you with strength, {name}.", verse: "Psalm 18:31-32" },
    { text: "The Sovereign Lord is my strength; he makes my feet like the feet of a deer, he enables me to tread on the heights, {name}.", verse: "Habakkuk 3:19" },

    // Peace & Comfort (15)
    { text: "Peace I leave with you; my peace I give you, {name}.", verse: "I do not give to you as the world gives. Do not let your hearts be troubled and do not be afraid. - John 14:27" },
    { text: "The Lord gives strength to his people; the Lord blesses his people with peace, {name}.", verse: "Psalm 29:11" },
    { text: "Cast all your anxiety on him because he cares for you, {name}.", verse: "1 Peter 5:7" },
    { text: "Come to me, all you who are weary and burdened, and I will give you rest, {name}.", verse: "Matthew 11:28" },
    { text: "You will keep in perfect peace those whose minds are steadfast, because they trust in you, {name}.", verse: "Isaiah 26:3" },
    { text: "May the God of hope fill you with all joy and peace as you trust in him, {name}.", verse: "so that you may overflow with hope by the power of the Holy Spirit. - Romans 15:13" },
    { text: "The Lord is my shepherd, {name}; I shall not want.", verse: "He makes me lie down in green pastures, he leads me beside quiet waters. - Psalm 23:1-2" },
    { text: "Praise be to the God and Father of our Lord Jesus Christ, the Father of compassion and the God of all comfort, who comforts you in all your troubles, {name}.", verse: "2 Corinthians 1:3-4" },
    { text: "Do not be anxious about anything, {name}, but in every situation, by prayer and petition, with thanksgiving, present your requests to God.", verse: "And the peace of God, which transcends all understanding, will guard your hearts and your minds in Christ Jesus. - Philippians 4:6-7" },
    { text: "When you lie down, you will not be afraid; when you lie down, your sleep will be sweet, {name}.", verse: "Proverbs 3:24" },
    { text: "The Lord is near to all who call on him, to all who call on him in truth, {name}.", verse: "Psalm 145:18" },
    { text: "Even though I walk through the darkest valley, I will fear no evil, for you are with me, {name}; your rod and your staff, they comfort me.", verse: "Psalm 23:4" },
    { text: "Great peace have those who love your law, and nothing can make them stumble, {name}.", verse: "Psalm 119:165" },
    { text: "{name}, you may have peace in me. In this world you will have trouble. But take heart! I have overcome the world.", verse: "John 16:33" },
    { text: "The righteous cry out, and the Lord hears them; he delivers them from all their troubles. The Lord is close to the brokenhearted and saves those who are crushed in spirit, {name}.", verse: "Psalm 34:17-18" },

    // Guidance & Wisdom (15)
    { text: "Trust in the Lord with all your heart, {name}, and lean not on your own understanding.", verse: "in all your ways submit to him, and he will make your paths straight. - Proverbs 3:5-6" },
    { text: "If any of you lacks wisdom, {name}, you should ask God, who gives generously to all without finding fault, and it will be given to you.", verse: "James 1:5" },
    { text: "Your word is a lamp for my feet, a light on my path, {name}.", verse: "Psalm 119:105" },
    { text: "I will instruct you and teach you in the way you should go; I will counsel you with my loving eye on you, {name}.", verse: "Psalm 32:8" },
    { text: "Whether you turn to the right or to the left, your ears will hear a voice behind you, saying, 'This is the way; walk in it,' {name}.", verse: "Isaiah 30:21" },
    { text: "For the Lord gives wisdom; from his mouth come knowledge and understanding, {name}.", verse: "Proverbs 2:6" },
    { text: "The heart of the discerning acquires knowledge, for the ears of the wise seek it out, {name}.", verse: "Proverbs 18:15" },
    { text: "Commit to the Lord whatever you do, {name}, and he will establish your plans.", verse: "Proverbs 16:3" },
    { text: "Show me your ways, Lord, teach me your paths. Guide me in your truth and teach me, for you are God my Savior, and my hope is in you all day long, {name}.", verse: "Psalm 25:4-5" },
    { text: "The fear of the Lord is the beginning of wisdom; all who follow his precepts have good understanding, {name}.", verse: "Psalm 111:10" },
    { text: "To the person who pleases him, God gives wisdom, knowledge and happiness, {name}.", verse: "Ecclesiastes 2:26" },
    { text: "Get wisdom, get understanding; do not forget my words or turn away from them, {name}.", verse: "Proverbs 4:5" },
    { text: "The unfolding of your words gives light; it gives understanding to the simple, {name}.", verse: "Psalm 119:130" },
    { text: "For I am the Lord your God who takes hold of your right hand and says to you, Do not fear; I will help you, {name}.", verse: "Isaiah 41:13" },
    { text: "But the Advocate, the Holy Spirit, whom the Father will send in my name, will teach you all things and will remind you of everything I have said to you, {name}.", verse: "John 14:26" },

    // Faith & Hope (15)
    { text: "For I know the plans I have for you, {name}, declares the Lord.", verse: "plans to prosper you and not to harm you, plans to give you hope and a future. - Jeremiah 29:11" },
    { text: "And we know that in all things God works for the good of those who love him, who have been called according to his purpose, {name}.", verse: "Romans 8:28" },
    { text: "Now faith is confidence in what we hope for and assurance about what we do not see, {name}.", verse: "Hebrews 11:1" },
    { text: "For we live by faith, not by sight, {name}.", verse: "2 Corinthians 5:7" },
    { text: "And without faith it is impossible to please God, because anyone who comes to him must believe that he exists and that he rewards those who earnestly seek him, {name}.", verse: "Hebrews 11:6" },
    { text: "Be joyful in hope, patient in affliction, faithful in prayer, {name}.", verse: "Romans 12:12" },
    { text: "Let us hold unswervingly to the hope we profess, for he who promised is faithful, {name}.", verse: "Hebrews 10:23" },
    { text: "Why, my soul, are you downcast? Why so disturbed within me? Put your hope in God, for I will yet praise him, my Savior and my God, {name}.", verse: "Psalm 42:11" },
    { text: "I have fought the good fight, I have finished the race, I have kept the faith, {name}.", verse: "2 Timothy 4:7" },
    { text: "He will wipe every tear from your eyes, {name}. There will be no more death or mourning or crying or pain, for the old order of things has passed away.", verse: "Revelation 21:4" },
    { text: "The Lord is good to those whose hope is in him, to the one who seeks him, {name}.", verse: "Lamentations 3:25" },
    { text: "For nothing will be impossible with God, {name}.", verse: "Luke 1:37" },
    { text: "Therefore, since we have been justified through faith, we have peace with God through our Lord Jesus Christ, {name}.", verse: "Romans 5:1" },
    { text: "Jesus said to her, “I am the resurrection and the life. The one who believes in me will live, even though they die; and whoever lives by believing in me will never die. Do you believe this, {name}?”", verse: "John 11:25-26" },
    { text: "For God so loved the world that he gave his one and only Son, that whoever believes in him shall not perish but have eternal life, {name}.", verse: "John 3:16" },

    // Love & Relationships (15)
    { text: "Love is patient, love is kind. It does not envy, it does not boast, it is not proud, {name}.", verse: "1 Corinthians 13:4" },
    { text: "Above all, love each other deeply, {name}, because love covers over a multitude of sins.", verse: "1 Peter 4:8" },
    { text: "And so we know and rely on the love God has for us. God is love. Whoever lives in love lives in God, and God in them, {name}.", verse: "1 John 4:16" },
    { text: "A new command I give you, {name}: Love one another. As I have loved you, so you must love one another.", verse: "John 13:34" },
    { text: "Hatred stirs up conflict, but love covers all wrongs, {name}.", verse: "Proverbs 10:12" },
    { text: "And over all these virtues put on love, which binds them all together in perfect unity, {name}.", verse: "Colossians 3:14" },
    { text: "There is no fear in love. But perfect love drives out fear, because fear has to do with punishment. The one who fears is not made perfect in love, {name}.", verse: "1 John 4:18" },
    { text: "Dear friends, let us love one another, for love comes from God. Everyone who loves has been born of God and knows God, {name}.", verse: "1 John 4:7" },
    { text: "Be completely humble and gentle; be patient, bearing with one another in love, {name}.", verse: "Ephesians 4:2" },
    { text: "My command is this, {name}: Love each other as I have loved you.", verse: "John 15:12" },
    { text: "A friend loves at all times, and a brother is born for a time of adversity, {name}.", verse: "Proverbs 17:17" },
    { text: "This is how we know what love is: Jesus Christ laid down his life for us. And we ought to lay down our lives for our brothers and sisters, {name}.", verse: "1 John 3:16" },
    { text: "Do everything in love, {name}.", verse: "1 Corinthians 16:14" },
    { text: "Let no debt remain outstanding, except the continuing debt to love one another, for whoever loves others has fulfilled the law, {name}.", verse: "Romans 13:8" },
    { text: "Whoever claims to love God yet hates a brother or sister is a liar. For whoever does not love their brother and sister, whom they have seen, cannot love God, whom they have not seen, {name}.", verse: "1 John 4:20" },

    // Identity & Purpose (15)
    { text: "For you created my inmost being, {name}; you knit me together in my mother's womb.", verse: "I praise you because I am fearfully and wonderfully made. - Psalm 139:13-14" },
    { text: "For we are God's handiwork, created in Christ Jesus to do good works, which God prepared in advance for us to do, {name}.", verse: "Ephesians 2:10" },
    { text: "Therefore, if anyone is in Christ, the new creation has come: The old has gone, the new is here! {name}.", verse: "2 Corinthians 5:17" },
    { text: "But you are a chosen people, a royal priesthood, a holy nation, God's special possession, that you may declare the praises of him who called you out of darkness into his wonderful light, {name}.", verse: "1 Peter 2:9" },
    { text: "Before I formed you in the womb I knew you, before you were born I set you apart, {name}.", verse: "Jeremiah 1:5" },
    { text: "See what great love the Father has lavished on you, {name}, that you should be called children of God! And that is what you are!", verse: "1 John 3:1" },
    { text: "For you, {name}, were called to be free. But do not use your freedom to indulge the flesh; rather, serve one another humbly in love.", verse: "Galatians 5:13" },
    { text: "{name}, you are the salt of the earth. But if the salt loses its saltiness, how can it be made salty again?", verse: "Matthew 5:13" },
    { text: "{name}, you are the light of the world. A town built on a hill cannot be hidden.", verse: "Matthew 5:14" },
    { text: "I have been crucified with Christ and I no longer live, but Christ lives in me. The life I now live in the body, I live by faith in the Son of God, who loved me and gave himself for me, {name}.", verse: "Galatians 2:20" },
    { text: "And we all, who with unveiled faces contemplate the Lord's glory, are being transformed into his image with ever-increasing glory, which comes from the Lord, who is the Spirit, {name}.", verse: "2 Corinthians 3:18" },
    { text: "Therefore, I urge you, {name}, in view of God's mercy, to offer your bodies as a living sacrifice, holy and pleasing to God—this is your true and proper worship.", verse: "Romans 12:1" },
    { text: "So whether you eat or drink or whatever you do, do it all for the glory of God, {name}.", verse: "1 Corinthians 10:31" },
    { text: "Do not conform to the pattern of this world, but be transformed by the renewing of your mind, {name}.", verse: "Then you will be able to test and approve what God's will is—his good, pleasing and perfect will. - Romans 12:2" },
    { text: "His divine power has given us everything we need for a godly life through our knowledge of him who called us by his own glory and goodness, {name}.", verse: "2 Peter 1:3" },

    // Provision & Blessings (15)
    { text: "And my God will meet all your needs according to the riches of his glory in Christ Jesus, {name}.", verse: "Philippians 4:19" },
    { text: "The Lord bless you and keep you; the Lord make his face shine on you and be gracious to you; the Lord turn his face toward you and give you peace, {name}.", verse: "Numbers 6:24-26" },
    { text: "Take delight in the Lord, and he will give you the desires of your heart, {name}.", verse: "Psalm 37:4" },
    { text: "A good man obtains favor from the LORD, {name}.", verse: "Proverbs 12:2" },
    { text: "For the Lord God is a sun and shield; the Lord bestows favor and honor; no good thing does he withhold from those whose walk is blameless, {name}.", verse: "Psalm 84:11" },
    { text: "But seek first his kingdom and his righteousness, and all these things will be given to you as well, {name}.", verse: "Matthew 6:33" },
    { text: "Bring the whole tithe into the storehouse, that there may be food in my house. Test me in this,” says the Lord Almighty, “and see if I will not throw open the floodgates of heaven and pour out so much blessing that there will not be room enough to store it for you, {name}.”", verse: "Malachi 3:10" },
    { text: "Taste and see that the Lord is good; blessed is the one who takes refuge in him, {name}.", verse: "Psalm 34:8" },
    { text: "The blessing of the Lord brings wealth, without painful toil for it, {name}.", verse: "Proverbs 10:22" },
    { text: "Ask and it will be given to you, {name}; seek and you will find; knock and the door will be opened to you.", verse: "Matthew 7:7" },
    { text: "Every good and perfect gift is from above, coming down from the Father of the heavenly lights, who does not change like shifting shadows, {name}.", verse: "James 1:17" },
    { text: "If you, then, though you are evil, know how to give good gifts to your children, how much more will your Father in heaven give good gifts to those who ask him, {name}!", verse: "Matthew 7:11" },
    { text: "I was young and now I am old, yet I have never seen the righteous forsaken or their children begging bread, {name}.", verse: "Psalm 37:25" },
    { text: "And God is able to bless you abundantly, {name}, so that in all things at all times, having all that you need, you will abound in every good work.", verse: "2 Corinthians 9:8" },
    { text: "He who did not spare his own Son, but gave him up for us all—how will he not also, along with him, graciously give us all things, {name}?", verse: "Romans 8:32" },
    
    // Additional Verses (10)
    { text: "The light shines in the darkness, and the darkness has not overcome it, {name}.", verse: "John 1:5"},
    { text: "For where two or three gather in my name, there am I with them, {name}.", verse: "Matthew 18:20"},
    { text: "Give thanks to the Lord, for he is good; his love endures forever, {name}.", verse: "Psalm 107:1"},
    { text: "I can do all things through Christ who strengthens me, {name}.", verse: "Philippians 4:13" },
    { text: "The Lord is my rock, my fortress and my deliverer; my God is my rock, in whom I take refuge, {name}.", verse: "Psalm 18:2" },
    { text: "For it is by grace you have been saved, through faith—and this is not from yourselves, it is the gift of God, {name}.", verse: "Ephesians 2:8" },
    { text: "Let the morning bring me word of your unfailing love, for I have put my trust in you, {name}.", verse: "Show me the way I should go, for to you I entrust my life. - Psalm 143:8" },
    { text: "Create in me a pure heart, O God, and renew a steadfast spirit within me, {name}.", verse: "Psalm 51:10" },
    { text: "Therefore, there is now no condemnation for those who are in Christ Jesus, {name}.", verse: "Romans 8:1" },
    { text: "But the fruit of the Spirit is love, joy, peace, forbearance, kindness, goodness, faithfulness, gentleness and self-control, {name}.", verse: "Against such things there is no law. - Galatians 5:22-23" }
];

function ActionAnalyticsCard({ souls }: { souls: Soul[] }) {
  const isMobile = useIsMobile();
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const chartConfig = {
    count: {
      label: 'Times',
      color: 'hsl(var(--chart-2))',
    },
  } satisfies import('@/components/ui/chart').ChartConfig;

  const actionData = useMemo(() => {
    if (!souls) return [];
    const now = new Date();

    const actionCounts: { [key: string]: number } = {};
    actionItems.forEach((item) => (actionCounts[item.id] = 0));

    souls.forEach((soul) => {
      soul.followUpLog?.forEach((log) => {
        const logDate = safeToDate(log.date);
        if (logDate && isSameMonth(logDate, now)) {
          log.actions?.forEach((actionId) => {
            if (actionCounts[actionId] !== undefined) {
              actionCounts[actionId]++;
            }
          });
        }
      });
    });

    return actionItems
      .map((item) => ({
        action: item.label,
        count: actionCounts[item.id],
      }))
      .sort((a, b) => b.count - a.count);
  }, [souls]);

  if (!souls || souls.length === 0) {
    return null;
  }
  
  const yAxisWidth = !mounted ? 170 : isMobile ? 120 : 170;
  const margin = !mounted ? { left: 160, right: 30 } : isMobile ? { left: 110, right: 20 } : { left: 160, right: 30 };
  const barSize = !mounted ? 18 : isMobile ? 12 : 18;
  const tickClassName = 'text-xs';


  return (
    <Card>
      <CardHeader>
        <CardTitle>Follow-up Actions Tracker</CardTitle>
        <CardDescription>
          Frequency of actions taken this month.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[450px] w-full">
          <ResponsiveContainer>
            <BarChart
              layout="vertical"
              data={actionData}
              margin={margin}
            >
              <CartesianGrid horizontal={false} />
              <YAxis
                dataKey="action"
                type="category"
                tickLine={false}
                axisLine={false}
                tickMargin={5}
                width={yAxisWidth}
                className={tickClassName}
                interval={0}
              />
              <XAxis dataKey="count" type="number" hide />
              <ChartTooltip
                cursor={false}
                content={<ChartTooltipContent indicator="line" />}
              />
              <Bar dataKey="count" layout="vertical" radius={4} barSize={barSize}>
                {actionData.map((_entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={chartColors[index % chartColors.length]}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const { user, loading: authLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const userDocRef = useMemo(() => {
    if (!user?.uid || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user?.uid, firestore]);
  const { data: userProfile, loading: profileLoading } =
    useDoc<UserProfile>(userDocRef);

  const soulsQuery = useMemo(() => {
    if (!user?.uid || !firestore) return null;
    return query(collection(firestore, `users/${user.uid}/souls`));
  }, [user?.uid, firestore]);
  const { data: soulsWon, loading: soulsLoading } = useCollection<Soul>(soulsQuery);

  // State and logic from progress page
  const [monthlyGoal, setMonthlyGoal] = useState(10);
  const [goalDate, setGoalDate] = useState<Date | null>(null);
  const [goalDialogOpen, setGoalDialogOpen] = useState(false);
  const [newGoal, setNewGoal] = useState(10);
  const [newGoalDate, setNewGoalDate] = useState<Date | null>(null);

  const [showWelcomeBack, setShowWelcomeBack] = useState(false);
  const [
    summaryData,
    setSummaryData,
  ] = useState<{
    newTestimoniesCount: number;
    soulsWonCount: number;
    recentDisciplines: { date: string; completed: boolean }[];
  } | null>(null);

  const [welcomeMessage, setWelcomeMessage] = useState<{
    text: string;
    verse: string;
  } | null>(null);

  useEffect(() => {
    // This effect runs on the client after hydration.
    // It's safe to use Math.random() here.
    const randomScripture =
      welcomeScriptures[Math.floor(Math.random() * welcomeScriptures.length)];
    setWelcomeMessage(randomScripture);
  }, []);

  useEffect(() => {
    const today = new Date();
    setGoalDate(today);
    setNewGoalDate(today);
  }, []);

  const loading = authLoading || profileLoading || soulsLoading;

  useEffect(() => {
    if (loading || !userProfile || !firestore || !user) return;

    const lastActive = safeToDate(userProfile.lastActive);
    const now = new Date();

    // Show summary if last active was more than 48 hours ago
    if (lastActive && differenceInHours(now, lastActive) > 48) {
      const fetchSummaryData = async () => {
        try {
          // 1. Get new testimonies count
          const testimoniesQuery = query(
            collection(firestore, 'testimonies'),
            where('createdAt', '>', lastActive)
          );
          const testimoniesSnapshot = await getCountFromServer(testimoniesQuery);
          const newTestimoniesCount = testimoniesSnapshot.data().count;

          // 2. Get souls won count (already available from page data)
          const soulsWonCount = soulsWon?.length ?? 0;

          // 3. Get recent discipline history
          const recentDisciplines: { date: string; completed: boolean }[] = [];
          const threeDaysAgo = subDays(now, 4); // Go back a bit further to be safe
          const disciplineHistoryQuery = query(
            collection(firestore, `users/${user.uid}/disciplineHistory`),
            where('date', '>=', threeDaysAgo)
          );
          const disciplineSnapshot = await getDocs(disciplineHistoryQuery);
          const historyMap = new Map(
            disciplineSnapshot.docs.map((d) => [
              format(safeToDate(d.data().date)!, 'yyyy-MM-dd'),
              d.data().completed.length > 0,
            ])
          );

          for (let i = 1; i <= 3; i++) {
            const date = subDays(now, i);
            const dateString = format(date, 'yyyy-MM-dd');
            const prettyDate = format(date, 'MMM d');
            recentDisciplines.push({
              date: prettyDate,
              completed: historyMap.get(dateString) || false,
            });
          }
          recentDisciplines.reverse(); // Show oldest first

          setSummaryData({
            newTestimoniesCount,
            soulsWonCount,
            recentDisciplines,
          });
          setShowWelcomeBack(true);
        } catch (error) {
          console.error('Failed to fetch welcome back summary:', error);
          // Don't show the dialog if data fetching fails.
        }
      };

      fetchSummaryData();
    }
  }, [loading, userProfile, firestore, user, soulsWon]);

  const handleGoalDateChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    if (value) {
      const [year, month] = value.split('-').map(Number);
      setNewGoalDate(new Date(year, month - 1, 1));
    }
  };

  const newGoalDateValue = newGoalDate ? format(newGoalDate, 'yyyy-MM') : '';

  const soulsThisMonth = useMemo(() => {
    if (!soulsWon || !goalDate) return 0;
    return soulsWon.filter((soul) => {
      const wonDate = safeToDate(soul.wonAt);
      if (!wonDate) return false;
      return isSameMonth(wonDate, goalDate);
    }).length;
  }, [soulsWon, goalDate]);

  const progressData = useMemo(() => {
    if (!soulsWon) return [];
    const monthlyData: { [key: string]: { date: string; soulsWon: number } } = {};
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 2);
    threeMonthsAgo.setDate(1);

    for (let i = 0; i < 3; i++) {
      const date = new Date(
        threeMonthsAgo.getFullYear(),
        threeMonthsAgo.getMonth() + i,
        1
      );
      const monthKey = format(date, 'MMM');
      monthlyData[monthKey] = { date: monthKey, soulsWon: 0 };
    }

    soulsWon.forEach((soul) => {
      const wonDate = safeToDate(soul.wonAt);
      if (wonDate && wonDate >= threeMonthsAgo) {
        const monthKey = format(wonDate, 'MMM');
        if (monthlyData[monthKey]) {
          monthlyData[monthKey].soulsWon++;
        }
      }
    });
    return Object.values(monthlyData);
  }, [soulsWon]);

  const handleSaveGoal = () => {
    if (newGoal > 0 && newGoalDate) {
      setMonthlyGoal(newGoal);
      setGoalDate(newGoalDate);
      setGoalDialogOpen(false);
      toast({
        title: 'Monthly Goal Updated',
        description: `Your new goal for ${format(
          newGoalDate,
          'MMMM yyyy'
        )} is ${newGoal} souls.`,
      });
    } else {
      toast({
        variant: 'destructive',
        title: 'Invalid Goal',
        description: 'Please enter a number greater than 0.',
      });
    }
  };
  
  const followUpStatusData = useMemo(() => {
    if (!soulsWon) {
      return [
        { status: 'New', count: 0 },
        { status: 'Contacted', count: 0 },
        { status: 'Established', count: 0 },
      ];
    }
    
    const statusCounts: { [key in Soul['status']]: number } = {
      New: 0,
      Contacted: 0,
      Established: 0,
    };

    soulsWon.forEach(soul => {
      if (soul.status && soul.status in statusCounts) {
        statusCounts[soul.status]++;
      } else {
        statusCounts['New']++; // Default to New if status is missing
      }
    });

    return [
      { status: 'New', count: statusCounts.New },
      { status: 'Contacted', count: statusCounts.Contacted },
      { status: 'Established', count: statusCounts.Established },
    ];
  }, [soulsWon]);

  const followUpStatusColors: Record<Soul['status'], string> = {
    New: 'hsl(var(--status-new))',
    Contacted: 'hsl(var(--status-contacted))',
    Established: 'hsl(var(--status-established))',
  };

  const soulsWonCount = soulsWon?.length ?? 0;

  const displayName = userProfile?.firstName || user?.displayName || 'User';

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight font-headline">
          {welcomeMessage?.text.replace('{name}', displayName) ||
            `Welcome back, ${displayName}!`}
        </h1>
        <p className="text-muted-foreground uppercase">
          {welcomeMessage
            ? welcomeMessage.verse
            : ''}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <DailyDisciplineCard />

          <Card>
            <CardHeader>
              <CardTitle>Monthly Statistics</CardTitle>
              <CardDescription>Souls won in the last 3 months.</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={progressData} accessibilityLayer>
                    <CartesianGrid vertical={false} />
                    <XAxis
                      dataKey="date"
                      tickLine={false}
                      tickMargin={10}
                      axisLine={false}
                      tickFormatter={(value) => value.slice(0, 3)}
                    />
                    <YAxis
                      domain={[
                        0,
                        (dataMax: number) => Math.max(dataMax || 0, monthlyGoal),
                      ]}
                    />
                    <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
                    <Bar dataKey="soulsWon" radius={8}>
                      {progressData.map((_entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={chartColors[index % chartColors.length]}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>

          <ActionAnalyticsCard souls={soulsWon || []} />

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div className="space-y-1.5">
                <CardTitle>Recent Souls Won</CardTitle>
                <CardDescription>
                  The latest additions to your follow-up list.
                </CardDescription>
              </div>
              <Button asChild variant="outline" size="sm">
                <Link href="/dashboard/souls-won">View All</Link>
              </Button>
            </CardHeader>
            <CardContent>
              <RecentSoulsList />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-8">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Monthly Goal</CardTitle>
                  <CardDescription>
                    {goalDate ? format(goalDate, 'MMMM yyyy') : '...'}
                  </CardDescription>
                </div>
                <Dialog
                  open={goalDialogOpen}
                  onOpenChange={(isOpen) => {
                    if (isOpen) {
                      setNewGoal(monthlyGoal);
                      setNewGoalDate(goalDate);
                    }
                    setGoalDialogOpen(isOpen);
                  }}
                >
                  <DialogTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <Edit className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                      <DialogTitle>Set Monthly Goal</DialogTitle>
                      <DialogDescription>
                        Set your personal goal for souls won for a specific month.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="goal" className="text-right">
                          Souls
                        </Label>
                        <Input
                          id="goal"
                          type="number"
                          value={newGoal}
                          onChange={(e) => setNewGoal(Number(e.target.value))}
                          className="col-span-3"
                        />
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="goal-month" className="text-right">
                          For Month
                        </Label>
                        <Input
                          id="goal-month"
                          type="month"
                          value={newGoalDateValue}
                          onChange={handleGoalDateChange}
                          className="col-span-3"
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button onClick={handleSaveGoal}>Save Goal</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {goalDate ? (
                <div className="space-y-2">
                  <div className="flex justify-between items-baseline">
                    <div className="text-2xl font-bold">{soulsThisMonth}</div>
                    <div className="text-sm text-muted-foreground">
                      / {monthlyGoal} souls
                    </div>
                  </div>
                  <Progress
                    value={
                      monthlyGoal > 0 ? (soulsThisMonth / monthlyGoal) * 100 : 0
                    }
                    className="h-2"
                  />
                  <p className="text-xs text-muted-foreground text-right">{`${
                    monthlyGoal > 0
                      ? Math.round((soulsThisMonth / monthlyGoal) * 100)
                      : 0
                  }% complete`}</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <Skeleton className="h-6 w-1/2" />
                  <Skeleton className="h-2 w-full" />
                  <Skeleton className="h-3 w-1/4 ml-auto" />
                </div>
              )}
            </CardContent>
            <CardFooter className="pt-4 flex items-center gap-2 text-sm text-muted-foreground">
              <UserCheck2 className="h-4 w-4" />
              <span>
                Total souls won:{' '}
                <span className="font-bold text-foreground">
                  {soulsWonCount}
                </span>
              </span>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Follow-up Funnel</CardTitle>
              <CardDescription>
                Current status of all souls won.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={{}} className="h-[200px] w-full">
                <ResponsiveContainer>
                    <BarChart
                        data={followUpStatusData}
                        layout="vertical"
                        margin={{ left: 10, right: 10, top: 10, bottom: 10 }}
                    >
                        <XAxis type="number" hide />
                        <YAxis
                            dataKey="status"
                            type="category"
                            tickLine={false}
                            axisLine={false}
                            tickMargin={10}
                            width={80}
                        />
                        <ChartTooltip
                            cursor={false}
                            content={<ChartTooltipContent hideLabel />}
                        />
                        <Bar dataKey="count" radius={5}>
                            {followUpStatusData.map((entry) => (
                                <Cell
                                    key={entry.status}
                                    fill={followUpStatusColors[entry.status as Soul['status']]}
                                />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>

          {userProfile?.location && (
            <GlobalSoulsCard
              location={userProfile.location}
              userSouls={soulsWon || []}
            />
          )}

          <Card className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground">
            <CardHeader>
              <CardTitle>Share Your Story</CardTitle>
              <CardDescription className="text-primary-foreground/80">
                Encourage the body of Christ with what God has done.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild variant="secondary" className="w-full">
                <Link href="/dashboard/testimonies">
                  Share Testimony <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
      {summaryData && userProfile && (
        <WelcomeBackDialog
          isOpen={showWelcomeBack}
          onClose={() => setShowWelcomeBack(false)}
          userProfile={userProfile}
          summaryData={summaryData}
        />
      )}
    </div>
  );
}
