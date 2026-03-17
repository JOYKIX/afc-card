const TOTAL_CARDS = 51;
const BOOSTER_COST = 50;
const CARDS_PER_BOOSTER = 5;
const SAVE_KEY = 'afc-card-save-v2';

const rarityWeights = {
    SSS: 0.04,
    SPlus: 0.4,
    S: 3.8,
    A: 9.6,
    B: 19.2,
    C: 28.7,
    D: 38.3,
};

const sellPriceByRarity = {
    SSS: 100,
    SPlus: 75,
    S: 50,
    A: 25,
    B: 15,
    C: 10,
    D: 5,
};

const cardRarities = [
    'SSS', 'A', 'SPlus', 'D', 'D', 'C', 'S', 'A', 'D', 'A',
    'D', 'S', 'C', 'A', 'A', 'SPlus', 'S', 'C', 'D', 'SPlus',
    'A', 'S', 'B', 'B', 'A', 'D', 'D', 'SSS', 'SPlus', 'S',
    'S', 'B', 'SPlus', 'A', 'S', 'S', 'S', 'C', 'B', 'SSS',
    'S', 'A', 'B', 'S', 'C', 'S', 'A', 'S', 'B', 'S', 'SSS',
];

const rarityOrder = ['SSS', 'SPlus', 'S', 'A', 'B', 'C', 'D'];
const cardsByRarity = rarityOrder.reduce((acc, rarity) => {
    acc[rarity] = [];
    return acc;
}, {});

cardRarities.forEach((rarity, id) => cardsByRarity[rarity].push(id));

const elements = {
    currencyDisplay: document.getElementById('currencyDisplay'),
    uniqueDisplay: document.getElementById('uniqueDisplay'),
    totalDisplay: document.getElementById('totalDisplay'),
    progressDisplay: document.getElementById('progressDisplay'),
    openBoosterBtn: document.getElementById('openBoosterBtn'),
    sellDuplicatesBtn: document.getElementById('sellDuplicatesBtn'),
    resetBtn: document.getElementById('resetBtn'),
    boosterContainer: document.getElementById('boosterContainer'),
    albumContainer: document.getElementById('albumContainer'),
};

const defaultState = {
    currency: 500,
    owned: Array(TOTAL_CARDS).fill(0),
};

let state = loadState();

function loadState() {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return structuredClone(defaultState);

    try {
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed.owned) || parsed.owned.length !== TOTAL_CARDS) {
            return structuredClone(defaultState);
        }

        return {
            currency: Number.isFinite(parsed.currency) ? parsed.currency : defaultState.currency,
            owned: parsed.owned.map((count) => Math.max(0, Number(count) || 0)),
        };
    } catch {
        return structuredClone(defaultState);
    }
}

function saveState() {
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
}

function getTotalCards() {
    return state.owned.reduce((sum, count) => sum + count, 0);
}

function getUniqueCards() {
    return state.owned.filter((count) => count > 0).length;
}

function getProgressPercent() {
    return Math.round((getUniqueCards() / TOTAL_CARDS) * 100);
}

function pickRarity() {
    const totalWeight = rarityOrder.reduce((sum, rarity) => sum + rarityWeights[rarity], 0);
    let roll = Math.random() * totalWeight;

    for (const rarity of rarityOrder) {
        roll -= rarityWeights[rarity];
        if (roll <= 0) return rarity;
    }

    return 'D';
}

function drawCardId() {
    const rarity = pickRarity();
    const pool = cardsByRarity[rarity];
    const randomIndex = Math.floor(Math.random() * pool.length);
    return pool[randomIndex];
}

function imagePath(cardId, side = 'Front') {
    return `Card${cardId} (${side}).jpg`;
}

function renderStats() {
    const unique = getUniqueCards();
    elements.currencyDisplay.textContent = state.currency.toString();
    elements.uniqueDisplay.textContent = `${unique} / ${TOTAL_CARDS}`;
    elements.totalDisplay.textContent = getTotalCards().toString();
    elements.progressDisplay.textContent = `${getProgressPercent()}%`;

    elements.openBoosterBtn.disabled = state.currency < BOOSTER_COST;
}

function createBoosterCard(cardId) {
    const wrapper = document.createElement('article');
    wrapper.className = 'card';

    const image = new Image();
    image.src = imagePath(cardId, 'Front');
    image.alt = `Carte #${cardId}`;

    const footer = document.createElement('div');
    footer.className = 'card-footer';
    footer.innerHTML = `<span>#${cardId}</span><span class="badge">${cardRarities[cardId]}</span>`;

    wrapper.append(image, footer);
    return wrapper;
}

function renderBooster(cardIds) {
    elements.boosterContainer.replaceChildren();
    cardIds.forEach((cardId) => elements.boosterContainer.appendChild(createBoosterCard(cardId)));
}

function createAlbumCard(cardId) {
    const ownedCount = state.owned[cardId];
    const card = document.createElement('article');
    card.className = `album-card ${ownedCount > 0 ? 'unlocked' : 'locked'}`;

    const image = new Image();
    image.src = ownedCount > 0 ? imagePath(cardId, 'Front') : imagePath(cardId, 'Back');
    image.alt = `Carte album #${cardId}`;

    const count = document.createElement('span');
    count.className = `count ${ownedCount > 0 ? 'positive' : ''}`;
    count.textContent = ownedCount.toString();

    card.append(image, count);
    return card;
}

function renderAlbum() {
    elements.albumContainer.replaceChildren();
    for (let cardId = 0; cardId < TOTAL_CARDS; cardId += 1) {
        elements.albumContainer.appendChild(createAlbumCard(cardId));
    }
}

function openBooster() {
    if (state.currency < BOOSTER_COST) return;

    state.currency -= BOOSTER_COST;
    const drawnCards = [];

    for (let i = 0; i < CARDS_PER_BOOSTER; i += 1) {
        const cardId = drawCardId();
        state.owned[cardId] += 1;
        drawnCards.push(cardId);
    }

    saveState();
    renderBooster(drawnCards);
    renderStats();
    renderAlbum();
}

function sellDuplicates() {
    let gain = 0;

    state.owned = state.owned.map((count, cardId) => {
        if (count <= 1) return count;

        const extras = count - 1;
        const rarity = cardRarities[cardId];
        gain += extras * sellPriceByRarity[rarity];
        return 1;
    });

    if (gain === 0) return;

    state.currency += gain;
    saveState();
    renderStats();
    renderAlbum();
}

function resetProgress() {
    state = structuredClone(defaultState);
    saveState();
    elements.boosterContainer.replaceChildren();
    renderStats();
    renderAlbum();
}

function init() {
    elements.openBoosterBtn.addEventListener('click', openBooster);
    elements.sellDuplicatesBtn.addEventListener('click', sellDuplicates);
    elements.resetBtn.addEventListener('click', resetProgress);

    renderStats();
    renderAlbum();
}

init();
