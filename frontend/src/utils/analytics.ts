let inited = false

interface UmamiTrackCtx {
  website: string
  language: string
}

interface Umami {
  track: (fn: (ctx: UmamiTrackCtx) => Record<string, unknown>) => void
}

function getUmami(): Umami | undefined {
  return (globalThis as { umami?: Umami }).umami
}

/**
 * load umami analytics module
 */
export const loadModule = async (allowTrack = true): Promise<void> => {
  await new Promise<void>((resolve, reject) => {
    const script = document.createElement('script')
    script.setAttribute('src', 'https://analytics.tinycraft.cc/script.js')
    script.setAttribute('data-website-id', 'ad6de51d-1e27-44a5-958d-319679c56aec')
    script.setAttribute('data-cache', 'true')
    script.setAttribute('data-auto-track', allowTrack !== false ? 'true' : 'false')
    script.onload = () => {
      inited = true
      resolve()
    }
    script.onerror = () => {
      inited = false
      reject(new Error('analytics script load failed'))
    }
    document.body.appendChild(script)
  })
}

const enable = (): boolean => {
  return inited && getUmami() !== undefined
}

export const trackEvent = async (event: string, data: unknown, _force?: boolean): Promise<void> => {
  const u = getUmami()
  if ((enable() || event === 'startup') && u) {
    u.track(({ website, language }: UmamiTrackCtx) => ({
      language,
      website,
      name: event,
      data,
    }))
  }
}
