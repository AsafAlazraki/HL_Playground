export function PROBE() {
  const vis = (e) => { const r = e.getBoundingClientRect(); const s = getComputedStyle(e)
    return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none' && s.opacity !== '0' }
  const nm = (e) => {
    const al = e.getAttribute('aria-label'); if (al) return al.trim()
    const lb = e.getAttribute('aria-labelledby')
    if (lb) { const t = lb.split(' ').map(i => (document.getElementById(i) || {}).innerText || '').join(' ').trim(); if (t) return t }
    if (e.id) { const l = document.querySelector('label[for="' + CSS.escape(e.id) + '"]'); if (l) return l.innerText.trim() }
    const wrap = e.closest('label'); if (wrap) return wrap.innerText.trim()
    const t = (e.innerText || '').trim(); if (t) return t
    if (e.getAttribute('title')) return e.getAttribute('title')
    if (e.getAttribute('placeholder')) return '(placeholder) ' + e.getAttribute('placeholder')
    return ''
  }
  const sel = 'a[href],button,input,select,textarea,[tabindex]:not([tabindex="-1"]),[contenteditable="true"]'
  const all = [...document.querySelectorAll(sel)].filter((e) => !e.disabled)
  const tabbable = all.filter(vis)
  const hidden = all.filter((e) => !vis(e))
  const path = (e) => {
    let p = e.tagName.toLowerCase()
    const c = (e.className || '').toString()
    if (c) p += '.' + c.trim().split(' ').filter(Boolean).slice(0, 3).join('.')
    return p
  }
  const clean = (s) => s.split('\n').join(' ').slice(0, 52)
  return {
    landmarks: [...document.querySelectorAll('main,nav,header,footer,aside,[role=main],[role=navigation],[role=banner],[role=complementary],[role=contentinfo],[role=region],[role=search]')].filter(vis).map((e) => ({ tag: e.tagName, role: e.getAttribute('role'), name: e.getAttribute('aria-label') || '' })),
    mainCount: document.querySelectorAll('main,[role=main]').length,
    headings: [...document.querySelectorAll('h1,h2,h3,h4,h5,h6,[role=heading]')].filter(vis).map((e) => ({ lvl: e.tagName.toLowerCase(), txt: clean(e.innerText.trim()) })),
    live: [...document.querySelectorAll('[aria-live],[role=alert],[role=status]')].map((e) => ({ cls: (e.className || '').toString().slice(0, 34), kind: e.getAttribute('aria-live') || e.getAttribute('role'), txt: clean((e.innerText || '').trim()) })),
    tabbableCount: tabbable.length,
    hiddenFocusableCount: hidden.length,
    hiddenFocusable: [...new Set(hidden.map(path))].slice(0, 24),
    unnamed: tabbable.filter((e) => !nm(e)).map(path),
    names: tabbable.map((e) => path(e) + ' :: ' + clean(nm(e))),
  }
}

export async function RINGS() {
  const vis = (e) => { const r = e.getBoundingClientRect(); const s = getComputedStyle(e)
    return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none' }
  const sel = 'a[href],button,input,select,textarea,[tabindex]:not([tabindex="-1"]),[contenteditable="true"]'
  const els = [...document.querySelectorAll(sel)].filter((e) => !e.disabled).filter(vis)
  const snap = (e) => { const s = getComputedStyle(e); return [s.outlineStyle, s.outlineWidth, s.outlineColor, s.boxShadow, s.backgroundColor, s.borderColor, s.borderWidth, s.color].join('|') }
  const bad = []
  for (const e of els) {
    const before = snap(e)
    e.focus()
    await new Promise((r) => setTimeout(r, 0))
    const after = snap(e)
    const st = getComputedStyle(e)
    const hasOutline = st.outlineStyle !== 'none' && parseFloat(st.outlineWidth) > 0
    if (before === after && !hasOutline) {
      let p = e.tagName.toLowerCase()
      const c = (e.className || '').toString()
      if (c) p += '.' + c.trim().split(' ').filter(Boolean).slice(0, 3).join('.')
      const b = e.getBoundingClientRect()
      bad.push({ p, n: (e.getAttribute('aria-label') || e.innerText || '').trim().split('\n').join(' ').slice(0, 40), sz: Math.round(b.width) + 'x' + Math.round(b.height) })
    }
  }
  if (document.activeElement) document.activeElement.blur()
  return { total: els.length, noRing: bad.length, bad }
}

export function SMALL() {
  const vis = (e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(e).visibility !== 'hidden' }
  return [...document.querySelectorAll('a[href],button,input,select,textarea,[tabindex]:not([tabindex="-1"])')].filter((e) => !e.disabled).filter(vis)
    .map((e) => { const r = e.getBoundingClientRect(); const c = (e.className || '').toString()
      return { p: e.tagName.toLowerCase() + '.' + c.trim().split(' ').filter(Boolean).slice(0, 2).join('.'), n: (e.getAttribute('aria-label') || e.innerText || '').trim().split('\n').join(' ').slice(0, 36), w: Math.round(r.width), h: Math.round(r.height) } })
    .filter((x) => x.w < 24 || x.h < 24)
}
