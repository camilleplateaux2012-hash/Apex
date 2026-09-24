/**
 * Système de Calcul des Statistiques et Rangs de Combat
 */

import type { PlayerStats } from '../types/game.ts';

export interface RankTier {
  name: string;
  minScore: number;
  badgeColor: string;
  textColor: string;
}

export const CYBER_RANKS: RankTier[] = [
  { name: 'ROOKIE', minScore: 0, badgeColor: '#64748b', textColor: '#94a3b8' },
  { name: 'NEON OPERATIVE', minScore: 500, badgeColor: '#00f0ff', textColor: '#38bdf8' },
  { name: 'CYBER ENFORCER', minScore: 1200, badgeColor: '#ff007f', textColor: '#f43f5e' },
  { name: 'GHOST INFILTRATOR', minScore: 2500, badgeColor: '#a855f7', textColor: '#c084fc' },
  { name: 'NETRUNNER PRIME', minScore: 5000, badgeColor: '#ffaa00', textColor: '#fbbf24' },
];

export class StatsSystem {
  public static calculateKDRatio(kills: number, deaths: number): number {
    if (deaths === 0) return kills > 0 ? kills : 1.0;
    return Number((kills / deaths).toFixed(2));
  }

  public static calculateWinRate(wins: number, matches: number): number {
    if (matches === 0) return 0;
    return Math.round((wins / matches) * 100);
  }

  public static getRankForScore(score: number): RankTier {
    for (let i = CYBER_RANKS.length - 1; i >= 0; i--) {
      if (score >= CYBER_RANKS[i].minScore) {
        return CYBER_RANKS[i];
      }
    }
    return CYBER_RANKS[0];
  }
}
