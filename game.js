// Game State
let gameState = {
    gold: 500,
    day: 1,
    reputation: 'Neutral',
    retirementGoal: 10000,
    currentPhase: 'day',
    gatheredInfo: [], // Daily temporary info (still used for story choices)
    knownCharacters: {}, // Persistent character knowledge across days
    visitedLocations: [],
    conversationsUsed: 0,
    maxConversationsPerDay: 4,
    talkedToToday: [], // Track which NPCs we've talked to today
    innCostPerNight: 5,
    storyChoices: {
        act1: null,
        act2: null,
        act3: null
    },
            storyCharacters: null, // Store selected characters consistently across acts
        act1ChoiceData: {}, // Store character data for each Act 1 choice
        consequences: [],
    townHistory: [], // Track major events and changes over time
    eveningAudience: [], // Characters attending tonight's performance
    audienceReactions: [], // Individual audience member reactions
    // New inventory and travel system
    inventory: {
        provisions: 0, // Food for travel
        bodyguards: 0, // Protection during travel
        medicine: 0, // Heal during travel
        wagons: 0, // Carry more supplies
        horses: 0 // Travel faster/safer
    },
    townNumber: 1, // Track which town we're in
    daysSinceLastMove: 0, // Track how long in current town
    bannedFromTown: false, // Flag for being chased out
    travelDanger: 50, // Base danger level for travel (0-100)
    // Lose condition tracking
    health: 100, // Health points (0-100)
    consecutiveBadPerformances: 0, // Track string of bad performances
    gameOverReason: null, // Track reason for game over
    warningsGiven: 0 // Track warnings before exile
};

// Town/City Generation Data
const townGen = {
    townTypes: {
        mining: {
            adjectives: ['Old', 'Deep', 'Rocky', 'Iron', 'Gold', 'Stone'],
            suffixes: ['ridge', 'hollow', 'mount', 'peak', 'valley', 'gorge'],
            specialties: ['Mining town with rich ore deposits', 'Former boomtown now struggling', 'Town built around ancient mines'],
            atmospheres: ['Dusty and industrial', 'Eerily quiet since the mines closed', 'Bustling with miners and traders']
        },
        trading: {
            adjectives: ['Cross', 'River', 'Bridge', 'Market', 'Fair', 'Merchant'],
            suffixes: ['roads', 'ford', 'bridge', 'haven', 'port', 'gate'],
            specialties: ['Major trading hub for the region', 'Crossroads where many paths meet', 'River town with busy docks'],
            atmospheres: ['Always bustling with commerce', 'Filled with travelers from distant lands', 'Rich but competitive']
        },
        farming: {
            adjectives: ['Green', 'Golden', 'Fertile', 'Harvest', 'Mill', 'Grain'],
            suffixes: ['field', 'meadow', 'vale', 'glen', 'brook', 'dell'],
            specialties: ['Agricultural center of the region', 'Known for its bountiful harvests', 'Peaceful farming community'],
            atmospheres: ['Quiet and pastoral', 'Hard-working but welcoming', 'Connected to the cycles of nature']
        },
        coastal: {
            adjectives: ['Salt', 'Wave', 'Tide', 'Storm', 'Pearl', 'Coral'],
            suffixes: ['bay', 'cove', 'harbor', 'shore', 'point', 'reef'],
            specialties: ['Fishing village by the sea', 'Important port for sea trade', 'Coastal town with maritime traditions'],
            atmospheres: ['Salty air and seabird cries', 'Weather-beaten but resilient', 'Connected to the rhythms of the tide']
        }
    },
    locationTypes: {
        tavern: {
            names: ['The {adjective} {noun}', 'The {noun} & {noun2}', '{adjective} {noun} Inn'],
            adjectives: ['Jolly', 'Prancing', 'Golden', 'Silver', 'Drunken', 'Merry', 'Crooked', 'Laughing', 'Weary', 'Dancing'],
            nouns: ['Pony', 'Dragon', 'Crown', 'Merchant', 'Sailor', 'Bard', 'Knight', 'Fox', 'Eagle', 'Wolf'],
            nouns2: ['Hammer', 'Anchor', 'Rose', 'Goblet', 'Coin', 'Barrel', 'Shield', 'Lute', 'Star', 'Moon']
        },
        store: {
            names: ['{adjective} Trading Post', '{noun}\'s General Store', 'The {adjective} {noun}'],
            adjectives: ['Reliable', 'Honest', 'Fair', 'Sturdy', 'Well-Stocked', 'Traveling', 'Frontier', 'Quality', 'Swift', 'Safe'],
            nouns: ['Merchant', 'Trader', 'Supply', 'Outfitter', 'Provisioner', 'Exchange', 'Warehouse', 'Emporium', 'Shop', 'Market']
        },
        market: {
            names: ['{adjective} Market', 'Market {noun}', 'The {adjective} {noun}'],
            adjectives: ['Grand', 'Central', 'Old', 'Bustling', 'Morning', 'Merchants\'', 'Town', 'Royal', 'Common', 'Fair'],
            nouns: ['Square', 'Plaza', 'Circle', 'Commons', 'Courtyard', 'Bazaar', 'Exchange', 'Grounds', 'District', 'Quarter']
        },
        industrial: {
            names: ['The Old {noun}', '{adjective} {noun}', 'The {noun} {noun2}'],
            adjectives: ['Abandoned', 'Ancient', 'Sealed', 'Forgotten', 'Lost', 'Hidden', 'Cursed', 'Deep', 'Dark', 'Silent'],
            nouns: ['Mine', 'Quarry', 'Mill', 'Forge', 'Foundry', 'Workshop', 'Factory', 'Smithy', 'Kiln', 'Works'],
            nouns2: ['Shaft', 'Pit', 'Hall', 'House', 'Works', 'Yard', 'Site', 'Complex', 'Grounds', 'District']
        },
        government: {
            names: ['{adjective} Hall', 'The {noun} House', '{noun} {noun2}'],
            adjectives: ['Town', 'City', 'Council', 'Guild', 'Mayors\'', 'Royal', 'Municipal', 'Civic', 'Public', 'Official'],
            nouns: ['Council', 'Guild', 'Court', 'Assembly', 'Chamber', 'Office', 'Authority', 'Registry', 'Bureau', 'Department'],
            nouns2: ['Hall', 'House', 'Building', 'Chambers', 'Offices', 'Complex', 'Center', 'Plaza', 'Square', 'District']
        }
    }
};

// Character Generation Data
const characterGen = {
    firstNames: {
        male: ['Aldric', 'Bram', 'Cole', 'Dorin', 'Edric', 'Finn', 'Gareth', 'Hugh', 'Ivan', 'Joren', 'Kael', 'Lenn', 'Magnus', 'Nolan', 'Owen', 'Pike', 'Quinn', 'Roderick', 'Sean', 'Thane', 'Ulric', 'Viktor', 'Willem', 'Yorick', 'Zane', 'Alaric', 'Ansel', 'Arden', 'Armin', 'Arne', 'Axel', 'Baldur', 'Barnaby', 'Bastian', 'Benedict', 'Bertram', 'Bjorn', 'Bodhi', 'Boris', 'Brand', 'Brock', 'Cadmus', 'Caius', 'Caspian', 'Cedric', 'Cillian', 'Clarence', 'Conrad', 'Corbin', 'Cormac', 'Crispin', 'Cyrus', 'Damian', 'Darius', 'Declan', 'Demetrius', 'Destin', 'Dorian', 'Drystan', 'Eamon', 'Einar', 'Elias', 'Emil', 'Enzo', 'Ewan', 'Fabian', 'Felix', 'Fergus', 'Finnian', 'Florian', 'Flynn', 'Gideon', 'Godfrey', 'Griffin', 'Gunther', 'Hadrian', 'Hamish', 'Hector', 'Henrik', 'Horatio', 'Igor', 'Ingram', 'Jago', 'Jaromir', 'Jasper', 'Jedediah', 'Jethro', 'Joachim', 'Jonas', 'Jude', 'Julian', 'Kai', 'Killian', 'Lars', 'Leander', 'Leif', 'Leopold', 'Llewellyn', 'Lucian', 'Ludovic', 'Luther', 'Lysander', 'Malachi', 'Marius', 'Maxim', 'Milo', 'Misha', 'Nikolai', 'Odin', 'Orion', 'Orson', 'Oscar', 'Oswald', 'Percival', 'Phineas', 'Randolph', 'Raphael', 'Remy', 'Rhett', 'Rhys', 'Rohan', 'Roland', 'Roman', 'Ronan', 'Rory', 'Rufus', 'Rupert', 'Rylan', 'Sampson', 'Samson', 'Saul', 'Sebastian', 'Silas', 'Soren', 'Stellan', 'Sven', 'Tadhg', 'Tage', 'Talon', 'Tavish', 'Tegan', 'Thaddeus', 'Theon', 'Thorin', 'Tiernan', 'Torin', 'Tristan', 'Tyrone', 'Ulysses', 'Uriah', 'Valentin', 'Vaughn', 'Viggo', 'Vincent', 'Vladimir', 'Walden', 'Walter', 'Warren', 'Wolfgang', 'Xander', 'Xavier', 'Yannick', 'Zebulon'],
        female: ['Anya', 'Brynn', 'Cara', 'Della', 'Elsa', 'Faye', 'Gwen', 'Hilda', 'Iris', 'Jana', 'Kira', 'Lena', 'Mara', 'Nina', 'Opal', 'Petra', 'Quinn', 'Rosa', 'Sara', 'Tara', 'Uma', 'Vera', 'Willa', 'Yvonne', 'Zara', 'Acacia', 'Adela', 'Adeline', 'Aibhlinn', 'Aida', 'Ailis', 'Aine', 'Alba', 'Allegra', 'Alma', 'Althea', 'Amara', 'Anika', 'Annelise', 'Aoife', 'Aria', 'Astrid', 'Aurelia', 'Aurora', 'Beatrix', 'Bellatrix', 'Bernadette', 'Bianca', 'Bronwyn', 'Calla', 'Calliope', 'Calypso', 'Camilla', 'Cassia', 'Celeste', 'Celia', 'Cerys', 'Cleo', 'Clover', 'Coralie', 'Cordelia', 'Cosima', 'Dahlia', 'Danae', 'Daphne', 'Delphine', 'Demelza', 'Echo', 'Elara', 'Elora', 'Elowen', 'Enya', 'Estelle', 'Eudora', 'Faline', 'Fallon', 'Ffion', 'Fiona', 'Fleur', 'Freya', 'Galina', 'Genevieve', 'Ginevra', 'Giselle', 'Greta', 'Guinevere', 'Hazel', 'Helena', 'Honora', 'Imogen', 'Indira', 'Iona', 'Isadora', 'Isolde', 'Jocelyn', 'Juniper', 'Kaia', 'Katya', 'Kerensa', 'Lark', 'Lavinia', 'Leona', 'Lilith', 'Linnea', 'Lorelei', 'Lucia', 'Luna', 'Lyra', 'Maeve', 'Maren', 'Mila', 'Minerva', 'Mirabel', 'Moira', 'Morgana', 'Nadia', 'Niamh', 'Odessa', 'Olympia', 'Ophelia', 'Orla', 'Paloma', 'Pandora', 'Phoebe', 'Poppy', 'Primrose', 'Ramona', 'Rhiannon', 'Rowan', 'Sabina', 'Sabrina', 'Saffron', 'Saoirse', 'Saskia', 'Seraphina', 'Shona', 'Sloane', 'Sorcha', 'Sylvia', 'Tamsin', 'Tatum', 'Tessa', 'Thalia', 'Thea', 'Theodora', 'Tilda', 'Twyla', 'Una', 'Ursula', 'Valentina', 'Viola', 'Willow', 'Xanthe', 'Yseult', 'Zelda', 'Zinnia', 'Zosia']
    },
    lastNames: ['Ashford', 'Blackwood', 'Cooper', 'Drake', 'Evans', 'Fletcher', 'Gray', 'Harper', 'Iron', 'Kane', 'Lane', 'Mason', 'North', 'Pike', 'Reed', 'Stone', 'Turner', 'Vale', 'Ward', 'Young', 'Aberdeen', 'Adair', 'Ainsworth', 'Albright', 'Alder', 'Allerton', 'Ambrose', 'Anson', 'Applegate', 'Arkwright', 'Armitage', 'Atherton', 'Atwood', 'Audley', 'Axton', 'Babcock', 'Bainbridge', 'Bancroft', 'Barlow', 'Barnaby', 'Barrett', 'Bartholomew', 'Bassett', 'Beckett', 'Bellamy', 'Bellingham', 'Blackburn', 'Blakely', 'Bradford', 'Branigan', 'Braxton', 'Brewster', 'Briscoe', 'Bromley', 'Brook', 'Buckley', 'Burnham', 'Byron', 'Cadogan', 'Callahan', 'Calvert', 'Caraway', 'Carlisle', 'Carrington', 'Cartwright', 'Chadwick', 'Chamberlain', 'Chapman', 'Chester', 'Clifford', 'Coburn', 'Colby', 'Colt', 'Connelly', 'Crawford', 'Cromwell', 'Dalton', 'Darcy', 'Davenport', 'Delaney', 'Dempsey', 'Donovan', 'Driscoll', 'Dudley', 'Edison', 'Ellington', 'Fairchild', 'Faraday', 'Fawcett', 'Fenn', 'Fenton', 'Finnegan', 'Fitzwilliam', 'Flanagan', 'Gable', 'Gallagher', 'Galloway', 'Garrison', 'Gatsby', 'Goodwin', 'Gresham', 'Grimshaw', 'Hale', 'Halloran', 'Hargrove', 'Hathaway', 'Hawthorne', 'Hayes', 'Hemlock', 'Huxley', 'Ingram', 'Jagger', 'Kavanagh', 'Keaton', 'Kensington', 'Kincaid', 'Kingsley', 'Lachlan', 'Landon', 'Langdon', 'Larkin', 'Lattimore', 'Leighton', 'Lennox', 'Llewellyn', 'Lockhart', 'Lovelace', 'Macaulay', 'Maddox', 'Mallory', 'McAllister', 'Montgomery', 'Morrigan', 'Mortimer', 'Murdock', 'Nightingale', 'Oakhurst', 'Ormsby', 'Pemberton', 'Pendleton', 'Penhaligon', 'Pettigrew', 'Pomeroy', 'Prescott', 'Quimby', 'Radcliffe', 'Rafferty', 'Ramsey', 'Redwood', 'Remington', 'Ridgeway', 'Rochford', 'Rutherford', 'Salinger', 'Salisbury', 'Sawyer', 'Schuyler', 'Sinclair', 'Slade', 'Somerset', 'Spencer', 'Stanton', 'Sterling', 'Sutton', 'Taggart', 'Talbot', 'Tate', 'Thackeray', 'Thorndike', 'Thorne', 'Tilton', 'Underwood', 'Vance', 'Wainwright', 'Wakefield', 'Walcott', 'Warrington', 'Wexford', 'Whittaker', 'Wickham', 'Winchester', 'Winthrop', 'Woodward', 'Wycliff', 'Yates', 'York'],
    professions: {
        tavern: ['Barkeep', 'Serving wench', 'Traveling bard', 'Retired soldier', 'Local drunk', 'Tavern cook'],
        market: ['Baker', 'Blacksmith', 'Merchant', 'Apprentice', 'Farmer', 'Weaver', 'Butcher'],
        store: ['Store owner', 'Traveling merchant', 'Supply clerk', 'Caravan guard', 'Wagon driver', 'Trading post manager'],
        mine: ['Former miner', 'Mine guard', 'Widow/widower', 'Safety inspector', 'Geologer', 'Mine cart operator'],
        mayor: ['Town clerk', 'Guard captain', 'Tax collector', 'Council member', 'Court scribe', 'Mayor'],
        // Additional profession sets for different industrial types
        coastal: ['Former fisherman', 'Dock worker', 'Ship builder', 'Lighthouse keeper', 'Harbor master', 'Sea captain'],
        farming: ['Mill worker', 'Grain inspector', 'Livestock handler', 'Farm equipment maker', 'Granary keeper', 'Agricultural overseer']
    },
    personalities: [
        'Friendly and outgoing', 'Suspicious and paranoid', 'Wise but melancholy', 'Hot-tempered but loyal',
        'Gossipy and talkative', 'Quiet and observant', 'Ambitious and scheming', 'Kind but worried',
        'Gruff exterior, soft heart', 'Nervous and fidgety', 'Proud and stubborn', 'Cheerful despite hardships',
        'Mysterious and evasive', 'Hardworking and practical', 'Dreamy and philosophical', 'Bitter about the past'
    ],
    ages: ['Young adult', 'Adult', 'Middle-aged', 'Elderly'],
    appearances: [
        'weathered hands from hard work', 'kind eyes that seem to see everything', 'nervous gestures when talking',
        'clothes that have seen better days', 'a ready smile despite troubles', 'scars from old accidents',
        'ink-stained fingers', 'flour dusted on their apron', 'suspicious glances toward the mine',
        'expensive clothes that stand out', 'calloused hands from manual labor', 'tired eyes that hold secrets'
    ]
};

// Core story elements that adapt to different town types
const storyElementsByTownType = {
    mining: {
        primaryTragedy: {
            type: 'confirmed',
            texts: [
                'The old mine was sealed five years ago after a cave-in killed three miners',
                'Three people died in the mine accident and it was deemed too dangerous to reopen',
                'The mine closure was officially due to safety concerns after the fatal accident'
            ]
        },
        mysteryRumors: {
            type: 'rumored',
            texts: [
                'Strange sounds were heard from the mine before the accident',
                'Some say the mine accident wasn\'t really an accident',
                'Locals claim to still hear sounds from the sealed mine at night',
                'The mine held more than just ore - there were discoveries the town wants hidden'
            ]
        },
        economicImpact: {
            type: 'confirmed',
            texts: [
                'Trade has decreased significantly since the mine closure',
                'The mine was the source of the town\'s former prosperity',
                'Business has been slow since fewer traders come through town',
                'Many families have struggled financially since the mine closed'
            ]
        }
    },
    trading: {
        primaryTragedy: {
            type: 'confirmed',
            texts: [
                'The main trade route was blocked by bandits five years ago',
                'A plague wiped out a merchant caravan, causing trade routes to shift',
                'The river changed course, making the docks unusable for large ships'
            ]
        },
        mysteryRumors: {
            type: 'rumored',
            texts: [
                'The merchant guild is hiding the real reason trade has declined',
                'Strange ships have been seen on the river at night',
                'Some say the rival trading post is using underhanded tactics',
                'There are whispers of a secret trade war with neighboring regions'
            ]
        },
        economicImpact: {
            type: 'confirmed',
            texts: [
                'Many trading families have lost their livelihoods',
                'The market stalls are half empty compared to previous years',
                'Prices have increased due to reduced supply chains',
                'Young people are leaving to find opportunities in other cities'
            ]
        }
    },
    farming: {
        primaryTragedy: {
            type: 'confirmed',
            texts: [
                'Three seasons of crop failures have devastated the community',
                'A disease killed most of the livestock two years ago',
                'The great storm destroyed the communal grain stores'
            ]
        },
        mysteryRumors: {
            type: 'rumored',
            texts: [
                'The soil has been cursed by something buried beneath the fields',
                'Strange weather patterns aren\'t natural - someone is causing them',
                'The old hermit knows secrets about restoring the land\'s fertility',
                'There are ancient standing stones that control the seasons'
            ]
        },
        economicImpact: {
            type: 'confirmed',
            texts: [
                'Many farming families have had to sell their land',
                'The harvest festivals haven\'t been held in three years',
                'Food has to be imported from distant regions at great cost',
                'The younger generation is abandoning farming for other trades'
            ]
        }
    },
    coastal: {
        primaryTragedy: {
            type: 'confirmed',
            texts: [
                'A great storm destroyed the fishing fleet five years ago',
                'The fish disappeared from the bay after the strange red tide',
                'Pirates attacked the harbor, burning the docks and many ships'
            ]
        },
        mysteryRumors: {
            type: 'rumored',
            texts: [
                'Sea monsters have been driving the fish away from the coast',
                'The lighthouse keeper disappeared on the night of the great storm',
                'Strange lights have been seen beneath the waves',
                'The old sea charts show islands that no longer exist'
            ]
        },
        economicImpact: {
            type: 'confirmed',
            texts: [
                'Most fishing families now work as laborers or farmers',
                'The shipbuilding trade has completely collapsed',
                'Trade with other coastal towns has been severely reduced',
                'Many experienced sailors have left to find work elsewhere'
            ]
        }
    }
};

// Universal story elements that work in any town
const universalStoryElements = {
    mayorSecrets: {
        type: 'rumored',
        texts: [
            'The mayor has been meeting with mysterious visitors from the capital',
            'The mayor is secretive about new economic plans for the town',
            'There are rumors the mayor is making deals that will change the town forever',
            'Some suspect the mayor knows more about the local troubles than they admit'
        ]
    },
    personalStories: {
        type: 'confirmed',
        texts: [
            'Several young people have been talking about leaving town lately',
            'Some residents are considering moving to better opportunities',
            'A few families are worried about their children\'s future here',
            'Local craftsmen are struggling to find steady work'
        ]
    },
    socialTension: {
        type: 'rumored',
        texts: [
            'There\'s growing tension between the old families and newcomers',
            'Some people blame outsiders for the town\'s recent problems',
            'The wealthy merchants seem unaffected by everyone else\'s struggles',
            'People whisper about old grudges and settling scores'
        ]
    }
};

// Generation Utility Functions
function randomChoice(array) {
    return array[Math.floor(Math.random() * array.length)];
}

function fillTemplate(template, replacements) {
    let result = template;
    Object.keys(replacements).forEach(key => {
        const regex = new RegExp(`{${key}}`, 'g');
        result = result.replace(regex, replacements[key]);
    });
    return result;
}

// Town Generation Functions
function generateTownName() {
    const townType = randomChoice(Object.keys(townGen.townTypes));
    const typeData = townGen.townTypes[townType];
    const adjective = randomChoice(typeData.adjectives);
    const suffix = randomChoice(typeData.suffixes);
    return {
        name: `${adjective}${suffix}`,
        type: townType,
        specialty: randomChoice(typeData.specialties),
        atmosphere: randomChoice(typeData.atmospheres)
    };
}

function generateLocationName(locationType) {
    const locationData = townGen.locationTypes[locationType];
    const template = randomChoice(locationData.names);
    const adjective = randomChoice(locationData.adjectives);
    const noun = randomChoice(locationData.nouns);
    const noun2 = locationData.nouns2 ? randomChoice(locationData.nouns2) : noun;
    
    return fillTemplate(template, {
        adjective: adjective,
        noun: noun,
        noun2: noun2
    });
}

function generateTownDescription(townInfo) {
    const baseDescriptions = {
        mining: `${townInfo.name} is ${townInfo.specialty.toLowerCase()}. ${townInfo.atmosphere}, the town shows signs of both prosperity and hardship.`,
        trading: `${townInfo.name} serves as ${townInfo.specialty.toLowerCase()}. ${townInfo.atmosphere}, with merchants and travelers constantly passing through.`,
        farming: `${townInfo.name} is ${townInfo.specialty.toLowerCase()}. ${townInfo.atmosphere}, the community works together through every season.`,
        coastal: `${townInfo.name} lies ${townInfo.specialty.toLowerCase()}. ${townInfo.atmosphere}, shaped by both sea and storm.`
    };
    
    return baseDescriptions[townInfo.type] || `${townInfo.name} is a unique settlement with its own character and challenges.`;
}

function generateInnPrice(townInfo) {
    // Base price influenced by town type and atmosphere
    const basePrices = {
        'mining': 4,      // Working class town - cheaper
        'farming': 3,     // Rural town - cheapest  
        'trading': 6,     // Commercial hub - more expensive
        'coastal': 5      // Port town - moderate
    };
    
    const basePrice = basePrices[townInfo.type] || 4;
    
    // Atmosphere modifier
    const atmosphereModifiers = {
        'bustling': 1.5,      // Popular places cost more
        'prosperous': 1.3,    
        'thriving': 1.4,
        'busy': 1.2,
        'struggling': 0.8,    // Hard times = cheaper
        'quiet': 0.9,
        'decline': 0.7,
        'abandoned': 0.6
    };
    
    let modifier = 1.0;
    // Check if atmosphere contains any of these key words
    const atmosphereLower = townInfo.atmosphere.toLowerCase();
    for (const [keyword, mod] of Object.entries(atmosphereModifiers)) {
        if (atmosphereLower.includes(keyword)) {
            modifier = mod;
            break;
        }
    }
    
    // Add some randomness (±1-2 gold)
    const randomVariation = Math.floor(Math.random() * 4) - 2; // -2 to +1
    
    // Calculate final price and ensure it's reasonable (2-10 gold)
    let finalPrice = Math.round(basePrice * modifier) + randomVariation;
    finalPrice = Math.max(2, Math.min(10, finalPrice));
    
    return finalPrice;
}

function generateCharacterName() {
    const gender = Math.random() < 0.5 ? 'male' : 'female';
    const firstName = randomChoice(characterGen.firstNames[gender]);
    const lastName = randomChoice(characterGen.lastNames);
    return `${firstName} ${lastName}`;
}

function generateCharacter(locationKey) {
    // Get appropriate professions for this location type
    const availableProfessions = characterGen.professions[locationKey] || characterGen.professions['tavern'];
    const profession = randomChoice(availableProfessions);
    const personality = randomChoice(characterGen.personalities);
    const age = randomChoice(characterGen.ages);
    const appearance = randomChoice(characterGen.appearances);
    
    // Generate relationships based on profession and location
    const relationships = generateRelationships(profession, locationKey);
    const secrets = generateSecrets(profession, locationKey);
    
    // Generate story preferences based on personality and profession
    const storyPreferences = generateStoryPreferences(personality, profession);
    
    return {
        profession,
        personality,
        age,
        relationships,
        secrets,
        appearance,
        storyPreferences
    };
}

function generateStoryPreferences(personality, profession) {
    const preferences = {
        themes: [],
        truthLevel: '',
        tone: '',
        bonusPreferences: []
    };
    
    // Theme preferences based on profession
    const professionThemes = {
        'Former miner': ['industrial', 'tragedy', 'mystery'],
        'Mine guard': ['industrial', 'authority', 'duty'],
        'Widow/widower': ['personal', 'tragedy', 'hope'],
        'Baker': ['market', 'community', 'family'],
        'Merchant': ['market', 'adventure', 'prosperity'],
        'Barkeep': ['tavern', 'gossip', 'social'],
        'Guard captain': ['government', 'justice', 'order'],
        'Mayor': ['government', 'prosperity', 'politics'],
        'Town clerk': ['government', 'truth', 'records'],
        'Former fisherman': ['industrial', 'sea', 'loss'],
        'Dock worker': ['industrial', 'hardship', 'community'],
        'Mill worker': ['industrial', 'agriculture', 'seasons']
    };
    
    // Truth level preferences based on personality
    const personalityTruth = {
        'Suspicious and paranoid': 'confirmed',
        'Wise but melancholy': 'rumored',
        'Gossipy and talkative': 'rumored',
        'Quiet and observant': 'confirmed',
        'Mysterious and evasive': 'rumored',
        'Hardworking and practical': 'confirmed',
        'Dreamy and philosophical': 'madeUp',
        'Bitter about the past': 'confirmed'
    };
    
    // Tone preferences based on personality
    const personalityTones = {
        'Friendly and outgoing': 'uplifting',
        'Hot-tempered but loyal': 'dramatic',
        'Kind but worried': 'hopeful',
        'Gruff exterior, soft heart': 'heartwarming',
        'Cheerful despite hardships': 'triumphant',
        'Proud and stubborn': 'heroic',
        'Nervous and fidgety': 'cautionary',
        'Ambitious and scheming': 'political'
    };
    
    // Set preferences
    preferences.themes = professionThemes[profession] || ['general', 'adventure', 'community'];
    preferences.truthLevel = personalityTruth[personality] || randomChoice(['confirmed', 'rumored', 'madeUp']);
    preferences.tone = personalityTones[personality] || randomChoice(['dramatic', 'hopeful', 'triumphant']);
    
    // Special bonus preferences
    if (profession.includes('Former')) {
        preferences.bonusPreferences.push('stories about redemption and new beginnings');
    }
    if (personality.includes('worried') || personality.includes('melancholy')) {
        preferences.bonusPreferences.push('stories that offer hope in dark times');
    }
    if (profession.includes('guard') || profession.includes('captain')) {
        preferences.bonusPreferences.push('stories about duty and justice');
    }
    
    return preferences;
}

function generateRelationships(profession, locationKey) {
    const relationshipOptions = {
        'Barkeep': ['Knows everyone in town', 'Married with children', 'Former soldier who settled down'],
        'Baker': ['Has grown children', 'Widow/widower', 'Supplies bread to other shops'],
        'Merchant': ['Has contacts in other towns', 'Travels frequently', 'Owes money to creditors'],
        'Former miner': ['Lost friends in the mine accident', 'Family depends on them', 'Avoided by some townspeople'],
        'Guard captain': ['Reports to the mayor', 'Respected by citizens', 'Leads the town guards'],
        'Town clerk': ['Works with the mayor', 'Knows official business', 'Friend to common folk'],
        'Mayor': ['Married to wealthy family', 'Has political connections', 'Tensions with council']
    };
    
    const baseRelationships = relationshipOptions[profession] || ['Has family in town', 'Known by locals', 'Part of the community'];
    return [...baseRelationships].slice(0, 2 + Math.floor(Math.random() * 2));
}

function generateSecrets(profession, locationKey) {
    const secretOptions = {
        'Barkeep': ['Keeps a journal of gossip', 'Waters down the ale', 'Has a gambling debt'],
        'Baker': ['Hides money in flour barrels', 'Knows about hidden recipes', 'Suspects their spouse cheated'],
        'Former miner': ['Knows what really happened in the mine', 'Has mining maps hidden away', 'Called in sick the day of accident'],
        'Guard captain': ['Has doubts about official stories', 'Received bribes from mayor', 'Fears losing their position'],
        'Town clerk': ['Has copies of destroyed documents', 'Knows about financial dealings', 'Secretly reports to higher authorities'],
        'Mayor': ['The mine closure wasn\'t about safety', 'Making deals with outside investors', 'Planning to abandon the town'],
        'Former fisherman': ['Knows where the fish really went', 'Has charts of dangerous waters', 'Witnessed something the night of the storm'],
        'Dock worker': ['Knows about smuggling operations', 'Saw ships that weren\'t supposed to be there', 'Has evidence of harbor corruption'],
        'Ship builder': ['Built boats with hidden compartments', 'Knows which ships were sabotaged', 'Has plans for vessels never completed'],
        'Mill worker': ['Knows why the grain really spoiled', 'Has evidence of contamination', 'Discovered something buried in the fields'],
        'Grain inspector': ['Falsified inspection reports', 'Knows about deliberate crop sabotage', 'Has records of missing shipments'],
        'Agricultural overseer': ['Knows about the cursed soil', 'Has maps of the old burial grounds', 'Discovered ancient artifacts while plowing']
    };
    
    const baseSecrets = secretOptions[profession] || ['Has a hidden past', 'Knows more than they say', 'Plotting to leave town'];
    return [randomChoice(baseSecrets)];
}

function generateDialogue(character, info) {
    const dialoguePatterns = {
        'Barkeep': [`Welcome to my tavern! I've been pouring drinks here for years.`, `What brings you to our humble establishment?`, `I hear all the town's news from behind this bar.`],
        'Baker': [`Fresh bread, still warm from the oven!`, `I've been baking for this town for ages.`, `Times have been hard since... well, you know.`],
        'Merchant': [`Business isn't what it used to be around here.`, `I've traveled to many towns, but this one...`, `The trade routes just aren't the same anymore.`],
        'Former miner': [`*takes a long drink* That mine... it changed everything.`, `I used to work those tunnels every day.`, `Some things are better left buried.`],
        'Guard captain': [`Everything's under control here, citizen.`, `The mayor's orders are clear on this matter.`, `I maintain the peace in this town.`],
        'Town clerk': [`*whispers* I see all the official business that goes through here.`, `The paperwork tells a different story sometimes.`, `There are things the people should know about.`],
        'Mayor': [`We're working on great opportunities for our town.`, `The future holds promise for our community.`, `Sometimes difficult decisions must be made for the greater good.`]
    };
    
    const patterns = dialoguePatterns[character.profession] || [`Hello there, traveler.`, `What can I do for you?`, `Times are changing around here.`];
    return randomChoice(patterns);
}

function distributeStoryElements(townType) {
    const allElements = [];
    
    // Get town-specific story elements
    const townSpecificStories = storyElementsByTownType[townType] || {};
    const townStoryCategories = Object.keys(townSpecificStories);
    
    // Add town-specific elements (ensure at least one from each category)
    townStoryCategories.forEach(categoryKey => {
        const category = townSpecificStories[categoryKey];
        const randomText = randomChoice(category.texts);
        allElements.push({
            text: randomText,
            type: category.type
        });
    });
    
    // Add universal elements
    const universalCategories = Object.keys(universalStoryElements);
    universalCategories.forEach(categoryKey => {
        const category = universalStoryElements[categoryKey];
        const randomText = randomChoice(category.texts);
        allElements.push({
            text: randomText,
            type: category.type
        });
    });
    
    // Add more random elements to fill out the roster
    while (allElements.length < 12) { // Ensure we have enough for all possible NPCs
        // Mix of town-specific and universal elements
        const useUniversal = Math.random() < 0.4;
        
        if (useUniversal || townStoryCategories.length === 0) {
            const randomCategory = randomChoice(universalCategories);
            const category = universalStoryElements[randomCategory];
            const randomText = randomChoice(category.texts);
            allElements.push({
                text: randomText,
                type: category.type
            });
        } else {
            const randomCategory = randomChoice(townStoryCategories);
            const category = townSpecificStories[randomCategory];
            const randomText = randomChoice(category.texts);
            allElements.push({
                text: randomText,
                type: category.type
            });
        }
    }
    
    // Shuffle the elements
    for (let i = allElements.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [allElements[i], allElements[j]] = [allElements[j], allElements[i]];
    }
    
    return allElements;
}

function generateLocations() {
    // Generate random town information
    const townInfo = generateTownName();
    const storyElements = distributeStoryElements(townInfo.type);
    let elementIndex = 0;
    
    // Map town types to their primary industrial location type
    const townTypeToIndustry = {
        mining: 'industrial',
        trading: 'market',
        farming: 'industrial', // Could be mills, granaries, etc.
        coastal: 'industrial'   // Could be docks, shipyards, etc.
    };
    
    const industryType = townTypeToIndustry[townInfo.type] || 'industrial';
    
    // Generate location names based on town type
    const locationData = {
        tavern: {
            name: `🍺 ${generateLocationName('tavern')}`,
            description: `The tavern is ${townInfo.atmosphere.toLowerCase()}, filled with locals sharing stories over drinks. The atmosphere reflects the town's current mood.`,
            npcs: []
        },
        market: {
            name: `🏪 ${generateLocationName('market')}`,
            description: `The market shows the town's commercial heart. ${townInfo.atmosphere}, vendors display what goods they can manage to stock.`,
            npcs: []
        },
        store: {
            name: `🛒 ${generateLocationName('store')}`,
            description: `A well-stocked trading post that caters to travelers and locals alike. Here you can purchase provisions, hire protection, and prepare for journeys between towns.`,
            npcs: [],
            isStore: true // Flag to identify this as a store location
        },
        industrial: {
            name: `⚒️ ${generateLocationName('industrial')}`,
            description: getIndustrialDescription(townInfo),
            npcs: []
        },
        government: {
            name: `🏛️ ${generateLocationName('government')}`,
            description: `The seat of local government reflects the town's political situation. Official documents and notices hint at the challenges facing ${townInfo.name}.`,
            npcs: []
        }
    };
    
    // Generate NPCs for each location
    Object.keys(locationData).forEach(locationKey => {
        const actualKey = locationKey === 'industrial' ? getIndustrialMappingKey(townInfo.type) : 
                           locationKey === 'government' ? 'mayor' : locationKey;
        const numNPCs = 2 + Math.floor(Math.random() * 2); // 2-3 NPCs per location
        
        for (let i = 0; i < numNPCs; i++) {
            const name = generateCharacterName();
            const character = generateCharacter(actualKey);
            
            // Assign a story element if available
            const hasStoryElement = elementIndex < storyElements.length;
            const info = hasStoryElement ? {
                text: storyElements[elementIndex].text,
                type: storyElements[elementIndex].type,
                source: name
            } : {
                text: `${name} shares local gossip and personal observations about ${townInfo.name}`,
                type: 'confirmed',
                source: name
            };
            
            if (hasStoryElement) elementIndex++;
            
            const dialogue = generateDialogue(character, info);
            
            locationData[locationKey].npcs.push({
                name,
                dialogue,
                character,
                info
            });
        }
    });
    
    // Store town info for use elsewhere
    locationData.townInfo = townInfo;
    
    // Generate inn price for this town
    gameState.innCostPerNight = generateInnPrice(townInfo);
    
    return locationData;
}

function getIndustrialDescription(townInfo) {
    const descriptions = {
        mining: `The old mining operations stand as a testament to both ${townInfo.name}'s former glory and current struggles. ${townInfo.atmosphere}, the area holds memories of busier times.`,
        trading: `The main commercial hub shows signs of ${townInfo.name}'s trading heritage. ${townInfo.atmosphere}, with evidence of the town's economic challenges.`,
        farming: `The agricultural center of ${townInfo.name} reflects the community's relationship with the land. ${townInfo.atmosphere}, showing the effects of recent hardships.`,
        coastal: `The maritime facilities tell the story of ${townInfo.name}'s connection to the sea. ${townInfo.atmosphere}, bearing the marks of storms both literal and economic.`
    };
    
    return descriptions[townInfo.type] || `The industrial heart of ${townInfo.name} shows signs of both prosperity and struggle.`;
}

function getIndustrialMappingKey(townType) {
    // Map town types to character generation keys
    const mapping = {
        mining: 'mine',
        trading: 'market', 
        farming: 'farming',
        coastal: 'coastal'
    };
    
    return mapping[townType] || 'mine';
}

// Generate locations with random characters at game start
let locations = {};

// Story Templates
const storyTemplates = {
    act1: {
        industrial: {
            confirmed: "In the heart of industry, where hardworking people once built prosperity...",
            rumored: "In the abandoned workplaces, where mysterious events preceded disaster...",
            madeUp: "In the mystical ruins, where ancient powers still linger..."
        },
        market: {
            confirmed: "In the bustling market square, where merchants struggle with economic hardship...",
            rumored: "In the market square, where whispers speak of a town on the verge of transformation...",
            madeUp: "In the enchanted marketplace, where magical goods are traded under the light of the moon..."
        },
        tavern: {
            confirmed: "In the tavern where all the town's secrets are shared over ale and hardship...",
            rumored: "In the tavern where ghostly voices and strange tales echo through the night...",
            madeUp: "In the mystical tavern, where the spirits of ancient bards gather to share forgotten tales..."
        },
        government: {
            confirmed: "In the halls of power, where leaders make decisions that shape the community's future...",
            rumored: "In the government offices, where secret meetings and hidden agendas lurk behind closed doors...",
            madeUp: "In the grand palace, where noble lords plot and scheme in chambers of marble and gold..."
        }
    },
    act2: {
        adventure: {
            confirmed: "Inspired by tales of former prosperity, [PROTAGONIST] ventures forth to change their fate...",
            rumored: "Driven by whispers from [SUPPORTING_CHAR], [PROTAGONIST] dares to investigate the mysteries surrounding them...",
            madeUp: "[PROTAGONIST] emerges as a hero blessed with magical powers to overcome any obstacle..."
        },
        discovery: {
            confirmed: "Through careful investigation, [PROTAGONIST] and [SUPPORTING_CHAR] work together as the truth slowly reveals itself...",
            rumored: "Following rumors and signs, [PROTAGONIST] makes a discovery that could change everything...",
            madeUp: "In a burst of magical revelation, [PROTAGONIST] unveils ancient secrets in spectacular fashion..."
        },
        conflict: {
            confirmed: "[PROTAGONIST] faces real opposition as [ANTAGONIST] and the established order resist change...",
            rumored: "Dark forces led by [ANTAGONIST] seem to conspire against [PROTAGONIST] who seeks the truth...",
            madeUp: "Epic battles rage as [PROTAGONIST] fights the dark forces commanded by [ANTAGONIST]..."
        }
    },
    act3: {
        triumph: {
            confirmed: "Through persistence and courage, [PROTAGONIST] solves the problem and [TOWN_NAME] prospers once more...",
            rumored: "[PROTAGONIST] solves the mystery, though new questions remain that [SUPPORTING_CHAR] will ponder for years to come...",
            madeUp: "[PROTAGONIST] triumphs over the evil [ANTAGONIST], and [TOWN_NAME] is saved by the power of true heroism..."
        },
        tragedy: {
            confirmed: "Despite [PROTAGONIST]'s good intentions, the harsh realities of life in [TOWN_NAME] prevail...",
            rumored: "The truth remains elusive to [PROTAGONIST], leaving [SUPPORTING_CHAR] and others to wonder what really happened...",
            madeUp: "In a twist of fate, [PROTAGONIST]'s greatest strength becomes their ultimate weakness against [ANTAGONIST]..."
        },
        change: {
            confirmed: "[PROTAGONIST] helps [TOWN_NAME] adapt to new circumstances, finding strength in unity and hard work...",
            rumored: "[PROTAGONIST] brings change to [TOWN_NAME], though whether for better or worse remains to be seen by [SUPPORTING_CHAR]...",
            madeUp: "[PROTAGONIST]'s actions shift the very fabric of reality, transforming [TOWN_NAME] in wondrous ways..."
        }
    }
};

// Initialize Game
function initGame() {
    // Generate retirement goal first so welcome screen shows correct amount
    generateRetirementGoal();
    
    // Generate random characters for this playthrough
    locations = generateLocations();
    
    // Debug: Check if locations were generated properly
    if (!locations || Object.keys(locations).length === 0) {
        console.error('Failed to generate locations');
        return;
    }
    
    updateUI();
    
    // Show welcome screen on first load
    showWelcomeScreen();
}

function generateRetirementGoal() {
    // Adjusted for rebalanced economy - target 6-12 successful performances
    // With new income levels (200-500+ per night), this is very achievable
    gameState.retirementGoal = Math.floor(Math.random() * 2001) + 2000; // 2,000-4,000 gold
    
    // Update all retirement goal displays
    const footerGoalElement = document.getElementById('footer-retirement-goal');
    if (footerGoalElement) {
        footerGoalElement.textContent = gameState.retirementGoal.toLocaleString();
    }
    
    const welcomeGoalElement = document.getElementById('welcome-retirement-goal');
    if (welcomeGoalElement) {
        welcomeGoalElement.textContent = gameState.retirementGoal.toLocaleString();
    }
}

function updateInnCostDisplay() {
    const innCostElement = document.getElementById('inn-cost');
    if (innCostElement) {
        innCostElement.textContent = gameState.innCostPerNight;
    }
}

function updateUI() {
    document.getElementById('gold').textContent = gameState.gold;
    const healthElement = document.getElementById('health');
    healthElement.textContent = gameState.health;
    
    // Add health warning colors
    if (gameState.health <= 20) {
        healthElement.style.color = '#dc143c';
        healthElement.style.fontWeight = 'bold';
    } else if (gameState.health <= 50) {
        healthElement.style.color = '#ffa500';
        healthElement.style.fontWeight = 'bold';
    } else {
        healthElement.style.color = '#32cd32';
        healthElement.style.fontWeight = 'normal';
    }
    document.getElementById('reputation').textContent = gameState.reputation;
    document.getElementById('day').textContent = gameState.day;
    document.getElementById('town-number').textContent = gameState.townNumber;
    
    // Update supplies count
    const totalSupplies = Object.values(gameState.inventory).reduce((sum, qty) => sum + qty, 0);
    document.getElementById('supplies-count').textContent = totalSupplies;
    
    // Update inn cost display
    updateInnCostDisplay();
    
    // Check for being chased out of town
    checkForBanishment();
    
    // Update town information if available
    if (locations.townInfo) {
        updateTownDisplay(locations.townInfo);
    }
    
    const conversationsRemaining = gameState.maxConversationsPerDay - gameState.conversationsUsed;
    document.getElementById('conversations').textContent = `${conversationsRemaining}/${gameState.maxConversationsPerDay}`;
    
    // Update information list
    const infoList = document.getElementById('information-list');
    infoList.innerHTML = '';
    
    // Show known characters (persistent)
    const knownCharactersList = Object.values(gameState.knownCharacters);
    if (knownCharactersList.length > 0) {
        infoList.innerHTML += '<h4 style="color: #daa520; margin-bottom: 10px;">🧑 Known Characters:</h4>';
        knownCharactersList.forEach(character => {
            const charDiv = document.createElement('div');
            charDiv.className = 'info-item character-knowledge';
            charDiv.style.borderLeft = '4px solid #6495ed';
            charDiv.innerHTML = `
                <div><strong>${character.name}</strong> - ${character.character.profession}</div>
                <div style="font-size: 0.9em; color: #ccc;">
                    ${character.character.personality} | 
                    Relationship: ${character.relationshipLevel} | 
                    ${character.knownInfo.length} facts learned
                </div>
            `;
            infoList.appendChild(charDiv);
        });
        infoList.innerHTML += '<br>';
    }
    
    // Show today's gathered information
    if (gameState.gatheredInfo.length === 0) {
        infoList.innerHTML += '<p style="color: #ccc; font-style: italic;">No new information gathered today. Visit locations to learn more about the town.</p>';
    } else {
        infoList.innerHTML += '<h4 style="color: #daa520; margin-bottom: 10px;">📰 Today\'s Information:</h4>';
        gameState.gatheredInfo.forEach(info => {
            const infoDiv = document.createElement('div');
            infoDiv.className = `info-item ${info.type}`;
            infoDiv.innerHTML = `
                <div>${info.text}</div>
                <div class="info-source">Source: ${info.source} (${info.type.toUpperCase()})</div>
            `;
            infoList.appendChild(infoDiv);
        });
    }
    
    // Enable evening button if enough info gathered (or no conversations left)
    const eveningBtn = document.getElementById('evening-btn');
    const hasEnoughInfo = gameState.gatheredInfo.length >= 3;
    const noConversationsLeft = gameState.conversationsUsed >= gameState.maxConversationsPerDay;
    
    eveningBtn.disabled = !(hasEnoughInfo || noConversationsLeft);
    
    // Update button text based on situation
    if (hasEnoughInfo) {
        eveningBtn.innerHTML = '🌙 Prepare for Evening Performance';
    } else if (noConversationsLeft) {
        eveningBtn.innerHTML = '🌙 No More Conversations - Prepare for Evening';
    } else {
        const needed = 3 - gameState.gatheredInfo.length;
        eveningBtn.innerHTML = `🌙 Need ${needed} more conversation${needed > 1 ? 's' : ''}`;
    }
}

function updateTownDisplay(townInfo) {
    // Update town name
    const townNameElement = document.getElementById('town-name');
    if (townNameElement) {
        townNameElement.textContent = townInfo.name;
    }
    
    // Update town description
    const townDescElement = document.getElementById('town-description');
    if (townDescElement) {
        townDescElement.textContent = generateTownDescription(townInfo);
    }
    
    // Update locations display
    updateLocationsDisplay();
}

function updateLocationsDisplay() {
    const container = document.getElementById('locations-container');
    if (!container || !locations) return;
    
    container.innerHTML = '';
    
    // Create location elements for each generated location
    Object.keys(locations).forEach(locationKey => {
        if (locationKey === 'townInfo') return; // Skip town info
        
        const location = locations[locationKey];
        const locationDiv = document.createElement('div');
        locationDiv.className = 'location';
        locationDiv.onclick = () => visitLocation(locationKey);
        
        // Get a shorter description for the location card
        const shortDescription = getShortLocationDescription(location, locationKey);
        
        locationDiv.innerHTML = `
            <h4>${location.name}</h4>
            <p>${shortDescription}</p>
        `;
        
        container.appendChild(locationDiv);
    });
}

function getShortLocationDescription(location, locationKey) {
    const shortDescriptions = {
        tavern: 'The local gathering place where stories and secrets are shared over drinks',
        market: 'Bustling with traders, vendors, and the commerce that keeps the town alive',
        store: 'A trading post where travelers can buy provisions, hire guards, and prepare for journeys',
        industrial: 'The heart of the town\'s industry, now bearing the marks of recent troubles',
        government: 'The seat of local government where important decisions are made'
    };
    
    return shortDescriptions[locationKey] || 'A notable location in the town';
}

function visitLocation(locationKey) {
    const location = locations[locationKey];
    const modal = document.getElementById('location-modal');
    const title = document.getElementById('location-title');
    const content = document.getElementById('location-content');
    
    title.textContent = location.name;
    
    let contentHTML = `<p>${location.description}</p><br>`;
    
    // Handle store differently
    if (location.isStore) {
        // Show store interface
        contentHTML += generateStoreInterface();
    } else {
        // Show conversation status
        const conversationsRemaining = gameState.maxConversationsPerDay - gameState.conversationsUsed;
        contentHTML += `<p style="color: #daa520; font-weight: bold;">💬 Conversations remaining today: ${conversationsRemaining}/${gameState.maxConversationsPerDay}</p><br>`;
        
        // Check if already visited
        if (gameState.visitedLocations.includes(locationKey)) {
            contentHTML += '<p style="color: #ffa500; font-style: italic;">You\'ve already visited this location today, but you can still explore...</p><br>';
        }
        
        contentHTML += '<h4>People you can talk to:</h4>';
        
        location.npcs.forEach((npc, index) => {
            const alreadyTalked = gameState.talkedToToday.includes(npc.name);
            const conversationsRemaining = gameState.maxConversationsPerDay - gameState.conversationsUsed;
            const canTalk = !alreadyTalked && conversationsRemaining > 0;
            
            contentHTML += `
                <div class="npc-option" style="margin: 10px 0; padding: 10px; background: rgba(139, 69, 19, 0.3); border-radius: 5px;">
                    <strong>${npc.name}</strong>
                    <p style="margin: 5px 0; font-style: italic;">"${npc.dialogue}"</p>
                    ${alreadyTalked ? 
                        '<p style="color: #32cd32;">✓ Already spoke with them today</p>' : 
                        (conversationsRemaining === 0 ? 
                            '<p style="color: #dc143c;">✗ No conversations remaining today</p>' :
                            `<button onclick="talkToNPC('${locationKey}', ${index})" style="margin-top: 5px;">Talk to ${npc.name}</button>`
                        )
                    }
                </div>
            `;
        });
    }
    
    content.innerHTML = contentHTML;
    modal.classList.remove('hidden');
}

function refreshLocationModal(locationKey) {
    const location = locations[locationKey];
    const content = document.getElementById('location-content');
    
    let contentHTML = `<p>${location.description}</p><br>`;
    
    // Show conversation status
    const conversationsRemaining = gameState.maxConversationsPerDay - gameState.conversationsUsed;
    contentHTML += `<p style="color: #daa520; font-weight: bold;">💬 Conversations remaining today: ${conversationsRemaining}/${gameState.maxConversationsPerDay}</p><br>`;
    
    // Check if already visited
    if (gameState.visitedLocations.includes(locationKey)) {
        contentHTML += '<p style="color: #ffa500; font-style: italic;">You\'ve already visited this location today, but you can still explore...</p><br>';
    }
    
    contentHTML += '<h4>People you can talk to:</h4>';
    
    location.npcs.forEach((npc, index) => {
        const alreadyTalked = gameState.talkedToToday.includes(npc.name);
        const conversationsRemaining = gameState.maxConversationsPerDay - gameState.conversationsUsed;
        const canTalk = !alreadyTalked && conversationsRemaining > 0;
        
        contentHTML += `
            <div class="npc-option" style="margin: 10px 0; padding: 10px; background: rgba(139, 69, 19, 0.3); border-radius: 5px;">
                <strong>${npc.name}</strong>
                <p style="margin: 5px 0; font-style: italic;">"${npc.dialogue}"</p>
                ${alreadyTalked ? 
                    '<p style="color: #32cd32;">✓ Already spoke with them today</p>' : 
                    (conversationsRemaining === 0 ? 
                        '<p style="color: #dc143c;">✗ No conversations remaining today</p>' :
                        `<button onclick="talkToNPC('${locationKey}', ${index})" style="margin-top: 5px;">Talk to ${npc.name}</button>`
                    )
                }
            </div>
        `;
    });
    
    // Replace only the main content, preserving any feedback messages that were added
    const feedbackMessages = content.querySelectorAll('div[style*="rgba(34, 139, 34, 0.3)"]');
    content.innerHTML = contentHTML;
    
    // Re-add any feedback messages
    feedbackMessages.forEach(message => {
        content.appendChild(message);
    });
}

function talkToNPC(locationKey, npcIndex) {
    const location = locations[locationKey];
    const npc = location.npcs[npcIndex];
    
    // Check if we can still talk (shouldn't happen due to UI, but safety check)
    if (gameState.conversationsUsed >= gameState.maxConversationsPerDay || gameState.talkedToToday.includes(npc.name)) {
        return;
    }
    
    // Add info to gathered information (daily)
    gameState.gatheredInfo.push(npc.info);
    
    // Add character to persistent knowledge base
    if (!gameState.knownCharacters[npc.name]) {
        gameState.knownCharacters[npc.name] = {
            name: npc.name,
            location: locationKey,
            firstMet: gameState.day,
            conversationsHad: 0,
            character: npc.character ? { ...npc.character } : { profession: 'Unknown', personality: 'Unknown', storyPreferences: { themes: [], truthLevel: 'confirmed', tone: 'neutral', bonusPreferences: [] } }, // Deep copy character info with fallback
            knownInfo: [],
            relationshipLevel: 'acquaintance' // acquaintance -> friend -> confidant
        };
    }
    
    // Update character knowledge
    const character = gameState.knownCharacters[npc.name];
    character.conversationsHad++;
    character.lastSeen = gameState.day;
    
    // Add this conversation's info to their known info
    character.knownInfo.push({
        info: npc.info,
        learnedOn: gameState.day
    });
    
    // Improve relationship based on conversations
    if (character.conversationsHad >= 3 && character.relationshipLevel === 'acquaintance') {
        character.relationshipLevel = 'friend';
    } else if (character.conversationsHad >= 5 && character.relationshipLevel === 'friend') {
        character.relationshipLevel = 'confidant';
    }
    
    // Track that we've talked to this NPC today
    gameState.talkedToToday.push(npc.name);
    
    // Increment conversations used
    gameState.conversationsUsed++;
    
    // Mark location as visited
    if (!gameState.visitedLocations.includes(locationKey)) {
        gameState.visitedLocations.push(locationKey);
    }
    
    // Update UI
    updateUI();
    
    // Refresh the modal content to show updated conversation counts and NPC availability
    refreshLocationModal(locationKey);
    
    // Show conversation results in popup modal
    showConversationResults(npc, character);
}

function showConversationResults(npc, character) {
    const modal = document.getElementById('conversation-modal');
    const results = document.getElementById('conversation-results');
    
    const relationshipText = character.relationshipLevel === 'acquaintance' ? 
        'You are getting to know them' : 
        character.relationshipLevel === 'friend' ? 
            'They seem to trust you more' : 'They consider you a close confidant';
    
    // Determine relationship improvement message
    let relationshipChange = '';
    if (character.conversationsHad === 3 && character.relationshipLevel === 'friend') {
        relationshipChange = '<div style="color: #32cd32; font-weight: bold; margin-top: 10px;">🎉 You\'ve become friends!</div>';
    } else if (character.conversationsHad === 5 && character.relationshipLevel === 'confidant') {
        relationshipChange = '<div style="color: #daa520; font-weight: bold; margin-top: 10px;">⭐ They now consider you a close confidant!</div>';
    }
    
    // Get information quality indicator
    const infoQualityColor = {
        'confirmed': '#32cd32',
        'rumored': '#ffa500', 
        'madeUp': '#dc143c'
    };
    
    const infoQualityText = {
        'confirmed': 'VERIFIED FACT',
        'rumored': 'UNCONFIRMED RUMOR',
        'madeUp': 'PURE FICTION'
    };
    
    const conversationsRemaining = gameState.maxConversationsPerDay - gameState.conversationsUsed;
    
    results.innerHTML = `
        <div style="text-align: center; margin-bottom: 20px;">
            <div style="background: rgba(139, 69, 19, 0.3); border-radius: 10px; padding: 20px; margin-bottom: 15px;">
                <h3 style="color: #daa520; margin-bottom: 15px;">📖 You spoke with ${npc.name}</h3>
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                    <div style="text-align: left;">
                        <strong>Profession:</strong> ${npc.character.profession}<br>
                        <strong>Personality:</strong> ${npc.character.personality}
                    </div>
                    <div style="text-align: right; color: #daa520;">
                        <strong>Relationship:</strong><br>
                        ${character.relationshipLevel} (${character.conversationsHad} conversations)
                    </div>
                </div>
                <div style="text-align: center;">
                    ${relationshipText}
                    ${relationshipChange}
                </div>
            </div>
            
            <div style="background: rgba(34, 139, 34, 0.2); border-radius: 10px; padding: 20px; border-left: 4px solid ${infoQualityColor[npc.info.type]};">
                <h4 style="color: #daa520; margin-bottom: 10px;">📰 Information Gained:</h4>
                <div style="font-size: 1.1em; margin-bottom: 10px; font-style: italic;">
                    "${npc.info.text}"
                </div>
                <div style="color: ${infoQualityColor[npc.info.type]}; font-weight: bold;">
                    Quality: ${infoQualityText[npc.info.type]}
                </div>
            </div>
            
            <div style="margin-top: 15px; padding: 10px; background: rgba(255, 165, 0, 0.1); border-radius: 5px;">
                💬 <strong>Conversations remaining today:</strong> ${conversationsRemaining}/${gameState.maxConversationsPerDay}
            </div>
        </div>
    `;
    
    // Update the evening button state in the modal
    const eveningBtn = document.getElementById('conversation-evening-btn');
    const hasEnoughInfo = gameState.gatheredInfo.length >= 3;
    const noConversationsLeft = gameState.conversationsUsed >= gameState.maxConversationsPerDay;
    
    eveningBtn.disabled = !(hasEnoughInfo || noConversationsLeft);
    
    if (hasEnoughInfo) {
        eveningBtn.innerHTML = '🌙 Ready for Evening';
        eveningBtn.style.background = 'linear-gradient(45deg, #4a4a4a 0%, #654321 100%)';
    } else if (noConversationsLeft) {
        eveningBtn.innerHTML = '🌙 No More Conversations - Start Evening';
        eveningBtn.style.background = 'linear-gradient(45deg, #4a4a4a 0%, #654321 100%)';
    } else {
        const needed = 3 - gameState.gatheredInfo.length;
        eveningBtn.innerHTML = `🌙 Need ${needed} more conversation${needed > 1 ? 's' : ''}`;
        eveningBtn.style.background = '#666';
    }
    
    modal.classList.remove('hidden');
}

function closeConversationModal() {
    document.getElementById('conversation-modal').classList.add('hidden');
}

function closeAllModalsAndStartEvening() {
    document.getElementById('conversation-modal').classList.add('hidden');
    document.getElementById('location-modal').classList.add('hidden');
    startEvening();
}

function closeModal() {
    document.getElementById('location-modal').classList.add('hidden');
}

function startEvening() {
    document.getElementById('day-phase').classList.add('hidden');
    document.getElementById('evening-phase').classList.remove('hidden');
    gameState.currentPhase = 'evening';
    
    // Generate tonight's audience from known characters
    gameState.eveningAudience = generateEveningAudience();
    
    generateStoryChoices();
    displayAudience();
}

function generateEveningAudience() {
    const knownCharacters = gameState.knownCharacters ? Object.values(gameState.knownCharacters) : [];
    const audience = [];
    
    // Always have some random tavern patrons (3-5 people minimum)
    const minAudience = 3 + Math.floor(Math.random() * 3);
    
    // Each known character has a chance to show up based on their relationship with you
    knownCharacters.forEach(character => {
        const relationshipChance = {
            'acquaintance': 0.3,
            'friend': 0.6,
            'confidant': 0.8
        };
        
        const chance = relationshipChance[character.relationshipLevel] || 0.3;
        
        // Barkeeps are more likely to be there (it's their tavern!)
        const professionBonus = character.character.profession.toLowerCase().includes('barkeep') ? 0.4 : 0;
        
        if (Math.random() < (chance + professionBonus)) {
            audience.push({
                ...character,
                mood: generateAudienceMood(character)
            });
        }
    });
    
    // Fill out audience with unnamed patrons if needed
    while (audience.length < minAudience) {
                    const unnamedPatronPersonality = randomChoice(characterGen.personalities);
            audience.push({
                name: 'Unnamed Patron',
                character: {
                    profession: 'Local resident',
                    personality: unnamedPatronPersonality,
                    storyPreferences: generateStoryPreferences(unnamedPatronPersonality, 'Local resident')
                },
                mood: 'neutral',
                relationshipLevel: 'stranger'
            });
    }
    
    // Limit audience size to prevent overcrowding
    return audience.slice(0, 8);
}

function generateAudienceMood(character) {
    // Mood affects how receptive they are to stories
    const baseMoods = ['enthusiastic', 'attentive', 'neutral', 'distracted', 'skeptical'];
    let moodWeights = [0.2, 0.3, 0.3, 0.15, 0.05]; // Default weights
    
    // Adjust based on relationship
    if (character.relationshipLevel === 'friend') {
        moodWeights = [0.3, 0.4, 0.2, 0.1, 0.0]; // More positive
    } else if (character.relationshipLevel === 'confidant') {
        moodWeights = [0.4, 0.4, 0.2, 0.0, 0.0]; // Very positive
    }
    
    // Adjust based on personality
    if (character.character.personality.includes('Friendly') || character.character.personality.includes('Cheerful')) {
        moodWeights[0] += 0.1; // More enthusiastic
        moodWeights[4] -= 0.1; // Less skeptical
    }
    
    if (character.character.personality.includes('Suspicious') || character.character.personality.includes('Bitter')) {
        moodWeights[4] += 0.1; // More skeptical
        moodWeights[0] -= 0.1; // Less enthusiastic
    }
    
    // Weighted random selection
    const random = Math.random();
    let cumulative = 0;
    for (let i = 0; i < baseMoods.length; i++) {
        cumulative += Math.max(0, moodWeights[i]);
        if (random <= cumulative) {
            return baseMoods[i];
        }
    }
    
    return 'neutral';
}

function displayAudience() {
    const audienceContainer = document.getElementById('audience-preview');
    if (!audienceContainer || !gameState.eveningAudience) return;
    
    audienceContainer.innerHTML = '<h3>Tonight\'s Audience:</h3>';
    
    gameState.eveningAudience.forEach(audienceMember => {
        const memberDiv = document.createElement('div');
        memberDiv.className = 'audience-member';
        
        // Only show preferences for characters the player knows
        let preferenceText;
        if (audienceMember.relationshipLevel === 'stranger') {
            preferenceText = '<span style="color: #999; font-style: italic;">Story preferences unknown</span>';
        } else {
            const preferences = audienceMember.character.storyPreferences;
            preferenceText = preferences ? 
                `<span style="color: #daa520;">Prefers: ${preferences.truthLevel} stories, ${preferences.tone} tone</span>` : 
                'Unknown preferences';
        }
        
        // Show less detail for strangers
        const personalityDisplay = audienceMember.relationshipLevel === 'stranger' ? 
            'Unknown personality' : audienceMember.character.personality;
            
        memberDiv.innerHTML = `
            <div class="audience-member-info">
                <strong>${audienceMember.name}</strong> (${audienceMember.mood})
                <div class="audience-member-details">
                    ${audienceMember.character.profession} - ${personalityDisplay}
                </div>
                <div class="audience-preferences">${preferenceText}</div>
                ${audienceMember.relationshipLevel !== 'stranger' ? 
                    `<div class="relationship">Relationship: ${audienceMember.relationshipLevel}</div>` : 
                    `<div class="relationship" style="color: #999; font-style: italic;">A stranger to you</div>`}
            </div>
        `;
        
        audienceContainer.appendChild(memberDiv);
    });
}

function generateStoryChoices() {
    // Clear previous story characters to start fresh
    gameState.storyCharacters = null;
    gameState.act1ChoiceData = {};
    generateAct1Choices();
}

function generateAct1Choices() {
    const choices = document.getElementById('act1-choices');
    if (!choices) {
        console.error('Could not find act1-choices element');
        return;
    }
    choices.innerHTML = '';
    
    // Clear any stored choice-specific character data
    gameState.act1ChoiceData = {};
    
    // Generate choices based on gathered information and town type
    const townType = locations && locations.townInfo ? locations.townInfo.type : 'mining';
    const themes = ['industrial', 'market', 'tavern', 'government'];
    
    // Debug: Check if we have the required data
    if (!gameState.gatheredInfo) {
        console.error('gameState.gatheredInfo is undefined');
        gameState.gatheredInfo = [];
    }
    
    if (!gameState.knownCharacters) {
        console.error('gameState.knownCharacters is undefined');
        gameState.knownCharacters = {};
    }
    
    // Create better profession-to-theme mapping
    const professionThemeMap = {
        'industrial': [
            'former miner', 'mine guard', 'widow/widower', 'safety inspector', 'geologer', 'mine cart operator', 'guard captain',
            'former fisherman', 'dock worker', 'ship builder', 'lighthouse keeper', 'harbor master', 'sea captain',
            'mill worker', 'grain inspector', 'livestock handler', 'farm equipment maker', 'granary keeper', 'agricultural overseer'
        ],
        'market': ['baker', 'blacksmith', 'merchant', 'apprentice', 'farmer', 'weaver', 'butcher'],
        'tavern': ['barkeep', 'serving wench', 'traveling bard', 'retired soldier', 'local drunk', 'tavern cook', 'merchant'],
        'government': ['town clerk', 'guard captain', 'tax collector', 'council member', 'court scribe', 'mayor']
    };
    
    themes.forEach(theme => {
        const relevantInfo = gameState.gatheredInfo.filter(info => {
            const sourceLower = info.source ? info.source.toLowerCase() : '';
            const textLower = info.text ? info.text.toLowerCase() : '';
            
            // Check if source matches theme-associated professions
            const sourceCharacter = Object.values(gameState.knownCharacters).find(char => 
                char && char.name && char.name.toLowerCase() === sourceLower
            );
            
            let matchesProfession = false;
            if (sourceCharacter && sourceCharacter.character && sourceCharacter.character.profession && professionThemeMap[theme]) {
                matchesProfession = professionThemeMap[theme].some(prof => 
                    sourceCharacter.character.profession.toLowerCase().includes(prof.toLowerCase())
                );
            }
            
            // Check if text contains theme-related keywords
            const themeKeywords = {
                'industrial': ['mine', 'mining', 'accident', 'sealed', 'cave-in', 'miners', 'mill', 'dock', 'ship', 'fish'],
                'market': ['market', 'trade', 'trading', 'merchant', 'business', 'bread', 'baker', 'blacksmith'],
                'tavern': ['tavern', 'drinks', 'gossip', 'barkeep', 'travelers', 'ale', 'inn'],
                'government': ['mayor', 'government', 'official', 'decree', 'meetings', 'capital', 'economic', 'clerk']
            };
            
            let matchesKeywords = false;
            if (themeKeywords[theme]) {
                matchesKeywords = themeKeywords[theme].some(keyword => 
                    textLower.includes(keyword) || sourceLower.includes(keyword)
                );
            }
            
            return matchesProfession || matchesKeywords || textLower.includes(theme);
        });
        
        // Find characters associated with this theme by profession
        const themeCharacters = Object.values(gameState.knownCharacters).filter(char => {
            if (!char || !char.character || !char.character.profession || !professionThemeMap[theme]) {
                return false;
            }
            return professionThemeMap[theme].some(prof => 
                char.character.profession.toLowerCase().includes(prof.toLowerCase())
            );
        });
        
        ['confirmed', 'rumored', 'madeUp'].forEach(type => {
            const choice = document.createElement('div');
            choice.className = 'choice';
            choice.onclick = () => selectChoice('act1', theme, type);
            
            const hasInfo = type === 'madeUp' || relevantInfo.some(info => info.type === type);
            
            // Generate the characters that will be used for this specific choice
            const choiceCharacters = generateCharactersForChoice(theme, type, themeCharacters);
            
            // Store character data for this specific choice
            const choiceKey = `${theme}-${type}`;
            gameState.act1ChoiceData[choiceKey] = choiceCharacters;
            
            // Create personalized story text with character names
            let choiceText = generatePersonalizedStoryText(theme, type, themeCharacters, relevantInfo.filter(info => info.type === type || type === 'madeUp'));
            
            // Show which specific info is available
            let sourceInfo = 'Your imagination';
            if (type !== 'madeUp') {
                const availableInfo = relevantInfo.filter(info => info.type === type);
                if (availableInfo.length > 0) {
                    const sources = [...new Set(availableInfo.map(info => info.source))];
                    sourceInfo = `${type} information about: ${sources.join(', ')}`;
                } else {
                    sourceInfo = `No ${type} information available`;
                }
            } else if (themeCharacters.length > 0) {
                sourceInfo = `Your imagination + known characters: ${themeCharacters.map(c => c.name).join(', ')}`;
            }
            
            choice.innerHTML = `
                <div class="choice-text">${choiceText}</div>
                <div class="choice-source">Based on: ${sourceInfo}</div>
            `;
            
            // Style choices based on available information
            if (type !== 'madeUp' && !hasInfo) {
                choice.style.opacity = '0.6';
                choice.style.borderColor = '#666';
            }
            
            choices.appendChild(choice);
        });
    });
}

function generateCharactersForChoice(theme, type, themeCharacters) {
    // Use the EXACT same logic as generatePersonalizedStoryText to ensure consistency
    const allKnownCharacters = Object.values(gameState.knownCharacters || {});
    const townInfo = (locations && locations.townInfo) ? locations.townInfo : { name: 'this town', type: 'mining' };
    
    // Find specific characters for different story roles (EXACT copy of generatePersonalizedStoryText logic)
    const findCharacterForRole = (roleTypes, characteristics = [], excludeList = []) => {
        // First try theme-specific characters
        let candidates = themeCharacters.filter(char => 
            char && char.character && char.character.profession &&
            roleTypes.some(role => char.character.profession.toLowerCase().includes(role.toLowerCase())) &&
            !excludeList.includes(char) // Exclude already assigned characters
        );
        
        // If no theme-specific matches, try all known characters
        if (candidates.length === 0) {
            candidates = allKnownCharacters.filter(char =>
                char && char.character && char.character.profession &&
                roleTypes.some(role => char.character.profession.toLowerCase().includes(role.toLowerCase())) &&
                !excludeList.includes(char) // Exclude already assigned characters
            );
        }
        
        // Filter by characteristics if specified
        if (characteristics.length > 0 && candidates.length > 1) {
            const filtered = candidates.filter(char => 
                characteristics.some(trait => 
                    char.character.personality.toLowerCase().includes(trait.toLowerCase())
                )
            );
            if (filtered.length > 0) candidates = filtered;
        }
        
        return candidates.length > 0 ? candidates[0] : null;
    };
    
    // Get a character for generic roles (with exclusion)
    const getAnyKnownCharacter = (excludeList = []) => {
        const available = allKnownCharacters.filter(char => !excludeList.includes(char));
        return available.length > 0 ? available[0] : null;
    };
    
    let protagonist = null;
    let supportingChar = null;
    let antagonist = null;
    const usedCharacters = [];
    
    // Generate story-specific character assignments (same as generatePersonalizedStoryText)
    if (theme === 'industrial') {
        protagonist = findCharacterForRole(['former miner', 'mill worker', 'dock worker', 'former fisherman'], ['ambitious', 'determined'], usedCharacters);
        if (protagonist) usedCharacters.push(protagonist);
        
        supportingChar = findCharacterForRole(['widow/widower', 'safety inspector', 'mine guard'], [], usedCharacters);
        if (supportingChar) usedCharacters.push(supportingChar);
        
        antagonist = findCharacterForRole(['guard captain', 'mayor'], ['suspicious', 'evasive'], usedCharacters);
    } else if (theme === 'market') {
        protagonist = findCharacterForRole(['baker', 'merchant', 'apprentice'], ['hardworking', 'ambitious'], usedCharacters);
        if (protagonist) usedCharacters.push(protagonist);
        
        supportingChar = findCharacterForRole(['farmer', 'weaver', 'blacksmith'], [], usedCharacters);
        if (supportingChar) usedCharacters.push(supportingChar);
        
        antagonist = findCharacterForRole(['tax collector', 'traveling merchant'], ['greedy', 'scheming'], usedCharacters);
    } else if (theme === 'tavern') {
        protagonist = findCharacterForRole(['barkeep', 'traveling bard', 'serving wench'], ['friendly', 'talkative'], usedCharacters);
        if (protagonist) usedCharacters.push(protagonist);
        
        supportingChar = findCharacterForRole(['retired soldier', 'local drunk', 'tavern cook'], [], usedCharacters);
        if (supportingChar) usedCharacters.push(supportingChar);
        
        antagonist = findCharacterForRole(['council member', 'guard captain'], ['stern', 'authoritarian'], usedCharacters);
    } else if (theme === 'government') {
        protagonist = findCharacterForRole(['town clerk', 'council member'], ['honest', 'concerned'], usedCharacters);
        if (protagonist) usedCharacters.push(protagonist);
        
        supportingChar = findCharacterForRole(['court scribe', 'tax collector'], [], usedCharacters);
        if (supportingChar) usedCharacters.push(supportingChar);
        
        antagonist = findCharacterForRole(['mayor', 'guard captain'], ['corrupt', 'ambitious'], usedCharacters);
    }
    
    // Fallback to any known character if specific roles not found (with exclusions)
    if (!protagonist) {
        protagonist = getAnyKnownCharacter(usedCharacters);
        if (protagonist) usedCharacters.push(protagonist);
    }
    if (!supportingChar) {
        supportingChar = getAnyKnownCharacter(usedCharacters);
        if (supportingChar) usedCharacters.push(supportingChar);
    }
    if (!antagonist && allKnownCharacters.length > 2) {
        antagonist = getAnyKnownCharacter(usedCharacters);
    }
    
    return { protagonist, supportingChar, antagonist, townInfo };
}

function generatePersonalizedStoryText(theme, type, characters, availableInfo) {
    // Get all known characters for potential story use
    const allKnownCharacters = Object.values(gameState.knownCharacters || {});
    const themeCharacters = characters && characters.length > 0 ? characters : [];
    const townInfo = (locations && locations.townInfo) ? locations.townInfo : { name: 'this town', type: 'mining' };
    
    // Find specific characters for different story roles
    const findCharacterForRole = (roleTypes, characteristics = [], excludeList = []) => {
        // First try theme-specific characters
        let candidates = themeCharacters.filter(char => 
            char && char.character && char.character.profession &&
            roleTypes.some(role => char.character.profession.toLowerCase().includes(role.toLowerCase())) &&
            !excludeList.includes(char) // Exclude already assigned characters
        );
        
        // If no theme-specific matches, try all known characters
        if (candidates.length === 0) {
            candidates = allKnownCharacters.filter(char =>
                char && char.character && char.character.profession &&
                roleTypes.some(role => char.character.profession.toLowerCase().includes(role.toLowerCase())) &&
                !excludeList.includes(char) // Exclude already assigned characters
            );
        }
        
        // Filter by characteristics if specified
        if (characteristics.length > 0 && candidates.length > 1) {
            const filtered = candidates.filter(char => 
                characteristics.some(trait => 
                    char.character.personality.toLowerCase().includes(trait.toLowerCase())
                )
            );
            if (filtered.length > 0) candidates = filtered;
        }
        
        return candidates.length > 0 ? candidates[0] : null;
    };
    
    // Get a character for generic roles (with exclusion to prevent self-reference)
    const getAnyKnownCharacter = (excludeList = []) => {
        const available = allKnownCharacters.filter(char => !excludeList.includes(char));
        return available.length > 0 ? available[0] : null;
    };
    
    // Generate story-specific character assignments
    let protagonist = null;
    let supportingChar = null;
    let antagonist = null;
    const usedCharacters = [];
    
    if (theme === 'industrial') {
        protagonist = findCharacterForRole(['former miner', 'mill worker', 'dock worker', 'former fisherman'], ['ambitious', 'determined'], usedCharacters);
        if (protagonist) usedCharacters.push(protagonist);
        
        supportingChar = findCharacterForRole(['widow/widower', 'safety inspector', 'mine guard'], [], usedCharacters);
        if (supportingChar) usedCharacters.push(supportingChar);
        
        antagonist = findCharacterForRole(['guard captain', 'mayor'], ['suspicious', 'evasive'], usedCharacters);
    } else if (theme === 'market') {
        protagonist = findCharacterForRole(['baker', 'merchant', 'apprentice'], ['hardworking', 'ambitious'], usedCharacters);
        if (protagonist) usedCharacters.push(protagonist);
        
        supportingChar = findCharacterForRole(['farmer', 'weaver', 'blacksmith'], [], usedCharacters);
        if (supportingChar) usedCharacters.push(supportingChar);
        
        antagonist = findCharacterForRole(['tax collector', 'traveling merchant'], ['greedy', 'scheming'], usedCharacters);
    } else if (theme === 'tavern') {
        protagonist = findCharacterForRole(['barkeep', 'traveling bard', 'serving wench'], ['friendly', 'talkative'], usedCharacters);
        if (protagonist) usedCharacters.push(protagonist);
        
        supportingChar = findCharacterForRole(['retired soldier', 'local drunk', 'tavern cook'], [], usedCharacters);
        if (supportingChar) usedCharacters.push(supportingChar);
        
        antagonist = findCharacterForRole(['council member', 'guard captain'], ['stern', 'authoritarian'], usedCharacters);
    } else if (theme === 'government') {
        protagonist = findCharacterForRole(['town clerk', 'council member'], ['honest', 'concerned'], usedCharacters);
        if (protagonist) usedCharacters.push(protagonist);
        
        supportingChar = findCharacterForRole(['court scribe', 'tax collector'], [], usedCharacters);
        if (supportingChar) usedCharacters.push(supportingChar);
        
        antagonist = findCharacterForRole(['mayor', 'guard captain'], ['corrupt', 'ambitious'], usedCharacters);
    }
    
    // Fallback to any known character if specific roles not found (with exclusions)
    if (!protagonist) {
        protagonist = getAnyKnownCharacter(usedCharacters);
        if (protagonist) usedCharacters.push(protagonist);
    }
    if (!supportingChar) {
        supportingChar = getAnyKnownCharacter(usedCharacters);
        if (supportingChar) usedCharacters.push(supportingChar);
    }
    if (!antagonist && allKnownCharacters.length > 2) {
        antagonist = getAnyKnownCharacter(usedCharacters);
    }
    
    // Create personalized story templates
    const templates = {
        industrial: {
            confirmed: protagonist ? 
                `In the heart of ${townInfo.name}, where ${protagonist.name} ${getCharacterAction(protagonist, 'works tirelessly despite the hardships')} that have befallen the community...` :
                `In the abandoned workplaces of ${townInfo.name}, where hardworking people once built prosperity...`,
            rumored: protagonist && supportingChar ?
                `In the mysterious ruins of ${townInfo.name}, where ${protagonist.name} discovers secrets that ${supportingChar.name} whispers about in hushed tones...` :
                `In the abandoned workplaces, where strange happenings preceded the disaster...`,
            madeUp: protagonist ?
                `In the enchanted realm of ${townInfo.name}, where ${protagonist.name} discovers magical powers hidden beneath the industrial ruins...` :
                `In the mystical ruins, where ancient powers still linger...`
        },
        market: {
            confirmed: protagonist ?
                `In the market square of ${townInfo.name}, where ${protagonist.name} ${getCharacterAction(protagonist, 'struggles to maintain their trade')} despite economic hardship...` :
                `In the market square, where merchants struggle with economic hardship...`,
            rumored: protagonist && supportingChar ?
                `In the bustling marketplace, where ${protagonist.name} overhears ${supportingChar.name} speaking of changes coming to ${townInfo.name}...` :
                `In the market square, where whispers speak of transformation...`,
            madeUp: protagonist ?
                `In the enchanted marketplace of ${townInfo.name}, where ${protagonist.name} discovers magical goods that shimmer under starlight...` :
                `In the enchanted marketplace, where magical goods are traded...`
        },
        tavern: {
            confirmed: protagonist ?
                `In the tavern of ${townInfo.name}, where ${protagonist.name} ${getCharacterAction(protagonist, 'serves drinks while listening to')} the town's secrets and sorrows...` :
                `In the local tavern, where secrets flow with every drink...`,
            rumored: protagonist && supportingChar ?
                `In the shadowy tavern, where ${protagonist.name} notices ${supportingChar.name} whispering about mysterious happenings in ${townInfo.name}...` :
                `In the tavern, where ghostly voices echo through the night...`,
            madeUp: protagonist ?
                `In the mystical tavern, where ${protagonist.name} communes with ancient spirits who share forgotten wisdom...` :
                `In the mystical tavern, where ancient spirits gather...`
        },
        government: {
            confirmed: protagonist ?
                `In the halls of power in ${townInfo.name}, where ${protagonist.name} ${getCharacterAction(protagonist, 'witnesses the decisions')} that will shape the community's future...` :
                `In the halls of power, where leaders make crucial decisions...`,
            rumored: protagonist && antagonist ?
                `In the government offices, where ${protagonist.name} discovers that ${antagonist.name} has been conducting secret meetings behind closed doors...` :
                `In the government halls, where secret dealings occur...`,
            madeUp: protagonist && antagonist ?
                `In the grand palace, where ${protagonist.name} must outwit the scheming ${antagonist.name} through chambers of marble and gold...` :
                `In the grand palace, where noble lords plot and scheme...`
        }
    };
    
    if (templates[theme] && templates[theme][type]) {
        return templates[theme][type];
    } else if (storyTemplates.act1 && storyTemplates.act1[theme] && storyTemplates.act1[theme][type]) {
        return storyTemplates.act1[theme][type];
    } else {
        return `A ${type} ${theme} story unfolds...`;
    }
}

// Helper function to generate character-appropriate actions
function getCharacterAction(character, defaultAction) {
    if (!character || !character.character) return defaultAction;
    
    const profession = character.character.profession.toLowerCase();
    const personality = character.character.personality.toLowerCase();
    
    // Generate actions based on profession and personality
    if (profession.includes('baker')) {
        if (personality.includes('worried')) return 'kneads bread while worrying about their family';
        if (personality.includes('hardworking')) return 'works from dawn to dusk baking for the community';
        return 'provides fresh bread while listening to town gossip';
    }
    
    if (profession.includes('merchant')) {
        if (personality.includes('ambitious')) return 'seeks new trade opportunities despite the troubles';
        if (personality.includes('worried')) return 'counts dwindling coins while planning their next move';
        return 'haggles with customers while discussing town affairs';
    }
    
    if (profession.includes('barkeep')) {
        if (personality.includes('friendly')) return 'serves ale with a smile while gathering the latest news';
        if (personality.includes('gossipy')) return 'pours drinks while sharing all the town\'s secrets';
        return 'tends bar while listening to every conversation';
    }
    
    if (profession.includes('former miner')) {
        if (personality.includes('bitter')) return 'drinks heavily while cursing the day the mine closed';
        if (personality.includes('melancholy')) return 'stares into the distance, remembering better times';
        return 'speaks of the old days when the mine brought prosperity';
    }
    
    if (profession.includes('mayor')) {
        if (personality.includes('ambitious')) return 'makes grand plans for the town\'s future';
        if (personality.includes('evasive')) return 'speaks in riddles about important matters';
        return 'meets with visitors while keeping secrets';
    }
    
    return defaultAction;
}

function selectChoice(act, theme, type) {
    // Remove previous selection
    document.querySelectorAll(`#${act}-choices .choice`).forEach(choice => {
        choice.classList.remove('selected');
    });
    
    // Add selection to clicked choice
    event.target.closest('.choice').classList.add('selected');
    
    // Store choice
    gameState.storyChoices[act] = { theme, type };
    
    // Generate and store story characters when Act 1 is selected
    if (act === 'act1') {
        // Use the pre-stored characters for this specific choice
        const choiceKey = `${theme}-${type}`;
        gameState.storyCharacters = gameState.act1ChoiceData[choiceKey] || getCharactersForSpecificChoice(theme, type);
    }
    
    // Update selected choice display
    const selectedDiv = document.getElementById(`${act}-selected`);
    let selectedText = '';
    const storyCharacters = getStoryCharacters();
    
    // Use contextual text that matches what the user just selected
    if (act === 'act1') {
        // Act 1 uses the original template system
        if (storyTemplates[act] && storyTemplates[act][theme] && storyTemplates[act][theme][type]) {
            selectedText = storyTemplates[act][theme][type];
        } else {
            selectedText = `${theme} story with ${type} information`;
        }
    } else if (act === 'act2') {
        // Act 2 uses contextual text based on Act 1
        selectedText = generateAct2Text(gameState.storyChoices.act1, theme, type, storyCharacters);
    } else if (act === 'act3') {
        // Act 3 uses contextual text based on Acts 1 and 2
        selectedText = generateAct3Text(gameState.storyChoices.act1, gameState.storyChoices.act2, theme, type, storyCharacters);
    } else {
        selectedText = `${theme} story with ${type} information`;
    }
    
    selectedDiv.innerHTML = `<strong>Selected:</strong> ${selectedText}`;
    
    // Generate next act choices
    if (act === 'act1') {
        generateAct2Choices();
    } else if (act === 'act2') {
        generateAct3Choices();
    }
    
    updateStoryPreview();
    updateTellStoryButton();
}

function generateAct2Choices() {
    const choices = document.getElementById('act2-choices');
    choices.innerHTML = '';
    
    // Get the Act 1 context and characters
    const act1Choice = gameState.storyChoices.act1;
    if (!act1Choice) return;
    
    const storyCharacters = getStoryCharacters();
    const themes = ['adventure', 'discovery', 'conflict'];
    
    themes.forEach(theme => {
        ['confirmed', 'rumored', 'madeUp'].forEach(type => {
            const choice = document.createElement('div');
            choice.className = 'choice';
            choice.onclick = () => selectChoice('act2', theme, type);
            
            // Generate contextual Act 2 text based on Act 1
            let choiceText = generateAct2Text(act1Choice, theme, type, storyCharacters);
            
            choice.innerHTML = `
                <div class="choice-text">${choiceText}</div>
                <div class="choice-source">Style: ${type === 'madeUp' ? 'Fantasy' : (type === 'confirmed' ? 'Realistic' : 'Mysterious')}</div>
            `;
            
            choices.appendChild(choice);
        });
    });
}

function generateAct2Text(act1Choice, act2Theme, type, characters) {
    const { protagonist, supportingChar, antagonist, townInfo } = characters;
    const protName = protagonist ? protagonist.name : 'a brave soul';
    const supportName = supportingChar ? supportingChar.name : 'a trusted ally';
    const antName = antagonist ? antagonist.name : 'a formidable opponent';
    
    // Create contextual Act 2 based on Act 1 theme and Act 2 direction
    const contextualTemplates = {
        // If Act 1 was about industrial problems...
        industrial: {
            adventure: {
                confirmed: `Seeing the industrial troubles plaguing the community, ${protName} decides to take action and venture forth to find a real solution...`,
                rumored: `Following mysterious clues and strange whispers, ${protName} begins investigating the rumors ${supportName} had spoken about...`,
                madeUp: `Awakening to newfound magical abilities, ${protName} discovers they have special powers to confront these otherworldly challenges...`
            },
            discovery: {
                confirmed: `Through careful investigation of the industrial situation, ${protName} and ${supportName} work together to uncover the truth...`,
                rumored: `Following cryptic leads and shadowy hints, ${protName} makes a discovery that could change everything about the situation...`,
                madeUp: `Using mystical insights and arcane knowledge, ${protName} unveils hidden secrets in spectacular fashion...`
            },
            conflict: {
                confirmed: `The industrial problems inevitably lead to ${protName} facing real opposition from ${antName} and the established order...`,
                rumored: `Dark forces connected to the industrial mysteries seem to conspire against ${protName} who seeks the truth...`,
                madeUp: `Epic battles emerge as ${protName} fights the dark powers that ${antName} has unleashed from the cursed industrial sites...`
            }
        },
        // If Act 1 was about market/economic issues...
        market: {
            adventure: {
                confirmed: `Inspired by the economic struggles facing the community, ${protName} ventures out to find new opportunities for ${townInfo.name}...`,
                rumored: `Driven by whispers and strange tales from the marketplace, ${protName} follows ${supportName}'s leads about hidden opportunities...`,
                madeUp: `Blessed with mystical merchant powers, ${protName} sets forth to discover legendary trading routes of old...`
            },
            discovery: {
                confirmed: `Through careful business investigation, ${protName} and ${supportName} work to uncover what's really affecting trade...`,
                rumored: `Following cryptic market rumors and coded messages, ${protName} discovers something that could transform commerce...`,
                madeUp: `With supernatural business insight, ${protName} reveals ancient secrets of prosperity hidden in the stars...`
            },
            conflict: {
                confirmed: `The market problems inevitably lead ${protName} to confront ${antName} who may be manipulating trade...`,
                rumored: `Economic conspiracies seem to pit ${antName} against ${protName} in a battle for ${townInfo.name}'s future...`,
                madeUp: `${protName} must battle the greed-demons that ${antName} has summoned to destroy commerce...`
            }
        },
        // If Act 1 was about tavern/social issues...
        tavern: {
            adventure: {
                confirmed: `Motivated by the social tensions dividing the community, ${protName} decides to bring people together...`,
                rumored: `Following mysterious social whispers and tavern gossip, ${protName} investigates with help from ${supportName}...`,
                madeUp: `Empowered by ancient social magic, ${protName} sets out to heal the community's fractured bonds...`
            },
            discovery: {
                confirmed: `Through community investigation, ${protName} and ${supportName} work to understand what's dividing people...`,
                rumored: `Following cryptic social rumors and veiled threats, ${protName} discovers secrets that could unite or divide ${townInfo.name}...`,
                madeUp: `With mystical empathy and supernatural insight, ${protName} unveils the hidden emotional currents of the community...`
            },
            conflict: {
                confirmed: `The social problems inevitably lead ${protName} to confront ${antName} who may be sowing discord...`,
                rumored: `Social conspiracies emerge as ${antName} works against ${protName}'s efforts to unite people...`,
                madeUp: `${protName} battles the chaos-spirits that ${antName} has unleashed to divide the community...`
            }
        },
        // If Act 1 was about government/political issues...
        government: {
            adventure: {
                confirmed: `Motivated by the political corruption plaguing the town, ${protName} decides to work for real change in ${townInfo.name}...`,
                rumored: `Following shadowy political whispers and coded messages, ${protName} investigates corruption with ${supportName}'s help...`,
                madeUp: `Empowered by divine civic magic, ${protName} sets forth to bring justice to the realm...`
            },
            discovery: {
                confirmed: `Through careful political investigation, ${protName} and ${supportName} work to expose the truth about leadership...`,
                rumored: `Following mysterious government rumors and secret meetings, ${protName} discovers secrets that could transform how ${townInfo.name} is governed...`,
                madeUp: `With mystical insight and otherworldly wisdom, ${protName} reveals the hidden political forces at work...`
            },
            conflict: {
                confirmed: `The political corruption inevitably leads ${protName} to directly challenge ${antName}'s authority and methods...`,
                rumored: `Political conspiracies pit the corrupt ${antName} against the reformist ${protName}...`,
                madeUp: `${protName} wages epic battle against the tyranny-demons commanded by ${antName}...`
            }
        }
    };
    
    // Get the appropriate template
    if (contextualTemplates[act1Choice.theme] && contextualTemplates[act1Choice.theme][act2Theme] && contextualTemplates[act1Choice.theme][act2Theme][type]) {
        return contextualTemplates[act1Choice.theme][act2Theme][type];
    }
    
    // Fallback to generic template if specific one doesn't exist
    return storyTemplates.act2[act2Theme][type].replace(/\[PROTAGONIST\]/g, protName)
        .replace(/\[SUPPORTING_CHAR\]/g, supportName)
        .replace(/\[ANTAGONIST\]/g, antName);
}

function generateAct3Choices() {
    const choices = document.getElementById('act3-choices');
    choices.innerHTML = '';
    
    // Get the Act 1 and Act 2 context and characters
    const act1Choice = gameState.storyChoices.act1;
    const act2Choice = gameState.storyChoices.act2;
    if (!act1Choice || !act2Choice) return;
    
    const storyCharacters = getStoryCharacters();
    const themes = ['triumph', 'tragedy', 'change'];
    
    themes.forEach(theme => {
        ['confirmed', 'rumored', 'madeUp'].forEach(type => {
            const choice = document.createElement('div');
            choice.className = 'choice';
            choice.onclick = () => selectChoice('act3', theme, type);
            
            // Generate contextual Act 3 text based on Acts 1 and 2
            let choiceText = generateAct3Text(act1Choice, act2Choice, theme, type, storyCharacters);
            
            // Capitalize theme for display
            const themeDisplay = theme.charAt(0).toUpperCase() + theme.slice(1);
            const typeDisplay = type === 'madeUp' ? 'Fantastical' : (type === 'confirmed' ? 'Grounded' : 'Ambiguous');
            
            choice.innerHTML = `
                <div class="choice-text">${choiceText}</div>
                <div class="choice-source">${themeDisplay} (${typeDisplay})</div>
            `;
            
            choices.appendChild(choice);
        });
    });
}

// Helper function to get specific problem descriptions for better Act 3 cohesion
function getSpecificProblem(act1Theme) {
    const problemDescriptions = {
        'industrial': 'mine collapse and sealed tunnels',
        'market': 'broken trade routes and empty stalls',
        'tavern': 'social tensions and divided community',
        'government': 'corruption and broken trust in leadership'
    };
    return problemDescriptions[act1Theme] || 'difficult challenges';
}

// Helper function to get specific solutions based on Act 2 approach
function getSpecificSolution(act2Theme, act1Theme) {
    const solutions = {
        'adventure': {
            'industrial': 'new trade contacts and skilled engineers',
            'market': 'alternative supply chains and merchant alliances', 
            'tavern': 'shared experiences that unite people',
            'government': 'evidence of better governance from other towns'
        },
        'discovery': {
            'industrial': 'the real cause of the original disaster',
            'market': 'hidden sabotage disrupting commerce',
            'tavern': 'the source of the community\'s divisions',
            'government': 'proof of corruption and a path to reform'
        },
        'conflict': {
            'industrial': 'confronting those who profit from the town\'s decline',
            'market': 'challenging unfair trade practices',
            'tavern': 'standing up to those spreading discord',
            'government': 'directly opposing corrupt officials'
        }
    };
    return solutions[act2Theme] && solutions[act2Theme][act1Theme] ? 
           solutions[act2Theme][act1Theme] : 'determined action';
}

function generateAct3Text(act1Choice, act2Choice, act3Theme, type, characters) {
    const { protagonist, supportingChar, antagonist, townInfo } = characters;
    const protName = protagonist ? protagonist.name : 'a brave soul';
    const supportName = supportingChar ? supportingChar.name : 'a trusted ally';
    const antName = antagonist ? antagonist.name : 'a formidable opponent';
    
    // Create contextual Act 3 based on previous acts
    const storyProgression = `${act1Choice.theme}-${act2Choice.theme}`;
    
    const contextualTemplates = {
        // Various story progression paths - Enhanced for better cohesion
        'industrial-adventure': {
            triumph: {
                confirmed: `${protName}'s bold venture beyond ${townInfo.name} pays off - they return with new trade partners, skilled workers, and fresh hope. The ${getSpecificProblem(act1Choice.theme)} that once seemed insurmountable now has real solutions, and ${supportName} helps organize the community's renewal...`,
                rumored: `${protName} returns from their mysterious journey changed, bringing whispered tales of distant places and hidden opportunities. While ${supportName} can't quite understand what ${protName} discovered, the industrial heart of ${townInfo.name} slowly stirs back to life in unexpected ways...`,
                madeUp: `${protName} emerges from their mystical quest wielding powers that restore the ${act1Choice.theme} sites to their former glory and beyond. With ${supportName} as their trusted ally, they reshape ${townInfo.name} into a wonderland where magic and industry work as one...`
            },
            tragedy: {
                confirmed: `${protName} returns from their dangerous venture wounded and empty-handed. The ${getSpecificProblem(act1Choice.theme)} has only worsened in their absence, and even ${supportName}'s unwavering support cannot lift the weight of ${protName}'s failure. ${townInfo.name} must face its decline without false hope...`,
                rumored: `${protName} vanishes during their mysterious journey, leaving only cryptic messages and strange signs. ${supportName} searches desperately for answers, but the truth of what befell ${protName} - and whether their quest could have saved ${townInfo.name} - remains forever unknown...`,
                madeUp: `${protName}'s mystical powers prove to be a curse in disguise. In trying to restore the ${act1Choice.theme} sites, they accidentally awaken the very forces that destroyed them originally. ${antName} seizes control of these dark powers, and ${protName}'s noble intentions doom ${townInfo.name} to an even darker fate...`
            },
            change: {
                confirmed: `${protName} returns from their journey with partial solutions - not the miracle ${townInfo.name} hoped for, but real progress nonetheless. The ${getSpecificProblem(act1Choice.theme)} begins to heal slowly, and ${supportName} helps the community adapt to their changing circumstances with newfound resilience...`,
                rumored: `${protName}'s mysterious adventure brings subtle but profound changes to ${townInfo.name}. The industrial sites remain damaged, but people whisper of strange new opportunities that ${protName} somehow set in motion. ${supportName} watches these changes with both hope and uncertainty...`,
                madeUp: `${protName}'s magical journey transforms not the ${act1Choice.theme} sites themselves, but the very nature of how ${townInfo.name} relates to industry and progress. With ${supportName}'s guidance, the community discovers that their future lies not in restoring the past, but in embracing entirely new possibilities...`
            }
        },
        'industrial-discovery': {
            triumph: {
                confirmed: `${protName}'s careful investigation finally uncovers ${getSpecificSolution(act2Choice.theme, act1Choice.theme)}. Armed with this knowledge, they work with ${supportName} to address the ${getSpecificProblem(act1Choice.theme)} systematically. The truth, though painful, provides ${townInfo.name} with a clear path forward...`,
                rumored: `${protName} discovers disturbing secrets about the ${getSpecificProblem(act1Choice.theme)}, but the knowledge comes wrapped in mystery. ${supportName} helps piece together the implications, and while some questions remain unanswered, ${townInfo.name} begins to heal from understanding what really happened...`,
                madeUp: `${protName}'s mystical investigation reveals that the ${getSpecificProblem(act1Choice.theme)} was caused by ancient forces beyond mortal understanding. With ${supportName} as their guide, they unlock forgotten powers that not only restore ${townInfo.name} but elevate it to legendary status...`
            },
            tragedy: {
                confirmed: `${protName}'s investigation reveals the horrible truth - the ${getSpecificProblem(act1Choice.theme)} was deliberately caused by those the community trusted most. The betrayal runs so deep that even with ${supportName}'s support, ${protName} realizes that some wounds can never heal. ${townInfo.name}'s faith in itself is shattered forever...`,
                rumored: `${protName} uncovers fragmentary evidence about the ${getSpecificProblem(act1Choice.theme)}, but the truth is too dangerous to reveal fully. ${supportName} watches helplessly as ${protName} is consumed by the burden of terrible knowledge they cannot share, leaving ${townInfo.name} to suffer in ignorance...`,
                madeUp: `${protName}'s mystical investigation awakens the very dark forces that originally caused the ${getSpecificProblem(act1Choice.theme)}. Despite ${supportName}'s desperate warnings, ${protName} delves too deep and becomes a conduit for ancient evil. ${antName} seizes this power, and ${townInfo.name} faces a fate worse than its original troubles...`
            },
            change: {
                confirmed: `${protName}'s discovery about ${getSpecificSolution(act2Choice.theme, act1Choice.theme)} changes everything the community believed about the ${getSpecificProblem(act1Choice.theme)}. While ${supportName} helps the town adapt to these revelations, not everyone welcomes the truth. ${townInfo.name} must rebuild not just its industry, but its entire sense of identity...`,
                rumored: `${protName}'s investigation yields cryptic clues about the ${getSpecificProblem(act1Choice.theme)} that reshape how ${townInfo.name} sees its past. ${supportName} helps interpret these mysterious findings, but their implications remain unclear. The community changes, but whether for better or worse, only time will tell...`,
                madeUp: `${protName}'s mystical revelations about the ${getSpecificProblem(act1Choice.theme)} transform the very nature of reality around ${townInfo.name}. With ${supportName}'s wisdom, the community learns to navigate a world where the boundaries between the mundane and the magical have forever shifted...`
            }
        },
        'industrial-conflict': {
            triumph: {
                confirmed: `${protName} confronts ${antName} directly about ${getSpecificSolution(act2Choice.theme, act1Choice.theme)}, and despite fierce resistance, emerges victorious. With ${supportName} rallying community support, they systematically dismantle the forces that perpetuated the ${getSpecificProblem(act1Choice.theme)}. ${townInfo.name} finally breaks free from the chains that held it back...`,
                rumored: `The confrontation between ${protName} and ${antName} over the ${getSpecificProblem(act1Choice.theme)} ends in ${protName}'s favor, but through mysterious means. ${supportName} witnesses strange events that suggest the victory came at a hidden cost. Still, ${townInfo.name} prospers, even if the reasons remain unclear...`,
                madeUp: `${protName} wages an epic mystical battle against ${antName} and the dark forces behind the ${getSpecificProblem(act1Choice.theme)}. With ${supportName} channeling the community's collective will, they banish the corruption forever. ${townInfo.name} is transformed into a beacon of hope that shines across the land...`
            },
            tragedy: {
                confirmed: `${protName}'s brave confrontation with ${antName} over the ${getSpecificProblem(act1Choice.theme)} ends in crushing defeat. Despite ${supportName}'s desperate assistance, ${antName}'s control proves too entrenched. ${townInfo.name} learns that some evils are too powerful to overcome through courage alone...`,
                rumored: `The conflict between ${protName} and ${antName} reaches a mysterious climax that leaves both changed. ${supportName} can only watch as ${protName} pays a terrible price for their defiance. Whether ${protName} won or lost becomes unclear, but ${townInfo.name} remains trapped by the ${getSpecificProblem(act1Choice.theme)}...`,
                madeUp: `${protName}'s mystical powers prove insufficient against the ancient evil that ${antName} channels through the ${getSpecificProblem(act1Choice.theme)}. In their final moments, ${protName} saves ${supportName} but dooms themselves. ${townInfo.name} falls to darkness, but legends of ${protName}'s sacrifice echo through eternity...`
            },
            change: {
                confirmed: `${protName}'s confrontation with ${antName} changes both adversaries forever. Neither truly wins, but their conflict forces ${townInfo.name} to confront the reality of the ${getSpecificProblem(act1Choice.theme)}. With ${supportName}'s guidance, the community learns to navigate a new world where old certainties no longer apply...`,
                rumored: `The mysterious struggle between ${protName} and ${antName} transforms them both in ways that ${supportName} cannot fully comprehend. The ${getSpecificProblem(act1Choice.theme)} shifts into something different - not solved, but changed. ${townInfo.name} adapts to this new reality, uncertain but resilient...`,
                madeUp: `The epic battle between ${protName} and ${antName} tears holes in reality itself, fundamentally altering the nature of the ${getSpecificProblem(act1Choice.theme)}. With ${supportName} as their anchor, ${protName} learns to master these new cosmic forces. ${townInfo.name} becomes a place where miracles and disasters walk hand in hand...`
            }
        },
        // Market-based story progressions
        'market-adventure': {
            triumph: {
                confirmed: `${protName}'s commercial venture succeeds beyond all expectations, establishing ${getSpecificSolution(act2Choice.theme, act1Choice.theme)}. ${supportName} helps coordinate the new prosperity, and the ${getSpecificProblem(act1Choice.theme)} become memories as ${townInfo.name} thrives with renewed commerce...`,
                rumored: `${protName} returns from their mysterious trading journey with wealth and connections that seem almost too good to be true. Though ${supportName} questions the source of this fortune, the revival of ${townInfo.name}'s commerce speaks for itself...`,
                madeUp: `${protName} discovers magical trade routes that connect ${townInfo.name} to markets in distant realms. With ${supportName} managing the mundane details, these mystical commercial ventures transform the town into a legendary trading hub...`
            },
            tragedy: {
                confirmed: `${protName}'s ambitious trading venture collapses spectacularly, leaving them deeper in debt than before. Even ${supportName}'s practical support cannot salvage the situation. The ${getSpecificProblem(act1Choice.theme)} worsen as ${townInfo.name} loses what little commerce remained...`,
                rumored: `${protName} disappears during their trading expedition, leaving only debts and broken promises. ${supportName} searches desperately for answers, but the truth of what befell ${protName} remains as elusive as the prosperity they sought...`,
                madeUp: `${protName}'s mystical trading ventures anger powerful entities from other realms. ${antName} exploits these supernatural debts, and ${protName}'s attempt to restore commerce instead curses ${townInfo.name} with perpetual poverty...`
            },
            change: {
                confirmed: `${protName}'s trading venture brings unexpected results - not the windfall hoped for, but strange new connections that slowly reshape ${townInfo.name}'s economy. ${supportName} helps the community adapt to these shifting commercial realities...`,
                rumored: `${protName}'s mysterious business dealings create ripple effects that ${supportName} struggles to understand. The market changes, but whether these transformations will benefit ${townInfo.name} remains to be seen...`,
                madeUp: `${protName}'s magical commerce fundamentally alters the relationship between ${townInfo.name} and the concept of trade itself. With ${supportName}'s wisdom, the community learns to navigate an economy where value and meaning have been mystically redefined...`
            }
        }
    };
    
    // Try to get specific contextual template
    if (contextualTemplates[storyProgression] && contextualTemplates[storyProgression][act3Theme] && contextualTemplates[storyProgression][act3Theme][type]) {
        return contextualTemplates[storyProgression][act3Theme][type];
    }
    
    // Fallback: Create enhanced generic contextual ending that references previous acts
    const actionWords = {
        'adventure': 'bold journey',
        'discovery': 'careful investigation',
        'conflict': 'determined confrontation'
    };
    
    const actionResults = {
        'adventure': {
            'triumph': 'returns with exactly what was needed',
            'tragedy': 'comes back empty-handed and broken',
            'change': 'brings back unexpected opportunities'
        },
        'discovery': {
            'triumph': 'uncovers the crucial truth',
            'tragedy': 'learns secrets too terrible to bear',
            'change': 'finds answers that reshape everything'
        },
        'conflict': {
            'triumph': 'overcomes all opposition',
            'tragedy': 'is defeated despite their courage',
            'change': 'transforms both victor and vanquished'
        }
    };
    
    const genericContextual = {
        triumph: {
            confirmed: `Through ${protName}'s ${actionWords[act2Choice.theme]}, they ${actionResults[act2Choice.theme]['triumph']} and systematically address the ${getSpecificProblem(act1Choice.theme)}. With ${supportName} coordinating community efforts, ${townInfo.name} finally overcomes its greatest challenges and prospers...`,
            rumored: `${protName}'s ${actionWords[act2Choice.theme]} ${actionResults[act2Choice.theme]['triumph']} through mysterious means. While ${supportName} cannot fully understand what happened, the ${getSpecificProblem(act1Choice.theme)} begin to heal in ways no one expected...`,
            madeUp: `${protName}'s magical ${actionWords[act2Choice.theme]} ${actionResults[act2Choice.theme]['triumph']} beyond mortal comprehension. With ${supportName} anchoring them to reality, they transform ${townInfo.name} into a realm where the ${getSpecificProblem(act1Choice.theme)} become sources of wonder rather than woe...`
        },
        tragedy: {
            confirmed: `Despite ${protName}'s ${actionWords[act2Choice.theme]}, they ${actionResults[act2Choice.theme]['tragedy']} and the ${getSpecificProblem(act1Choice.theme)} prove insurmountable. Even ${supportName}'s unwavering support cannot prevent ${townInfo.name} from facing its harsh destiny...`,
            rumored: `${protName}'s ${actionWords[act2Choice.theme]} ${actionResults[act2Choice.theme]['tragedy']} in ways that ${supportName} struggles to comprehend. The ${getSpecificProblem(act1Choice.theme)} remain unsolved, wrapped in mysteries that may never be unraveled...`,
            madeUp: `${protName}'s magical ${actionWords[act2Choice.theme]} ${actionResults[act2Choice.theme]['tragedy']} when ancient powers prove too dangerous to control. Despite ${supportName}'s desperate attempts to help, ${townInfo.name} faces an even darker fate than the original ${getSpecificProblem(act1Choice.theme)}...`
        },
        change: {
            confirmed: `${protName}'s ${actionWords[act2Choice.theme]} ${actionResults[act2Choice.theme]['change']} about the ${getSpecificProblem(act1Choice.theme)}. While ${supportName} helps the community adapt, ${townInfo.name} must learn to thrive in a world where old assumptions no longer apply...`,
            rumored: `${protName}'s ${actionWords[act2Choice.theme]} ${actionResults[act2Choice.theme]['change']} in ways that ${supportName} finds both hopeful and troubling. The ${getSpecificProblem(act1Choice.theme)} evolve into something new, but whether that's blessing or curse remains unclear...`,
            madeUp: `${protName}'s magical ${actionWords[act2Choice.theme]} ${actionResults[act2Choice.theme]['change']} the fundamental nature of the ${getSpecificProblem(act1Choice.theme)}. With ${supportName}'s wisdom guiding them, ${townInfo.name} becomes a place where reality itself bends to accommodate new possibilities...`
        }
    };
    
    if (genericContextual[act3Theme] && genericContextual[act3Theme][type]) {
        return genericContextual[act3Theme][type];
    }
    
    // Final fallback to original template
    return storyTemplates.act3[act3Theme][type].replace(/\[PROTAGONIST\]/g, protName)
        .replace(/\[SUPPORTING_CHAR\]/g, supportName)
        .replace(/\[ANTAGONIST\]/g, antName)
        .replace(/\[TOWN_NAME\]/g, townInfo.name);
}

function updateStoryPreview() {
    const preview = document.getElementById('story-preview-text');
    let storyText = '';
    
    // Get story characters - use the same system as Act 1 generation
    const storyCharacters = getStoryCharacters();
    
    if (gameState.storyChoices.act1) {
        const { theme, type } = gameState.storyChoices.act1;
        if (storyTemplates.act1 && storyTemplates.act1[theme] && storyTemplates.act1[theme][type]) {
            storyText += storyTemplates.act1[theme][type] + '<br><br>';
        } else {
            storyText += `Act 1: ${theme} story with ${type} information<br><br>`;
        }
    }
    
    if (gameState.storyChoices.act2) {
        const { theme, type } = gameState.storyChoices.act2;
        // Use contextual Act 2 text that references Act 1
        const act2Text = generateAct2Text(gameState.storyChoices.act1, theme, type, storyCharacters);
        storyText += act2Text + '<br><br>';
    }
    
    if (gameState.storyChoices.act3) {
        const { theme, type } = gameState.storyChoices.act3;
        // Use contextual Act 3 text that references both previous acts
        const act3Text = generateAct3Text(gameState.storyChoices.act1, gameState.storyChoices.act2, theme, type, storyCharacters);
        storyText += act3Text;
    }
    
    preview.innerHTML = storyText || 'Select your story choices to see the preview...';
}

function getStoryCharacters() {
    // Use stored characters if they exist (consistent across acts)
    if (gameState.storyCharacters) {
        return gameState.storyCharacters;
    }
    
    // Fallback to generating new characters if not stored
    const townInfo = (locations && locations.townInfo) ? locations.townInfo : { name: 'this town', type: 'mining' };
    
    if (!gameState.storyChoices.act1) {
        return { protagonist: null, supportingChar: null, antagonist: null, townInfo };
    }
    
    return generateStoryCharacters(gameState.storyChoices.act1.theme);
}

function getCharactersForSpecificChoice(theme, type) {
    // This mirrors the logic in generatePersonalizedStoryText to get the EXACT same characters
    // that were used in the story text the user just selected
    
    const allKnownCharacters = Object.values(gameState.knownCharacters || {});
    const townInfo = (locations && locations.townInfo) ? locations.townInfo : { name: 'this town', type: 'mining' };
    
    // Get theme-specific characters (same logic as in generateAct1Choices)
    const professionThemeMap = {
        'industrial': [
            'former miner', 'mine guard', 'widow/widower', 'safety inspector', 'geologer', 'mine cart operator', 'guard captain',
            'former fisherman', 'dock worker', 'ship builder', 'lighthouse keeper', 'harbor master', 'sea captain',
            'mill worker', 'grain inspector', 'livestock handler', 'farm equipment maker', 'granary keeper', 'agricultural overseer'
        ],
        'market': ['baker', 'blacksmith', 'merchant', 'apprentice', 'farmer', 'weaver', 'butcher'],
        'tavern': ['barkeep', 'serving wench', 'traveling bard', 'retired soldier', 'local drunk', 'tavern cook', 'merchant'],
        'government': ['town clerk', 'guard captain', 'tax collector', 'council member', 'court scribe', 'mayor']
    };
    
    const themeCharacters = allKnownCharacters.filter(char => {
        if (!char || !char.character || !char.character.profession || !professionThemeMap[theme]) {
            return false;
        }
        return professionThemeMap[theme].some(prof => 
            char.character.profession.toLowerCase().includes(prof.toLowerCase())
        );
    });
    
    // Use the EXACT same character selection logic as generatePersonalizedStoryText
    const findCharacterForRole = (roleTypes, characteristics = []) => {
        // First try theme-specific characters
        let candidates = themeCharacters.filter(char => 
            char && char.character && char.character.profession &&
            roleTypes.some(role => char.character.profession.toLowerCase().includes(role.toLowerCase()))
        );
        
        // If no theme-specific matches, try all known characters
        if (candidates.length === 0) {
            candidates = allKnownCharacters.filter(char =>
                char && char.character && char.character.profession &&
                roleTypes.some(role => char.character.profession.toLowerCase().includes(role.toLowerCase()))
            );
        }
        
        // Filter by characteristics if specified
        if (characteristics.length > 0 && candidates.length > 1) {
            const filtered = candidates.filter(char => 
                characteristics.some(trait => 
                    char.character.personality.toLowerCase().includes(trait.toLowerCase())
                )
            );
            if (filtered.length > 0) candidates = filtered;
        }
        
        return candidates.length > 0 ? candidates[0] : null;
    };
    
    const getDeterministicCharacter = (excludeList = []) => {
        const available = allKnownCharacters
            .filter(char => !excludeList.includes(char))
            .sort((a, b) => a.name.localeCompare(b.name));
        return available.length > 0 ? available[0] : null;
    };
    
    let protagonist = null;
    let supportingChar = null;
    let antagonist = null;
    
    // Generate story-specific character assignments (same as generatePersonalizedStoryText)
    if (theme === 'industrial') {
        protagonist = findCharacterForRole(['former miner', 'mill worker', 'dock worker', 'former fisherman'], ['ambitious', 'determined']);
        supportingChar = findCharacterForRole(['widow/widower', 'safety inspector', 'mine guard']);
        antagonist = findCharacterForRole(['guard captain', 'mayor'], ['suspicious', 'evasive']);
    } else if (theme === 'market') {
        protagonist = findCharacterForRole(['baker', 'merchant', 'apprentice'], ['hardworking', 'ambitious']);
        supportingChar = findCharacterForRole(['farmer', 'weaver', 'blacksmith']);
        antagonist = findCharacterForRole(['tax collector', 'traveling merchant'], ['greedy', 'scheming']);
    } else if (theme === 'tavern') {
        protagonist = findCharacterForRole(['barkeep', 'traveling bard', 'serving wench'], ['friendly', 'talkative']);
        supportingChar = findCharacterForRole(['retired soldier', 'local drunk', 'tavern cook']);
        antagonist = findCharacterForRole(['council member', 'guard captain'], ['stern', 'authoritarian']);
    } else if (theme === 'government') {
        protagonist = findCharacterForRole(['town clerk', 'council member'], ['honest', 'concerned']);
        supportingChar = findCharacterForRole(['court scribe', 'tax collector']);
        antagonist = findCharacterForRole(['mayor', 'guard captain'], ['corrupt', 'ambitious']);
    }
    
    // Fallback to any known character if specific roles not found (deterministic)
    const usedCharacters = [];
    if (!protagonist) {
        protagonist = getDeterministicCharacter(usedCharacters);
        if (protagonist) usedCharacters.push(protagonist);
    } else {
        usedCharacters.push(protagonist);
    }
    
    if (!supportingChar) {
        supportingChar = getDeterministicCharacter(usedCharacters);
        if (supportingChar) usedCharacters.push(supportingChar);
    } else {
        usedCharacters.push(supportingChar);
    }
    
    if (!antagonist && allKnownCharacters.length > 2) {
        antagonist = getDeterministicCharacter(usedCharacters);
    }
    
    return { protagonist, supportingChar, antagonist, townInfo };
}

function generateStoryCharacters(theme) {
    // This is now just a wrapper for the specific choice function
    return getCharactersForSpecificChoice(theme, 'confirmed');
}

function fillStoryPlaceholders(text, characters) {
    let filledText = text;
    
    // Replace character placeholders
    if (characters.protagonist) {
        filledText = filledText.replace(/\[PROTAGONIST\]/g, characters.protagonist.name);
    } else {
        filledText = filledText.replace(/\[PROTAGONIST\]/g, 'a brave soul');
    }
    
    if (characters.supportingChar) {
        filledText = filledText.replace(/\[SUPPORTING_CHAR\]/g, characters.supportingChar.name);
    } else {
        filledText = filledText.replace(/\[SUPPORTING_CHAR\]/g, 'a trusted ally');
    }
    
    if (characters.antagonist) {
        filledText = filledText.replace(/\[ANTAGONIST\]/g, characters.antagonist.name);
    } else {
        filledText = filledText.replace(/\[ANTAGONIST\]/g, 'a formidable opponent');
    }
    
    if (characters.townInfo && characters.townInfo.name) {
        filledText = filledText.replace(/\[TOWN_NAME\]/g, characters.townInfo.name);
    } else {
        filledText = filledText.replace(/\[TOWN_NAME\]/g, 'the town');
    }
    
    return filledText;
}

function updateTellStoryButton() {
    const button = document.getElementById('tell-story-btn');
    const allSelected = gameState.storyChoices.act1 && gameState.storyChoices.act2 && gameState.storyChoices.act3;
    button.disabled = !allSelected;
}

function tellStory() {
    document.getElementById('evening-phase').classList.add('hidden');
    document.getElementById('night-phase').classList.remove('hidden');
    gameState.currentPhase = 'night';
    
    generatePerformanceResults();
}

function generatePerformanceResults() {
    const audienceDiv = document.getElementById('audience-feedback');
    const earningsDiv = document.getElementById('earnings-breakdown');
    const consequencesDiv = document.getElementById('immediate-consequences');
    
    // Calculate story effectiveness
    const storyEffectiveness = calculateStoryEffectiveness();
    
    // Generate audience reactions
    const reactions = generateAudienceReactions(storyEffectiveness);
    audienceDiv.innerHTML = reactions.map(reaction => 
        `<div class="reaction-item ${reaction.type}">${reaction.text}</div>`
    ).join('');
    
    // Calculate earnings
    const earnings = calculateEarnings(storyEffectiveness);
    earningsDiv.innerHTML = Object.entries(earnings).map(([source, amount]) => 
        `<div class="earnings-item"><span>${source}:</span><span>${amount >= 0 ? '+' : ''}${amount} gold</span></div>`
    ).join('');
    
    // Update gold (excluding inn cost for now - that happens when resting)
    const performanceEarnings = earnings['Base Performance Fee'] + earnings['Audience Tips'] + (earnings['Personal Bonuses'] || 0);
    gameState.gold += performanceEarnings;
    
    // Generate consequences
    const consequences = generateConsequences(storyEffectiveness);
    consequencesDiv.innerHTML = consequences.map(consequence => 
        `<div class="reaction-item">${consequence}</div>`
    ).join('');
    
    // Store previous reputation for comparison
    const previousReputation = gameState.reputation;
    
    // Update reputation
    updateReputation(storyEffectiveness);
    
    // Track performance quality for lose conditions
    trackPerformanceQuality(storyEffectiveness);
    
    // Check for lose condition warnings
    checkLoseConditionWarnings(consequences);
    
    // Add reputation change to consequences if it changed
    if (gameState.reputation !== previousReputation) {
        const reputationChange = getReputationChangeDescription(previousReputation, gameState.reputation);
        consequences.push(reputationChange);
    }
    
    // Check for low gold warning
    checkLowGoldWarning();
    
    updateUI();
}

function calculateStoryEffectiveness() {
    let effectiveness = 0;
    
    // Base effectiveness from story coherence
    effectiveness += 50;
    
    // Bonus for using gathered information
    if (gameState.storyChoices.act1.type === 'confirmed') effectiveness += 20;
    if (gameState.storyChoices.act1.type === 'rumored') effectiveness += 10;
    if (gameState.storyChoices.act1.type === 'madeUp') effectiveness += 5;
    
    // Bonus for story consistency
    const types = [gameState.storyChoices.act1.type, gameState.storyChoices.act2.type, gameState.storyChoices.act3.type];
    const consistentTypes = types.filter(type => type === types[0]).length;
    effectiveness += consistentTypes * 5;
    
    // Calculate audience satisfaction bonus
    if (gameState.eveningAudience && gameState.eveningAudience.length > 0) {
        const audienceSatisfaction = calculateAudienceSatisfaction();
        effectiveness += audienceSatisfaction.bonus;
        
        // Store individual reactions for display later
        gameState.audienceReactions = audienceSatisfaction.individualReactions;
    }
    
    // Random factor
    effectiveness += Math.floor(Math.random() * 20) - 10;
    
    return Math.max(0, Math.min(100, effectiveness));
}

function calculateAudienceSatisfaction() {
    const story = gameState.storyChoices;
    let totalBonus = 0;
    const individualReactions = [];
    
    gameState.eveningAudience.forEach(audienceMember => {
        const preferences = audienceMember.character.storyPreferences;
        let memberSatisfaction = 50; // Base satisfaction
        let reaction = { name: audienceMember.name, score: 0, reasons: [] };
        
        // Truth level preference - enhanced with stronger negative reactions
        if (preferences.truthLevel === story.act1.type) {
            memberSatisfaction += 15;
            reaction.reasons.push(`loved the ${story.act1.type} nature of the story`);
        } else if (
            (preferences.truthLevel === 'confirmed' && story.act1.type === 'rumored') ||
            (preferences.truthLevel === 'rumored' && story.act1.type === 'confirmed')
        ) {
            memberSatisfaction += 5; // Close enough
            reaction.reasons.push('appreciated the story\'s believability');
        } else {
            // Major mismatches cause strong negative reactions
            if (preferences.truthLevel === 'confirmed' && story.act1.type === 'madeUp') {
                memberSatisfaction -= 25; // Truth-lovers hate fabricated stories
                reaction.reasons.push('was offended by the lies and fabrications');
            } else if (preferences.truthLevel === 'madeUp' && story.act1.type === 'confirmed') {
                memberSatisfaction -= 20; // Fantasy-lovers find truth boring
                reaction.reasons.push('found the realistic story dull and uninspiring');
            } else if (preferences.truthLevel === 'rumored' && story.act1.type === 'madeUp') {
                memberSatisfaction -= 15; // Mystery-lovers dislike obvious fantasy
                reaction.reasons.push('preferred mysterious ambiguity over obvious fantasy');
            } else if (preferences.truthLevel === 'madeUp' && story.act1.type === 'rumored') {
                memberSatisfaction -= 15; // Fantasy-lovers want clear magic, not vague rumors
                reaction.reasons.push('wanted clear fantasy rather than vague mysteries');
            } else {
                memberSatisfaction -= 10;
                reaction.reasons.push(`preferred ${preferences.truthLevel} stories over ${story.act1.type} ones`);
            }
        }
        
        // Theme preference - enhanced with negative reactions for disliked themes
        if (preferences.themes.includes(story.act1.theme)) {
            memberSatisfaction += 10;
            reaction.reasons.push(`was engaged by stories about ${story.act1.theme}`);
        } else {
            // Some patrons have strong dislikes for certain themes
            const strongDislikes = {
                'government': ['industrial', 'tavern'], // Government people may dislike rough themes
                'tavern': ['government'], // Tavern folk dislike politics
                'market': ['industrial'], // Merchants dislike depressing industrial stories
                'industrial': ['government'] // Workers distrust government stories
            };
            
            if (strongDislikes[story.act1.theme] && preferences.themes.some(theme => strongDislikes[story.act1.theme].includes(theme))) {
                memberSatisfaction -= 8; // Moderate negative reaction for disliked themes
                reaction.reasons.push(`disliked the focus on ${story.act1.theme} matters`);
            }
        }
        
        // Tone preference check (Act 2 and 3 determine overall tone)
        const storyTone = determineStoryTone(story);
        if (preferences.tone === storyTone) {
            memberSatisfaction += 8;
            reaction.reasons.push(`loved the ${storyTone} tone of your tale`);
        } else if (isOpposingTone(preferences.tone, storyTone)) {
            memberSatisfaction -= 12;
            reaction.reasons.push(`disliked the ${storyTone} tone, preferring ${preferences.tone} stories`);
        }
        
        // Mood affects receptiveness
        const moodMultipliers = {
            'enthusiastic': 1.3,
            'attentive': 1.1,
            'neutral': 1.0,
            'distracted': 0.8,
            'skeptical': 0.6
        };
        
        memberSatisfaction *= moodMultipliers[audienceMember.mood] || 1.0;
        
        // Relationship bonus
        const relationshipBonuses = {
            'confidant': 10,
            'friend': 5,
            'acquaintance': 0,
            'stranger': -5
        };
        
        const relationshipBonus = relationshipBonuses[audienceMember.relationshipLevel] || 0;
        memberSatisfaction += relationshipBonus;
        
        if (relationshipBonus > 0) {
            reaction.reasons.push(`was predisposed to enjoy your performance`);
        }
        
        // Convert to bonus/penalty for overall effectiveness
        const memberBonus = Math.round((memberSatisfaction - 50) / 5); // -10 to +10 range roughly
        totalBonus += memberBonus;
        
        reaction.score = Math.max(0, Math.min(100, memberSatisfaction));
        reaction.mood = audienceMember.mood;
        reaction.relationship = audienceMember.relationshipLevel;
        individualReactions.push(reaction);
    });
    
    // Average the bonus across audience size
    const averageBonus = Math.round(totalBonus / gameState.eveningAudience.length);
    
    return {
        bonus: Math.max(-15, Math.min(15, averageBonus)), // Cap the bonus
        individualReactions: individualReactions
    };
}

function determineStoryTone(story) {
    // Determine story tone based on Act 2 and Act 3 choices
    const act2 = story.act2 ? story.act2.theme : 'neutral';
    const act3 = story.act3 ? story.act3.theme : 'neutral';
    
    // Act 3 has the most influence on overall tone - expanded to match all character preferences
    if (act3 === 'triumph') {
        // Triumph endings can have multiple positive tones
        if (act2 === 'conflict') return 'heroic';
        if (act2 === 'discovery') return 'uplifting'; 
        if (act2 === 'adventure') return 'triumphant';
        return 'triumphant'; // default triumph tone
    } else if (act3 === 'tragedy') {
        // Tragedy endings focus on dramatic/cautionary elements
        if (act2 === 'conflict') return 'dramatic';
        if (act2 === 'discovery') return 'cautionary';
        if (act2 === 'adventure') return 'tragic';
        return 'dramatic'; // default tragedy tone
    } else if (act3 === 'change') {
        // Change endings emphasize hope/growth/community
        if (act2 === 'discovery') return 'hopeful';
        if (act2 === 'conflict') return 'political'; 
        if (act2 === 'adventure') return 'heartwarming';
        return 'hopeful'; // default change tone
    }
    
    // Fallback based on Act 2 if Act 3 not available
    if (act2 === 'adventure') return 'exciting';
    if (act2 === 'discovery') return 'mysterious';
    if (act2 === 'conflict') return 'tense';
    
    return 'balanced';
}

function isOpposingTone(preferredTone, storyTone) {
    // Define opposing tones that clash with each other - expanded for all character preferences
    const opposingPairs = {
        'triumphant': ['tragic', 'dramatic', 'cautionary'],
        'tragic': ['triumphant', 'heroic', 'uplifting', 'heartwarming'],
        'heroic': ['tragic', 'cautionary'],
        'dramatic': ['triumphant', 'hopeful', 'uplifting', 'heartwarming'],
        'hopeful': ['tragic', 'dramatic', 'cautionary'],
        'uplifting': ['tragic', 'dramatic', 'cautionary'],
        'heartwarming': ['tragic', 'dramatic', 'cautionary'],
        'cautionary': ['triumphant', 'uplifting', 'heartwarming', 'heroic'],
        'political': ['heartwarming'], // Political stories might clash with purely emotional ones
        'exciting': ['tragic', 'cautionary'],
        'thoughtful': ['dramatic']
    };
    
    return opposingPairs[preferredTone] && opposingPairs[preferredTone].includes(storyTone);
}

function generateAudienceReactions(effectiveness) {
    const reactions = [];
    
    // General crowd reaction based on overall effectiveness
    if (effectiveness >= 80) {
        reactions.push({ type: 'positive', text: 'The crowd erupts in applause! The tavern fills with cheers and stamping feet.' });
    } else if (effectiveness >= 60) {
        reactions.push({ type: 'positive', text: 'The audience listens intently, many nodding along with your tale.' });
    } else if (effectiveness >= 40) {
        reactions.push({ type: 'neutral', text: 'The crowd seems mildly entertained but not deeply moved.' });
    } else {
        reactions.push({ type: 'negative', text: 'Several people in the audience look bored or start quiet conversations.' });
    }
    
    // Add specific individual reactions if available
    if (gameState.audienceReactions && gameState.audienceReactions.length > 0) {
        reactions.push({ type: 'divider', text: '--- Individual Audience Reactions ---' });
        
        gameState.audienceReactions.forEach(reaction => {
            let reactionType = 'neutral';
            let reactionText = '';
            
            if (reaction.score >= 80) {
                reactionType = 'positive';
                reactionText = `${reaction.name} applauds enthusiastically and calls for more`;
            } else if (reaction.score >= 60) {
                reactionType = 'positive'; 
                reactionText = `${reaction.name} nods approvingly and smiles`;
            } else if (reaction.score >= 40) {
                reactionType = 'neutral';
                reactionText = `${reaction.name} listens politely but seems distracted`;
            } else if (reaction.score >= 25) {
                reactionType = 'negative';
                reactionText = `${reaction.name} frowns and shakes their head disapprovingly`;
            } else if (reaction.score >= 10) {
                reactionType = 'negative';
                reactionText = `${reaction.name} scoffs audibly and looks annoyed`;
            } else {
                reactionType = 'negative';
                reactionText = `${reaction.name} stands up angrily and storms toward the door`;
            }
            
            // Add the main reason if available
            if (reaction.reasons.length > 0) {
                reactionText += ` - ${reaction.reasons[0]}`;
            }
            
            reactions.push({ type: reactionType, text: reactionText });
        });
    }
    
    return reactions;
}

function calculateEarnings(effectiveness) {
    // REBALANCED ECONOMY v2.0
    // Target: Complete game in 12-20 successful performances (matching design doc)
    // 
    // NEW INCOME RANGES PER PERFORMANCE:
    // - New player (no relationships): ~80-200 gold/night
    // - Experienced (some friends): ~200-400 gold/night  
    // - Expert (confidants + reputation): ~400-600+ gold/night
    //
            // With retirement goals of 2,000-4,000 gold, this creates very achievable progression
    
    const basePerformanceFee = 80; // Increased from 20
    let tips = Math.floor(Math.random() * 120 * (effectiveness / 100)); // 0-120 based on effectiveness
    let bonuses = 0;
    
    // Calculate audience-specific bonuses
    if (gameState.audienceReactions && gameState.audienceReactions.length > 0) {
        let personalBonuses = 0;
        let satisfiedAudience = 0;
        
        gameState.audienceReactions.forEach(reaction => {
            // All satisfied audience members provide some bonus
            if (reaction.score >= 60) {
                // Base satisfaction bonus
                personalBonuses += Math.floor(Math.random() * 15) + 10; // 10-25 gold per satisfied patron
                
                // Relationship bonuses on top
                if (reaction.relationship === 'friend') {
                    personalBonuses += Math.floor(Math.random() * 20) + 15; // +15-35 gold for friends
                } else if (reaction.relationship === 'confidant') {
                    personalBonuses += Math.floor(Math.random() * 40) + 30; // +30-70 gold for confidants
                }
            }
            
            // Count satisfied audience members
            if (reaction.score >= 60) {
                satisfiedAudience++;
            }
        });
        
        bonuses += personalBonuses;
        
        // Group bonus for highly satisfied audience (stronger bonus)
        const satisfactionRate = satisfiedAudience / gameState.audienceReactions.length;
        if (satisfactionRate >= 0.75) {
            bonuses += Math.floor(Math.random() * 50) + 50; // 50-100 gold group bonus
        } else if (satisfactionRate >= 0.5) {
            bonuses += Math.floor(Math.random() * 25) + 25; // 25-50 gold partial group bonus
        }
        
        // Reputation bonus (reordered to match new system)
        const reputationBonuses = {
            'Famous': 100,
            'Well-Known': 80, 
            'Respected': 60,
            'Known': 40,
            'Neutral': 0,
            'Disliked': -20,
            'Hated': -50,
            'Notorious': -80
        };
        
        const repBonus = reputationBonuses[gameState.reputation] || 0;
        bonuses += repBonus;
    }
    
    const earnings = {
        'Base Performance Fee': basePerformanceFee,
        'Audience Tips': tips,
        'Personal Bonuses': bonuses,
        'Inn Cost (next night)': -gameState.innCostPerNight,
        'Net Earnings': basePerformanceFee + tips + bonuses - gameState.innCostPerNight
    };
    
    // Only show personal bonuses line if there are any
    if (bonuses === 0) {
        delete earnings['Personal Bonuses'];
        earnings['Net Earnings'] = basePerformanceFee + tips - gameState.innCostPerNight;
    }
    
    return earnings;
}

function generateConsequences(effectiveness) {
    const consequences = [];
    const { act1, act2, act3 } = gameState.storyChoices;
    const townInfo = locations.townInfo || { name: 'this town', type: 'mining' };
    const storyCharacters = getStoryCharacters();
    
    // Generate consequences based on story themes, characters, and effectiveness
    if (act1.theme === 'industrial' && effectiveness >= 60) {
        const industrialConsequences = {
            mining: storyCharacters.protagonist ? 
                `Young people in the audience exchange excited glances - your tale about ${storyCharacters.protagonist.name} has sparked their imagination about ${townInfo.name}'s former mining glory.` :
                `Young people in the audience exchange excited glances - your tale has sparked their imagination about ${townInfo.name}'s former mining glory.`,
            trading: storyCharacters.protagonist ?
                `Several merchants lean forward with interest - your story about ${storyCharacters.protagonist.name} and the old trading routes has given them new business ideas.` :
                `Several merchants lean forward with interest - your story about the old trading routes has given them new business ideas.`,
            farming: storyCharacters.protagonist ?
                `Farmers in the crowd nod knowingly - your tale about ${storyCharacters.protagonist.name}'s agricultural hardship resonates with their own struggles.` :
                `Farmers in the crowd nod knowingly - your tale of agricultural hardship resonates with their own struggles.`,
            coastal: storyCharacters.protagonist ?
                `Fishermen and sailors exchange glances - your maritime tale about ${storyCharacters.protagonist.name} reminds them of better days at sea.` :
                `Fishermen and sailors exchange glances - your maritime tale reminds them of better days at sea.`
        };
        consequences.push(industrialConsequences[townInfo.type] || `Your tale about ${townInfo.name}'s industrial past strikes a chord with the audience.`);
    }
    
    if (act1.theme === 'market' && effectiveness >= 60) {
        const marketConsequence = storyCharacters.protagonist ?
            `Several traders lean forward with interest - your story about ${storyCharacters.protagonist.name} has given them ideas about commerce in ${townInfo.name}.` :
            `Several traders lean forward with interest - your market tale has given them ideas about commerce in ${townInfo.name}.`;
        consequences.push(marketConsequence);
    }
    
    if (act1.theme === 'tavern' && effectiveness >= 60) {
        const tavernConsequence = storyCharacters.protagonist ?
            `The regulars cheer and raise their mugs - your tale about ${storyCharacters.protagonist.name} resonates with the drinking crowd.` :
            'The regulars cheer and raise their mugs - your tavern tale resonates with the drinking crowd.';
        consequences.push(tavernConsequence);
    }
    
    if (act1.theme === 'government' && effectiveness >= 60) {
        const governmentConsequence = storyCharacters.protagonist ?
            `Some townsfolk whisper among themselves - your tale about ${storyCharacters.protagonist.name} has them thinking about ${townInfo.name}'s leadership.` :
            `Some townsfolk whisper among themselves - your political tale has them thinking about ${townInfo.name}'s leadership.`;
        consequences.push(governmentConsequence);
    }
    
    // Character-specific consequences
    if (storyCharacters.protagonist && effectiveness >= 70) {
        if (gameState.knownCharacters[storyCharacters.protagonist.name]) {
            consequences.push(`People in the audience nod and murmur - they recognize ${storyCharacters.protagonist.name} from your story and will likely treat them differently now.`);
        }
    }
    
    if (storyCharacters.antagonist && effectiveness >= 60 && act2.theme === 'conflict') {
        if (gameState.knownCharacters[storyCharacters.antagonist.name]) {
            consequences.push(`Several audience members cast suspicious glances toward where ${storyCharacters.antagonist.name} usually sits - your story has made them wary.`);
        }
    }
    
    if (act3.theme === 'triumph' && effectiveness >= 70) {
        consequences.push(`The tavern keeper nods approvingly - your inspiring tale has lifted the spirits of ${townInfo.name}'s people.`);
    }
    
    if (act2.theme === 'discovery' && effectiveness >= 50) {
        const discoveryConsequence = storyCharacters.protagonist ?
            `Several townspeople seem to be making mental notes about ${storyCharacters.protagonist.name} - your story has given them ideas.` :
            'Several townspeople seem to be making mental notes - your story has given them ideas.';
        consequences.push(discoveryConsequence);
    }
    
    if (effectiveness < 40) {
        consequences.push('The crowd disperses quickly - your lackluster performance won\'t be remembered fondly.');
    }
    
    if (consequences.length === 0) {
        consequences.push(`Your story entertains the crowd in ${townInfo.name} but doesn't seem to have any lasting impact.`);
    }
    
    return consequences;
}

function updateReputation(effectiveness) {
    const reputationLevels = ['Notorious', 'Hated', 'Disliked', 'Neutral', 'Known', 'Respected', 'Well-Known', 'Famous'];
    let currentIndex = reputationLevels.indexOf(gameState.reputation);
    if (currentIndex === -1) currentIndex = 3; // Default to Neutral if not found
    
    // Consider individual audience reactions for reputation changes
    if (gameState.audienceReactions && gameState.audienceReactions.length > 0) {
        let veryPositiveReactions = 0; // 80+ satisfaction
        let positiveReactions = 0; // 60-79 satisfaction
        let neutralReactions = 0; // 40-59 satisfaction  
        let negativeReactions = 0; // 20-39 satisfaction
        let veryNegativeReactions = 0; // <20 satisfaction
        
        gameState.audienceReactions.forEach(reaction => {
            if (reaction.score >= 80) {
                veryPositiveReactions++;
            } else if (reaction.score >= 60) {
                positiveReactions++;
            } else if (reaction.score >= 40) {
                neutralReactions++;
            } else if (reaction.score >= 20) {
                negativeReactions++;
            } else {
                veryNegativeReactions++;
            }
        });
        
        const totalAudience = gameState.audienceReactions.length;
        
        // Calculate percentages
        const veryPositivePercent = veryPositiveReactions / totalAudience;
        const positivePercent = (veryPositiveReactions + positiveReactions) / totalAudience;
        const negativePercent = (veryNegativeReactions + negativeReactions) / totalAudience;
        const veryNegativePercent = veryNegativeReactions / totalAudience;
        
        // MUCH more forgiving reputation system - prioritizes positive reactions
        // Reputation GAIN conditions (easier to gain reputation)
        if (veryPositivePercent >= 0.5) { // 50%+ very happy = reputation gain
            currentIndex = Math.min(currentIndex + 1, reputationLevels.length - 1);
        } else if (positivePercent >= 0.8) { // 80%+ happy overall = reputation gain  
            currentIndex = Math.min(currentIndex + 1, reputationLevels.length - 1);
        } else if (positivePercent >= 0.6 && veryNegativePercent === 0) { // 60%+ happy with no disasters = gain
            currentIndex = Math.min(currentIndex + 1, reputationLevels.length - 1);
        }
        // Reputation LOSS conditions (much harder to lose reputation)
        else if (veryNegativePercent >= 0.6) { // 60%+ very upset = reputation loss
            currentIndex = Math.max(currentIndex - 1, 0);
        } else if (negativePercent >= 0.8) { // 80%+ upset overall = reputation loss
            currentIndex = Math.max(currentIndex - 1, 0);
        } else if (veryNegativePercent >= 0.4 && positivePercent < 0.2) { // 40%+ disasters with little positivity = loss
            currentIndex = Math.max(currentIndex - 1, 0);
        }
        // Neutral performances (most common) = no reputation change
        
        console.log(`Reputation update: ${positivePercent*100}% positive, ${negativePercent*100}% negative, ${veryNegativePercent*100}% very negative`);
    } else {
        // Fallback to old system if no individual reactions (also more forgiving)
        if (effectiveness >= 70) { // Raised threshold for gain
            currentIndex = Math.min(currentIndex + 1, reputationLevels.length - 1);
        } else if (effectiveness < 20) { // Lowered threshold for loss (much harsher performance needed)
            currentIndex = Math.max(currentIndex - 1, 0);
        }
    }
    
    gameState.reputation = reputationLevels[currentIndex];
}

function getReputationChangeDescription(oldReputation, newReputation) {
    const reputationLevels = ['Notorious', 'Hated', 'Disliked', 'Neutral', 'Known', 'Respected', 'Well-Known', 'Famous'];
    const oldIndex = reputationLevels.indexOf(oldReputation);
    const newIndex = reputationLevels.indexOf(newReputation);
    
    if (newIndex > oldIndex) {
        // Reputation improved
        if (gameState.audienceReactions) {
            const veryPositive = gameState.audienceReactions.filter(r => r.score >= 80).length;
            const positive = gameState.audienceReactions.filter(r => r.score >= 60).length;
            
            if (veryPositive >= Math.ceil(gameState.audienceReactions.length * 0.6)) {
                return `🌟 Your reputation improved to "${newReputation}"! The enthusiastic crowd spread word of your exceptional storytelling.`;
            } else {
                return `⭐ Your reputation improved to "${newReputation}"! Satisfied audience members praised your performance to others.`;
            }
        } else {
            return `⭐ Your reputation improved to "${newReputation}"!`;
        }
    } else if (newIndex < oldIndex) {
        // Reputation declined
        if (gameState.audienceReactions) {
            const veryNegative = gameState.audienceReactions.filter(r => r.score < 25).length;
            const negative = gameState.audienceReactions.filter(r => r.score < 40).length;
            
            if (veryNegative >= Math.ceil(gameState.audienceReactions.length * 0.3)) {
                return `💀 Your reputation dropped to "${newReputation}"! Several angry patrons stormed out and warned others about your terrible performance.`;
            } else if (negative >= Math.ceil(gameState.audienceReactions.length * 0.5)) {
                return `⚠️ Your reputation dropped to "${newReputation}". Too many disappointed audience members shared their displeasure with the town.`;
            } else {
                return `📉 Your reputation dropped to "${newReputation}". Some patrons were not impressed.`;
            }
        } else {
            return `📉 Your reputation dropped to "${newReputation}".`;
        }
    }
    
    return null; // No change
}

// Store System - Costs rebalanced for new economy
const storeItems = {
    provisions: {
        name: 'Provisions',
        description: 'Food and supplies for travel. Each unit feeds you for 3 days of travel.',
        baseCost: 30, // Increased from 15 to match income scaling
        icon: '🥖',
        category: 'survival'
    },
    bodyguards: {
        name: 'Hired Bodyguards',
        description: 'Professional guards to protect you during dangerous travels. Each provides protection for one journey.',
        baseCost: 120, // Increased from 50 to match income scaling
        icon: '⚔️',
        category: 'protection'
    },
    medicine: {
        name: 'Medicine',
        description: 'Healing supplies and remedies. Can save your life if you get sick or injured during travel.',
        baseCost: 60, // Increased from 25 to match income scaling
        icon: '💊',
        category: 'healing'
    },
    wagons: {
        name: 'Wagon',
        description: 'A sturdy wagon that allows you to carry more supplies. Permanent upgrade.',
        baseCost: 500, // Increased from 200 to match income scaling
        icon: '🛒',
        category: 'transport',
        isUpgrade: true
    },
    horses: {
        name: 'Horse',
        description: 'A reliable horse for faster, safer travel. Reduces travel time and danger. Permanent upgrade.',
        baseCost: 800, // Increased from 300 to match income scaling
        icon: '🐎',
        category: 'transport',
        isUpgrade: true
    }
};

function generateStoreInterface() {
    let storeHTML = `
        <div style="border: 2px solid #daa520; border-radius: 8px; padding: 15px; margin: 10px 0; background: rgba(218, 165, 32, 0.1);">
            <h3 style="color: #daa520; margin-bottom: 15px;">💰 Your Gold: ${gameState.gold}</h3>
            <h4 style="color: #daa520; margin-bottom: 10px;">📦 Current Inventory:</h4>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px; margin-bottom: 15px;">
    `;
    
    // Show current inventory
    Object.keys(gameState.inventory).forEach(itemKey => {
        const item = storeItems[itemKey];
        const quantity = gameState.inventory[itemKey];
        if (item && quantity > 0) {
            storeHTML += `
                <div style="background: rgba(139, 69, 19, 0.3); padding: 8px; border-radius: 5px; text-align: center;">
                    <div>${item.icon} ${item.name}</div>
                    <div style="color: #daa520; font-weight: bold;">${quantity}x</div>
                </div>
            `;
        }
    });
    
    if (Object.values(gameState.inventory).every(qty => qty === 0)) {
        storeHTML += '<div style="color: #ccc; font-style: italic; text-align: center;">No items in inventory</div>';
    }
    
    storeHTML += `
            </div>
        </div>
        <h4 style="color: #daa520; margin: 15px 0 10px 0;">🛍️ Available Items:</h4>
        <div style="display: grid; grid-template-columns: 1fr; gap: 10px;">
    `;
    
    // Show store items
    Object.keys(storeItems).forEach(itemKey => {
        const item = storeItems[itemKey];
        const currentQuantity = gameState.inventory[itemKey] || 0;
        const cost = calculateItemCost(itemKey);
        const canAfford = gameState.gold >= cost;
        const alreadyOwned = item.isUpgrade && currentQuantity > 0;
        
        storeHTML += `
            <div class="store-item" style="background: rgba(139, 69, 19, 0.3); border: 1px solid #8b4513; border-radius: 8px; padding: 15px;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div style="flex: 1;">
                        <div style="font-size: 1.1em; font-weight: bold; color: #f4e4c1;">
                            ${item.icon} ${item.name} ${alreadyOwned ? '(Owned)' : ''}
                        </div>
                        <div style="color: #ccc; font-size: 0.9em; margin: 5px 0;">${item.description}</div>
                        <div style="color: #daa520; font-weight: bold;">Cost: ${cost} gold</div>
                        ${currentQuantity > 0 && !item.isUpgrade ? `<div style="color: #32cd32; font-size: 0.9em;">You have: ${currentQuantity}</div>` : ''}
                    </div>
                    <div>
                        ${alreadyOwned ? 
                            '<span style="color: #32cd32; font-weight: bold;">✓ Owned</span>' :
                            (canAfford ? 
                                `<button onclick="purchaseItem('${itemKey}')" style="padding: 8px 16px; margin-left: 10px;">Buy</button>` : 
                                '<span style="color: #dc143c;">Can\'t Afford</span>'
                            )
                        }
                    </div>
                </div>
            </div>
        `;
    });
    
    storeHTML += '</div>';
    
    return storeHTML;
}

function calculateItemCost(itemKey) {
    const item = storeItems[itemKey];
    let cost = item.baseCost;
    
    // Increase cost based on reputation - bad reputation = higher prices
    const reputationMultipliers = {
        'Notorious': 1.6,
        'Hated': 1.4,
        'Disliked': 1.2,
        'Neutral': 1.0,
        'Known': 0.95,
        'Respected': 0.9,
        'Well-Known': 0.85,
        'Famous': 0.8
    };
    
    cost = Math.floor(cost * (reputationMultipliers[gameState.reputation] || 1.0));
    
    // Town number affects prices (further towns = more expensive)
    const distanceMultiplier = 1 + (gameState.townNumber - 1) * 0.1;
    cost = Math.floor(cost * distanceMultiplier);
    
    return cost;
}

function purchaseItem(itemKey) {
    const cost = calculateItemCost(itemKey);
    const item = storeItems[itemKey];
    
    if (gameState.gold >= cost) {
        gameState.gold -= cost;
        
        if (item.isUpgrade && gameState.inventory[itemKey] === 0) {
            gameState.inventory[itemKey] = 1; // Upgrades are one-time purchases
        } else if (!item.isUpgrade) {
            gameState.inventory[itemKey] = (gameState.inventory[itemKey] || 0) + 1;
        }
        
        // Refresh the store interface
        visitLocation('store');
        
        // Update main UI
        updateUI();
        
        // Show purchase confirmation
        const content = document.getElementById('location-content');
        content.innerHTML += `
            <div style="margin-top: 15px; padding: 10px; background: rgba(34, 139, 34, 0.3); border-radius: 5px; border-left: 4px solid #32cd32;">
                <strong>Purchase Successful!</strong><br>
                You bought: ${item.icon} ${item.name} for ${cost} gold
            </div>
        `;
        

    }
}

function checkForBanishment() {
    // Check if player should be chased out of town
        const isBanished = (gameState.reputation === 'Notorious' && gameState.daysSinceLastMove >= 2) ||
                       (gameState.reputation === 'Hated' && gameState.daysSinceLastMove >= 5);
    
    if (isBanished && !gameState.bannedFromTown) {
        gameState.bannedFromTown = true;
        showBanishmentScreen();
    }
}

function showBanishmentScreen() {
    const modal = document.getElementById('location-modal');
    const title = document.getElementById('location-title');
    const content = document.getElementById('location-content');
    
    title.textContent = '🔥 Chased Out of Town!';
    
    let banishmentText = '';
    if (gameState.reputation === 'Notorious') {
        banishmentText = `
            <div style="color: #dc143c; font-weight: bold; text-align: center; font-size: 1.2em; margin-bottom: 20px;">
                THE TOWNSFOLK HAVE HAD ENOUGH!
            </div>
            <p style="margin-bottom: 15px;">Your notorious reputation has made you a pariah in ${locations.townInfo?.name || 'town'}. 
            Angry citizens are gathering in the streets, demanding you leave town immediately!</p>
            <p style="margin-bottom: 15px; color: #ffa500;">"That bard has brought nothing but shame to our community! 
            Get out and never come back!" shouts an angry mob.</p>
        `;
    } else if (gameState.reputation === 'Hated') {
        banishmentText = `
            <div style="color: #dc143c; font-weight: bold; text-align: center; font-size: 1.2em; margin-bottom: 20px;">
                WORN OUT YOUR WELCOME
            </div>
            <p style="margin-bottom: 15px;">Your hated reputation has made the townspeople lose patience. 
            The mayor has politely but firmly asked you to move on.</p>
            <p style="margin-bottom: 15px; color: #ffa500;">"Perhaps it's time you found a new audience, 
            bard. This town needs... different entertainment," says the mayor diplomatically.</p>
        `;
    }
    
    banishmentText += `
        <div style="border: 2px solid #dc143c; border-radius: 8px; padding: 15px; margin: 20px 0; background: rgba(220, 20, 60, 0.1);">
            <h3 style="color: #dc143c; margin-bottom: 10px;">⚠️ You Must Leave Town!</h3>
            <p style="margin-bottom: 10px;">You have no choice but to pack up and travel to the next town. 
            The journey will be dangerous - make sure you're prepared!</p>
            
            <div style="margin: 15px 0;">
                <h4 style="color: #daa520;">📦 Current Supplies:</h4>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 10px; margin: 10px 0;">
    `;
    
    // Show current inventory for travel
    let hasSupplies = false;
    Object.keys(gameState.inventory).forEach(itemKey => {
        const item = storeItems[itemKey];
        const quantity = gameState.inventory[itemKey];
        if (item && quantity > 0) {
            hasSupplies = true;
            banishmentText += `
                <div style="background: rgba(139, 69, 19, 0.3); padding: 8px; border-radius: 5px; text-align: center;">
                    ${item.icon} ${item.name}: ${quantity}
                </div>
            `;
        }
    });
    
    if (!hasSupplies) {
        banishmentText += '<div style="color: #dc143c; font-style: italic; text-align: center;">No supplies! This journey will be very dangerous!</div>';
    }
    
    banishmentText += `
                </div>
            </div>
            
            <div style="text-align: center; margin-top: 20px;">
                <button onclick="beginTravel()" style="padding: 12px 24px; font-size: 1.1em; background: linear-gradient(45deg, #8b4513 0%, #a0522d 100%);">
                    🛤️ Begin Journey to Next Town
                </button>
            </div>
        </div>
    `;
    
    content.innerHTML = banishmentText;
    modal.classList.remove('hidden');
}

function beginTravel() {
    closeModal();
    showTravelScreen();
}

function showTravelScreen() {
    // Hide all game phases
    document.getElementById('day-phase').classList.add('hidden');
    document.getElementById('evening-phase').classList.add('hidden');
    document.getElementById('night-phase').classList.add('hidden');
    
    // Create travel screen
    const main = document.getElementsByClassName('game-main')[0];
    const travelPhase = document.createElement('div');
    travelPhase.id = 'travel-phase';
    travelPhase.className = 'phase';
    travelPhase.innerHTML = `
        <h2>🛤️ Journey to the Next Town</h2>
        <div id="travel-status" style="border: 2px solid #8b4513; border-radius: 8px; padding: 15px; margin: 10px 0; background: rgba(139, 69, 19, 0.1);">
            <h3 style="color: #daa520;">🗺️ Journey Status</h3>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 10px; margin: 10px 0;">
                <div><strong>Distance:</strong> <span id="travel-distance">60</span> miles</div>
                <div><strong>Days Traveled:</strong> <span id="travel-days">0</span></div>
                <div><strong>Pace:</strong> <span id="travel-pace">Normal</span></div>
                <div><strong>Health:</strong> <span id="travel-health">Good</span></div>
            </div>
        </div>
        <div id="travel-supplies" style="border: 2px solid #daa520; border-radius: 8px; padding: 15px; margin: 10px 0; background: rgba(218, 165, 32, 0.1);">
            <h3 style="color: #daa520;">📦 Current Supplies</h3>
            <div id="supplies-display" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 10px; margin: 10px 0;">
                <!-- Supplies will be populated here -->
            </div>
        </div>
        <div id="travel-content">
            <p>Preparing for the journey...</p>
        </div>
        <div id="travel-actions" style="margin-top: 20px;"></div>
    `;
    
    main.appendChild(travelPhase);
    
    // Initialize travel state
    gameState.travelState = {
        distance: 60, // Shorter distance for more manageable gameplay
        daysTraveled: 0,
        pace: 'normal', // slow, normal, fast
        health: 'good', // excellent, good, fair, poor, critical
        events: [],
        milesPerDay: { slow: 8, normal: 15, fast: 25 },
        currentEvent: null
    };
    
    // Start the travel sequence
    setTimeout(() => {
        startInteractiveTravel();
    }, 1000);
}

function startInteractiveTravel() {
    updateTravelDisplay();
    showTravelOptions();
}

function updateTravelDisplay() {
    // Update status display
    document.getElementById('travel-distance').textContent = gameState.travelState.distance;
    document.getElementById('travel-days').textContent = gameState.travelState.daysTraveled;
    document.getElementById('travel-pace').textContent = gameState.travelState.pace.charAt(0).toUpperCase() + gameState.travelState.pace.slice(1);
    document.getElementById('travel-health').textContent = gameState.travelState.health.charAt(0).toUpperCase() + gameState.travelState.health.slice(1);
    
    // Update supplies display
    const suppliesDisplay = document.getElementById('supplies-display');
    let suppliesHTML = '';
    
    Object.keys(gameState.inventory).forEach(itemKey => {
        const item = storeItems[itemKey];
        const quantity = gameState.inventory[itemKey];
        if (item) {
            suppliesHTML += `
                <div style="background: rgba(139, 69, 19, 0.3); padding: 8px; border-radius: 5px; text-align: center;">
                    <div>${item.icon}</div>
                    <div style="font-size: 0.9em;">${item.name}</div>
                    <div style="color: ${quantity > 0 ? '#daa520' : '#dc143c'}; font-weight: bold;">${quantity}</div>
                </div>
            `;
        }
    });
    
    suppliesDisplay.innerHTML = suppliesHTML || '<div style="color: #ccc; font-style: italic; text-align: center; grid-column: 1 / -1;">No supplies</div>';
}

function showTravelOptions() {
    const content = document.getElementById('travel-content');
    const actions = document.getElementById('travel-actions');
    
    if (gameState.travelState.currentEvent) {
        // Show current event
        showTravelEvent(gameState.travelState.currentEvent);
        return;
    }
    
    if (gameState.travelState.distance <= 0) {
        // Journey complete!
        content.innerHTML = `
            <div style="border: 2px solid #32cd32; border-radius: 8px; padding: 20px; background: rgba(50, 205, 50, 0.1);">
                <h3 style="color: #32cd32; text-align: center;">🎉 Journey Complete!</h3>
                <p style="text-align: center;">You've successfully traveled to the next town! The journey took ${gameState.travelState.daysTraveled} days.</p>
                <p style="text-align: center; color: #daa520; font-weight: bold;">Welcome to your new destination!</p>
            </div>
        `;
        actions.innerHTML = `
            <div style="text-align: center;">
                <button onclick="arriveAtNewTown()" style="padding: 12px 24px; font-size: 1.1em;">
                    🏘️ Enter Town
                </button>
            </div>
        `;
        return;
    }
    
    // Show regular travel options
    content.innerHTML = `
        <div style="border: 2px solid #8b4513; border-radius: 8px; padding: 15px; background: rgba(139, 69, 19, 0.1);">
            <h3 style="color: #daa520;">🛤️ Choose Your Travel Pace</h3>
            <p>You are ${gameState.travelState.daysTraveled} days into your journey. ${gameState.travelState.distance} miles remain.</p>
            <p style="color: #ffa500; font-size: 0.9em; font-style: italic;">
                Different paces affect your daily progress, supply consumption, and risk of events.
            </p>
        </div>
    `;
    
    actions.innerHTML = `
        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px; margin: 20px 0;">
            <div style="border: 2px solid #654321; border-radius: 8px; padding: 15px; background: rgba(101, 67, 33, 0.2);">
                <h4 style="color: #daa520; text-align: center;">🐌 Slow Pace</h4>
                <p style="text-align: center; font-size: 0.9em; margin: 10px 0;">
                    8 miles/day<br>
                    <span style="color: #32cd32;">Low risk</span><br>
                    <span style="color: #32cd32;">Less supply use</span><br>
                    <span style="color: #dc143c;">Takes longer</span>
                </p>
                <div style="text-align: center;">
                    <button onclick="chooseTravelPace('slow')" ${gameState.travelState.pace === 'slow' ? 'disabled' : ''}>
                        ${gameState.travelState.pace === 'slow' ? 'Current Pace' : 'Choose Slow'}
                    </button>
                </div>
            </div>
            
            <div style="border: 2px solid #8b4513; border-radius: 8px; padding: 15px; background: rgba(139, 69, 19, 0.2);">
                <h4 style="color: #daa520; text-align: center;">🚶 Normal Pace</h4>
                <p style="text-align: center; font-size: 0.9em; margin: 10px 0;">
                    15 miles/day<br>
                    <span style="color: #ffa500;">Medium risk</span><br>
                    <span style="color: #ffa500;">Normal supply use</span><br>
                    <span style="color: #ffa500;">Balanced approach</span>
                </p>
                <div style="text-align: center;">
                    <button onclick="chooseTravelPace('normal')" ${gameState.travelState.pace === 'normal' ? 'disabled' : ''}>
                        ${gameState.travelState.pace === 'normal' ? 'Current Pace' : 'Choose Normal'}
                    </button>
                </div>
            </div>
            
            <div style="border: 2px solid #a0522d; border-radius: 8px; padding: 15px; background: rgba(160, 82, 45, 0.2);">
                <h4 style="color: #daa520; text-align: center;">🏃 Fast Pace</h4>
                <p style="text-align: center; font-size: 0.9em; margin: 10px 0;">
                    25 miles/day<br>
                    <span style="color: #dc143c;">High risk</span><br>
                    <span style="color: #dc143c;">More supply use</span><br>
                    <span style="color: #32cd32;">Faster travel</span>
                </p>
                <div style="text-align: center;">
                    <button onclick="chooseTravelPace('fast')" ${gameState.travelState.pace === 'fast' ? 'disabled' : ''}>
                        ${gameState.travelState.pace === 'fast' ? 'Current Pace' : 'Choose Fast'}
                    </button>
                </div>
            </div>
        </div>
        
        <div style="text-align: center; margin: 20px 0;">
            <button onclick="continueTravel()" style="padding: 12px 24px; font-size: 1.1em; background: linear-gradient(45deg, #8b4513 0%, #a0522d 100%);">
                🚛 Continue Journey (1 Day)
            </button>
        </div>
    `;
}

function chooseTravelPace(newPace) {
    gameState.travelState.pace = newPace;
    updateTravelDisplay();
    showTravelOptions(); // Refresh the display
}

function continueTravel() {
    const travelState = gameState.travelState;
    const pace = travelState.pace;
    
    // Advance one day
    travelState.daysTraveled++;
    const milesThisDay = travelState.milesPerDay[pace];
    travelState.distance = Math.max(0, travelState.distance - milesThisDay);
    
    // Consume supplies based on pace and availability
    let suppliesUsed = '';
    let healthImpact = 0;
    
    // Food consumption (required every day, more at faster pace)
    const foodNeeded = pace === 'fast' ? 2 : 1;
    if (gameState.inventory.provisions >= foodNeeded) {
        gameState.inventory.provisions -= foodNeeded;
        suppliesUsed += `🥖 Used ${foodNeeded} provision(s) for food. `;
    } else {
        healthImpact -= 1; // Health penalty for no food
        suppliesUsed += '🥖 No food available - health suffers! ';
    }
    
    // Apply health effects
    const healthLevels = ['critical', 'poor', 'fair', 'good', 'excellent'];
    let currentHealthIndex = healthLevels.indexOf(travelState.health);
    
    // Random health events based on pace and supplies
    const paceRisk = { slow: 0.1, normal: 0.15, fast: 0.25 };
    const eventRoll = Math.random();
    
    if (eventRoll < paceRisk[pace] + healthImpact * 0.1) {
        // Trigger a travel event
        const event = generateTravelEvent();
        travelState.currentEvent = event;
        showTravelEvent(event);
        return;
    }
    
    // Update health based on conditions
    if (healthImpact < 0) {
        currentHealthIndex = Math.max(0, currentHealthIndex + healthImpact);
        travelState.health = healthLevels[currentHealthIndex];
    } else if (pace === 'slow' && Math.random() < 0.2) {
        // Slow pace might improve health
        currentHealthIndex = Math.min(4, currentHealthIndex + 1);
        travelState.health = healthLevels[currentHealthIndex];
    }
    
    // Show day's progress
    const content = document.getElementById('travel-content');
    content.innerHTML = `
        <div style="border: 2px solid #8b4513; border-radius: 8px; padding: 15px; background: rgba(139, 69, 19, 0.1);">
            <h3 style="color: #daa520;">📅 Day ${travelState.daysTraveled} Complete</h3>
            <p>You traveled ${milesThisDay} miles at ${pace} pace.</p>
            <p>${suppliesUsed}</p>
            <p style="color: ${travelState.distance > 50 ? '#ffa500' : '#32cd32'};">
                <strong>${travelState.distance} miles remaining</strong>
            </p>
        </div>
    `;
    
    updateTravelDisplay();
    
    // Short delay then show next options
    setTimeout(() => {
        showTravelOptions();
         }, 1500);
}

// Travel Events System
const travelEvents = [
    {
        id: 'bandits',
        title: '⚔️ Bandit Ambush!',
        description: 'A group of armed highwaymen blocks the road ahead, demanding your gold!',
        choices: [
            {
                text: 'Fight them off',
                requirements: { bodyguards: 1 },
                outcomes: {
                    success: { text: 'Your bodyguards drive them away!', goldCost: 0, supplyCost: { bodyguards: 1 } },
                    failure: { text: 'The fight goes badly! You\'re wounded and robbed!', goldCost: 0.4, healthChange: -1, supplyCost: { bodyguards: 1 } }
                },
                successChance: 0.7
            },
            {
                text: 'Pay them off',
                requirements: {},
                outcomes: {
                    success: { text: 'You pay the toll and they let you pass.', goldCost: 0.2, supplyCost: {} }
                },
                successChance: 1.0
            },
            {
                text: 'Try to sneak around',
                requirements: {},
                outcomes: {
                    success: { text: 'You successfully avoid the bandits!', goldCost: 0, supplyCost: {} },
                    failure: { text: 'They spot you, beat you, and take everything!', goldCost: 0.5, healthChange: -1, supplyCost: {} }
                },
                successChance: 0.4
            }
        ]
    },
    {
        id: 'sickness',
        title: '🤒 Travel Illness',
        description: 'You begin feeling feverish and weak. This could develop into something serious.',
        choices: [
            {
                text: 'Use medicine',
                requirements: { medicine: 1 },
                outcomes: {
                    success: { text: 'The medicine cures you quickly!', healthChange: 1, supplyCost: { medicine: 1 } }
                },
                successChance: 1.0
            },
            {
                text: 'Rest for extra days',
                requirements: {},
                outcomes: {
                    success: { text: 'Rest helps you recover naturally.', healthChange: 0, daysDelay: 2 }
                },
                successChance: 1.0
            },
            {
                text: 'Push through it',
                requirements: {},
                outcomes: {
                    success: { text: 'You tough it out and feel better.', healthChange: 0 },
                    failure: { text: 'Your condition worsens significantly.', healthChange: -2 }
                },
                successChance: 0.3
            }
        ]
    },
    {
        id: 'river_crossing',
        title: '🌊 Dangerous River Crossing',
        description: 'Heavy rains have swollen the river. The bridge is washed out, but you might be able to ford it.',
        choices: [
            {
                text: 'Ford with wagon',
                requirements: { wagons: 1 },
                outcomes: {
                    success: { text: 'The sturdy wagon gets you across safely!', supplyCost: {} },
                    failure: { text: 'The wagon gets stuck! You lose supplies.', supplyCost: { provisions: 2 } }
                },
                successChance: 0.8
            },
            {
                text: 'Swim across',
                requirements: {},
                outcomes: {
                    success: { text: 'You make it across, though exhausted.', healthChange: -1 },
                    failure: { text: 'The current is too strong! You lose equipment.', goldCost: 0.15, healthChange: -1 }
                },
                successChance: 0.5
            },
            {
                text: 'Look for another route',
                requirements: {},
                outcomes: {
                    success: { text: 'You find a safe crossing upstream.', daysDelay: 1 }
                },
                successChance: 1.0
            }
        ]
    },
    {
        id: 'fellow_traveler',
        title: '👥 Fellow Travelers',
        description: 'You encounter a family of travelers whose wagon has broken down. They ask for help.',
        choices: [
            {
                text: 'Share your provisions',
                requirements: { provisions: 2 },
                outcomes: {
                    success: { text: 'They\'re grateful and share valuable information about the road ahead!', supplyCost: { provisions: 2 }, bonusInfo: true }
                },
                successChance: 1.0
            },
            {
                text: 'Help repair their wagon',
                requirements: {},
                outcomes: {
                    success: { text: 'Working together, you fix their wagon and they offer to travel together for safety!', safetyBonus: 20 },
                    failure: { text: 'The repair takes longer than expected.', daysDelay: 1 }
                },
                successChance: 0.7
            },
            {
                text: 'Continue on your way',
                requirements: {},
                outcomes: {
                    success: { text: 'You leave them behind and continue your journey.' }
                },
                successChance: 1.0
            }
        ]
    },
    {
        id: 'wild_animals',
        title: '🐺 Wild Animals',
        description: 'A pack of wolves surrounds your campsite at night, attracted by the scent of food.',
        choices: [
            {
                text: 'Stand guard with weapons',
                requirements: { bodyguards: 1 },
                outcomes: {
                    success: { text: 'Your guards keep the wolves at bay all night.' },
                    failure: { text: 'The wolves get some of your supplies!', supplyCost: { provisions: 1 } }
                },
                successChance: 0.8
            },
            {
                text: 'Make noise to scare them',
                requirements: {},
                outcomes: {
                    success: { text: 'The wolves flee from your intimidating display!' },
                    failure: { text: 'They\'re not impressed and steal food!', supplyCost: { provisions: 2 } }
                },
                successChance: 0.6
            },
            {
                text: 'Throw them some food',
                requirements: { provisions: 1 },
                outcomes: {
                    success: { text: 'The wolves take the food and leave peacefully.', supplyCost: { provisions: 1 } }
                },
                successChance: 1.0
            }
        ]
    }
];

function generateTravelEvent() {
    // Select random event
    const event = travelEvents[Math.floor(Math.random() * travelEvents.length)];
    return { ...event }; // Return a copy
}

function showTravelEvent(event) {
    const content = document.getElementById('travel-content');
    const actions = document.getElementById('travel-actions');
    
    content.innerHTML = `
        <div style="border: 2px solid #dc143c; border-radius: 8px; padding: 20px; background: rgba(220, 20, 60, 0.1);">
            <h3 style="color: #dc143c; text-align: center;">${event.title}</h3>
            <p style="margin: 15px 0; text-align: center; font-size: 1.1em;">${event.description}</p>
            <p style="color: #ffa500; text-align: center; font-style: italic;">Choose your response carefully - your supplies and health are at stake!</p>
        </div>
    `;
    
    let choicesHTML = '<div style="display: grid; grid-template-columns: 1fr; gap: 15px; margin: 20px 0;">';
    
    event.choices.forEach((choice, index) => {
        const canAfford = checkChoiceRequirements(choice.requirements);
        const requirementsText = Object.keys(choice.requirements).length > 0 ? 
            `<div style="color: #ffa500; font-size: 0.9em;">Requires: ${formatRequirements(choice.requirements)}</div>` : '';
        
        choicesHTML += `
            <div style="border: 2px solid ${canAfford ? '#8b4513' : '#666'}; border-radius: 8px; padding: 15px; background: rgba(139, 69, 19, ${canAfford ? '0.2' : '0.1'});">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div style="flex: 1;">
                        <div style="font-weight: bold; color: ${canAfford ? '#f4e4c1' : '#999'}; margin-bottom: 5px;">
                            ${choice.text}
                        </div>
                        ${requirementsText}
                        <div style="color: #ccc; font-size: 0.9em;">
                            Success chance: ${(choice.successChance * 100).toFixed(0)}%
                        </div>
                    </div>
                    <div>
                        <button onclick="handleTravelEvent(${index})" ${!canAfford ? 'disabled' : ''} style="margin-left: 10px;">
                            ${canAfford ? 'Choose' : 'Cannot Afford'}
                        </button>
                    </div>
                </div>
            </div>
        `;
    });
    
    choicesHTML += '</div>';
    actions.innerHTML = choicesHTML;
}

function checkChoiceRequirements(requirements) {
    return Object.keys(requirements).every(itemKey => {
        return (gameState.inventory[itemKey] || 0) >= requirements[itemKey];
    });
}

function formatRequirements(requirements) {
    return Object.keys(requirements).map(itemKey => {
        const item = storeItems[itemKey];
        const qty = requirements[itemKey];
        return `${qty}x ${item ? item.name : itemKey}`;
    }).join(', ');
}

function handleTravelEvent(choiceIndex) {
    const event = gameState.travelState.currentEvent;
    const choice = event.choices[choiceIndex];
    const isSuccess = Math.random() < choice.successChance;
    const outcome = isSuccess ? choice.outcomes.success : choice.outcomes.failure;
    
    // Apply outcomes
    let resultText = outcome.text;
    
    // Gold cost
    if (outcome.goldCost) {
        const goldLoss = Math.floor(gameState.gold * outcome.goldCost);
        gameState.gold = Math.max(0, gameState.gold - goldLoss);
        resultText += ` Lost ${goldLoss} gold.`;
    }
    
    // Check for death after health loss
    if (gameState.health <= 0) {
        gameState.gameOverReason = 'death';
        setTimeout(() => {
            showGameOverScreen();
        }, 3000); // Give time to read the event result first
        return;
    }
    
    // Supply costs
    if (outcome.supplyCost) {
        Object.keys(outcome.supplyCost).forEach(itemKey => {
            const cost = outcome.supplyCost[itemKey];
            gameState.inventory[itemKey] = Math.max(0, (gameState.inventory[itemKey] || 0) - cost);
        });
    }
    
    // Health changes
    if (outcome.healthChange) {
        const healthDamage = Math.abs(outcome.healthChange) * 15; // Convert health levels to points (15 points per level)
        if (outcome.healthChange > 0) {
            // Healing
            gameState.health = Math.min(100, gameState.health + healthDamage);
            resultText += ` Health restored by ${healthDamage} points.`;
        } else {
            // Damage
            gameState.health = Math.max(0, gameState.health - healthDamage);
            resultText += ` Lost ${healthDamage} health!`;
            if (gameState.health <= 20) {
                resultText += ` <span style="color: #dc143c;">⚠️ Health critically low!</span>`;
            }
        }
    }
    
    // Days delay
    if (outcome.daysDelay) {
        gameState.travelState.daysTraveled += outcome.daysDelay;
        resultText += ` Lost ${outcome.daysDelay} day(s).`;
    }
    
    // Show result
    const content = document.getElementById('travel-content');
    const actions = document.getElementById('travel-actions');
    
    content.innerHTML = `
        <div style="border: 2px solid ${isSuccess ? '#32cd32' : '#dc143c'}; border-radius: 8px; padding: 20px; background: rgba(${isSuccess ? '50, 205, 50' : '220, 20, 60'}, 0.1);">
            <h3 style="color: ${isSuccess ? '#32cd32' : '#dc143c'}; text-align: center;">
                ${isSuccess ? '✅ Success!' : '❌ Failure!'}
            </h3>
            <p style="margin: 15px 0; text-align: center; font-size: 1.1em;">${resultText}</p>
        </div>
    `;
    
    actions.innerHTML = `
        <div style="text-align: center; margin-top: 20px;">
            <button onclick="resolveEvent()" style="padding: 12px 24px; font-size: 1.1em;">
                Continue Journey
            </button>
        </div>
    `;
    
    updateTravelDisplay();
}

function resolveEvent() {
    // Clear the current event
    gameState.travelState.currentEvent = null;
    
    // Return to normal travel
    showTravelOptions();
}

function arriveAtNewTown() {
    // Clean up travel phase
    const travelPhase = document.getElementById('travel-phase');
    if (travelPhase) {
        travelPhase.remove();
    }
    
    // Reset game state for new town
    gameState.townNumber++;
    gameState.daysSinceLastMove = 0;
    gameState.bannedFromTown = false;
    gameState.reputation = 'Neutral'; // Reset reputation in new town
    gameState.day++;
    gameState.currentPhase = 'day';
    gameState.gatheredInfo = [];
    gameState.knownCharacters = {}; // Fresh start with new people
    gameState.visitedLocations = [];
    gameState.conversationsUsed = 0;
    gameState.talkedToToday = [];
    gameState.storyChoices = { act1: null, act2: null, act3: null };
    gameState.storyCharacters = null;
    gameState.act1ChoiceData = {};
    gameState.eveningAudience = [];
    gameState.audienceReactions = [];
    
    // Generate new town
    locations = generateLocations();
    
    // Show day phase
    document.getElementById('day-phase').classList.remove('hidden');
    
    // Update UI
    updateUI();

}

function nextDay() {
    // Deduct inn cost
    gameState.gold -= gameState.innCostPerNight;
    
    // Check all lose conditions
    if (checkLoseConditions()) {
        return; // Game over screen already shown
    }
    
    gameState.day++;
    gameState.daysSinceLastMove++; // Track how long we've been in this town
    gameState.currentPhase = 'day';
    gameState.gatheredInfo = []; // Reset daily info
    // Keep knownCharacters persistent - don't reset!
    gameState.visitedLocations = [];
    gameState.conversationsUsed = 0;
    gameState.talkedToToday = [];
    gameState.storyChoices = { act1: null, act2: null, act3: null };
    gameState.storyCharacters = null; // Clear story characters for new story
    gameState.act1ChoiceData = {}; // Clear Act 1 choice data
    gameState.eveningAudience = []; // Clear last night's audience
    gameState.audienceReactions = []; // Clear last night's reactions
    
    // Reset UI
    document.getElementById('night-phase').classList.add('hidden');
    document.getElementById('day-phase').classList.remove('hidden');
    
    // Clear story crafting
    ['act1', 'act2', 'act3'].forEach(act => {
        document.getElementById(`${act}-choices`).innerHTML = '';
        document.getElementById(`${act}-selected`).innerHTML = '';
    });
    document.getElementById('story-preview-text').innerHTML = '';
    
    // Check win condition
    if (gameState.gold >= gameState.retirementGoal) {
        showWinScreen();
    } else {
        updateUI();
        
        // Show inn cost notification
        showInnCostNotification();
    }
}

function showWinScreen() {
    document.querySelector('.game-main').innerHTML = `
        <div class="text-center">
            <h2 style="color: #daa520; font-size: 2.5em; margin-bottom: 20px;">🎉 Congratulations! 🎉</h2>
            <p style="font-size: 1.2em; margin-bottom: 20px;">You have successfully earned ${gameState.gold} gold and can now retire in comfort!</p>
            <p style="margin-bottom: 20px;">Your reputation as a bard: <strong>${gameState.reputation}</strong></p>
            <p style="margin-bottom: 30px;">You completed your journey in ${gameState.day} days, telling tales that shaped the world around you.</p>
            <button onclick="resetGame()" style="font-size: 1.2em; padding: 15px 30px;">🎭 Play Again</button>
        </div>
    `;
}

function checkLoseConditions() {
    // 1. DEATH - Health reaches 0
    if (gameState.health <= 0) {
        gameState.gameOverReason = 'death';
        showGameOverScreen();
        return true;
    }
    
    // 2. BANKRUPTCY - No gold and can't afford inn for multiple days
    if (gameState.gold < gameState.innCostPerNight * 2) {
        // Give player a chance if they just ran out
        if (gameState.gold < 0 || (gameState.gold < gameState.innCostPerNight && gameState.warningsGiven >= 2)) {
            gameState.gameOverReason = 'bankruptcy';
            showGameOverScreen();
            return true;
        } else if (gameState.gold < gameState.innCostPerNight) {
            gameState.warningsGiven++;
        }
    }
    
    // 3. EXILE - Reputation too damaged to perform
    const exileReputations = ['Notorious', 'Hated'];
    if (exileReputations.includes(gameState.reputation) && gameState.consecutiveBadPerformances >= 3) {
        gameState.gameOverReason = 'exile';
        showGameOverScreen();
        return true;
    }
    
    // 4. EXILE - Too many consecutive bad performances (kicked out of town)
    if (gameState.consecutiveBadPerformances >= 5) {
        gameState.gameOverReason = 'exile_performance';
        showGameOverScreen();
        return true;
    }
    
    return false;
}

function trackPerformanceQuality(effectiveness) {
    // Track consecutive bad performances for exile condition
    if (effectiveness < 40) {
        gameState.consecutiveBadPerformances++;
        console.log(`Bad performance! Consecutive: ${gameState.consecutiveBadPerformances}`);
    } else if (effectiveness >= 60) {
        // Good performance resets the counter
        gameState.consecutiveBadPerformances = 0;
    }
    // Mediocre performances (40-59) don't reset but don't add either
}

function checkLoseConditionWarnings(consequences) {
    // Health warnings
    if (gameState.health <= 30 && gameState.health > 0) {
        consequences.push(`⚠️ <span style="color: #dc143c;">Your health is dangerously low! Seek medicine or rest before traveling.</span>`);
    }
    
    // Bankruptcy warnings  
    if (gameState.gold < gameState.innCostPerNight * 3 && gameState.gold >= gameState.innCostPerNight) {
        consequences.push(`💸 <span style="color: #ffa500;">Warning: You're running low on gold! Only ${Math.floor(gameState.gold / gameState.innCostPerNight)} nights of lodging remaining.</span>`);
    }
    
    // Performance warnings
    if (gameState.consecutiveBadPerformances >= 3) {
        consequences.push(`👎 <span style="color: #dc143c;">Danger! ${gameState.consecutiveBadPerformances} consecutive bad performances. Towns may start banning you!</span>`);
    } else if (gameState.consecutiveBadPerformances >= 2) {
        consequences.push(`⚠️ <span style="color: #ffa500;">Caution: ${gameState.consecutiveBadPerformances} bad performances in a row. Improve your storytelling!</span>`);
    }
    
    // Reputation warnings
    const dangerousReps = ['Disliked', 'Hated', 'Notorious'];
    if (dangerousReps.includes(gameState.reputation)) {
        consequences.push(`😠 <span style="color: #dc143c;">Your poor reputation is making life difficult. A few more bad performances could mean exile!</span>`);
    }
}

function showGameOverScreen() {
    const gameOverContent = {
        'death': {
            icon: '💀',
            title: 'Death on the Road',
            message: 'Your health has failed you during your dangerous travels as a bard.',
            quote: '"Even the greatest stories must come to an end..."',
            color: '#8b0000'
        },
        'bankruptcy': {
            icon: '💸',
            title: 'Broke and Homeless', 
            message: 'You\'ve run out of gold and can no longer afford lodging or travel.',
            quote: '"A bard without coin is just a wanderer with stories..."',
            color: '#dc143c'
        },
        'exile': {
            icon: '🚪',
            title: 'Exiled from Society',
            message: 'Your terrible reputation has made you unwelcome in all civilized places.',
            quote: '"When no one will listen, a bard\'s voice falls silent..."',
            color: '#4b0082'
        },
        'exile_performance': {
            icon: '👎',
            title: 'Driven Out by Angry Crowds',
            message: 'Too many awful performances have turned every town against you.',
            quote: '"The audience has spoken, and they want you gone..."',
            color: '#b22222'
        }
    };
    
    const reason = gameState.gameOverReason || 'bankruptcy';
    const content = gameOverContent[reason];
    
    document.querySelector('.game-main').innerHTML = `
        <div class="text-center">
            <h2 style="color: ${content.color}; font-size: 2.5em; margin-bottom: 20px;">${content.icon} ${content.title} ${content.icon}</h2>
            <p style="font-size: 1.2em; margin-bottom: 20px;">${content.message}</p>
            <div style="background: rgba(0,0,0,0.3); border-radius: 10px; padding: 15px; margin: 20px 0;">
                <p style="margin-bottom: 15px;">📊 <strong>Final Statistics:</strong></p>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; text-align: left;">
                    <div>Days survived: <strong>${gameState.day}</strong></div>
                    <div>Towns visited: <strong>${gameState.townNumber}</strong></div>
                    <div>Final gold: <strong>${Math.max(0, gameState.gold)}</strong></div>
                    <div>Health: <strong>${gameState.health}</strong></div>
                    <div>Reputation: <strong>${gameState.reputation}</strong></div>
                    <div>Retirement goal: <strong>${gameState.retirementGoal}</strong></div>
                </div>
            </div>
            <p style="margin-bottom: 30px; font-style: italic; color: ${content.color};">${content.quote}</p>
            <button onclick="resetGame()" style="font-size: 1.2em; padding: 15px 30px;">🎭 Try Again</button>
        </div>
    `;
}

function showInnCostNotification() {
    const notification = document.createElement('div');
    notification.innerHTML = `
        <div style="position: fixed; top: 20px; right: 20px; background: linear-gradient(45deg, #8b4513 0%, #a0522d 100%); 
                    color: #f4e4c1; padding: 15px 20px; border-radius: 8px; border: 2px solid #daa520; 
                    box-shadow: 0 4px 8px rgba(0,0,0,0.3); z-index: 1001; font-weight: bold;">
            🏨 Paid ${gameState.innCostPerNight} gold for lodging
        </div>
    `;
    
    document.body.appendChild(notification);
    
    // Remove notification after 3 seconds
    setTimeout(() => {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
    }, 3000);
}

function checkLowGoldWarning() {
    const goldAfterInn = gameState.gold - gameState.innCostPerNight;
    const restBtn = document.getElementById('rest-btn');
    
    if (goldAfterInn < 0) {
        // Player can't afford the inn
        restBtn.style.background = 'linear-gradient(45deg, #8B0000 0%, #DC143C 100%)';
        restBtn.innerHTML = `💸 Rest for the Night (${gameState.innCostPerNight} gold) - WARNING: Can't Afford!`;
    } else if (goldAfterInn < gameState.innCostPerNight * 3) {
        // Player is running low on gold (less than 3 nights remaining)
        restBtn.style.background = 'linear-gradient(45deg, #FF4500 0%, #FF6347 100%)';
        restBtn.innerHTML = `🌅 Rest for the Night (${gameState.innCostPerNight} gold) - Low Gold Warning!`;
    } else {
        // Normal state
        restBtn.style.background = 'linear-gradient(45deg, #8b4513 0%, #a0522d 100%)';
        restBtn.innerHTML = `🌅 Rest for the Night (${gameState.innCostPerNight} gold)`;
    }
}

function resetGame() {
    gameState = {
        gold: 500,
        day: 1,
        reputation: 'Neutral',
        retirementGoal: 10000,
        currentPhase: 'day',
        gatheredInfo: [],
        knownCharacters: {},
        visitedLocations: [],
        conversationsUsed: 0,
        maxConversationsPerDay: 4,
        talkedToToday: [],
        innCostPerNight: 5,
        storyChoices: {
            act1: null,
            act2: null,
            act3: null
        },
        storyCharacters: null,
        act1ChoiceData: {},
        consequences: [],
        townHistory: [],
        eveningAudience: [],
        audienceReactions: [],
        // Inventory and travel system
        inventory: {
            provisions: 0,
            bodyguards: 0,
            medicine: 0,
            wagons: 0,
            horses: 0
        },
        townNumber: 1,
        daysSinceLastMove: 0,
        bannedFromTown: false,
        travelDanger: 50,
        // Lose condition tracking
        health: 100,
        consecutiveBadPerformances: 0,
        gameOverReason: null,
        warningsGiven: 0
    };
    
    // Generate new random characters for the fresh game
    locations = generateLocations();
    
    // Reset HTML
    location.reload();
}

// Welcome Screen and Instructions System
function showWelcomeScreen() {
    document.getElementById('welcome-modal').classList.remove('hidden');
}

function startGame() {
    document.getElementById('welcome-modal').classList.add('hidden');
}

function showInstructions() {
    // Hide welcome screen if it's open
    document.getElementById('welcome-modal').classList.add('hidden');
    
    // Show instructions
    document.getElementById('instructions-modal').classList.remove('hidden');
    loadInstructionsContent();
}

function closeInstructions() {
    document.getElementById('instructions-modal').classList.add('hidden');
}

function loadInstructionsContent() {
    const instructionsContent = document.getElementById('instructions-content');
    
    instructionsContent.innerHTML = `
        <div style="line-height: 1.6;">
            <section style="margin-bottom: 25px;">
                <h3 style="color: #daa520; border-bottom: 2px solid #8b4513; padding-bottom: 8px;">🎯 Game Objective</h3>
                <p>Earn <strong>${gameState.retirementGoal.toLocaleString()} gold</strong> to retire comfortably! Each night costs ${gameState.innCostPerNight} gold for lodging (varies by town), and poor reputation can get you chased from town.</p>
            </section>

            <section style="margin-bottom: 25px;">
                <h3 style="color: #daa520; border-bottom: 2px solid #8b4513; padding-bottom: 8px;">🌅 Daily Phase - Gathering Information</h3>
                <ul style="margin: 10px 0; padding-left: 20px;">
                    <li><strong>Visit Locations:</strong> Click on taverns, markets, stores, and government buildings</li>
                    <li><strong>Talk to NPCs:</strong> You have 4 conversations per day - choose wisely!</li>
                    <li><strong>Gather Information:</strong> Learn <em>confirmed facts</em>, <em>mysterious rumors</em>, or collect gossip</li>
                    <li><strong>Build Relationships:</strong> Talking to the same people improves your relationship (acquaintance → friend → confidant)</li>
                    <li><strong>Shop for Supplies:</strong> Visit the 🛒 store to buy provisions, bodyguards, and travel equipment</li>
                </ul>
            </section>

            <section style="margin-bottom: 25px;">
                <h3 style="color: #daa520; border-bottom: 2px solid #8b4513; padding-bottom: 8px;">🌙 Evening Phase - Crafting Stories</h3>
                <ul style="margin: 10px 0; padding-left: 20px;">
                    <li><strong>Check Your Audience:</strong> Each patron has preferences for truth level, themes, and tone</li>
                    <li><strong>Choose Act I Setting:</strong> Pick from industrial, market, tavern, or government themes</li>
                    <li><strong>Choose Truth Level:</strong> 
                        <ul style="margin: 5px 0 5px 20px;">
                            <li><em>Confirmed:</em> Truth-lovers enjoy these, fantasy-lovers find them boring</li>
                            <li><em>Rumored:</em> Mystery-lovers enjoy ambiguous tales</li>
                            <li><em>Made-Up:</em> Fantasy-lovers enjoy creativity, truth-lovers get offended</li>
                        </ul>
                    </li>
                    <li><strong>Choose Act II & III:</strong> Select adventure/discovery/conflict and triumph/tragedy/change</li>
                    <li><strong>Watch the Preview:</strong> See how your story comes together with character names</li>
                </ul>
            </section>

            <section style="margin-bottom: 25px;">
                <h3 style="color: #daa520; border-bottom: 2px solid #8b4513; padding-bottom: 8px;">🎭 Performance & Reputation</h3>
                <div style="background: rgba(139, 69, 19, 0.2); padding: 15px; border-radius: 8px; margin: 10px 0;">
                    <p><strong>Patron Reactions:</strong></p>
                    <ul style="margin: 8px 0; padding-left: 20px;">
                        <li>😍 <strong>Love your story:</strong> Applaud enthusiastically, tip generously</li>
                        <li>😊 <strong>Enjoy your story:</strong> Nod approvingly, decent tips</li>
                        <li>😐 <strong>Tolerate your story:</strong> Listen politely, small tips</li>
                        <li>😠 <strong>Dislike your story:</strong> Frown and complain</li>
                        <li>🤬 <strong>Hate your story:</strong> Storm out angrily, spread bad word</li>
                    </ul>
                </div>
                
                <p><strong>Reputation Levels:</strong> Terrible → Poor → Neutral → Decent → Good → Great → Legendary</p>
                <p style="color: #ffa500;"><strong>Reputation affects:</strong> Store prices, patron patience, and whether you get chased out!</p>
            </section>

            <section style="margin-bottom: 25px;">
                <h3 style="color: #daa520; border-bottom: 2px solid #8b4513; padding-bottom: 8px;">🛤️ Travel Between Towns</h3>
                <div style="background: rgba(220, 20, 60, 0.1); border: 2px solid #dc143c; padding: 15px; border-radius: 8px; margin: 10px 0;">
                    <p><strong>⚠️ When You're Chased Out:</strong></p>
                    <ul style="margin: 8px 0; padding-left: 20px;">
                        <li><strong>Terrible Reputation:</strong> Angry mob after 2 days</li>
                        <li><strong>Poor Reputation:</strong> Mayor asks you to leave after 5 days</li>
                    </ul>
                </div>
                
                <p><strong>Oregon Trail-Style Travel:</strong></p>
                <ul style="margin: 10px 0; padding-left: 20px;">
                    <li><strong>Choose Your Pace:</strong> Slow (safe), Normal (balanced), Fast (risky)</li>
                    <li><strong>Manage Supplies:</strong> Provisions feed you, bodyguards protect you, medicine heals you</li>
                    <li><strong>Face Random Events:</strong> Bandit attacks, river crossings, wild animals, fellow travelers</li>
                    <li><strong>Make Tough Choices:</strong> Each event offers multiple responses with different risks</li>
                    <li><strong>Track Your Health:</strong> Excellent → Good → Fair → Poor → Critical</li>
                </ul>
            </section>

            <section style="margin-bottom: 25px;">
                <h3 style="color: #daa520; border-bottom: 2px solid #8b4513; padding-bottom: 8px;">🛒 Store & Supplies</h3>
                <ul style="margin: 10px 0; padding-left: 20px;">
                    <li>🥖 <strong>Provisions (15g):</strong> Food for 3 days of travel</li>
                    <li>⚔️ <strong>Bodyguards (50g):</strong> One-time protection during events</li>
                    <li>💊 <strong>Medicine (25g):</strong> Heal sickness and injuries</li>
                    <li>🛒 <strong>Wagon (200g):</strong> Permanent upgrade - carry more supplies</li>
                    <li>🐎 <strong>Horse (300g):</strong> Permanent upgrade - travel faster and safer</li>
                </ul>
                <p style="color: #ffa500;"><em>Tip: Better reputation = lower prices! Stock up before your reputation gets too bad.</em></p>
            </section>

            <section>
                <h3 style="color: #daa520; border-bottom: 2px solid #8b4513; padding-bottom: 8px;">💡 Strategy Tips</h3>
                <ul style="margin: 10px 0; padding-left: 20px;">
                    <li><strong>Know Your Audience:</strong> Match story types to patron preferences</li>
                    <li><strong>Build Relationships:</strong> Friends and confidants are more forgiving and tip better</li>
                    <li><strong>Plan Ahead:</strong> Buy supplies before your reputation gets too low</li>
                    <li><strong>Balance Risk:</strong> Made-up stories can create amazing reactions or terrible disasters</li>
                    <li><strong>Save Money:</strong> You need ${gameState.retirementGoal.toLocaleString()} gold, but also funds for daily expenses and travel (aim for 12-20 successful performances)</li>
                </ul>
            </section>
        </div>
    `;
}

// Initialize game when page loads
window.onload = initGame; 