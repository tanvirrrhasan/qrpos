'use client'

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { QrCode, Lock, Mail } from 'lucide-react';
import styles from './login.module.css';
import { supabase } from '@/lib/supabase/client';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setError(signInError.message);
      setLoading(false);
      return;
    }

    try {
      await supabase.rpc('link_auth_user');
    } catch (err) {
      console.log('Linking user error:', err);
    }

    router.push('/');
  };

  return (
    <div className={styles.loginContainer}>
      <div className={styles.loginCard}>
        <div className={styles.logoWrapper}>
          <QrCode size={48} className={styles.logoIcon} />
          <h1>QRPOS</h1>
          <p>Login to your store</p>
        </div>

        <form className={styles.form} onSubmit={handleLogin}>
          {error && <div style={{color: '#ef4444', marginBottom: '1rem', textAlign: 'center', fontSize: '0.9rem'}}>{error}</div>}
          
          <div className={styles.inputGroup}>
            <label htmlFor="email">Email Address</label>
            <div className={styles.inputWrapper}>
              <Mail size={20} className={styles.inputIcon} />
              <input 
                id="email" 
                type="email" 
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="admin@qrpos.com" 
                required 
              />
            </div>
          </div>

          <div className={styles.inputGroup}>
            <label htmlFor="password">Password</label>
            <div className={styles.inputWrapper}>
              <Lock size={20} className={styles.inputIcon} />
              <input 
                id="password" 
                type="password" 
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••" 
                required 
              />
            </div>
          </div>

          <button type="submit" className={styles.submitBtn} disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}
