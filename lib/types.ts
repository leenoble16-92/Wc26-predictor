// Shared domain types (mirror the DB schema in SPEC §3).
import type { CategoryId } from "./constants";

export interface Team {
  id: string; // 'ENG', 'FRA' ...
  name: string;
  flag: string;
  fifa_rank: number;
}

export interface Player {
  id: number;
  name: string;
  team_id: string | null;
  club: string | null;
  position: string | null;
}

// A team or player joined with display fields the album/picker render.
export interface PickEntity {
  type: "team" | "player";
  entityId: string; // team_id or player_id::text — matches pick_stats.entity_id
  name: string;
  flag: string;
  sub: string; // "World ranking 4"  /  "England · Bayern Munich"
  rank?: number; // teams only — used for dark_horse / flop filtering
  position?: string | null; // players only — nudges default multiplier
}

export interface Pick {
  user_id: string;
  category: CategoryId;
  team_id: string | null;
  player_id: number | null;
  locked_at: string | null;
}
