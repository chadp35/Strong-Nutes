// Per-device storage for the AI food scanner's provider + API key, plus the
// optional cross-device sync path. Device-local (localStorage) is the
// default and the safest option — the key never leaves the browser except
// in the one request being made. Someone can opt into syncing a copy to
// their account (same app_state row as everything else, protected by the
// same RLS) if they want it to follow them across devices.

const STORAGE_KEY = 'strongNutes.aiConfig'

export function getLocalAIConfig() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function setLocalAIConfig(config) {
  try {
    if (config) localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
    else localStorage.removeItem(STORAGE_KEY)
  } catch {
    // localStorage unavailable (private browsing, storage full, etc.) —
    // the config just won't persist across reloads; not worth surfacing an
    // error for.
  }
}

// Called once after account state loads. A synced config is the source of
// truth (so a new device automatically picks up what was set elsewhere);
// otherwise whatever's already on this device stands as-is.
export function resolveAIConfig(syncedConfig) {
  if (syncedConfig?.synced && syncedConfig?.apiKey) {
    setLocalAIConfig(syncedConfig)
    return syncedConfig
  }
  return getLocalAIConfig()
}

// Providers the scanner supports, with the exact steps to get a key —
// shown inline in the setup card so someone who's never touched an AI
// provider's dashboard isn't left guessing.
export const AI_PROVIDERS = {
  openai: {
    label: 'OpenAI (GPT-4o)',
    keyPlaceholder: 'sk-...',
    getKeyUrl: 'https://platform.openai.com/api-keys',
    steps: [
      'Go to platform.openai.com and sign up or log in.',
      'Click "API keys" in the left sidebar.',
      'Click "Create new secret key," name it anything (e.g. "Strong Nutes"), then copy it — you won\'t be able to see it again after this.',
      'Paste it below. New accounts usually get a small free trial credit; after that it\'s pay-as-you-go, typically a few cents per scan.',
    ],
  },
  anthropic: {
    label: 'Anthropic (Claude)',
    keyPlaceholder: 'sk-ant-...',
    getKeyUrl: 'https://console.anthropic.com/settings/keys',
    steps: [
      'Go to console.anthropic.com and sign up or log in.',
      'Go to Settings > API Keys.',
      'Click "Create Key," name it anything, then copy it.',
      'Paste it below. You\'ll likely need to add a small amount of billing credit first — a few dollars covers a lot of scans.',
    ],
  },
  gemini: {
    label: 'Google (Gemini)',
    keyPlaceholder: 'AIza...',
    getKeyUrl: 'https://aistudio.google.com/apikey',
    steps: [
      'Go to aistudio.google.com/apikey and sign in with a Google account.',
      'Click "Create API key."',
      'Copy the key it generates.',
      'Paste it below. Gemini has a genuinely free daily quota — a good option if you\'d rather not add a card anywhere.',
    ],
  },
}
