import { Tournament } from '../types/tournament';
import { rrMatches, bracket, propagate } from '../utils/tournamentEngine';
import { es } from './strings';

export function getInitialTournaments(): Tournament[] {
  // 1. Liga Demo
  const liga: Tournament = {
    id: 'FC26-2071',
    name: 'Liga FC 26 de los martes',
    game: 'FC 26',
    date: '2026-09-01',
    type: 'liga',
    finals: 'top4',
    legs: 1,
    teams: 6,
    feeOn: true,
    fee: '5 €',
    closed: false,
    started: true,
    members: [
      { nick: '__ME__', role: 'admin', paid: true },
      { nick: 'nico_87', role: 'jugador', paid: true },
      { nick: 'beatriz', role: 'ayudante', paid: true },
      { nick: 'kev.exe', role: 'jugador', paid: false },
      { nick: 'daniloco', role: 'jugador', paid: true },
      { nick: 'lu_ps5', role: 'jugador', paid: false }
    ],
    matches: []
  };

  liga.matches = rrMatches(liga.members.map((m) => m.nick), 1);
  const sampleScores = [
    [3, 1], [2, 2], [0, 4], [1, 0], [2, 1], [3, 3], [4, 2], [1, 2], [2, 0]
  ];
  sampleScores.forEach((sc, i) => {
    if (liga.matches[i]) {
      liga.matches[i].sa = sc[0];
      liga.matches[i].sb = sc[1];
      liga.matches[i].played = true;
    }
  });

  // 2. Copa Demo
  const copaNicks = ['Vortex', 'nico_87', '__ME__', 'zeta__', 'marukk', 'pau.rl', 'tincho', 'Gigi'];
  const copa: Tournament = {
    id: 'RKT-8842',
    name: 'Copa FC 27',
    game: 'FC 27',
    date: '2026-08-30',
    type: 'copa',
    teams: 8,
    feeOn: false,
    closed: false,
    matches: [],
    members: copaNicks.map((n, i) => ({
      nick: n,
      role: i === 0 ? 'admin' : 'jugador',
      paid: true
    }))
  };

  copa.rounds = bracket(copaNicks, es);
  if (copa.rounds[0]?.matches[0]) {
    copa.rounds[0].matches[0].sa = 3;
    copa.rounds[0].matches[0].sb = 1;
    copa.rounds[0].matches[0].played = true;
  }
  if (copa.rounds[0]?.matches[1]) {
    copa.rounds[0].matches[1].sa = 0;
    copa.rounds[0].matches[1].sb = 2;
    copa.rounds[0].matches[1].played = true;
  }
  propagate(copa.rounds, es);

  // 3. Historial Demo
  const hist: Tournament = {
    id: 'AOE-4410',
    name: 'Invierno FC 26',
    game: 'FC 26',
    date: '2026-02-14',
    type: 'grupos',
    teams: 8,
    feeOn: false,
    closed: true,
    champ: 'beatriz',
    matches: [],
    rounds: [],
    members: [
      { nick: '__ME__', role: 'jugador', paid: true },
      { nick: 'beatriz', role: 'admin', paid: true }
    ]
  };

  return [liga, copa, hist];
}
