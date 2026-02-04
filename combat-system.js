// Combat System with D&D Dice Mechanics

// Enemy Database
const enemyDatabase = {
    bandit: {
        id: "bandit",
        name: "Bandit",
        level: 1,
        health: 50,
        maxHealth: 50,
        armorClass: 12, // Difficulty to hit
        attackBonus: 4, // Their attack modifier
        damageDice: "1d6", // Damage they deal
        expReward: 25,
        goldReward: 10,
        difficulty: "easy" // For AI to determine check difficulty
    },
    bandit_leader: {
        id: "bandit_leader",
        name: "Bandit Leader",
        level: 3,
        health: 80,
        maxHealth: 80,
        armorClass: 15,
        attackBonus: 6,
        damageDice: "1d8+2",
        expReward: 75,
        goldReward: 30,
        difficulty: "medium"
    },
    wild_wolf: {
        id: "wild_wolf",
        name: "Wild Wolf",
        level: 2,
        health: 35,
        maxHealth: 35,
        armorClass: 13,
        attackBonus: 5,
        damageDice: "1d6+2",
        expReward: 40,
        goldReward: 5,
        difficulty: "easy"
    },
    orc_warrior: {
        id: "orc_warrior",
        name: "Orc Warrior",
        level: 4,
        health: 120,
        maxHealth: 120,
        armorClass: 16,
        attackBonus: 7,
        damageDice: "2d6+3",
        expReward: 100,
        goldReward: 50,
        difficulty: "hard"
    }
};

// Combat State
let combatState = null;

// Start Combat
function startCombat(enemyId, enemyCount = 1) {
    const enemyTemplate = enemyDatabase[enemyId];
    if (!enemyTemplate) return false;
    
    const enemies = [];
    for (let i = 0; i < enemyCount; i++) {
        enemies.push({
            ...enemyTemplate,
            id: `${enemyId}_${i}`,
            health: enemyTemplate.maxHealth,
            maxHealth: enemyTemplate.maxHealth
        });
    }
    
    combatState = {
        enemies: enemies,
        turn: 0,
        round: 1,
        playerTurn: true,
        combatLog: []
    };
    
    gameState.combat = combatState;
    return true;
}

// End Combat
function endCombat(victory = false) {
    if (!combatState) return;
    
    if (victory) {
        // Calculate rewards
        let totalExp = 0;
        let totalGold = 0;
        
        combatState.enemies.forEach(enemy => {
            const template = enemyDatabase[enemy.id.split('_')[0]];
            if (template) {
                totalExp += template.expReward;
                totalGold += template.goldReward;
            }
        });
        
        gameState.character.exp += totalExp;
        gameState.character.gold += totalGold;
        
        checkLevelUp();
    }
    
    combatState = null;
    gameState.combat = null;
}

// Get attack modifier for player
function getPlayerAttackModifier() {
    // Use strength for melee, dexterity for ranged
    // For now, use strength
    return calculateModifier(gameState.character.stats.strength);
}

// Get damage dice for player weapon
function getPlayerDamageDice() {
    // Check if player has a weapon equipped
    const weapon = gameState.inventory.find(item => {
        const itemData = itemDatabase[item.id];
        return itemData && itemData.type === 'weapon';
    });
    
    if (weapon) {
        // Different weapons have different damage
        const weaponData = itemDatabase[weapon.id];
        if (weaponData.damageDice) {
            return weaponData.damageDice;
        }
    }
    
    // Default unarmed damage
    return "1d4";
}

// Player Attack
function playerAttack(enemyIndex) {
    if (!combatState || !combatState.playerTurn) return null;
    if (enemyIndex >= combatState.enemies.length) return null;
    
    const enemy = combatState.enemies[enemyIndex];
    const attackModifier = getPlayerAttackModifier();
    const armorClass = enemy.armorClass;
    
    // Roll attack: 1d20 + modifier vs AC
    const attackRoll = DiceSystem.attackRoll(attackModifier, armorClass);
    DiceSystem.saveRoll('attack', attackRoll);
    
    let result = {
        type: 'player_attack',
        enemyIndex,
        attackRoll,
        hit: false,
        damage: null,
        critical: attackRoll.roll === 20
    };
    
    if (attackRoll.success || result.critical) {
        // Hit! Roll damage
        const damageDice = getPlayerDamageDice();
        const strengthMod = calculateModifier(gameState.character.stats.strength);
        const damageRoll = DiceSystem.damageRoll(damageDice, strengthMod);
        DiceSystem.saveRoll('damage', damageRoll);
        
        if (result.critical) {
            // Critical hit: double damage dice (not modifier)
            const critDamage = DiceSystem.damageRoll(damageDice, 0);
            damageRoll.total = critDamage.total + strengthMod;
            damageRoll.rolls = [...damageRoll.rolls, ...critDamage.rolls];
        }
        
        enemy.health -= damageRoll.total;
        result.hit = true;
        result.damage = damageRoll;
        
        if (enemy.health <= 0) {
            enemy.health = 0;
            result.enemyDefeated = true;
        }
    }
    
    combatState.combatLog.push(result);
    return result;
}

// Enemy Attack
function enemyAttack(enemyIndex) {
    if (!combatState || combatState.playerTurn) return null;
    if (enemyIndex >= combatState.enemies.length) return null;
    
    const enemy = combatState.enemies[enemyIndex];
    if (enemy.health <= 0) return null; // Dead enemy can't attack
    
    const attackBonus = enemy.attackBonus;
    // Player AC (Armor Class) - for now, base 10 + dex modifier
    const playerAC = 10 + calculateModifier(gameState.character.stats.dexterity);
    
    const attackRoll = DiceSystem.attackRoll(attackBonus, playerAC);
    DiceSystem.saveRoll('enemy_attack', attackRoll);
    
    let result = {
        type: 'enemy_attack',
        enemyIndex,
        enemyName: enemy.name,
        attackRoll,
        hit: false,
        damage: null,
        critical: attackRoll.roll === 20
    };
    
    if (attackRoll.success || result.critical) {
        // Parse damage dice (e.g., "1d6+2")
        const damageMatch = enemy.damageDice.match(/(\d+)d(\d+)([+-]\d+)?/);
        let damageDice = enemy.damageDice;
        let damageMod = 0;
        
        if (damageMatch) {
            damageDice = `${damageMatch[1]}d${damageMatch[2]}`;
            if (damageMatch[3]) {
                damageMod = parseInt(damageMatch[3]);
            }
        }
        
        const damageRoll = DiceSystem.damageRoll(damageDice, damageMod);
        DiceSystem.saveRoll('enemy_damage', damageRoll);
        
        if (result.critical) {
            const critDamage = DiceSystem.damageRoll(damageDice, 0);
            damageRoll.total = critDamage.total + damageMod;
            damageRoll.rolls = [...damageRoll.rolls, ...critDamage.rolls];
        }
        
        gameState.character.health -= damageRoll.total;
        if (gameState.character.health < 0) {
            gameState.character.health = 0;
        }
        
        result.hit = true;
        result.damage = damageRoll;
    }
    
    combatState.combatLog.push(result);
    return result;
}

// Process Combat Turn
function processCombatTurn(playerAction, targetIndex = 0) {
    if (!combatState) return null;
    
    const results = [];
    
    // Player turn
    if (combatState.playerTurn) {
        if (playerAction === 'attack') {
            const attackResult = playerAttack(targetIndex);
            if (attackResult) results.push(attackResult);
        }
        // Add more actions: defend, use item, etc.
        
        combatState.playerTurn = false;
    }
    
    // Check if combat is over
    const aliveEnemies = combatState.enemies.filter(e => e.health > 0);
    if (aliveEnemies.length === 0) {
        endCombat(true);
        return { results, victory: true };
    }
    
    // Enemy turns
    if (!combatState.playerTurn) {
        aliveEnemies.forEach((enemy, index) => {
            const originalIndex = combatState.enemies.indexOf(enemy);
            const enemyResult = enemyAttack(originalIndex);
            if (enemyResult) results.push(enemyResult);
        });
        
        combatState.playerTurn = true;
        combatState.round++;
    }
    
    // Check if player is dead
    if (gameState.character.health <= 0) {
        endCombat(false);
        return { results, victory: false, playerDefeated: true };
    }
    
    return { results, victory: false };
}

// Format dice roll for display
function formatDiceRoll(rollResult, type = 'attack') {
    if (type === 'attack' || type === 'skill') {
        const crit = rollResult.roll === 20 ? ' (CRITICAL!)' : '';
        const success = rollResult.success ? '✓' : '✗';
        return `${success} [${rollResult.roll}] + ${rollResult.modifier} = ${rollResult.total} vs ${rollResult.difficulty}${crit}`;
    } else if (type === 'damage') {
        const rollsStr = rollResult.rolls.join(' + ');
        const modStr = rollResult.modifier !== 0 ? ` + ${rollResult.modifier}` : '';
        return `[${rollsStr}]${modStr} = ${rollResult.total} damage`;
    }
    return JSON.stringify(rollResult);
}
