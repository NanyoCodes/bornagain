import { GameSessionType } from './types';

export const BIBLE_GAME_DATA: Record<GameSessionType, any[]> = {
  word: [
    { text: "For God so loved the world that he gave his one and only Son, that whoever believes in him shall not perish but have eternal ______.", correct: "Life", options: ["Life", "Wealth", "Glory", "Peace"], ref: "John 3:16" },
    { text: "The Lord is my shepherd, I shall not ______.", correct: "Want", options: ["Fear", "Wait", "Want", "Fall"], ref: "Psalm 23:1" },
    { text: "I can do all things through ______ who strengthens me.", correct: "Christ", options: ["Faith", "Christ", "Prayer", "Effort"], ref: "Philippians 4:13" },
    { text: "In the beginning was the ______, and the ______ was with God, and the ______ was God.", correct: "Word", options: ["Light", "Word", "Spirit", "Life"], ref: "John 1:1" },
    { text: "But seek first the ______ of God and his righteousness, and all these things will be added to you.", correct: "Kingdom", options: ["Grace", "Power", "Kingdom", "Peace"], ref: "Matthew 6:33" },
    { text: "Trust in the Lord with all your ______, and lean not on your own understanding.", correct: "Heart", options: ["Might", "Soul", "Heart", "Mind"], ref: "Proverbs 3:5" },
    { text: "The fruit of the Spirit is love, joy, ______, forbearance, kindness, goodness, faithfulness...", correct: "Peace", options: ["Power", "Peace", "Hope", "Strength"], ref: "Galatians 5:22" },
    { text: "For I know the plans I have for you, declares the Lord, plans to ______ you and not to harm you.", correct: "Prosper", options: ["Help", "Prosper", "Heal", "Guide"], ref: "Jeremiah 29:11" },
    { text: "Your word is a ______ for my feet, a light on my path.", correct: "Lamp", options: ["Guide", "Light", "Lamp", "Fire"], ref: "Psalm 119:105" },
    { text: "But you will receive ______ when the Holy Spirit comes on you.", correct: "Power", options: ["Peace", "Wisdom", "Power", "Grace"], ref: "Acts 1:8" },
    { text: "Go into all the world and ______ the gospel to all creation.", correct: "Preach", options: ["Teach", "Preach", "Show", "Sing"], ref: "Mark 16:15" },
    { text: "The ______ of the Lord is my strength.", correct: "Joy", options: ["Peace", "Word", "Joy", "Grace"], ref: "Nehemiah 8:10" },
    { text: "For by ______ you have been saved through faith.", correct: "Grace", options: ["Works", "Mercy", "Grace", "Love"], ref: "Ephesians 2:8" },
    { text: "Submit yourselves therefore to God. Resist the ______, and he will flee from you.", correct: "Devil", options: ["World", "Devil", "Flesh", "Fear"], ref: "James 4:7" },
    { text: "Draw ______ to God, and he will draw ______ to you.", correct: "Near", options: ["Close", "Near", "Fast", "Up"], ref: "James 4:8" },
    { text: "Let your ______ so shine before men, that they may see your good works.", correct: "Light", options: ["Faith", "Light", "Love", "Hope"], ref: "Matthew 5:16" },
    { text: "If we confess our sins, he is faithful and ______ to forgive us our sins.", correct: "Just", options: ["True", "Kind", "Just", "Good"], ref: "1 John 1:9" },
    { text: "I have ______ the good fight, I have finished the race, I have kept the faith.", correct: "Fought", options: ["Won", "Fought", "Lost", "Run"], ref: "2 Timothy 4:7" },
    { text: "The Lord is near to the ______.", correct: "Brokenhearted", options: ["Righteous", "Strong", "Brokenhearted", "Humble"], ref: "Psalm 34:18" },
    { text: "Give ______ to the Lord, for he is good.", correct: "Thanks", options: ["Glory", "Thanks", "Praise", "Honor"], ref: "Psalm 107:1" },
    { text: "By ______ you have been saved, through faith—and this is not from yourselves.", correct: "Grace", options: ["Grace", "Prayer", "Effort", "History"], ref: "Ephesians 2:8" },
    { text: "The grass withers and the flowers fall, but the ______ of our God endures forever.", correct: "Word", options: ["Spirit", "Grace", "Word", "Love"], ref: "Isaiah 40:8" },
    { text: "Rejoice always, pray ______.", correct: "Continually", options: ["Daily", "Continually", "Loudly", "Often"], ref: "1 Thess 5:16" },
    { text: "In all your ways ______ him, and he will make your paths straight.", correct: "Acknowledge", options: ["Follow", "Seek", "Acknowledge", "Trust"], ref: "Proverbs 3:6" },
    { text: "The name of the Lord is a fortified ______, the righteous run to it and are safe.", correct: "Tower", options: ["City", "Tower", "Shield", "Wall"], ref: "Proverbs 18:10" },
    { text: "Whatever you do, work at it with all your ______, as working for the Lord.", correct: "Heart", options: ["Might", "Strength", "Heart", "Skill"], ref: "Colossians 3:23" },
    { text: "Be still, and know that I am ______.", correct: "God", options: ["Lord", "King", "God", "Here"], ref: "Psalm 46:10" },
    { text: "Greater is He that is in you than he that is in the ______.", correct: "World", options: ["Flesh", "Earth", "World", "Dark"], ref: "1 John 4:4" },
    { text: "Taste and see that the Lord is ______.", correct: "Good", options: ["Great", "Holy", "Good", "Near"], ref: "Psalm 34:8" },
    { text: "Ask and it will be given to you; ______ and you will find.", correct: "Seek", options: ["Seek", "Knock", "Pray", "Wait"], ref: "Matthew 7:7" }
  ],
  prayer: [
    { text: "I am feeling overwhelmed and anxious today. Which word should I stand on?", correct: "1 Peter 5:7", options: ["1 Peter 5:7", "Luke 12:15", "James 4:6", "Exodus 14:14"], ref: "Cast all your anxiety on him." },
    { text: "I need divine healing in my body. Which promise is for me?", correct: "Isaiah 53:5", options: ["Isaiah 53:5", "Psalm 23:1", "John 14:6", "Acts 1:8"], ref: "By His wounds we are healed." },
    { text: "I am facing a giant that seems too big. What should I declare?", correct: "1 Samuel 17:47", options: ["1 Samuel 17:47", "John 3:16", "Proverbs 3:5", "Psalm 119:105"], ref: "The battle is the Lord's." },
    { text: "I need wisdom for a difficult decision. Where should I look?", correct: "James 1:5", options: ["James 1:5", "Mark 11:24", "Isaiah 40:31", "Hebrews 11:1"], ref: "If any of you lacks wisdom..." },
    { text: "I am struggling with fear about the future. What is my weapon?", correct: "2 Timothy 1:7", options: ["2 Timothy 1:7", "Psalm 51:10", "Job 1:21", "Luke 6:38"], ref: "God gave us a spirit of power." },
    { text: "I need financial breakthrough. Which verse promises provision?", correct: "Philippians 4:19", options: ["Philippians 4:19", "Acts 2:42", "Titus 3:5", "Jude 1:24"], ref: "My God will supply all your needs." },
    { text: "I feel lonely and forgotten. What does God say?", correct: "Matthew 28:20", options: ["Matthew 28:20", "Genesis 1:1", "Esther 4:14", "Ruth 1:16"], ref: "I am with you always." },
    { text: "I am seeking forgiveness for my past. Where is my hope?", correct: "1 John 1:9", options: ["1 John 1:9", "Numbers 23:19", "Malachi 3:10", "Haggai 2:9"], ref: "He is faithful to forgive." },
    { text: "I want to be bold in my witnessing. What should I pray?", correct: "Acts 4:29", options: ["Acts 4:29", "Colossians 4:6", "Romans 1:16", "2 Peter 3:18"], ref: "Enable your servants to speak with boldness." },
    { text: "I am being persecuted for my faith. How do I respond?", correct: "Matthew 5:44", options: ["Matthew 5:44", "Leviticus 19:18", "Psalm 37:4", "Proverbs 16:3"], ref: "Love your enemies and pray for those who persecute you." }
  ],
  trivia: [
    { text: "Who was the first person to see the resurrected Jesus?", correct: "Mary Magdalene", options: ["Peter", "John", "Mary Magdalene", "Thomas"], ref: "John 20:14" },
    { text: "How many days and nights did Jonah spend in the belly of the big fish?", correct: "3", options: ["1", "3", "7", "40"], ref: "Jonah 1:17" },
    { text: "What was the first miracle Jesus performed?", correct: "Water into wine", options: ["Healing the blind", "Water into wine", "Walking on water", "Feeding 5000"], ref: "John 2:1-11" },
    { text: "Who was the oldest man mentioned in the Bible?", correct: "Methuselah", options: ["Adam", "Noah", "Methuselah", "Abraham"], ref: "Genesis 5:27" },
    { text: "How many books are there in the New Testament?", correct: "27", options: ["21", "27", "39", "66"], ref: "The New Testament canon." }
  ],
  wisdom: [
    { text: "Psalm 23: The Lord is my shepherd, I lack nothing. He makes me lie down in green pastures, he leads me beside ______ waters.", correct: "Quiet", options: ["Quiet", "Still", "Living", "Deep"], ref: "Psalm 23:1-2" },
    { text: "Psalm 23: Even though I walk through the darkest valley, I will fear no evil, for you are with me; your rod and your ______, they comfort me.", correct: "Staff", options: ["Hand", "Staff", "Shield", "Word"], ref: "Psalm 23:4" },
    { text: "Proverbs 3: Trust in the Lord with all your heart and lean not on your own ______.", correct: "Understanding", options: ["Strength", "Understanding", "Wisdom", "Ways"], ref: "Proverbs 3:5" },
    { text: "Proverbs 3: In all your ways submit to him, and he will make your ______ straight.", correct: "Paths", options: ["Life", "Roads", "Paths", "Ways"], ref: "Proverbs 3:6" },
    { text: "Psalm 1: Blessed is the one who does not walk in step with the wicked... but whose ______ is in the law of the Lord.", correct: "Delight", options: ["Hope", "Delight", "Trust", "Peace"], ref: "Psalm 1:1-2" },
    { text: "Proverbs 1: The ______ of the Lord is the beginning of knowledge, but fools despise wisdom and instruction.", correct: "Fear", options: ["Love", "Word", "Fear", "Spirit"], ref: "Proverbs 1:7" },
    { text: "Psalm 34: I will extol the Lord at all times; his ______ will always be on my lips.", correct: "Praise", options: ["Word", "Praise", "Name", "Song"], ref: "Psalm 34:1" },
    { text: "Proverbs 4: Above all else, guard your ______, for everything you do flows from it.", correct: "Heart", options: ["Mind", "Soul", "Heart", "Life"], ref: "Proverbs 4:23" },
    { text: "Psalm 119: Your word is a ______ for my feet, a light on my path.", correct: "Lamp", options: ["Lamp", "Guide", "Light", "Fire"], ref: "Psalm 119:105" },
    { text: "Proverbs 16: Commit to the Lord whatever you do, and he will establish your ______.", correct: "Plans", options: ["Ways", "Plans", "Steps", "Life"], ref: "Proverbs 16:3" }
  ]
};
