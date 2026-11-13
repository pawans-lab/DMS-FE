import { useEffect, useRef } from 'react'

// Logo palette: yellow, orange, red, golden highlight.
const LOGO_COLORS = [
  [255, 190, 0],
  [255, 145, 0],
  [244, 75, 65],
  [255, 205, 35],
]
const SPACING = 27
const LINK_DIST = 34
const ALPHA_LEVELS = 4 // link lines are batched by (colour, alpha bucket) → few stroke() calls per frame
/** Interactive particle-wave background: particles gently ripple away from the pointer. */
export default function ParticleBackground() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const pointer = { x: -1000, y: -1000, active: false }
    let width = 0, height = 0, cols = 0, particles = [], raf = 0, resizeTimer = 0
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    function createParticles() {
      particles = []
      cols = Math.ceil(width / SPACING) + 2
      const rows = Math.ceil(height / SPACING) + 2
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const x = col * SPACING - SPACING
          const y = row * SPACING - SPACING
          const phase = Math.random() * Math.PI * 2
          particles.push({
            x, y, baseX: x, baseY: y, phase,
            size: Math.random() * 1.15 + 0.45,
            ci: Math.floor((phase / (Math.PI * 2)) * LOGO_COLORS.length) % LOGO_COLORS.length,
            glow: 0,
          })
        }
      }
    }

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5)
      width = window.innerWidth
      height = window.innerHeight
      canvas.width = Math.floor(width * dpr)
      canvas.height = Math.floor(height * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      createParticles()
    }

    // One reusable path list per (colour, alpha bucket).
    const buckets = Array.from({ length: LOGO_COLORS.length * ALPHA_LEVELS }, () => [])

    function link(a, b) {
      const dist = Math.hypot(a.x - b.x, a.y - b.y)
      if (dist >= LINK_DIST) return
      const level = Math.min(ALPHA_LEVELS - 1, Math.floor((1 - dist / LINK_DIST) * ALPHA_LEVELS))
      buckets[a.ci * ALPHA_LEVELS + level].push(a.x, a.y, b.x, b.y)
    }

    function draw(time) {
      ctx.clearRect(0, 0, width, height)
      const t = time * 0.00035

      for (const p of particles) {
        const driftX = reducedMotion ? 0 : Math.sin(t + p.phase) * 13
        const driftY = reducedMotion ? 0 : Math.sin(t * 0.72 + p.phase * 1.4) * 16
          - ((time * 0.012 + p.phase * 18) % 34)
        let dx = p.baseX + driftX
        let dy = p.baseY + driftY
        if (dy < -24) dy += height + 48

        if (pointer.active && !reducedMotion) {
          const mx = dx - pointer.x
          const my = dy - pointer.y
          const dist = Math.hypot(mx, my)
          if (dist < 210 && dist > 0.01) {
            const influence = (1 - dist / 210) ** 2
            const orbit = Math.sin(t * 3.2 + p.phase) * 10
            dx += (mx / dist) * (25 * influence + orbit * influence)
            dy += (my / dist) * (25 * influence + orbit * influence) - 34 * influence
          }
        }

        p.x += (dx - p.x) * 0.075
        p.y += (dy - p.y) * 0.075
        p.glow = pointer.active ? Math.max(0, 1 - Math.hypot(p.x - pointer.x, p.y - pointer.y) / 230) : 0
      }

      // Links: particles sit on a grid, so only grid neighbours can be within LINK_DIST.
      // Checking 4 neighbours per particle is O(n) instead of the O(n²) all-pairs loop.
      const n = particles.length
      for (let i = 0; i < n; i++) {
        const a = particles[i]
        const col = i % cols
        if (col + 1 < cols) link(a, particles[i + 1])
        if (i + cols < n) {
          link(a, particles[i + cols])
          if (col + 1 < cols) link(a, particles[i + cols + 1])
          if (col > 0) link(a, particles[i + cols - 1])
        }
      }
      ctx.lineWidth = 0.65
      for (let k = 0; k < buckets.length; k++) {
        const seg = buckets[k]
        if (!seg.length) continue
        const [r, g, b] = LOGO_COLORS[Math.floor(k / ALPHA_LEVELS)]
        const alpha = (((k % ALPHA_LEVELS) + 0.5) / ALPHA_LEVELS) * 0.09
        ctx.strokeStyle = `rgba(${r},${g},${b},${alpha})`
        ctx.beginPath()
        for (let s = 0; s < seg.length; s += 4) {
          ctx.moveTo(seg[s], seg[s + 1])
          ctx.lineTo(seg[s + 2], seg[s + 3])
        }
        ctx.stroke()
        seg.length = 0
      }

      // Dots: crisp solid circles, no shadow/halo. Resting dots are batched into one path per
      // colour; only the few dots near the pointer (glowing) are drawn individually.
      const TAU = Math.PI * 2
      for (let ci = 0; ci < LOGO_COLORS.length; ci++) {
        ctx.fillStyle = `rgba(${LOGO_COLORS[ci].join(',')}, .38)`
        ctx.beginPath()
        for (const p of particles) {
          if (p.ci !== ci || p.glow > 0) continue
          ctx.moveTo(p.x + p.size, p.y)
          ctx.arc(p.x, p.y, p.size, 0, TAU)
        }
        ctx.fill()
      }
      for (const p of particles) {
        if (p.glow <= 0) continue
        const color = LOGO_COLORS[p.ci].map((v) => Math.min(255, Math.round(v + (255 - v) * p.glow * 0.25)))
        ctx.fillStyle = `rgba(${color.join(',')}, ${0.38 + p.glow * 0.55})`
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size + p.glow * 1.8, 0, TAU)
        ctx.fill()
      }

      if (!reducedMotion) raf = requestAnimationFrame(draw)
    }

    const onResize = () => {
      clearTimeout(resizeTimer)
      resizeTimer = setTimeout(resize, 120)
    }
    const onMove = (e) => { pointer.x = e.clientX; pointer.y = e.clientY; pointer.active = true }
    const onLeave = () => { pointer.active = false }

    window.addEventListener('resize', onResize, { passive: true })
    window.addEventListener('pointermove', onMove, { passive: true })
    document.addEventListener('pointerleave', onLeave, { passive: true })
    window.addEventListener('blur', onLeave)
    resize()
    if (reducedMotion) draw(0)
    else {
      raf = requestAnimationFrame((t0) => {
        canvas.classList.add('is-ready') // fade in once the first frame exists (no pop/stutter on load)
        draw(t0)
      })
    }

    return () => {
      cancelAnimationFrame(raf)
      clearTimeout(resizeTimer)
      window.removeEventListener('resize', onResize)
      window.removeEventListener('pointermove', onMove)
      document.removeEventListener('pointerleave', onLeave)
      window.removeEventListener('blur', onLeave)
    }
  }, [])

  return <canvas ref={canvasRef} className="lx-canvas" aria-hidden="true" />
}
