export type ThemeDefinition = {
  id: string;
  label: string;
  fields: Array<[string, string]>;
  tags: string[];
  fieldTags?: Record<string, string[]>;
  fieldHints?: Record<string, string>;
};

export const relationshipStatusOptions = ["Single", "Married", "In relationship", "Open relationship", "Complicated"];

export const descriptionThemes: ThemeDefinition[] = [
  { id: "physical", label: "Physical", fields: [["height", "Height"], ["weight", "Weight"], ["bodyShape", "Body shape"], ["eyes", "Eyes"], ["hair", "Hair"], ["origins", "Origins"], ["smoker", "Smoker"]], tags: [] },
  { id: "culture", label: "Culture", fields: [["architecture", "Architecture"], ["sculpture", "Sculpture"], ["painting", "Painting"], ["music", "Music"], ["literature", "Literature"], ["theatre", "Theatre"], ["cinema", "Cinema"], ["series", "TV series"], ["media", "Media"], ["comics", "Comics"], ["videoGames", "Video games"], ["sciences", "Science"], ["other", "Other"]], tags: [], fieldTags: {
    architecture: ["Classical", "Gothic", "Renaissance", "Modern", "Contemporary", "Art Deco", "Sustainable"],
    sculpture: ["Classical", "Modern", "Contemporary", "Abstract", "Public art", "Installation"],
    painting: ["Renaissance", "Impressionism", "Modern", "Contemporary", "Abstract", "Street art", "Photography"],
    music: ["Classical", "Jazz", "Rock", "Pop", "Hip-hop", "Electronic", "Folk", "World music", "Live music"],
    literature: ["Novels", "Poetry", "Essays", "History", "Science fiction", "Fantasy", "Mystery", "Biography"],
    theatre: ["Classical", "Contemporary", "Comedy", "Musical", "Opera", "Dance", "Live performance"],
    cinema: ["Drama", "Comedy", "Documentary", "Thriller", "Science fiction", "Animation", "Independent", "World cinema"],
    series: ["Drama", "Comedy", "Documentary", "Crime", "Science fiction", "Fantasy", "Animation", "Mini-series"],
    media: ["News", "Podcasts", "Radio", "Magazines", "Long-form", "Independent media"],
    comics: ["Comics", "Graphic novels", "Manga", "Webcomics", "Independent"],
    videoGames: ["Adventure", "Strategy", "Role-playing", "Puzzle", "Simulation", "Cooperative", "Indie"],
    sciences: ["Physics", "Biology", "Astronomy", "Technology", "Psychology", "Environment", "Popular science"],
    other: ["Museums", "Design", "Photography", "Crafts", "Heritage", "Festivals"]
  } },
  { id: "professional", label: "Professional", fields: [], tags: ["manager", "individual contributor", "freelance", "entrepreneur", "remote", "hybrid", "onsite", "tech", "creative", "consulting", "non-profit", "public sector", "education", "healthcare", "finance", "early career", "mid-career", "senior", "executive"] },
  { id: "political", label: "Politics / Economy", fields: [], tags: ["far Left", "radical Left", "left", "center-left", "center", "center-right", "right", "radical Right", "Far right", "liberal", "conservative", "libertarian", "ecologist", "social-democrat", "socialist", "anarchist", "capitalist", "anti-capitalist", "pro-EU", "eurosceptic", "globalist", "localist", "apolitical"] },
  { id: "sport", label: "Sports", fields: [], tags: ["sedentary", "beginner", "regular", "intense", "outdoor", "indoor", "team sports", "individual sports", "running", "cycling", "swimming", "fitness", "yoga", "combat sports", "ball sports", "mountain", "water sports", "competition", "just for fun"] },
  { id: "spirituality", label: "Spirituality", fields: [], tags: ["atheist", "agnostic", "spiritual but not religious", "religious", "christian", "muslim", "jewish", "buddhist", "hindu", "other religion", "meditation", "mindfulness", "energy work", "esoteric", "rituals", "philosophy-oriented", "questioning", "practicing", "non-practicing"] },
  { id: "psycho", label: "Psycho", fields: [], tags: ["adaptable", "affectionate", "ambitious", "ambivert", "analytical", "anxious", "assertive", "attentive", "calm", "chaotic", "confident", "creative", "curious", "dreamer", "emotional", "empathetic", "extrovert", "flexible", "grounded", "humorous", "idealistic", "independent", "introvert", "intuitive", "loyal", "mindful", "open-minded", "organized", "patient", "perfectionist", "playful", "pragmatic", "protective", "rational", "realistic", "reserved", "sensitive", "serious", "shy", "spontaneous", "stubborn", "deep talks", "intimate talks", "professional talks", "small talks"] },
  { id: "sexo", label: "Sexuality", fields: [["desire", "Desire level"], ["modesty", "Modesty"], ["communication", "Communication"], ["touch", "Physical touch"]], fieldHints: { desire: "Interest and intensity", modesty: "Comfort with exposure", communication: "How openly you talk", touch: "Comfort with physical contact" }, tags: ["straight", "bi", "demi", "alter", "asexual", "homo", "pan", "sapio", "skolio", "monogamy", "non-monogamy", "polyamory", "exclusive", "open"] },
  { id: "kinky", label: "Kinky · preferences and limits", fields: [], tags: ["Soft", "BDSM", "Roleplay", "Switch", "Dom", "Sub"] }
];

export const descriptionRelationships = [
  ["friends", "Friends"], ["professional", "Professional"], ["oldfriends", "Old friends"], ["socializing", "Socializing"], ["friendship", "For friendship"], ["love", "For love"], ["casual", "For casual"], ["undecided", "Undecided"], ["casualfun", "For casual fun"]
] as const;

export const descriptionThemeAccess: Record<string, string[]> = {
  friends: [],
  professional: ["professional"],
  oldfriends: ["professional"],
  socializing: ["culture", "political", "professional", "sexo"],
  friendship: ["culture"],
  love: ["physical", "culture", "psycho"],
  casual: ["physical"],
  undecided: ["physical", "culture", "psycho"],
  casualfun: ["physical", "sexo", "kinky"]
};

export const contextThemeAccess: Record<string, string[]> = {
  Professional: ["professional", "culture", "political", "sport", "spirituality", "psycho", "physical"],
  Personal: ["physical", "culture", "sport", "spirituality", "psycho"],
  Political: ["political", "culture", "professional", "psycho"],
  Dating: ["physical", "culture", "spirituality", "psycho", "sexo", "kinky"]
};
