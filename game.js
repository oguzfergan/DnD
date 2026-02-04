// Character Class Definitions
const characterClasses = {
    fighter: {
        name: "Fighter",
        description: "A master of weapons and armor, skilled in combat.",
        startingStats: { strength: 16, dexterity: 13, constitution: 15, intelligence: 10, wisdom: 12, charisma: 11 },
        hitDie: 10,
        startingGold: 50
    },
    rogue: {
        name: "Rogue",
        description: "Stealthy and skilled with daggers, locks, and traps.",
        startingStats: { strength: 11, dexterity: 16, constitution: 13, intelligence: 13, wisdom: 12, charisma: 12 },
        hitDie: 8,
        startingGold: 60
    },
    wizard: {
        name: "Wizard",
        description: "A master of arcane magic and ancient knowledge.",
        startingStats: { strength: 10, dexterity: 13, constitution: 12, intelligence: 16, wisdom: 13, charisma: 11 },
        hitDie: 6,
        startingGold: 40
    },
    cleric: {
        name: "Cleric",
        description: "A divine healer and protector, channeling holy power.",
        startingStats: { strength: 12, dexterity: 11, constitution: 13, intelligence: 11, wisdom: 16, charisma: 13 },
        hitDie: 8,
        startingGold: 50
    },
    ranger: {
        name: "Ranger",
        description: "An expert tracker and archer, at home in the wilderness.",
        startingStats: { strength: 13, dexterity: 15, constitution: 13, intelligence: 12, wisdom: 15, charisma: 10 },
        hitDie: 10,
        startingGold: 55
    },
    paladin: {
        name: "Paladin",
        description: "A holy warrior of justice, combining martial prowess with divine magic.",
        startingStats: { strength: 15, dexterity: 11, constitution: 14, intelligence: 10, wisdom: 12, charisma: 15 },
        hitDie: 10,
        startingGold: 50
    },
    barbarian: {
        name: "Barbarian",
        description: "A fierce warrior of the wilds, driven by primal rage.",
        startingStats: { strength: 16, dexterity: 13, constitution: 16, intelligence: 9, wisdom: 12, charisma: 10 },
        hitDie: 12,
        startingGold: 45
    },
    bard: {
        name: "Bard",
        description: "A charismatic performer and spellcaster, inspiring allies with music and magic.",
        startingStats: { strength: 11, dexterity: 14, constitution: 12, intelligence: 12, wisdom: 11, charisma: 16 },
        hitDie: 8,
        startingGold: 60
    },
    monk: {
        name: "Monk",
        description: "A disciplined martial artist, channeling inner energy.",
        startingStats: { strength: 13, dexterity: 16, constitution: 14, intelligence: 11, wisdom: 15, charisma: 10 },
        hitDie: 8,
        startingGold: 40
    },
    warlock: {
        name: "Warlock",
        description: "A pact-bound spellcaster, wielding eldritch power.",
        startingStats: { strength: 10, dexterity: 13, constitution: 13, intelligence: 13, wisdom: 11, charisma: 16 },
        hitDie: 8,
        startingGold: 45
    }
};

// Game State
let gameState = {
    character: {
        name: "",
        level: 1,
        exp: 0,
        expToNext: 100,
        health: 100,
        maxHealth: 100,
        gold: 50,
        class: "",
        classDisplayName: "",
        appearance: "",
        backstory: "",
        // D&D Stats (1-20, average 10)
        stats: {
            strength: 12,      // Physical power, melee attacks
            dexterity: 14,     // Agility, ranged attacks, dodge
            constitution: 13,  // Endurance, health, resistance
            intelligence: 11,   // Knowledge, magic, investigation
            wisdom: 12,        // Perception, insight, survival
            charisma: 13       // Social skills, intimidation, persuasion
        },
        // Skill modifiers (calculated from stats)
        skills: {
            bartering: 0,      // Based on charisma
            intimidation: 0,   // Based on charisma
            persuasion: 0,    // Based on charisma
            athletics: 0,     // Based on strength
            acrobatics: 0,    // Based on dexterity
            stealth: 0,       // Based on dexterity
            investigation: 0, // Based on intelligence
            perception: 0,    // Based on wisdom
            survival: 0       // Based on wisdom
        }
    },
    combat: null, // Active combat state
    inventory: [],
    party: [],
    quests: {
        active: [],
        completed: [],
        rumors: []
    },
    npcs: {},
    locations: {},
    currentLocation: "tavern",
    diceRollHistory: [] // Track recent dice rolls
};

// Dice Rolling System
const DiceSystem = {
    // Roll a die (e.g., rollDie(20) = 1d20)
    rollDie(sides) {
        return Math.floor(Math.random() * sides) + 1;
    },
    
    // Roll multiple dice (e.g., rollDice(2, 6) = 2d6)
    rollDice(count, sides) {
        let total = 0;
        const rolls = [];
        for (let i = 0; i < count; i++) {
            const roll = this.rollDie(sides);
            rolls.push(roll);
            total += roll;
        }
        return { total, rolls };
    },
    
    // Roll with modifier (e.g., 1d20 + 3)
    rollWithModifier(dieType, modifier) {
        const roll = this.rollDie(dieType);
        const total = roll + modifier;
        return { roll, modifier, total };
    },
    
    // Skill check: roll 1d20 + modifier vs difficulty
    skillCheck(modifier, difficulty) {
        const result = this.rollWithModifier(20, modifier);
        const success = result.total >= difficulty;
        return {
            ...result,
            difficulty,
            success,
            margin: success ? result.total - difficulty : difficulty - result.total
        };
    },
    
    // Attack roll: 1d20 + attack modifier vs AC (Armor Class)
    attackRoll(attackModifier, armorClass) {
        return this.skillCheck(attackModifier, armorClass);
    },
    
    // Damage roll: weapon damage dice + strength modifier
    damageRoll(diceFormula, modifier = 0) {
        // diceFormula format: "2d6" or "1d8"
        const match = diceFormula.match(/(\d+)d(\d+)/);
        if (!match) return { total: 0, rolls: [], modifier: 0 };
        
        const count = parseInt(match[1]);
        const sides = parseInt(match[2]);
        const diceResult = this.rollDice(count, sides);
        const total = diceResult.total + modifier;
        
        return {
            ...diceResult,
            modifier,
            total,
            formula: diceFormula
        };
    },
    
    // Save roll result to history
    saveRoll(type, result) {
        gameState.diceRollHistory.unshift({
            type,
            result,
            timestamp: Date.now()
        });
        // Keep last 20 rolls
        if (gameState.diceRollHistory.length > 20) {
            gameState.diceRollHistory.pop();
        }
    }
};

// Calculate skill modifiers from stats (D&D style: (stat - 10) / 2, rounded down)
function calculateModifier(statValue) {
    return Math.floor((statValue - 10) / 2);
}

// Update skill modifiers based on stats
function updateSkillModifiers() {
    const stats = gameState.character.stats;
    gameState.character.skills = {
        bartering: calculateModifier(stats.charisma),
        intimidation: calculateModifier(stats.charisma),
        persuasion: calculateModifier(stats.charisma),
        athletics: calculateModifier(stats.strength),
        acrobatics: calculateModifier(stats.dexterity),
        stealth: calculateModifier(stats.dexterity),
        investigation: calculateModifier(stats.intelligence),
        perception: calculateModifier(stats.wisdom),
        survival: calculateModifier(stats.wisdom)
    };
}

// NPC Database
const npcDatabase = {
    greg: {
        id: "greg",
        name: "Old Greg",
        type: "tavernkeeper",
        location: "tavern",
        relationship: 50,
        dialogue: "Welcome to my tavern, traveler! Rest your weary bones and listen to the tales of adventurers.",
        inventory: [],
        services: ["rest", "gossip", "recruit"]
    },
    merchant: {
        id: "merchant",
        name: "Merchant Tom",
        type: "merchant",
        location: "market",
        relationship: 30,
        dialogue: "Fine wares for fine adventurers! What can I interest you in today?",
        inventory: [
            { id: "sword", name: "Iron Sword", price: 50, type: "weapon" },
            { id: "shield", name: "Wooden Shield", price: 30, type: "armor" },
            { id: "potion", name: "Health Potion", price: 15, type: "consumable" },
            { id: "rope", name: "Rope", price: 5, type: "tool" }
        ]
    },
    guard: {
        id: "guard",
        name: "Guard Captain",
        type: "guard",
        location: "town",
        relationship: 40,
        dialogue: "Keep the peace, traveler. We've had trouble with bandits lately.",
        quests: ["bandit_quest"]
    },
    mage: {
        id: "mage",
        name: "Wise Mage",
        type: "mage",
        location: "tower",
        relationship: 20,
        dialogue: "Ancient knowledge flows through these halls. Perhaps you seek wisdom?",
        inventory: [
            { id: "scroll", name: "Magic Scroll", price: 100, type: "consumable" }
        ],
        quests: ["tower_quest"]
    },
    rogue: {
        id: "rogue",
        name: "Shadow",
        type: "companion",
        location: "tavern",
        relationship: 0,
        dialogue: "I work alone... usually. But I might be persuaded to join you for the right price.",
        canRecruit: true,
        recruitCost: 100,
        stats: { health: 60, maxHealth: 60, level: 1 }
    },
    warrior: {
        id: "warrior",
        name: "Braveheart",
        type: "companion",
        location: "tavern",
        relationship: 0,
        dialogue: "I seek glory in battle! Will you join me on adventures?",
        canRecruit: true,
        recruitCost: 150,
        stats: { health: 100, maxHealth: 100, level: 1 }
    }
};

// Quest Database
const questDatabase = {
    bandit_quest: {
        id: "bandit_quest",
        title: "Bandit Problem",
        description: "Bandits have been terrorizing the trade routes. The Guard Captain needs help.",
        giver: "guard",
        type: "kill",
        target: "bandits",
        targetCount: 3,
        currentCount: 0,
        reward: { gold: 100, exp: 50 },
        status: "rumor"
    },
    tower_quest: {
        id: "tower_quest",
        title: "Ancient Tower",
        description: "The Wise Mage needs someone to investigate strange noises in the old tower.",
        giver: "mage",
        type: "explore",
        target: "tower",
        reward: { gold: 75, exp: 40, item: "scroll" },
        status: "rumor"
    },
    merchant_quest: {
        id: "merchant_quest",
        title: "Missing Supplies",
        description: "Merchant Tom's supply cart was ambushed. He needs help recovering his goods.",
        giver: "merchant",
        type: "retrieve",
        target: "supplies",
        reward: { gold: 60, exp: 30 },
        status: "rumor"
    }
};

// Item Database
const itemDatabase = {
    sword: { id: "sword", name: "Iron Sword", type: "weapon", value: 50 },
    shield: { id: "shield", name: "Wooden Shield", type: "armor", value: 30 },
    potion: { id: "potion", name: "Health Potion", type: "consumable", value: 15, effect: { health: 50 } },
    rope: { id: "rope", name: "Rope", type: "tool", value: 5 },
    scroll: { id: "scroll", name: "Magic Scroll", type: "consumable", value: 100 }
};

// Location Database
const locationDatabase = {
    tavern: {
        name: "The Tavern",
        description: "A cozy tavern filled with adventurers and travelers. The perfect place to rest and gather information.",
        actions: ["rest", "gossip", "recruit", "talk"]
    },
    market: {
        name: "Market Square",
        description: "A bustling marketplace where merchants sell their wares.",
        actions: ["shop", "talk"]
    },
    town: {
        name: "Town Square",
        description: "The heart of the town. Guards patrol here, keeping watch for trouble.",
        actions: ["talk", "explore"]
    },
    tower: {
        name: "Ancient Tower",
        description: "An old tower that stands tall against the sky. Strange sounds echo from within.",
        actions: ["explore", "investigate"]
    },
    forest: {
        name: "Dark Forest",
        description: "A dense forest where bandits are known to hide. Danger lurks in the shadows.",
        actions: ["explore", "hunt"]
    }
};

// Initialize Game
function initGame() {
    loadGame();
    setupEventListeners();
    
    // Check if character is created
    if (!gameState.character.name || !gameState.character.class) {
        showCharacterCreation();
    } else {
        updateUI();
        generateRumors();
    }
}

// Show Character Creation Screen
function showCharacterCreation() {
    const modal = document.getElementById('characterCreationModal');
    if (modal) {
        modal.style.display = 'block';
    }
    
    // Update class description when selected
    const classSelect = document.getElementById('charClass');
    const classDesc = document.getElementById('classDescription');
    
    if (classSelect && classDesc) {
        classSelect.addEventListener('change', (e) => {
            const selectedClass = e.target.value;
            if (selectedClass && characterClasses[selectedClass]) {
                classDesc.textContent = characterClasses[selectedClass].description;
                classDesc.style.display = 'block';
            } else {
                classDesc.style.display = 'none';
            }
        });
    }
}

// Setup Event Listeners
function setupEventListeners() {
    // Tab switching
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const tabName = e.target.dataset.tab;
            switchTab(tabName);
        });
    });

    // Header buttons
    document.getElementById('saveBtn').addEventListener('click', saveGame);
    document.getElementById('loadBtn').addEventListener('click', loadGame);
    document.getElementById('newGameBtn').addEventListener('click', newGame);

    // Tavern actions
    document.getElementById('restBtn').addEventListener('click', rest);
    document.getElementById('gossipBtn').addEventListener('click', listenToGossip);
    document.getElementById('recruitBtn').addEventListener('click', lookForCompanions);

    // Modal close buttons
    document.getElementById('closeModal').addEventListener('click', () => {
        document.getElementById('npcModal').style.display = 'none';
    });
    document.getElementById('closeQuestModal').addEventListener('click', () => {
        document.getElementById('questModal').style.display = 'none';
    });

    // Click outside modal to close
    window.addEventListener('click', (e) => {
        const npcModal = document.getElementById('npcModal');
        const questModal = document.getElementById('questModal');
        const aiConfigModal = document.getElementById('aiConfigModal');
        if (e.target === npcModal) npcModal.style.display = 'none';
        if (e.target === questModal) questModal.style.display = 'none';
        if (e.target === aiConfigModal) aiConfigModal.style.display = 'none';
    });

    // Chat functionality - main gameplay interface
    const chatInput = document.getElementById('chatInput');
    const chatSendBtn = document.getElementById('chatSendBtn');

    if (chatInput) {
        chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendChatMessage();
            }
        });
        // Focus on input when page loads
        setTimeout(() => chatInput.focus(), 100);
    }

    if (chatSendBtn) {
        chatSendBtn.addEventListener('click', sendChatMessage);
    }
    
    // Character creation
    const createCharacterBtn = document.getElementById('createCharacterBtn');
    if (createCharacterBtn) {
        createCharacterBtn.addEventListener('click', createCharacter);
    }
}

// Create Character
function createCharacter() {
    const name = document.getElementById('charNameInput').value.trim();
    const charClass = document.getElementById('charClass').value;
    const appearance = document.getElementById('charAppearance').value.trim();
    const backstory = document.getElementById('charBackstory').value.trim();
    
    // Validation
    if (!name) {
        alert('Please enter a character name.');
        return;
    }
    
    if (!charClass) {
        alert('Please select a class.');
        return;
    }
    
    if (!appearance) {
        alert('Please describe your character\'s appearance.');
        return;
    }
    
    if (!backstory) {
        alert('Please write your character\'s backstory.');
        return;
    }
    
    // Get class data
    const classData = characterClasses[charClass];
    if (!classData) {
        alert('Invalid class selected.');
        return;
    }
    
    // Calculate starting health (hit die + CON modifier)
    const conMod = calculateModifier(classData.startingStats.constitution);
    const startingHealth = classData.hitDie + conMod;
    
    // Create character
    gameState.character = {
        name: name,
        class: charClass,
        classDisplayName: classData.name,
        appearance: appearance,
        backstory: backstory,
        level: 1,
        exp: 0,
        expToNext: 100,
        health: startingHealth,
        maxHealth: startingHealth,
        gold: classData.startingGold,
        stats: { ...classData.startingStats },
        skills: {
            bartering: 0,
            intimidation: 0,
            persuasion: 0,
            athletics: 0,
            acrobatics: 0,
            stealth: 0,
            investigation: 0,
            perception: 0,
            survival: 0
        }
    };
    
    // Close modal
    const modal = document.getElementById('characterCreationModal');
    if (modal) {
        modal.style.display = 'none';
    }
    
    // Initialize game
    updateUI();
    generateRumors();
    
    // Welcome message
    const welcomeMsg = `Welcome, ${name} the ${classData.name}! Your adventure begins now.`;
    addChatMessage('system', welcomeMsg);
    
    // Save game
    saveGame();
}

// Tab Switching
function switchTab(tabName) {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
    document.getElementById(`${tabName}Tab`).classList.add('active');

    // Tab switching removed - chat is now always visible
    updateQuestLogSidebar();
}

// Update UI
function updateUI() {
    const char = gameState.character;
    
    // Update skill modifiers first
    updateSkillModifiers();
    
    document.getElementById('charName').textContent = char.name;
    document.getElementById('charLevel').textContent = char.level;
    document.getElementById('charHealth').textContent = char.health;
    document.getElementById('charMaxHealth').textContent = char.maxHealth;
    document.getElementById('charGold').textContent = char.gold;
    
    // Update stats display
    updateStatsDisplay();
    
    const expPercent = (char.exp / char.expToNext) * 100;
    document.getElementById('expFill').style.width = expPercent + '%';
    document.getElementById('expText').textContent = `${char.exp} / ${char.expToNext} XP`;

    updateInventory();
    updateParty();
    updateLocation();
    updateQuestLogSidebar();
}

// Update stats display in character panel
function updateStatsDisplay() {
    if (!gameState.character.stats) return;
    
    const stats = gameState.character.stats;
    const statsContainer = document.getElementById('charStats');
    if (!statsContainer) return;
    
    const statNames = {
        strength: 'STR',
        dexterity: 'DEX',
        constitution: 'CON',
        intelligence: 'INT',
        wisdom: 'WIS',
        charisma: 'CHA'
    };
    
    statsContainer.innerHTML = Object.entries(statNames).map(([key, abbr]) => {
        const value = stats[key];
        const modifier = calculateModifier(value);
        const modDisplay = modifier >= 0 ? `+${modifier}` : `${modifier}`;
        return `
            <div class="stat-row">
                <span class="stat-name">${abbr}:</span>
                <span class="stat-value">${value}</span>
                <span class="stat-modifier">(${modDisplay})</span>
            </div>
        `;
    }).join('');
    
    // Update skill modifiers display
    const skills = gameState.character.skills;
    const intimidationEl = document.getElementById('charIntimidation');
    const persuasionEl = document.getElementById('charPersuasion');
    if (intimidationEl && skills.intimidation !== undefined) {
        const mod = skills.intimidation >= 0 ? `+${skills.intimidation}` : `${skills.intimidation}`;
        intimidationEl.textContent = mod;
    }
    if (persuasionEl && skills.persuasion !== undefined) {
        const mod = skills.persuasion >= 0 ? `+${skills.persuasion}` : `${skills.persuasion}`;
        persuasionEl.textContent = mod;
    }
}

// Update Inventory
function updateInventory() {
    const inventoryList = document.getElementById('inventoryList');
    if (gameState.inventory.length === 0) {
        inventoryList.innerHTML = '<div class="empty-inventory">Empty</div>';
        return;
    }

    inventoryList.innerHTML = gameState.inventory.map(item => {
        const itemData = itemDatabase[item.id] || item;
        return `
            <div class="inventory-item">
                <span>${itemData.name}</span>
                <span>${item.count || 1}x</span>
            </div>
        `;
    }).join('');
}

// Update Party
function updateParty() {
    const partyList = document.getElementById('partyList');
    if (gameState.party.length === 0) {
        partyList.innerHTML = '<div class="empty-party">No companions</div>';
        return;
    }

    partyList.innerHTML = gameState.party.map(member => {
        const npc = npcDatabase[member.id];
        return `
            <div class="party-member">
                <div>
                    <strong>${npc.name}</strong>
                    <div>Level ${member.level} | HP: ${member.health}/${member.maxHealth}</div>
                </div>
            </div>
        `;
    }).join('');
}

// Update Location
function updateLocation() {
    const location = locationDatabase[gameState.currentLocation];
    const locationNameEl = document.getElementById('locationName');
    const locationDescEl = document.getElementById('locationDescription');
    
    if (locationNameEl) locationNameEl.textContent = location.name;
    if (locationDescEl) locationDescEl.textContent = location.description;
}

// Update Location Actions
function updateLocationActions() {
    const location = locationDatabase[gameState.currentLocation];
    const actionsDiv = document.getElementById('locationActions');
    
    const actions = location.actions.map(action => {
        if (action === 'rest') {
            return '<button class="action-btn" onclick="rest()">Rest (Restore Health)</button>';
        } else if (action === 'shop') {
            return '<button class="action-btn" onclick="goToShop()">Visit Merchant</button>';
        } else if (action === 'talk') {
            return '<button class="action-btn" onclick="talkToNPCs()">Talk to People</button>';
        } else if (action === 'explore') {
            return '<button class="action-btn" onclick="explore()">Explore</button>';
        } else if (action === 'hunt') {
            return '<button class="action-btn" onclick="huntBandits()">Hunt Bandits</button>';
        } else if (action === 'investigate') {
            return '<button class="action-btn" onclick="investigateTower()">Investigate Tower</button>';
        }
    }).filter(Boolean);

    actionsDiv.innerHTML = actions.length > 0 ? actions.join('') : '<p>No actions available here.</p>';
}

// Update Quest Log
function updateQuestLog() {
    const questList = document.getElementById('questList');
    const rumorList = document.getElementById('rumorList');

    if (gameState.quests.active.length === 0) {
        questList.innerHTML = '<div class="empty-quests">No active quests</div>';
    } else {
        questList.innerHTML = gameState.quests.active.map(quest => {
            const questData = questDatabase[quest.id] || quest;
            const progress = questData.type === 'kill' ? 
                `${questData.currentCount}/${questData.targetCount}` : '';
            return `
                <div class="quest-item" onclick="showQuestDetails('${quest.id}')">
                    <h4>${questData.title}</h4>
                    <p>${questData.description}</p>
                    ${progress ? `<p>Progress: ${progress}</p>` : ''}
                </div>
            `;
        }).join('');
    }

    if (gameState.quests.rumors.length === 0) {
        rumorList.innerHTML = '<div class="empty-quests">No rumors heard</div>';
    } else {
        rumorList.innerHTML = gameState.quests.rumors.map(rumorId => {
            const rumor = questDatabase[rumorId];
            if (!rumor) return '';
            return `
                <div class="rumor-item" onclick="acceptQuest('${rumorId}')">
                    <h4>Rumor: ${rumor.title}</h4>
                    <p>${rumor.description}</p>
                    <p><em>Click to accept quest</em></p>
                </div>
            `;
        }).join('');
    }
}

// Update Shop
function updateShop() {
    const shopContent = document.getElementById('shopContent');
    const npcsAtLocation = Object.values(npcDatabase).filter(npc => 
        npc.location === gameState.currentLocation && npc.type === 'merchant'
    );

    if (npcsAtLocation.length === 0) {
        shopContent.innerHTML = '<p>Visit a merchant location to see their wares.</p>';
        return;
    }

    const merchant = npcsAtLocation[0];
    if (merchant.inventory.length === 0) {
        shopContent.innerHTML = '<p>This merchant has nothing to sell.</p>';
        return;
    }

    shopContent.innerHTML = `
        <h3>${merchant.name}'s Wares</h3>
        <div class="shop-items">
            ${merchant.inventory.map(item => {
                const basePrice = item.price;
                const barterBonus = gameState.character.skills.bartering;
                const finalPrice = Math.max(1, Math.floor(basePrice * (1 - barterBonus / 100)));
                return `
                    <div class="shop-item">
                        <div>
                            <strong>${item.name}</strong> - ${item.type}
                        </div>
                        <div>
                            <span>${finalPrice} gold</span>
                            <button onclick="buyItem('${merchant.id}', '${item.id}', ${finalPrice})">Buy</button>
                        </div>
                    </div>
                `;
            }).join('')}
        </div>
    `;
}

// Update Tavern
function updateTavern() {
    const tavernContent = document.getElementById('tavernContent');
    const tavernNPCs = document.getElementById('tavernNPCs');
    
    const npcsInTavern = Object.values(npcDatabase).filter(npc => 
        npc.location === 'tavern'
    );

    tavernNPCs.innerHTML = npcsInTavern.map(npc => {
        const relationship = gameState.npcs[npc.id]?.relationship || npc.relationship;
        const relPercent = Math.max(0, Math.min(100, relationship + 50));
        return `
            <div class="npc-card" data-type="${npc.type}" onclick="interactWithNPC('${npc.id}')">
                <h4>${npc.name}</h4>
                <p>${npc.dialogue}</p>
                <div class="relationship-bar">
                    <div class="relationship-fill" style="width: ${relPercent}%"></div>
                </div>
                <small>Relationship: ${relationship > 0 ? '+' : ''}${relationship}</small>
                ${AIIntegration.config.apiKey ? '<small style="color: #4a8a4a; display: block; margin-top: 5px;">💬 AI Chat Available</small>' : ''}
            </div>
        `;
    }).join('');
}

// Game Actions
function rest() {
    gameState.character.health = gameState.character.maxHealth;
    addMessage("You rest and restore your health to full.");
    updateUI();
}

function listenToGossip() {
    if (gameState.quests.rumors.length === 0) {
        generateRumors();
    }
    addMessage("You listen to the gossip in the tavern and hear some interesting rumors!");
    updateQuestLog();
    switchTab('quests');
}

function generateRumors() {
    const availableQuests = Object.keys(questDatabase).filter(questId => {
        const quest = questDatabase[questId];
        return quest.status === 'rumor' && 
               !gameState.quests.rumors.includes(questId) &&
               !gameState.quests.active.some(q => q.id === questId) &&
               !gameState.quests.completed.includes(questId);
    });

    if (availableQuests.length > 0) {
        const newRumor = availableQuests[Math.floor(Math.random() * availableQuests.length)];
        if (!gameState.quests.rumors.includes(newRumor)) {
            gameState.quests.rumors.push(newRumor);
        }
    }
}

function lookForCompanions() {
    addMessage("You look around the tavern for potential companions...");
    updateTavern();
}

// Old interactWithNPC removed - replaced with async version below

function recruitCompanion(npcId) {
    const npc = npcDatabase[npcId];
    if (!npc || !npc.canRecruit) return;
    if (gameState.party.find(m => m.id === npcId)) {
        addMessage(`${npc.name} is already in your party!`);
        return;
    }
    if (gameState.character.gold < npc.recruitCost) {
        addMessage(`You don't have enough gold to recruit ${npc.name}!`);
        return;
    }

    gameState.character.gold -= npc.recruitCost;
    gameState.party.push({
        id: npcId,
        level: npc.stats.level,
        health: npc.stats.health,
        maxHealth: npc.stats.maxHealth
    });
    addMessage(`${npc.name} has joined your party!`);
    updateUI();
    document.getElementById('npcModal').style.display = 'none';
}

function acceptQuest(questId) {
    const quest = questDatabase[questId];
    if (!quest) return;

    if (gameState.quests.active.find(q => q.id === questId)) {
        addMessage("You already have this quest!");
        return;
    }

    gameState.quests.active.push({ ...quest, currentCount: 0 });
    gameState.quests.rumors = gameState.quests.rumors.filter(id => id !== questId);
    
    const npc = npcDatabase[quest.giver];
    if (npc && gameState.npcs[npc.id]) {
        gameState.npcs[npc.id].relationship += 5;
    }

    addMessage(`Quest accepted: ${quest.title}`);
    updateQuestLog();
    document.getElementById('questModal').style.display = 'none';
    document.getElementById('npcModal').style.display = 'none';
}

function showQuestDetails(questId) {
    const quest = gameState.quests.active.find(q => q.id === questId);
    if (!quest) return;

    const modal = document.getElementById('questModal');
    const modalContent = document.getElementById('questModalContent');
    
    const progress = quest.type === 'kill' ? 
        `Progress: ${quest.currentCount}/${quest.targetCount}` : 
        'In progress...';

    modalContent.innerHTML = `
        <h2>${quest.title}</h2>
        <p>${quest.description}</p>
        <p><strong>${progress}</strong></p>
        <p><strong>Reward:</strong> ${quest.reward.gold} gold, ${quest.reward.exp} XP</p>
        ${quest.type === 'kill' ? `<button class="action-btn" onclick="huntBandits(); document.getElementById('questModal').style.display='none';">Go Hunt</button>` : ''}
        ${quest.type === 'explore' ? `<button class="action-btn" onclick="investigateTower(); document.getElementById('questModal').style.display='none';">Investigate</button>` : ''}
    `;
    modal.style.display = 'block';
}

function buyItem(merchantId, itemId, price) {
    if (gameState.character.gold < price) {
        addMessage("You don't have enough gold!");
        return;
    }

    const merchant = npcDatabase[merchantId];
    const item = merchant.inventory.find(i => i.id === itemId);
    if (!item) return;

    gameState.character.gold -= price;
    
    const existingItem = gameState.inventory.find(i => i.id === itemId);
    if (existingItem) {
        existingItem.count = (existingItem.count || 1) + 1;
    } else {
        gameState.inventory.push({ id: itemId, count: 1 });
    }

    if (gameState.npcs[merchantId]) {
        gameState.npcs[merchantId].relationship += 2;
    }

    addMessage(`You bought ${item.name} for ${price} gold.`);
    updateUI();
    updateShop();
}

function goToShop() {
    gameState.currentLocation = 'market';
    updateLocation();
    switchTab('shop');
    updateShop();
}

function talkToNPCs() {
    const npcsAtLocation = Object.values(npcDatabase).filter(npc => 
        npc.location === gameState.currentLocation
    );

    if (npcsAtLocation.length === 0) {
        addMessage("There's no one to talk to here.");
        return;
    }

    if (npcsAtLocation.length === 1) {
        interactWithNPC(npcsAtLocation[0].id);
    } else {
        // Show list of NPCs
        addMessage("You see several people here. Click on them to talk.");
    }
}

function explore() {
    addMessage("You explore the area but find nothing of interest.");
}

function huntBandits() {
    const banditQuest = gameState.quests.active.find(q => q.id === 'bandit_quest');
    
    if (!banditQuest) {
        addMessage("You wander into the forest but see no bandits. Perhaps you should accept a quest first?");
        return;
    }

    gameState.currentLocation = 'forest';
    updateLocation();

    const banditsKilled = Math.floor(Math.random() * 3) + 1;
    banditQuest.currentCount = Math.min(banditQuest.currentCount + banditsKilled, banditQuest.targetCount);
    
    addMessage(`You encountered and defeated ${banditsKilled} bandit(s)!`);

    if (banditQuest.currentCount >= banditQuest.targetCount) {
        completeQuest('bandit_quest');
    } else {
        addMessage(`Quest progress: ${banditQuest.currentCount}/${banditQuest.targetCount} bandits defeated.`);
    }

    updateQuestLog();
}

function investigateTower() {
    const towerQuest = gameState.quests.active.find(q => q.id === 'tower_quest');
    
    if (!towerQuest) {
        addMessage("You approach the tower but feel it's not the right time. Perhaps you should accept a quest first?");
        return;
    }

    gameState.currentLocation = 'tower';
    updateLocation();
    addMessage("You investigate the tower and discover the source of the strange noises!");
    completeQuest('tower_quest');
}

function completeQuest(questId) {
    const quest = gameState.quests.active.find(q => q.id === questId);
    if (!quest) return;

    gameState.character.gold += quest.reward.gold;
    gameState.character.exp += quest.reward.exp;

    if (quest.reward.item) {
        const existingItem = gameState.inventory.find(i => i.id === quest.reward.item);
        if (existingItem) {
            existingItem.count = (existingItem.count || 1) + 1;
        } else {
            gameState.inventory.push({ id: quest.reward.item, count: 1 });
        }
    }

    gameState.quests.active = gameState.quests.active.filter(q => q.id !== questId);
    gameState.quests.completed.push(questId);

    const npc = npcDatabase[quest.giver];
    if (npc && gameState.npcs[npc.id]) {
        gameState.npcs[npc.id].relationship += 10;
    }

    addMessage(`Quest completed: ${quest.title}! You received ${quest.reward.gold} gold and ${quest.reward.exp} XP.`);

    // Check for level up
    checkLevelUp();
    updateUI();
}

function checkLevelUp() {
    while (gameState.character.exp >= gameState.character.expToNext) {
        gameState.character.exp -= gameState.character.expToNext;
        gameState.character.level += 1;
        gameState.character.maxHealth += 20;
        gameState.character.health = gameState.character.maxHealth;
        gameState.character.expToNext = Math.floor(gameState.character.expToNext * 1.5);
        gameState.character.skills.bartering += 1;
        
        addMessage(`🎉 Level Up! You are now level ${gameState.character.level}!`);
    }
}

function addMessage(text) {
    const messageLog = document.getElementById('messageLog');
    const message = document.createElement('div');
    message.className = 'message';
    message.textContent = text;
    messageLog.appendChild(message);
    messageLog.scrollTop = messageLog.scrollHeight;
}

// Save/Load Game
function saveGame() {
    localStorage.setItem('oldGregTavernSave', JSON.stringify(gameState));
    addMessage("Game saved!");
}

function loadGame() {
    const saved = localStorage.getItem('oldGregTavernSave');
    if (saved) {
        try {
            gameState = JSON.parse(saved);
            addMessage("Game loaded!");
        } catch (e) {
            addMessage("Failed to load game. Starting new game.");
        }
    }
}

function newGame() {
    if (confirm("Start a new game? This will overwrite your current progress.")) {
        gameState = {
            character: {
                name: "Adventurer",
                level: 1,
                exp: 0,
                expToNext: 100,
                health: 100,
                maxHealth: 100,
                gold: 50,
                stats: {
                    strength: 12,
                    dexterity: 14,
                    constitution: 13,
                    intelligence: 11,
                    wisdom: 12,
                    charisma: 13
                },
                skills: {
                    bartering: 0,
                    intimidation: 0,
                    persuasion: 0,
                    athletics: 0,
                    acrobatics: 0,
                    stealth: 0,
                    investigation: 0,
                    perception: 0,
                    survival: 0
                }
            },
            inventory: [],
            party: [],
            quests: {
                active: [],
                completed: [],
                rumors: []
            },
    npcs: {},
    locations: {},
    currentLocation: "tavern",
    combat: null,
    diceRollHistory: [],
    pendingRoll: null // Stores pending dice roll information
};
        updateUI();
        addMessage("New game started!");
    }
}

// Chat Functions
function updateChatNPCSelect() {
    const chatNPCSelect = document.getElementById('chatNPCSelect');
    if (!chatNPCSelect) return;

    const npcsAtLocation = Object.values(npcDatabase).filter(npc => 
        npc.location === gameState.currentLocation || npc.location === 'tavern'
    );

    chatNPCSelect.innerHTML = '<option value="">Select NPC to chat with...</option>' +
        npcsAtLocation.map(npc => 
            `<option value="${npc.id}">${npc.name} (${npc.type})</option>`
        ).join('');
}

async function sendChatMessage() {
    const chatInput = document.getElementById('chatInput');
    const chatMessages = document.getElementById('chatMessages');

    if (!chatInput || !chatMessages) return;

    const message = chatInput.value.trim();
    if (!message) return;

    // Add player message to chat
    addChatMessage('player', message, gameState.character.name);
    chatInput.value = '';
    chatInput.disabled = true;

    // Show loading message
    const loadingId = 'loading-' + Date.now();
    addChatMessage('npc', '...', 'Game Master', loadingId, true);

    try {
        // Process player action and get AI response
        const response = await processPlayerAction(message);
        
        // Remove loading message
        const loadingMsg = document.getElementById(loadingId);
        if (loadingMsg) loadingMsg.remove();

        // Add AI response
        addChatMessage('npc', response, 'Game Master');
        
        // Update UI
        updateUI();
        updateQuestLogSidebar();
        
    } catch (error) {
        const loadingMsg = document.getElementById(loadingId);
        if (loadingMsg) loadingMsg.remove();
        addChatMessage('system', `Error: ${error.message}`);
    } finally {
        chatInput.disabled = false;
        chatInput.focus();
    }
}

// Process player actions and update game state
async function processPlayerAction(message) {
    const lowerMessage = message.toLowerCase();
    
    // Check if AI is configured
    if (!AIIntegration.config.apiKey) {
        return "Please configure your AI API key in the settings to play. The AI will handle all your actions and create the story.";
    }
    
    // Handle combat actions
    if (gameState.combat) {
        return await handleCombatAction(message);
    }
    
    // Check for combat initiation
    if (lowerMessage.includes('attack') || lowerMessage.includes('fight') || lowerMessage.includes('battle')) {
        // Try to identify enemy
        for (const [enemyId, enemy] of Object.entries(enemyDatabase)) {
            if (lowerMessage.includes(enemy.name.toLowerCase()) || lowerMessage.includes(enemyId)) {
                if (startCombat(enemyId, 1)) {
                    const combatMsg = `Combat started! You face ${enemy.name}!\n\n`;
                    const aiResponse = await AIIntegration.generateResponse(message, 'game', gameState);
                    return combatMsg + aiResponse;
                }
            }
        }
    }
    
    // Handle skill checks (intimidation, persuasion, etc.)
    const skillCheckResult = await handleSkillCheck(message, lowerMessage);
    if (skillCheckResult) {
        return skillCheckResult;
    }
    
    // Location changes
    if (lowerMessage.includes('go to') || lowerMessage.includes('travel to') || lowerMessage.includes('visit')) {
        const locations = Object.keys(locationDatabase);
        for (const loc of locations) {
            const locName = locationDatabase[loc].name.toLowerCase();
            if (lowerMessage.includes(locName) || lowerMessage.includes(loc)) {
                gameState.currentLocation = loc;
                updateLocation();
                break;
            }
        }
    }
    
    // Check for NPC mentions
    let mentionedNPC = null;
    for (const [npcId, npc] of Object.entries(npcDatabase)) {
        if (lowerMessage.includes(npc.name.toLowerCase())) {
            mentionedNPC = npcId;
            break;
        }
    }
    
    // Get AI response (use mentioned NPC or game master)
    const response = await AIIntegration.generateResponse(message, mentionedNPC || 'game', gameState);
    
    // Try to extract game state changes from response (simple keyword detection)
    if (lowerMessage.includes('rest') || lowerMessage.includes('sleep')) {
        gameState.character.health = gameState.character.maxHealth;
    }
    
    if (lowerMessage.includes('accept quest') || lowerMessage.includes('take quest')) {
        for (const [questId, quest] of Object.entries(questDatabase)) {
            if (lowerMessage.includes(quest.title.toLowerCase())) {
                if (!gameState.quests.active.find(q => q.id === questId) && 
                    !gameState.quests.completed.includes(questId)) {
                    gameState.quests.active.push({ ...quest, currentCount: 0 });
                }
            }
        }
    }
    
    return response;
}

// Handle skill checks with dice rolls
async function handleSkillCheck(message, lowerMessage) {
    const skills = ['intimidation', 'persuasion', 'athletics', 'stealth', 'investigation', 'perception', 'survival'];
    let skillUsed = null;
    let skillModifier = 0;
    
    for (const skill of skills) {
        if (lowerMessage.includes(skill)) {
            skillUsed = skill;
            skillModifier = gameState.character.skills[skill] || 0;
            break;
        }
    }
    
    if (!skillUsed) return null;
    
    // Get AI to determine difficulty
    const aiPrompt = `The player is attempting a ${skillUsed} check. Determine the difficulty (DC) for this action based on the context. Respond with ONLY a number between 8-20 representing the difficulty. Examples: Easy situation = 8-10, Medium = 12-15, Hard = 16-18, Very Hard = 19-20.`;
    
    try {
        const difficultyResponse = await AIIntegration.generateResponse(aiPrompt, 'game', gameState);
        // Extract number from response
        const difficultyMatch = difficultyResponse.match(/\b(1[0-9]|20|[8-9])\b/);
        const difficulty = difficultyMatch ? parseInt(difficultyMatch[0]) : 12; // Default to medium
        
        // Store pending roll instead of rolling immediately
        gameState.pendingRoll = {
            type: 'skill_check',
            skill: skillUsed,
            modifier: skillModifier,
            difficulty: difficulty,
            message: message
        };
        
        // Return message with roll button
        const modDisplay = skillModifier >= 0 ? `+${skillModifier}` : `${skillModifier}`;
        return `\n🎲 **${skillUsed.toUpperCase()} Check Required**\n` +
               `Difficulty: ${difficulty}\n` +
               `Your modifier: ${modDisplay}\n` +
               `You need to roll: 1d20 + ${modDisplay} ≥ ${difficulty}\n` +
               `<button class="dice-roll-btn" onclick="executePendingRoll()">🎲 Roll Dice</button>`;
    } catch (error) {
        console.error('Skill check error:', error);
        return null;
    }
}

// Handle combat actions
async function handleCombatAction(message) {
    const lowerMessage = message.toLowerCase();
    const combat = gameState.combat;
    
    // Attack action
    if (lowerMessage.includes('attack') || lowerMessage.includes('hit') || lowerMessage.includes('strike')) {
        // Determine target (default to first enemy)
        let targetIndex = 0;
        combat.enemies.forEach((enemy, index) => {
            if (lowerMessage.includes(enemy.name.toLowerCase())) {
                targetIndex = index;
            }
        });
        
        const enemy = combat.enemies[targetIndex];
        if (!enemy) {
            return "Invalid attack target.";
        }
        
        const attackModifier = getPlayerAttackModifier();
        const armorClass = enemy.armorClass;
        
        // Store pending attack roll instead of rolling immediately
        gameState.pendingRoll = {
            type: 'attack',
            targetIndex: targetIndex,
            enemyName: enemy.name,
            modifier: attackModifier,
            difficulty: armorClass, // AC is the difficulty
            message: message
        };
        
        // Return message with roll button
        const modDisplay = attackModifier >= 0 ? `+${attackModifier}` : `${attackModifier}`;
        return `\n⚔️ **Attack ${enemy.name}**\n` +
               `Armor Class: ${armorClass}\n` +
               `Your attack modifier: ${modDisplay}\n` +
               `You need to roll: 1d20 + ${modDisplay} ≥ ${armorClass}\n` +
               `<button class="dice-roll-btn" onclick="executePendingRoll()">🎲 Roll Attack</button>`;
    }
    
    // Default: let AI handle other combat actions
    return await AIIntegration.generateResponse(message, 'game', gameState);
}

// Execute pending dice roll when button is clicked
async function executePendingRoll() {
    if (!gameState.pendingRoll) return;
    
    const pending = gameState.pendingRoll;
    gameState.pendingRoll = null; // Clear pending roll
    
    let rollResult = null;
    let resultMessage = '';
    
    if (pending.type === 'skill_check') {
        // Roll skill check
        rollResult = DiceSystem.skillCheck(pending.modifier, pending.difficulty);
        DiceSystem.saveRoll('skill_check', { skill: pending.skill, ...rollResult });
        
        const rollDisplay = formatDiceRoll(rollResult, 'skill');
        const successIcon = rollResult.success ? '✅' : '❌';
        resultMessage = `\n🎲 **${pending.skill.toUpperCase()} Check**: ${rollDisplay} ${successIcon}\n`;
        
        // Get AI narrative response
        const narrativePrompt = `The player attempted ${pending.skill}. They rolled ${rollResult.roll} + ${pending.modifier} = ${rollResult.total} against difficulty ${pending.difficulty}. ${rollResult.success ? 'They succeeded!' : 'They failed.'} Narrate what happens.`;
        const narrative = await AIIntegration.generateResponse(narrativePrompt, 'game', gameState);
        resultMessage += narrative;
        
    } else if (pending.type === 'attack') {
        // Roll attack
        rollResult = DiceSystem.attackRoll(pending.modifier, pending.difficulty);
        DiceSystem.saveRoll('attack', rollResult);
        
        const rollDisplay = formatDiceRoll(rollResult, 'attack');
        resultMessage = `\n⚔️ **Attack Roll**: ${rollDisplay}\n`;
        
        // Use the combat system's playerAttack function
        // But we need to manually set the attack roll result first
        const enemy = gameState.combat.enemies[pending.targetIndex];
        if (!enemy) {
            resultMessage += `❌ Invalid target.\n`;
        } else {
            // Manually apply the attack result
            if (rollResult.success || rollResult.roll === 20) {
                // Hit! Roll damage
                const damageDice = getPlayerDamageDice();
                const strengthMod = calculateModifier(gameState.character.stats.strength);
                const damageRoll = DiceSystem.damageRoll(damageDice, strengthMod);
                
                if (rollResult.roll === 20) {
                    // Critical hit - double dice
                    const critDamage = DiceSystem.damageRoll(damageDice, 0);
                    damageRoll.total = damageRoll.total + critDamage.total;
                    damageRoll.rolls = [...damageRoll.rolls, ...critDamage.rolls];
                    resultMessage += `✨ **CRITICAL HIT!**\n`;
                }
                
                DiceSystem.saveRoll('damage', damageRoll);
                const damageDisplay = formatDiceRoll(damageRoll, 'damage');
                resultMessage += `💥 **Damage**: ${damageDisplay}\n`;
                
                // Apply damage to enemy
                enemy.health -= damageRoll.total;
                if (enemy.health <= 0) {
                    enemy.health = 0;
                    resultMessage += `💀 ${pending.enemyName} defeated!\n`;
                }
            } else {
                resultMessage += `❌ **Miss!**\n`;
            }
            
            // Process enemy turns
            gameState.combat.playerTurn = false; // Mark player turn as done
            const aliveEnemies = gameState.combat.enemies.filter(e => e.health > 0);
            
            if (aliveEnemies.length === 0) {
                endCombat(true);
                resultMessage += `\n🎉 **Victory!** Combat ended.\n`;
            } else {
                // Enemy attacks
                aliveEnemies.forEach((enemy, index) => {
                    const originalIndex = gameState.combat.enemies.indexOf(enemy);
                    const enemyResult = enemyAttack(originalIndex);
                    if (enemyResult) {
                        const enemyRoll = formatDiceRoll(enemyResult.attackRoll, 'attack');
                        resultMessage += `\n${enemyResult.enemyName} attacks: ${enemyRoll}\n`;
                        if (enemyResult.hit) {
                            const enemyDamage = formatDiceRoll(enemyResult.damage, 'damage');
                            resultMessage += `💥 You take ${enemyDamage}\n`;
                        } else {
                            resultMessage += `✅ They miss!\n`;
                        }
                    }
                });
                
                gameState.combat.playerTurn = true;
                gameState.combat.round++;
                
                // Check if player is dead
                if (gameState.character.health <= 0) {
                    endCombat(false);
                    resultMessage += `\n💀 **Defeat!** You have been defeated.\n`;
                }
            }
        }
        
        // Get AI narrative
        const narrativePrompt = `The player ${rollResult.success ? 'hit' : 'missed'} the enemy. Narrate the combat action.`;
        const narrative = await AIIntegration.generateResponse(narrativePrompt, 'game', gameState);
        resultMessage += '\n' + narrative;
    }
    
    // Add result to chat
    addChatMessage('system', resultMessage);
    
    // Update UI
    updateUI();
    updateQuestLogSidebar();
}

function sendQuickMessage(message) {
    const chatInput = document.getElementById('chatInput');
    if (chatInput) {
        chatInput.value = message;
        sendChatMessage();
    }
}

// Update sidebar quest log
function updateQuestLogSidebar() {
    const questListSidebar = document.getElementById('questListSidebar');
    if (!questListSidebar) return;
    
    if (gameState.quests.active.length === 0) {
        questListSidebar.innerHTML = '<div class="empty-quests">No active quests</div>';
        return;
    }
    
    questListSidebar.innerHTML = gameState.quests.active.map(quest => {
        const questData = questDatabase[quest.id] || quest;
        const progress = questData.type === 'kill' ? 
            `${questData.currentCount}/${questData.targetCount}` : '';
        return `
            <div class="quest-item">
                <h4>${questData.title}</h4>
                <p>${questData.description}</p>
                ${progress ? `<p style="color: #fb923c; font-size: 0.85em; margin-top: 6px;">Progress: ${progress}</p>` : ''}
            </div>
        `;
    }).join('');
}

function addChatMessage(type, content, sender = '', id = '', isLoading = false) {
    const chatMessages = document.getElementById('chatMessages');
    if (!chatMessages) return;

    const messageDiv = document.createElement('div');
    messageDiv.className = `chat-message ${type}`;
    if (id) messageDiv.id = id;
    if (isLoading) messageDiv.classList.add('loading');

    if (sender) {
        const strong = document.createElement('strong');
        strong.textContent = sender + ':';
        messageDiv.appendChild(strong);
    }

    // Support basic HTML formatting (line breaks, lists, etc.)
    const contentDiv = document.createElement('div');
    contentDiv.innerHTML = content.replace(/\n/g, '<br>');
    messageDiv.appendChild(contentDiv);

    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    
    // Re-enable any dice roll buttons that were added
    setTimeout(() => {
        const buttons = messageDiv.querySelectorAll('.dice-roll-btn');
        buttons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                executePendingRoll();
            });
        });
    }, 100);
}

function handleChatResponse(npcId, response) {
    const npc = npcDatabase[npcId];
    if (!npc) return;

    const lowerResponse = response.toLowerCase();

    // Check for quest mentions
    if (npc.quests && npc.quests.length > 0) {
        npc.quests.forEach(questId => {
            if (lowerResponse.includes('quest') || lowerResponse.includes('help') || lowerResponse.includes('mission')) {
                const quest = questDatabase[questId];
                if (quest && !gameState.quests.active.find(q => q.id === questId) && 
                    !gameState.quests.completed.includes(questId)) {
                    // Offer quest through chat
                    setTimeout(() => {
                        addChatMessage('system', `💡 ${npc.name} seems to have a quest for you. Check the Quests tab!`);
                        if (!gameState.quests.rumors.includes(questId)) {
                            gameState.quests.rumors.push(questId);
                            updateQuestLog();
                        }
                    }, 1000);
                }
            }
        });
    }

    // Check for shop mentions
    if (npc.type === 'merchant' && (lowerResponse.includes('buy') || lowerResponse.includes('sell') || lowerResponse.includes('shop'))) {
        setTimeout(() => {
            addChatMessage('system', `💡 ${npc.name} has items for sale. Check the Shop tab!`);
        }, 1000);
    }

    // Update relationship based on positive/negative keywords
    if (lowerResponse.includes('thank') || lowerResponse.includes('appreciate') || lowerResponse.includes('glad')) {
        if (gameState.npcs[npcId]) {
            gameState.npcs[npcId].relationship += 1;
        }
    }
}

// Enhanced NPC interaction with AI
async function interactWithNPC(npcId) {
    const npc = npcDatabase[npcId];
    if (!npc) return;

    if (!gameState.npcs[npcId]) {
        gameState.npcs[npcId] = { relationship: npc.relationship || 0 };
    }

    // If AI is configured, open chat instead of modal
    if (AIIntegration.config.apiKey) {
        switchTab('chat');
        const chatNPCSelect = document.getElementById('chatNPCSelect');
        if (chatNPCSelect) {
            chatNPCSelect.value = npcId;
        }
        const chatInput = document.getElementById('chatInput');
        if (chatInput) {
            chatInput.focus();
        }
        addChatMessage('npc', npc.dialogue, npc.name);
        return;
    }

    // Fallback to modal if AI not configured
    const modal = document.getElementById('npcModal');
    const modalContent = document.getElementById('npcModalContent');
    
    let html = `
        <h2>${npc.name}</h2>
        <p>${npc.dialogue}</p>
        <p><strong>Relationship:</strong> ${gameState.npcs[npcId].relationship > 0 ? '+' : ''}${gameState.npcs[npcId].relationship}</p>
        <div class="npc-actions">
    `;

    if (npc.canRecruit && !gameState.party.find(m => m.id === npcId)) {
        html += `<button class="action-btn" onclick="recruitCompanion('${npcId}')">Recruit (${npc.recruitCost} gold)</button>`;
    }

    if (npc.quests && npc.quests.length > 0) {
        npc.quests.forEach(questId => {
            const quest = questDatabase[questId];
            if (quest && gameState.quests.rumors.includes(questId)) {
                html += `<button class="action-btn" onclick="acceptQuest('${questId}')">Accept Quest: ${quest.title}</button>`;
            }
        });
    }

    if (npc.type === 'merchant') {
        html += `<button class="action-btn" onclick="switchTab('shop'); document.getElementById('npcModal').style.display='none';">View Shop</button>`;
    }

    html += `<button class="action-btn" onclick="switchTab('chat'); document.getElementById('chatNPCSelect').value='${npcId}'; document.getElementById('npcModal').style.display='none';">💬 Chat (AI)</button>`;

    html += `</div>`;
    modalContent.innerHTML = html;
    modal.style.display = 'block';
}

// Enhanced quest generation with AI variations
async function generateRumors() {
    const availableQuests = Object.keys(questDatabase).filter(questId => {
        const quest = questDatabase[questId];
        return quest.status === 'rumor' && 
               !gameState.quests.rumors.includes(questId) &&
               !gameState.quests.active.some(q => q.id === questId) &&
               !gameState.quests.completed.includes(questId);
    });

    if (availableQuests.length > 0) {
        const baseQuestId = availableQuests[Math.floor(Math.random() * availableQuests.length)];
        const baseQuest = questDatabase[baseQuestId];

        // Try to generate AI variation if API is configured
        if (AIIntegration.config.apiKey) {
            try {
                const variation = await AIIntegration.generateQuestVariation(baseQuest, gameState);
                if (variation && variation.title !== baseQuest.title) {
                    // Store variation
                    const variationId = baseQuestId + '_variation_' + Date.now();
                    questDatabase[variationId] = { ...variation, id: variationId, giver: baseQuest.giver };
                    if (!gameState.quests.rumors.includes(variationId)) {
                        gameState.quests.rumors.push(variationId);
                    }
                    addMessage(`You hear a new rumor: ${variation.title}`);
                    return;
                }
            } catch (error) {
                console.error('Failed to generate quest variation:', error);
            }
        }

        // Fallback to base quest
        if (!gameState.quests.rumors.includes(baseQuestId)) {
            gameState.quests.rumors.push(baseQuestId);
        }
    }
}

// Random events with AI
async function triggerRandomEvent() {
    if (!AIIntegration.config.apiKey) return;

    // 10% chance of random event
    if (Math.random() < 0.1) {
        try {
            const event = await AIIntegration.generateRandomEvent(gameState);
            if (event) {
                addMessage(`✨ ${event}`);
            }
        } catch (error) {
            console.error('Failed to generate random event:', error);
        }
    }
}

// Initialize on load
window.addEventListener('DOMContentLoaded', initGame);

