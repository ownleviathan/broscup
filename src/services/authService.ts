import { supabase } from './supabase';

export interface UserProfile {
  id: string;
  nickname: string;
  locale: 'es' | 'en';
  nickname_confirmed: boolean;
  created_at: string;
  is_blocked?: boolean;
}

export const authService = {
  async signUp(email: string, pass: string) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password: pass
    });
    if (error) throw error;
    return data;
  },

  async signIn(email: string, pass: string) {
    const cleanEmail = email.trim().toLowerCase();
    const cleanPass = pass.trim();

    let { data, error } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password: cleanPass
    });

    // Auto-aprovisionamiento inteligente para la cuenta de pruebas de producción
    if (error && cleanEmail === 'test@broscup.com' && cleanPass === '1q2w3e4r') {
      try {
        const signupRes = await supabase.auth.signUp({
          email: 'test@broscup.com',
          password: '1q2w3e4r',
          options: {
            data: {
              nickname: 'TestBro',
              nickname_confirmed: true
            }
          }
        });
        if (signupRes.data?.session) {
          return signupRes.data;
        }

        const retry = await supabase.auth.signInWithPassword({
          email: 'test@broscup.com',
          password: '1q2w3e4r'
        });
        if (retry.data?.session) {
          return retry.data;
        }
      } catch (provisionErr) {
        console.warn('Auto-provision test account error:', provisionErr);
      }
    }

    if (error) throw error;
    return data;
  },

  async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  async getCurrentSession() {
    const { data, error } = await supabase.auth.getSession();
    if (error) return null;
    return data.session;
  },

  async getProfile(userId: string): Promise<UserProfile | null> {
    // 1. Obtener nickname de user_metadata (siempre accesible por el usuario autenticado)
    let metaNick: string | undefined;
    let metaConfirmed = false;
    try {
      const { data: userData } = await supabase.auth.getUser();
      metaNick = userData?.user?.user_metadata?.nickname;
      metaConfirmed = userData?.user?.user_metadata?.nickname_confirmed !== false;
    } catch (e) {
      console.warn('User metadata check error:', e);
    }

    // 2. Consulta desde la tabla profiles
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, nickname, locale, nickname_confirmed, created_at, is_blocked')
        .eq('id', userId)
        .maybeSingle();

      if (!error && data?.nickname) {
        return {
          id: userId,
          nickname: (metaNick && metaConfirmed) ? metaNick : data.nickname,
          locale: data.locale || 'es',
          nickname_confirmed: data.nickname_confirmed ?? metaConfirmed,
          created_at: data.created_at || new Date().toISOString(),
          is_blocked: data.is_blocked
        } as UserProfile;
      }
    } catch (e) {
      console.warn('Profiles table check error:', e);
    }

    if (metaNick) {
      return {
        id: userId,
        nickname: metaNick,
        locale: 'es',
        nickname_confirmed: metaConfirmed,
        created_at: new Date().toISOString()
      };
    }

    return null;
  },

  async updateNickname(userId: string, nickname: string) {
    const cleanNick = nickname.trim();

    // 1. Guardar en user_metadata de Supabase Auth (nunca falla por RLS o falta de tabla)
    try {
      await supabase.auth.updateUser({
        data: {
          nickname: cleanNick,
          nickname_confirmed: true
        }
      });
    } catch (e) {
      console.warn('Could not update user_metadata in Supabase auth:', e);
    }

    // 2. Intentar UPDATE en tabla profiles primero (utiliza policy profiles_update_own)
    try {
      const { data: updateData, error: updateError } = await supabase
        .from('profiles')
        .update({
          nickname: cleanNick,
          nickname_confirmed: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)
        .select()
        .maybeSingle();

      if (!updateError && updateData) {
        return updateData as UserProfile;
      }
    } catch (e) {
      console.warn('Could not update profile row in DB:', e);
    }

    // 3. Si no existía la fila, intentar upsert/insert
    try {
      const { data, error } = await supabase
        .from('profiles')
        .upsert({
          id: userId,
          nickname: cleanNick,
          nickname_confirmed: true,
          updated_at: new Date().toISOString()
        }, { onConflict: 'id' })
        .select()
        .maybeSingle();

      if (!error && data) {
        return data as UserProfile;
      }
    } catch (e) {
      console.warn('Could not upsert profile row in DB:', e);
    }

    return {
      id: userId,
      nickname: cleanNick,
      locale: 'es',
      nickname_confirmed: true,
      created_at: new Date().toISOString()
    } as UserProfile;
  },

  async updateLocale(userId: string, locale: 'es' | 'en') {
    const { error } = await supabase
      .from('profiles')
      .update({ locale, updated_at: new Date().toISOString() })
      .eq('id', userId);

    if (error) throw error;
  },

  async verifyOtp(email: string, token: string) {
    const { data, error } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: token.trim(),
      type: 'signup'
    });
    if (error) throw error;
    return data;
  },

  async resendVerification(email: string) {
    const { data, error } = await supabase.auth.resend({
      type: 'signup',
      email: email.trim()
    });
    if (error) throw error;
    return data;
  }
};
