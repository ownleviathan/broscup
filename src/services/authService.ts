import { supabase } from './supabase';

export interface UserProfile {
  id: string;
  nickname: string;
  locale: 'es' | 'en';
  nickname_confirmed: boolean;
  created_at: string;
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
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password: pass
    });
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
    const { data, error } = await supabase
      .from('profiles')
      .select('id, nickname, locale, nickname_confirmed, created_at')
      .eq('id', userId)
      .single();

    if (error) {
      console.warn('Could not fetch profile:', error.message);
      return null;
    }
    return data as UserProfile;
  },

  async updateNickname(userId: string, nickname: string) {
    const { data, error } = await supabase
      .from('profiles')
      .update({
        nickname: nickname.trim(),
        nickname_confirmed: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;
    return data as UserProfile;
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
