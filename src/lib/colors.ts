/** Vibrant neon-friendly hex colors for player tiles */
export const NEON_PALETTE = [
  '#ff2a6d',
  '#05d9e8',
  '#d1f517',
  '#c44cff',
  '#ff6b35',
  '#00ff9f',
  '#fffc00',
  '#ff00aa',
  '#00b4ff',
  '#7cff00',
  '#ff4d00',
  '#b967ff',
] as const

export function colorForPlayerIndex(index: number): string {
  return NEON_PALETTE[index % NEON_PALETTE.length]!
}
