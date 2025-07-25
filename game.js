window.showTab = function(tab) {
    console.log('showTab called with:', tab);
    document.getElementById('tab-phase').style.display = 'none';
    document.getElementById('tab-info').style.display = 'none';
    document.getElementById('tab-rumor').style.display = 'none';
    document.getElementById('tab-events').style.display = 'none';
    document.getElementById('tab-phase-btn').classList.remove('active');
    document.getElementById('tab-info-btn').classList.remove('active');
    document.getElementById('tab-rumor-btn').classList.remove('active');
    document.getElementById('tab-events-btn').classList.remove('active');
    if (tab === 'phase') {
        document.getElementById('tab-phase').style.display = '';
        document.getElementById('tab-phase-btn').classList.add('active');
    } else if (tab === 'info') {
        document.getElementById('tab-info').style.display = '';
        document.getElementById('tab-info-btn').classList.add('active');
        console.log('Info tab shown, calling updateUI to refresh character cards');
        // Refresh the UI when showing info tab to ensure event handlers are properly attached
        updateUI();
    } else if (tab === 'rumor') {
        document.getElementById('tab-rumor').style.display = '';
        document.getElementById('tab-rumor-btn').classList.add('active');
    } else if (tab === 'events') {
        document.getElementById('tab-events').style.display = '';
        document.getElementById('tab-events-btn').classList.add('active');
        console.log('Events tab shown, updating event log display');
        updateEventLogDisplay();
    }
};
if (typeof window !== 'undefined') {
    window.addEventListener('DOMContentLoaded', function() {
        window.showTab('phase');
    });
}

console.log('game.js loaded');

// Add a test event for demonstration (remove this in production)
function addTestEvent() {
    const testEvent = {
        type: 'character',
        title: 'Test Character Event',
        description: 'This is a test event to demonstrate the event log system working.',
        characters: ['Test Character']
    };
    addToEventLog(testEvent);
    console.log('Test event added to log');
}
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
    warningsGiven: 0, // Track warnings before exile
    // NEW: Story evolution system
    townStoryState: {}, // Track evolving state of story elements in current town
    // --- Living World System ---
    townEvents: [], // Array of events generated each night
    knownRumors: [], // Array of rumors the player has discovered
    eventLog: [], // Dwarf Fortress-style event log
    eventSeeds: [], // Seeds created from stories that influence future events
    // Bard consequence tracking
    availableOpportunities: [], // Special opportunities unlocked by events
    bardNotifications: [], // Positive story material and achievements
    bardWarnings: [], // Warnings about potential negative consequences
    pendingEventNotifications: [], // Notifications to show player about event impacts
    // --- Bard Storytelling Stats ---
    bardStats: {
        real: 1,
        rumor: 1,
        madeUp: 1
    }
};
function renderBardStats() {
    // Remove any old bard-stats div outside the header
    const oldStatsDiv = document.getElementById('bard-stats');
    if (oldStatsDiv && !oldStatsDiv.closest('.player-stats')) {
        oldStatsDiv.remove();
    }
    // Find the player-stats container in the header
    const statsContainer = document.querySelector('.player-stats');
    if (!statsContainer) return;
    let statsDiv = statsContainer.querySelector('#bard-stats');
    if (!statsDiv) {
        statsDiv = document.createElement('span');
        statsDiv.id = 'bard-stats';
        statsDiv.style.marginLeft = '18px';
        statsDiv.style.display = 'inline-block';
        statsDiv.style.verticalAlign = 'middle';
        statsContainer.appendChild(statsDiv);
    }
    statsDiv.innerHTML = `
        <span style="color:#ffe4b5; font-weight:bold;">🎵 Bard Skill:</span>
        <span style="color:#32cd32;">Real:</span> ${gameState.bardStats.real} &nbsp; 
        <span style="color:#ffa500;">Rumor:</span> ${gameState.bardStats.rumor} &nbsp; 
        <span style="color:#8ec6f8;">Made Up:</span> ${gameState.bardStats.madeUp}
        <span style="font-size:0.9em; color:#ccc; margin-left:8px;">(Higher skill = better at winning over skeptics)</span>
    `;
}
// --- CHARACTER-LOCATION COMPATIBILITY SYSTEM ---
const locationCompatibility = {
    // Define which character types can logically appear in which locations
    'Mine': {
        natural: ['Miner', 'Engineer', 'Foreman', 'Blacksmith', 'Merchant', 'Guard'],
        possible: ['Doctor', 'Priest', 'Mayor'], // Could visit for business
        unlikely: ['Innkeeper', 'Barmaid', 'Barkeep', 'Farmer', 'Butcher', 'Local Drunk', 'Serving wench'] // Would need special reason
    },
    'Market': {
        natural: ['Merchant', 'Farmer', 'Blacksmith', 'Baker', 'Tailor', 'Guard', 'Butcher'],
        possible: ['Mayor', 'Priest', 'Doctor', 'Miner', 'Innkeeper', 'Barmaid', 'Barkeep', 'Local Drunk', 'Farmer', 'Docks', 'Serving wench'], // Could be shopping/business
        unlikely: [] // Market is accessible to most people
    },
    'Tavern': {
        natural: ['Innkeeper', 'Barmaid', 'Barkeep', 'Merchant', 'Traveler', 'Guard', 'Farmer', 'Local Drunk', 'Serving wench', 'Traveling bard', 'Retired soldier', 'Tavern cook'],
        possible: ['Mayor', 'Priest', 'Doctor', 'Miner', 'Blacksmith', 'Butcher'], // Social visits
        unlikely: [] // Anyone could reasonably be in a tavern
    },
    'Church': {
        natural: ['Priest', 'Acolyte', 'Pilgrim'],
        possible: ['Mayor', 'Doctor', 'Farmer', 'Merchant', 'Innkeeper', 'Barmaid', 'Barkeep', 'Butcher', 'Local Drunk', 'Serving wench', 'Traveling bard', 'Retired soldier'], // Worship, meetings
        unlikely: [] // Anyone could attend church
    },
    'Town Hall': {
        natural: ['Mayor', 'Clerk', 'Guard', 'Tax Collector'],
        possible: ['Merchant', 'Priest', 'Doctor', 'Traveling bard'], // Official business
        unlikely: ['Barmaid', 'Innkeeper', 'Barkeep', 'Farmer', 'Butcher', 'Local Drunk', 'Serving wench'] // Unless in trouble or petitioning
    },
    'Farm': {
        natural: ['Farmer', 'Farmhand', 'Merchant', 'Veterinarian'],
        possible: ['Doctor', 'Priest', 'Mayor', 'Butcher', 'Traveling bard'], // Visits, inspections
        unlikely: ['Innkeeper', 'Barmaid', 'Barkeep', 'Miner', 'Local Drunk', 'Serving wench'] // No natural reason to be there
    },
    'Forest': {
        natural: ['Hunter', 'Ranger', 'Herbalist', 'Bandit'],
        possible: ['Doctor', 'Priest', 'Merchant', 'Traveling bard'], // Gathering herbs, pilgrimage, trade routes
        unlikely: ['Mayor', 'Innkeeper', 'Barmaid', 'Barkeep', 'Butcher', 'Local Drunk', 'Serving wench'] // Too dangerous/no reason
    },
    'Docks': {
        natural: ['Sailor', 'Fisherman', 'Merchant', 'Dock Worker', 'Captain'],
        possible: ['Mayor', 'Guard', 'Doctor', 'Innkeeper', 'Barmaid', 'Barkeep', 'Butcher', 'Local Drunk', 'Serving wench', 'Traveling bard', 'Retired soldier'], // Official business, emergencies, or trade
        unlikely: ['Priest', 'Farmer'] // Unless specific religious or trade reason
    },
    'Lighthouse': {
        natural: ['Lighthouse keeper', 'Sea captain', 'Dock Worker', 'Fisherman'],
        possible: ['Merchant', 'Sailor', 'Harbor master', 'Mayor', 'Traveling bard'],
        unlikely: ['Farmer', 'Priest', 'Innkeeper', 'Barmaid', 'Barkeep', 'Butcher', 'Local Drunk', 'Serving wench']
    },
    'Graveyard': {
        natural: ['Priest', 'Doctor', 'Farmer', 'Hunter', 'Ranger', 'Guard'],
        possible: ['Traveling bard'],
        unlikely: []
    },
    'School': {
        natural: ['Teacher', 'Student', 'Principal', 'Janitor', 'Counselor'],
        possible: ['Traveling bard'],
        unlikely: []
    }
};

function getValidLocationsForCharacter(targetAudience) {
    // Handle the 'general' audience case: allow all actual locations in the current town
    if (targetAudience === 'general') {
        // Exclude metadata keys like townInfo and allNPCs
        const townLocations = Object.keys(locations).filter(key => !['townInfo', 'allNPCs'].includes(key));
        return townLocations.map(locationKey => ({
            key: locationKey,
            name: locations[locationKey].name,
            compatibility: 'possible',
            description: locations[locationKey].description || 'A setting that could inspire the whole crowd.'
        }));
    }
    if (!targetAudience || !targetAudience.character) return [];
    
    // Normalize profession for matching
    const profession = (targetAudience.character.profession || '').toLowerCase().trim();
    const validLocations = [];
    
    // Get all available locations in town
    const townLocations = ['Mine', 'Market', 'Tavern', 'Church', 'Town Hall', 'Farm', 'Forest', 'Docks', 'Lighthouse', 'Graveyard', 'School'];
    
    console.log('DEBUG: Checking locations for profession:', profession);
    
    townLocations.forEach(location => {
        const compatibility = locationCompatibility[location];
        if (!compatibility) return;
        
        let compatibilityLevel = 'none';
        // Normalize all entries for comparison
        const norm = arr => (arr || []).map(x => x.toLowerCase().trim());
        const nat = norm(compatibility.natural);
        const pos = norm(compatibility.possible);
        const unlik = norm(compatibility.unlikely);
        console.log(`  Location: ${location}`);
        console.log('    natural:', nat);
        console.log('    possible:', pos);
        console.log('    unlikely:', unlik);
        if (nat.includes(profession)) {
            compatibilityLevel = 'natural';
        } else if (pos.includes(profession)) {
            compatibilityLevel = 'possible';
        } else if (unlik.includes(profession)) {
            compatibilityLevel = 'unlikely';
        }
        
        if (compatibilityLevel !== 'none') {
            validLocations.push({
                name: location,
                compatibility: compatibilityLevel,
                description: getLocationDescription(location, targetAudience.character.profession, compatibilityLevel)
            });
        }
    });
    
    console.log('  => validLocations:', validLocations);
    
    // Sort by compatibility (natural first, then possible, then unlikely)
    validLocations.sort((a, b) => {
        const order = { 'natural': 0, 'possible': 1, 'unlikely': 2 };
        return order[a.compatibility] - order[b.compatibility];
    });
    
    return validLocations;
}

function getLocationDescription(location, profession, compatibility) {
    const descriptions = {
        'Mine': {
            'natural': 'A familiar workplace where your character would naturally be found',
            'possible': 'A place your character might visit for business or inspection',
            'unlikely': 'An unusual but possible location for your character to appear'
        },
        'Market': {
            'natural': 'The heart of commerce where your character belongs',
            'possible': 'A place your character might visit for shopping or business',
            'unlikely': 'An uncommon but feasible location for your character'
        },
        'Tavern': {
            'natural': 'A social hub where your character would feel at home',
            'possible': 'A place your character might visit for relaxation or meetings',
            'unlikely': 'A location your character could visit, though uncommon'
        },
        'Church': {
            'natural': 'A sacred space where your character serves or worships',
            'possible': 'A place your character might visit for prayer or community',
            'unlikely': 'A location your character could visit, though rarely'
        },
        'Town Hall': {
            'natural': 'The seat of power where your character works or has authority',
            'possible': 'A place your character might visit for official business',
            'unlikely': 'A location your character might visit if summoned or petitioning'
        },
        'Farm': {
            'natural': 'Rural lands where your character lives and works',
            'possible': 'A place your character might visit for trade or assistance',
            'unlikely': 'A location your character could visit, though uncommon'
        },
        'Forest': {
            'natural': 'Wild lands where your character feels most comfortable',
            'possible': 'A place your character might venture for resources or travel',
            'unlikely': 'A dangerous location your character would rarely visit'
        },
        'Docks': {
            'natural': 'Waterfront areas where your character works and thrives',
            'possible': 'A place your character might visit for trade or transport',
            'unlikely': 'A location your character could visit, though uncommon'
        },
        'Lighthouse': {
            'natural': 'A towering beacon that guides ships safely to harbor',
            'possible': 'A place your character might visit for work or leisure',
            'unlikely': 'A location your character would not normally frequent'
        },
        'Graveyard': {
            'natural': 'A quiet and peaceful place where the dead are laid to rest',
            'possible': 'A place your character might visit for reflection or solitude',
            'unlikely': 'A location your character would not normally visit'
        },
        'School': {
            'natural': 'A place of learning and education',
            'possible': 'A place your character might visit for study or teaching',
            'unlikely': 'A location your character would not normally visit'
        }
    };
    
    return descriptions[location]?.[compatibility] || 'A location where your character might appear';
}

// --- GENERIC STORY CHARACTER SYSTEM ---
// Instead of using real townspeople as story subjects, use generic archetypes
// Real townspeople are selected as TARGET AUDIENCE for inspiration

const genericStoryCharacters = {
    protagonist: {
        industrial: [
            "a determined miner", "a skilled craftsperson", "a hardworking laborer", 
            "a seasoned dock worker", "a brave mill worker", "a resourceful engineer"
        ],
        market: [
            "a young merchant", "a ambitious trader", "a clever baker", 
            "a honest shopkeeper", "a traveling vendor", "a skilled artisan"
        ],
        tavern: [
            "a charismatic storyteller", "a wise barkeeper", "a friendly innkeeper", 
            "a wandering musician", "a local regular", "a mysterious traveler"
        ],
        government: [
            "a dedicated clerk", "a honest official", "a reform-minded citizen", 
            "a brave whistleblower", "a principled leader", "a concerned taxpayer"
        ],
        coastal: [
            "a seasoned sailor", "a skilled fisherman", "a brave lighthouse keeper", 
            "a weathered captain", "a resourceful dock worker", "a wise harbor master"
        ],
        agricultural: [
            "a hardworking farmer", "a wise landowner", "a dedicated miller", 
            "a seasonal worker", "a crop inspector", "a livestock handler"
        ]
    },
    supporting: {
        universal: [
            "a trusted friend", "a wise mentor", "a loyal companion", 
            "a helpful neighbor", "a family member", "a fellow worker",
            "a kind stranger", "an old ally", "a supportive partner"
        ]
    },
    antagonist: {
        universal: [
            "a corrupt official", "a greedy merchant", "a ruthless competitor", 
            "a dishonest authority", "a selfish rival", "a power-hungry leader",
            "a scheming opponent", "a jealous peer", "a tyrannical boss"
        ]
    }
};

// Generate generic story characters based on theme
function generateGenericStoryCharacters(theme, targetAudience = null) {
    const protagonist = randomChoice(genericStoryCharacters.protagonist[theme] || genericStoryCharacters.protagonist.industrial);
    const supporting = randomChoice(genericStoryCharacters.supporting.universal);
    const antagonist = randomChoice(genericStoryCharacters.antagonist.universal);
    
    return {
        protagonist: { name: protagonist, isGeneric: true },
        supportingChar: { name: supporting, isGeneric: true },
        antagonist: { name: antagonist, isGeneric: true },
        townInfo: (locations && locations.townInfo) ? locations.townInfo : { name: 'this town', type: 'mining' },
        // Store target audience for inspiration mechanics
        targetAudience: targetAudience
    };
}

// --- STORY EVOLUTION SYSTEM ---
function evolveStoryElements(townType) {
    if (!gameState.townStoryState.elements) {
        // Initialize town story state on first day
        initializeTownStoryState(townType);
        return;
    }

    const elements = gameState.townStoryState.elements;
    
    // Natural progression rules:
    // 1. Some rumors become confirmed (20% chance each day)
    // 2. Some confirmed facts become "old news" and fade (10% chance)
    // 3. New rumors occasionally appear (30% chance of 1-2 new rumors)
    // 4. Very rarely, old rumors are disproven and become "debunked" (5% chance)

    elements.forEach(element => {
        if (element.currentType === 'rumored' && Math.random() < 0.2) {
            // Rumor becomes confirmed
            element.currentType = 'confirmed';
            element.evolutionHistory.push(`Day ${gameState.day}: Rumor confirmed`);
        } else if (element.currentType === 'confirmed' && Math.random() < 0.1) {
            // Confirmed fact becomes old news
            element.currentType = 'old_news';
            element.evolutionHistory.push(`Day ${gameState.day}: Became old news`);
        } else if (element.currentType === 'rumored' && Math.random() < 0.05) {
            // Rumor is debunked
            element.currentType = 'debunked';
            element.evolutionHistory.push(`Day ${gameState.day}: Rumor debunked`);
        }
    });

    // Add new rumors occasionally
    if (Math.random() < 0.3) {
        const newRumorCount = Math.random() < 0.7 ? 1 : 2;
        for (let i = 0; i < newRumorCount; i++) {
            addNewRumor(townType);
        }
    }
}

function initializeTownStoryState(townType) {
    gameState.townStoryState = {
        elements: [],
        townType: townType,
        dayInitialized: gameState.day
    };

    // Initialize with base story elements
    const townSpecificStories = storyElementsByTownType[townType] || {};
    const universalStories = universalStoryElements;

    // Add town-specific elements
    Object.keys(townSpecificStories).forEach(categoryKey => {
        const category = townSpecificStories[categoryKey];
        category.texts.forEach(text => {
            gameState.townStoryState.elements.push({
                id: `${categoryKey}_${Date.now()}_${Math.random()}`,
                originalText: text,
                originalType: category.type,
                currentType: category.type,
                category: categoryKey,
                dayAdded: gameState.day,
                evolutionHistory: [`Day ${gameState.day}: Initial story element`]
            });
        });
    });

    // Add universal elements
    Object.keys(universalStories).forEach(categoryKey => {
        const category = universalStories[categoryKey];
        category.texts.forEach(text => {
            gameState.townStoryState.elements.push({
                id: `universal_${categoryKey}_${Date.now()}_${Math.random()}`,
                originalText: text,
                originalType: category.type,
                currentType: category.type,
                category: `universal_${categoryKey}`,
                dayAdded: gameState.day,
                evolutionHistory: [`Day ${gameState.day}: Initial story element`]
            });
        });
    });
}

function addNewRumor(townType) {
    const newRumorTemplates = [
        "Strange lights were seen near the old mill last night",
        "A merchant claims to have seen unusual tracks on the road",
        "Someone heard singing coming from the empty house on the hill",
        "The baker's cat has been acting strangely all week",
        "A traveling scholar asked odd questions about the town's history",
        "Children report finding unusual stones by the river",
        "The weather has been unseasonably calm lately",
        "A stranger was seen sketching buildings in the town square",
        "The local dogs have been howling at nothing",
        "Someone claims the well water tastes different"
    ];

    const newRumorText = randomChoice(newRumorTemplates);
    gameState.townStoryState.elements.push({
        id: `new_rumor_${Date.now()}_${Math.random()}`,
        originalText: newRumorText,
        originalType: 'rumored',
        currentType: 'rumored',
        category: 'emerging_rumors',
        dayAdded: gameState.day,
        evolutionHistory: [`Day ${gameState.day}: New rumor emerged`]
    });
}

// --- NIGHTLY EVENTS SYSTEM ---
const eventTypes = {
    character: {
        name: "Character Event",
        icon: "👤",
        color: "#6495ed"
    },
    town: {
        name: "Town Event", 
        icon: "🏘️",
        color: "#daa520"
    },
    mystery: {
        name: "Mystery Event",
        icon: "🔍",
        color: "#9370db"
    },
    consequence: {
        name: "Story Consequence",
        icon: "📚",
        color: "#ff6347"
    },
    economic: {
        name: "Economic Event",
        icon: "💰",
        color: "#228b22"
    },
    social: {
        name: "Social Event",
        icon: "👥",
        color: "#ff69b4"
    },
    political: {
        name: "Political Event",
        icon: "🏛️",
        color: "#4169e1"
    },
    natural: {
        name: "Natural Event",
        icon: "🌿",
        color: "#32cd32"
    },
    seasonal: {
        name: "Seasonal Event",
        icon: "🍂",
        color: "#cd853f"
    },
    demographic: {
        name: "Population Event",
        icon: "👨‍👩‍👧‍👦",
        color: "#20b2aa"
    }
};

// Event templates for generation
const nightlyEventTemplates = {
    character: {
        // Events affecting individual NPCs
        career_change: {
            weight: 5,
            generate: (townInfo, npcs, storyConsequences) => {
                const eligibleNPCs = npcs.filter(npc => 
                    npc.character.psychologicalProfile && 
                    ['dissatisfied', 'ambitious', 'restless'].includes(npc.character.psychologicalProfile.emotionalState)
                );
                if (eligibleNPCs.length === 0) return null;
                
                const npc = randomChoice(eligibleNPCs);
                const newProfessions = ['Merchant', 'Guard', 'Farmer', 'Priest', 'Doctor'];
                const newProfession = randomChoice(newProfessions.filter(p => p !== npc.character.profession));
                
                return {
                    type: 'character',
                    title: `${npc.name} Changes Career`,
                    description: `${npc.name} has decided to leave their job as a ${npc.character.profession} and become a ${newProfession}. ${
                        storyConsequences.some(c => c.includes(npc.name)) 
                            ? "Your recent story about them seems to have inspired this change."
                            : "They've been contemplating this change for some time."
                    }`,
                    characters: [npc.name],
                    effects: () => {
                        npc.character.profession = newProfession;
                        if (gameState.knownCharacters[npc.name]) {
                            gameState.knownCharacters[npc.name].character.profession = newProfession;
                        }
                    }
                };
            }
        },
        
        relationship_change: {
            weight: 8,
            generate: (townInfo, npcs, storyConsequences) => {
                // Find NPCs with relationships that could change
                const eligiblePairs = [];
                npcs.forEach(npc1 => {
                    if (npc1.character.relationships) {
                        npc1.character.relationships.forEach(rel => {
                            const npc2 = npcs.find(n => n.name === rel.targetName);
                            if (npc2 && rel.intensity >= 2) {
                                eligiblePairs.push({ npc1, npc2, relationship: rel });
                            }
                        });
                    }
                });
                
                if (eligiblePairs.length === 0) return null;
                
                const pair = randomChoice(eligiblePairs);
                const relationshipTypes = ['friend', 'rival', 'business_partner', 'romantic_interest'];
                const changeTypes = ['strengthen', 'weaken', 'change_nature'];
                const changeType = randomChoice(changeTypes);
                
                let description = "";
                if (changeType === 'strengthen') {
                    description = `${pair.npc1.name} and ${pair.npc2.name} have grown closer. Their ${pair.relationship.relationshipType} relationship has deepened.`;
                } else if (changeType === 'weaken') {
                    description = `${pair.npc1.name} and ${pair.npc2.name} have had a falling out. Their relationship has become strained.`;
                } else {
                    const newType = randomChoice(relationshipTypes.filter(t => t !== pair.relationship.relationshipType));
                    description = `The relationship between ${pair.npc1.name} and ${pair.npc2.name} has evolved from ${pair.relationship.relationshipType} to ${newType}.`;
                }
                
                return {
                    type: 'character',
                    title: `Relationship Change: ${pair.npc1.name} & ${pair.npc2.name}`,
                    description: description,
                    characters: [pair.npc1.name, pair.npc2.name],
                    effects: () => {
                        // Update the relationship data
                        if (changeType === 'strengthen') {
                            pair.relationship.intensity = Math.min(5, pair.relationship.intensity + 1);
                            pair.relationship.quality = pair.relationship.quality === 'hostile' ? 'neutral' : 'positive';
                        } else if (changeType === 'weaken') {
                            pair.relationship.intensity = Math.max(1, pair.relationship.intensity - 1);
                            pair.relationship.quality = pair.relationship.quality === 'positive' ? 'neutral' : 'hostile';
                        }
                    }
                };
            }
        }
    },
    
    town: {
        economic_shift: {
            weight: 6,
            generate: (townInfo, npcs, storyConsequences) => {
                const economicEvents = [
                    {
                        title: 'Trade Route Established',
                        description: `A new trade route has been established through ${townInfo.name}, bringing increased commerce and opportunity.`,
                        effects: () => {
                            // Lower inn costs slightly
                            gameState.innCostPerNight = Math.max(3, gameState.innCostPerNight - 1);
                        }
                    },
                    {
                        title: 'Market Day Success',
                        description: `The weekly market day was particularly successful, with merchants reporting increased sales and new customers.`,
                        effects: () => {
                            // Increase NPC mood slightly
                            npcs.forEach(npc => {
                                if (npc.character.profession.toLowerCase().includes('merchant')) {
                                    if (npc.character.psychologicalProfile) {
                                        npc.character.psychologicalProfile.emotionalState = 'optimistic';
                                    }
                                }
                            });
                        }
                    },
                    {
                        title: 'Resource Shortage',
                        description: `Supplies are running low in ${townInfo.name}. Merchants are having trouble restocking their goods.`,
                        effects: () => {
                            // Increase inn costs
                            gameState.innCostPerNight += 1;
                        }
                    }
                ];
                
                const event = randomChoice(economicEvents);
                return {
                    type: 'economic',
                    title: event.title,
                    description: event.description,
                    characters: [],
                    effects: event.effects
                };
            }
        },
        
        seasonal_event: {
            weight: 4,
            generate: (townInfo, npcs, storyConsequences) => {
                const seasonalEvents = [
                    {
                        title: 'Harvest Festival Preparations',
                        description: `The town is preparing for the annual harvest festival. Decorations are being put up and special foods are being prepared.`
                    },
                    {
                        title: 'Storm Passes',
                        description: `A fierce storm passed through ${townInfo.name} last night, but the damage was minimal. The townspeople are helping each other clean up.`
                    },
                    {
                        title: 'Traveling Merchants Arrive',
                        description: `A caravan of traveling merchants has arrived in ${townInfo.name}, bringing exotic goods and news from distant lands.`
                    },
                    {
                        title: 'Local Celebration',
                        description: `The town is celebrating a local holiday. Music and laughter fill the streets as neighbors come together.`
                    }
                ];
                
                const event = randomChoice(seasonalEvents);
                return {
                    type: 'town',
                    title: event.title,
                    description: event.description,
                    characters: [],
                    effects: () => {
                        // Boost general town mood
                        npcs.forEach(npc => {
                            if (Math.random() < 0.3 && npc.character.psychologicalProfile) {
                                const positiveStates = ['content', 'optimistic', 'cheerful'];
                                npc.character.psychologicalProfile.emotionalState = randomChoice(positiveStates);
                            }
                        });
                    }
                };
            }
        }
    },
    
    mystery: {
        new_mystery: {
            weight: 3,
            generate: (townInfo, npcs, storyConsequences) => {
                const mysteries = [
                    {
                        title: 'Strange Lights Reported',
                        description: `Several townspeople report seeing unusual lights near the outskirts of ${townInfo.name} during the night. No one knows what could be causing them.`,
                        rumor: "Strange lights have been seen moving through the darkness outside town"
                    },
                    {
                        title: 'Missing Item Mystery',
                        description: `A valuable item has gone missing from the town hall. Officials are investigating, but so far there are no leads.`,
                        rumor: "Something important has disappeared from the town hall under mysterious circumstances"
                    },
                    {
                        title: 'Unusual Animal Behavior',
                        description: `The local animals have been acting strangely - dogs barking at empty spaces, cats refusing to enter certain areas.`,
                        rumor: "The animals seem to sense something the townspeople cannot"
                    },
                    {
                        title: 'Mysterious Visitor',
                        description: `A hooded figure was seen asking questions around town before disappearing. No one knows who they were or what they wanted.`,
                        rumor: "A mysterious stranger was asking odd questions about the town's history"
                    }
                ];
                
                const mystery = randomChoice(mysteries);
                return {
                    type: 'mystery',
                    title: mystery.title,
                    description: mystery.description,
                    characters: [],
                    effects: () => {
                        // Add a new rumor to the story elements
                        if (gameState.townStoryState && gameState.townStoryState.elements) {
                            gameState.townStoryState.elements.push({
                                id: `mystery_rumor_${Date.now()}_${Math.random()}`,
                                originalText: mystery.rumor,
                                originalType: 'rumored',
                                currentType: 'rumored',
                                category: 'mystery_rumors',
                                dayAdded: gameState.day,
                                evolutionHistory: [`Day ${gameState.day}: Mystery emerged from nightly events`]
                            });
                        }
                    }
                };
            }
        }
    },
    
    consequence: {
        story_impact: {
            weight: 10,
            generate: (townInfo, npcs, storyConsequences) => {
                if (storyConsequences.length === 0) return null;
                
                // Create events based on last night's story consequences
                const consequence = randomChoice(storyConsequences);
                const impactTypes = [
                    {
                        title: 'Story Inspires Action',
                        description: `Your story from last night has inspired someone in the community. ${consequence}`
                    },
                    {
                        title: 'Tale Spreads Through Town',
                        description: `People are still talking about your story from last night. ${consequence} The tale is spreading through the community.`
                    },
                    {
                        title: 'Story Changes Perspective',
                        description: `Your storytelling has shifted how people think about recent events. ${consequence}`
                    }
                ];
                
                const impact = randomChoice(impactTypes);
                return {
                    type: 'consequence',
                    title: impact.title,
                    description: impact.description,
                    characters: [],
                    effects: () => {
                        // Stories can slightly improve relationships with audience members
                        gameState.eveningAudience.forEach(audienceMember => {
                            if (gameState.knownCharacters[audienceMember.name] && Math.random() < 0.2) {
                                const char = gameState.knownCharacters[audienceMember.name];
                                if (char.relationshipLevel === 'acquaintance') {
                                    char.relationshipLevel = 'friend';
                                } else if (char.relationshipLevel === 'friend' && Math.random() < 0.1) {
                                    char.relationshipLevel = 'confidant';
                                }
                            }
                        });
                    }
                };
            }
        }
    }
};

function generateNightlyEvents(townInfo, npcs, storyConsequences) {
    const events = [];
    const numEvents = 1 + Math.floor(Math.random() * 3); // 1-3 events per night
    
    // Calculate total weights for each category
    const categoryWeights = {};
    Object.keys(nightlyEventTemplates).forEach(category => {
        categoryWeights[category] = Object.values(nightlyEventTemplates[category])
            .reduce((sum, template) => sum + template.weight, 0);
    });
    
    for (let i = 0; i < numEvents; i++) {
        // Choose a random category
        const totalWeight = Object.values(categoryWeights).reduce((sum, weight) => sum + weight, 0);
        let randomValue = Math.random() * totalWeight;
        let selectedCategory = null;
        
        for (const [category, weight] of Object.entries(categoryWeights)) {
            randomValue -= weight;
            if (randomValue <= 0) {
                selectedCategory = category;
                break;
            }
        }
        
        if (selectedCategory) {
            // Choose a random template from the selected category
            const templates = nightlyEventTemplates[selectedCategory];
            const templateNames = Object.keys(templates);
            const templateWeights = templateNames.map(name => templates[name].weight);
            const totalTemplateWeight = templateWeights.reduce((sum, weight) => sum + weight, 0);
            
            let templateRandom = Math.random() * totalTemplateWeight;
            let selectedTemplate = null;
            
            for (let j = 0; j < templateNames.length; j++) {
                templateRandom -= templateWeights[j];
                if (templateRandom <= 0) {
                    selectedTemplate = templates[templateNames[j]];
                    break;
                }
            }
            
            if (selectedTemplate) {
                const event = selectedTemplate.generate(townInfo, npcs, storyConsequences);
                if (event) {
                    events.push(event);
                }
            }
        }
    }
    
    return events;
}

function processNightlyEvents() {
    if (!locations || !locations.townInfo || !locations.allNPCs) return;
    
    const townInfo = locations.townInfo;
    const npcs = locations.allNPCs;
    const storyConsequences = gameState.consequences || [];
    
    // Generate events using the new balanced system
    const events = generateBalancedEvents(townInfo, npcs, storyConsequences);
    
    // Process each event
    events.forEach(event => {
        // Apply event effects
        if (event.effects) {
            event.effects();
        }
        
        // Add to event log
        addToEventLog(event);
        
        // Add to game state for potential display
        gameState.townEvents.push({
            ...event,
            day: gameState.day,
            townName: townInfo.name
        });
    });
    
    const naturalEvents = events.filter(e => !e.seed).length;
    const storyEvents = events.filter(e => e.seed).length;
    console.log(`Generated ${events.length} nightly events for ${townInfo.name} (${naturalEvents} natural, ${storyEvents} story-influenced)`);
}

// --- STORY-DRIVEN EVENT MANIPULATION SYSTEM ---
//
// This system allows the bard's storytelling choices to directly influence future events:
//
// 1. STORY ANALYSIS: When a story is told, analyzeStoryForEventSeeds() examines:
//    - Target audience (creates character-focused events)
//    - Story themes (economic, mystery, relationship, etc.)
//    - Location setting (influences location-based events) 
//    - Truth level (confirmed vs rumored vs madeUp affects event types)
//
// 2. EVENT SEEDING: Seeds are created that last 3 days and influence event generation:
//    - Character Focus: Stories about specific NPCs create events affecting them
//    - Thematic Influence: Story themes bias toward related event types
//    - Location Focus: Stories set in specific places affect those locations
//    - Fiction/Truth Influence: Made-up vs true stories create different outcomes
//
// 3. SEEDED GENERATION: processNightlyEvents() prioritizes seeded events (70% chance)
//    over random events, making the bard's narrative choices directly shape the world
//
// 4. PLAYER FEEDBACK: The Events tab shows which events were story-inspired and
//    displays active seeds so players understand their narrative power

function analyzeStoryForEventSeeds(storyChoices) {
    const seeds = [];
    
    if (!storyChoices.targetAudience || !storyChoices.location || !storyChoices.event) {
        return seeds;
    }
    
    // Analyze target audience - stories about specific people create character events
    if (storyChoices.targetAudience !== 'general' && storyChoices.targetAudience.name) {
        const character = storyChoices.targetAudience;
        seeds.push({
            type: 'character_focus',
            target: character.name,
            weight: 3,
            eventTypes: ['career_change', 'relationship_change', 'personal_growth'],
            reason: `Story focused on ${character.name}`
        });
    }
    
    // Analyze story event type and theme
    const eventType = storyChoices.event.type; // confirmed, rumored, madeUp
    const eventTheme = categorizeEventTheme(storyChoices.event);
    
    if (eventTheme === 'economic') {
        seeds.push({
            type: 'thematic_influence',
            theme: 'economic',
            weight: 2,
            eventTypes: ['economic_shift', 'trade_opportunity'],
            reason: `Story contained economic themes`
        });
    } else if (eventTheme === 'mystery') {
        seeds.push({
            type: 'thematic_influence',
            theme: 'mystery',
            weight: 2,
            eventTypes: ['new_mystery', 'mystery_resolution'],
            reason: `Story contained mysterious elements`
        });
    } else if (eventTheme === 'relationship') {
        seeds.push({
            type: 'thematic_influence',
            theme: 'relationship',
            weight: 2,
            eventTypes: ['relationship_change', 'social_gathering'],
            reason: `Story explored relationships`
        });
    }
    
    // Analyze story resolution impact
    const location = storyChoices.location;
    if (location && location.name) {
        seeds.push({
            type: 'location_focus',
            target: location.name,
            weight: 2,
            eventTypes: ['location_change', 'economic_shift'],
            reason: `Story set in ${location.name}`
        });
    }
    
    // Truth level influences event manifestation
    if (eventType === 'madeUp') {
        seeds.push({
            type: 'fiction_influence',
            weight: 1,
            eventTypes: ['mystery_emergence', 'rumor_spread'],
            reason: `Fictional story may inspire real events`
        });
    } else if (eventType === 'confirmed') {
        seeds.push({
            type: 'truth_influence',
            weight: 2,
            eventTypes: ['practical_action', 'community_response'],
            reason: `True story inspires practical action`
        });
    }
    
    return seeds;
}

function categorizeEventTheme(event) {
    const title = event.title.toLowerCase();
    const description = event.description.toLowerCase();
    const text = title + ' ' + description;
    
    if (text.includes('trade') || text.includes('merchant') || text.includes('market') || text.includes('gold') || text.includes('business')) {
        return 'economic';
    } else if (text.includes('mystery') || text.includes('strange') || text.includes('unknown') || text.includes('secret')) {
        return 'mystery';
    } else if (text.includes('love') || text.includes('friend') || text.includes('relationship') || text.includes('family')) {
        return 'relationship';
    } else if (text.includes('rescue') || text.includes('danger') || text.includes('hero') || text.includes('brave')) {
        return 'heroic';
    } else if (text.includes('magic') || text.includes('enchanted') || text.includes('curse') || text.includes('prophecy')) {
        return 'magical';
    }
    
    return 'general';
}

function seedEventsFromStory(storyChoices) {
    if (!gameState.eventSeeds) {
        gameState.eventSeeds = [];
    }
    
    const newSeeds = analyzeStoryForEventSeeds(storyChoices);
    
    // Add new seeds to the pool
    newSeeds.forEach(seed => {
        seed.dayCreated = gameState.day;
        seed.expiresDay = gameState.day + 3; // Seeds last for 3 days
        gameState.eventSeeds.push(seed);
    });
    
    // Remove expired seeds
    gameState.eventSeeds = gameState.eventSeeds.filter(seed => seed.expiresDay >= gameState.day);
    
    console.log(`Added ${newSeeds.length} event seeds from story:`, newSeeds);
}

// Balanced event generation - world-driven with story influence
function generateBalancedEvents(townInfo, npcs, storyConsequences) {
    const events = [];
    const seeds = gameState.eventSeeds || [];
    const targetEventCount = 1 + Math.floor(Math.random() * 3); // 1-3 events total
    
    // 1. NATURAL WORLD EVENTS (60% of events) - happen regardless of bard
    const naturalEventCount = Math.floor(targetEventCount * 0.6) + (Math.random() < 0.6 ? 1 : 0);
    for (let i = 0; i < naturalEventCount; i++) {
        const naturalEvent = generateNaturalWorldEvent(townInfo, npcs, storyConsequences);
        if (naturalEvent) {
            events.push(naturalEvent);
            console.log(`Generated natural event: ${naturalEvent.title}`);
        }
    }
    
    // 2. STORY-INFLUENCED EVENTS (30% of events) - affected by bard's stories  
    const storyEventCount = Math.floor(targetEventCount * 0.3);
    let storyEventsGenerated = 0;
    seeds.forEach(seed => {
        if (storyEventsGenerated < storyEventCount && Math.random() < 0.4) { // Lower chance, more selective
            const seededEvent = generateEventFromSeed(seed, townInfo, npcs, storyConsequences);
            if (seededEvent) {
                events.push(seededEvent);
                storyEventsGenerated++;
                console.log(`Generated story-influenced event: ${seededEvent.title} (from: ${seed.reason})`);
            }
        }
    });
    
    // 3. RANDOM FILLER EVENTS (10% of events) - pure chaos
    while (events.length < targetEventCount && Math.random() < 0.3) {
        const randomEvent = generateRandomEvent(townInfo, npcs, storyConsequences);
        if (randomEvent) {
            events.push(randomEvent);
            console.log(`Generated random event: ${randomEvent.title}`);
        } else {
            break;
        }
    }
    
    return events;
}

// Natural world events that happen due to organic town dynamics
function generateNaturalWorldEvent(townInfo, npcs, storyConsequences) {
    const naturalEventTypes = [
        'economic_cycle',
        'seasonal_change', 
        'character_development',
        'social_dynamics',
        'political_shift',
        'natural_occurrence',
        'trade_fluctuation',
        'demographic_change'
    ];
    
    const eventType = randomChoice(naturalEventTypes);
    
    switch (eventType) {
        case 'economic_cycle':
            return generateEconomicCycleEvent(townInfo, npcs);
        case 'seasonal_change':
            return generateSeasonalEvent(townInfo, npcs);
        case 'character_development':
            return generateNaturalCharacterEvent(townInfo, npcs);
        case 'social_dynamics':
            return generateSocialDynamicsEvent(townInfo, npcs);
        case 'political_shift':
            return generatePoliticalEvent(townInfo, npcs);
        case 'natural_occurrence':
            return generateNaturalOccurrenceEvent(townInfo, npcs);
        case 'trade_fluctuation':
            return generateTradeEvent(townInfo, npcs);
        case 'demographic_change':
            return generateDemographicEvent(townInfo, npcs);
        default:
            return null;
    }
}

function generateEconomicCycleEvent(townInfo, npcs) {
    const economicEvents = [
        {
            title: 'Seasonal Trade Cycle',
            description: `${townInfo.name} experiences its predictable seasonal trade fluctuation. ${townInfo.type === 'mining' ? 'Winter mining yields are lower due to harsh conditions' : townInfo.type === 'farming' ? 'Post-harvest economic adjustment affects the local market' : 'Seasonal trading patterns shift the town\'s prosperity'}.`,
            type: 'economic',
            effects: () => {
                const fluctuation = Math.random() < 0.5 ? 1 : -1;
                gameState.innCostPerNight = Math.max(3, gameState.innCostPerNight + fluctuation);
            }
        },
        {
            title: 'Resource Depletion Cycle',
            description: `Natural resource cycles affect ${townInfo.name}. ${townInfo.type === 'mining' ? 'The easily accessible ore veins are showing signs of depletion' : townInfo.type === 'farming' ? 'Soil fertility varies with natural cycles' : 'Local resources ebb and flow with natural patterns'}.`,
            type: 'economic',
            effects: () => {
                // Natural economic pressure
                if (Math.random() < 0.3) {
                    gameState.innCostPerNight += 1;
                }
            }
        }
    ];
    
    const event = randomChoice(economicEvents);
    return {
        type: event.type,
        title: event.title,
        description: event.description,
        characters: [],
        effects: event.effects
    };
}

function generateSeasonalEvent(townInfo, npcs) {
    const seasonalEvents = [
        {
            title: 'Weather Pattern Shift',
            description: `A change in weather patterns affects daily life in ${townInfo.name}. ${townInfo.type === 'coastal' ? 'Storm seasons bring both challenges and opportunities' : townInfo.type === 'farming' ? 'Changing weather affects crop planning and community schedules' : 'The town adapts to seasonal weather changes'}.`,
            type: 'town'
        },
        {
            title: 'Natural Cycles',
            description: `The natural world around ${townInfo.name} follows its ancient rhythms. ${townInfo.type === 'farming' ? 'Wildlife migration patterns affect local hunting and farming' : townInfo.type === 'coastal' ? 'Tidal and fish migration patterns shift' : 'Forest and mountain cycles influence the community'}.`,
            type: 'town'
        }
    ];
    
    const event = randomChoice(seasonalEvents);
    return {
        type: event.type,
        title: event.title,
        description: event.description,
        characters: [],
        effects: () => {
            // Seasonal changes affect NPC moods naturally
            npcs.forEach(npc => {
                if (Math.random() < 0.2 && npc.character.psychologicalProfile) {
                    const seasonalMoods = ['content', 'restless', 'contemplative', 'energetic'];
                    npc.character.psychologicalProfile.emotionalState = randomChoice(seasonalMoods);
                }
            });
        }
    };
}

function generateNaturalCharacterEvent(townInfo, npcs) {
    // Characters develop and change on their own, not just because of bard stories
    const developingNPC = randomChoice(npcs);
    if (!developingNPC) return null;
    
    const developmentEvents = [
        {
            title: `${developingNPC.name} Faces Personal Challenge`,
            description: `${developingNPC.name} is dealing with a personal challenge that has nothing to do with recent events. Like everyone, they face the ongoing struggles of daily life in ${townInfo.name}.`,
            characters: [developingNPC.name],
            effects: () => {
                if (developingNPC.character.psychologicalProfile) {
                    const challengeStates = ['stressed', 'determined', 'thoughtful', 'resilient'];
                    developingNPC.character.psychologicalProfile.emotionalState = randomChoice(challengeStates);
                }
            }
        },
        {
            title: `${developingNPC.name} Achieves Personal Goal`,
            description: `${developingNPC.name} has been working toward something personal and has made progress. Their own efforts and determination are paying off, independent of outside influence.`,
            characters: [developingNPC.name],
            effects: () => {
                if (developingNPC.character.psychologicalProfile) {
                    developingNPC.character.psychologicalProfile.emotionalState = 'accomplished';
                }
            }
        }
    ];
    
    const event = randomChoice(developmentEvents);
    return {
        type: 'character',
        title: event.title,
        description: event.description,
        characters: event.characters,
        effects: event.effects
    };
}

function generateSocialDynamicsEvent(townInfo, npcs) {
    const socialEvents = [
        {
            title: 'Community Dynamics Shift',
            description: `Social relationships in ${townInfo.name} evolve naturally as people interact in their daily lives. Friendships strengthen, disagreements arise, and the social fabric of the community changes organically.`,
            type: 'social',
            effects: () => {
                // Natural relationship evolution
                npcs.forEach(npc => {
                    if (Math.random() < 0.15 && npc.character.relationships) {
                        const randomRel = randomChoice(npc.character.relationships);
                        if (Math.random() < 0.5) {
                            randomRel.intensity = Math.min(5, randomRel.intensity + 1);
                        } else {
                            randomRel.intensity = Math.max(1, randomRel.intensity - 1);
                        }
                    }
                });
            }
        },
        {
            title: 'Generational Change',
            description: `${townInfo.name} experiences the natural progression of generations. Older residents share wisdom with younger ones, while new perspectives challenge established ways of thinking.`,
            type: 'social',
            effects: () => {
                // Some NPCs naturally become more open or conservative
                npcs.forEach(npc => {
                    if (Math.random() < 0.1) {
                        // Natural personality development
                        const traits = ['wise', 'traditional', 'progressive', 'experienced'];
                        if (npc.character.personalityTrait) {
                            npc.character.personalityTrait.secondaryTrait = randomChoice(traits);
                        }
                    }
                });
            }
        }
    ];
    
    const event = randomChoice(socialEvents);
    return {
        type: event.type,
        title: event.title,
        description: event.description,
        characters: [],
        effects: event.effects
    };
}

function generatePoliticalEvent(townInfo, npcs) {
    const politicalEvents = [
        {
            title: 'New Inn Licensing Tax',
            description: `Regional authorities have imposed a new licensing tax on all inns and taverns in ${townInfo.name}. The tax is intended to fund road maintenance and regional security, but innkeepers are passing the cost directly to guests.`,
            type: 'political',
            effects: () => {
                const oldCost = gameState.innCostPerNight;
                gameState.innCostPerNight += 2;
                return { costChange: gameState.innCostPerNight - oldCost, reason: 'inn licensing tax' };
            }
        },
        {
            title: 'Performer Registration Requirement',
            description: `New regulations require all traveling performers to register with local authorities and pay a performance fee. ${townInfo.name} officials are now collecting 3 gold from entertainers as a "public safety measure" to track who performs in town.`,
            type: 'political',
            effects: () => {
                gameState.gold = Math.max(0, gameState.gold - 3);
                return { goldChange: -3, reason: 'performer registration fee' };
            }
        },
        {
            title: 'Trade Route Security Tax',
            description: `Regional authorities have increased security patrols on trade routes, funded by a new merchant tax. ${townInfo.name} merchants are charging higher prices to cover the tax, but the increased security has made some wealthy traders more generous with tips.`,
            type: 'political',
            effects: () => {
                const costIncrease = Math.random() < 0.7 ? 1 : 0;
                if (costIncrease) {
                    gameState.innCostPerNight += 1;
                }
                return { 
                    costChange: costIncrease, 
                    tipBonus: true, 
                    reason: 'trade security tax' 
                };
            }
        },
        {
            title: 'Currency Standardization Decree',
            description: `Regional authorities have decreed that all transactions must use the new standardized regional currency. ${townInfo.name} is adjusting to the conversion rates, which has temporarily disrupted local pricing. Some goods are now cheaper, others more expensive.`,
            type: 'political',
            effects: () => {
                const adjustment = Math.random() < 0.5 ? -1 : 1;
                gameState.innCostPerNight = Math.max(3, gameState.innCostPerNight + adjustment);
                const goldAdjustment = Math.floor(gameState.gold * 0.05) * (Math.random() < 0.5 ? -1 : 1);
                gameState.gold = Math.max(0, gameState.gold + goldAdjustment);
                return { 
                    costChange: adjustment, 
                    goldChange: goldAdjustment, 
                    reason: 'currency standardization' 
                };
            }
        },
        {
            title: 'Curfew Enforcement Initiative',
            description: `Regional authorities have mandated stricter evening curfews to "maintain public order." ${townInfo.name} now restricts public gatherings after dark, which means fewer people can attend evening performances. Tavern owners are frustrated by the reduced business.`,
            type: 'political',
            effects: () => {
                // Reduce potential audience size for evening performances
                gameState.audienceRestriction = 'curfew';
                return { audienceImpact: true, reason: 'curfew enforcement' };
            }
        },
        {
            title: 'Vagrancy Prevention Act',
            description: `New regional laws require all travelers to demonstrate "legitimate business" or face vagrancy charges. ${townInfo.name} officials are demanding proof of income from visiting performers. Those who can't show sufficient funds face additional fees.`,
            type: 'political',
            effects: () => {
                if (gameState.gold < 20) {
                    gameState.gold = Math.max(0, gameState.gold - 5);
                    return { goldChange: -5, reason: 'vagrancy prevention fee' };
                }
                return { wealthCheck: true, reason: 'vagrancy prevention (avoided due to sufficient funds)' };
            }
        },
        {
            title: 'Regional Storytelling Content Review',
            description: `New regulations require "morally appropriate" content in public performances. ${townInfo.name} has appointed a content reviewer who may fine performers for "inappropriate themes." Certain story types now carry risk of penalties.`,
            type: 'political',
            effects: () => {
                gameState.contentRestrictions = true;
                return { storyRestrictions: true, reason: 'content review regulations' };
            }
        },
        {
            title: 'Crown Revenue Collection Drive',
            description: `Regional tax collectors are conducting an intensive revenue collection campaign. ${townInfo.name} businesses are being squeezed for back taxes, and some are struggling. The economic pressure means people have less to spend on entertainment.`,
            type: 'political',
            effects: () => {
                // Reduce gold gains from performances for a few days
                if (!gameState.economicConditions) gameState.economicConditions = {};
                gameState.economicConditions.taxPressure = gameState.day + 3; // Lasts 3 days
                gameState.innCostPerNight += 1;
                return { economicPressure: true, costChange: 1, reason: 'crown tax collection' };
            }
        }
    ];
    
    const event = randomChoice(politicalEvents);
    const result = {
        type: event.type,
        title: event.title,
        description: event.description,
        characters: [],
        politicalConsequences: null,
        effects: () => {
            const consequences = event.effects();
            result.politicalConsequences = consequences;
        }
    };
    
    return result;
}

function generateNaturalOccurrenceEvent(townInfo, npcs) {
    const naturalEvents = [
        {
            title: 'Natural Discovery',
            description: `Someone in ${townInfo.name} makes an interesting natural discovery. ${townInfo.type === 'mining' ? 'A new mineral formation is found' : townInfo.type === 'farming' ? 'An unusual plant growth pattern is noticed' : townInfo.type === 'coastal' ? 'Something interesting washes ashore' : 'Nature reveals something unexpected'}.`,
            type: 'mystery'
        },
        {
            title: 'Environmental Shift',
            description: `The natural environment around ${townInfo.name} experiences a subtle change. ${townInfo.type === 'coastal' ? 'Ocean currents shift slightly' : townInfo.type === 'farming' ? 'Soil conditions vary naturally' : 'The local ecosystem adapts and changes'}.`,
            type: 'town'
        }
    ];
    
    const event = randomChoice(naturalEvents);
    return {
        type: event.type,
        title: event.title,
        description: event.description,
        characters: [],
        effects: () => {
            // Natural events sometimes create new rumors
            if (Math.random() < 0.4 && gameState.townStoryState?.elements) {
                gameState.townStoryState.elements.push({
                    id: `natural_rumor_${Date.now()}_${Math.random()}`,
                    originalText: "Something unusual was discovered in the natural world around town",
                    originalType: 'rumored',
                    currentType: 'rumored',
                    category: 'natural_phenomena',
                    dayAdded: gameState.day,
                    evolutionHistory: [`Day ${gameState.day}: Natural discovery created local interest`]
                });
            }
        }
    };
}

function generateTradeEvent(townInfo, npcs) {
    const tradeEvents = [
        {
            title: 'Trading Partner Shift',
            description: `${townInfo.name}'s trading relationships experience natural changes. Some partnerships strengthen while others weaken based on practical considerations and changing needs.`,
            type: 'economic',
            effects: () => {
                const tradeChange = Math.random() < 0.5 ? 1 : -1;
                gameState.innCostPerNight = Math.max(3, gameState.innCostPerNight + tradeChange);
            }
        },
        {
            title: 'Supply Chain Adjustment',
            description: `Regional supply chains adjust to new conditions. ${townInfo.name} adapts to changes in the availability and cost of goods from distant sources.`,
            type: 'economic',
            effects: () => {
                // Market forces affect local prices
                if (Math.random() < 0.4) {
                    gameState.innCostPerNight = Math.max(3, gameState.innCostPerNight + (Math.random() < 0.5 ? 1 : -1));
                }
            }
        }
    ];
    
    const event = randomChoice(tradeEvents);
    return {
        type: event.type,
        title: event.title,
        description: event.description,
        characters: [],
        effects: event.effects
    };
}

function generateDemographicEvent(townInfo, npcs) {
    const demographicEvents = [
        {
            title: 'Population Natural Change',
            description: `${townInfo.name} experiences natural demographic shifts. Some families grow, others move on, and new people arrive seeking opportunities - the natural ebb and flow of community life.`,
            type: 'social'
        },
        {
            title: 'Skill Distribution Evolution',
            description: `The mix of skills and professions in ${townInfo.name} evolves naturally. As people retire, start new careers, or develop expertise, the community's capabilities gradually shift.`,
            type: 'social'
        }
    ];
    
    const event = randomChoice(demographicEvents);
    return {
        type: event.type,
        title: event.title,
        description: event.description,
        characters: [],
        effects: () => {
            // Demographic changes subtly affect the social environment
            npcs.forEach(npc => {
                if (Math.random() < 0.05) {
                    // Very small chance of profession evolution (natural career development)
                    const relatedProfessions = {
                        'Farmer': ['Merchant', 'Miller'],
                        'Merchant': ['Trader', 'Shopkeeper'], 
                        'Guard': ['Captain', 'Veteran'],
                        'Priest': ['Scholar', 'Counselor']
                    };
                    
                    const related = relatedProfessions[npc.character.profession];
                    if (related) {
                        npc.character.profession = randomChoice(related);
                        if (gameState.knownCharacters[npc.name]) {
                            gameState.knownCharacters[npc.name].character.profession = npc.character.profession;
                        }
                    }
                }
            });

            // --- NEW: Actually change population ---
            // Remove an NPC (simulate moving away)
            if (locations && locations.allNPCs && locations.allNPCs.length > 10 && Math.random() < 0.10) {
                // Exclude player-known characters for now (optional: could be more nuanced)
                const removable = locations.allNPCs.filter(npc => !gameState.talkedToToday.includes(npc.name));
                if (removable.length > 0) {
                    const npcToRemove = randomChoice(removable);
                    // Remove from allNPCs
                    locations.allNPCs = locations.allNPCs.filter(npc => npc !== npcToRemove);
                    // Remove from location.npcs
                    if (locations[npcToRemove.location] && locations[npcToRemove.location].npcs) {
                        locations[npcToRemove.location].npcs = locations[npcToRemove.location].npcs.filter(npc => npc !== npcToRemove);
                    }
                    // Remove from knownCharacters if present
                    if (gameState.knownCharacters[npcToRemove.name]) {
                        delete gameState.knownCharacters[npcToRemove.name];
                    }
                }
            }

            // Add a new NPC (simulate new arrival)
            if (locations && Math.random() < 0.10) {
                // Pick a random location key (excluding metadata)
                const locationKeys = Object.keys(locations).filter(key => !['townInfo', 'allNPCs'].includes(key));
                if (locationKeys.length > 0) {
                    const locationKey = randomChoice(locationKeys);
                    // Determine correct character generation key
                    let charGenKey = locationKey;
                    if (locationKey === 'industrial') {
                        charGenKey = getIndustrialMappingKey(locations.townInfo.type);
                    } else if (locationKey === 'government') {
                        charGenKey = 'mayor';
                    }
                    const name = generateCharacterName();
                    const character = generateCharacter(charGenKey);
                    // Assign generic info
                    const info = {
                        text: `${name} shares local gossip and personal observations about ${locations.townInfo.name}`,
                        type: 'confirmed',
                        source: name
                    };
                    const newNPC = {
                        name,
                        character,
                        info,
                        location: locationKey
                    };
                    // Add to allNPCs and location.npcs
                    locations.allNPCs.push(newNPC);
                    if (locations[locationKey] && locations[locationKey].npcs) {
                        locations[locationKey].npcs.push(newNPC);
                    }
                    // Re-generate relationships for all NPCs
                    generateCharacterRelationships(locations.allNPCs, locations.townInfo);
                    // Generate dialogue for new NPC
                    newNPC.dialogue = generateDialogue(newNPC.character, newNPC.info);
                }
            }

            // Update UI if needed
            if (typeof updateLocationsDisplay === 'function') {
                updateLocationsDisplay();
            }
        }
    };
}

function generateEventFromSeed(seed, townInfo, npcs, storyConsequences) {
    console.log(`Attempting to generate event from seed:`, seed);
    
    if (seed.type === 'character_focus') {
        return generateCharacterFocusEvent(seed, townInfo, npcs, storyConsequences);
    } else if (seed.type === 'thematic_influence') {
        return generateThematicEvent(seed, townInfo, npcs, storyConsequences);
    } else if (seed.type === 'location_focus') {
        return generateLocationEvent(seed, townInfo, npcs, storyConsequences);
    } else if (seed.type === 'fiction_influence') {
        return generateFictionInspiredEvent(seed, townInfo, npcs, storyConsequences);
    } else if (seed.type === 'truth_influence') {
        return generateTruthInspiredEvent(seed, townInfo, npcs, storyConsequences);
    }
    
    return null;
}

function generateCharacterFocusEvent(seed, townInfo, npcs, storyConsequences) {
    const targetNPC = npcs.find(npc => npc.name === seed.target);
    if (!targetNPC) return null;
    
    const eventTemplates = {
        career_change: {
            title: `${targetNPC.name} Embraces Change`,
            description: `Inspired by your recent story about them, ${targetNPC.name} has decided to make a major life change. They're leaving their role as a ${targetNPC.character.profession} to pursue new opportunities.`,
            effects: () => {
                const newProfessions = ['Merchant', 'Guard', 'Farmer', 'Priest', 'Doctor', 'Scholar', 'Artisan'];
                const newProfession = randomChoice(newProfessions.filter(p => p !== targetNPC.character.profession));
                targetNPC.character.profession = newProfession;
                if (gameState.knownCharacters[targetNPC.name]) {
                    gameState.knownCharacters[targetNPC.name].character.profession = newProfession;
                }
            }
        },
        
        personal_growth: {
            title: `${targetNPC.name} Finds New Purpose`,
            description: `Your story about ${targetNPC.name} has resonated deeply with them. They've been seen around town with a new sense of confidence and purpose, taking on responsibilities they never would have before.`,
            effects: () => {
                if (targetNPC.character.psychologicalProfile) {
                    targetNPC.character.psychologicalProfile.emotionalState = 'inspired';
                }
                // Improve relationship with player if they know this character
                if (gameState.knownCharacters[targetNPC.name]) {
                    const char = gameState.knownCharacters[targetNPC.name];
                    if (char.relationshipLevel === 'acquaintance') {
                        char.relationshipLevel = 'friend';
                    }
                }
            }
        },
        
        relationship_change: {
            title: `${targetNPC.name} Reaches Out`,
            description: `Moved by the themes in your story, ${targetNPC.name} has decided to mend a strained relationship. They were seen reconciling with someone they hadn't spoken to in months.`,
            effects: () => {
                // Find and improve a relationship
                if (targetNPC.character.relationships) {
                    const strainedRels = targetNPC.character.relationships.filter(rel => rel.quality === 'hostile');
                    if (strainedRels.length > 0) {
                        const rel = randomChoice(strainedRels);
                        rel.quality = 'neutral';
                        rel.intensity = Math.min(5, rel.intensity + 1);
                    }
                }
            }
        }
    };
    
    const eventType = randomChoice(seed.eventTypes.filter(type => eventTemplates[type]));
    if (!eventType) return null;
    
    const template = eventTemplates[eventType];
    
    return {
        type: 'consequence',
        title: template.title,
        description: template.description,
        characters: [targetNPC.name],
        effects: template.effects,
        seed: seed
    };
}

function generateThematicEvent(seed, townInfo, npcs, storyConsequences) {
    const themeTemplates = {
        economic: {
            trade_opportunity: {
                title: 'New Business Venture',
                description: `Inspired by the economic themes in your recent story, several townspeople have banded together to start a new business venture. The community is buzzing with entrepreneurial energy.`,
                effects: () => {
                    gameState.innCostPerNight = Math.max(3, gameState.innCostPerNight - 1);
                    // Boost merchant NPCs
                    npcs.forEach(npc => {
                        if (npc.character.profession.toLowerCase().includes('merchant') && npc.character.psychologicalProfile) {
                            npc.character.psychologicalProfile.emotionalState = 'optimistic';
                        }
                    });
                }
            }
        },
        
        mystery: {
            mystery_resolution: {
                title: 'Old Mystery Solved',
                description: `Your storytelling about mysterious events has inspired someone to come forward with information about an old town mystery. A long-standing question has finally been answered.`,
                effects: () => {
                    // Convert an old rumor to confirmed
                    if (gameState.townStoryState?.elements) {
                        const rumors = gameState.townStoryState.elements.filter(e => e.currentType === 'rumored');
                        if (rumors.length > 0) {
                            const resolvedRumor = randomChoice(rumors);
                            resolvedRumor.currentType = 'confirmed';
                            resolvedRumor.evolutionHistory.push(`Day ${gameState.day}: Mystery resolved through storytelling inspiration`);
                        }
                    }
                }
            }
        },
        
        relationship: {
            social_gathering: {
                title: 'Community Comes Together',
                description: `The relationship themes in your story have inspired the townspeople to organize a community gathering. People who rarely speak to each other are finding common ground.`,
                effects: () => {
                    // Improve random relationships
                    npcs.forEach(npc => {
                        if (Math.random() < 0.3 && npc.character.relationships) {
                            const neutralRels = npc.character.relationships.filter(rel => rel.quality === 'neutral');
                            if (neutralRels.length > 0) {
                                const rel = randomChoice(neutralRels);
                                rel.quality = 'positive';
                            }
                        }
                    });
                }
            }
        }
    };
    
    const themeData = themeTemplates[seed.theme];
    if (!themeData) return null;
    
    const eventType = randomChoice(seed.eventTypes.filter(type => themeData[type]));
    if (!eventType || !themeData[eventType]) return null;
    
    const template = themeData[eventType];
    
    return {
        type: seed.theme === 'economic' ? 'economic' : seed.theme === 'mystery' ? 'mystery' : 'social',
        title: template.title,
        description: template.description,
        characters: [],
        effects: template.effects,
        seed: seed
    };
}

function generateLocationEvent(seed, townInfo, npcs, storyConsequences) {
    return {
        type: 'town',
        title: `Changes at the ${seed.target}`,
        description: `Your story featuring the ${seed.target} has sparked interest in that location. People are paying more attention to what happens there, and some are even suggesting improvements.`,
        characters: [],
        effects: () => {
            // Find NPCs associated with this location and boost their mood
            npcs.forEach(npc => {
                if (npc.location && locations[npc.location] && 
                    locations[npc.location].name && 
                    locations[npc.location].name.toLowerCase().includes(seed.target.toLowerCase())) {
                    if (npc.character.psychologicalProfile) {
                        npc.character.psychologicalProfile.emotionalState = 'proud';
                    }
                }
            });
        },
        seed: seed
    };
}

function generateFictionInspiredEvent(seed, townInfo, npcs, storyConsequences) {
    const mysteries = [
        {
            title: 'Life Imitates Art',
            description: `Strangely, elements from your fictional story seem to be manifesting in real life. Several townspeople report experiences similar to what you described in your tale.`,
            rumor: "The bard's fictional story seems to be coming true in mysterious ways"
        },
        {
            title: 'Inspired Imagination',
            description: `Your creative storytelling has sparked the imagination of the townspeople. Children are playing games based on your story, and adults are discussing what they would do in similar situations.`,
            rumor: "The whole town is talking about the bard's incredible tale"
        }
    ];
    
    const mystery = randomChoice(mysteries);
    return {
        type: 'mystery',
        title: mystery.title,
        description: mystery.description,
        characters: [],
        effects: () => {
            if (gameState.townStoryState?.elements) {
                gameState.townStoryState.elements.push({
                    id: `fiction_rumor_${Date.now()}_${Math.random()}`,
                    originalText: mystery.rumor,
                    originalType: 'rumored',
                    currentType: 'rumored',
                    category: 'fiction_inspired',
                    dayAdded: gameState.day,
                    evolutionHistory: [`Day ${gameState.day}: Rumor inspired by fictional storytelling`]
                });
            }
        },
        seed: seed
    };
}

function generateTruthInspiredEvent(seed, townInfo, npcs, storyConsequences) {
    const truthEvents = [
        {
            title: 'Truth Sparks Action',
            description: `Your truthful storytelling has motivated people to take practical action. Several townspeople have formed a committee to address the real issues you highlighted in your story.`,
            effects: () => {
                if (Math.random() < 0.5) {
                    gameState.innCostPerNight = Math.max(3, gameState.innCostPerNight - 1);
                }
                if (gameState.townStoryState?.elements) {
                    gameState.townStoryState.elements.push({
                        id: `action_rumor_${Date.now()}_${Math.random()}`,
                        originalText: "The townspeople have organized to solve real problems facing the community",
                        originalType: 'confirmed',
                        currentType: 'confirmed',
                        category: 'community_action',
                        dayAdded: gameState.day,
                        evolutionHistory: [`Day ${gameState.day}: Community action inspired by truthful storytelling`]
                    });
                }
            }
        },
        {
            title: 'The Bard\'s Commission',
            description: `Impressed by your commitment to truth, several townspeople have pooled their resources to commission you for a special performance. They want you to tell the true story of their community\'s struggles and triumphs.`,
            effects: () => {
                // Create a high-paying special opportunity
                if (!gameState.availableOpportunities) gameState.availableOpportunities = [];
                gameState.availableOpportunities.push('High-paying commissioned performance (50+ gold)');
            }
        },
        {
            title: 'Reputation as Truth-Teller',
            description: `Word of your honest storytelling has spread. People now come to you seeking advice and wanting to share their real stories. Your reputation as a truth-teller precedes you.`,
            effects: () => {
                // Improve relationship building speed
                if (!gameState.storytellerBonuses) gameState.storytellerBonuses = {};
                gameState.storytellerBonuses.truthTeller = true;
            }
        }
    ];
    
    const event = randomChoice(truthEvents);
    return {
        type: 'consequence',
        title: event.title,
        description: event.description,
        characters: [],
        effects: event.effects,
        seed: seed
    };
}

function generateRandomEvent(townInfo, npcs, storyConsequences) {
    // Fallback to original random event generation
    const oldEvents = generateNightlyEvents(townInfo, npcs, storyConsequences);
    return oldEvents.length > 0 ? oldEvents[0] : null;
}

// --- EVENT CONSEQUENCES FOR THE BARD ---
// This system makes events directly matter to the player's success and survival

function calculateEventConsequencesForBard(event) {
    const consequences = {
        goldChange: 0,
        reputationChange: 0,
        relationshipChanges: {},
        newOpportunities: [],
        storyMaterial: [],
        warnings: [],
        innCostChange: 0,
        audienceChanges: {}
    };
    
    // Story-inspired events have stronger consequences (both positive and negative)
    // Natural world events have more subtle consequences for the bard
    let multiplier = 1.0;
    if (event.storyInspired) {
        multiplier = 1.5; // Story events affect bard strongly
    } else if (!event.seed) {
        multiplier = 0.5; // Natural events affect bard more subtly
    }
    
    if (event.type === 'character' && event.characters.length > 0) {
        event.characters.forEach(characterName => {
            // Character events affect relationships with the bard
            if (gameState.knownCharacters[characterName]) {
                const character = gameState.knownCharacters[characterName];
                
                if (event.title.includes('Embraces Change') || event.title.includes('Finds New Purpose')) {
                    // Positive character growth - they're grateful to the bard
                    consequences.relationshipChanges[characterName] = 'improved';
                    consequences.goldChange += Math.floor(10 * multiplier); // Grateful tips
                    consequences.reputationChange += 0.1 * multiplier;
                    consequences.storyMaterial.push(`${characterName} credits your story with inspiring their life change`);
                } else if (event.title.includes('Reaches Out')) {
                    // Relationship healing - community sees bard as peacemaker
                    consequences.reputationChange += 0.15 * multiplier;
                    consequences.storyMaterial.push(`${characterName}'s reconciliation has become the talk of the town`);
                }
            }
            
            // Career changes affect economic dynamics
            if (event.title.includes('Changes Career') || event.title.includes('Embraces Change')) {
                const newProfession = extractProfessionFromDescription(event.description);
                if (newProfession === 'Merchant' || newProfession === 'Doctor') {
                    consequences.goldChange += Math.floor(15 * multiplier); // Wealthier professions
                } else if (newProfession === 'Guard') {
                    consequences.reputationChange += 0.1 * multiplier; // Safer town
                } else if (newProfession === 'Priest') {
                    consequences.reputationChange += 0.05 * multiplier; // Moral authority
                    consequences.storyMaterial.push('Religious themes may resonate more strongly with this character');
                }
                
                // Risk: Career changes can sometimes backfire
                if (Math.random() < 0.15) { // 15% chance of negative consequence
                    consequences.warnings.push(`${characterName}'s career change has caused some disruption in the community`);
                    consequences.goldChange -= Math.floor(5 * multiplier);
                }
            }
        });
    }
    
    if (event.type === 'economic') {
        // Economic events directly affect the bard's finances
        if (event.title.includes('Trade Route') || event.title.includes('Business Venture')) {
            consequences.goldChange += Math.floor(20 * multiplier); // Better economy = better tips
            consequences.innCostChange = -Math.floor(1 * multiplier); // Cheaper costs
            consequences.reputationChange += 0.2 * multiplier; // Credit for inspiring prosperity
            consequences.storyMaterial.push('The new economic prosperity has everyone talking about opportunity');
        } else if (event.title.includes('Market Day Success')) {
            consequences.goldChange += Math.floor(10 * multiplier);
            consequences.newOpportunities.push('Special market day performance opportunity');
        } else if (event.title.includes('Resource Shortage')) {
            consequences.goldChange -= Math.floor(5 * multiplier); // Harder times
            consequences.innCostChange = Math.floor(1 * multiplier); // More expensive
            consequences.warnings.push('Economic hardship may lead to fewer generous tips');
        }
    }
    
    if (event.type === 'mystery') {
        // Mystery events create investigation opportunities and story material
        consequences.newOpportunities.push('Investigation opportunity - people may pay for answers');
        consequences.storyMaterial.push('A new mystery has captured everyone\'s imagination');
        
        if (event.title.includes('Old Mystery Solved')) {
            consequences.goldChange += Math.floor(25 * multiplier); // Reward for solving mystery
            consequences.reputationChange += 0.25 * multiplier; // Hero status
            consequences.storyMaterial.push('Your storytelling helped solve a long-standing mystery');
        } else if (event.title.includes('Life Imitates Art')) {
            // Dangerous - people might think the bard has supernatural power
            consequences.reputationChange += 0.3 * multiplier; // Fame
            consequences.warnings.push('Some people are starting to think your stories have magical power');
            
            // Risk: If reputation gets too high from fictional stories, people might expect miracles
            if (gameState.reputation === 'Great' || gameState.reputation === 'Legendary') {
                consequences.warnings.push('Your reputation for supernatural storytelling may create unrealistic expectations');
                consequences.goldChange -= Math.floor(5 * multiplier); // People expect free miracles
            }
        } else if (event.title.includes('Inspired Imagination')) {
            consequences.reputationChange += 0.1 * multiplier;
            consequences.storyMaterial.push('Children are reenacting your stories throughout the town');
        }
    }
    
    if (event.type === 'town' || event.type === 'social') {
        // Town and social events affect community standing
        if (event.title.includes('Community Comes Together') || event.title.includes('Celebration')) {
            consequences.goldChange += Math.floor(15 * multiplier); // Community gratitude
            consequences.reputationChange += 0.2 * multiplier;
            consequences.newOpportunities.push('Special community performance opportunity');
            consequences.storyMaterial.push('The whole community is in a celebratory mood');
        } else if (event.title.includes('Changes at the')) {
            // Location improvements
            consequences.reputationChange += 0.1 * multiplier;
            consequences.storyMaterial.push('Your story has brought positive attention to local establishments');
        } else if (event.title.includes('Weather Pattern') || event.title.includes('Natural Cycles')) {
            // Natural events create different story material
            consequences.storyMaterial.push('Natural changes provide new material for seasonal storytelling');
        } else if (event.title.includes('Community Dynamics') || event.title.includes('Generational Change')) {
            // Social evolution creates ongoing story opportunities
            consequences.storyMaterial.push('Evolving social dynamics offer rich material for future stories');
        }
    }
    
    // Handle natural world events differently than story-driven events
    if (!event.seed && event.type !== 'consequence') {
        // Natural events affect the bard as an observer, not a cause
        if (event.title.includes('Personal Challenge') || event.title.includes('Personal Goal')) {
            consequences.storyMaterial.push('Witnessing personal struggles gives you insight into human nature');
        } else if (event.title.includes('Natural Discovery') || event.title.includes('Environmental Shift')) {
            consequences.storyMaterial.push('Natural phenomena provide fascinating material for storytelling');
            if (Math.random() < 0.3) {
                consequences.newOpportunities.push('Nature-themed storytelling opportunity');
            }
        } else if (event.title.includes('Inn Licensing Tax')) {
            consequences.goldChange -= Math.floor(5 * multiplier); // Inn costs hurt budget
            consequences.warnings.push('New inn tax increases your daily expenses significantly');
        } else if (event.title.includes('Performer Registration')) {
            consequences.goldChange -= Math.floor(3 * multiplier); // Direct fee
            consequences.warnings.push('New performer registration fees cut into your profits');
        } else if (event.title.includes('Trade Route Security')) {
            consequences.goldChange += Math.floor(3 * multiplier); // Wealthy traders tip more
            consequences.innCostChange = 1; // But costs rise
            consequences.storyMaterial.push('Security improvements create stories about safer travel');
        } else if (event.title.includes('Currency Standardization')) {
            // Variable effect based on the actual event consequences
            consequences.storyMaterial.push('Currency changes provide material for stories about economic transformation');
        } else if (event.title.includes('Curfew Enforcement')) {
            consequences.goldChange -= Math.floor(8 * multiplier); // Smaller audiences
            consequences.warnings.push('Curfews reduce your evening audience sizes');
            consequences.storyMaterial.push('Curfew restrictions become a topic of concern in your stories');
        } else if (event.title.includes('Vagrancy Prevention')) {
            if (gameState.gold < 20) {
                consequences.goldChange -= Math.floor(5 * multiplier); // Additional fee for poor bards
                consequences.warnings.push('Low funds make you vulnerable to vagrancy charges');
            } else {
                consequences.storyMaterial.push('Having sufficient funds protects you from vagrancy laws');
            }
        } else if (event.title.includes('Content Review')) {
            consequences.warnings.push('Content restrictions may limit your storytelling freedom');
            consequences.storyMaterial.push('Censorship becomes a delicate topic requiring careful navigation');
        } else if (event.title.includes('Crown Revenue Collection')) {
            consequences.goldChange -= Math.floor(6 * multiplier); // Economic pressure reduces tips
            consequences.warnings.push('Tax pressure on locals means less generous audiences for 3 days');
        } else if (event.title.includes('Governance') || event.title.includes('Authority Decision')) {
            consequences.storyMaterial.push('Political changes affect the stories people want to hear');
        } else if (event.title.includes('Trade') || event.title.includes('Economic')) {
            // Natural economic changes affect bard more subtly
            consequences.goldChange += Math.floor(2 * multiplier); // Small economic benefit/cost
            consequences.storyMaterial.push('Economic shifts change the audience\'s interests and concerns');
        }
    }
    
    if (event.type === 'consequence') {
        // Direct story consequences have the strongest impact
        if (event.title.includes('Truth Sparks Action')) {
            consequences.goldChange += Math.floor(30 * multiplier); // Community reward
            consequences.reputationChange += 0.3 * multiplier; // Respected truth-teller
            consequences.storyMaterial.push('Your truthful storytelling has inspired real positive change');
        } else if (event.title.includes('Story Inspires Action')) {
            consequences.goldChange += Math.floor(20 * multiplier);
            consequences.reputationChange += 0.2 * multiplier;
        } else if (event.title.includes('Tale Spreads Through Town')) {
            consequences.reputationChange += 0.15 * multiplier; // Fame
            consequences.audienceChanges.size = Math.floor(2 * multiplier); // Bigger audiences
        }
    }
    
    return consequences;
}

function extractProfessionFromDescription(description) {
    const professionMatches = description.match(/become a (\w+)/i);
    return professionMatches ? professionMatches[1] : null;
}

function applyEventConsequencesToBard(consequences, eventTitle) {
    let notificationMessages = [];
    
    // Apply gold changes
    if (consequences.goldChange !== 0) {
        gameState.gold += consequences.goldChange;
        const goldText = consequences.goldChange > 0 ? `+${consequences.goldChange}` : `${consequences.goldChange}`;
        notificationMessages.push(`💰 ${goldText} gold (${eventTitle})`);
    }
    
    // Apply reputation changes
    if (consequences.reputationChange !== 0) {
        const oldRep = gameState.reputation;
        updateReputation(consequences.reputationChange * 100); // Convert to existing scale
        const newRep = gameState.reputation;
        if (oldRep !== newRep) {
            notificationMessages.push(`⭐ Reputation: ${oldRep} → ${newRep}`);
        }
    }
    
    // Apply inn cost changes
    if (consequences.innCostChange !== 0) {
        const oldCost = gameState.innCostPerNight;
        gameState.innCostPerNight = Math.max(3, gameState.innCostPerNight + consequences.innCostChange);
        const newCost = gameState.innCostPerNight;
        if (oldCost !== newCost) {
            const changeText = consequences.innCostChange > 0 ? 'increased' : 'decreased';
            notificationMessages.push(`🏨 Inn costs ${changeText}: ${oldCost} → ${newCost} gold/night`);
        }
    }
    
    // Apply relationship changes
    Object.keys(consequences.relationshipChanges).forEach(characterName => {
        if (gameState.knownCharacters[characterName]) {
            const character = gameState.knownCharacters[characterName];
            const oldLevel = character.relationshipLevel;
            
            if (consequences.relationshipChanges[characterName] === 'improved') {
                if (character.relationshipLevel === 'acquaintance') {
                    character.relationshipLevel = 'friend';
                } else if (character.relationshipLevel === 'friend') {
                    character.relationshipLevel = 'confidant';
                }
                
                if (oldLevel !== character.relationshipLevel) {
                    notificationMessages.push(`👥 ${characterName}: ${oldLevel} → ${character.relationshipLevel}`);
                }
            }
        }
    });
    
    // Store opportunities and story material for later use
    if (consequences.newOpportunities.length > 0) {
        if (!gameState.availableOpportunities) gameState.availableOpportunities = [];
        gameState.availableOpportunities.push(...consequences.newOpportunities);
        notificationMessages.push(`✨ New opportunities: ${consequences.newOpportunities.length}`);
    }
    
    if (consequences.storyMaterial.length > 0) {
        if (!gameState.bardNotifications) gameState.bardNotifications = [];
        gameState.bardNotifications.push(...consequences.storyMaterial);
    }
    
    // Store warnings
    if (consequences.warnings.length > 0) {
        if (!gameState.bardWarnings) gameState.bardWarnings = [];
        gameState.bardWarnings.push(...consequences.warnings);
        notificationMessages.push(`⚠️ ${consequences.warnings.length} warning${consequences.warnings.length > 1 ? 's' : ''}`);
    }
    
    // Store notifications for display to player
    if (notificationMessages.length > 0) {
        if (!gameState.pendingEventNotifications) gameState.pendingEventNotifications = [];
        gameState.pendingEventNotifications.push({
            eventTitle: eventTitle,
            notifications: [...notificationMessages],
            timestamp: new Date().toLocaleString()
        });
    }
    
    return notificationMessages;
}

function showEventNotifications() {
    if (!gameState.pendingEventNotifications || gameState.pendingEventNotifications.length === 0) {
        return;
    }
    
    // Create modal to show event consequences
    const notificationModal = document.createElement('div');
    notificationModal.className = 'modal';
    notificationModal.id = 'event-notification-modal';
    notificationModal.style.display = 'block';
    
    let notificationHTML = `
        <div class="modal-content" style="max-width: 600px;">
            <span class="close" onclick="closeEventNotifications()">&times;</span>
            <h2 style="color: #daa520; text-align: center; margin-bottom: 20px;">📜 Morning Report: Events Affect You</h2>
            <p style="color: #ccc; font-style: italic; text-align: center; margin-bottom: 20px;">
                Your stories have shaped the world, and the world has noticed...
            </p>
    `;
    
    gameState.pendingEventNotifications.forEach(notification => {
        notificationHTML += `
            <div style="background: rgba(139, 69, 19, 0.3); border-left: 4px solid #daa520; padding: 15px; margin: 10px 0; border-radius: 0 8px 8px 0;">
                <h4 style="color: #daa520; margin-bottom: 10px;">${notification.eventTitle}</h4>
                <div style="margin-left: 10px;">
                    ${notification.notifications.map(notif => `
                        <div style="margin: 5px 0; color: #f4e4c1; font-size: 0.95em;">• ${notif}</div>
                    `).join('')}
                </div>
            </div>
        `;
    });
    
    notificationHTML += `
            <div style="text-align: center; margin-top: 20px;">
                <button onclick="closeEventNotifications()" style="padding: 12px 24px; font-size: 1.1em; background: linear-gradient(45deg, #654321 0%, #8b4513 100%);">
                    Continue Your Journey
                </button>
            </div>
        </div>
    `;
    
    notificationModal.innerHTML = notificationHTML;
    document.body.appendChild(notificationModal);
    
    // Clear the notifications after showing them
    gameState.pendingEventNotifications = [];
}

function closeEventNotifications() {
    const modal = document.getElementById('event-notification-modal');
    if (modal) {
        modal.remove();
    }
}

// Event Log System
function addToEventLog(event) {
    if (!gameState.eventLog) {
        gameState.eventLog = [];
    }
    
    // Calculate and apply consequences for the bard
    const consequences = calculateEventConsequencesForBard(event);
    const notifications = applyEventConsequencesToBard(consequences, event.title);
    
    const logEntry = {
        id: `event_${Date.now()}_${Math.random()}`,
        day: gameState.day,
        townName: locations.townInfo ? locations.townInfo.name : 'Unknown Town',
        townNumber: gameState.townNumber,
        type: event.type,
        title: event.title,
        description: event.description,
        characters: event.characters || [],
        timestamp: new Date().toLocaleString(),
        storyInspired: event.seed ? true : false,
        seedReason: event.seed ? event.seed.reason : null,
        bardConsequences: consequences,
        bardNotifications: notifications
    };
    
    gameState.eventLog.unshift(logEntry); // Add to beginning for reverse chronological order
    
    // Keep only last 100 events to prevent memory issues
    if (gameState.eventLog.length > 100) {
        gameState.eventLog = gameState.eventLog.slice(0, 100);
    }
    
    console.log(`Event "${event.title}" affected bard:`, notifications);
}

function updateEventLogDisplay(filter = 'all') {
    const eventLogDisplay = document.getElementById('event-log-display');
    if (!eventLogDisplay) return;
    
    // Update active seeds display
    updateActiveSeedsDisplay();
    
    const eventLog = gameState.eventLog || [];
    let filteredEvents = eventLog;
    
    if (filter === 'story-inspired') {
        filteredEvents = eventLog.filter(event => event.storyInspired);
    } else if (filter === 'natural') {
        filteredEvents = eventLog.filter(event => !event.storyInspired && !event.seedReason);
    } else if (filter !== 'all') {
        filteredEvents = eventLog.filter(event => event.type === filter);
    }
    
    if (filteredEvents.length === 0) {
        let noEventsMessage;
        if (filter === 'story-inspired') {
            noEventsMessage = 'No story-inspired events yet. Tell more stories and watch as your tales shape the world around you!';
        } else if (filter === 'natural') {
            noEventsMessage = 'No natural world events yet. These are events that happen organically as the world lives and breathes around you.';
        } else {
            noEventsMessage = 'No events have been recorded yet. Begin your story and watch as the world comes alive around you!';
        }
        eventLogDisplay.innerHTML = `<p style="color: #999; font-style: italic; text-align: center; margin-top: 40px;">${noEventsMessage}</p>`;
        return;
    }
    
    let html = '';
    let lastDay = null;
    let lastTown = null;
    
    filteredEvents.forEach(event => {
        // Add day/town separator
        if (lastDay !== event.day || lastTown !== event.townName) {
            html += `
                <div class="event-day-separator" style="background: rgba(218, 165, 32, 0.2); border: 1px solid #daa520; border-radius: 5px; padding: 8px; margin: 15px 0 10px 0; text-align: center; font-weight: bold; color: #daa520;">
                    📅 Day ${event.day} - ${event.townName} (Town ${event.townNumber})
                </div>
            `;
            lastDay = event.day;
            lastTown = event.townName;
        }
        
        const eventType = eventTypes[event.type] || {
            name: event.type,
            icon: "❓",
            color: "#999"
        };
        
        html += `
            <div class="event-log-entry" style="background: rgba(139, 69, 19, 0.2); border-left: 4px solid ${eventType.color}; padding: 12px; margin: 8px 0; border-radius: 0 5px 5px 0;">
                <div class="event-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                    <div class="event-type" style="color: ${eventType.color}; font-weight: bold; font-size: 0.9em;">
                        ${eventType.icon} ${eventType.name}
                    </div>
                    <div class="event-time" style="color: #999; font-size: 0.8em;">
                        ${event.timestamp}
                    </div>
                </div>
                <div class="event-title" style="font-weight: bold; color: #f4e4c1; margin-bottom: 5px;">
                    ${event.title}
                </div>
                <div class="event-description" style="color: #ddd; line-height: 1.4; margin-bottom: 8px;">
                    ${event.description}
                </div>
                ${event.storyInspired ? `
                    <div class="story-inspiration" style="font-size: 0.8em; color: #ff6347; font-style: italic; margin-bottom: 5px;">
                        📚 Story-Inspired: ${event.seedReason}
                    </div>
                ` : ''}
                ${event.characters.length > 0 ? `
                    <div class="event-characters" style="font-size: 0.8em; color: #daa520;">
                        👥 Characters involved: ${event.characters.join(', ')}
                    </div>
                ` : ''}
                ${event.bardNotifications && event.bardNotifications.length > 0 ? `
                    <div class="bard-consequences" style="background: rgba(218, 165, 32, 0.1); border: 1px solid #daa520; border-radius: 4px; padding: 8px; margin-top: 8px;">
                        <div style="font-size: 0.8em; color: #daa520; font-weight: bold; margin-bottom: 5px;">📊 Effects on You:</div>
                        ${event.bardNotifications.map(notif => `
                            <div style="font-size: 0.8em; color: #f4e4c1; margin: 2px 0;">• ${notif}</div>
                        `).join('')}
                    </div>
                ` : ''}
            </div>
        `;
    });
    
    eventLogDisplay.innerHTML = html;
}

function updateActiveSeedsDisplay() {
    const seedsDisplay = document.getElementById('current-seeds-display');
    const seedsList = document.getElementById('seeds-list');
    if (!seedsDisplay || !seedsList) return;
    
    const activeSeeds = gameState.eventSeeds || [];
    
    if (activeSeeds.length === 0) {
        seedsDisplay.style.display = 'none';
        return;
    }
    
    seedsDisplay.style.display = 'block';
    
    let seedsHTML = '';
    activeSeeds.forEach(seed => {
        const daysLeft = seed.expiresDay - gameState.day;
        seedsHTML += `
            <div style="background: rgba(255, 99, 71, 0.1); border-left: 3px solid #ff6347; padding: 8px; margin: 5px 0; border-radius: 0 4px 4px 0;">
                <div style="font-size: 0.85em; color: #ff6347; font-weight: bold;">${seed.reason}</div>
                <div style="font-size: 0.8em; color: #ccc; margin-top: 3px;">
                    May influence: ${seed.eventTypes.join(', ')} • Expires in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}
                </div>
            </div>
        `;
    });
    
    seedsList.innerHTML = seedsHTML;
}

function filterEvents(filterType) {
    // Update filter button states
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`[data-filter="${filterType}"]`).classList.add('active');
    
    // Update display
    updateEventLogDisplay(filterType);
}

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
        },
        lighthouse: {
            names: ['The {adjective} Lighthouse', '{adjective} {noun} Beacon', '{noun} Point'],
            adjectives: ['Stormy', 'Lonely', 'Windswept', 'Beacon', 'Old', 'Tall', 'Shining', 'Silent', 'Rocky', 'Distant'],
            nouns: ['Cliff', 'Rock', 'Light', 'Tower', 'Point', 'Cove', 'Bay', 'Harbor', 'Cape', 'Lantern']
        },
        graveyard: {
            names: ['{adjective} {noun} Cemetery', '{adjective} {noun} Graveyard', '{noun} Rest'],
            adjectives: ['Silent', 'Old', 'Shadowed', 'Peaceful', 'Forgotten', 'Sacred', 'Misty', 'Ancient', 'Lonely', 'Hallowed'],
            nouns: ['Oak', 'Willow', 'Stone', 'Hill', 'Cross', 'Vale', 'Field', 'Garden', 'Path', 'Gate']
        },
        school: {
            names: ['{adjective} School', '{noun} Academy', '{adjective} {noun} Institute'],
            adjectives: ['Bright', 'Old', 'Modern', 'Scholarly', 'Quiet', 'Bustling', 'Respected', 'Public', 'Private', 'Community'],
            nouns: ['Learning', 'Knowledge', 'Hope', 'Future', 'Wisdom', 'Scholars', 'Teachers', 'Students', 'Oak', 'Maple']
        }
    }
};

// Character Backstory Generation System - Enhanced like Dwarf Fortress
const backstoryGen = {
    // Life-shaping events that create depth and motivation
    majorLifeEvents: {
        childhood: [
            {
                event: "Lost a parent in the mine collapse",
                effects: { grief: 3, distrust_authority: 2, protective_instinct: 2 },
                connections: ["mine_accident_survivors", "single_parent_families"]
            },
            {
                event: "Grew up as an orphan, raised by the community",
                effects: { independence: 3, social_bonds: 2, abandonment_fear: 1 },
                connections: ["community_raised", "orphans"]
            },
            {
                event: "Child of a disgraced former mayor", 
                effects: { political_awareness: 3, shame: 2, redemption_drive: 2 },
                connections: ["political_families", "fallen_nobility"]
            },
            {
                event: "Survived a terrible fire that destroyed their family home",
                effects: { trauma: 2, resilience: 3, material_detachment: 2 },
                connections: ["disaster_survivors", "fire_victims"]
            },
            {
                event: "Born during a miraculous harvest after years of famine",
                effects: { optimism: 3, spiritual_connection: 2, community_pride: 2 },
                connections: ["miracle_generation", "blessed_children"]
            }
        ],
        adolescence: [
            {
                event: "Fell in love with someone from a rival family",
                effects: { forbidden_love: 3, defiance: 2, heartbreak: 1 },
                connections: ["star_crossed_lovers", "family_feuds"]
            },
            {
                event: "Apprenticed under a harsh but skilled master",
                effects: { work_ethic: 3, authority_issues: 2, perfectionism: 2 },
                connections: ["master_craftspeople", "harsh_teachers"]
            },
            {
                event: "Discovered a natural talent that changed their life path",
                effects: { confidence: 3, artistic_soul: 2, pressure: 1 },
                connections: ["talented_individuals", "gifted_artisans"]
            },
            {
                event: "Witnessed a terrible injustice they couldn't stop",
                effects: { justice_obsession: 3, helplessness: 2, activism: 2 },
                connections: ["injustice_witnesses", "future_activists"]
            }
        ],
        adulthood: [
            {
                event: "Lost their spouse in an accident",
                effects: { grief: 4, loneliness: 3, protective_instinct: 2 },
                connections: ["widowed", "tragic_losses", "accident_victims"]
            },
            {
                event: "Successfully defended the town during bandit raids",
                effects: { heroism: 3, combat_experience: 3, responsibility: 2 },
                connections: ["town_defenders", "war_heroes", "militia_veterans"]
            },
            {
                event: "Built a successful business from nothing",
                effects: { entrepreneurship: 3, self_reliance: 2, wealth_anxiety: 1 },
                connections: ["self_made", "business_founders", "success_stories"]
            },
            {
                event: "Took care of aging parents for years",
                effects: { duty: 3, patience: 2, sacrifice: 2 },
                connections: ["caregivers", "dutiful_children", "family_burden"]
            }
        ]
    },

    // Personality traits with depth and nuance
    personalityTraits: {
        primary: [
            { trait: "Stalwart Protector", description: "Puts community safety above all else", motivations: ["protect others", "maintain order"], fears: ["letting people down", "chaos"] },
            { trait: "Curious Scholar", description: "Driven to understand and learn", motivations: ["discover truth", "share knowledge"], fears: ["ignorance", "being proven wrong"] },
            { trait: "Wounded Healer", description: "Helps others while nursing their own pain", motivations: ["ease suffering", "find meaning"], fears: ["own vulnerability", "failing to help"] },
            { trait: "Ambitious Climber", description: "Seeks to rise above their station", motivations: ["gain power", "prove worth"], fears: ["remaining nobody", "humiliation"] },
            { trait: "Gentle Nurturer", description: "Finds joy in caring for others", motivations: ["create harmony", "help people grow"], fears: ["conflict", "causing harm"] },
            { trait: "Restless Wanderer", description: "Feels trapped by routine and expectations", motivations: ["explore unknown", "find freedom"], fears: ["being caged", "missing out"] },
            { trait: "Dutiful Traditionalist", description: "Believes in the old ways and proper order", motivations: ["preserve traditions", "maintain respect"], fears: ["change", "social chaos"] },
            { trait: "Passionate Revolutionary", description: "Burns to change what they see as wrong", motivations: ["fight injustice", "create change"], fears: ["oppression", "compromise"] }
        ],
        secondary: [
            "Quick wit and sharp tongue",
            "Deep empathy for outcasts",
            "Perfectionist tendencies",
            "Natural leadership qualities", 
            "Artistic and creative nature",
            "Strong sense of justice",
            "Tendency toward melancholy",
            "Infectious optimism",
            "Stubborn independence",
            "Fierce loyalty to friends"
        ]
    },

    // Family and social connections
    familyStructures: {
        types: [
            {
                type: "Large Extended Family",
                members: ["parents", "siblings", "aunts", "uncles", "cousins", "grandparents"],
                dynamics: "Close-knit clan with strong traditions and mutual support",
                secrets: ["family_feuds", "inherited_debts", "hidden_talents"]
            },
            {
                type: "Nuclear Family", 
                members: ["spouse", "children"],
                dynamics: "Self-reliant family unit focused on their own prosperity",
                secrets: ["marital_problems", "child_concerns", "financial_stress"]
            },
            {
                type: "Broken Family",
                members: ["estranged_siblings", "absent_parent", "step_relations"],
                dynamics: "Complicated relationships with unresolved tensions",
                secrets: ["family_shame", "abandonment_issues", "custody_battles"]
            },
            {
                type: "Chosen Family",
                members: ["close_friends", "mentor_figures", "adopted_kin"],
                dynamics: "Bonds forged by choice rather than blood",
                secrets: ["past_traumas", "shared_adventures", "mutual_obligations"]
            }
        ]
    },

    // Skills and talents that add depth
    skills: [
        { skill: "Master craftsperson", description: "Creates items of exceptional quality", social_status: 3 },
        { skill: "Gifted storyteller", description: "Can captivate any audience", social_status: 2 },
        { skill: "Healing knowledge", description: "Knows herbs and medical techniques", social_status: 2 },
        { skill: "Combat veteran", description: "Experienced in warfare and tactics", social_status: 2 },
        { skill: "Natural diplomat", description: "Can navigate complex social situations", social_status: 3 },
        { skill: "Keen investigator", description: "Excellent at uncovering secrets", social_status: 1 },
        { skill: "Spiritual advisor", description: "Provides guidance and comfort", social_status: 3 },
        { skill: "Economic mind", description: "Understands trade and finance", social_status: 2 }
    ],

    // Flaws and vulnerabilities that make characters human
    flaws: [
        { flaw: "Quick to anger", description: "Explosive temper that creates conflicts", consequences: "damaged_relationships" },
        { flaw: "Chronic worrier", description: "Anxiety about everything that could go wrong", consequences: "decision_paralysis" },
        { flaw: "Pride and arrogance", description: "Unwilling to admit mistakes or weakness", consequences: "isolated_leadership" },
        { flaw: "Addictive personality", description: "Struggles with alcohol, gambling, or other vices", consequences: "unreliable_behavior" },
        { flaw: "Overly trusting", description: "Believes the best in people despite evidence", consequences: "repeated_betrayals" },
        { flaw: "Secretive nature", description: "Keeps too much hidden from others", consequences: "mysterious_reputation" },
        { flaw: "Perfectionist paralysis", description: "Cannot act until conditions are perfect", consequences: "missed_opportunities" },
        { flaw: "Jealous tendencies", description: "Envious of others' success and happiness", consequences: "social_conflicts" }
    ],

    // Current life situations and goals
    currentSituations: [
        {
            situation: "Caring for a sick family member",
            stress_level: 3,
            time_commitment: "high",
            motivations: ["find_cure", "manage_costs", "get_support"]
        },
        {
            situation: "Planning to start their own business",
            stress_level: 2,
            time_commitment: "medium", 
            motivations: ["save_money", "learn_skills", "find_partners"]
        },
        {
            situation: "In a secret romantic relationship",
            stress_level: 2,
            time_commitment: "low",
            motivations: ["maintain_secrecy", "advance_relationship", "resolve_obstacles"]
        },
        {
            situation: "Investigating corruption in local government",
            stress_level: 3,
            time_commitment: "high",
            motivations: ["gather_evidence", "find_allies", "ensure_safety"]
        },
        {
            situation: "Training an apprentice or successor",
            stress_level: 1,
            time_commitment: "medium",
            motivations: ["pass_on_knowledge", "ensure_quality", "prepare_retirement"]
        }
    ]
};

// Relationship Generation System
const relationshipGen = {
    relationshipTypes: [
        // Family relationships
        { type: "parent", intensity: 4, description: "Parent-child bond with all its complexities" },
        { type: "child", intensity: 4, description: "Their beloved or troubled offspring" },
        { type: "spouse", intensity: 4, description: "Life partner sharing joys and struggles" },
        { type: "sibling", intensity: 3, description: "Brother or sister with shared history" },
        { type: "extended_family", intensity: 2, description: "Cousin, aunt, uncle, or in-law" },
        
        // Professional relationships  
        { type: "business_partner", intensity: 3, description: "Shares financial interests and risks" },
        { type: "mentor", intensity: 3, description: "Taught them important life skills" },
        { type: "apprentice", intensity: 3, description: "Learning from them or under their guidance" },
        { type: "colleague", intensity: 2, description: "Works in similar profession or location" },
        { type: "competitor", intensity: 2, description: "Rivalry over customers or resources" },
        
        // Social relationships
        { type: "best_friend", intensity: 4, description: "Closest confidant who knows their secrets" },
        { type: "close_friend", intensity: 3, description: "Regular companion and trusted ally" },
        { type: "neighbor", intensity: 2, description: "Lives nearby with regular interaction" },
        { type: "acquaintance", intensity: 1, description: "Known casually through community" },
        
        // Romantic relationships
        { type: "secret_lover", intensity: 4, description: "Hidden romantic relationship" },
        { type: "former_lover", intensity: 3, description: "Past romantic partner with lingering feelings" },
        { type: "unrequited_love", intensity: 3, description: "One-sided romantic feelings" },
        
        // Antagonistic relationships
        { type: "enemy", intensity: 4, description: "Active hatred and opposition" },
        { type: "rival", intensity: 3, description: "Competitive antagonism" },
        { type: "victim", intensity: 2, description: "Someone they wronged in the past" },
        { type: "oppressor", intensity: 3, description: "Someone who has power over them" },
        
        // Unique relationships
        { type: "creditor", intensity: 2, description: "Owes them money or favors" },
        { type: "debtor", intensity: 2, description: "They owe money or favors" },
        { type: "witness", intensity: 2, description: "Knows their secrets or witnessed events" },
        { type: "protege", intensity: 3, description: "Someone they're guiding or sponsoring" }
    ],

    relationshipQualities: [
        "respectful", "tense", "loving", "competitive", "supportive", "jealous", 
        "protective", "dependent", "suspicious", "trusting", "complicated", "growing",
        "declining", "stable", "passionate", "practical", "spiritual", "conflicted"
    ],

    relationshipHistory: [
        "They grew up together as children",
        "Met during a crisis that bonded them",
        "Worked together on an important project",
        "One helped the other through a difficult time", 
        "They discovered a shared secret",
        "Had a major disagreement that still affects them",
        "Were once lovers but now are friends",
        "One saved the other's life",
        "They share a mutual enemy or rival",
        "Connected through a third party who's now gone",
        "Bound by a promise or oath they made",
        "One knows something the other needs to keep hidden"
    ]
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
                'Five years back, the mountain groaned and the old mine collapsed, burying three souls and the town\'s prosperity with them.',
                'The official record says the mine was sealed for safety after the accident, but the earth still holds its secrets.',
                'A cave-in claimed three miners\' lives half a decade ago, and the town has never quite recovered from the loss.'
            ]
        },
        mysteryRumors: {
            type: 'rumored',
            texts: [
                'They say the miners weren\'t digging for ore, but for something ancient that should have been left undisturbed.',
                'Just before the collapse, folks heard unnatural echoes from the deep, like the mountain itself was whispering warnings.',
                'Some swear the accident was no accident at all, but a cover-up for a discovery too terrible to reveal.',
                'On moonless nights, people claim to hear faint tapping from behind the sealed mine entrance... a sound of something wanting out.'
            ]
        },
        economicImpact: {
            type: 'confirmed',
            texts: [
                'The old trade road is quieter now; the mine was the town\'s heartbeat, and its pulse is faint.',
                'With the mine gone, the town\'s wealth has dried up, leaving a fine dust of poverty on everything.',
                'The shimmer of rare minerals once brought merchants from afar, but now their wagons bypass us on their way to richer lands.',
                'Hope is a currency scarcer than coin since the mine was lost.'
            ]
        }
    },
    coastal: {
        primaryTragedy: {
            type: 'confirmed',
            texts: [
                'A decade ago, a storm of unnatural fury swallowed half the fishing fleet, leaving a generation of widows and fatherless sons.',
                'The legendary lighthouse, once the town\'s pride, has been dark for years, a silent monument to a forgotten tragedy.',
                'The sea gives, but it also takes. The Great Storm of yesteryear took more than its share of ships and souls.'
            ]
        },
        mysteryRumors: {
            type: 'rumored',
            texts: [
                'They say the old lighthouse keeper didn\'t fall; he was pushed by a rival who coveted his post.',
                'Some sailors claim to see a phantom ship on the horizon during storms, a vessel that never makes it to port.',
                'Whispers in the tavern suggest a cursed treasure was brought ashore, dooming the fleet that found it.',
                'The fog that rolls in from the sea isn\'t natural. It carries whispers, and sometimes, it doesn\'t recede alone.'
            ]
        },
        economicImpact: {
            type: 'confirmed',
            texts: [
                'The fish markets, once overflowing, now offer only meager catches. The sea grows stingy.',
                'Shipwrights and sailmakers have little work, their skills a relic of a more prosperous time.',
                'The town survives on salted fish and patched nets, a shadow of its former, bountiful self.',
                'Young folk look to the roads for their future, not the waves. The sea has lost its allure.'
            ]
        }
    },
    agricultural: {
        primaryTragedy: {
            type: 'confirmed',
            texts: [
                'A prolonged drought years ago turned the once-fertile fields to dust, and the scars on the land remain.',
                'A blight of unknown origin wiped out the heirloom crops, leaving the town dependent on less reliable harvests.',
                'The river that once nourished the valley shifted its course, leaving the most fertile lands high and dry.'
            ]
        },
        mysteryRumors: {
            type: 'rumored',
            texts: [
                'Some say the old landowner who lost his farm to the drought cursed the land with his dying breath.',
                'They whisper that the blight wasn\'t natural, but sabotage from a rival farming community.',
                'Children tell tales of strange, scarecrow-like figures seen walking the barren fields at twilight.',
                'The river didn\'t move on its own. Something downstream blocked its path for reasons no one understands.'
            ]
        },
        economicImpact: {
            type: 'confirmed',
            texts: [
                'The grain silo is rarely full, a hollow monument to a time of plenty.',
                'The town\'s famous ciders and breads are now just memories, the unique ingredients lost to time.',
                'Farmers struggle with new, unfamiliar crops that fetch a lower price at market.',
                'The annual harvest festival is a somber affair, a reminder of what\'s been lost rather than a celebration.'
            ]
        }
    }
};

// Universal story elements that work in any town
const universalStoryElements = {
    mayorSecrets: {
        type: 'rumored',
        texts: [
            'The Mayor entertains well-dressed strangers from the capital. They arrive after dark and leave before dawn.',
            'A new tax is coming, they whisper. One that will benefit the Mayor\'s friends and cripple the common folk.',
            'The Mayor speaks of progress, but some say they\'re selling off the town\'s future piece by piece to an outside power.',
            'The town\'s charter, which grants its rights and freedoms, has gone missing from the Mayor\'s office.'
        ]
    },
    personalStories: {
        type: 'confirmed',
        texts: [
            'The blacksmith\'s daughter has a secret suitor, one her father would never approve of.',
            'The old weaver is going blind, and with her failing eyes goes the secret of the town\'s traditional patterns.',
            'A feud between two prominent families, once a low simmer, is about to boil over into public conflict.',
            'The innkeeper\'s son dreams of being an adventurer, a dangerous ambition in a town that clings to safety.'
        ]
    },
    socialTension: {
        type: 'rumored',
        texts: [
            'The guards are cracking down on \'sedition,\' but it seems they\'re only silencing those who question the Mayor\'s authority.',
            'There\'s a growing divide between those who cling to the old ways and those who demand change, a rift that could tear the town apart.',
            'The wealthy merchants are hoarding grain, waiting for the prices to rise as the common folk go hungry.',
            'A charismatic newcomer is gaining a following, preaching a message of rebellion that is as tempting as it is dangerous.'
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
    if (!locationData) {
        console.warn(`No location data found for type: ${locationType}`);
        return `Generic ${locationType}`;
    }
    
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
    const age = randomChoice(characterGen.ages);
    const appearance = randomChoice(characterGen.appearances);
    
    // Generate rich backstory using the new system
    const backstory = generateBackstory();
    
    // Generate deep personality traits
    const personalityTrait = randomChoice(backstoryGen.personalityTraits.primary);
    const secondaryTrait = randomChoice(backstoryGen.personalityTraits.secondary);
    
    // Generate skills and flaws
    const skill = randomChoice(backstoryGen.skills);
    const flaw = randomChoice(backstoryGen.flaws);
    
    // Generate current life situation
    const currentSituation = randomChoice(backstoryGen.currentSituations);
    
    // Generate family structure
    const familyStructure = randomChoice(backstoryGen.familyStructures.types);
    
    // Generate relationships (will be connected to other characters later)
    const relationships = [];
    const secrets = generateEnhancedSecrets(backstory, personalityTrait, flaw);
    
    // Generate story preferences based on personality and background
    const storyPreferences = generateEnhancedStoryPreferences(personalityTrait, backstory, profession);
    
    return {
        profession,
        age,
        appearance,
        // Enhanced character data
        backstory,
        personalityTrait,
        secondaryTrait,
        skill,
        flaw,
        currentSituation,
        familyStructure,
        relationships, // Will be populated during town generation
        secrets,
        storyPreferences,
        // Psychological profile
        psychologicalProfile: {
            motivations: personalityTrait.motivations,
            fears: personalityTrait.fears,
            stressLevel: currentSituation.stress_level,
            emotionalState: determineEmotionalState(backstory, personalityTrait, flaw)
        }
    };
}

// Enhanced character generation functions for rich backstories

function generateBackstory() {
    const backstory = {
        lifeEvents: [],
        connections: [],
        formativeExperiences: []
    };
    
    // Generate 1-2 childhood events
    const childEvents = Math.random() < 0.7 ? 1 : 2;
    for (let i = 0; i < childEvents; i++) {
        const event = randomChoice(backstoryGen.majorLifeEvents.childhood);
        backstory.lifeEvents.push({...event, period: 'childhood'});
        backstory.connections.push(...event.connections);
    }
    
    // Generate 1-2 adolescence events
    const teenEvents = Math.random() < 0.8 ? 1 : 2;
    for (let i = 0; i < teenEvents; i++) {
        const event = randomChoice(backstoryGen.majorLifeEvents.adolescence);
        backstory.lifeEvents.push({...event, period: 'adolescence'});
        backstory.connections.push(...event.connections);
    }
    
    // Generate 1-3 adulthood events
    const adultEvents = 1 + Math.floor(Math.random() * 3);
    for (let i = 0; i < adultEvents; i++) {
        const event = randomChoice(backstoryGen.majorLifeEvents.adulthood);
        backstory.lifeEvents.push({...event, period: 'adulthood'});
        backstory.connections.push(...event.connections);
    }
    
    return backstory;
}

function generateEnhancedSecrets(backstory, personalityTrait, flaw) {
    const secrets = [];
    
    // Secrets based on life events
    backstory.lifeEvents.forEach(event => {
        if (Math.random() < 0.4) { // 40% chance each event creates a secret
            const eventSecrets = {
                'Lost a parent in the mine collapse': 'Blames themselves for not warning their parent about the danger',
                'Grew up as an orphan, raised by the community': 'Knows who their real parents were but keeps it hidden',
                'Child of a disgraced former mayor': 'Has evidence that could clear their parent\'s name',
                'Survived a terrible fire': 'The fire wasn\'t an accident - they know who started it',
                'Fell in love with someone from a rival family': 'Still exchanges secret letters with their forbidden love',
                'Apprenticed under a harsh but skilled master': 'Discovered their master was embezzling from customers',
                'Discovered a natural talent': 'Their talent comes from an unusual source they can\'t reveal',
                'Witnessed a terrible injustice': 'Has evidence but fears the consequences of speaking up',
                'Lost their spouse in an accident': 'Suspects the accident was actually deliberate',
                'Successfully defended the town': 'Made morally questionable choices during the defense',
                'Built a successful business': 'Their success involved unethical practices they regret',
                'Took care of aging parents': 'Discovered dark family secrets while caring for them'
            };
            
            const secret = eventSecrets[event.event];
            if (secret) {
                secrets.push(secret);
            }
        }
    });
    
    // Secrets based on personality flaws
    const flawSecrets = {
        'Quick to anger': 'Once hurt someone badly in a rage and covers it up',
        'Chronic worrier': 'Has detailed escape plans for every possible disaster',
        'Pride and arrogance': 'Made a terrible mistake they refuse to acknowledge',
        'Addictive personality': 'Secretly struggles with their addiction daily',
        'Overly trusting': 'Been betrayed so many times they\'ve become secretly paranoid',
        'Secretive nature': 'Keeps detailed records of everyone else\'s secrets',
        'Perfectionist paralysis': 'Has an important unfinished project they\'re too afraid to complete',
        'Jealous tendencies': 'Sabotaged someone they envied and got away with it'
    };
    
    if (Math.random() < 0.6) { // 60% chance of flaw-based secret
        const secret = flawSecrets[flaw.flaw];
        if (secret) {
            secrets.push(secret);
        }
    }
    
    // Add a random secret if we don't have any yet
    if (secrets.length === 0) {
        const genericSecrets = [
            'Has a hidden talent they\'ve never revealed',
            'Knows about a treasure buried somewhere in town',
            'Is related to someone important they\'ve never acknowledged',
            'Witnessed something years ago they\'ve never told anyone',
            'Has feelings for someone they could never admit to',
            'Made a promise they\'ve never been able to keep',
            'Holds a grudge over something most people have forgotten'
        ];
        secrets.push(randomChoice(genericSecrets));
    }
    
    return secrets;
}

function generateEnhancedStoryPreferences(personalityTrait, backstory, profession) {
    const preferences = {
        themes: [],
        truthLevel: '',
        tone: '',
        bonusPreferences: [],
        triggers: [] // Stories that would strongly affect them
    };
    
    // Theme preferences based on personality trait
    const traitThemes = {
        'Stalwart Protector': ['government', 'community', 'heroism'],
        'Curious Scholar': ['mystery', 'discovery', 'truth'],
        'Wounded Healer': ['tragedy', 'hope', 'redemption'],
        'Ambitious Climber': ['politics', 'success', 'transformation'],
        'Gentle Nurturer': ['family', 'community', 'growth'],
        'Restless Wanderer': ['adventure', 'freedom', 'exploration'],
        'Dutiful Traditionalist': ['tradition', 'order', 'stability'],
        'Passionate Revolutionary': ['change', 'justice', 'rebellion']
    };
    
    // Truth level preferences based on personality
    const traitTruthLevel = {
        'Stalwart Protector': 'confirmed',
        'Curious Scholar': 'confirmed',
        'Wounded Healer': 'rumored',
        'Ambitious Climber': 'rumored',
        'Gentle Nurturer': 'confirmed',
        'Restless Wanderer': 'madeUp',
        'Dutiful Traditionalist': 'confirmed',
        'Passionate Revolutionary': 'rumored'
    };
    
    // Tone preferences
    const traitTones = {
        'Stalwart Protector': 'heroic',
        'Curious Scholar': 'intellectual',
        'Wounded Healer': 'hopeful',
        'Ambitious Climber': 'dramatic',
        'Gentle Nurturer': 'heartwarming',
        'Restless Wanderer': 'adventurous',
        'Dutiful Traditionalist': 'respectful',
        'Passionate Revolutionary': 'passionate'
    };
    
    preferences.themes = traitThemes[personalityTrait.trait] || ['general', 'community'];
    preferences.truthLevel = traitTruthLevel[personalityTrait.trait] || 'confirmed';
    preferences.tone = traitTones[personalityTrait.trait] || 'dramatic';
    
    // Add triggers based on backstory events
    backstory.lifeEvents.forEach(event => {
        if (event.event.includes('mine collapse') || event.event.includes('accident')) {
            preferences.triggers.push('industrial_disaster');
        }
        if (event.event.includes('orphan') || event.event.includes('parent')) {
            preferences.triggers.push('family_separation');
        }
        if (event.event.includes('love') || event.event.includes('spouse')) {
            preferences.triggers.push('romance');
        }
        if (event.event.includes('defended') || event.event.includes('injustice')) {
            preferences.triggers.push('justice_themes');
        }
    });
    
    return preferences;
}

function determineEmotionalState(backstory, personalityTrait, flaw) {
    let stressScore = 0;
    let positiveScore = 0;
    
    // Calculate stress from life events
    backstory.lifeEvents.forEach(event => {
        Object.values(event.effects).forEach(intensity => {
            if (['grief', 'trauma', 'shame', 'heartbreak', 'helplessness', 'loneliness'].some(neg => 
                Object.keys(event.effects).includes(neg))) {
                stressScore += intensity;
            } else {
                positiveScore += intensity;
            }
        });
    });
    
    // Factor in personality
    if (personalityTrait.fears.includes('chaos') || personalityTrait.fears.includes('failure')) {
        stressScore += 1;
    }
    if (personalityTrait.motivations.includes('help people') || personalityTrait.motivations.includes('create harmony')) {
        positiveScore += 1;
    }
    
    // Factor in flaw consequences
    if (flaw.consequences === 'damaged_relationships' || flaw.consequences === 'social_conflicts') {
        stressScore += 1;
    }
    
    // Determine emotional state
    if (stressScore > positiveScore + 2) {
        return 'troubled';
    } else if (positiveScore > stressScore + 2) {
        return 'content';
    } else if (stressScore > 4) {
        return 'anxious';
    } else if (positiveScore > 4) {
        return 'optimistic';
    } else {
        return 'stable';
    }
}

// Relationship Generation - Creates interconnected character web like Dwarf Fortress
function generateCharacterRelationships(allNPCs, townInfo) {
    // Clear any existing relationships
    allNPCs.forEach(npc => {
        npc.character.relationships = [];
    });
    
    // Create family connections first
    generateFamilyConnections(allNPCs);
    
    // Create professional relationships
    generateProfessionalRelationships(allNPCs);
    
    // Create social relationships based on shared experiences
    generateSocialRelationships(allNPCs, townInfo);
    
    // Create romantic relationships
    generateRomanticRelationships(allNPCs);
    
    // Create conflicts and rivalries
    generateConflictRelationships(allNPCs);
    
    // Add relationship awareness to each character
    addRelationshipAwareness(allNPCs);
}

function generateFamilyConnections(allNPCs) {
    const familyGroups = [];
    
    // Create family clusters
    allNPCs.forEach(npc => {
        const family = npc.character.familyStructure;
        
        if (family.type === "Large Extended Family" && Math.random() < 0.3) {
            // 30% chance to have family members in town
            const possibleRelatives = allNPCs.filter(other => 
                other !== npc && 
                !other.character.relationships.some(rel => rel.targetName === npc.name) &&
                Math.abs(getAgeValue(other.character.age) - getAgeValue(npc.character.age)) < 30
            );
            
            if (possibleRelatives.length > 0) {
                const relative = randomChoice(possibleRelatives);
                const relationshipType = randomChoice(['sibling', 'extended_family', 'parent', 'child']);
                
                createMutualRelationship(npc, relative, relationshipType, 'family');
            }
        }
        
        if (family.type === "Nuclear Family" && Math.random() < 0.2) {
            // 20% chance to have spouse/child in town
            const possibleFamily = allNPCs.filter(other => 
                other !== npc && 
                !other.character.relationships.some(rel => rel.targetName === npc.name)
            );
            
            if (possibleFamily.length > 0) {
                const familyMember = randomChoice(possibleFamily);
                const relationshipType = Math.random() < 0.6 ? 'spouse' : 'child';
                
                createMutualRelationship(npc, familyMember, relationshipType, 'family');
            }
        }
    });
}

function generateProfessionalRelationships(allNPCs) {
    // Group NPCs by profession and location
    const professionGroups = {};
    
    allNPCs.forEach(npc => {
        const key = `${npc.character.profession}_${npc.location}`;
        if (!professionGroups[key]) {
            professionGroups[key] = [];
        }
        professionGroups[key].push(npc);
    });
    
    // Create relationships within professional groups
    Object.values(professionGroups).forEach(group => {
        if (group.length > 1) {
            for (let i = 0; i < group.length; i++) {
                for (let j = i + 1; j < group.length; j++) {
                    if (Math.random() < 0.7) { // 70% chance of professional relationship
                        const relationshipType = randomChoice(['colleague', 'mentor', 'competitor']);
                        createMutualRelationship(group[i], group[j], relationshipType, 'professional');
                    }
                }
            }
        }
    });
    
    // Create cross-profession business relationships
    const businessTypes = ['Baker', 'Merchant', 'Barkeep', 'Store owner'];
    const businessNPCs = allNPCs.filter(npc => 
        businessTypes.some(type => npc.character.profession.includes(type))
    );
    
    businessNPCs.forEach(businessNPC => {
        const potentialPartners = allNPCs.filter(other => 
            other !== businessNPC && 
            businessTypes.some(type => other.character.profession.includes(type)) &&
            Math.random() < 0.4
        );
        
        potentialPartners.forEach(partner => {
            if (!hasRelationshipWith(businessNPC, partner.name)) {
                createMutualRelationship(businessNPC, partner, 'business_partner', 'professional');
            }
        });
    });
}

function generateSocialRelationships(allNPCs, townInfo) {
    // Create friendships based on shared backstory connections
    allNPCs.forEach(npc => {
        const connections = npc.character.backstory.connections;
        
        const potentialFriends = allNPCs.filter(other => 
            other !== npc && 
            other.character.backstory.connections.some(conn => connections.includes(conn))
        );
        
        potentialFriends.forEach(friend => {
            if (Math.random() < 0.5 && !hasRelationshipWith(npc, friend.name)) {
                const sharedConnection = connections.find(conn => 
                    friend.character.backstory.connections.includes(conn)
                );
                
                const relationshipType = Math.random() < 0.7 ? 'close_friend' : 'best_friend';
                createMutualRelationship(npc, friend, relationshipType, 'social', 
                    generateRelationshipHistory(sharedConnection));
            }
        });
    });
    
    // Create neighborhood relationships
    const locationGroups = {};
    allNPCs.forEach(npc => {
        if (!locationGroups[npc.location]) {
            locationGroups[npc.location] = [];
        }
        locationGroups[npc.location].push(npc);
    });
    
    Object.values(locationGroups).forEach(group => {
        group.forEach(npc => {
            const neighbors = group.filter(other => 
                other !== npc && 
                Math.random() < 0.3 && 
                !hasRelationshipWith(npc, other.name)
            );
            
            neighbors.forEach(neighbor => {
                createMutualRelationship(npc, neighbor, 'neighbor', 'social');
            });
        });
    });
}

function generateRomanticRelationships(allNPCs) {
    const availableForRomance = allNPCs.filter(npc => 
        !npc.character.relationships.some(rel => 
            ['spouse', 'secret_lover'].includes(rel.relationshipType)
        )
    );
    
    // Create romantic relationships
    for (let i = 0; i < availableForRomance.length; i++) {
        const person1 = availableForRomance[i];
        if (Math.random() < 0.15) { // 15% chance of being in a romantic relationship
            const potentialPartners = availableForRomance.filter(other => 
                other !== person1 && 
                !hasRelationshipWith(person1, other.name) &&
                Math.abs(getAgeValue(person1.character.age) - getAgeValue(other.character.age)) < 25
            );
            
            if (potentialPartners.length > 0) {
                const partner = randomChoice(potentialPartners);
                const isSecret = Math.random() < 0.3;
                const relationshipType = isSecret ? 'secret_lover' : 'spouse';
                
                createMutualRelationship(person1, partner, relationshipType, 'romantic');
                
                // Remove partner from available list
                const partnerIndex = availableForRomance.indexOf(partner);
                if (partnerIndex > -1) {
                    availableForRomance.splice(partnerIndex, 1);
                }
            }
        }
    }
    
    // Create unrequited love
    allNPCs.forEach(npc => {
        if (Math.random() < 0.1 && // 10% chance of unrequited love
            !npc.character.relationships.some(rel => rel.category === 'romantic')) {
            
            const targets = allNPCs.filter(other => 
                other !== npc && 
                !hasRelationshipWith(npc, other.name)
            );
            
            if (targets.length > 0) {
                const target = randomChoice(targets);
                npc.character.relationships.push({
                    targetName: target.name,
                    relationshipType: 'unrequited_love',
                    category: 'romantic',
                    intensity: 3,
                    quality: 'yearning',
                    history: 'Has harbored secret feelings but never confessed'
                });
            }
        }
    });
}

function generateConflictRelationships(allNPCs) {
    // Create rivalries and enemies based on conflicting interests
    allNPCs.forEach(npc => {
        if (Math.random() < 0.2) { // 20% chance of having an enemy/rival
            const potentialConflicts = allNPCs.filter(other => 
                other !== npc && 
                !hasRelationshipWith(npc, other.name) &&
                (
                    // Professional competition
                    other.character.profession === npc.character.profession ||
                    // Personality conflicts
                    personalityConflicts(npc.character.personalityTrait, other.character.personalityTrait) ||
                    // Flaw-based conflicts
                    flawConflicts(npc.character.flaw, other.character.flaw)
                )
            );
            
            if (potentialConflicts.length > 0) {
                const conflict = randomChoice(potentialConflicts);
                const isEnemy = Math.random() < 0.3;
                const relationshipType = isEnemy ? 'enemy' : 'rival';
                const reason = generateConflictReason(npc, conflict);
                
                createMutualRelationship(npc, conflict, relationshipType, 'antagonistic', reason);
            }
        }
    });
}

function addRelationshipAwareness(allNPCs) {
    // Each character gains knowledge about other characters' relationships
    allNPCs.forEach(npc => {
        npc.character.knownRelationships = [];
        
        // Characters know about relationships of people they're close to
        const closeRelationships = npc.character.relationships.filter(rel => 
            rel.intensity >= 3
        );
        
        closeRelationships.forEach(closeRel => {
            const closePersonNPC = allNPCs.find(other => other.name === closeRel.targetName);
            if (closePersonNPC) {
                // Know about some of their close person's relationships
                const knownRelationships = closePersonNPC.character.relationships.filter(() => 
                    Math.random() < 0.6 // 60% chance of knowing about each relationship
                );
                
                knownRelationships.forEach(rel => {
                    npc.character.knownRelationships.push({
                        subject: closeRel.targetName,
                        target: rel.targetName,
                        relationship: rel.relationshipType,
                        opinion: generateOpinionAboutRelationship(npc, closeRel, rel)
                    });
                });
            }
        });
        
        // Characters also know about public relationships (marriages, business partnerships)
        const publicRelationships = [];
        allNPCs.forEach(other => {
            if (other !== npc) {
                const publicRels = other.character.relationships.filter(rel => 
                    ['spouse', 'business_partner', 'enemy'].includes(rel.relationshipType)
                );
                publicRels.forEach(rel => {
                    if (Math.random() < 0.8) { // 80% chance of knowing public relationships
                        publicRelationships.push({
                            subject: other.name,
                            target: rel.targetName,
                            relationship: rel.relationshipType,
                            opinion: 'public_knowledge'
                        });
                    }
                });
            }
        });
        
        npc.character.knownRelationships.push(...publicRelationships);
    });
}

// Helper functions for relationship system
function createMutualRelationship(npc1, npc2, relationshipType, category, history = null) {
    const relTypeData = relationshipGen.relationshipTypes.find(rt => rt.type === relationshipType);
    const intensity = relTypeData ? relTypeData.intensity : 2;
    const quality = randomChoice(relationshipGen.relationshipQualities);
    const relationshipHistory = history || randomChoice(relationshipGen.relationshipHistory);
    
    // Add relationship to first character
    npc1.character.relationships.push({
        targetName: npc2.name,
        relationshipType: relationshipType,
        category: category,
        intensity: intensity,
        quality: quality,
        history: relationshipHistory
    });
    
    // Add reciprocal relationship to second character
    npc2.character.relationships.push({
        targetName: npc1.name,
        relationshipType: relationshipType,
        category: category,
        intensity: intensity,
        quality: quality,
        history: relationshipHistory
    });
}

function hasRelationshipWith(npc, targetName) {
    return npc.character.relationships.some(rel => rel.targetName === targetName);
}

function getAgeValue(age) {
    const ageMap = {
        'Young adult': 25,
        'Adult': 35,
        'Middle-aged': 50,
        'Elderly': 70
    };
    return ageMap[age] || 35;
}

function personalityConflicts(trait1, trait2) {
    const conflicts = {
        'Dutiful Traditionalist': ['Passionate Revolutionary', 'Restless Wanderer'],
        'Passionate Revolutionary': ['Dutiful Traditionalist', 'Stalwart Protector'],
        'Ambitious Climber': ['Gentle Nurturer', 'Dutiful Traditionalist'],
        'Restless Wanderer': ['Dutiful Traditionalist', 'Gentle Nurturer']
    };
    
    return conflicts[trait1.trait] && conflicts[trait1.trait].includes(trait2.trait);
}

function flawConflicts(flaw1, flaw2) {
    const conflicts = {
        'Pride and arrogance': ['Pride and arrogance'],
        'Quick to anger': ['Quick to anger', 'Perfectionist paralysis'],
        'Jealous tendencies': ['Ambitious Climber', 'Pride and arrogance']
    };
    
    return conflicts[flaw1.flaw] && conflicts[flaw1.flaw].includes(flaw2.flaw);
}

function generateConflictReason(npc1, npc2) {
    const reasons = [
        `Disagreement over professional practices`,
        `Competing for the same customers or resources`,
        `Past misunderstanding that escalated`,
        `Different views on town governance`,
        `Personality clash that grew into animosity`,
        `One wronged the other's family member`,
        `Business deal gone bad`,
        `Competing for the same romantic interest`
    ];
    
    return randomChoice(reasons);
}

function generateRelationshipHistory(sharedConnection) {
    const connectionHistories = {
        'mine_accident_survivors': 'Both survived the mine collapse and helped each other through the aftermath',
        'community_raised': 'Grew up together as orphans, supporting each other through difficult times',
        'family_feuds': 'Despite their families\' enmity, they found common ground',
        'disaster_survivors': 'Bonded while helping rebuild after a community disaster',
        'star_crossed_lovers': 'Once harbored romantic feelings but life took them different paths',
        'master_craftspeople': 'Learned their trades from the same master craftsperson',
        'town_defenders': 'Fought side by side to protect the town from bandits'
    };
    
    return connectionHistories[sharedConnection] || randomChoice(relationshipGen.relationshipHistory);
}

function generateOpinionAboutRelationship(observer, observerRel, observedRel) {
    // Generate opinions based on observer's personality and values
    const opinions = [
        'approves', 'disapproves', 'envies', 'worries about', 
        'supports', 'finds suspicious', 'thinks is unhealthy', 
        'believes is good for both', 'thinks is doomed to fail'
    ];
    
    return randomChoice(opinions);
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

// Dynamic Dialogue System - Changes every day
function generateEnhancedDialogue(character, info, characterData) {
    const day = gameState.day;
    const conversationsHad = characterData ? characterData.conversationsHad : 0;
    const relationshipLevel = characterData ? characterData.relationshipLevel : 'acquaintance';
    const lastSeen = characterData ? characterData.lastSeen : 0;
    const daysSinceLastTalk = day - lastSeen;
    
    // Multiple dialogue variations that change based on context
    const dialogueVariations = {
        firstMeeting: [
            'Welcome to our town, traveler. ',
            'Ah, a new face in town. ',
            'Hello there, stranger. '
        ],
        returningAfterAbsence: [
            'Well, well! Look who is back. ',
            'You are back! I thought you might have moved on. ',
            'The wandering storyteller returns. '
        ],
        dailyGreeting: [
            'Good to see you again. ',
            'Ah, my favorite storyteller returns. ',
            'You are becoming a regular around here. '
        ],
        deepeningRelationship: [
            'I have been thinking about what you said yesterday. ',
            'I feel like I can trust you more now. ',
            'Since we have talked before, I should mention that '
        ],
        morning: [
            'Good morning! The town is just waking up. ',
            'Early riser, eh? ',
            'Just getting started with the day. '
        ],
        evening: [
            'Evening already? The day has flown by. ',
            'It has been a long day. ',
            'As the day winds down, I find myself reflecting on '
        ]
    };
    
    const outros = {
        firstMeeting: [
            'I hope you find what you are looking for here.',
            'Feel free to ask if you need anything.',
            'It is always good to meet new people.'
        ],
        returningAfterAbsence: [
            'It is good to see a familiar face again.',
            'I hope you have been well since we last spoke.',
            'The town has not been the same without your stories.'
        ],
        dailyGreeting: [
            'I look forward to hearing what you have learned today.',
            'Your stories always brighten my day.',
            'You are getting to know this town well.'
        ],
        deepeningRelationship: [
            'I am glad we have had these conversations.',
            'You are not like other travelers who just pass through.',
            'I feel like you really understand this place.'
        ],
        morning: [
            'The day is young, plenty of time for stories.',
            'Morning is when I do my best thinking.',
            'A fresh day brings fresh opportunities.'
        ],
        evening: [
            'The evening always brings a different perspective.',
            'Time to rest and prepare for tomorrow.',
            'The night brings its own kind of wisdom.'
        ]
    };
    
    // Determine which variation to use based on multiple factors
    let variation = 'dailyGreeting';
    
    if (conversationsHad === 0) {
        variation = 'firstMeeting';
    } else if (daysSinceLastTalk > 3) {
        variation = 'returningAfterAbsence';
    } else if (relationshipLevel === 'friend' || relationshipLevel === 'confidant') {
        variation = 'deepeningRelationship';
    } else if (day % 2 === 0) { // Alternate between morning/evening themes
        variation = 'morning';
    } else {
        variation = 'evening';
    }
    
    // Add day-specific variations
    if (day === 1) {
        variation = 'firstMeeting';
    } else if (day > 10 && Math.random() < 0.3) {
        variation = 'deepeningRelationship';
    }
    
    // Get random intro and outro from the appropriate variation
    const intros = dialogueVariations[variation];
    const variationOutros = outros[variation];
    
    const intro = intros[Math.floor(Math.random() * intros.length)];
    const outro = variationOutros[Math.floor(Math.random() * variationOutros.length)];
    
    // Add emotional context based on character state
    let emotionalContext = '';
    if (character.psychologicalProfile) {
        const emotionalState = character.psychologicalProfile.emotionalState;
        if (emotionalState === 'troubled') {
            emotionalContext = ' *They seem agitated* ';
        } else if (emotionalState === 'optimistic') {
            emotionalContext = ' *Their mood seems bright* ';
        } else if (emotionalState === 'anxious') {
            emotionalContext = ' *They glance around nervously* ';
        }
    }
    
    // Add relationship-specific context
    let relationshipContext = '';
    if (relationshipLevel === 'friend') {
        relationshipContext = ' You know, since we have talked before, ';
    } else if (relationshipLevel === 'confidant') {
        relationshipContext = ' I trust you enough to tell you that ';
    }
    
    // Add recent events context
    let recentEventsContext = '';
    if (gameState.lastPerformanceEffectiveness) {
        const effectiveness = gameState.lastPerformanceEffectiveness;
        if (effectiveness > 0.8) {
            recentEventsContext = ' I heard about your amazing performance last night! ';
        } else if (effectiveness < 0.3) {
            recentEventsContext = ' I heard things did not go so well last night. ';
        }
    }
    
    // Add day-specific context
    let dayContext = '';
    if (day === 1) {
        dayContext = ' Your first day in town, eh? ';
    } else if (day > 5) {
        dayContext = ' You have been here a while now. ';
    }
    
    // Add conversation-specific context
    let conversationContext = '';
    if (conversationsHad > 5) {
        conversationContext = ' We have talked many times now. ';
    } else if (conversationsHad > 2) {
        conversationContext = ' We are getting to know each other. ';
    }
    
    // Combine everything with randomization
    const baseInfo = info.text.charAt(0).toLowerCase() + info.text.slice(1);
    const contexts = [emotionalContext, recentEventsContext, dayContext, conversationContext, relationshipContext].filter(c => c);
    
    // Randomly include some contexts to make dialogue more varied
    const selectedContexts = contexts.filter(() => Math.random() < 0.7);
    const fullDialogue = intro + selectedContexts.join('') + baseInfo + ' ' + outro;
    
    return fullDialogue;
}

function generateDialogue(character, info) {
    // Use enhanced dialogue system if we have character data
    const characterData = gameState.knownCharacters[character.name];
    if (characterData) {
        return generateEnhancedDialogue(character, info, characterData);
    }
    
    // Fallback to original system for new characters
    const intros = {
        'Barkeep': `This old tavern has heard more tales than I've poured ales. What's your story, traveler? Speaking of stories, `,
        'Baker': `Ah, the smell of fresh bread. It's one of the few simple comforts left. You know, `,
        'Merchant': `Another traveler. Welcome. Trade isn't what it once was. For instance, `,
        'Former miner': `*He stares into his drink, then looks up at you with hollow eyes.* You weren't here for the good times. Before the collapse, `,
        'Guard captain': `Keep your nose clean and we'll get along fine. The Mayor wants order, and I provide it. But even I've noticed `,
        'Town clerk': `*She nervously shuffles a stack of papers.* Official business. Always so much of it. If you read between the lines, you'd see that `,
        'Mayor': `Welcome to our town! We are on the cusp of a grand new chapter. Of course, progress requires... adjustments. For example, `,
        'Widow/widower': `It's a quiet life, now. My dearly departed used to say that `,
        'Former fisherman': `The sea... she's a fickle mistress. One day she gives you a bounty, the next she takes it all away. I remember when `,
        'Dock worker': `Busy, busy. Always something to load or unload. But the cargo's been... different lately. `,
        'Mill worker': `The great wheel turns, day in and day out. It's steady work, which is more than some can say. I've heard that `
    };

    const leadIn = intros[character.profession] || `Hello there, traveler. I was just thinking about how `;
    
    // Add personality-based flavor based on their current emotional state and background
    let emotionalContext = '';
    if (character.psychologicalProfile) {
        switch(character.psychologicalProfile.emotionalState) {
            case 'troubled':
                emotionalContext = ' *Their hands shake slightly as they speak* ';
                break;
            case 'anxious':
                emotionalContext = ' *They glance around nervously* ';
                break;
            case 'optimistic':
                emotionalContext = ' *Their eyes brighten with hope* ';
                break;
            case 'content':
                emotionalContext = ' *They speak with quiet confidence* ';
                break;
        }
    }
    
    const baseDialogue = `${leadIn}${emotionalContext}${info.text.charAt(0).toLowerCase() + info.text.slice(1)}`;
    
    // Add a concluding sentence that reflects the character's personality trait and current situation.
    const personalityTrait = character.personalityTrait ? character.personalityTrait.trait : 'Unknown';
    const outros = {
        'Stalwart Protector': `...Someone needs to keep watch over this place, and I suppose that's me.`,
        'Curious Scholar': `...There's always more to learn if you know where to look.`,
        'Wounded Healer': `...We all carry our burdens, but maybe sharing them makes them lighter.`,
        'Ambitious Climber': `...Mark my words, things are going to change around here, one way or another.`,
        'Gentle Nurturer': `...I just want what's best for everyone, you understand?`,
        'Restless Wanderer': `...Sometimes I wonder what lies beyond these familiar streets.`,
        'Dutiful Traditionalist': `...The old ways may seem outdated, but they've kept us together this long.`,
        'Passionate Revolutionary': `...The time for change is coming, whether people are ready or not.`,
        // Fallback for old personality system
        'Suspicious and paranoid': `...But don't you go repeating that. You never know who's listening.`,
        'Wise but melancholy': `...It's just the way of things, I suppose.`,
        'Gossipy and talkative': `...and that's the truth of it! Or, well, something like it!`,
        'Quiet and observant': `...Make of that what you will.`,
        'Mysterious and evasive': `...Or so I've heard. One can never be too sure.`,
        'Hardworking and practical': `...Just another problem to solve. Now, if you'll excuse me, the work won't do itself.`,
        'Dreamy and philosophical': `...It makes you wonder about the grand tapestry of it all, doesn't it?`,
        'Bitter about the past': `...This town is drowning in its own history, and no one seems to care.`
    };

    const concludingRemark = outros[personalityTrait] || outros[character.personality] || ``;
    
    return `${baseDialogue} ${concludingRemark}`;
}

function distributeStoryElements(townType) {
    // Use evolved story state if available
    if (gameState.townStoryState && gameState.townStoryState.elements) {
        // Filter out debunked and old news (unless we're running low on content)
        let availableElements = gameState.townStoryState.elements.filter(e => 
            e.currentType !== 'debunked' && e.currentType !== 'old_news'
        );
        
        // If we don't have enough active elements, include old news
        if (availableElements.length < 8) {
            availableElements = gameState.townStoryState.elements.filter(e => 
                e.currentType !== 'debunked'
            );
        }

        // Convert to the format expected by the rest of the system
        const formattedElements = availableElements.map(element => ({
            text: element.originalText,
            type: element.currentType,
            id: element.id,
            evolutionHistory: element.evolutionHistory
        }));

        // Shuffle and return
        for (let i = formattedElements.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [formattedElements[i], formattedElements[j]] = [formattedElements[j], formattedElements[i]];
        }

        return formattedElements;
    }

    // Fallback to original system if no story state exists
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
    
    // Add lighthouse for coastal towns
    if (townInfo.type === 'coastal') {
        locationData.lighthouse = {
            name: `🗼 ${generateLocationName('lighthouse')}`,
            description: `The lighthouse stands tall on the cliffs, guiding ships safely to harbor. Its keeper is a local legend.`,
            npcs: []
        };
    }
    // Add more locations as desired (e.g., graveyard, school, etc.)
    locationData.graveyard = {
        name: `⚰️ ${generateLocationName('graveyard')}`,
        description: `The graveyard is a quiet, somber place, filled with the stories of those who came before.`,
        npcs: []
    };
    locationData.school = {
        name: `🏫 ${generateLocationName('school')}`,
        description: `The town's school is a hub of learning and youthful energy.`,
        npcs: []
    };
    
    // First, generate all NPCs
    const allNPCs = [];
    Object.keys(locationData).forEach(locationKey => {
        const actualKey = locationKey === 'industrial' ? getIndustrialMappingKey(townInfo.type) : 
                           locationKey === 'government' ? 'mayor' : locationKey;
        // Increase NPCs per location to 4-6
        const numNPCs = 4 + Math.floor(Math.random() * 3); // 4-6 NPCs per location
        
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
            
            const npc = {
                name,
                character,
                info,
                location: locationKey
            };
            
            allNPCs.push(npc);
        }
    });
    
    // Generate relationships between characters
    generateCharacterRelationships(allNPCs, townInfo);
    
    // Now assign NPCs to locations and generate dialogue with relationship awareness
    allNPCs.forEach(npc => {
        npc.dialogue = generateDialogue(npc.character, npc.info);
        locationData[npc.location].npcs.push(npc);
    });
    
    // Store town info and NPC reference for use elsewhere
    locationData.townInfo = townInfo;
    locationData.allNPCs = allNPCs; // Store for relationship queries
    
    // Generate inn price for this town
    gameState.innCostPerNight = generateInnPrice(townInfo);
    
    // Debug log to help track down undefined location names
    console.log('Generated locations:', Object.keys(locationData).map(key => ({
        key,
        name: locationData[key].name,
        hasNPCs: locationData[key].npcs ? locationData[key].npcs.length : 'no npcs property'
    })));
    
    return locationData;
}

function getIndustrialDescription(townInfo) {
    const descriptions = {
        mining: `The old mining operations stand as a testament to both ${townInfo.name}'s former glory and current struggles. ${townInfo.atmosphere}, the area holds memories of busier times.`,
        coastal: `The maritime facilities tell the story of ${townInfo.name}'s connection to the sea. ${townInfo.atmosphere}, bearing the marks of storms both literal and economic.`
    };
    
    return descriptions[townInfo.type] || `The industrial heart of ${townInfo.name} shows signs of both prosperity and struggle.`;
}

function getIndustrialMappingKey(townType) {
    // Map town types to character generation keys
    const mapping = {
        mining: 'mine',
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
            confirmed: "I sing a tale of gears and grit, of hardworking folk whose prosperity was shattered by a promise of the earth, broken...",
            rumored: "Listen close, for in the shadows of the abandoned mine, a chilling secret lies buried deeper than any ore...",
            madeUp: "Beyond the veil of the mundane, I shall tell of a place where the mountain itself breathes, and its heart is not stone, but starlight...",
            sabotage: "A tale of sabotage in the heart of the mines, where greed and envy spark disaster...",
            laborStrike: "The workers, tired of broken promises, rise up in a strike that shakes the very foundations of the town..."
        },
        market: {
            confirmed: "Gather 'round and hear the story of the marketplace, the heart of this town, and how its beat has grown faint with hardship...",
            rumored: "They say more than goods are traded in the market stalls at midnight. Whispers, secrets, and the fate of the town itself...",
            madeUp: "I speak of an enchanted bazaar, where desires are bartered, and every trinket holds a spark of true magic...",
            festival: "A grand festival draws crowds and trouble alike, as fortunes are made and lost in a single day...",
            rivalry: "Two rival merchants wage a silent war, their feud threatening to tear the market apart..."
        },
        tavern: {
            confirmed: "In this very tavern, where ale flows and tongues are loosened, the truest tales of this town are told in hushed tones...",
            rumored: "Not all who linger in this tavern are of flesh and blood. Some are echoes of the past, with stories they are dying to share...",
            madeUp: "Imagine a mystical tavern, a crossroads between worlds, where heroes and monsters share a drink and trade destinies...",
            brawl: "A legendary brawl erupts, drawing in every patron and leaving the tavern changed forever...",
            secretMeeting: "Behind closed doors, a secret meeting plots the fate of the town..."
        },
        government: {
            confirmed: "I will recount a story from the halls of power, of difficult choices made by leaders that have shaped the very stones of this town...",
            rumored: "Behind the closed doors of the town hall, a game of shadows is played, where the prize is the soul of this community...",
            madeUp: "Let us journey to a grand palace of shining marble, where intrigue is the wine and the fate of kingdoms hangs on a single, well-placed word...",
            coup: "A coup brews beneath the surface, as ambitious councilors plot to seize control...",
            scandal: "A scandal erupts, threatening to topple the town's most powerful figures..."
        },
        coastal: {
            confirmed: "I sing of the sea, its boundless beauty and its unforgiving wrath, and of the souls who live by its rhythm...",
            rumored: "The tide brings in more than fish and foam. It carries secrets from the deep, of phantom ships and drowned sorrows...",
            madeUp: "Hear now of a kingdom beneath the waves, where merfolk rule and the storms are but the whims of a sea-god's mood...",
            shipwreck: "A shipwreck brings both tragedy and opportunity to the shore...",
            smuggling: "Smugglers ply their trade under cover of fog, risking all for forbidden riches..."
        },
        agricultural: {
            confirmed: "A tale of the land, of the patient toil of farmers, and of a season that tested their resilience to the very breaking point...",
            rumored: "In the rustling crops and the silent scarecrows, there are secrets of the old earth, whispers of a harvest that was not meant for mortal men...",
            madeUp: "I shall tell of an enchanted grove, where the soil yields wonders and the trees bear fruit of pure sunlight and moonbeams...",
            blight: "A mysterious blight threatens the harvest, and only the bravest dare seek its cause...",
            landDispute: "A bitter land dispute divides neighbors and families, with the future of the fields at stake..."
        }
    },
    act2: {
        adventure: {
            confirmed: "With courage born of desperation and hope kindled by memory, [PROTAGONIST] sets forth into the unknown, seeking what was lost...",
            rumored: "Heeding the cryptic counsel of [SUPPORTING_CHAR], [PROTAGONIST] dares to walk paths shrouded in whisper and shadow...",
            madeUp: "Awakened to powers beyond mortal ken, [PROTAGONIST] strides forth as champion of the mystical realm, where impossibility bows to will...",
            chase: "A desperate chase ensues, with [PROTAGONIST] pursued by unseen foes through twisting alleys and shadowed woods...",
            rescue: "A daring rescue is mounted, as [PROTAGONIST] risks all to save [SUPPORTING_CHAR] from peril..."
        },
        discovery: {
            confirmed: "Through patient toil and careful observation, [PROTAGONIST] and [SUPPORTING_CHAR] piece together fragments of a larger truth...",
            rumored: "Following threads of rumor and signs half-glimpsed, [PROTAGONIST] unearths secrets that may reshape everything...",
            madeUp: "In a moment of divine revelation, the veil between worlds parts for [PROTAGONIST], revealing wonders beyond imagination...",
            betrayal: "A shocking betrayal is revealed, forcing [PROTAGONIST] to question all they thought they knew...",
            puzzle: "A cryptic puzzle must be solved, with the fate of many hanging in the balance..."
        },
        conflict: {
            confirmed: "Now [PROTAGONIST] stands against the tide of resistance, as [ANTAGONIST] marshals all who fear the coming change...",
            rumored: "From the shadows emerges [ANTAGONIST], weaving conspiracies to ensnare [PROTAGONIST] in a web of doubt and danger...",
            madeUp: "The very heavens tremble as [PROTAGONIST] faces the dark sorcery of [ANTAGONIST], in a clash that will echo through eternity!",
            duel: "A fateful duel is fought, with honor, pride, and the future at stake...",
            naturalDisaster: "A sudden natural disaster strikes, forcing friend and foe alike to unite or perish..."
        }
    },
    act3: {
        triumph: {
            confirmed: "And so it was that [PROTAGONIST] persevered through every trial. [TOWN_NAME] prospered once more, its people free from the burdens that had long weighed upon them. Years later, travelers would still speak of how one person's courage restored an entire community to hope and prosperity.",
            rumored: "The mysteries surrounding [PROTAGONIST]'s success remained, but none could deny the transformation of [TOWN_NAME]. [SUPPORTING_CHAR] became the keeper of the true tale, though they chose to share it only with those who truly understood the price of change. The town thrived, and that was enough.",
            madeUp: "With [ANTAGONIST] banished forever and the ancient magics restored to balance, [PROTAGONIST] was hailed as the greatest hero [TOWN_NAME] had ever known. The town became a beacon of wonder, drawing pilgrims from across the land who came to witness where the impossible had been made real."
        },
        tragedy: {
            confirmed: "[PROTAGONIST]'s noble efforts ended in heartbreak, but their sacrifice was not forgotten. Though [TOWN_NAME] could not be saved from its fate, the people learned to honor those who tried. [SUPPORTING_CHAR] raised a monument to their fallen friend, ensuring their memory would endure even if their dreams could not.",
            rumored: "When the morning came, [PROTAGONIST] was gone, vanished like smoke on the wind. [SUPPORTING_CHAR] searched everywhere but found only silence. [TOWN_NAME] slowly accepted that some mysteries are meant to remain unsolved, and some heroes are destined to walk alone into the unknown.",
            madeUp: "The final battle claimed [PROTAGONIST]'s life, but their sacrifice sealed [ANTAGONIST] forever in the realm of shadows. [TOWN_NAME] mourned their fallen champion with songs that would be sung for a thousand years. Magic faded from the world, but so too did the darkness that had threatened to consume everything."
        },
        change: {
            confirmed: "Neither victory nor defeat, but transformation - this was [PROTAGONIST]'s legacy. [TOWN_NAME] learned to adapt, its people stronger for having faced their challenges together. [SUPPORTING_CHAR] helped guide the community toward a future none of them could have imagined, built on the foundation of what they had learned from their trials.",
            rumored: "The true outcome remained shrouded in mystery, but [TOWN_NAME] was undeniably different. Some changes were visible - new buildings, different faces in positions of power. Others ran deeper, in how people treated one another and what they chose to believe. [SUPPORTING_CHAR] often smiled at questions about what really happened, saying only that the future would reveal all.",
            madeUp: "The ancient magic unleashed by [PROTAGONIST] rewrote the very laws that governed [TOWN_NAME], creating a place where the extraordinary became commonplace. Children grew up able to speak with animals, crops grew in perfect spirals reaching toward the sky, and the boundary between dreams and reality grew thin. It was chaos, it was wonder, and it was home."
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
    
    // Remove any existing event listeners and add a single delegated event handler
    infoList.onclick = null;
    infoList.addEventListener('click', (event) => {
        const characterCard = event.target.closest('[data-character-card="true"]');
        if (characterCard) {
            const characterName = characterCard.getAttribute('data-character-name');
            console.log('Character card clicked via delegation:', characterName);
            event.preventDefault();
            event.stopPropagation();
            showCharacterDetails(characterName);
        }
    });
    
    // Show known characters (persistent) - Simplified display
    const knownCharactersList = Object.values(gameState.knownCharacters);
    console.log('updateUI called - Known characters count:', knownCharactersList.length);
    console.log('Known characters:', knownCharactersList.map(c => c.name));
    
    // Check if Info tab is currently visible
    const infoTab = document.getElementById('tab-info');
    const infoTabVisible = infoTab && infoTab.style.display !== 'none';
    console.log('Info tab visible when creating character cards:', infoTabVisible);
    console.log('Info tab element:', infoTab);
    console.log('Info tab style.display:', infoTab?.style.display);
    
    if (knownCharactersList.length > 0) {
        infoList.innerHTML += '<h4 style="color: #daa520; margin-bottom: 10px;">🧑 Known Characters:</h4>';
        knownCharactersList.forEach(character => {
            console.log('Creating character card for:', character.name);
            const charDiv = document.createElement('div');
            charDiv.className = 'info-item character-knowledge';
            charDiv.style.borderLeft = '4px solid #6495ed';
            charDiv.style.cursor = 'pointer';
            charDiv.style.minHeight = '80px'; // Ensure minimum dimensions
            charDiv.style.display = 'block'; // Ensure it's a block element
            charDiv.style.width = '100%'; // Ensure it takes full width
            
            // Simplified character display
            const char = character.character;
            const personalityHint = char.personalityTrait ? 
                char.personalityTrait.trait : 
                char.personality || 'Unknown';
            
            // Show only the most obvious relationship
            let primaryRelationship = '';
            if (char.relationships && char.relationships.length > 0) {
                const obviousRel = char.relationships.find(rel => 
                    ['spouse', 'business_partner', 'enemy'].includes(rel.relationshipType)
                );
                if (obviousRel) {
                    primaryRelationship = ` • ${obviousRel.relationshipType} of ${obviousRel.targetName}`;
                }
            }
            
            charDiv.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <strong>${character.name}</strong> - ${char.profession}<br>
                <div style="font-size: 0.9em; color: #ccc;">
                            ${personalityHint}${primaryRelationship}
                        </div>
                    </div>
                    <div style="text-align: right; font-size: 0.8em; color: #daa520;">
                        ${character.relationshipLevel}<br>
                        <span style="color: #ccc;">${character.knownInfo.length} facts</span>
                    </div>
                </div>
                <div style="font-size: 0.8em; color: #6495ed; margin-top: 8px; text-align: center;">
                    📖 Click for full details
                </div>
            `;
            
            // Add data attribute for event delegation
            charDiv.setAttribute('data-character-name', character.name);
            charDiv.setAttribute('data-character-card', 'true');
            
            console.log('Character card created for:', character.name);
            infoList.appendChild(charDiv);
        });
        infoList.innerHTML += '<br>';
    }
    
    // Show opportunities unlocked by events
    if (gameState.availableOpportunities && gameState.availableOpportunities.length > 0) {
        infoList.innerHTML += '<h4 style="color: #32cd32; margin-bottom: 10px;">✨ Special Opportunities Available:</h4>';
        gameState.availableOpportunities.forEach(opportunity => {
            const oppDiv = document.createElement('div');
            oppDiv.className = 'info-item';
            oppDiv.style.borderLeft = '4px solid #32cd32';
            oppDiv.innerHTML = `
                <div style="color: #32cd32; font-weight: bold;">${opportunity}</div>
                <div class="info-source" style="color: #90ee90;">Unlocked by your storytelling influence</div>
            `;
            infoList.appendChild(oppDiv);
        });
        infoList.innerHTML += '<br>';
    }
    
    // Show warnings from events
    if (gameState.bardWarnings && gameState.bardWarnings.length > 0) {
        infoList.innerHTML += '<h4 style="color: #ffa500; margin-bottom: 10px;">⚠️ Warnings & Concerns:</h4>';
        gameState.bardWarnings.slice(-3).forEach(warning => { // Show only last 3 warnings
            const warnDiv = document.createElement('div');
            warnDiv.className = 'info-item';
            warnDiv.style.borderLeft = '4px solid #ffa500';
            warnDiv.innerHTML = `
                <div style="color: #ffa500;">${warning}</div>
                <div class="info-source" style="color: #ffcccb;">Consider the consequences of your storytelling</div>
            `;
            infoList.appendChild(warnDiv);
        });
        infoList.innerHTML += '<br>';
    }
    
    // Show positive story material from events
    if (gameState.bardNotifications && gameState.bardNotifications.length > 0) {
        infoList.innerHTML += '<h4 style="color: #6495ed; margin-bottom: 10px;">📚 Story Material from Your Impact:</h4>';
        gameState.bardNotifications.slice(-3).forEach(material => { // Show only last 3 notifications
            const matDiv = document.createElement('div');
            matDiv.className = 'info-item';
            matDiv.style.borderLeft = '4px solid #6495ed';
            matDiv.innerHTML = `
                <div style="color: #6495ed;">${material}</div>
                <div class="info-source" style="color: #b0c4de;">New story inspiration from your influence</div>
            `;
            infoList.appendChild(matDiv);
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
    
    // Update rumor list
    const rumorList = document.getElementById('rumor-list');
    if (rumorList) {
        rumorList.innerHTML = '';
        const discoveredRumors = gameState.knownRumors.filter(r => r.discovered);
        if (discoveredRumors.length === 0) {
            rumorList.innerHTML = '<p style="color: #ccc; font-style: italic;">No rumors heard yet. Talk to people and explore to learn what\'s going on in town.</p>';
        } else {
            discoveredRumors.forEach(rumor => {
                const rumorDiv = document.createElement('div');
                rumorDiv.className = 'rumor-item';
                rumorDiv.innerHTML = `
                    <div>${rumor.description}</div>
                    <div class="rumor-source">Source: ${rumor.source} (Day ${rumor.dayAdded})</div>
                `;
                rumorList.appendChild(rumorDiv);
            });
        }
    }
    
    // Render bard stats
    renderBardStats();
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
    if (!container || !locations) {
        if (container) {
            container.innerHTML = '<p style="color: #999; font-style: italic;">Locations are being generated...</p>';
        }
        return;
    }
    
    container.innerHTML = '';
    
    // Create location elements for each generated location
    Object.keys(locations).forEach(locationKey => {
        if (locationKey === 'townInfo' || locationKey === 'allNPCs') return; // Skip metadata
        
        const location = locations[locationKey];
        if (!location) {
            console.warn(`Location ${locationKey} is undefined`);
            return;
        }
        
        const locationDiv = document.createElement('div');
        locationDiv.className = 'location';
        locationDiv.onclick = () => visitLocation(locationKey);
        
        // Get a shorter description for the location card
        const shortDescription = getShortLocationDescription(location, locationKey);
        
        locationDiv.innerHTML = `
            <h4>${location.name || 'Unknown Location'}</h4>
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
        
        // Check if location has NPCs
        if (!location.npcs || location.npcs.length === 0) {
            contentHTML += '<p style="color: #999; font-style: italic;">This location appears to be empty at the moment.</p>';
        } else {
            location.npcs.forEach((npc, index) => {
            const alreadyTalked = gameState.talkedToToday.includes(npc.name);
            const conversationsRemaining = gameState.maxConversationsPerDay - gameState.conversationsUsed;
            const canTalk = !alreadyTalked && conversationsRemaining > 0;
            
            // Enhanced NPC display with observable characteristics
            const char = npc.character;
            const observableTraits = [];
            
            // Add observable personality traits
            if (char.personalityTrait) {
                observableTraits.push(`${char.personalityTrait.trait}`);
            }
            
            // Add emotional state if noticeable
            if (char.psychologicalProfile && ['troubled', 'anxious', 'optimistic'].includes(char.psychologicalProfile.emotionalState)) {
                observableTraits.push(`appears ${char.psychologicalProfile.emotionalState}`);
            }
            
            // Add age and profession
            observableTraits.push(`${char.age} ${char.profession}`);
            
            // Show hints about relationships if they're obvious
            let relationshipHints = '';
            if (char.relationships) {
                const obviousRels = char.relationships.filter(rel => 
                    ['spouse', 'business_partner', 'enemy'].includes(rel.relationshipType)
                );
                if (obviousRels.length > 0) {
                    const relDesc = obviousRels.map(rel => 
                        `${rel.relationshipType} of ${rel.targetName}`
                    ).join(', ');
                    relationshipHints = `<div style="font-size: 0.8em; color: #daa520; margin-top: 5px;">👥 Known to be: ${relDesc}</div>`;
                }
            }
            
            contentHTML += `
                <div class="npc-option" style="margin: 10px 0; padding: 10px; background: rgba(139, 69, 19, 0.3); border-radius: 5px;">
                    <strong>${npc.name}</strong>
                    <div style="font-size: 0.9em; color: #ccc; margin: 5px 0;">${observableTraits.join(' • ')}</div>
                    ${relationshipHints}
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
        
        // Enhanced NPC display with observable characteristics (copied from visitLocation)
        const char = npc.character;
        const observableTraits = [];
        if (char.personalityTrait) {
            observableTraits.push(`${char.personalityTrait.trait}`);
        }
        if (char.psychologicalProfile && ['troubled', 'anxious', 'optimistic'].includes(char.psychologicalProfile.emotionalState)) {
            observableTraits.push(`appears ${char.psychologicalProfile.emotionalState}`);
        }
        observableTraits.push(`${char.age} ${char.profession}`);
        let relationshipHints = '';
        if (char.relationships) {
            const obviousRels = char.relationships.filter(rel => 
                ['spouse', 'business_partner', 'enemy'].includes(rel.relationshipType)
            );
            if (obviousRels.length > 0) {
                const relDesc = obviousRels.map(rel => 
                    `${rel.relationshipType} of ${rel.targetName}`
                ).join(', ');
                relationshipHints = `<div style="font-size: 0.8em; color: #daa520; margin-top: 5px;">👥 Known to be: ${relDesc}</div>`;
            }
        }
        contentHTML += `
            <div class="npc-option" style="margin: 10px 0; padding: 10px; background: rgba(139, 69, 19, 0.3); border-radius: 5px;">
                <strong>${npc.name}</strong>
                <div style="font-size: 0.9em; color: #ccc; margin: 5px 0;">${observableTraits.join(' • ')}</div>
                ${relationshipHints}
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
    
    // If the info is a rumor and not already in knownRumors, add it as a discovered rumor
    if (npc.info.type === 'rumored') {
        const alreadyKnown = gameState.knownRumors.some(r => r.description === npc.info.text);
        if (!alreadyKnown) {
            gameState.knownRumors.push({
                id: `rumor_${Date.now()}_${Math.random()}`,
                description: npc.info.text,
                type: 'npc', // or 'location' if you want to be more specific
                target: npc.name,
                discovered: true,
                dayAdded: gameState.day,
                source: npc.name,
                thread: []
            });
        }
    }
    
    // Add character to persistent knowledge base with LIMITED initial information
    if (!gameState.knownCharacters[npc.name]) {
        gameState.knownCharacters[npc.name] = {
            name: npc.name,
            location: locationKey,
            firstMet: gameState.day,
            conversationsHad: 0,
            // Only store basic observable information initially
            character: {
                profession: npc.character.profession,
                age: npc.character.age,
                appearance: npc.character.appearance,
                // Only surface-level personality impression
                personalityTrait: {
                    trait: npc.character.personalityTrait ? npc.character.personalityTrait.trait : 'Hard to read',
                    description: 'Your initial impression of their character'
                },
                // Only obvious relationships (public knowledge)
                relationships: npc.character.relationships ? 
                    npc.character.relationships.filter(rel => 
                        ['spouse', 'business_partner', 'enemy'].includes(rel.relationshipType)
                    ) : [],
                // Hidden until closer relationship
                backstory: null,
                secrets: [],
                skill: null,
                flaw: null,
                currentSituation: null,
                familyStructure: null,
                psychologicalProfile: null,
                storyPreferences: npc.character.storyPreferences || { themes: [], truthLevel: 'confirmed', tone: 'neutral', bonusPreferences: [] }
            },
            // Store the FULL character data separately for gradual revelation
            _fullCharacterData: npc.character ? { ...npc.character } : null,
            knownInfo: [],
            relationshipLevel: 'acquaintance' // acquaintance -> friend -> confidant
        };
    }
    
    // Update character knowledge
    const character = gameState.knownCharacters[npc.name];
    const oldRelationshipLevel = character.relationshipLevel;
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
    
    // Reveal new character information if relationship level improved
    if (character.relationshipLevel !== oldRelationshipLevel) {
        revealCharacterInformation(character);
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

// Gradually reveal character information as relationships deepen
function revealCharacterInformation(character) {
    const fullData = character._fullCharacterData;
    if (!fullData) return;
    
    switch (character.relationshipLevel) {
        case 'friend':
            // Friends level: Learn more personal details
            character.character.personalityTrait = {
                trait: fullData.personalityTrait.trait,
                description: fullData.personalityTrait.description
            };
            
            // Learn about their obvious skill or notable trait
            if (fullData.skill) {
                character.character.skill = fullData.skill;
            }
            
            // Learn about some of their relationships (close friends, family)
            if (fullData.relationships) {
                const friendLevelRels = fullData.relationships.filter(rel => 
                    ['close_friend', 'best_friend', 'sibling', 'parent', 'child'].includes(rel.relationshipType)
                );
                character.character.relationships = [
                    ...character.character.relationships,
                    ...friendLevelRels.slice(0, 2) // Max 2 additional relationships
                ];
            }
            
            // Learn about their current situation if it's not too personal
            if (fullData.currentSituation && fullData.currentSituation.stress_level <= 2) {
                character.character.currentSituation = fullData.currentSituation;
            }
            
            break;
            
        case 'confidant':
            // Confidant level: Learn deeper secrets and backstory
            if (fullData.backstory) {
                // Reveal some major life events (not all at once)
                character.character.backstory = {
                    lifeEvents: fullData.backstory.lifeEvents.slice(0, 2), // First 2 events
                    connections: fullData.backstory.connections
                };
            }
            
            // Learn about their flaw/vulnerability
            if (fullData.flaw) {
                character.character.flaw = fullData.flaw;
            }
            
            // Learn about more relationships
            if (fullData.relationships) {
                character.character.relationships = [...fullData.relationships];
            }
            
            // Learn about their psychological profile
            if (fullData.psychologicalProfile) {
                character.character.psychologicalProfile = fullData.psychologicalProfile;
            }
            
            // Learn about their family background
            if (fullData.familyStructure) {
                character.character.familyStructure = fullData.familyStructure;
            }
            
            // Learn about stressful current situations
            if (fullData.currentSituation) {
                character.character.currentSituation = fullData.currentSituation;
            }
            
            // Reveal one secret (if they have any)
            if (fullData.secrets && fullData.secrets.length > 0) {
                character.character.secrets = [fullData.secrets[0]]; // Just one secret
            }
            
            break;
    }
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
        relationshipChange = `
            <div style="color: #32cd32; font-weight: bold; margin-top: 10px;">
                🎉 You've become friends!
                <div style="font-size: 0.9em; font-weight: normal; color: #ccc; margin-top: 5px;">
                    They're more comfortable sharing personal details with you now.
                </div>
            </div>
        `;
    } else if (character.conversationsHad === 5 && character.relationshipLevel === 'confidant') {
        relationshipChange = `
            <div style="color: #daa520; font-weight: bold; margin-top: 10px;">
                ⭐ They now consider you a close confidant!
                <div style="font-size: 0.9em; font-weight: normal; color: #ccc; margin-top: 5px;">
                    They trust you enough to share their deepest secrets and experiences.
                </div>
            </div>
        `;
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
    
    // Simple character display - only what you'd observe in a brief conversation
    const char = npc.character;
    const personalityHint = char.personalityTrait ? 
        char.personalityTrait.trait : 
        char.personality || 'Hard to read';
    
    // Only show obvious relationships (spouse, business partner, enemy)
    let obviousRelationship = '';
    if (char.relationships) {
        const publicRel = char.relationships.find(rel => 
            ['spouse', 'business_partner', 'enemy'].includes(rel.relationshipType)
        );
        if (publicRel) {
            obviousRelationship = `<div style="font-size: 0.9em; color: #daa520; margin-top: 8px;">👥 ${publicRel.relationshipType} of ${publicRel.targetName}</div>`;
        }
    }
    
    results.innerHTML = `
        <div style="text-align: center; margin-bottom: 20px;">
            <div style="background: rgba(139, 69, 19, 0.3); border-radius: 10px; padding: 20px; margin-bottom: 15px;">
                <h3 style="color: #daa520; margin-bottom: 15px;">💬 You spoke with ${npc.name}</h3>
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                    <div style="text-align: left;">
                        <strong>${char.profession}</strong> • ${char.age}<br>
                        <div style="font-style: italic; color: #ccc; margin-top: 5px;">"${personalityHint}"</div>
                        ${obviousRelationship}
                    </div>
                    <div style="text-align: right; color: #daa520;">
                        <strong>Relationship:</strong><br>
                        ${character.relationshipLevel}<br>
                        <span style="font-size: 0.9em;">(${character.conversationsHad} conversations)</span>
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
            
            <div style="margin-top: 10px;">
                <button onclick="showCharacterDetails('${npc.name}')" style="padding: 8px 16px; background: rgba(100, 149, 237, 0.3); border: 1px solid #6495ed; border-radius: 5px; color: #f4e4c1;">
                    📖 View Character Details
                </button>
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

// Character Details Encyclopedia - Shows full character information
function showCharacterDetails(characterName) {
    console.log('showCharacterDetails called for:', characterName);
    
    // Find character in known characters or current locations
    let targetCharacter = null;
    
    // Check known characters first
    if (gameState.knownCharacters[characterName]) {
        targetCharacter = gameState.knownCharacters[characterName];
        console.log('Found character in knownCharacters:', targetCharacter);
    }
    
    // If not found, check current location NPCs
    if (!targetCharacter && locations && locations.allNPCs) {
        const foundNPC = locations.allNPCs.find(npc => npc.name === characterName);
        if (foundNPC) {
            targetCharacter = foundNPC;
            console.log('Found character in allNPCs:', targetCharacter);
        }
    }
    
    if (!targetCharacter) {
        console.error('Character not found:', characterName);
        console.log('Available known characters:', Object.keys(gameState.knownCharacters));
        console.log('All NPCs:', locations?.allNPCs?.map(npc => npc.name) || 'No NPCs');
        alert('Character information not available.');
        return;
    }
    
    console.log('About to create modal for character:', targetCharacter);
    
    // Remove any existing character details modal first
    const existingModal = document.getElementById('character-details-modal');
    if (existingModal) {
        existingModal.remove();
        console.log('Removed existing modal');
    }
    
    // Create character details modal
    const detailsModal = document.createElement('div');
    detailsModal.className = 'modal';
    detailsModal.id = 'character-details-modal';
    detailsModal.style.display = 'block';
    
    const char = targetCharacter.character;
    const personalityDisplay = char.personalityTrait ? 
        `${char.personalityTrait.trait} - ${char.personalityTrait.description}` : 
        'Unknown personality';
    
    const emotionalState = char.psychologicalProfile ? 
        char.psychologicalProfile.emotionalState : 
        (targetCharacter.relationshipLevel === 'acquaintance' ? 'Hard to read' : 'Unknown');
        
    const skillDisplay = char.skill ? 
        `${char.skill.skill} - ${char.skill.description}` : 
        (targetCharacter.relationshipLevel === 'acquaintance' ? 'Not yet observed' : 'No notable skills discovered');
        
    const flawDisplay = char.flaw ? 
        `${char.flaw.flaw} - ${char.flaw.description}` : 
        (targetCharacter.relationshipLevel === 'confidant' ? 'No obvious flaws observed' : 'They haven\'t revealed their vulnerabilities yet');
    
    // Display relationships
    let relationshipDisplay = '';
    if (char.relationships && char.relationships.length > 0) {
        const significantRels = char.relationships.filter(rel => rel.intensity >= 2);
        if (significantRels.length > 0) {
            relationshipDisplay = `
                <div style="margin-top: 15px; padding: 15px; background: rgba(75, 0, 130, 0.1); border-radius: 8px;">
                    <h4 style="color: #daa520; margin-bottom: 10px;">👥 Known Relationships:</h4>
                    ${significantRels.map(rel => `
                        <div style="margin: 8px 0; font-size: 0.9em; border-left: 3px solid #6495ed; padding-left: 10px;">
                            <strong>${rel.targetName}</strong> - ${rel.relationshipType} (${rel.quality})<br>
                            <div style="font-size: 0.8em; color: #ccc; font-style: italic; margin-top: 3px;">${rel.history}</div>
                        </div>
                    `).join('')}
                </div>
            `;
        }
    }
    
    // Display backstory events (only if known)
    let backstoryDisplay = '';
    if (char.backstory && char.backstory.lifeEvents && char.backstory.lifeEvents.length > 0) {
        backstoryDisplay = `
            <div style="margin-top: 15px; padding: 15px; background: rgba(139, 69, 19, 0.1); border-radius: 8px;">
                <h4 style="color: #daa520; margin-bottom: 10px;">📚 Life History:</h4>
                ${char.backstory.lifeEvents.map(event => `
                    <div style="margin: 8px 0; font-size: 0.9em; border-left: 3px solid #daa520; padding-left: 10px;">
                        <strong>${event.period.charAt(0).toUpperCase() + event.period.slice(1)}:</strong> ${event.event}
                    </div>
                `).join('')}
                ${targetCharacter.relationshipLevel === 'confidant' && targetCharacter._fullCharacterData && targetCharacter._fullCharacterData.backstory && targetCharacter._fullCharacterData.backstory.lifeEvents.length > 2 ? 
                    '<div style="font-size: 0.8em; color: #ccc; font-style: italic; margin-top: 10px;">As a trusted confidant, you sense there may be more to their story...</div>' : ''}
            </div>
        `;
    } else if (targetCharacter.relationshipLevel === 'acquaintance') {
        backstoryDisplay = `
            <div style="margin-top: 15px; padding: 15px; background: rgba(139, 69, 19, 0.1); border-radius: 8px;">
                <h4 style="color: #daa520; margin-bottom: 10px;">📚 Life History:</h4>
                <div style="font-size: 0.9em; color: #999; font-style: italic;">
                    You don't know them well enough yet to learn about their past.
                </div>
            </div>
        `;
    }
    
    // Display current situation (only if known)
    let situationDisplay = '';
    if (char.currentSituation) {
        situationDisplay = `
            <div style="margin-top: 15px; padding: 15px; background: rgba(255, 165, 0, 0.1); border-radius: 8px;">
                <h4 style="color: #daa520; margin-bottom: 10px;">🎯 Current Situation:</h4>
                <div style="margin: 8px 0; font-size: 0.9em;">
                    ${char.currentSituation.situation}
                    <div style="font-size: 0.8em; color: #ccc; margin-top: 5px;">
                        Stress Level: ${'⭐'.repeat(char.currentSituation.stress_level)}${'☆'.repeat(3 - char.currentSituation.stress_level)} 
                        | Time Commitment: ${char.currentSituation.time_commitment}
                    </div>
                </div>
            </div>
        `;
    } else if (targetCharacter.relationshipLevel === 'acquaintance') {
        situationDisplay = `
            <div style="margin-top: 15px; padding: 15px; background: rgba(255, 165, 0, 0.1); border-radius: 8px;">
                <h4 style="color: #daa520; margin-bottom: 10px;">🎯 Current Situation:</h4>
                <div style="font-size: 0.9em; color: #999; font-style: italic;">
                    They haven't shared details about their personal life with you yet.
                </div>
            </div>
        `;
    }
    
    // Display family structure (only if known)
    let familyDisplay = '';
    if (char.familyStructure) {
        familyDisplay = `
            <div style="margin-top: 15px; padding: 15px; background: rgba(34, 139, 34, 0.1); border-radius: 8px;">
                <h4 style="color: #daa520; margin-bottom: 10px;">👨‍👩‍👧‍👦 Family Background:</h4>
                <div style="margin: 8px 0; font-size: 0.9em;">
                    <strong>Family Type:</strong> ${char.familyStructure.type}<br>
                    <div style="font-size: 0.8em; color: #ccc; margin-top: 5px; font-style: italic;">${char.familyStructure.dynamics}</div>
                </div>
            </div>
        `;
    } else if (targetCharacter.relationshipLevel !== 'confidant') {
        familyDisplay = `
            <div style="margin-top: 15px; padding: 15px; background: rgba(34, 139, 34, 0.1); border-radius: 8px;">
                <h4 style="color: #daa520; margin-bottom: 10px;">👨‍👩‍👧‍👦 Family Background:</h4>
                <div style="font-size: 0.9em; color: #999; font-style: italic;">
                    They haven't opened up about their family yet.
                </div>
            </div>
        `;
    }
    
    // Display secrets (only for confidants)
    let secretsDisplay = '';
    if (char.secrets && char.secrets.length > 0 && targetCharacter.relationshipLevel === 'confidant') {
        secretsDisplay = `
            <div style="margin-top: 15px; padding: 15px; background: rgba(128, 0, 128, 0.1); border-radius: 8px;">
                <h4 style="color: #daa520; margin-bottom: 10px;">🤐 Shared Secrets:</h4>
                ${char.secrets.map(secret => `
                    <div style="margin: 8px 0; font-size: 0.9em; border-left: 3px solid #8b4513; padding-left: 10px; color: #ddd;">
                        ${secret}
                    </div>
                `).join('')}
                <div style="font-size: 0.8em; color: #999; font-style: italic; margin-top: 10px;">
                    They trust you enough to share this personal information.
                </div>
            </div>
        `;
    }
    
    detailsModal.innerHTML = `
        <div class="modal-content" style="max-width: 800px; max-height: 90vh; overflow-y: auto;">
            <span class="close" onclick="closeCharacterDetails()">&times;</span>
            <h2 style="color: #daa520; text-align: center; margin-bottom: 20px;">📖 Character Encyclopedia: ${characterName}</h2>
            
            <div style="background: rgba(100, 149, 237, 0.2); border-radius: 8px; padding: 15px; margin-bottom: 15px; text-align: center;">
                <div style="font-size: 0.9em; color: #ddd;">
                    <strong>Relationship Level:</strong> <span style="color: #daa520;">${targetCharacter.relationshipLevel}</span>
                    ${targetCharacter.relationshipLevel === 'acquaintance' ? 
                        '<div style="margin-top: 5px; font-size: 0.8em; color: #ccc; font-style: italic;">Talk more to learn deeper details about their life</div>' : 
                        targetCharacter.relationshipLevel === 'friend' ? 
                            '<div style="margin-top: 5px; font-size: 0.8em; color: #ccc; font-style: italic;">They share personal details with you • Continue building trust to learn their secrets</div>' :
                            '<div style="margin-top: 5px; font-size: 0.8em; color: #ccc; font-style: italic;">They trust you with their deepest secrets and experiences</div>'
                    }
                </div>
            </div>
            
            <div style="background: rgba(139, 69, 19, 0.3); border-radius: 10px; padding: 20px; margin-bottom: 15px;">
                <h3 style="color: #daa520; margin-bottom: 15px;">Basic Information</h3>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                    <div>
                        <strong>Profession:</strong> ${char.profession}<br>
                        <strong>Age:</strong> ${char.age}<br>
                        <strong>Personality:</strong> ${personalityDisplay}
                    </div>
                    <div>
                        <strong>Emotional State:</strong> ${emotionalState}<br>
                        <strong>Notable Skill:</strong> ${skillDisplay}<br>
                        <strong>Personal Flaw:</strong> ${flawDisplay}
                    </div>
                </div>
            </div>
            
            ${situationDisplay}
            ${backstoryDisplay}
            ${familyDisplay}
            ${secretsDisplay}
            ${relationshipDisplay}
            
            <div style="text-align: center; margin-top: 20px;">
                <button onclick="closeCharacterDetails()" style="padding: 12px 24px; font-size: 1.1em;">
                    📖 Close Encyclopedia
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(detailsModal);
    console.log('Modal added to DOM:', detailsModal);
    console.log('Modal display style:', detailsModal.style.display);
}

function closeCharacterDetails() {
    console.log('closeCharacterDetails called');
    const modal = document.getElementById('character-details-modal');
    if (modal) {
        console.log('Removing modal:', modal);
        modal.remove();
    } else {
        console.log('No modal found to close');
    }
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
            // Get the full character data including relationships
            const fullCharacterData = character._fullCharacterData || character.character;
            
            audience.push({
                ...character,
                character: {
                    ...character.character,
                    // Include relationships for story reaction calculations
                    relationships: fullCharacterData.relationships || [],
                    secrets: fullCharacterData.secrets || [],
                    personalityTrait: fullCharacterData.personalityTrait || character.character.personalityTrait,
                    psychologicalProfile: fullCharacterData.psychologicalProfile || character.character.psychologicalProfile
                },
                mood: generateAudienceMood(character)
            });
        }
    });
    
    // Fill out audience with unnamed patrons if needed
    while (audience.length < minAudience) {
                    const unnamedPatronPersonality = randomChoice(characterGen.personalities);
        const personalityTrait = randomChoice(backstoryGen.personalityTraits.primary);
        
            audience.push({
                name: 'Unnamed Patron',
                character: {
                    profession: 'Local resident',
                personality: unnamedPatronPersonality, // Keep old system for fallback
                personalityTrait: personalityTrait, // Add new system
                storyPreferences: generateStoryPreferences(unnamedPatronPersonality, 'Local resident'),
                psychologicalProfile: {
                    emotionalState: 'stable'
                }
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
    
    // Adjust based on personality traits (updated for new character system)
    const personalityTrait = character.character.personalityTrait ? character.character.personalityTrait.trait : '';
    const oldPersonality = character.character.personality || ''; // Fallback for old system
    
    // Check new personality traits
    if (personalityTrait.includes('Gentle Nurturer') || personalityTrait.includes('Stalwart Protector') || 
        personalityTrait.includes('Curious Scholar') || oldPersonality.includes('Friendly') || oldPersonality.includes('Cheerful')) {
        moodWeights[0] += 0.1; // More enthusiastic
        moodWeights[4] = Math.max(0, moodWeights[4] - 0.1); // Less skeptical
    }
    
    if (personalityTrait.includes('Passionate Revolutionary') || personalityTrait.includes('Wounded Healer') ||
        oldPersonality.includes('Suspicious') || oldPersonality.includes('Bitter')) {
        moodWeights[4] += 0.1; // More skeptical
        moodWeights[0] = Math.max(0, moodWeights[0] - 0.1); // Less enthusiastic
    }
    
    // Adjust based on emotional state
    if (character.character.psychologicalProfile) {
        const emotionalState = character.character.psychologicalProfile.emotionalState;
        switch(emotionalState) {
            case 'optimistic':
                moodWeights[0] += 0.15; // Very enthusiastic
                moodWeights[4] = Math.max(0, moodWeights[4] - 0.1);
                break;
            case 'content':
                moodWeights[1] += 0.1; // More attentive
                break;
            case 'troubled':
                moodWeights[3] += 0.15; // More distracted
                moodWeights[0] = Math.max(0, moodWeights[0] - 0.1);
                break;
            case 'anxious':
                moodWeights[4] += 0.1; // More skeptical
                moodWeights[3] += 0.1; // More distracted
                moodWeights[0] = Math.max(0, moodWeights[0] - 0.1);
                break;
        }
    }
    
    // Adjust based on current life situation stress
    if (character.character.currentSituation && character.character.currentSituation.stress_level >= 3) {
        moodWeights[3] += 0.1; // More distracted when stressed
        moodWeights[1] = Math.max(0, moodWeights[1] - 0.1); // Less attentive
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
        
        // Show less detail for strangers - updated for new character system
        const personalityDisplay = audienceMember.relationshipLevel === 'stranger' ? 
            'Unknown personality' : 
            (audienceMember.character.personalityTrait ? 
                audienceMember.character.personalityTrait.trait : 
                audienceMember.character.personality || 'Unknown personality');
        
        // Show emotional state if known
        const emotionalState = audienceMember.character.psychologicalProfile && 
                               audienceMember.relationshipLevel !== 'stranger' ?
                               ` (${audienceMember.character.psychologicalProfile.emotionalState})` : '';
            
        memberDiv.innerHTML = `
            <div class="audience-member-info">
                <strong>${audienceMember.name}</strong> (${audienceMember.mood})
                <div class="audience-member-details">
                    ${audienceMember.character.profession} - ${personalityDisplay}${emotionalState}
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
    // Clear previous story data to start fresh
    gameState.storyCharacters = null;
    gameState.storyChoices = {};
    gameState.act1ChoiceData = {};
    
    // Start with Phase 1 only
    generateCharacterSelectionChoices();
}

// New Story Creation System - Phase 1: Character Selection
function generateCharacterSelectionChoices() {
    const act1Choices = document.getElementById('act1-choices');
    act1Choices.innerHTML = '<h3>Phase 1: Choose Your Target Audience</h3><p style="color: #ccc; font-style: italic;">Select someone from tonight\'s audience you want to inspire with your story. Your tale will feature generic characters, but will be crafted to resonate with your chosen audience member.</p>';
    
    // Only show characters who are actually in tonight's audience
    const eveningAudience = gameState.eveningAudience || [];
    
    // Filter to only show characters we know well enough to target (not strangers or unnamed patrons)
    const availableTargets = eveningAudience.filter(char => 
        char.relationshipLevel !== 'stranger' && 
        char.name !== 'Unnamed Patron' &&
        char.character && char.character.storyPreferences
    );
    
    if (availableTargets.length === 0) {
        // No familiar faces: allow general story
        const generalDiv = document.createElement('div');
        generalDiv.className = 'choice';
        generalDiv.onclick = () => selectGeneralAudience();
        generalDiv.innerHTML = `
            <div class="choice-text">General Audience</div>
            <div class="choice-source">Tell a story for the whole crowd (no specific target)</div>
        `;
        act1Choices.appendChild(generalDiv);
        // Show selected if already chosen
        if (gameState.storyChoices.targetAudience === 'general') {
            const selectedDiv = document.createElement('div');
            selectedDiv.className = 'target-selected';
            selectedDiv.style.cssText = 'margin-top: 20px; padding: 15px; background: rgba(34, 139, 34, 0.2); border-radius: 8px; border-left: 4px solid #32cd32;';
            selectedDiv.innerHTML = `
                <h4 style=\"color: #32cd32; margin-bottom: 10px;\">✓ General Audience Selected</h4>
                <div>This story will be crafted for the general crowd, not a specific person.</div>
                <button onclick=\"clearTargetAudience()\" style=\"margin-top: 10px; padding: 5px 10px; font-size: 0.8em;\">Change Target</button>
            `;
            act1Choices.appendChild(selectedDiv);
        }
        return;
    }
    
    // Add target audience selection
    const targetSection = document.createElement('div');
    targetSection.innerHTML = '<h4>Target Audience Member:</h4>';
    
    availableTargets.slice(0, 8).forEach(char => {
        const choiceDiv = document.createElement('div');
        choiceDiv.className = 'choice';
        choiceDiv.onclick = () => selectTargetAudience(char);
        
        // Show what we know about this person that makes them a good target
        const personalityHint = char.character.personalityTrait ? char.character.personalityTrait.trait : 'Unknown personality';
        const storyPrefs = char.character.storyPreferences || {};
        const preferredThemes = storyPrefs.themes ? storyPrefs.themes.slice(0, 2).join(', ') : 'various themes';
        const preferredTruthLevel = storyPrefs.truthLevel || 'any truth level';
        
        choiceDiv.innerHTML = `
            <div class="choice-text">${char.name} - ${char.character.profession}</div>
            <div class="choice-source">${personalityHint}</div>
            <div style="font-size: 0.8em; color: #daa520; margin-top: 5px;">
                Enjoys: ${preferredThemes} • Prefers: ${preferredTruthLevel} stories
            </div>
        `;
        targetSection.appendChild(choiceDiv);
    });
    
    act1Choices.appendChild(targetSection);
    
    // Show selected target
    displaySelectedTarget();
}

function selectTargetAudience(character) {
    gameState.storyChoices.targetAudience = character;
    
    // Generate generic story characters based on the target's preferences
    const preferredThemes = character.character.storyPreferences?.themes || ['industrial'];
    const primaryTheme = preferredThemes[0] || 'industrial';
    
    gameState.storyCharacters = generateGenericStoryCharacters(primaryTheme, character);
    
    // Update UI to show selection
    displaySelectedTarget();
    
    // Progress to Phase 2: Location Selection
    generateLocationSelectionChoices();
    
    updateStoryPreview();
    updateTellStoryButton();
}

function selectGeneralAudience() {
    gameState.storyChoices.targetAudience = 'general';
    displaySelectedTarget();
    generateLocationSelectionChoices();
    updateStoryPreview();
    updateTellStoryButton();
}

function displaySelectedTarget() {
    const selected = gameState.storyChoices.targetAudience;
    const act1Choices = document.getElementById('act1-choices');
    // Remove any existing selection display
    const existingSelected = act1Choices.querySelector('.target-selected');
    if (existingSelected) existingSelected.remove();
    if (selected && selected !== 'general') {
        const selectedDiv = document.createElement('div');
        selectedDiv.className = 'target-selected';
        selectedDiv.style.cssText = 'margin-top: 20px; padding: 15px; background: rgba(34, 139, 34, 0.2); border-radius: 8px; border-left: 4px solid #32cd32;';
        selectedDiv.innerHTML = `
            <h4 style="color: #32cd32; margin-bottom: 10px;">✓ Target Audience Selected</h4>
            <div><strong>${selected.name}</strong> - ${selected.character.profession}</div>
            <div style="color: #ccc; margin: 5px 0;">${selected.character.personalityTrait?.trait || 'Unknown personality'}</div>
            <div style="font-size: 0.9em; color: #daa520;">
                Your story will be crafted to inspire and resonate with ${selected.name}'s personality and preferences.
            </div>
            <button onclick="clearTargetAudience()" style="margin-top: 10px; padding: 5px 10px; font-size: 0.8em;">
                Change Target
            </button>
        `;
        act1Choices.appendChild(selectedDiv);
    } else if (selected === 'general') {
        const selectedDiv = document.createElement('div');
        selectedDiv.className = 'target-selected';
        selectedDiv.style.cssText = 'margin-top: 20px; padding: 15px; background: rgba(34, 139, 34, 0.2); border-radius: 8px; border-left: 4px solid #32cd32;';
        selectedDiv.innerHTML = `
            <h4 style=\"color: #32cd32; margin-bottom: 10px;\">✓ General Audience Selected</h4>
            <div>This story will be crafted for the general crowd, not a specific person.</div>
            <button onclick=\"clearTargetAudience()\" style=\"margin-top: 10px; padding: 5px 10px; font-size: 0.8em;\">Change Target</button>
        `;
        act1Choices.appendChild(selectedDiv);
    }
}

function clearTargetAudience() {
    gameState.storyChoices.targetAudience = null;
    gameState.storyChoices.location = null;
    gameState.storyChoices.event = null;
    gameState.storyChoices.resolution = null;
    gameState.storyCharacters = null;
    
    // Clear all subsequent phases
    document.getElementById('act2-choices').innerHTML = '';
    document.getElementById('act3-choices').innerHTML = '';
    document.getElementById('act1-selected').innerHTML = '';
    document.getElementById('act2-selected').innerHTML = '';
    document.getElementById('act3-selected').innerHTML = '';
    document.getElementById('story-preview-text').innerHTML = '';
    
    // Regenerate Phase 1
    generateCharacterSelectionChoices();
    // Regenerate Phase 2 (location selection) to prompt for a new setting
    generateLocationSelectionChoices();
    updateStoryPreview();
    updateTellStoryButton();
}

// Phase 2: Location Selection (NEW)
function generateLocationSelectionChoices() {
    const act2Choices = document.getElementById('act2-choices');
    act2Choices.innerHTML = '<h3>Phase 2: Choose the Setting</h3><p style="color: #ccc; font-style: italic;">Select where your story takes place. Locations are filtered based on where your target audience member would logically appear.</p>';
    
    const targetAudience = gameState.storyChoices.targetAudience;
    if (!targetAudience) return;
    
    const validLocations = getValidLocationsForCharacter(targetAudience);
    
    if (validLocations.length === 0) {
        act2Choices.innerHTML += '<p style="color: #ffa500;">No suitable locations found for this character type.</p>';
        return;
    }
    
    const locationSection = document.createElement('div');
    locationSection.innerHTML = '<h4>Available Settings:</h4>';
    
    validLocations.forEach(location => {
        const choiceDiv = document.createElement('div');
        choiceDiv.className = 'choice';
        if (location.compatibility === 'unlikely') {
            choiceDiv.style.opacity = '0.7';
        }
        choiceDiv.onclick = () => selectLocation(location);
        
        const compatibilityColor = {
            'natural': '#32cd32',
            'possible': '#daa520', 
            'unlikely': '#ffa500'
        }[location.compatibility];
        
        const compatibilityText = {
            'natural': 'Perfect Match',
            'possible': 'Good Fit',
            'unlikely': 'Unusual Choice'
        }[location.compatibility];
        
        // Use a generic label for general audience
        const professionLabel = (targetAudience === 'general')
            ? 'the crowd'
            : targetAudience.character.profession;
        
        choiceDiv.innerHTML = `
            <div class="choice-text">${location.name}</div>
            <div class="choice-source">${location.description}</div>
            <div style="font-size: 0.8em; color: ${compatibilityColor}; margin-top: 5px;">
                ${compatibilityText} for ${professionLabel}
            </div>
        `;
        locationSection.appendChild(choiceDiv);
    });
    
    act2Choices.appendChild(locationSection);
    
    // Show selected location if any
    displaySelectedLocation();
}

function selectLocation(location) {
    gameState.storyChoices.location = location;
    
    // Update UI to show selection
    displaySelectedLocation();
    
    // Progress to Phase 3: Event Selection
    generateEventSelectionChoices();
    
    updateStoryPreview();
    updateTellStoryButton();
}

function displaySelectedLocation() {
    const selected = gameState.storyChoices.location;
    if (selected) {
        const act2Choices = document.getElementById('act2-choices');
        
        // Remove any existing selection display
        const existingSelected = act2Choices.querySelector('.location-selected');
        if (existingSelected) existingSelected.remove();
        
        const selectedDiv = document.createElement('div');
        selectedDiv.className = 'location-selected';
        selectedDiv.style.cssText = 'margin-top: 20px; padding: 15px; background: rgba(34, 139, 34, 0.2); border-radius: 8px; border-left: 4px solid #32cd32;';
        selectedDiv.innerHTML = `
            <h4 style="color: #32cd32; margin-bottom: 10px;">✓ Setting Selected</h4>
            <div><strong>${selected.name}</strong></div>
            <div style="color: #ccc; margin: 5px 0;">${selected.description}</div>
            <button onclick="clearLocation()" style="margin-top: 10px; padding: 5px 10px; font-size: 0.8em;">
                Change Setting
            </button>
        `;
        act2Choices.appendChild(selectedDiv);
    }
}

function clearLocation() {
    gameState.storyChoices.location = null;
    gameState.storyChoices.event = null;
    gameState.storyChoices.resolution = null;
    
    // Clear subsequent phases
    document.getElementById('act3-choices').innerHTML = '';
    document.getElementById('act2-selected').innerHTML = '';
    document.getElementById('act3-selected').innerHTML = '';
    document.getElementById('story-preview-text').innerHTML = '';
    
    // Regenerate Phase 2
    generateLocationSelectionChoices();
    updateStoryPreview();
    updateTellStoryButton();
}

// Phase 3: Event Selection (NEW)
function generateEventSelectionChoices() {
    const act3Choices = document.getElementById('act3-choices');
    act3Choices.innerHTML = '<h3>Phase 3: Choose the Story Event</h3><p style="color: #ccc; font-style: italic;">Select what happens in your story. Events are tailored to your chosen setting and character type.</p>';
    const targetAudience = gameState.storyChoices.targetAudience;
    const location = gameState.storyChoices.location;
    if (!targetAudience || !location) return;
    // For general audience, use a generic profession to fetch events
    let profession = (targetAudience === 'general') ? 'Storyteller' : targetAudience.character.profession;
    const locationEvents = getEventsForLocation(location.key || location.name, profession);
    if (locationEvents.length === 0) {
        act3Choices.innerHTML += '<p style="color: #ffa500;">No suitable events found for this location and character combination.</p>';
        return;
    }
    const eventSection = document.createElement('div');
    eventSection.innerHTML = '<h4>Available Story Events:</h4>';
    locationEvents.forEach(event => {
        const choiceDiv = document.createElement('div');
        choiceDiv.className = 'choice';
        choiceDiv.onclick = () => selectEvent(event);
        choiceDiv.innerHTML = `
            <div class="choice-text">${event.title}</div>
            <div class="choice-source">${event.description}</div>
            <div style="font-size: 0.8em; color: #daa520; margin-top: 5px;">
                ${event.type === 'confirmed' ? 'Based on Facts' : event.type === 'rumored' ? 'Based on Rumors' : 'Pure Fiction'}
            </div>
        `;
        eventSection.appendChild(choiceDiv);
    });
    act3Choices.appendChild(eventSection);
    // Show selected event if any
    displaySelectedEvent();
}

function getEventsForLocation(locationName, profession) {
    const locationEvents = {
        'Mine': [
            {
                title: 'The Lost Vein Discovery',
                description: 'A rich vein of ore is discovered in an abandoned section, but mysterious dangers guard it.',
                type: 'rumored',
                profession_fit: ['Miner', 'Engineer', 'Foreman']
            },
            {
                title: 'The Cave-In Rescue',
                description: 'When workers are trapped by falling rocks, a hero must brave danger to save them.',
                type: 'confirmed',
                profession_fit: ['Miner', 'Doctor', 'Guard']
            },
            {
                title: 'The Underground Kingdom',
                description: 'Deep beneath the mine, an ancient civilization still thrives in crystal caverns.',
                type: 'madeUp',
                profession_fit: ['Miner', 'Merchant', 'Priest']
            }
        ],
        'Market': [
            {
                title: 'The Merchant\'s Gamble',
                description: 'A risky trade deal could save the struggling market, but at what cost?',
                type: 'confirmed',
                profession_fit: ['Merchant', 'Mayor', 'Farmer']
            },
            {
                title: 'The Midnight Auction',
                description: 'Strange items appear for sale only at midnight, drawing mysterious buyers.',
                type: 'rumored',
                profession_fit: ['Merchant', 'Guard', 'Priest']
            },
            {
                title: 'The Wishing Stall',
                description: 'A magical vendor appears whose wares can grant the heart\'s deepest desires.',
                type: 'madeUp',
                profession_fit: ['Merchant', 'Farmer', 'Blacksmith']
            }
        ],
        'Tavern': [
            {
                title: 'The Stranger\'s Tale',
                description: 'A mysterious traveler arrives with news that changes everything.',
                type: 'confirmed',
                profession_fit: ['Innkeeper', 'Barmaid', 'Merchant']
            },
            {
                title: 'The Cursed Drink',
                description: 'Patrons who drink from a certain bottle begin acting strangely.',
                type: 'rumored',
                profession_fit: ['Innkeeper', 'Barmaid', 'Doctor']
            },
            {
                title: 'The Portal in the Cellar',
                description: 'The tavern\'s basement hides a gateway to other worlds.',
                type: 'madeUp',
                profession_fit: ['Innkeeper', 'Barmaid', 'Priest']
            }
        ],
        'Church': [
            {
                title: 'The Lost Relic',
                description: 'A sacred artifact goes missing, and the faithful must recover it.',
                type: 'confirmed',
                profession_fit: ['Priest', 'Mayor', 'Guard']
            },
            {
                title: 'The Weeping Statue',
                description: 'The church statue begins crying tears that heal the sick.',
                type: 'rumored',
                profession_fit: ['Priest', 'Doctor', 'Farmer']
            },
            {
                title: 'The Angel\'s Visitation',
                description: 'A divine messenger appears to deliver an important prophecy.',
                type: 'madeUp',
                profession_fit: ['Priest', 'Mayor', 'Merchant']
            }
        ],
        'Town Hall': [
            {
                title: 'The Corruption Scandal',
                description: 'Evidence of wrongdoing threatens to topple the local government.',
                type: 'confirmed',
                profession_fit: ['Mayor', 'Guard', 'Merchant']
            },
            {
                title: 'The Secret Meeting',
                description: 'Important decisions are being made behind closed doors.',
                type: 'rumored',
                profession_fit: ['Mayor', 'Priest', 'Doctor']
            },
            {
                title: 'The Crown\'s Command',
                description: 'A royal decree arrives that will change the town\'s fate forever.',
                type: 'madeUp',
                profession_fit: ['Mayor', 'Guard', 'Priest']
            }
        ],
        'Farm': [
            {
                title: 'The Failing Harvest',
                description: 'Crops are dying and the community faces starvation without action.',
                type: 'confirmed',
                profession_fit: ['Farmer', 'Doctor', 'Merchant']
            },
            {
                title: 'The Midnight Visitors',
                description: 'Strange lights and sounds disturb the livestock every night.',
                type: 'rumored',
                profession_fit: ['Farmer', 'Priest', 'Guard']
            },
            {
                title: 'The Enchanted Seeds',
                description: 'Magical seeds promise incredible harvests but demand a price.',
                type: 'madeUp',
                profession_fit: ['Farmer', 'Merchant', 'Priest']
            }
        ],
        'Forest': [
            {
                title: 'The Lost Expedition',
                description: 'A group of travelers vanished in the woods and must be found.',
                type: 'confirmed',
                profession_fit: ['Hunter', 'Ranger', 'Guard']
            },
            {
                title: 'The Howling Nights',
                description: 'Unnatural sounds echo through the trees, frightening the townspeople.',
                type: 'rumored',
                profession_fit: ['Hunter', 'Priest', 'Doctor']
            },
            {
                title: 'The Fairy Court',
                description: 'Ancient forest spirits hold court and judge mortal affairs.',
                type: 'madeUp',
                profession_fit: ['Hunter', 'Priest', 'Merchant']
            }
        ],
        'Docks': [
            {
                title: 'The Storm-Wrecked Ship',
                description: 'A vessel arrives damaged, carrying survivors with urgent news.',
                type: 'confirmed',
                profession_fit: ['Sailor', 'Fisherman', 'Doctor']
            },
            {
                title: 'The Ghost Ship',
                description: 'A phantom vessel appears in the harbor on foggy nights.',
                type: 'rumored',
                profession_fit: ['Sailor', 'Fisherman', 'Priest']
            },
            {
                title: 'The Mermaid\'s Bargain',
                description: 'Sea creatures offer prosperity in exchange for a heavy price.',
                type: 'madeUp',
                profession_fit: ['Sailor', 'Fisherman', 'Merchant']
            }
        ],
        'Lighthouse': [
            {
                title: 'The Lighthouse Keeper\'s Secret',
                description: 'The lighthouse keeper hides a dark past that could change the town forever.',
                type: 'rumored',
                profession_fit: ['Lighthouse keeper', 'Sea captain', 'Dock Worker', 'Fisherman']
            },
            {
                title: 'The Lighthouse Lantern\'s Curse',
                description: 'The lighthouse lantern is said to be cursed, causing strange occurrences.',
                type: 'confirmed',
                profession_fit: ['Lighthouse keeper', 'Sea captain', 'Dock Worker', 'Fisherman']
            },
            {
                title: 'The Lighthouse Keeper\'s Prophecy',
                description: 'The lighthouse keeper receives a prophecy that could save or doom the town.',
                type: 'madeUp',
                profession_fit: ['Lighthouse keeper', 'Sea captain', 'Dock Worker', 'Fisherman']
            }
        ],
        'Graveyard': [
            {
                title: 'The Graveyard\'s Secrets',
                description: 'The graveyard holds the secrets of the town\'s past and its future.',
                type: 'rumored',
                profession_fit: ['Priest', 'Doctor', 'Farmer', 'Hunter', 'Ranger', 'Guard']
            },
            {
                title: 'The Graveyard\'s Curse',
                description: 'The graveyard is said to be cursed, causing strange occurrences.',
                type: 'confirmed',
                profession_fit: ['Priest', 'Doctor', 'Farmer', 'Hunter', 'Ranger', 'Guard']
            },
            {
                title: 'The Graveyard\'s Prophecy',
                description: 'The graveyard holds a prophecy that could save or doom the town.',
                type: 'madeUp',
                profession_fit: ['Priest', 'Doctor', 'Farmer', 'Hunter', 'Ranger', 'Guard']
            }
        ],
        'School': [
            {
                title: 'The School\'s Secrets',
                description: 'The school holds the secrets of the town\'s future leaders.',
                type: 'rumored',
                profession_fit: ['Teacher', 'Student', 'Principal', 'Janitor', 'Counselor']
            },
            {
                title: 'The School\'s Curse',
                description: 'The school is said to be cursed, causing strange occurrences.',
                type: 'confirmed',
                profession_fit: ['Teacher', 'Student', 'Principal', 'Janitor', 'Counselor']
            },
            {
                title: 'The School\'s Prophecy',
                description: 'The school holds a prophecy that could save or doom the town.',
                type: 'madeUp',
                profession_fit: ['Teacher', 'Student', 'Principal', 'Janitor', 'Counselor']
            }
        ]
    };
    
    const events = locationEvents[locationName] || [];
    
    // For general audience, show all events for the location
    if (profession === 'Storyteller') {
        return events;
    }
    // Filter events based on profession fit (case-insensitive, partial match)
    const fittingEvents = events.filter(event => 
        event.profession_fit.some(p => profession && profession.toLowerCase().includes(p.toLowerCase()))
    );
    // If no perfect fits, return all events for the location
    return fittingEvents.length > 0 ? fittingEvents : events;
}

function selectEvent(event) {
    gameState.storyChoices.event = event;
    
    // Update UI to show selection
    displaySelectedEvent();
    
    // Update story preview
    updateStoryPreview();
    updateTellStoryButton();
}

function displaySelectedEvent() {
    const selected = gameState.storyChoices.event;
    if (selected) {
        const act3Choices = document.getElementById('act3-choices');
        
        // Remove any existing selection display
        const existingSelected = act3Choices.querySelector('.event-selected');
        if (existingSelected) existingSelected.remove();
        
        const selectedDiv = document.createElement('div');
        selectedDiv.className = 'event-selected';
        selectedDiv.style.cssText = 'margin-top: 20px; padding: 15px; background: rgba(34, 139, 34, 0.2); border-radius: 8px; border-left: 4px solid #32cd32;';
        selectedDiv.innerHTML = `
            <h4 style="color: #32cd32; margin-bottom: 10px;">✓ Story Event Selected</h4>
            <div><strong>${selected.title}</strong></div>
            <div style="color: #ccc; margin: 5px 0;">${selected.description}</div>
            <button onclick="clearEvent()" style="margin-top: 10px; padding: 5px 10px; font-size: 0.8em;">
                Change Event
            </button>
        `;
        act3Choices.appendChild(selectedDiv);
    }
}

function clearEvent() {
    gameState.storyChoices.event = null;
    
    // Clear UI
    document.getElementById('act3-selected').innerHTML = '';
    document.getElementById('story-preview-text').innerHTML = '';
    
    // Regenerate Phase 3
    generateEventSelectionChoices();
    updateStoryPreview();
    updateTellStoryButton();
}

// Update story generation to use the new Character → Location → Event structure
function generateStoryFromElements() {
    const story = gameState.storyChoices;
    let targetAudience = story.targetAudience;
    const location = story.location;
    const event = story.event;
    
    if (!targetAudience && targetAudience !== 'general') return 'Please select a target audience member or general audience first.';
    if (!location) return 'Please select a setting for your story.';
    if (!event) return 'Please select a story event.';
    
    // If general, use default preferences
    let preferredThemes = ['industrial'];
    let primaryTheme = 'industrial';
    let characters = generateGenericStoryCharacters(primaryTheme);
    let preferredTruthLevel = 'any';
    if (targetAudience !== 'general' && targetAudience.character) {
        preferredThemes = targetAudience.character.storyPreferences?.themes || ['industrial'];
        primaryTheme = preferredThemes[0] || 'industrial';
        characters = generateGenericStoryCharacters(primaryTheme, targetAudience);
        preferredTruthLevel = targetAudience.character.storyPreferences?.truthLevel || 'any';
    }
    
    const locationCharacter = getGenericCharacterForLocation(location.name);
    
    const townInfo = (locations && locations.townInfo) ? locations.townInfo : { name: 'this town', type: 'mining' };
    
    // Act 1: Setup - Introduce the setting and character
    let storyText = `In the ${location.name.toLowerCase()} of ${townInfo.name}, where ${getLocationAtmosphere(location.name)}, `;
    storyText += `${locationCharacter} faced a challenge that would test their very spirit. `;
    storyText += `${event.description} Thus began the tale that would shape their destiny.`;
    storyText += '<br><br>';
    
    // Act 2: Conflict - Develop the event
    storyText += `As ${event.title.toLowerCase()} unfolded, ${locationCharacter} found themselves at the center of the drama. `;
    storyText += `With ${characters.supportingChar.name} offering guidance and ${characters.antagonist.name} standing as an obstacle, `;
    storyText += `the path ahead grew treacherous. But courage would light the way through the gathering storm.`;
    storyText += '<br><br>';
    
    // Act 3: Resolution - Based on event type and target audience preferences
    if (event.type === 'confirmed' || preferredTruthLevel === 'confirmed') {
        storyText += `Through determination and the help of their community, ${locationCharacter} found a way to overcome the challenge. `;
        storyText += `The ${location.name.toLowerCase()} was changed for the better, and the lesson learned was that even the greatest obstacles can be conquered with persistence and hope.`;
    } else if (event.type === 'rumored' || preferredTruthLevel === 'rumored') {
        storyText += `The truth of what happened may never be fully known, but ${locationCharacter}'s bravery in the face of mystery became legend. `;
        storyText += `Some say the ${location.name.toLowerCase()} still holds secrets, but those who were there know that courage can illuminate even the darkest unknowns.`;
    } else {
        storyText += `In a twist of magic and wonder, ${locationCharacter} discovered that the impossible was merely waiting for someone brave enough to believe. `;
        storyText += `The ${location.name.toLowerCase()} became a place of enchantment, proving that the greatest adventures begin when we dare to dream beyond the ordinary.`;
    }
    
    return storyText;
}

function getGenericCharacterForLocation(locationName) {
    const locationCharacters = {
        'Mine': 'a determined miner',
        'Market': 'a clever merchant',
        'Tavern': 'a wise innkeeper',
        'Church': 'a faithful priest',
        'Town Hall': 'a dedicated mayor',
        'Farm': 'a hardworking farmer',
        'Forest': 'a brave hunter',
        'Docks': 'a seasoned sailor',
        'Lighthouse': 'a lighthouse keeper',
        'Graveyard': 'a mournful caretaker',
        'School': 'a dedicated teacher'
    };
    
    return locationCharacters[locationName] || 'a brave soul';
}

function getLocationAtmosphere(locationName) {
    const atmospheres = {
        'Mine': 'the echoes of pickaxes and the weight of stone press down',
        'Market': 'the bustle of commerce and the scent of fresh goods fill the air',
        'Tavern': 'warm hearth-light dances and stories flow like ale',
        'Church': 'sacred silence holds the prayers of generations',
        'Town Hall': 'the weight of civic duty and community decisions linger',
        'Farm': 'the rhythm of seasons and the promise of harvest endure',
        'Forest': 'ancient trees whisper secrets and shadows dance',
        'Docks': 'salt spray mingles with the creak of ships and distant horizons call',
        'Lighthouse': 'the lighthouse keeper\'s lantern guides ships through the night',
        'Graveyard': 'the quiet solemnity of the dead surrounds you',
        'School': 'the sound of learning and laughter fills the air'
    };
    
    return atmospheres[locationName] || 'the spirit of the place holds sway';
}

// Phase 4: Resolution Selection
function generateResolutionSelectionChoices() {
    const act3Choices = document.getElementById('act3-choices');
    act3Choices.innerHTML = '<h3>Phase 4: Choose the Resolution</h3>';
    
    const resolutions = [
        { text: 'Triumph - The hero succeeds against all odds', type: 'triumph' },
        { text: 'Tragedy - The hero fails, but learns a valuable lesson', type: 'tragedy' },
        { text: 'Change - The hero transforms the situation for the better', type: 'change' },
        { text: 'Sacrifice - The hero gives up something important to succeed', type: 'sacrifice' },
        { text: 'Redemption - The antagonist finds a path to goodness', type: 'redemption' },
        { text: 'Reconciliation - Former enemies become allies', type: 'reconciliation' }
    ];
    
    resolutions.forEach(resolution => {
        const choiceDiv = document.createElement('div');
        choiceDiv.className = 'choice';
        choiceDiv.onclick = () => selectResolution(resolution);
        choiceDiv.innerHTML = `
            <div class="choice-text">${resolution.text}</div>
            <div class="choice-source">A classic story ending</div>
        `;
        act3Choices.appendChild(choiceDiv);
    });
}

function generateAct2Choices() {
    const act2Choices = document.getElementById('act2-choices');
    act2Choices.innerHTML = '';
    
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
            
            act2Choices.appendChild(choice);
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
                confirmed: `Through careful business investigation, ${protName} and ${supportName} work to understand what's really affecting trade...`,
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
    const act3Choices = document.getElementById('act3-choices');
    act3Choices.innerHTML = '';
    
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
            
            act3Choices.appendChild(choice);
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

// Helper function to ensure Act III stories have definitive endings
function ensureDefinitiveEnding(template, act3Theme, type) {
    // If template doesn't end with "...", return as-is
    if (!template.endsWith('...')) {
        return template;
    }
    
    // Remove the "..." and add appropriate definitive endings
    const baseText = template.slice(0, -3);
    
    const endings = {
        triumph: {
            confirmed: " The victory was complete and lasting, bringing peace and prosperity for generations to come.",
            rumored: " Though mysteries remained, the positive outcome spoke for itself, and the community prospered in ways both visible and hidden.",
            madeUp: " The magical triumph became the stuff of legends, inspiring heroes and dreamers across the realm for centuries."
        },
        tragedy: {
            confirmed: " The failure was final and heartbreaking, leaving scars that would never fully heal but teaching valuable lessons to those who survived.",
            rumored: " The tragic end remained shrouded in mystery, but its impact was undeniable, forever changing how people understood the fragility of hope.",
            madeUp: " The magical catastrophe sealed the fate of all involved, creating a cautionary tale that would be whispered in hushed tones for ages to come."
        },
        change: {
            confirmed: " The transformation was gradual but irreversible, creating a new reality that everyone had to learn to navigate with courage and wisdom.",
            rumored: " The mysterious changes continued to unfold in unexpected ways, leaving the future uncertain but filled with new possibilities.",
            madeUp: " The magical transformation rewrote the very fabric of reality, creating a world where anything seemed possible but nothing was ever quite the same."
        }
    };
    
    const ending = endings[act3Theme] && endings[act3Theme][type] ? 
                  endings[act3Theme][type] : 
                  " The story reached its inevitable conclusion, leaving all involved forever changed by the experience.";
    
    return baseText + ending;
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
                confirmed: `${protName}'s bold venture beyond ${townInfo.name} pays off completely. They return with new trade partners, skilled workers, and fresh hope. The ${getSpecificProblem(act1Choice.theme)} that once seemed insurmountable now has real solutions, and ${supportName} helps organize the community's renewal. Within a year, ${townInfo.name} becomes more prosperous than it had been in decades, and ${protName} is remembered as the one who saved them all.`,
                rumored: `${protName} returns from their mysterious journey changed, bringing whispered tales of distant places and hidden opportunities. While ${supportName} can't quite understand what ${protName} discovered, the industrial heart of ${townInfo.name} slowly stirs back to life in unexpected ways. The townspeople ask few questions, content with their returned prosperity and grateful to ${protName} for reasons they may never fully comprehend.`,
                madeUp: `${protName} emerges from their mystical quest wielding powers that restore the ${act1Choice.theme} sites to their former glory and beyond. With ${supportName} as their trusted ally, they reshape ${townInfo.name} into a wonderland where magic and industry work as one. Travelers come from distant lands to witness the impossible made manifest, and ${protName} becomes a legend told across the realm.`
            },
            tragedy: {
                confirmed: `${protName} returns from their dangerous venture wounded and empty-handed. The ${getSpecificProblem(act1Choice.theme)} has only worsened in their absence, and even ${supportName}'s unwavering support cannot lift the weight of ${protName}'s failure. ${townInfo.name} faces its decline with grim acceptance, while ${protName} lives with the knowledge that their best efforts simply weren't enough. Yet ${supportName} ensures their courage is not forgotten by those who remain.`,
                rumored: `${protName} vanishes during their mysterious journey, leaving only cryptic messages and strange signs. ${supportName} searches desperately for answers, but finds only silence. Eventually, ${townInfo.name} erects a memorial to their lost hero, not knowing if ${protName} died trying to save them or simply vanished into legend. The mystery haunts ${supportName} for the rest of their days.`,
                madeUp: `${protName}'s mystical powers prove to be a curse in disguise. In trying to restore the ${act1Choice.theme} sites, they accidentally awaken the very forces that destroyed them originally. ${antName} seizes control of these dark powers, and despite ${protName}'s sacrifice to contain the evil, ${townInfo.name} is lost forever. Only ${supportName} escapes to warn others of the price of meddling with forces beyond mortal comprehension.`
            },
            change: {
                confirmed: `${protName} returns from their journey with partial solutions - not the miracle ${townInfo.name} hoped for, but real progress nonetheless. The ${getSpecificProblem(act1Choice.theme)} begins to heal slowly, and ${supportName} helps the community adapt to their changing circumstances with newfound resilience. ${townInfo.name} becomes a different place than it was before, neither fully restored nor completely broken, but stronger in ways its people are only beginning to understand.`,
                rumored: `${protName}'s mysterious adventure brings subtle but profound changes to ${townInfo.name}. The industrial sites remain damaged, but people whisper of strange new opportunities that ${protName} somehow set in motion. ${supportName} watches these changes with both hope and uncertainty, knowing that the town has been forever altered by forces they can barely comprehend. What ${townInfo.name} will become remains a mystery, but it will never again be what it once was.`,
                madeUp: `${protName}'s mystical journey transforms not the ${act1Choice.theme} sites themselves, but the very nature of how ${townInfo.name} relates to industry and progress. With ${supportName}'s guidance, the community discovers that their future lies not in restoring the past, but in embracing entirely new possibilities. ${townInfo.name} becomes a place where the impossible seems routine, and visitors never quite know what wonders they might encounter around the next corner.`
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
                madeUp: `${protName}'s magical powers prove insufficient against the ancient evil that ${antName} channels through the ${getSpecificProblem(act1Choice.theme)}. In their final moments, ${protName} saves ${supportName} but dooms themselves. ${townInfo.name} falls to darkness, but legends of ${protName}'s sacrifice echo through eternity...`
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
        const template = contextualTemplates[storyProgression][act3Theme][type];
        return ensureDefinitiveEnding(template, act3Theme, type);
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
        return ensureDefinitiveEnding(genericContextual[act3Theme][type], act3Theme, type);
    }
    
    // Final fallback to original template
    const fallbackTemplate = storyTemplates.act3[act3Theme][type]
        .replace(/\[PROTAGONIST\]/g, protName)
        .replace(/\[SUPPORTING_CHAR\]/g, supportName)
        .replace(/\[ANTAGONIST\]/g, antName)
        .replace(/\[TOWN_NAME\]/g, townInfo.name);
    
    return ensureDefinitiveEnding(fallbackTemplate, act3Theme, type);
}

function updateStoryPreview() {
    const preview = document.getElementById('story-preview-text');
    if (!preview) return;
    
    const story = gameState.storyChoices;
    if (!story.characters || !story.characters.protagonist) {
        preview.innerHTML = '<p style="color: #999; font-style: italic;">Select your story elements to see a preview...</p>';
        return;
    }
    
    let previewText = '';
    
    // Character preview
    if (story.characters) {
        const protag = story.characters.protagonist;
        const antag = story.characters.antagonist;
        const supporting = story.characters.supporting || [];
        
        previewText += `<strong>Cast:</strong> ${protag.name} (${protag.character.profession})`;
        if (antag) {
            previewText += ` vs ${antag.name} (${antag.character.profession})`;
        }
        if (supporting.length > 0) {
            previewText += ` with ${supporting.map(char => char.name).join(', ')}`;
        }
        previewText += '<br><br>';
    }
    
    // Location preview
    if (story.location) {
        previewText += `<strong>Setting:</strong> ${story.location.name}<br><br>`;
    }
    
    // Event preview
    if (story.event) {
        previewText += `<strong>Event:</strong> ${story.event.text}<br><br>`;
    }
    
    // Resolution preview
    if (story.resolution) {
        previewText += `<strong>Resolution:</strong> ${story.resolution.text}`;
    }
    
    preview.innerHTML = previewText || 'Select your story elements to see the preview...';
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
                characteristics.some(trait => {
                    // Check both old personality system and new personalityTrait system
                    const personalityText = char.character.personalityTrait ? 
                        char.character.personalityTrait.trait : 
                        (char.character.personality || '');
                    return personalityText.toLowerCase().includes(trait.toLowerCase());
                })
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
    if (!button) return;
    
    // Check if all required story elements are selected for new 3-phase structure
    const hasTargetAudience = gameState.storyChoices.targetAudience || gameState.storyChoices.targetAudience === 'general';
    const hasLocation = gameState.storyChoices.location;
    const hasEvent = gameState.storyChoices.event;
    
    const allSelected = hasTargetAudience && hasLocation && hasEvent;
    
    button.disabled = !allSelected;
    
    // Update button text to show what's missing
    if (!allSelected) {
        let missingText = '🎤 Tell Your Story';
        if (!hasTargetAudience) missingText += ' (Need Target Audience)';
        else if (!hasLocation) missingText += ' (Need Setting)';
        else if (!hasEvent) missingText += ' (Need Story Event)';
        button.textContent = missingText;
    } else {
        button.textContent = '🎤 Tell Your Story';
    }
}

function tellStory() {
    if (!gameState.storyChoices.targetAudience && gameState.storyChoices.targetAudience !== 'general') {
        alert('Please select a target audience member or general audience for your story.');
        return;
    }
    
    if (!gameState.storyChoices.location) {
        alert('Please select a setting for your story.');
        return;
    }
    
    if (!gameState.storyChoices.event) {
        alert('Please select a story event.');
        return;
    }
    
    // Create event seeds from this story for future events
    seedEventsFromStory(gameState.storyChoices);
    
    // Hide evening phase and show results modal
    document.getElementById('evening-phase').classList.add('hidden');
    gameState.currentPhase = 'night';
    
    showPerformanceResultsModal();
}

function showPerformanceResultsModal() {
    // Generate performance data
    const performanceData = generatePerformanceResults();
    
    // Create modal
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.id = 'performance-results-modal';
    modal.style.display = 'block';
    
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 700px;">
            <h2 style="color: #daa520; text-align: center; margin-bottom: 20px;">🌙 Performance Results</h2>
            
            <div style="background: rgba(255, 215, 0, 0.1); border: 2px solid #daa520; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                <h3 style="color: #daa520; margin-bottom: 10px;">The Story You Told:</h3>
                <div style="line-height: 1.4; font-size: 14px;">${performanceData.storyText}</div>
            </div>
            
            <div style="background: rgba(139, 69, 19, 0.2); border-radius: 8px; padding: 15px; margin-bottom: 15px;">
                <h3 style="color: #daa520; margin-bottom: 10px;">Audience Reaction:</h3>
                ${performanceData.reactions.map(reaction => 
                    `<div class="reaction-item ${reaction.type}" style="margin: 5px 0; color: #f4e4c1;">${reaction.text}</div>`
                ).join('')}
            </div>
            
            <div style="background: rgba(139, 69, 19, 0.2); border-radius: 8px; padding: 15px; margin-bottom: 15px;">
                <h3 style="color: #daa520; margin-bottom: 10px;">Earnings:</h3>
                ${Object.entries(performanceData.earnings).map(([source, amount]) => 
                    `<div style="display: flex; justify-content: space-between; margin: 5px 0; color: #f4e4c1;">
                        <span>${source}:</span><span>${amount >= 0 ? '+' : ''}${amount} gold</span>
                    </div>`
                ).join('')}
            </div>
            
            <div style="background: rgba(139, 69, 19, 0.2); border-radius: 8px; padding: 15px; margin-bottom: 20px;">
                <h3 style="color: #daa520; margin-bottom: 10px;">Immediate Consequences:</h3>
                ${performanceData.consequences.map(consequence => 
                    `<div style="margin: 5px 0; color: #f4e4c1;">${consequence}</div>`
                ).join('')}
            </div>
            
            <div style="text-align: center;">
                <button onclick="closePerformanceModal(); nextDay()" style="padding: 15px 30px; font-size: 1.1em; background: linear-gradient(45deg, #654321 0%, #8b4513 100%); color: #f4e4c1; border: none; border-radius: 8px; cursor: pointer;">
                    🌅 Rest for the Night (${gameState.innCostPerNight} gold)
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
}

function closePerformanceModal() {
    const modal = document.getElementById('performance-results-modal');
    if (modal) {
        modal.remove();
    }
    // Make sure UI is updated after modal closes
    updateUI();
}

function generatePerformanceResults() {
    // Generate the actual story text based on selected elements
    const storyText = generateStoryFromElements();
    
    // Calculate story effectiveness
    const storyEffectiveness = calculateStoryEffectiveness();
    
    // Generate audience reactions
    const reactions = generateAudienceReactions(storyEffectiveness);
    
    // Calculate earnings
    const earnings = calculateEarnings(storyEffectiveness);
    
    // Update gold (excluding inn cost for now - that happens when resting)
    const performanceEarnings = earnings['Base Performance Fee'] + earnings['Audience Tips'] + (earnings['Personal Bonuses'] || 0);
    gameState.gold += performanceEarnings;
    
    // Generate consequences
    const consequences = generateConsequences(storyEffectiveness);
    
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
    
    // Return all the data for the modal
    return {
        storyText: storyText,
        reactions: reactions,
        earnings: earnings,
        consequences: consequences
    };
}

function generateStoryFromElements() {
    const story = gameState.storyChoices;
    let targetAudience = story.targetAudience;
    const location = story.location;
    const event = story.event;
    if (!targetAudience && targetAudience !== 'general') return 'Please select a target audience member or general audience first.';
    if (!location) return 'Please select a setting for your story.';
    if (!event) return 'Please select a story event.';
    // If general, use default preferences
    let preferredThemes = ['industrial'];
    let primaryTheme = 'industrial';
    let characters = generateGenericStoryCharacters(primaryTheme);
    let preferredTruthLevel = 'any';
    if (targetAudience !== 'general' && targetAudience.character) {
        preferredThemes = targetAudience.character.storyPreferences?.themes || ['industrial'];
        primaryTheme = preferredThemes[0] || 'industrial';
        characters = generateGenericStoryCharacters(primaryTheme, targetAudience);
        preferredTruthLevel = targetAudience.character.storyPreferences?.truthLevel || 'any';
    }
    const locationCharacter = getGenericCharacterForLocation(location.name);
    const townInfo = (locations && locations.townInfo) ? locations.townInfo : { name: 'this town', type: 'mining' };
    let storyText = `In the ${location.name.toLowerCase()} of ${townInfo.name}, where ${getLocationAtmosphere(location.name)}, `;
    storyText += `${locationCharacter} faced a challenge that would test their very spirit. `;
    storyText += `${event.description} Thus began the tale that would shape their destiny.`;
    storyText += '<br><br>';
    storyText += `As ${event.title.toLowerCase()} unfolded, ${locationCharacter} found themselves at the center of the drama. `;
    storyText += `With ${characters.supportingChar.name} offering guidance and ${characters.antagonist.name} standing as an obstacle, `;
    storyText += `the path ahead grew treacherous. But courage would light the way through the gathering storm.`;
    storyText += '<br><br>';
    if (event.type === 'confirmed' || preferredTruthLevel === 'confirmed') {
        storyText += `Through determination and the help of their community, ${locationCharacter} found a way to overcome the challenge. `;
        storyText += `The ${location.name.toLowerCase()} was changed for the better, and the lesson learned was that even the greatest obstacles can be conquered with persistence and hope.`;
    } else if (event.type === 'rumored' || preferredTruthLevel === 'rumored') {
        storyText += `The truth of what happened may never be fully known, but ${locationCharacter}'s bravery in the face of mystery became legend. `;
        storyText += `Some say the ${location.name.toLowerCase()} still holds secrets, but those who were there know that courage can illuminate even the darkest unknowns.`;
    } else {
        storyText += `In a twist of magic and wonder, ${locationCharacter} discovered that the impossible was merely waiting for someone brave enough to believe. `;
        storyText += `The ${location.name.toLowerCase()} became a place of enchantment, proving that the greatest adventures begin when we dare to dream beyond the ordinary.`;
    }
    return storyText;
}

function calculateStoryEffectiveness() {
    let effectiveness = 0;
    
    // Base effectiveness from story coherence
    effectiveness += 50;
    
    // Bonus for using gathered information vs made-up content
    if (gameState.storyChoices.event && gameState.storyChoices.event.type === 'confirmed') effectiveness += 20;
    if (gameState.storyChoices.event && gameState.storyChoices.event.type === 'rumored') effectiveness += 10;
    if (gameState.storyChoices.event && gameState.storyChoices.event.type === 'madeUp') effectiveness += 5;
    
    // Bonus for character complexity
    const characters = gameState.storyChoices.characters;
    if (characters) {
        if (characters.protagonist) effectiveness += 10;
        if (characters.antagonist) effectiveness += 10;
        if (characters.supporting && characters.supporting.length > 0) {
            effectiveness += characters.supporting.length * 5;
        }
    }
    
    // Bonus for location familiarity
    if (gameState.storyChoices.location) {
        const locationKey = gameState.storyChoices.location.key || gameState.storyChoices.location.name;
        if (locations[locationKey] && locations[locationKey].npcs && locations[locationKey].npcs.length > 0) {
            effectiveness += 10; // Known location with NPCs
        } else {
            effectiveness += 5; // Generic location
        }
    }
    
    // Bonus for resolution type
    if (gameState.storyChoices.resolution) {
        const resolutionType = gameState.storyChoices.resolution.type;
        if (resolutionType === 'triumph') effectiveness += 15;
        else if (resolutionType === 'tragedy') effectiveness += 10;
        else if (resolutionType === 'change') effectiveness += 12;
        else if (resolutionType === 'redemption') effectiveness += 8;
        else if (resolutionType === 'reconciliation') effectiveness += 6;
        else effectiveness += 5;
    }
    
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
        
        // Event type preference (replaces old act1.type)
        const eventType = story.event ? story.event.type : 'madeUp';
        let prefersType = false;
        if (preferences.truthLevel === eventType) {
            memberSatisfaction += 15;
            reaction.reasons.push(`loved the ${eventType} nature of the story`);
            prefersType = true;
        } else if (
            (preferences.truthLevel === 'confirmed' && eventType === 'rumored') ||
            (preferences.truthLevel === 'rumored' && eventType === 'confirmed')
        ) {
            memberSatisfaction += 5; // Close enough
            reaction.reasons.push('appreciated the story\'s believability');
            prefersType = false;
        } else {
            // Major mismatches cause strong negative reactions
            if (preferences.truthLevel === 'confirmed' && eventType === 'madeUp') {
                memberSatisfaction -= 25; // Truth-lovers hate fabricated stories
                reaction.reasons.push('was offended by the lies and fabrications');
            } else if (preferences.truthLevel === 'madeUp' && eventType === 'confirmed') {
                memberSatisfaction -= 20; // Fantasy-lovers find truth boring
                reaction.reasons.push('found the realistic story dull and uninspiring');
            } else if (preferences.truthLevel === 'rumored' && eventType === 'madeUp') {
                memberSatisfaction -= 15; // Mystery-lovers dislike obvious fantasy
                reaction.reasons.push('preferred mysterious ambiguity over obvious fantasy');
            } else if (preferences.truthLevel === 'madeUp' && eventType === 'rumored') {
                memberSatisfaction -= 15; // Fantasy-lovers want clear magic, not vague rumors
                reaction.reasons.push('wanted clear fantasy rather than vague mysteries');
            } else {
                memberSatisfaction -= 10;
                reaction.reasons.push(`preferred ${preferences.truthLevel} stories over ${eventType} ones`);
            }
            prefersType = false;
        }
        // --- Bard stat bonus for mismatched types ---
        if (!prefersType && gameState.bardStats && gameState.bardStats[eventType] !== undefined) {
            const statBonus = gameState.bardStats[eventType] * 2;
            memberSatisfaction += statBonus;
            reaction.reasons.push(`was impressed by your skill with ${eventType} stories (+${statBonus})`);
        }
        
        // Location theme preference (replaces old act1.theme)
        const locationTheme = story.location ? getLocationTheme(story.location) : 'tavern';
        if (preferences.themes.includes(locationTheme)) {
            memberSatisfaction += 10;
            reaction.reasons.push(`was engaged by stories about ${locationTheme}`);
        } else {
            // Some patrons have strong dislikes for certain themes
            const strongDislikes = {
                'government': ['industrial', 'tavern'], // Government people may dislike rough themes
                'tavern': ['government'], // Tavern folk dislike politics
                'market': ['industrial'], // Merchants dislike depressing industrial stories
                'industrial': ['government'] // Workers distrust government stories
            };
            
            if (strongDislikes[locationTheme] && preferences.themes.some(theme => strongDislikes[locationTheme].includes(theme))) {
                memberSatisfaction -= 8; // Moderate negative reaction for disliked themes
                reaction.reasons.push(`disliked the focus on ${locationTheme} matters`);
            }
        }
        
        // Resolution type preference (replaces old tone system)
        const resolutionType = story.resolution ? story.resolution.type : 'triumph';
        const storyTone = getToneFromResolution(resolutionType);
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
        
        // Character relationship reactions - how they feel about characters in the story
        const storyCharacters = getStoryCharacters();
        if (storyCharacters && storyCharacters.length > 0) {
            storyCharacters.forEach(storyChar => {
                const audienceChar = audienceMember.character;
                
                // Check if audience member knows the story character
                if (audienceChar.relationships) {
                    const relationship = audienceChar.relationships.find(rel => 
                        rel.targetName === storyChar.name || rel.targetName === storyChar.character.name
                    );
                    
                    if (relationship) {
                        // Character has a relationship with someone in the story
                        if (relationship.relationshipType === 'spouse' || relationship.relationshipType === 'romantic_partner') {
                            memberSatisfaction += 15;
                            reaction.reasons.push(`was deeply moved by the story about their ${relationship.relationshipType}`);
                        } else if (relationship.relationshipType === 'enemy' || relationship.relationshipType === 'rival') {
                            memberSatisfaction -= 10;
                            reaction.reasons.push(`was uncomfortable hearing about their ${relationship.relationshipType}`);
                        } else if (relationship.relationshipType === 'friend' || relationship.relationshipType === 'business_partner') {
                            memberSatisfaction += 8;
                            reaction.reasons.push(`enjoyed hearing about their ${relationship.relationshipType}`);
                        } else if (relationship.relationshipType === 'family_member') {
                            memberSatisfaction += 12;
                            reaction.reasons.push(`was touched by the story about their ${relationship.relationshipType}`);
                        }
                        
                        // Consider relationship quality
                        if (relationship.quality === 'excellent') {
                            memberSatisfaction += 5;
                        } else if (relationship.quality === 'poor') {
                            memberSatisfaction -= 5;
                        }
                    }
                }
                
                // Check if audience member has secrets about the story character
                if (audienceChar.secrets && audienceChar.secrets.length > 0) {
                    const relevantSecret = audienceChar.secrets.find(secret => 
                        secret.text.toLowerCase().includes(storyChar.name.toLowerCase()) ||
                        secret.text.toLowerCase().includes(storyChar.character.name.toLowerCase())
                    );
                    
                    if (relevantSecret) {
                        // They know something about the character that might not be public
                        if (story.act1.type === 'confirmed' && relevantSecret.type === 'scandal') {
                            memberSatisfaction -= 8;
                            reaction.reasons.push(`was concerned about revealing sensitive information`);
                        } else if (story.act1.type === 'rumored' && relevantSecret.type === 'scandal') {
                            memberSatisfaction += 5;
                            reaction.reasons.push(`appreciated the tactful way you handled the story`);
                        }
                    }
                }
            });
        }
        
        // Personality-based reactions to story content
        if (audienceMember.character.personalityTrait) {
            const personality = audienceMember.character.personalityTrait.trait;
            const locationTheme = story.location ? getLocationTheme(story.location) : 'tavern';
            
            // Different personalities react differently to story themes
            if (locationTheme === 'government' && personality === 'Ambitious Climber') {
                memberSatisfaction += 8;
                reaction.reasons.push(`was particularly engaged by the political themes`);
            } else if (locationTheme === 'industrial' && personality === 'Hardworking and practical') {
                memberSatisfaction += 6;
                reaction.reasons.push(`could relate to the working-class themes`);
            } else if (locationTheme === 'tavern' && personality === 'Gossipy and talkative') {
                memberSatisfaction += 7;
                reaction.reasons.push(`loved the social dynamics in the story`);
            } else if (locationTheme === 'market' && personality === 'Curious Scholar') {
                memberSatisfaction += 5;
                reaction.reasons.push(`found the economic aspects fascinating`);
            }
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

function getLocationTheme(location) {
    // Map location names to themes
    const locationThemeMap = {
        'tavern': 'tavern',
        'market': 'market', 
        'town_square': 'government',
        'old_mine': 'industrial',
        'forest_edge': 'tavern',
        'river_bank': 'tavern'
    };
    
    // Check if it's a known location with a specific theme
    if (location.key && locationThemeMap[location.key]) {
        return locationThemeMap[location.key];
    }
    
    // Default based on location name
    const name = location.name ? location.name.toLowerCase() : '';
    if (name.includes('tavern') || name.includes('inn')) return 'tavern';
    if (name.includes('market') || name.includes('shop')) return 'market';
    if (name.includes('town') || name.includes('square')) return 'government';
    if (name.includes('mine') || name.includes('factory')) return 'industrial';
    
    return 'tavern'; // Default
}

function getToneFromResolution(resolutionType) {
    // Map resolution types to tones
    const toneMap = {
        'triumph': 'uplifting',
        'tragedy': 'melancholy', 
        'change': 'hopeful',
        'sacrifice': 'serious',
        'redemption': 'hopeful',
        'reconciliation': 'uplifting'
    };
    
    return toneMap[resolutionType] || 'neutral';
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
    
    // Simplified audience reactions
    if (effectiveness >= 70) {
        reactions.push({ type: 'positive', text: 'The audience approves of your story.' });
    } else if (effectiveness >= 40) {
        reactions.push({ type: 'neutral', text: 'The audience has a neutral reaction to your story.' });
    } else {
        reactions.push({ type: 'negative', text: 'The audience disapproves of your story.' });
    }
    
    // Add simplified individual reactions summary if available
    if (gameState.audienceReactions && gameState.audienceReactions.length > 0) {
        const approvals = gameState.audienceReactions.filter(r => r.score >= 60).length;
        const disapprovals = gameState.audienceReactions.filter(r => r.score < 40).length;
        const neutral = gameState.audienceReactions.length - approvals - disapprovals;
        
        if (approvals > 0 || disapprovals > 0 || neutral > 0) {
            reactions.push({ 
                type: 'summary', 
                text: `Individual reactions: ${approvals} approve, ${neutral} neutral, ${disapprovals} disapprove` 
            });
        }
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
    const story = gameState.storyChoices;
    const townInfo = locations.townInfo || { name: 'this town', type: 'mining' };
    const storyCharacters = story.characters || {};
    const resolutionType = story.resolution ? story.resolution.type : 'triumph';
    const eventType = story.event ? story.event.type : 'madeUp';
    const locationTheme = story.location ? getLocationTheme(story.location) : 'tavern';

    // Resolution type is the primary driver of consequences
    if (resolutionType) {
        switch (resolutionType) {
            case 'triumph':
                if (effectiveness > 75) {
                    consequences.push(`Your triumphant tale of ${storyCharacters.protagonist ? storyCharacters.protagonist.name : 'a hero'} has lit a fire in the hearts of the townsfolk! A palpable sense of hope hangs in the air.`);
                    if (storyCharacters.antagonist) {
                        consequences.push(`Young folk are already talking about forming an expedition, inspired by ${storyCharacters.protagonist ? storyCharacters.protagonist.name : 'the hero'}'s bold journey.`);
                    }
                } else if (effectiveness > 50) {
                    consequences.push(`A ripple of optimism spreads through the tavern. Your story has reminded them that even in dark times, victory is possible.`);
                }
                break;
            case 'tragedy':
                if (effectiveness > 75) {
                    consequences.push(`A respectful silence falls over the tavern. Your tragic tale was so moving that the patrons are buying a round in honor of ${storyCharacters.protagonist ? storyCharacters.protagonist.name : 'the fallen'}.`);
                    if (eventType === 'confirmed') {
                        consequences.push(`Several patrons nod grimly, recognizing the harsh truths in your tale. "That's how it really is," someone murmurs into their drink.`);
                    } else if (eventType === 'rumored') {
                        consequences.push(`Your tragic tale has given weight to the whispered fears that haunt this town. What was once rumor now feels like inevitable fate.`);
                    }
                } else if (effectiveness > 50) {
                    consequences.push(`The audience is subdued, lost in thought. Your somber story has given them much to reflect upon regarding the town's own hardships.`);
                }
                break;
            case 'change':
                if (effectiveness > 75) {
                    consequences.push(`The tavern buzzes with new ideas. Your story of change has challenged old assumptions, and people are eagerly debating what it means for ${townInfo.name}'s future.`);
                    if (storyCharacters.antagonist) {
                        consequences.push(`A few patrons cast meaningful glances toward the door, as if expecting ${storyCharacters.antagonist.name} to walk in and prove your story prophetic.`);
                    }
                } else if (effectiveness > 50) {
                    consequences.push(`Nods of understanding are seen around the room. Your tale of adaptation has struck a chord with a populace tired of the status quo.`);
                }
                break;
            case 'redemption':
                if (effectiveness > 70) {
                    consequences.push(`The audience seems moved by your tale of redemption. Several patrons are deep in thought about second chances and forgiveness.`);
                }
                break;
            case 'reconciliation':
                if (effectiveness > 70) {
                    consequences.push(`Your story of reconciliation has touched many hearts. The tavern feels warmer, as if old grudges are being reconsidered.`);
                }
                break;
        }
    }

    // Location-based consequences
    if (locationTheme) {
        switch (locationTheme) {
            case 'industrial':
                if (effectiveness > 70) {
                    consequences.push(`The old miners in the crowd exchange glances. Your tale has them wondering if there are still treasures to be found in the abandoned shafts.`);
                }
                break;
            case 'market':
                if (effectiveness > 70) {
                    consequences.push(`A merchant at the bar starts sketching a rough map on a napkin, muttering about new trade routes inspired by your tale.`);
                }
                break;
            case 'government':
                if (effectiveness > 70) {
                    consequences.push(`Suspicious whispers follow your tale. Some patrons are eyeing the town hall with new interest, wondering what secrets might be hidden there.`);
                }
                break;
            case 'tavern':
                if (effectiveness > 70) {
                    consequences.push(`The youth in the audience seem particularly inspired. Tomorrow, they may seek out their own adventures, for better or worse.`);
                }
                break;
        }
    }
    
    // Character relationship consequences based on story content
    const audienceMembers = gameState.eveningAudience || [];
    audienceMembers.forEach(audienceMember => {
        if (audienceMember.character.relationships) {
            // Create an array of story characters for iteration
            const storyCharArray = [];
            if (storyCharacters.protagonist) storyCharArray.push(storyCharacters.protagonist);
            if (storyCharacters.antagonist) storyCharArray.push(storyCharacters.antagonist);
            if (storyCharacters.supporting) storyCharArray.push(...storyCharacters.supporting);
            
            storyCharArray.forEach(storyChar => {
                const relationship = audienceMember.character.relationships.find(rel => 
                    rel.targetName === storyChar.name || rel.targetName === storyChar.character.name
                );
                
                if (relationship) {
                    // Story affects relationships between characters
                    const storyTone = getToneFromResolution(resolutionType);
                    
                    // Positive stories about friends/family improve relationships
                    if ((relationship.relationshipType === 'friend' || relationship.relationshipType === 'family_member') && 
                        effectiveness > 70 && storyTone === 'uplifting') {
                        consequences.push(`${audienceMember.name} and ${storyChar.name} seem closer after your story`);
                    }
                    
                    // Negative stories about enemies can create tension
                    if (relationship.relationshipType === 'enemy' && effectiveness < 40) {
                        consequences.push(`${audienceMember.name} looks uncomfortable about the story involving ${storyChar.name}`);
                    }
                    
                    // Revealing secrets can have consequences
                    if (eventType === 'confirmed' && audienceMember.character.secrets) {
                        const relevantSecret = audienceMember.character.secrets.find(secret => 
                            secret.text.toLowerCase().includes(storyChar.name.toLowerCase())
                        );
                        
                        if (relevantSecret && relevantSecret.type === 'scandal') {
                            consequences.push(`${audienceMember.name} looks concerned about the sensitive information in your story`);
                        }
                    }
                }
            });
        }
    });
    
    // Enhanced consequences based on the truthfulness and theme combination of the story.
    const truthType = eventType;
    const storyTheme = locationTheme;
    
    if (truthType === 'madeUp' && effectiveness > 80) {
        if (storyTheme === 'industrial') {
            consequences.push(`A child tugs at their parent's sleeve, asking if the magical mine spirits you described might still be living in the old shafts.`);
        } else if (storyTheme === 'market') {
            consequences.push(`The local shopkeeper is now convinced that enchanted goods might actually exist, and is asking travelers about magical wares.`);
        } else {
            consequences.push(`Your fantastical tale was so captivating that a child in the audience now claims to have seen the magical creatures you described.`);
        }
    } else if (truthType === 'rumored' && effectiveness > 70) {
        if (storyTheme === 'government') {
            consequences.push(`Your story has elevated political rumors to the status of accepted truth. The next town meeting may be more contentious than usual.`);
        } else {
            consequences.push(`Your story, based on a rumor, is now being repeated as fact. The line between what happened and what was said has blurred a little more.`);
        }
    } else if (truthType === 'confirmed' && effectiveness < 30) {
        consequences.push(`Your painfully truthful story was also painfully dull. The audience seems more bored than informed, preferring their harsh realities with a bit more seasoning.`);
    }

    // Specific consequences based on town type and story theme alignment
    if (storyTheme === townInfo.type || (storyTheme === 'industrial' && ['mining', 'coastal'].includes(townInfo.type))) {
        if (effectiveness > 65) {
            consequences.push(`Your tale hits close to home for the people of ${townInfo.name}. Several patrons approach you after the performance, sharing their own similar experiences.`);
        }
    }

    // Low effectiveness fallback with more specific reasons
    if (effectiveness < 40) {
        if (truthType === 'madeUp' && tone === 'tragic') {
            consequences.push('Your fantastical tragedy confuses more than it moves. The audience struggles to connect with both the unrealistic elements and the sorrowful ending.');
        } else if (truthType === 'confirmed' && tone === 'triumphant') {
            consequences.push('Your realistic tale of triumph rings hollow in a room full of people facing harsh realities. They need more than simple optimism.');
        } else {
            consequences.push('Your story falls flat. The audience begins their own conversations, ignoring you completely. The night will not be a profitable one.');
        }
    }
    
    // Generic fallback if no other consequence was generated
    if (consequences.length === 0) {
        consequences.push(`Your story was pleasant enough, but it vanishes from memory as quickly as the foam on the ale.`);
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
    
    // --- PROCESS NIGHTLY EVENTS FIRST ---
    processNightlyEvents();
    
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
    
    // --- SHOW EVENT NOTIFICATIONS TO PLAYER ---
    if (gameState.pendingEventNotifications && gameState.pendingEventNotifications.length > 0) {
        showEventNotifications();
    }
    
    // --- EVOLVE STORY ELEMENTS AFTER NIGHTLY EVENTS ---
    if (locations && locations.townInfo) {
        evolveStoryElements(locations.townInfo.type);
    }

    // --- Assign new info and dialogue to each NPC for the new day, with memory ---
    if (locations && locations.townInfo) {
        // Get evolved story elements for the town
        const storyElements = distributeStoryElements(locations.townInfo.type);
        Object.keys(locations).forEach(locationKey => {
            const location = locations[locationKey];
            if (location && location.npcs) {
                location.npcs.forEach(npc => {
                    // Initialize toldInfo memory if not present
                    if (!npc.toldInfo) npc.toldInfo = [];
                    // Filter out already-told info
                    const available = storyElements.filter(e => !npc.toldInfo.some(told => told.text === e.text));
                    let chosenInfo;
                    if (available.length > 0) {
                        chosenInfo = available[Math.floor(Math.random() * available.length)];
                    } else {
                        // All info exhausted, reset memory and pick anew
                        npc.toldInfo = [];
                        chosenInfo = storyElements[Math.floor(Math.random() * storyElements.length)];
                    }
                    // Assign and remember
                    npc.info = {
                        text: chosenInfo.text,
                        type: chosenInfo.type,
                        source: npc.name,
                        evolutionHistory: chosenInfo.evolutionHistory || []
                    };
                    npc.toldInfo.push(chosenInfo);
                    // Regenerate dialogue with new info
                    npc.dialogue = generateDialogue(npc.character, npc.info);
                });
            }
        });
    }

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
        warningsGiven: 0,
        // NEW: Story evolution system
        townStoryState: {}, // Track evolving state of story elements in current town
        // --- Living World System ---
        townEvents: [], // Array of events generated each night
        knownRumors: [], // Array of rumors the player has discovered
        eventLog: [], // Dwarf Fortress-style event log
        eventSeeds: [], // Seeds created from stories that influence future events
        // Bard consequence tracking
        availableOpportunities: [], // Special opportunities unlocked by events
        bardNotifications: [], // Positive story material and achievements
        bardWarnings: [], // Warnings about potential negative consequences
        pendingEventNotifications: [], // Notifications to show player about event impacts
        // --- Bard Storytelling Stats ---
        bardStats: {
            real: 1,
            rumor: 1,
            madeUp: 1
        }
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
                <p>Earn <strong>${gameState.retirementGoal.toLocaleString()} gold</strong> to retire comfortably! Each night costs ${gameState.innCostPerNight} gold for lodging (varies by town), and poor reputation can get you chased out of town.</p>
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

function selectChoice(act, theme, type) {
    // Store the selected choice
    gameState.storyChoices[act] = { theme, type };
    
    // For Act 1, store the story characters to be used consistently across all acts
    if (act === 'act1') {
        const choiceKey = `${theme}-${type}`;
        gameState.storyCharacters = gameState.act1ChoiceData[choiceKey];
    }
    
    // Update the selected choice display
    const selectedDiv = document.getElementById(`${act}-selected`);
    const choiceText = act === 'act1' ? 
        storyTemplates.act1[theme][type] :
        (act === 'act2' ? 
            generateAct2Text(gameState.storyChoices.act1, theme, type, getStoryCharacters()) :
            generateAct3Text(gameState.storyChoices.act1, gameState.storyChoices.act2, theme, type, getStoryCharacters())
        );
    
    selectedDiv.innerHTML = `
        <div class="choice-text">Selected: ${choiceText}</div>
        <div class="choice-source">Theme: ${theme}, Style: ${type}</div>
    `;
    
    // Mark all choices in this act as unselected, then mark the clicked one as selected
    const allChoices = document.querySelectorAll(`#${act}-choices .choice`);
    allChoices.forEach(choice => choice.classList.remove('selected'));
    
    // Find and mark the selected choice
    allChoices.forEach(choice => {
        const choiceTextElement = choice.querySelector('.choice-text');
        if (choiceTextElement && choiceTextElement.textContent === choiceText) {
            choice.classList.add('selected');
        }
    });
    
    // Generate next act choices if needed
    if (act === 'act1') {
        generateAct2Choices();
    } else if (act === 'act2') {
        generateAct3Choices();
    }
    
    // Update story preview and tell story button
    updateStoryPreview();
    updateTellStoryButton();
}

// Selection functions for the new story creation system
function selectCharacter(role, character) {
    if (!gameState.storyChoices.characters) {
        gameState.storyChoices.characters = {};
    }
    
    if (role === 'supporting') {
        if (!gameState.storyChoices.characters.supporting) {
            gameState.storyChoices.characters.supporting = [];
        }
        if (gameState.storyChoices.characters.supporting.length < 2) {
            gameState.storyChoices.characters.supporting.push(character);
        }
    } else {
        gameState.storyChoices.characters[role] = character;
    }
    
    // Regenerate the character selection UI to update available choices
    generateCharacterSelectionChoices();
    updateStoryPreview();
    updateTellStoryButton();
    
    // Check if we should progress to Phase 2
    checkPhaseProgression();
}

function displaySelectedCharacters() {
    const act1Choices = document.getElementById('act1-choices');
    const selected = gameState.storyChoices.characters || {};
    
    // Remove existing selected characters display
    const existingDisplay = act1Choices.querySelector('.selected-characters-display');
    if (existingDisplay) {
        existingDisplay.remove();
    }
    
    // Create new selected characters display
    const selectedDisplay = document.createElement('div');
    selectedDisplay.className = 'selected-characters-display';
    selectedDisplay.style.cssText = 'margin-top: 20px; padding: 15px; background: rgba(255, 215, 0, 0.1); border: 2px solid #daa520; border-radius: 8px;';
    
    let displayText = '<h4 style="color: #daa520; margin-bottom: 10px;">Selected Cast (click to remove):</h4>';
    
    if (selected.protagonist) {
        displayText += `<div style="margin: 5px 0; cursor: pointer; padding: 5px; border-radius: 4px; background: rgba(255, 255, 255, 0.3);" onclick="removeCharacter('protagonist')"><strong>Protagonist:</strong> ${selected.protagonist.name} (${selected.protagonist.character.profession}) <span style="color: #ff4444;">[×]</span></div>`;
    }
    
    if (selected.antagonist) {
        displayText += `<div style="margin: 5px 0; cursor: pointer; padding: 5px; border-radius: 4px; background: rgba(255, 255, 255, 0.3);" onclick="removeCharacter('antagonist')"><strong>Antagonist:</strong> ${selected.antagonist.name} (${selected.antagonist.character.profession}) <span style="color: #ff4444;">[×]</span></div>`;
    }
    
    if (selected.supporting && selected.supporting.length > 0) {
        selected.supporting.forEach((char, index) => {
            displayText += `<div style="margin: 5px 0; cursor: pointer; padding: 5px; border-radius: 4px; background: rgba(255, 255, 255, 0.3);" onclick="removeSupportingCharacter(${index})"><strong>Supporting:</strong> ${char.name} (${char.character.profession}) <span style="color: #ff4444;">[×]</span></div>`;
        });
    }
    
    if (!selected.protagonist && !selected.antagonist && (!selected.supporting || selected.supporting.length === 0)) {
        displayText += '<div style="color: #999; font-style: italic;">No characters selected yet</div>';
    }
    
    selectedDisplay.innerHTML = displayText;
    act1Choices.appendChild(selectedDisplay);
}

function selectLocation(location) {
    gameState.storyChoices.location = location;
    
    // Update UI
    const choices = document.querySelectorAll('#act2-choices .choice');
    choices.forEach(choice => choice.classList.remove('selected'));
    
    // Find and mark the selected choice
    choices.forEach(choice => {
        const choiceText = choice.querySelector('.choice-text');
        if (choiceText && choiceText.textContent.includes(location.name)) {
            choice.classList.add('selected');
        }
    });
    
    updateStoryPreview();
    updateTellStoryButton();
    
    // Check if we should progress to Phase 3
    checkPhaseProgression();
}

function selectEvent(event) {
    gameState.storyChoices.event = event;
    
    // Update UI
    const choices = document.querySelectorAll('#act2-choices .choice');
    choices.forEach(choice => choice.classList.remove('selected'));
    
    // Find and mark the selected choice
    choices.forEach(choice => {
        const choiceText = choice.querySelector('.choice-text');
        if (choiceText && choiceText.textContent.includes(event.text)) {
            choice.classList.add('selected');
        }
    });
    
    updateStoryPreview();
    updateTellStoryButton();
    
    // Check if we should progress to Phase 4
    checkPhaseProgression();
}

function selectResolution(resolution) {
    gameState.storyChoices.resolution = resolution;
    
    // Update UI
    const choices = document.querySelectorAll('#act3-choices .choice');
    choices.forEach(choice => choice.classList.remove('selected'));
    
    // Find and mark the selected choice
    choices.forEach(choice => {
        const choiceText = choice.querySelector('.choice-text');
        if (choiceText && choiceText.textContent.includes(resolution.text)) {
            choice.classList.add('selected');
        }
    });
    
    updateStoryPreview();
    updateTellStoryButton();
}

function removeCharacter(role) {
    if (gameState.storyChoices.characters) {
        delete gameState.storyChoices.characters[role];
        
        // If we removed the protagonist, go back to Phase 1
        if (role === 'protagonist') {
            // Clear later phases
            delete gameState.storyChoices.location;
            delete gameState.storyChoices.event;
            delete gameState.storyChoices.resolution;
            generateCharacterSelectionChoices();
        } else {
            generateCharacterSelectionChoices();
        }
        
        updateStoryPreview();
        updateTellStoryButton();
    }
}

function checkPhaseProgression() {
    const story = gameState.storyChoices;
    
    // Phase 1 to Phase 2: Need protagonist
    if (!story.location && story.characters && story.characters.protagonist) {
        generateLocationSelectionChoices();
        return;
    }
    
    // Phase 2 to Phase 3: Need location
    if (!story.event && story.location) {
        generateEventSelectionChoices();
        return;
    }
    
    // Phase 3 to Phase 4: Need event
    if (!story.resolution && story.event) {
        generateResolutionSelectionChoices();
        return;
    }
}

function removeSupportingCharacter(index) {
    if (gameState.storyChoices.characters && gameState.storyChoices.characters.supporting) {
        gameState.storyChoices.characters.supporting.splice(index, 1);
        generateCharacterSelectionChoices();
        updateStoryPreview();
        updateTellStoryButton();
    }
}

function updateCharacterSelectionUI() {
    const act1Choices = document.getElementById('act1-choices');
    const selected = gameState.storyChoices.characters || {};
    
    // Clear all selections first
    const allChoices = act1Choices.querySelectorAll('.choice');
    allChoices.forEach(choice => choice.classList.remove('selected'));
    
    // Mark protagonist selection
    if (selected.protagonist) {
        const protagChoices = act1Choices.querySelectorAll('.choice');
        protagChoices.forEach(choice => {
            if (choice.textContent.includes(selected.protagonist.name)) {
                choice.classList.add('selected');
            }
        });
    }
    
    // Mark antagonist selection
    if (selected.antagonist) {
        const antagChoices = act1Choices.querySelectorAll('.choice');
        antagChoices.forEach(choice => {
            if (choice.textContent.includes(selected.antagonist.name)) {
                choice.classList.add('selected');
            }
        });
    }
    
    // Mark supporting characters selection
    if (selected.supporting) {
        const supportChoices = act1Choices.querySelectorAll('.choice');
        supportChoices.forEach(choice => {
            const isSelected = selected.supporting.some(char => choice.textContent.includes(char.name));
            if (isSelected) {
                choice.classList.add('selected');
            }
        });
    }
}

// Initialize game when page loads
window.onload = initGame; 
