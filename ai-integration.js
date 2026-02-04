// AI Integration Module
const AIIntegration = {
    config: {
        provider: 'openai',
        apiKey: '',
        temperature: 0.7,
        model: {
            openai: 'gpt-3.5-turbo',
            anthropic: 'claude-3-haiku-20240307'
        }
    },
    
    chatHistory: {},
    
    init() {
        this.loadConfig();
        this.setupEventListeners();
    },
    
    loadConfig() {
        const saved = localStorage.getItem('aiConfig');
        if (saved) {
            try {
                this.config = { ...this.config, ...JSON.parse(saved) };
                this.updateConfigUI();
            } catch (e) {
                console.error('Failed to load AI config:', e);
            }
        }
    },
    
    saveConfig() {
        localStorage.setItem('aiConfig', JSON.stringify({
            provider: this.config.provider,
            apiKey: this.config.apiKey,
            temperature: this.config.temperature
        }));
    },
    
    updateConfigUI() {
        const providerSelect = document.getElementById('apiProvider');
        const apiKeyInput = document.getElementById('apiKey');
        const creativitySlider = document.getElementById('aiCreativity');
        const creativityValue = document.getElementById('creativityValue');
        
        if (providerSelect) providerSelect.value = this.config.provider;
        if (apiKeyInput) apiKeyInput.value = this.config.apiKey || '';
        if (creativitySlider) {
            creativitySlider.value = this.config.temperature * 100;
            if (creativityValue) creativityValue.textContent = Math.round(this.config.temperature * 100);
        }
    },
    
    setupEventListeners() {
        const aiConfigBtn = document.getElementById('aiConfigBtn');
        const closeAIConfigModal = document.getElementById('closeAIConfigModal');
        const saveAIConfigBtn = document.getElementById('saveAIConfigBtn');
        const testAIConfigBtn = document.getElementById('testAIConfigBtn');
        const creativitySlider = document.getElementById('aiCreativity');
        
        if (aiConfigBtn) {
            aiConfigBtn.addEventListener('click', () => {
                document.getElementById('aiConfigModal').style.display = 'block';
                this.updateConfigUI();
            });
        }
        
        if (closeAIConfigModal) {
            closeAIConfigModal.addEventListener('click', () => {
                document.getElementById('aiConfigModal').style.display = 'none';
            });
        }
        
        if (saveAIConfigBtn) {
            saveAIConfigBtn.addEventListener('click', () => this.saveAIConfig());
        }
        
        if (testAIConfigBtn) {
            testAIConfigBtn.addEventListener('click', () => this.testConnection());
        }
        
        if (creativitySlider) {
            creativitySlider.addEventListener('input', (e) => {
                const value = e.target.value;
                document.getElementById('creativityValue').textContent = value;
                this.config.temperature = value / 100;
            });
        }
    },
    
    saveAIConfig() {
        const provider = document.getElementById('apiProvider').value;
        const apiKey = document.getElementById('apiKey').value;
        const temperature = document.getElementById('aiCreativity').value / 100;
        
        this.config.provider = provider;
        this.config.apiKey = apiKey;
        this.config.temperature = temperature;
        
        this.saveConfig();
        
        const status = document.getElementById('aiConfigStatus');
        status.className = 'config-status success';
        status.textContent = 'Configuration saved!';
        
        setTimeout(() => {
            status.className = 'config-status';
            status.textContent = '';
        }, 3000);
    },
    
    async testConnection() {
        const status = document.getElementById('aiConfigStatus');
        status.className = 'config-status';
        status.textContent = 'Testing connection...';
        
        if (!this.config.apiKey) {
            status.className = 'config-status error';
            status.textContent = 'Please enter an API key first.';
            return;
        }
        
        try {
            const response = await this.generateResponse('Say "Hello" if you can hear me.', 'system', 'test');
            if (response) {
                status.className = 'config-status success';
                status.textContent = 'Connection successful! AI is ready.';
            } else {
                throw new Error('No response received');
            }
        } catch (error) {
            status.className = 'config-status error';
            status.textContent = `Connection failed: ${error.message}. Please check your API key.`;
        }
    },
    
    getChatHistory(npcId) {
        if (!this.chatHistory[npcId]) {
            this.chatHistory[npcId] = [];
        }
        return this.chatHistory[npcId];
    },
    
    addToHistory(npcId, role, content) {
        const history = this.getChatHistory(npcId);
        history.push({ role, content });
        
        // Keep last 20 messages for context
        if (history.length > 20) {
            history.shift();
        }
    },
    
    buildSystemPrompt(npcId, npcData, gameContext) {
        // If no specific NPC, this is a general game master prompt
        if (!npcId || npcId === 'game') {
            return this.buildGameMasterPrompt(gameContext);
        }
        
        const npc = npcData || npcDatabase[npcId];
        if (!npc) return this.buildGameMasterPrompt(gameContext);
        
        const relationship = gameContext?.npcs?.[npcId]?.relationship || npc.relationship || 0;
        const relationshipDesc = relationship > 50 ? 'very friendly' : 
                                relationship > 20 ? 'friendly' : 
                                relationship > -20 ? 'neutral' : 
                                relationship > -50 ? 'unfriendly' : 'hostile';
        
        return `You are ${npc.name}, a ${npc.type} in a fantasy RPG tavern game. 
        
Character traits:
- Type: ${npc.type}
- Personality: ${npc.dialogue || 'mysterious'}
- Relationship with player: ${relationshipDesc} (${relationship})
- Location: ${npc.location || 'tavern'}

Game context:
- Player level: ${gameContext?.character?.level || 1}
- Player gold: ${gameContext?.character?.gold || 0}
- Current location: ${gameContext?.currentLocation || 'tavern'}

Guidelines:
- Respond in character, staying true to your personality
- Provide detailed, immersive responses (4-8 sentences)
- Be creative and unpredictable based on your relationship with the player
- You can offer quests, sell items, or just chat
- If the player asks about quests, mention any available quests naturally
- If you're a merchant, mention your wares when appropriate
- React to the player's actions and relationship level
- Use fantasy/RPG appropriate language but stay conversational
- Describe the world and your reactions in detail

Remember: This is a game, so be engaging and fun!`;
    },
    
    buildGameMasterPrompt(gameContext) {
        const char = gameContext?.character || {};
        const location = gameContext?.currentLocation || 'tavern';
        const locationData = locationDatabase[location] || {};
        const activeQuests = gameContext?.quests?.active || [];
        const inventory = gameContext?.inventory || [];
        const party = gameContext?.party || [];
        const stats = char.stats || {};
        const skills = char.skills || {};
        const combat = gameContext?.combat;
        
        // Format stats for prompt
        const statsStr = stats.strength ? `
- STR: ${stats.strength} (${calculateModifier(stats.strength) >= 0 ? '+' : ''}${calculateModifier(stats.strength)})
- DEX: ${stats.dexterity} (${calculateModifier(stats.dexterity) >= 0 ? '+' : ''}${calculateModifier(stats.dexterity)})
- CON: ${stats.constitution} (${calculateModifier(stats.constitution) >= 0 ? '+' : ''}${calculateModifier(stats.constitution)})
- INT: ${stats.intelligence} (${calculateModifier(stats.intelligence) >= 0 ? '+' : ''}${calculateModifier(stats.intelligence)})
- WIS: ${stats.wisdom} (${calculateModifier(stats.wisdom) >= 0 ? '+' : ''}${calculateModifier(stats.wisdom)})
- CHA: ${stats.charisma} (${calculateModifier(stats.charisma) >= 0 ? '+' : ''}${calculateModifier(stats.charisma)})` : '';
        
        const skillsStr = skills.intimidation !== undefined ? `
- Intimidation: ${skills.intimidation >= 0 ? '+' : ''}${skills.intimidation}
- Persuasion: ${skills.persuasion >= 0 ? '+' : ''}${skills.persuasion}
- Athletics: ${skills.athletics >= 0 ? '+' : ''}${skills.athletics}
- Stealth: ${skills.stealth >= 0 ? '+' : ''}${skills.stealth}` : '';
        
        const combatStr = combat ? `
- IN COMBAT: ${combat.enemies.map(e => `${e.name} (${e.health}/${e.maxHealth} HP)`).join(', ')}
- Round ${combat.round}, ${combat.playerTurn ? 'Player Turn' : 'Enemy Turn'}` : '';
        
        return `You are the Game Master for a fantasy RPG adventure game using D&D-style dice mechanics. The player can do ANYTHING they want - explore, talk, fight, trade, quest, or create their own story.

CURRENT GAME STATE:
- Player: ${char.name || 'Adventurer'}${char.classDisplayName ? ` (${char.classDisplayName})` : ''}, Level ${char.level || 1}, ${char.health || 100}/${char.maxHealth || 100} HP, ${char.gold || 0} gold${statsStr}${skillsStr}
${char.appearance ? `- Appearance: ${char.appearance}` : ''}
${char.backstory ? `- Backstory: ${char.backstory}` : ''}
- Location: ${locationData.name || location} - ${locationData.description || 'A mysterious place'}${combatStr}
- Active Quests: ${activeQuests.length} quest(s) in progress
- Inventory: ${inventory.length} item(s)
- Party: ${party.length} companion(s)

AVAILABLE LOCATIONS: ${Object.keys(locationDatabase).map(loc => locationDatabase[loc].name).join(', ')}

AVAILABLE NPCS: ${Object.values(npcDatabase).map(n => `${n.name} (${n.type})`).join(', ')}

DICE MECHANICS:
This game uses D&D-style dice rolls. When the player attempts an action that requires a skill check:
1. Determine the difficulty (DC) based on the situation:
   - Easy: 8-10
   - Medium: 12-15
   - Hard: 16-18
   - Very Hard: 19-20
2. The player will roll 1d20 + their skill modifier
3. Success if: roll + modifier >= difficulty
4. For combat: Use enemy's Armor Class (AC) as difficulty for attacks

IMPORTANT: When the player attempts an action requiring a skill check (intimidation, persuasion, attack, etc.):
- Determine an appropriate difficulty based on the enemy/situation strength
- The system will automatically roll the dice and add the player's modifier
- Narrate the result based on success or failure
- For combat: If player attacks, use the enemy's AC as difficulty. If player uses intimidation/persuasion in combat, determine difficulty based on enemy's willpower/level

YOUR ROLE:
- Narrate the player's actions in an immersive, detailed way (5-10 sentences)
- Determine appropriate difficulty checks for skill-based actions
- Describe the world, NPCs, and consequences of actions
- Allow the player to do anything - be creative and flexible
- For combat actions, describe the action and the system will handle dice rolls
- Make the world feel alive and responsive
- Use rich descriptions and engaging storytelling

RESPONSE FORMAT:
- Start with a narrative description of what happens
- If a skill check is needed, mention the difficulty you're setting (e.g., "This requires an Intimidation check of difficulty 12")
- Include dialogue if NPCs are involved
- Describe the environment and atmosphere
- End with what the player sees/experiences now

Remember: The player has complete freedom. Make their actions feel meaningful and the world feel alive!`;
    },
    
    async generateResponse(userMessage, npcId, gameContext) {
        if (!this.config.apiKey) {
            return "I'm sorry, but the AI chat feature requires an API key. Please configure it in the AI Settings.";
        }
        
        // Use 'game' as default if no specific NPC
        const chatId = npcId || 'game';
        const npc = npcDatabase[npcId];
        
        const systemPrompt = this.buildSystemPrompt(chatId, npc, gameContext);
        const history = this.getChatHistory(chatId);
        
        // Build messages array
        const messages = [
            { role: 'system', content: systemPrompt }
        ];
        
        // Add recent history (keep last 15 messages for context)
        const recentHistory = history.slice(-15);
        recentHistory.forEach(msg => {
            messages.push({ role: msg.role, content: msg.content });
        });
        
        // Add current user message
        messages.push({ role: 'user', content: userMessage });
        this.addToHistory(chatId, 'user', userMessage);
        
        try {
            let response;
            
            if (this.config.provider === 'openai') {
                response = await this.callOpenAI(messages);
            } else if (this.config.provider === 'anthropic') {
                response = await this.callAnthropic(messages, systemPrompt);
            } else {
                return "AI provider not configured properly.";
            }
            
            if (response) {
                this.addToHistory(chatId, 'assistant', response);
                return response;
            }
            
            return "I'm having trouble responding right now. Please try again.";
        } catch (error) {
            console.error('AI Error:', error);
            return `I encountered an error: ${error.message}. Please check your API configuration.`;
        }
    },
    
    async callOpenAI(messages) {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.config.apiKey}`
            },
            body: JSON.stringify({
                model: this.config.model.openai,
                messages: messages,
                temperature: this.config.temperature,
                max_tokens: 800
            })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error?.message || 'OpenAI API error');
        }
        
        const data = await response.json();
        return data.choices[0]?.message?.content || '';
    },
    
    async callAnthropic(messages, systemPrompt) {
        // Remove system message from messages array for Anthropic
        const userMessages = messages.filter(m => m.role !== 'system');
        
        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': this.config.apiKey,
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
                model: this.config.model.anthropic,
                max_tokens: 800,
                temperature: this.config.temperature,
                system: systemPrompt,
                messages: userMessages
            })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error?.message || 'Anthropic API error');
        }
        
        const data = await response.json();
        return data.content[0]?.text || '';
    },
    
    async generateQuestVariation(baseQuest, gameContext) {
        if (!this.config.apiKey) {
            return baseQuest;
        }
        
        const systemPrompt = `You are a quest generator for a fantasy RPG game. Generate a creative variation of this quest:
        
Original Quest: ${baseQuest.title}
Description: ${baseQuest.description}
Type: ${baseQuest.type}

Create a unique variation with:
- A new title (similar theme but different)
- A new description (2-3 sentences)
- Same type and rewards
- Make it interesting and unpredictable

Respond in JSON format: {"title": "...", "description": "...", "type": "${baseQuest.type}", "reward": ${JSON.stringify(baseQuest.reward)}}`;

        try {
            const messages = [{ role: 'system', content: systemPrompt }, { role: 'user', content: 'Generate a quest variation.' }];
            let response;
            
            if (this.config.provider === 'openai') {
                response = await this.callOpenAI(messages);
            } else if (this.config.provider === 'anthropic') {
                response = await this.callAnthropic(messages, systemPrompt);
            }
            
            if (response) {
                // Try to extract JSON from response
                const jsonMatch = response.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    const variation = JSON.parse(jsonMatch[0]);
                    return { ...baseQuest, ...variation };
                }
            }
        } catch (error) {
            console.error('Quest generation error:', error);
        }
        
        return baseQuest;
    },
    
    async generateRandomEvent(gameContext) {
        if (!this.config.apiKey) {
            return null;
        }
        
        const systemPrompt = `Generate a random, unpredictable event for a fantasy RPG game. The player is at ${gameContext.currentLocation}, level ${gameContext.character.level}. Create something interesting that could happen - maybe they find something, meet someone, or something unexpected occurs. Keep it brief (1-2 sentences) and game-appropriate.`;

        try {
            const messages = [{ role: 'system', content: systemPrompt }, { role: 'user', content: 'Generate a random event.' }];
            let response;
            
            if (this.config.provider === 'openai') {
                response = await this.callOpenAI(messages);
            } else if (this.config.provider === 'anthropic') {
                response = await this.callAnthropic(messages, systemPrompt);
            }
            
            return response || null;
        } catch (error) {
            console.error('Event generation error:', error);
            return null;
        }
    }
};

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => AIIntegration.init());
} else {
    AIIntegration.init();
}

