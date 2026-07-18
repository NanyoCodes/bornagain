import type { FollowUpStatus } from './types';

export const actionItems = [
  { id: 'prayed_together', label: 'Pray with' },
  { id: 'studied_bible', label: 'Study the Word with' },
  { id: 'shared_meal', label: 'Share a meal with' },
  { id: 'visited_home', label: 'Visit' },
  { id: 'introduced_friend', label: 'Introduce to a friend' },
  { id: 'gave_gift', label: 'Give a gift to' },
  { id: 'phone_call', label: 'Call' },
  { id: 'text_message', label: 'Message' },
  { id: 'helped_with_need', label: 'Help with a need' },
  { id: 'invited_to_event', label: 'Invite to an event' },
];

export const statusOptions: FollowUpStatus[] = ['New', 'Contacted', 'Established'];

export const prayerTemplates = [
    {
        id: 'strength',
        label: 'Strength & Empowerment',
        text: "Heavenly Father, I bring {name} before You today. Lord, I pray that You would strengthen {object} with Your mighty power in {possessive} inner being. May {subject} be rooted and established in Your love, and may {subject} have the spiritual strength to overcome every challenge {subject} faces. Fill {object} with the knowledge of Your will through all the wisdom and understanding that the Spirit gives, so that {subject} may live a life worthy of You and please You in every way. Grant {object} peace that surpasses understanding and joy that is unspeakable. In the name of Jesus, I pray. Amen."
    },
    {
        id: 'revelation',
        label: 'Grace & Revelation',
        text: "Lord Jesus, I thank You for {name}. I pray that You would open the eyes of {possessive} heart today to see Your goodness and Your truth. May {subject} walk in a fresh revelation of Your grace, knowing that You are with {object} and that Your plans for {object} are plans for good and not for evil, to give {object} a hope and a future. Lead {object} by Your Spirit into all truth, and let Your light shine brightly in {possessive} life. May {subject} experience Your presence in a deep and transformative way today. I declare Your favor and protection over {object} in every area of {possessive} life. Amen."
    },
    {
        id: 'provision',
        label: 'Provision & Health',
        text: "Gracious God, I lift up {name} to Your loving care. You are the Great Physician and our Jehovah Jireh. I pray for Your divine provision and healing to flow into {possessive} life right now. Meet every need according to Your riches in glory in Christ Jesus. I speak health to {possessive} body, peace to {possessive} mind, and prosperity to {possessive} soul. May {subject} see Your hand moving in {possessive} circumstances, making a way where there seems to be no way. Strengthen {possessive} faith to trust in Your perfect timing and Your unfailing love. Thank You for Your faithfulness. Amen."
    }
];

export const kingdomVerses = [
    { reference: "John 3:16", text: "For God so loved the world that he gave his one and only Son, that whoever believes in him shall not perish but have eternal life." },
    { reference: "Romans 10:9", text: "If you declare with your mouth, 'Jesus is Lord,' and believe in your heart that God raised him from the dead, you will be saved." },
    { reference: "2 Corinthians 5:17", text: "Therefore, if anyone is in Christ, the new creation has come: The old has gone, the new is here!" },
    { reference: "Ephesians 2:8-9", text: "For it is by grace you have been saved, through faith—and this is not from yourselves, it is the gift of God—not by works, so that no one can boast." },
    { reference: "Psalm 23:1", text: "The Lord is my shepherd, I lack nothing." },
    { reference: "Matthew 11:28", text: "Come to me, all you who are weary and burdened, and I will give you rest." },
    { reference: "Joshua 1:9", text: "Have I not commanded you? Be strong and courageous. Do not be afraid; do not be discouraged, for the Lord your God will be with you wherever you go." },
    { reference: "Jeremiah 29:11", text: "'For I know the plans I have for you,' declares the Lord, 'plans to prosper you and not to harm you, plans to give you hope and a future.'" }
];
