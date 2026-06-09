// Curated "marquee player" popularity — the recognised names punters reach
// for in Golden Boot / Player of the Tournament. Values are the prototype's
// own popularity figures (called-it.jsx), our source of truth for who's a
// favourite. Without club/market-value data in the free squad feed, this is
// how we surface stars ahead of alphabetical squad filler.
//
// Used as a popularity floor in the multiplier proxy so these names sort to
// the top of the player pickers with sensible (favourite) multipliers. Once
// the cron fills pick_stats with REAL pick shares, those override this.

const norm = (s: string) =>
  s
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();

// name -> popularity (% who'd pick them; higher = bigger favourite)
const RAW: [string, number][] = [
  ["Kylian Mbappé", 21],
  ["Erling Haaland", 13],
  ["Harry Kane", 12],
  ["Lamine Yamal", 8],
  ["Vinícius Júnior", 6],
  ["Lionel Messi", 5],
  ["Julián Álvarez", 4],
  ["Jude Bellingham", 3.5],
  ["Bukayo Saka", 3],
  ["Cristiano Ronaldo", 3],
  ["Lautaro Martínez", 2.5],
  ["Mohamed Salah", 2.5],
  ["Florian Wirtz", 2],
  ["Jamal Musiala", 2],
  ["Raphinha", 2],
  ["Pedri", 2],
  ["Rafael Leão", 1.5],
  ["Michael Olise", 1.5],
  ["Cody Gakpo", 1.5],
  ["Rodri", 1.5],
  ["Vitinha", 1.5],
  ["Ollie Watkins", 1],
  ["Rodrygo", 1],
  ["Bruno Fernandes", 1],
  ["Darwin Núñez", 1],
  ["Luis Díaz", 1],
  ["Declan Rice", 1],
  ["Federico Valverde", 1],
  ["Achraf Hakimi", 1],
  ["Heung-min Son", 0.8],
  ["Christian Pulisic", 0.8],
  ["Luka Modrić", 0.8],
  ["Kevin De Bruyne", 0.8],
  ["Santiago Giménez", 0.7],
  ["Jonathan David", 0.6],
  ["Sadio Mané", 0.5],
  ["Takefusa Kubo", 0.5],
  ["Brahim Díaz", 0.5],
  ["Memphis Depay", 0.4],
  ["Eberechi Eze", 0.4],
  ["Marcus Rashford", 0.4],
];

const MARQUEE = new Map(RAW.map(([n, p]) => [norm(n), p]));

/** Marquee popularity for a player name, or null if not a curated star. */
export function marqueePop(name: string): number | null {
  return MARQUEE.get(norm(name)) ?? null;
}
