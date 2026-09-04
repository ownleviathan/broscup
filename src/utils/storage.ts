import { Tournament, Language } from '../types/tournament';
import { getInitialTournaments } from '../data/initialData';

const STORAGE_KEY = 'torneos_app_v1';

export interface StoredData {
  ownerNick: string | null;
  tours: Tournament[];
  lang: Language;
}

export function claimOwner(n: string, tours: Tournament[]): Tournament[] {
  return tours.map((t) => ({
    ...t,
    members: t.members.map((m) => (m.nick === '__ME__' ? { ...m, nick: n } : m)),
    matches: t.matches.map((m) => ({
      ...m,
      a: m.a === '__ME__' ? n : m.a,
      b: m.b === '__ME__' ? n : m.b,
      bye: m.bye === '__ME__' ? n : m.bye
    })),
    groups: (t.groups || []).map((g) => ({
      ...g,
      nicks: g.nicks.map((nick) => (nick === '__ME__' ? n : nick)),
      matches: g.matches.map((m) => ({
        ...m,
        a: m.a === '__ME__' ? n : m.a,
        b: m.b === '__ME__' ? n : m.b,
        bye: m.bye === '__ME__' ? n : m.bye
      }))
    })),
    rounds: (t.rounds || []).map((r) => ({
      ...r,
      matches: r.matches.map((m) => ({
        ...m,
        a: m.a === '__ME__' ? n : m.a,
        b: m.b === '__ME__' ? n : m.b
      }))
    }))
  }));
}

export function loadStoredData(): StoredData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.tours)) {
        return {
          ownerNick: parsed.ownerNick || null,
          tours: parsed.tours,
          lang: parsed.lang === 'en' ? 'en' : 'es'
        };
      }
    }
  } catch (e) {
    console.error('Failed to load stored tournaments:', e);
  }

  return {
    ownerNick: null,
    tours: getInitialTournaments(),
    lang: 'es'
  };
}

export function saveStoredData(ownerNick: string | null, tours: Tournament[], lang: Language): void {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        ownerNick,
        tours,
        lang
      })
    );
  } catch (e) {
    console.error('Failed to save tournaments:', e);
  }
}

export function resetStorage(): StoredData {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    console.error('Failed to reset storage:', e);
  }

  return {
    ownerNick: null,
    tours: getInitialTournaments(),
    lang: 'es'
  };
}
