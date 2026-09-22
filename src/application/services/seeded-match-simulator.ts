import type { Fixture, MatchResult } from "../../data/types.js";
export class SeededMatchSimulator { constructor(private seed = 1) {} simulate(_fixture: Fixture): MatchResult { this.seed = (this.seed * 1664525 + 1013904223) >>> 0; const homeGoals = this.seed % 5; this.seed = (this.seed * 1664525 + 1013904223) >>> 0; return { homeGoals, awayGoals: this.seed % 4 }; } }
