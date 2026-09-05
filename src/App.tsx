import React, { useState, useEffect, useCallback } from 'react';
import { Tournament, ScreenType, Language, FormState } from './types/tournament';
import { getStrings } from './data/strings';
import { loadStoredData, saveStoredData, resetStorage, claimOwner } from './utils/storage';
import { supabase } from './services/supabase';
import { authService } from './services/authService';
import { tournamentService } from './services/tournamentService';
import { useRealtimeTournament } from './hooks/useRealtimeTournament';
import { TopNav } from './components/Layout/TopNav';
import { BottomNav } from './components/Layout/BottomNav';
import { Toast } from './components/Layout/Toast';
import { LoginView } from './components/Auth/LoginView';
import { SignupView } from './components/Auth/SignupView';
import { NicknameView } from './components/Auth/NicknameView';
import { DashboardView } from './components/Dashboard/DashboardView';
import { CreateTournamentWizard } from './components/Wizard/CreateTournamentWizard';
import { JoinTournamentView } from './components/Join/JoinTournamentView';
import { TournamentDetailView } from './components/Tournament/TournamentDetailView';
import { HistoryView } from './components/History/HistoryView';
import { ProfileView } from './components/Profile/ProfileView';

export const App: React.FC = () => {
  const [data, setData] = useState(() => loadStoredData());
  const [userId, setUserId] = useState<string | null>(null);
  const [userNick, setUserNick] = useState<string>(data.ownerNick || '');
  const [email, setEmail] = useState<string>('');
  const [lang, setLang] = useState<Language>(data.lang);
  const [screen, setScreen] = useState<ScreenType>(data.ownerNick ? 'dash' : 'auth');
  const [openTourId, setOpenTourId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [windowWidth, setWindowWidth] = useState(
    typeof window !== 'undefined' ? window.innerWidth : 1200
  );

  const isTablet = windowWidth >= 900;
  const L = getStrings(lang);

  // Flash toast helper
  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => {
      setToast(null);
    }, 2400);
  }, []);

  // Fetch tournaments from Supabase if user is logged in
  const refreshTournaments = useCallback(async () => {
    if (!userId) return;
    try {
      const dbTours = await tournamentService.fetchUserTournaments();
      if (dbTours && dbTours.length > 0) {
        setData((prev) => ({
          ...prev,
          tours: dbTours
        }));
      }
    } catch (err) {
      console.warn('Could not fetch tournaments from DB:', err);
    }
  }, [userId]);

  // Hook for Supabase Realtime sync across all tournaments
  useRealtimeTournament(refreshTournaments);

  // Resize listener
  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Initialize Auth on mount and listen for real-time auth changes (like email verification)
  useEffect(() => {
    async function syncSession(session: any) {
      if (session && session.user) {
        setUserId(session.user.id);
        setEmail(session.user.email || '');

        try {
          const profile = await authService.getProfile(session.user.id);
          const candidateNick = profile?.nickname || session.user.user_metadata?.nickname;
          if (candidateNick) {
            setUserNick(candidateNick);
            setScreen('dash');
          } else {
            setUserNick('');
            setScreen('nickname');
          }
        } catch (e) {
          console.warn('Profile fetch error:', e);
          const metaNick = session.user.user_metadata?.nickname;
          if (metaNick) {
            setUserNick(metaNick);
            setScreen('dash');
          } else {
            setUserNick('');
            setScreen('nickname');
          }
        }

        // Fetch DB tournaments
        try {
          const dbTours = await tournamentService.fetchUserTournaments();
          if (dbTours && dbTours.length > 0) {
            setData((prev) => ({ ...prev, tours: dbTours }));
          }
        } catch (e) {
          console.warn('DB tournaments fetch on init:', e);
        }
      } else {
        setUserId(null);
        setUserNick('');
        setScreen('auth');
      }
    }

    authService.getCurrentSession().then(syncSession).catch(console.warn);

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      syncSession(session);
    });

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, []);

  // Save to localStorage fallback
  useEffect(() => {
    saveStoredData(userNick || null, data.tours, lang);
  }, [data.tours, userNick, lang]);

  // Auth Handlers
  const handleLoginSuccess = async (userEmail: string, newUserId?: string) => {
    setEmail(userEmail);

    try {
      const session = await authService.getCurrentSession();
      const uid = newUserId || session?.user?.id;
      if (uid) {
        setUserId(uid);
        const profile = await authService.getProfile(uid);
        const candidateNick = profile?.nickname || session?.user?.user_metadata?.nickname;
        if (candidateNick) {
          setUserNick(candidateNick);
          setScreen('dash');
        } else {
          setScreen('nickname');
        }
        refreshTournaments();
        return;
      }
    } catch (err) {
      console.warn('Login session check:', err);
    }

    if (userNick) {
      setScreen('dash');
    } else {
      setScreen('nickname');
    }
  };

  const handleSignupSuccess = async (userEmail: string, newUserId?: string) => {
    setEmail(userEmail);
    try {
      const uid = newUserId || (await authService.getCurrentSession())?.user?.id;
      if (uid) {
        setUserId(uid);
      }
    } catch (e) {
      console.warn('Signup check:', e);
    }
    setScreen('nickname');
  };

  const handleConfirmNick = async (nick: string) => {
    const cleanNick = nick.trim();
    setUserNick(cleanNick);

    const uid = userId || (await authService.getCurrentSession())?.user?.id;
    if (uid) {
      setUserId(uid);
      try {
        await authService.updateNickname(uid, cleanNick);
      } catch (err) {
        console.warn('Could not update nickname in DB:', err);
      }
    }

    const updatedTours = claimOwner(cleanNick, data.tours);
    setData((prev) => ({
      ...prev,
      ownerNick: cleanNick,
      tours: updatedTours
    }));
    setScreen('dash');
    showToast(`${L.hello} ${cleanNick}`);
    refreshTournaments();
  };

  // Tournament Update Handlers
  const handleUpdateTournament = (updated: Tournament) => {
    setData((prev) => ({
      ...prev,
      tours: prev.tours.map((t) => (t.id === updated.id ? updated : t))
    }));
  };

  const handleCreatedTournament = async (newTour: Tournament, formState?: FormState) => {
    if (userId && formState) {
      try {
        const res = await tournamentService.createTournament(formState);
        if (res && res.id) {
          await refreshTournaments();
          setOpenTourId(res.id);
          setScreen('tour');
          showToast(formState.mode === 'offline' ? 'Torneo presencial creado con éxito' : L.tCopied);
          return;
        }
      } catch (err) {
        console.warn('Create tournament in DB failed, using local:', err);
      }
    }

    // Local fallback
    setData((prev) => ({
      ...prev,
      tours: [newTour, ...prev.tours]
    }));
    setOpenTourId(newTour.id);
    setScreen('tour');
    showToast(newTour.mode === 'offline' ? 'Torneo presencial creado con éxito' : L.tCopied);
  };

  const handleJoinTournament = async (tournamentId: string, teamName?: string) => {
    if (userId) {
      try {
        await tournamentService.joinTournament(tournamentId, teamName);
        await refreshTournaments();
        setOpenTourId(tournamentId);
        setScreen('tour');
        showToast(`${L.tJoined} ${tournamentId}`);
        return;
      } catch (err) {
        console.warn('Join tournament DB call error, checking local:', err);
      }
    }

    // Local fallback
    const target = data.tours.find((t) => t.id === tournamentId);
    if (!target) {
      showToast(L.tCheckId);
      return;
    }

    const already = target.members.some((m) => m.nick === userNick);
    if (!already) {
      const updated: Tournament = {
        ...target,
        members: [...target.members, { nick: userNick, role: 'jugador', paid: !target.feeOn, teamName }]
      };
      handleUpdateTournament(updated);
      showToast(`${L.tJoined} ${target.name}`);
    }

    setOpenTourId(target.id);
    setScreen('tour');
  };

  // Profile Handlers
  const handleUpdateNick = async (newNick: string) => {
    const oldNick = userNick;
    setUserNick(newNick);

    if (userId) {
      try {
        await authService.updateNickname(userId, newNick);
        await refreshTournaments();
      } catch (err) {
        console.warn('Could not update nickname in DB:', err);
      }
    }

    const updated = data.tours.map((t) => ({
      ...t,
      champ: t.champ === oldNick ? newNick : t.champ,
      members: t.members.map((m) => (m.nick === oldNick ? { ...m, nick: newNick } : m)),
      matches: t.matches.map((m) => ({
        ...m,
        a: m.a === oldNick ? newNick : m.a,
        b: m.b === oldNick ? newNick : m.b,
        bye: m.bye === oldNick ? newNick : m.bye
      })),
      groups: (t.groups || []).map((g) => ({
        ...g,
        nicks: g.nicks.map((n) => (n === oldNick ? newNick : n)),
        matches: g.matches.map((m) => ({
          ...m,
          a: m.a === oldNick ? newNick : m.a,
          b: m.b === oldNick ? newNick : m.b,
          bye: m.bye === oldNick ? newNick : m.bye
        }))
      })),
      rounds: (t.rounds || []).map((r) => ({
        ...r,
        matches: r.matches.map((m) => ({
          ...m,
          a: m.a === oldNick ? newNick : m.a,
          b: m.b === oldNick ? newNick : m.b
        }))
      }))
    }));

    setData((prev) => ({
      ...prev,
      ownerNick: newNick,
      tours: updated
    }));
    showToast(L.tNickSaved);
  };

  const handleToggleLang = async () => {
    const nextLang = lang === 'es' ? 'en' : 'es';
    setLang(nextLang);
    if (userId) {
      try {
        await authService.updateLocale(userId, nextLang);
      } catch (e) {
        console.warn('Could not save locale to DB:', e);
      }
    }
  };

  const handleLogout = async () => {
    try {
      await authService.signOut();
    } catch (e) {
      console.warn('Signout error:', e);
    }
    setUserId(null);
    setEmail('');
    setScreen('auth');
  };

  const handleResetDemo = () => {
    const fresh = resetStorage();
    setData(fresh);
    setUserNick('');
    setScreen('auth');
    showToast(L.tDemoReset);
  };

  const currentTour = data.tours.find((t) => t.id === openTourId) || null;
  const isAuthScreen = screen === 'auth' || screen === 'signup' || screen === 'nickname';

  return (
    <div
      style={{
        width: '100%',
        maxWidth: isTablet ? '1440px' : '100%',
        height: '100dvh',
        margin: '0 auto',
        background: 'var(--color-bg)',
        borderLeft: isTablet ? '2px solid var(--color-divider)' : 'none',
        borderRight: isTablet ? '2px solid var(--color-divider)' : 'none',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        boxSizing: 'border-box',
        overflow: 'hidden'
      }}
    >
      {/* Top Nav for Desktop and iPad */}
      {isTablet && !isAuthScreen && (
        <TopNav
          currentScreen={screen}
          onNavigate={(s) => {
            setScreen(s);
            if (s !== 'tour') setOpenTourId(null);
          }}
          onOpenCreate={() => setScreen('create')}
          onOpenJoin={() => setScreen('join')}
          nick={userNick}
          L={L}
        />
      )}

      {/* Screen Routing */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
        {screen === 'auth' && (
          <LoginView
            onLoginSuccess={handleLoginSuccess}
            onGoSignup={() => setScreen('signup')}
            lang={lang}
            onSetLang={setLang}
            L={L}
            isTablet={isTablet}
          />
        )}

        {screen === 'signup' && (
          <SignupView
            onSignupSuccess={handleSignupSuccess}
            onGoAuth={() => setScreen('auth')}
            lang={lang}
            onSetLang={setLang}
            L={L}
            isTablet={isTablet}
          />
        )}

        {screen === 'nickname' && (
          <NicknameView
            initialNick={userNick}
            onConfirm={handleConfirmNick}
            L={L}
          />
        )}

        {screen === 'dash' && (
          <DashboardView
            tournaments={data.tours}
            nick={userNick}
            onOpenTournament={(id) => {
              setOpenTourId(id);
              setScreen('tour');
            }}
            onGoCreate={() => setScreen('create')}
            onGoJoin={() => setScreen('join')}
            L={L}
            isTablet={isTablet}
          />
        )}

        {screen === 'create' && (
          <CreateTournamentWizard
            userNick={userNick}
            onCancel={() => setScreen('dash')}
            onCreated={(newTour, formState) => handleCreatedTournament(newTour, formState)}
            L={L}
            isTablet={isTablet}
          />
        )}

        {screen === 'join' && (
          <JoinTournamentView
            tournaments={data.tours}
            userNick={userNick}
            onJoin={handleJoinTournament}
            onCancel={() => setScreen('dash')}
            L={L}
            isTablet={isTablet}
          />
        )}

        {screen === 'tour' && currentTour && (
          <TournamentDetailView
            tournament={currentTour}
            userNick={userNick}
            onUpdateTournament={handleUpdateTournament}
            onBack={() => setScreen('dash')}
            onShowToast={showToast}
            L={L}
            isTablet={isTablet}
            isTestUser={email?.trim().toLowerCase() === 'test@broscup.com'}
          />
        )}

        {screen === 'history' && (
          <HistoryView
            tournaments={data.tours}
            userNick={userNick}
            onShowToast={showToast}
            L={L}
            isTablet={isTablet}
          />
        )}

        {screen === 'profile' && (
          <ProfileView
            userNick={userNick}
            email={email}
            lang={lang}
            onUpdateNick={handleUpdateNick}
            onToggleLang={handleToggleLang}
            onLogout={handleLogout}
            onResetDemo={handleResetDemo}
            onShowToast={showToast}
            L={L}
            isTablet={isTablet}
          />
        )}
      </main>

      {/* Mobile Bottom Navigation */}
      {!isTablet && !isAuthScreen && (
        <BottomNav
          currentScreen={screen}
          onNavigate={(s) => {
            setScreen(s);
            if (s !== 'tour') setOpenTourId(null);
          }}
          L={L}
        />
      )}

      {/* Floating Toast Notification */}
      <Toast message={toast} />
    </div>
  );
};
