// CALLED IT. — shared constants (mirrors INTEGRATIONS.md §5)

export const KICKOFF_UTC = "2026-06-11T19:00:00Z"; // picks lock, multipliers freeze
export const KICKOFF = new Date(KICKOFF_UTC);
export const COMPETITION = "WC";

export const MULTIPLIER = { MIN: 1.1, MAX: 10 }; // 30/max(pct,0.1)+0.9, clamp, 1dp

export const BASE_POINTS = {
  winner: 100,
  runner_up: 80,
  golden_boot: 80,
  pott: 80,
  dark_horse: 60,
  flop: 60,
} as const;

export const DARK_HORSE_RANK_FLOOR = 12; // rank > 12 eligible
export const FLOP_RANK_CEILING = 16; // rank <= 16 eligible

// The six prediction categories. `id` values match the DB check constraint
// on picks.category exactly (SPEC §3).
export type CategoryId =
  | "winner"
  | "runner_up"
  | "golden_boot"
  | "pott"
  | "dark_horse"
  | "flop";

export type EntityType = "team" | "player";

export interface Category {
  id: CategoryId;
  label: string;
  short: string;
  type: EntityType;
  hint: string;
}

export const CATEGORIES: Category[] = [
  { id: "winner", label: "Winner", short: "WINNER", type: "team", hint: "Lifts the trophy on 19 July" },
  { id: "runner_up", label: "Runner-up", short: "RUNNER-UP", type: "team", hint: "Loses the final" },
  { id: "golden_boot", label: "Golden Boot", short: "GOLDEN BOOT", type: "player", hint: "Top scorer of the tournament" },
  { id: "pott", label: "Player of the Tournament", short: "BEST PLAYER", type: "player", hint: "Official Golden Ball winner" },
  { id: "dark_horse", label: "Dark Horse", short: "DARK HORSE", type: "team", hint: "Ranked outside the top 12, goes furthest" },
  { id: "flop", label: "Biggest Flop", short: "BIGGEST FLOP", type: "team", hint: "Highest-ranked team, earliest exit" },
];
