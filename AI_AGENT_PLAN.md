# Custom AI Agent Implementation Plan

## 🎯 Overview

Instead of using OpenAI/Anthropic APIs, we'll build a custom AI agent specifically designed for this D&D game. This agent will handle narrative generation, game state management, and player interaction.

---

## 📋 Requirements Analysis

### What the AI Agent Needs to Do:

1. **Narrative Generation**
   - Create immersive story descriptions
   - Respond to player actions naturally
   - Maintain consistent tone and style

2. **Game State Management**
   - Understand current game state (location, stats, inventory, quests)
   - Make decisions about difficulty checks
   - Update game state based on player actions

3. **Context Awareness**
   - Remember conversation history
   - Track character relationships
   - Understand player goals and motivations

4. **Rule Enforcement**
   - Apply D&D mechanics correctly
   - Ensure game balance
   - Handle dice rolls and combat

5. **Creative Storytelling**
   - Generate quests dynamically
   - Create NPCs on the fly
   - Adapt to player choices

---

## 🏗️ Architecture Options

### Option 1: Local LLM with Custom Wrapper (Recommended for Privacy)

**Technology Stack:**
- **Local LLM**: Ollama, LM Studio, or Hugging Face Transformers
- **Models**: Llama 3, Mistral, or Phi-3 (smaller, faster models)
- **Wrapper**: Custom JavaScript/Node.js integration
- **Context Management**: In-memory or local database

**Pros:**
- ✅ 100% local, no API costs
- ✅ Complete privacy
- ✅ No internet required
- ✅ Customizable prompts

**Cons:**
- ❌ Requires powerful hardware (GPU recommended)
- ❌ Slower than cloud APIs
- ❌ Model quality may be lower
- ❌ Setup complexity

**Implementation:**
```javascript
// Custom AI Agent using local LLM
class LocalAIAgent {
    constructor(modelPath) {
        this.model = loadLocalModel(modelPath);
        this.context = [];
        this.gameState = null;
    }
    
    async generateResponse(userInput, gameState) {
        const prompt = this.buildPrompt(userInput, gameState);
        const response = await this.model.generate(prompt);
        return this.processResponse(response);
    }
}
```

---

### Option 2: Hybrid Rule-Based + LLM System

**Architecture:**
- **Rule Engine**: Handles game mechanics, dice rolls, combat
- **LLM Component**: Handles narrative, dialogue, creative content
- **State Manager**: Tracks game state and enforces rules

**Pros:**
- ✅ More reliable game mechanics
- ✅ Faster for rule-based actions
- ✅ Better game balance
- ✅ Can use smaller LLM for just narrative

**Cons:**
- ❌ More complex architecture
- ❌ Need to maintain rule engine
- ❌ Potential for disconnected narrative/mechanics

**Implementation:**
```javascript
class HybridAIAgent {
    constructor() {
        this.ruleEngine = new RuleEngine();
        this.narrativeLLM = new LocalLLM();
        this.stateManager = new StateManager();
    }
    
    async processAction(userInput) {
        // 1. Parse intent
        const intent = this.parseIntent(userInput);
        
        // 2. Handle with rule engine if applicable
        if (this.ruleEngine.canHandle(intent)) {
            return this.ruleEngine.process(intent);
        }
        
        // 3. Generate narrative with LLM
        return await this.narrativeLLM.generate(userInput);
    }
}
```

---

### Option 3: Agentic Framework (LangChain-style)

**Architecture:**
- **Agent Core**: Main decision-making system
- **Tools**: Specific functions (dice rolling, state updates, etc.)
- **Memory**: Long-term and short-term memory
- **Planning**: Multi-step reasoning

**Pros:**
- ✅ Most flexible and powerful
- ✅ Can handle complex multi-step actions
- ✅ Better reasoning capabilities
- ✅ Extensible tool system

**Cons:**
- ❌ Most complex to implement
- ❌ Requires more resources
- ❌ Slower response times
- ❌ Harder to debug

---

## 🚀 Recommended Approach: Hybrid System

### Phase 1: Local LLM Integration

**Step 1: Choose Local LLM Solution**

**Option A: Ollama (Easiest)**
```bash
# Install Ollama
# Download model: ollama pull llama3
# Run server: ollama serve
```

**Option B: LM Studio (GUI-based)**
- Download LM Studio
- Load a model (Llama 3, Mistral, etc.)
- Start local server

**Option C: Hugging Face Transformers.js (Browser-based)**
- Run entirely in browser
- No server needed
- Smaller models only

**Step 2: Create API Wrapper**

```javascript
// local-ai-agent.js
class LocalAIAgent {
    constructor() {
        this.apiUrl = 'http://localhost:11434/api/generate'; // Ollama default
        this.model = 'llama3'; // or your chosen model
        this.contextWindow = [];
        this.maxContext = 20; // Keep last 20 messages
    }
    
    async generate(prompt, systemPrompt, gameState) {
        const fullPrompt = this.buildFullPrompt(prompt, systemPrompt, gameState);
        
        const response = await fetch(this.apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: this.model,
                prompt: fullPrompt,
                stream: false,
                options: {
                    temperature: 0.7,
                    top_p: 0.9,
                    max_tokens: 500
                }
            })
        });
        
        const data = await response.json();
        return data.response;
    }
    
    buildFullPrompt(userPrompt, systemPrompt, gameState) {
        return `${systemPrompt}

CURRENT GAME STATE:
${this.formatGameState(gameState)}

CONVERSATION HISTORY:
${this.formatContext()}

USER: ${userPrompt}
ASSISTANT:`;
    }
    
    formatGameState(state) {
        // Format game state for prompt
        return `Character: ${state.character.name} (${state.character.class})
Level: ${state.character.level}
Location: ${state.currentLocation}
Health: ${state.character.health}/${state.character.character.maxHealth}
...`;
    }
}
```

---

### Phase 2: Specialized Agent Components

**1. Narrative Agent**
- Handles story generation
- Maintains tone and style
- Creates descriptions

**2. Game Master Agent**
- Makes rules decisions
- Determines difficulty checks
- Manages game balance

**3. NPC Agent**
- Generates NPC dialogue
- Maintains character consistency
- Tracks relationships

**4. Quest Agent**
- Creates dynamic quests
- Manages quest progression
- Generates rewards

---

### Phase 3: Advanced Features

**1. Memory System**
```javascript
class AgentMemory {
    constructor() {
        this.shortTerm = []; // Last 20 interactions
        this.longTerm = {}; // Important facts
        this.relationships = {}; // NPC relationships
    }
    
    remember(fact, importance) {
        if (importance > 0.7) {
            this.longTerm[fact.id] = fact;
        }
    }
    
    recall(context) {
        // Retrieve relevant memories
        return this.longTerm.filter(m => m.relevantTo(context));
    }
}
```

**2. Action Parser**
```javascript
class ActionParser {
    parse(userInput) {
        // Extract intent, entities, parameters
        return {
            intent: 'attack', // or 'talk', 'explore', etc.
            target: 'bandit',
            method: 'sword',
            modifiers: []
        };
    }
}
```

**3. State Updater**
```javascript
class StateUpdater {
    update(action, result, gameState) {
        // Update game state based on action result
        // Ensure consistency
        // Validate changes
    }
}
```

---

## 🔧 Implementation Steps

### Step 1: Setup Local LLM

1. **Install Ollama or LM Studio**
   ```bash
   # Ollama
   curl -fsSL https://ollama.com/install.sh | sh
   ollama pull llama3
   ```

2. **Test Connection**
   ```javascript
   async function testLocalLLM() {
       const response = await fetch('http://localhost:11434/api/generate', {
           method: 'POST',
           body: JSON.stringify({
               model: 'llama3',
               prompt: 'Hello, test response'
           })
       });
       console.log(await response.json());
   }
   ```

### Step 2: Create Agent Wrapper

Replace `ai-integration.js` with `local-ai-agent.js`:

```javascript
// local-ai-agent.js
const LocalAIAgent = {
    config: {
        apiUrl: 'http://localhost:11434/api/generate',
        model: 'llama3',
        temperature: 0.7
    },
    
    context: [],
    
    async generateResponse(userMessage, npcId, gameContext) {
        const systemPrompt = this.buildSystemPrompt(npcId, gameContext);
        const prompt = this.buildPrompt(userMessage, systemPrompt, gameContext);
        
        try {
            const response = await fetch(this.config.apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: this.config.model,
                    prompt: prompt,
                    stream: false,
                    options: {
                        temperature: this.config.temperature,
                        num_predict: 500
                    }
                })
            });
            
            const data = await response.json();
            const text = data.response.trim();
            
            // Add to context
            this.addToContext('user', userMessage);
            this.addToContext('assistant', text);
            
            return text;
        } catch (error) {
            console.error('Local AI Error:', error);
            return "I'm having trouble responding. Is the local LLM server running?";
        }
    },
    
    buildPrompt(userMessage, systemPrompt, gameContext) {
        const contextStr = this.context.slice(-10).map(msg => 
            `${msg.role}: ${msg.content}`
        ).join('\n');
        
        return `${systemPrompt}

RECENT CONTEXT:
${contextStr}

USER: ${userMessage}
ASSISTANT:`;
    },
    
    addToContext(role, content) {
        this.context.push({ role, content, timestamp: Date.now() });
        // Keep last 20 messages
        if (this.context.length > 20) {
            this.context.shift();
        }
    },
    
    // Reuse existing buildSystemPrompt from ai-integration.js
    buildSystemPrompt(npcId, npcData, gameContext) {
        // Same as before, but optimized for local models
    }
};
```

### Step 3: Update Game Integration

```javascript
// In game.js, replace AIIntegration with LocalAIAgent
async function processPlayerAction(message) {
    // ... existing code ...
    
    // Use local agent instead
    const response = await LocalAIAgent.generateResponse(
        message, 
        mentionedNPC || 'game', 
        gameState
    );
    
    return response;
}
```

### Step 4: Add Configuration UI

```html
<!-- In index.html -->
<div class="config-section">
    <label>AI Mode:</label>
    <select id="aiMode">
        <option value="local">Local LLM (Ollama/LM Studio)</option>
        <option value="openai">OpenAI API</option>
        <option value="anthropic">Anthropic API</option>
    </select>
</div>

<div class="config-section" id="localAIConfig">
    <label>Local LLM URL:</label>
    <input type="text" id="localAIUrl" value="http://localhost:11434/api/generate" />
    <label>Model Name:</label>
    <input type="text" id="localAIModel" value="llama3" />
</div>
```

---

## 🎨 Advanced: Custom Fine-Tuning

### Option 1: Prompt Engineering
- Create specialized prompts for different scenarios
- Use few-shot examples
- Chain-of-thought prompting

### Option 2: Fine-Tuning
- Collect game interactions
- Fine-tune model on D&D-specific data
- Create custom model variant

### Option 3: RAG (Retrieval Augmented Generation)
- Build knowledge base of D&D rules
- Game world information
- Quest templates
- Retrieve relevant info before generating

---

## 📊 Comparison: Local vs Cloud

| Feature | Local LLM | OpenAI/Anthropic |
|---------|-----------|------------------|
| Privacy | ✅ 100% | ❌ Data sent to API |
| Cost | ✅ Free | ❌ Pay per token |
| Speed | ⚠️ Slower | ✅ Fast |
| Quality | ⚠️ Varies | ✅ High |
| Setup | ❌ Complex | ✅ Easy |
| Offline | ✅ Yes | ❌ No |
| Customization | ✅ Full | ⚠️ Limited |

---

## 🛠️ Recommended Tech Stack

### For Local LLM:
1. **Ollama** (Easiest setup)
   - Simple API
   - Good model selection
   - Cross-platform

2. **LM Studio** (User-friendly)
   - GUI interface
   - Easy model management
   - Built-in server

3. **Hugging Face Transformers.js** (Browser-based)
   - No server needed
   - Runs in browser
   - Smaller models only

### For Agent Framework:
1. **LangChain.js** (If needed)
   - Agent framework
   - Tool integration
   - Memory management

2. **Custom Implementation** (Recommended)
   - Full control
   - Game-specific
   - Lighter weight

---

## 🚦 Implementation Roadmap

### Week 1: Setup & Basic Integration
- [ ] Install local LLM (Ollama/LM Studio)
- [ ] Create basic API wrapper
- [ ] Test connection
- [ ] Replace OpenAI calls with local calls

### Week 2: Optimization
- [ ] Optimize prompts for local models
- [ ] Implement context management
- [ ] Add error handling
- [ ] Performance tuning

### Week 3: Advanced Features
- [ ] Memory system
- [ ] Action parsing
- [ ] State management
- [ ] Specialized agents

### Week 4: Polish & Testing
- [ ] UI improvements
- [ ] Configuration options
- [ ] Documentation
- [ ] User testing

---

## 💡 Tips for Success

1. **Start Simple**: Get basic local LLM working first
2. **Optimize Prompts**: Local models need better prompts
3. **Cache Responses**: Store common responses
4. **Hybrid Approach**: Use rules for mechanics, LLM for narrative
5. **Model Selection**: Smaller, faster models may be better for real-time
6. **Hardware**: GPU recommended but not required

---

## 🔍 Next Steps

1. **Choose your approach** (Local LLM vs Hybrid vs Full Agent)
2. **Set up local LLM** (Ollama recommended)
3. **Create wrapper** (Replace ai-integration.js)
4. **Test and iterate**
5. **Add advanced features**

Would you like me to start implementing the local LLM integration?
