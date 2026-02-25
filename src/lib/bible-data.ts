
export type Verse = {
  verse: number;
  text: string;
};

export type Chapter = {
  chapter: number;
  verses: Verse[];
};

export type Book = {
  name: string;
  chapters: Chapter[];
};

// Using World English Bible (public domain)
export const bibleData: Book[] = [
  {
    name: 'Genesis',
    chapters: [
      {
        chapter: 1,
        verses: [
          { verse: 1, text: 'In the beginning, God created the heavens and the earth.' },
          { verse: 2, text: 'The earth was formless and empty. Darkness was on the surface of the deep and God’s Spirit was hovering over the surface of the waters.' },
          { verse: 3, text: 'God said, “Let there be light,” and there was light.' },
          { verse: 4, text: 'God saw the light, and that it was good. God divided the light from the darkness.' },
          { verse: 5, text: 'God called the light “day”, and the darkness he called “night”. There was evening and there was morning, one day.' },
        ],
      },
    ],
  },
  {
    name: 'Exodus',
    chapters: [
        {
            chapter: 1,
            verses: [
                { verse: 1, text: 'Now these are the names of the sons of Israel, who came into Egypt (every man and his household came with Jacob):' },
                { verse: 2, text: 'Reuben, Simeon, Levi, and Judah,' },
                { verse: 3, text: 'Issachar, Zebulun, and Benjamin,' },
                { verse: 4, text: 'Dan and Naphtali, Gad and Asher.' },
                { verse: 5, text: 'All the souls who came out of Jacob’s body were seventy souls, and Joseph was in Egypt already.' },
            ]
        }
    ]
  },
  {
    name: 'John',
    chapters: [
      {
        chapter: 1,
        verses: [
          { verse: 1, text: 'In the beginning was the Word, and the Word was with God, and the Word was God.' },
          { verse: 2, text: 'The same was in the beginning with God.' },
          { verse: 3, text: 'All things were made through him. Without him, nothing was made that has been made.' },
          { verse: 4, text: 'In him was life, and the life was the light of men.' },
          { verse: 5, text: 'The light shines in the darkness, and the darkness hasn’t overcome it.' },
        ],
      },
      {
        chapter: 2,
        verses: [
            { verse: 1, text: 'The third day, there was a wedding in Cana of Galilee. Jesus’ mother was there.' },
            { verse: 2, text: 'Jesus also was invited, with his disciples, to the wedding.' },
            { verse: 3, text: 'When the wine ran out, Jesus’ mother said to him, “They have no wine.”' },
        ]
      },
       {
        chapter: 3,
        verses: [
            { verse: 16, text: 'For God so loved the world, that he gave his one and only Son, that whoever believes in him should not perish, but have eternal life.' },
        ]
      }
    ],
  },
];
