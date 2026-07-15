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
