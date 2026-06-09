// Curated team metadata the football-data /teams payload does NOT provide:
//  - flag: emoji (the UI renders this at 38px; a crest URL would not work)
//  - fifaRank: APPROXIMATE, ordered sensibly for dark-horse/flop eligibility
//    and default multipliers. ⚠️ Verify against the official June-2026 FIFA
//    ranking before kickoff — that is the frozen snapshot (SPEC §3).
//
// Keyed by three-letter code (tla) = our teams.id.

export interface TeamMeta {
  flag: string;
  fifaRank: number;
}

export const TEAM_META: Record<string, TeamMeta> = {
  ARG: { flag: "🇦🇷", fifaRank: 1 },
  ESP: { flag: "🇪🇸", fifaRank: 2 },
  FRA: { flag: "🇫🇷", fifaRank: 3 },
  ENG: { flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", fifaRank: 4 },
  BRA: { flag: "🇧🇷", fifaRank: 5 },
  NED: { flag: "🇳🇱", fifaRank: 6 },
  POR: { flag: "🇵🇹", fifaRank: 7 },
  BEL: { flag: "🇧🇪", fifaRank: 8 },
  GER: { flag: "🇩🇪", fifaRank: 9 },
  CRO: { flag: "🇭🇷", fifaRank: 10 },
  MAR: { flag: "🇲🇦", fifaRank: 11 },
  COL: { flag: "🇨🇴", fifaRank: 12 },
  URY: { flag: "🇺🇾", fifaRank: 13 },
  USA: { flag: "🇺🇸", fifaRank: 14 },
  SUI: { flag: "🇨🇭", fifaRank: 15 },
  JPN: { flag: "🇯🇵", fifaRank: 16 },
  SEN: { flag: "🇸🇳", fifaRank: 17 },
  IRN: { flag: "🇮🇷", fifaRank: 18 },
  KOR: { flag: "🇰🇷", fifaRank: 19 },
  MEX: { flag: "🇲🇽", fifaRank: 20 },
  ECU: { flag: "🇪🇨", fifaRank: 21 },
  AUT: { flag: "🇦🇹", fifaRank: 22 },
  SWE: { flag: "🇸🇪", fifaRank: 23 },
  AUS: { flag: "🇦🇺", fifaRank: 24 },
  EGY: { flag: "🇪🇬", fifaRank: 25 },
  NOR: { flag: "🇳🇴", fifaRank: 26 },
  CAN: { flag: "🇨🇦", fifaRank: 27 },
  ALG: { flag: "🇩🇿", fifaRank: 28 },
  CZE: { flag: "🇨🇿", fifaRank: 29 },
  TUR: { flag: "🇹🇷", fifaRank: 30 },
  SCO: { flag: "🏴󠁧󠁢󠁳󠁣󠁴󠁿", fifaRank: 31 },
  PAN: { flag: "🇵🇦", fifaRank: 32 },
  CIV: { flag: "🇨🇮", fifaRank: 33 },
  TUN: { flag: "🇹🇳", fifaRank: 34 },
  PAR: { flag: "🇵🇾", fifaRank: 35 },
  QAT: { flag: "🇶🇦", fifaRank: 36 },
  KSA: { flag: "🇸🇦", fifaRank: 37 },
  BIH: { flag: "🇧🇦", fifaRank: 38 },
  GHA: { flag: "🇬🇭", fifaRank: 39 },
  RSA: { flag: "🇿🇦", fifaRank: 40 },
  UZB: { flag: "🇺🇿", fifaRank: 41 },
  IRQ: { flag: "🇮🇶", fifaRank: 42 },
  JOR: { flag: "🇯🇴", fifaRank: 43 },
  COD: { flag: "🇨🇩", fifaRank: 44 },
  CPV: { flag: "🇨🇻", fifaRank: 45 },
  HAI: { flag: "🇭🇹", fifaRank: 46 },
  CUW: { flag: "🇨🇼", fifaRank: 47 },
  NZL: { flag: "🇳🇿", fifaRank: 48 },
};
