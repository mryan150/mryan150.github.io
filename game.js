// Game State
let gameState = {
    gold: 500,
    day: 1,
    reputation: 'Unknown',
    retirementGoal: 10000,
    currentPhase: 'day',
    gatheredInfo: [],
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
    consequences: []
};

// Location Data
const locations = {
    tavern: {
        name: "🍺 The Jolly Merchant Tavern",
        description: "The smoky tavern is filled with the chatter of merchants and local workers. The barkeep seems to know everyone's business.",
        npcs: [
            {
                name: "Gareth the Barkeep",
                dialogue: "Welcome, traveler! I've been serving drinks here for twenty years. I hear all the town's gossip.",
                info: {
                    text: "The old mine has been sealed for five years after the accident that killed three miners",
                    type: "confirmed",
                    source: "Gareth the Barkeep"
                }
            },
            {
                name: "Merchant Tom",
                dialogue: "Business has been slow lately. Ever since the mine closed, fewer traders come through.",
                info: {
                    text: "Trade has decreased significantly since the mine closure",
                    type: "confirmed",
                    source: "Merchant Tom"
                }
            },
            {
                name: "Old Pete",
                dialogue: "That mine... there's more to that story than they tell. I heard strange sounds before the accident.",
                info: {
                    text: "Strange sounds were heard from the mine before the accident",
                    type: "rumored",
                    source: "Old Pete"
                }
            }
        ]
    },
    market: {
        name: "🏪 Market Square",
        description: "The market bustles with activity. Vendors hawk their wares while customers haggle over prices.",
        npcs: [
            {
                name: "Sarah the Baker",
                dialogue: "My bread's the best in town! Though I do worry about my son - he's been talking about treasure hunting lately.",
                info: {
                    text: "Sarah's son has been interested in treasure hunting recently",
                    type: "confirmed",
                    source: "Sarah the Baker"
                }
            },
            {
                name: "Traveling Merchant",
                dialogue: "I've been to many towns, but this one feels... different. Like it's waiting for something to happen.",
                info: {
                    text: "The town feels like it's on the verge of change",
                    type: "rumored",
                    source: "Traveling Merchant"
                }
            },
            {
                name: "Young Apprentice",
                dialogue: "Master says the mine used to make our town rich. Now we barely scrape by.",
                info: {
                    text: "The mine was the source of the town's former prosperity",
                    type: "confirmed",
                    source: "Young Apprentice"
                }
            }
        ]
    },
    mine: {
        name: "⛏️ The Old Mine",
        description: "The mine entrance is boarded up with official notices. The area feels eerily quiet.",
        npcs: [
            {
                name: "Guard Captain",
                dialogue: "Mine's been sealed by mayoral decree. Too dangerous after the cave-in. Nothing to see here.",
                info: {
                    text: "The mine was officially sealed after a cave-in",
                    type: "confirmed",
                    source: "Guard Captain"
                }
            },
            {
                name: "Miner's Widow",
                dialogue: "My husband died in that accident. But I swear I still hear his pick echoing from below sometimes...",
                info: {
                    text: "The miner's widow claims to hear sounds from the sealed mine",
                    type: "rumored",
                    source: "Miner's Widow"
                }
            }
        ]
    },
    mayor: {
        name: "🏛️ Mayor's Office",
        description: "The mayor's office is well-appointed but tense. Official documents and maps cover the walls.",
        npcs: [
            {
                name: "Mayor Harrison",
                dialogue: "The mine closure was necessary for public safety. We're working on... alternative economic opportunities.",
                info: {
                    text: "The mayor is secretive about new economic plans for the town",
                    type: "confirmed",
                    source: "Mayor Harrison"
                }
            },
            {
                name: "Town Clerk",
                dialogue: "*whispers* The mayor's been meeting with strangers from the capital. Something big is happening.",
                info: {
                    text: "The mayor has been meeting with mysterious visitors from the capital",
                    type: "rumored",
                    source: "Town Clerk"
                }
            }
        ]
    }
};

// Story Templates
const storyTemplates = {
    act1: {
        mine: {
            confirmed: "In the depths of the old mine, where three brave souls lost their lives five years ago...",
            rumored: "In the mysterious depths of the old mine, where strange sounds echo before tragedy struck...",
            madeUp: "In the ancient mine, where dragons once slept and treasures beyond imagination lie hidden..."
        },
        market: {
            confirmed: "In the bustling market square, where merchants struggle since the mine's closure...",
            rumored: "In the market square, where whispers speak of a town on the verge of transformation...",
            madeUp: "In the enchanted marketplace, where magical goods are traded under the light of the moon..."
        },
        tavern: {
            confirmed: "In the tavern where all the town's secrets are shared over ale and hardship...",
            rumored: "In the tavern where ghostly voices from the mine are said to be heard...",
            madeUp: "In the mystical tavern, where the spirits of ancient bards gather to share forgotten tales..."
        }
    },
    act2: {
        adventure: {
            confirmed: "A young person, inspired by tales of former prosperity, ventures forth to change their fate...",
            rumored: "Driven by whispers and half-truths, someone dares to investigate the mysteries surrounding them...",
            madeUp: "A hero emerges from the shadows, blessed with magical powers to overcome any obstacle..."
        },
        discovery: {
            confirmed: "Through careful investigation and honest work, the truth slowly reveals itself...",
            rumored: "Following rumors and signs, a discovery that could change everything comes to light...",
            madeUp: "In a burst of magical revelation, ancient secrets are unveiled in spectacular fashion..."
        },
        conflict: {
            confirmed: "The established order faces a real challenge as people demand change...",
            rumored: "Dark forces seem to conspire against those who seek the truth...",
            madeUp: "Epic battles rage between the forces of light and darkness..."
        }
    },
    act3: {
        triumph: {
            confirmed: "Through persistence and courage, the problem is solved and the town prospers...",
            rumored: "The mystery is solved, though new questions remain for future generations...",
            madeUp: "Good triumphs over evil, and the kingdom is saved by the power of true heroism..."
        },
        tragedy: {
            confirmed: "Despite good intentions, the harsh realities of life prevail...",
            rumored: "The truth remains elusive, leaving everyone to wonder what really happened...",
            madeUp: "In a twist of fate, the hero's greatest strength becomes their ultimate weakness..."
        },
        change: {
            confirmed: "The town adapts to new circumstances, finding strength in unity and hard work...",
            rumored: "Change comes to the town, though whether for better or worse remains to be seen...",
            madeUp: "The very fabric of reality shifts, transforming the world in wondrous ways..."
        }
    }
};

// Initialize Game
function initGame() {
    updateUI();
    generateRetirementGoal();
}

function generateRetirementGoal() {
    gameState.retirementGoal = Math.floor(Math.random() * 7000) + 8000;
    document.querySelector('.objective').innerHTML = `<strong>Objective:</strong> Earn ${gameState.retirementGoal} gold to retire in comfort!`;
}

function updateUI() {
    document.getElementById('gold').textContent = gameState.gold;
    document.getElementById('reputation').textContent = gameState.reputation;
    document.getElementById('day').textContent = gameState.day;
    
    const conversationsRemaining = gameState.maxConversationsPerDay - gameState.conversationsUsed;
    document.getElementById('conversations').textContent = `${conversationsRemaining}/${gameState.maxConversationsPerDay}`;
    
    // Update information list
    const infoList = document.getElementById('information-list');
    infoList.innerHTML = '';
    
    if (gameState.gatheredInfo.length === 0) {
        infoList.innerHTML = '<p style="color: #ccc; font-style: italic;">No information gathered yet. Visit locations to learn about the town.</p>';
    } else {
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

function visitLocation(locationKey) {
    const location = locations[locationKey];
    const modal = document.getElementById('location-modal');
    const title = document.getElementById('location-title');
    const content = document.getElementById('location-content');
    
    title.textContent = location.name;
    
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
    
    content.innerHTML = contentHTML;
    modal.classList.remove('hidden');
}

function talkToNPC(locationKey, npcIndex) {
    const location = locations[locationKey];
    const npc = location.npcs[npcIndex];
    
    // Check if we can still talk (shouldn't happen due to UI, but safety check)
    if (gameState.conversationsUsed >= gameState.maxConversationsPerDay || gameState.talkedToToday.includes(npc.name)) {
        return;
    }
    
    // Add info to gathered information
    gameState.gatheredInfo.push(npc.info);
    
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
    
    // Show feedback
    const content = document.getElementById('location-content');
    content.innerHTML += `
        <div style="margin-top: 20px; padding: 15px; background: rgba(34, 139, 34, 0.3); border-radius: 8px; border-left: 4px solid #32cd32;">
            <strong>Information Gained:</strong><br>
            ${npc.info.text}<br>
            <em>Reliability: ${npc.info.type.toUpperCase()}</em>
        </div>
    `;
}

function closeModal() {
    document.getElementById('location-modal').classList.add('hidden');
}

function startEvening() {
    document.getElementById('day-phase').classList.add('hidden');
    document.getElementById('evening-phase').classList.remove('hidden');
    gameState.currentPhase = 'evening';
    
    generateStoryChoices();
}

function generateStoryChoices() {
    generateAct1Choices();
}

function generateAct1Choices() {
    const choices = document.getElementById('act1-choices');
    choices.innerHTML = '';
    
    // Generate choices based on gathered information
    const themes = ['mine', 'market', 'tavern'];
    
    themes.forEach(theme => {
        const relevantInfo = gameState.gatheredInfo.filter(info => 
            info.source.toLowerCase().includes(theme) || 
            info.text.toLowerCase().includes(theme)
        );
        
        ['confirmed', 'rumored', 'madeUp'].forEach(type => {
            const choice = document.createElement('div');
            choice.className = 'choice';
            choice.onclick = () => selectChoice('act1', theme, type);
            
            const hasInfo = type === 'madeUp' || relevantInfo.some(info => info.type === type);
            const choiceText = storyTemplates.act1[theme][type];
            
            choice.innerHTML = `
                <div class="choice-text">${choiceText}</div>
                <div class="choice-source">Based on: ${hasInfo ? 
                    (type === 'madeUp' ? 'Your imagination' : `${type} information`) : 
                    'No information available'}</div>
            `;
            
            choices.appendChild(choice);
        });
    });
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
    
    // Update selected choice display
    const selectedDiv = document.getElementById(`${act}-selected`);
    selectedDiv.innerHTML = `<strong>Selected:</strong> ${storyTemplates[act][theme][type]}`;
    
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
    
    const themes = ['adventure', 'discovery', 'conflict'];
    
    themes.forEach(theme => {
        ['confirmed', 'rumored', 'madeUp'].forEach(type => {
            const choice = document.createElement('div');
            choice.className = 'choice';
            choice.onclick = () => selectChoice('act2', theme, type);
            
            const choiceText = storyTemplates.act2[theme][type];
            
            choice.innerHTML = `
                <div class="choice-text">${choiceText}</div>
                <div class="choice-source">Style: ${type === 'madeUp' ? 'Fantasy' : (type === 'confirmed' ? 'Realistic' : 'Mysterious')}</div>
            `;
            
            choices.appendChild(choice);
        });
    });
}

function generateAct3Choices() {
    const choices = document.getElementById('act3-choices');
    choices.innerHTML = '';
    
    const themes = ['triumph', 'tragedy', 'change'];
    
    themes.forEach(theme => {
        ['confirmed', 'rumored', 'madeUp'].forEach(type => {
            const choice = document.createElement('div');
            choice.className = 'choice';
            choice.onclick = () => selectChoice('act3', theme, type);
            
            const choiceText = storyTemplates.act3[theme][type];
            
            choice.innerHTML = `
                <div class="choice-text">${choiceText}</div>
                <div class="choice-source">Tone: ${type === 'madeUp' ? 'Fantastical' : (type === 'confirmed' ? 'Grounded' : 'Ambiguous')}</div>
            `;
            
            choices.appendChild(choice);
        });
    });
}

function updateStoryPreview() {
    const preview = document.getElementById('story-preview-text');
    let storyText = '';
    
    if (gameState.storyChoices.act1) {
        const { theme, type } = gameState.storyChoices.act1;
        storyText += storyTemplates.act1[theme][type] + '<br><br>';
    }
    
    if (gameState.storyChoices.act2) {
        const { theme, type } = gameState.storyChoices.act2;
        storyText += storyTemplates.act2[theme][type] + '<br><br>';
    }
    
    if (gameState.storyChoices.act3) {
        const { theme, type } = gameState.storyChoices.act3;
        storyText += storyTemplates.act3[theme][type];
    }
    
    preview.innerHTML = storyText || 'Select your story choices to see the preview...';
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
    const performanceEarnings = earnings['Base Performance Fee'] + earnings['Audience Tips'];
    gameState.gold += performanceEarnings;
    
    // Generate consequences
    const consequences = generateConsequences(storyEffectiveness);
    consequencesDiv.innerHTML = consequences.map(consequence => 
        `<div class="reaction-item">${consequence}</div>`
    ).join('');
    
    // Update reputation
    updateReputation(storyEffectiveness);
    
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
    
    // Random factor
    effectiveness += Math.floor(Math.random() * 20) - 10;
    
    return Math.max(0, Math.min(100, effectiveness));
}

function generateAudienceReactions(effectiveness) {
    const reactions = [];
    
    if (effectiveness >= 80) {
        reactions.push({ type: 'positive', text: 'The crowd erupts in applause! "What a tale!" someone shouts.' });
        reactions.push({ type: 'positive', text: 'You notice several people wiping away tears of joy.' });
    } else if (effectiveness >= 60) {
        reactions.push({ type: 'positive', text: 'The audience listens intently, nodding at key moments.' });
        reactions.push({ type: 'neutral', text: 'A few people whisper to their neighbors about your story.' });
    } else if (effectiveness >= 40) {
        reactions.push({ type: 'neutral', text: 'The crowd seems mildly entertained but not deeply moved.' });
        reactions.push({ type: 'neutral', text: 'Some people look skeptical about parts of your tale.' });
    } else {
        reactions.push({ type: 'negative', text: 'Several people in the audience look bored or confused.' });
        reactions.push({ type: 'negative', text: 'Someone in the back calls out "I\'ve heard better stories from my grandmother!"' });
    }
    
    return reactions;
}

function calculateEarnings(effectiveness) {
    const basePerformanceFee = 20;
    const tipMultiplier = effectiveness / 100;
    const tips = Math.floor(Math.random() * 30 * tipMultiplier);
    
    const earnings = {
        'Base Performance Fee': basePerformanceFee,
        'Audience Tips': tips,
        'Inn Cost (next night)': -gameState.innCostPerNight,
        'Net Earnings': basePerformanceFee + tips - gameState.innCostPerNight
    };
    
    return earnings;
}

function generateConsequences(effectiveness) {
    const consequences = [];
    const { act1, act2, act3 } = gameState.storyChoices;
    
    // Generate consequences based on story themes and effectiveness
    if (act1.theme === 'mine' && effectiveness >= 60) {
        consequences.push('Young people in the audience exchange excited glances - your tale has sparked their imagination about the old mine.');
    }
    
    if (act3.theme === 'triumph' && effectiveness >= 70) {
        consequences.push('The tavern keeper nods approvingly - your inspiring tale has lifted the spirits of the townspeople.');
    }
    
    if (act2.theme === 'discovery' && effectiveness >= 50) {
        consequences.push('Several townspeople seem to be making mental notes - your story has given them ideas.');
    }
    
    if (effectiveness < 40) {
        consequences.push('The crowd disperses quickly - your lackluster performance won\'t be remembered fondly.');
    }
    
    if (consequences.length === 0) {
        consequences.push('Your story entertains the crowd but doesn\'t seem to have any lasting impact.');
    }
    
    return consequences;
}

function updateReputation(effectiveness) {
    const reputationLevels = ['Terrible', 'Poor', 'Unknown', 'Decent', 'Good', 'Great', 'Legendary'];
    let currentIndex = reputationLevels.indexOf(gameState.reputation);
    
    if (effectiveness >= 80) {
        currentIndex = Math.min(currentIndex + 1, reputationLevels.length - 1);
    } else if (effectiveness < 30) {
        currentIndex = Math.max(currentIndex - 1, 0);
    }
    
    gameState.reputation = reputationLevels[currentIndex];
}

function nextDay() {
    // Deduct inn cost
    gameState.gold -= gameState.innCostPerNight;
    
    // Check for bankruptcy
    if (gameState.gold < 0) {
        showGameOverScreen();
        return;
    }
    
    gameState.day++;
    gameState.currentPhase = 'day';
    gameState.gatheredInfo = [];
    gameState.visitedLocations = [];
    gameState.conversationsUsed = 0;
    gameState.talkedToToday = [];
    gameState.storyChoices = { act1: null, act2: null, act3: null };
    
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

function showGameOverScreen() {
    document.querySelector('.game-main').innerHTML = `
        <div class="text-center">
            <h2 style="color: #dc143c; font-size: 2.5em; margin-bottom: 20px;">💸 Game Over 💸</h2>
            <p style="font-size: 1.2em; margin-bottom: 20px;">You've run out of gold and can no longer afford lodging!</p>
            <p style="margin-bottom: 20px;">You survived <strong>${gameState.day} days</strong> as a traveling bard.</p>
            <p style="margin-bottom: 20px;">Your final reputation: <strong>${gameState.reputation}</strong></p>
            <p style="margin-bottom: 30px; font-style: italic;">"A bard without coin is just a wanderer with stories..."</p>
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
        restBtn.innerHTML = '💸 Rest for the Night (5 gold) - WARNING: Can\'t Afford!';
    } else if (goldAfterInn < gameState.innCostPerNight * 3) {
        // Player is running low on gold (less than 3 nights remaining)
        restBtn.style.background = 'linear-gradient(45deg, #FF4500 0%, #FF6347 100%)';
        restBtn.innerHTML = `🌅 Rest for the Night (5 gold) - Low Gold Warning!`;
    } else {
        // Normal state
        restBtn.style.background = 'linear-gradient(45deg, #8b4513 0%, #a0522d 100%)';
        restBtn.innerHTML = '🌅 Rest for the Night (5 gold)';
    }
}

function resetGame() {
    gameState = {
        gold: 500,
        day: 1,
        reputation: 'Unknown',
        retirementGoal: 10000,
        currentPhase: 'day',
        gatheredInfo: [],
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
        consequences: []
    };
    
    // Reset HTML
    location.reload();
}

// Initialize game when page loads
window.onload = initGame; 