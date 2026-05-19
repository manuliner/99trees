<script setup lang="ts">
type Suit = 'spades' | 'hearts' | 'diamonds' | 'clubs'

const props = defineProps<{
  /** When true, physics + spawning run. When false, last frame stays visible (paused). */
  active: boolean
}>()

const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'] as const
const SUITS: Suit[] = ['spades', 'hearts', 'diamonds', 'clubs']
const SUIT_SYMBOL: Record<Suit, string> = {
  spades: '♠',
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣',
}

const MAX_CARDS = 52
const SPAWN_INTERVAL_MS = 88
const CARD_W = 42
const CARD_H = 58
const GRAVITY = 0.42
const BOUNCE_RESTITUTION = 0.72
const WALL_RESTITUTION = 0.62

function pixelColor(name: string, fallback: string): string {
  if (import.meta.server) return fallback
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  return value || fallback
}

type CardParticle = {
  suit: Suit
  rank: string
  x: number
  y: number
  vx: number
  vy: number
  rotation: number
  vr: number
  active: boolean
}

const canvasRef = ref<HTMLCanvasElement | null>(null)

let rafId = 0
let running = false
let lastTs = 0
let spawnAccum = 0
let spawned = 0
let particles: CardParticle[] = []
let viewW = 0
let viewH = 0
let dpr = 1

function randomRank(): string {
  return RANKS[Math.floor(Math.random() * RANKS.length)]!
}

function randomSuit(): Suit {
  return SUITS[Math.floor(Math.random() * SUITS.length)]!
}

function spawnCard() {
  if (spawned >= MAX_CARDS || viewW === 0) return
  const pile = spawned % 4
  const pileX = viewW * (0.02 + pile * 0.052)
  const pileY = viewH * (0.01 + (pile % 2) * 0.025)
  const angle = 0.15 + pile * 0.35 + (Math.random() - 0.5) * 0.45
  const speed = 5.5 + Math.random() * 5.5
  particles.push({
    suit: randomSuit(),
    rank: randomRank(),
    x: pileX + (Math.random() - 0.5) * 14,
    y: pileY + (Math.random() - 0.5) * 6,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    rotation: (Math.random() - 0.5) * 0.35,
    vr: (Math.random() - 0.5) * 0.04,
    active: true,
  })
  spawned++
}

function resizeCanvas() {
  const canvas = canvasRef.value
  if (!canvas) return
  const parent = canvas.parentElement
  if (!parent) return
  dpr = Math.min(window.devicePixelRatio || 1, 2)
  viewW = parent.clientWidth
  viewH = parent.clientHeight
  canvas.width = Math.floor(viewW * dpr)
  canvas.height = Math.floor(viewH * dpr)
  canvas.style.width = `${viewW}px`
  canvas.style.height = `${viewH}px`
}

function fillFelt(ctx: CanvasRenderingContext2D) {
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.fillStyle = pixelColor('--pixel-forest-mid', '#4a7c59')
  ctx.fillRect(0, 0, viewW, viewH)
}

function drawCardFace(ctx: CanvasRenderingContext2D, p: CardParticle) {
  const red = p.suit === 'hearts' || p.suit === 'diamonds'
  const color = red
    ? pixelColor('--pixel-dice-pip-accent', '#c62828')
    : pixelColor('--pixel-forest-dark', '#1a1c2c')
  const suit = SUIT_SYMBOL[p.suit]

  ctx.save()
  ctx.translate(p.x + CARD_W / 2, p.y + CARD_H / 2)
  ctx.rotate(p.rotation)
  ctx.translate(-CARD_W / 2, -CARD_H / 2)

  ctx.fillStyle = pixelColor('--pixel-cream', '#f4f1de')
  ctx.strokeStyle = pixelColor('--pixel-forest-dark', '#1a1c2c')
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.roundRect(0, 0, CARD_W, CARD_H, 3)
  ctx.fill()
  ctx.stroke()

  ctx.fillStyle = color
  ctx.font = 'bold 11px Georgia, "Times New Roman", serif'
  ctx.textAlign = 'left'
  ctx.textBaseline = 'top'
  ctx.fillText(p.rank, 5, 4)
  ctx.font = '10px Georgia, serif'
  ctx.fillText(suit, 5, 15)

  ctx.save()
  ctx.translate(CARD_W, CARD_H)
  ctx.rotate(Math.PI)
  ctx.fillText(p.rank, 5, 4)
  ctx.fillText(suit, 5, 15)
  ctx.restore()

  ctx.font = '22px Georgia, serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.globalAlpha = 0.28
  ctx.fillText(suit, CARD_W / 2, CARD_H / 2)
  ctx.globalAlpha = 1

  ctx.restore()
}

function stepPhysics() {
  const floor = viewH - CARD_H - 4
  const ceiling = -CARD_H * 0.5
  const rightWall = viewW - CARD_W

  for (const p of particles) {
    if (!p.active) continue

    p.vy += GRAVITY
    p.x += p.vx
    p.y += p.vy
    p.rotation += p.vr

    if (p.y > floor) {
      p.y = floor
      p.vy *= -BOUNCE_RESTITUTION
      p.vx *= 0.98
      if (Math.abs(p.vy) < 0.9) {
        p.vy = 0
        p.vr *= 0.85
      }
    }

    if (p.y < ceiling && p.vy < 0) {
      p.y = ceiling
      p.vy *= -0.5
    }

    if (p.x > rightWall) {
      p.x = rightWall
      p.vx *= -WALL_RESTITUTION
    }
    if (p.x < 0) {
      p.x = 0
      p.vx *= -WALL_RESTITUTION
    }

    if (p.x > viewW + 30 || (p.y > viewH + 20 && Math.abs(p.vy) < 1)) {
      p.active = false
    }
  }
}

function hasActiveParticles() {
  return particles.some((p) => p.active)
}

function frame(ts: number) {
  if (!running) return

  const canvas = canvasRef.value
  if (!canvas) {
    pause()
    return
  }
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    pause()
    return
  }

  const dt = lastTs ? Math.min(ts - lastTs, 32) : 16
  lastTs = ts
  spawnAccum += dt
  while (spawnAccum >= SPAWN_INTERVAL_MS && spawned < MAX_CARDS) {
    spawnAccum -= SPAWN_INTERVAL_MS
    spawnCard()
  }

  const steps = Math.max(1, Math.round(dt / 16))
  for (let i = 0; i < steps; i++) stepPhysics()

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

  for (const p of particles) {
    if (p.active) drawCardFace(ctx, p)
  }

  if (spawned >= MAX_CARDS && !hasActiveParticles()) {
    pause()
    return
  }

  if (running) rafId = requestAnimationFrame(frame)
}

function pause() {
  running = false
  cancelAnimationFrame(rafId)
  rafId = 0
}

function resetAndStart() {
  pause()
  running = true
  particles = []
  spawned = 0
  spawnAccum = 0
  lastTs = 0
  resizeCanvas()

  const canvas = canvasRef.value
  const ctx = canvas?.getContext('2d')
  if (ctx) {
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.clearRect(0, 0, canvas!.width, canvas!.height)
    fillFelt(ctx)
  }

  rafId = requestAnimationFrame(frame)
}

function destroy() {
  pause()
  particles = []
  spawned = 0
}

watch(
  () => props.active,
  (active) => {
    if (active) resetAndStart()
    else pause()
  },
  { immediate: true },
)

onMounted(() => {
  resizeCanvas()
  window.addEventListener('resize', resizeCanvas)
})

onUnmounted(() => {
  destroy()
  window.removeEventListener('resize', resizeCanvas)
})
</script>

<template>
  <div class="goal-rain-classic" aria-hidden="true">
    <canvas ref="canvasRef" class="goal-rain-classic__canvas" />
  </div>
</template>

<style scoped>
.goal-rain-classic {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: var(--pixel-forest-mid);
}

.goal-rain-classic__canvas {
  display: block;
  width: 100%;
  height: 100%;
}
</style>
