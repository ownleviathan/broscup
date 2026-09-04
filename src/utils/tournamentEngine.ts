import { Match, Round, Member, StandingRow, Tournament, StringsDict } from '../types/tournament';

export function singleRR(nicks: string[]): Match[] {
  const a = nicks.slice();
  const bye = a.length % 2 === 1;
  if (bye) a.push(null as unknown as string);

  const n = a.length;
  const out: Match[] = [];

  for (let r = 0; r < n - 1; r++) {
    for (let i = 0; i < n / 2; i++) {
      const x = a[i];
      const y = a[n - 1 - i];
      if (x && y) {
        out.push({
          id: `l${r}-${i}`,
          jornada: r + 1,
          a: x,
          b: y,
          sa: null,
          sb: null,
          played: false
        });
      } else {
        out.push({
          id: `l${r}-${i}`,
          jornada: r + 1,
          a: '',
          b: '',
          bye: x || y,
          sa: null,
          sb: null,
          played: false
        });
      }
    }
    const last = a.pop()!;
    a.splice(1, 0, last);
  }
  return out;
}

export function rrMatches(nicks: string[], legs: number = 1): Match[] {
  const first = singleRR(nicks);
  if (Number(legs) !== 2) return first;

  const rounds = nicks.length % 2 === 1 ? nicks.length : nicks.length - 1;
  const back: Match[] = first.map((m) => ({
    ...m,
    id: 'r' + m.id,
    jornada: (m.jornada || 1) + rounds,
    a: m.b,
    b: m.a,
    sa: null,
    sb: null,
    played: false
  }));
  return first.concat(back);
}

export function roundName(n: number, L: StringsDict): string {
  return n >= 16 ? L.eighth : n === 8 ? L.quarters : n === 4 ? L.semi : L.finalR;
}

export function bracket(
  nicks: string[],
  L: StringsDict,
  options?: { legs?: number; semiLegs?: number; finalLegs?: number }
): Round[] {
  const rounds: Round[] = [];
  let cur = nicks.slice();
  let ri = 0;
  const tLegs = Number(options?.legs || 1);
  const tSemi = Number(options?.semiLegs || 1);
  const tFinal = Number(options?.finalLegs || 1);

  while (cur.length > 1) {
    const ms: Match[] = [];
    const rLegs = cur.length === 2 ? tFinal : cur.length === 4 ? tSemi : tLegs;
    for (let i = 0; i < cur.length; i += 2) {
      ms.push({
        id: `b${ri}-${i / 2}`,
        a: cur[i],
        b: cur[i + 1] || 'BYE',
        sa: null,
        sb: null,
        legs: rLegs,
        played: false
      });
    }
    const rName = roundName(cur.length, L) + (rLegs === 2 ? ` · ${L.fl2}` : '');
    rounds.push({ name: rName, matches: ms });
    cur = ms.map((_, i) => `${L.winner} ${i + 1}`);
    ri++;
  }
  return rounds;
}

export function agg(m: Match): { a: number; b: number } {
  const two = Number(m.legs) === 2;
  return {
    a: Number(m.sa || 0) + (two ? Number(m.s2a || 0) : 0),
    b: Number(m.sb || 0) + (two ? Number(m.s2b || 0) : 0)
  };
}

export function winnerOf(m: Match): string {
  const t = agg(m);
  if (t.a > t.b) return m.a;
  if (t.b > t.a) return m.b;
  if (m.penaltyWinner === 'b') return m.b;
  return m.a;
}

export function propagate(rounds: Round[], L: StringsDict): void {
  for (let r = 0; r < rounds.length - 1; r++) {
    rounds[r].matches.forEach((m, i) => {
      const next = rounds[r + 1].matches[Math.floor(i / 2)];
      const slot = i % 2 === 0 ? 'a' : 'b';
      if (m.played) {
        next[slot] = winnerOf(m);
      } else {
        next[slot] = `${L.winner} ${i + 1}`;
      }
    });
  }
}

export function standings(
  members: (Member | { nick: string })[],
  matches: Match[]
): StandingRow[] {
  const tbl: Record<string, { nick: string; pj: number; gf: number; gc: number; pts: number }> = {};
  members.forEach((p) => {
    tbl[p.nick] = { nick: p.nick, pj: 0, gf: 0, gc: 0, pts: 0 };
  });

  matches
    .filter((m) => m.played && m.a && m.b)
    .forEach((m) => {
      const A = tbl[m.a];
      const B = tbl[m.b];
      if (!A || !B) return;

      const x = Number(m.sa);
      const y = Number(m.sb);
      A.pj++;
      B.pj++;
      A.gf += x;
      A.gc += y;
      B.gf += y;
      B.gc += x;

      if (x > y) {
        A.pts += 3;
      } else if (y > x) {
        B.pts += 3;
      } else {
        A.pts++;
        B.pts++;
      }
    });

  return Object.values(tbl)
    .sort((a, b) => b.pts - a.pts || b.gf - b.gc - (a.gf - a.gc) || b.gf - a.gf)
    .map((r, i) => {
      const diff = r.gf - r.gc;
      return {
        ...r,
        pos: i + 1,
        dg: (diff > 0 ? '+' : '') + diff
      };
    });
}

export function phaseOf(t: Tournament, L: StringsDict) {
  const fill = (s: string, o: Record<string, string | number>) =>
    s
      .replace('{n}', String(o.n ?? ''))
      .replace('{a}', String(o.a ?? ''))
      .replace('{b}', String(o.b ?? ''))
      .replace('{c}', String(o.c ?? ''));

  if (t.closed) {
    return {
      key: 'closed',
      label: L.stClosed,
      detail: `${L.champion}: ${t.champ || '—'}`,
      bg: 'var(--color-neutral-800)',
      fg: 'var(--color-neutral-100)'
    };
  }

  const rounds = t.rounds || [];
  const fixtures = t.matches.filter((m) => m.a && m.b);

  if (t.members.length < t.teams || (!fixtures.length && !rounds.length)) {
    return {
      key: 'reg',
      label: L.stReg,
      detail: fill(L.stRegD, { n: Math.max(0, t.teams - t.members.length) }),
      bg: 'var(--color-neutral-200)',
      fg: 'var(--color-neutral-800)'
    };
  }

  const fin = rounds.length ? rounds[rounds.length - 1].matches[0] : null;
  if (fin && fin.played) {
    return {
      key: 'done',
      label: L.stDone,
      detail: fill(L.stDoneD, { c: winnerOf(fin) }),
      bg: 'var(--color-accent-800)',
      fg: 'var(--color-bg)'
    };
  }

  const played = fixtures.filter((m) => m.played).length;
  if (t.type === 'liga' && rounds.length) {
    return {
      key: 'playoff',
      label: L.stPlayoff,
      detail: L.stPlayoffD,
      bg: 'var(--color-accent)',
      fg: 'var(--color-bg)'
    };
  }

  if (t.type === 'liga' && t.finals === 'none' && played === fixtures.length) {
    const st = standings(t.members, t.matches);
    return {
      key: 'done',
      label: L.stDone,
      detail: fill(L.stDoneD, { c: st[0] ? st[0].nick : '—' }),
      bg: 'var(--color-accent-800)',
      fg: 'var(--color-bg)'
    };
  }

  const total = fixtures.length || rounds.reduce((n, r) => n + r.matches.length, 0);
  const donePlayed = fixtures.length
    ? played
    : rounds.reduce((n, r) => n + r.matches.filter((m) => m.played).length, 0);

  return {
    key: 'playing',
    label: L.stPlaying,
    detail: fill(L.stPlayingD, { a: donePlayed, b: total }),
    bg: 'var(--color-accent-100)',
    fg: 'var(--color-accent-800)'
  };
}

export function typeLabel(k: string, L: StringsDict): string {
  return k === 'liga' ? L.typeLiga : k === 'copa' ? L.typeCopa : L.typeGrupos;
}

export function teamPresets(type: string): number[] {
  return type === 'copa'
    ? [4, 8, 16]
    : type === 'grupos'
    ? [8, 12, 16]
    : [4, 5, 6, 7, 8, 9, 10, 12];
}
