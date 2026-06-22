export function formatBlc(n: number) {
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
}

export function formatTimer(sec: number) {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function cn(...classes: (string | false | undefined)[]) {
  return classes.filter(Boolean).join(' ')
}
