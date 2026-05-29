const GEM_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="28" height="28">
  <polygon points="24,4 38,16 10,16" fill="#4f83ff"/>
  <polygon points="10,16 24,44 4,20" fill="#1a73e8"/>
  <polygon points="38,16 24,44 44,20" fill="#0f62fe"/>
  <polygon points="10,16 38,16 24,44" fill="#2563eb"/>
  <polygon points="20,10 28,10 24,18" fill="#ffffff" opacity="0.8"/>
</svg>`

const GEM_LOGO_URL = chrome.runtime.getURL('logo_3.png')

const GEM_DISABLED_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="28" height="28">
  <polygon points="24,4 38,16 10,16" fill="#cbd5e1"/>
  <polygon points="10,16 24,44 4,20" fill="#e5e7eb"/>
  <polygon points="38,16 24,44 44,20" fill="#d1d5db"/>
  <polygon points="10,16 38,16 24,44" fill="#e2e8f0"/>
  <polygon points="20,10 28,10 24,18" fill="#ffffff" opacity="0.8"/>
  <line x1="8" y1="8" x2="40" y2="40" stroke="#d93025" stroke-width="3" stroke-linecap="round" opacity="0.8"/>
</svg>`

const DISABLED_BADGE = 'SITE OFF'

const PROGRESS_SIZE = 36
const PROGRESS_RADIUS = 14
const PROGRESS_CIRCUMFERENCE = 2 * Math.PI * PROGRESS_RADIUS

function createProgressRing(): SVGSVGElement {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  svg.setAttribute('viewBox', `0 0 ${PROGRESS_SIZE} ${PROGRESS_SIZE}`)
  svg.setAttribute('width', String(PROGRESS_SIZE))
  svg.setAttribute('height', String(PROGRESS_SIZE))
  Object.assign(svg.style, {
    position: 'absolute',
    top: '0',
    left: '0',
    transform: 'rotate(-90deg)',
    pointerEvents: 'none',
  })

  const bgCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
  bgCircle.setAttribute('cx', String(PROGRESS_SIZE / 2))
  bgCircle.setAttribute('cy', String(PROGRESS_SIZE / 2))
  bgCircle.setAttribute('r', String(PROGRESS_RADIUS))
  bgCircle.setAttribute('fill', 'none')
  bgCircle.setAttribute('stroke', 'rgba(26, 115, 232, 0.16)')
  bgCircle.setAttribute('stroke-width', '3')
  svg.appendChild(bgCircle)

  const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
  circle.setAttribute('cx', String(PROGRESS_SIZE / 2))
  circle.setAttribute('cy', String(PROGRESS_SIZE / 2))
  circle.setAttribute('r', String(PROGRESS_RADIUS))
  circle.setAttribute('fill', 'none')
  circle.setAttribute('stroke', '#1a73e8')
  circle.setAttribute('stroke-width', '3')
  circle.setAttribute('stroke-linecap', 'round')
  circle.setAttribute('stroke-dasharray', String(PROGRESS_CIRCUMFERENCE))
  circle.setAttribute('stroke-dashoffset', String(PROGRESS_CIRCUMFERENCE))
  circle.style.transition = 'stroke-dashoffset 0.3s ease'
  circle.id = 'gem-progress-arc'
  svg.appendChild(circle)

  return svg
}

export function createGemIcon(onClick: () => void): HTMLElement {
  const container = document.createElement('div')
  container.id = 'gemma-gem-icon'
  container.title = 'Gemma Gem'

  Object.assign(container.style, {
    position: 'fixed',
    bottom: '20px',
    right: '20px',
    width: `${PROGRESS_SIZE}px`,
    height: `${PROGRESS_SIZE}px`,
    cursor: 'pointer',
    zIndex: '2147483646',
    borderRadius: '50%',
    background: 'rgba(255, 255, 255, 0.98)',
    border: '1px solid #dfe3eb',
    boxShadow: '0 4px 10px rgba(15, 23, 42, 0.12)',
    transition: 'transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  })

  const gemWrapper = document.createElement('div')
  gemWrapper.className = 'gem-icon-mark'
  Object.assign(gemWrapper.style, {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    zIndex: '1',
    width: '100%',
    height: '100%',
  })
  const gemImage = document.createElement('img')
  gemImage.src = GEM_LOGO_URL
  gemImage.alt = 'Build with Gemma'
  gemImage.loading = 'eager'
  gemImage.decoding = 'async'
  Object.assign(gemImage.style, {
    width: '72%',
    height: '72%',
    objectFit: 'contain',
    display: 'block',
  })
  gemImage.addEventListener('error', () => {
    gemWrapper.innerHTML = GEM_SVG
  })
  gemWrapper.appendChild(gemImage)
  container.appendChild(gemWrapper)

  const progressRing = createProgressRing()
  container.appendChild(progressRing)

  const disabledBadge = document.createElement('div')
  disabledBadge.id = 'gemma-gem-disabled-badge'
  disabledBadge.textContent = DISABLED_BADGE
  Object.assign(disabledBadge.style, {
    position: 'absolute',
    top: '-7px',
    right: '-8px',
    transform: 'none',
    padding: '3px 7px',
    borderRadius: '999px',
    background: '#d93025',
    border: '1px solid #ffffff',
    color: '#ffffff',
    fontSize: '9px',
    fontWeight: '800',
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    whiteSpace: 'nowrap',
    pointerEvents: 'none',
    opacity: '0',
    transition: 'opacity 0.2s ease',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.18)',
    zIndex: '2',
  })
  container.appendChild(disabledBadge)

  container.addEventListener('mouseenter', () => {
    container.style.transform = 'scale(1.08)'
    container.style.boxShadow = '0 8px 20px rgba(15, 23, 42, 0.16)'
    container.style.borderColor = '#cbd5e1'
  })

  container.addEventListener('mouseleave', () => {
    container.style.transform = 'scale(1)'
    container.style.boxShadow = '0 4px 10px rgba(15, 23, 42, 0.12)'
    container.style.borderColor = '#dfe3eb'
  })

  container.addEventListener('click', onClick)

  return container
}

export function setGemDisabled(disabled: boolean): void {
  const container = document.getElementById('gemma-gem-icon')
  if (!container) return

  const gemWrapper = container.querySelector('.gem-icon-mark') as HTMLElement | null
  if (gemWrapper) {
    gemWrapper.innerHTML = disabled ? GEM_DISABLED_SVG : `<img src="${GEM_LOGO_URL}" alt="Build with Gemma" loading="eager" decoding="async" style="width:72%;height:72%;object-fit:contain;display:block;">`
  }

  const badge = document.getElementById('gemma-gem-disabled-badge')
  if (badge) {
    badge.style.opacity = disabled ? '1' : '0'
  }

  container.title = disabled ? 'Build with Gemma (disabled on this site)' : 'Build with Gemma'
  container.style.boxShadow = disabled
    ? '0 4px 12px rgba(217, 48, 37, 0.16)'
    : '0 4px 10px rgba(15, 23, 42, 0.12)'
  container.style.background = disabled
    ? '#ffffff'
    : 'rgba(255, 255, 255, 0.98)'
  container.style.borderColor = disabled
    ? '#fca5a5'
    : '#dfe3eb'
  container.style.outline = disabled
    ? '2px solid rgba(217, 48, 37, 0.4)'
    : 'none'
  container.style.opacity = '1'
}

/** Update progress ring: 0-100, or -1 to hide */
export function updateGemProgress(progress: number): void {
  const arc = document.getElementById('gemma-gem-icon')?.querySelector('#gem-progress-arc') as SVGCircleElement | null
  if (!arc) return

  const svg = arc.parentElement as SVGSVGElement | null

  if (progress < 0 || progress >= 100) {
    if (svg) svg.style.opacity = '0'
    return
  }

  if (svg) svg.style.opacity = '1'
  const offset = PROGRESS_CIRCUMFERENCE - (progress / 100) * PROGRESS_CIRCUMFERENCE
  arc.setAttribute('stroke-dashoffset', String(offset))
}
