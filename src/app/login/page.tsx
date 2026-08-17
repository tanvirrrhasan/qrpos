import { QrCode, Lock, Mail } from 'lucide-react';
import styles from './login.module.css';
import { login } from './actions';

export default function LoginPage() {
  return (
    <div className={styles.loginContainer}>
      <div className={styles.loginCard}>
        <div className={styles.logoWrapper}>
          <QrCode size={48} className={styles.logoIcon} />
          <h1>QRPOS</h1>
          <p>Login to your store</p>
        </div>

        <form className={styles.form} action={login}>
          <div className={styles.inputGroup}>
            <label htmlFor="email">Email Address</label>
            <div className={styles.inputWrapper}>
              <Mail size={20} className={styles.inputIcon} />
              <input 
                id="email" 
                name="email" 
                type="email" 
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
                name="password" 
                type="password" 
                placeholder="••••••••" 
                required 
              />
            </div>
          </div>

          <button type="submit" className={styles.submitBtn}>
            Sign In
          </button>
        </form>
      </div>
    </div>
  );
}
