/**
 * DiceBear Adventurer Avatar Utility
 * Reference: https://www.dicebear.com/styles/adventurer/
 */

export const ADVENTURER_BASE_URL = 'https://api.dicebear.com/10.x/adventurer/svg';

export const AVATAR_PALETTES = [
    { id: 'pastel', label: 'Pastel Wall', colors: 'b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf' },
    { id: 'vibrant', label: 'Vibrant', colors: 'ffadad,ffd6a5,fdffb6,caffbf,9bf6ff,a0c4ff,bdb2ff,ffc6ff' },
    { id: 'warm', label: 'Warm Glow', colors: 'fcd34d,f87171,fb923c,f43f5e' },
    { id: 'cool', label: 'Ocean Cool', colors: '38bdf8,818cf8,67e8f9,a5f3fc' },
    { id: 'sunset', label: 'Sunset', colors: 'fdba74,f472b6,c084fc' },
    { id: 'clean', label: 'Minimal / Clean', colors: 'f1f5f9,e2e8f0,f8fafc' },
];

export const PRESET_AVATARS = [
    { name: 'Alex', seed: 'Alex', options: { backgroundColor: 'b6e3f4' } },
    { name: 'Jordan', seed: 'Jordan', options: { backgroundColor: 'ffd5dc', glassesProbability: 100 } },
    { name: 'Taylor', seed: 'Taylor', options: { backgroundColor: 'c0aede' } },
    { name: 'Morgan', seed: 'Morgan', options: { backgroundColor: 'ffdfbf', hair: 'short04' } },
    { name: 'Sam', seed: 'Sam', options: { backgroundColor: 'd1d4f9', glassesProbability: 100 } },
    { name: 'Riley', seed: 'Riley', options: { backgroundColor: '9bf6ff' } },
    { name: 'Casey', seed: 'Casey', options: { backgroundColor: 'ffd6a5' } },
    { name: 'Dakota', seed: 'Dakota', options: { backgroundColor: 'ffc6ff', glassesProbability: 100 } },
    { name: 'Quinn', seed: 'Quinn', options: { backgroundColor: 'fdba74' } },
    { name: 'Avery', seed: 'Avery', options: { backgroundColor: '38bdf8' } },
    { name: 'Kai', seed: 'Kai', options: { backgroundColor: 'caffbf' } },
    { name: 'River', seed: 'River', options: { backgroundColor: 'e2e8f0', glassesProbability: 100 } },
];

/**
 * Builds a DiceBear Adventurer SVG URL with query parameters.
 * @param {string} seed
 * @param {object} options
 * @returns {string}
 */
export function getAdventurerAvatarUrl(seed = 'kart_user', options = {}) {
    const cleanSeed = encodeURIComponent(String(seed || 'kart_user').trim());
    const params = new URLSearchParams({ seed: cleanSeed });

    if (options.backgroundColor) {
        params.set('backgroundColor', options.backgroundColor.replace(/#/g, ''));
    }
    if (options.glassesProbability !== undefined) {
        params.set('glassesProbability', String(options.glassesProbability));
    }
    if (options.hair) {
        params.set('hair', options.hair);
    }
    if (options.skinColor) {
        params.set('skinColor', options.skinColor.replace(/#/g, ''));
    }
    if (options.hairColor) {
        params.set('hairColor', options.hairColor.replace(/#/g, ''));
    }
    if (options.radius !== undefined) {
        params.set('radius', String(options.radius));
    }

    return `${ADVENTURER_BASE_URL}?${params.toString()}`;
}

/**
 * Checks if a string is a legacy Gravatar URL.
 */
export function isGravatarUrl(url) {
    if (!url || typeof url !== 'string') return false;
    return url.includes('gravatar.com/avatar');
}

/**
 * Resolves an avatar URL for a given profile or user object.
 * If avatar_url is missing, empty, or a Gravatar placeholder, returns
 * a deterministic DiceBear Adventurer SVG URL based on user identifier.
 * 
 * @param {object|string} userOrProfile - User/Profile object or avatar string
 * @param {string} [fallbackSeed] - Optional fallback seed
 * @returns {string}
 */
export function getAvatarUrl(userOrProfile, fallbackSeed = '') {
    if (typeof userOrProfile === 'string') {
        if (userOrProfile && !isGravatarUrl(userOrProfile)) {
            return userOrProfile;
        }
        return getAdventurerAvatarUrl(fallbackSeed || 'kart_user', { backgroundColor: 'b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf' });
    }

    const currentUrl = userOrProfile?.avatar_url || userOrProfile?.avatarUrl;
    if (currentUrl && !isGravatarUrl(currentUrl)) {
        return currentUrl;
    }

    const seed = userOrProfile?.id || 
                 userOrProfile?.username || 
                 userOrProfile?.display_name || 
                 userOrProfile?.email || 
                 fallbackSeed || 
                 'kart_user';

    return getAdventurerAvatarUrl(seed, { backgroundColor: 'b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf' });
}
