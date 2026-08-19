'use client'

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/contexts/AuthContext';
import { supabase } from '@/lib/supabase/client';
import { localDB } from '@/lib/db/local';
import { User, Lock, Phone, Shield, Building, Save, Eye, EyeOff, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react';
import styles from './profile.module.css';

export default function ProfilePage() {
    const { user, profile, role, storeId } = useAuth();

    const [activeTab, setActiveTab] = useState<'profile' | 'security'>('profile');

    // Profile form fields
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [savingProfile, setSavingProfile] = useState(false);
    const [profileMsg, setProfileMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    // Password form fields
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showNewPass, setShowNewPass] = useState(false);
    const [showConfirmPass, setShowConfirmPass] = useState(false);
    const [updatingPassword, setUpdatingPassword] = useState(false);
    const [passwordMsg, setPasswordMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    useEffect(() => {
        if (profile) {
            setName(profile.name || '');
            setPhone(profile.phone || '');
        }
    }, [profile]);

    const handleSaveProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!profile?.id) return;

        setSavingProfile(true);
        setProfileMsg(null);

        try {
            // Update Supabase staff table
            const { error: sbErr } = await supabase
                .from('staff')
                .update({
                    name: name.trim(),
                    phone: phone.trim()
                })
                .eq('id', profile.id);

            if (sbErr) {
                console.warn('Supabase profile update warning:', sbErr.message);
            }

            // Update IndexedDB local staff table
            await localDB.staff.update(profile.id, {
                name: name.trim(),
                phone: phone.trim()
            });

            setProfileMsg({ type: 'success', text: 'Profile details updated successfully! Please refresh or navigate to see changes.' });
        } catch (err: any) {
            console.error('Error updating profile:', err);
            setProfileMsg({ type: 'error', text: err.message || 'Failed to update profile details.' });
        } finally {
            setSavingProfile(false);
        }
    };

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setPasswordMsg(null);

        if (!newPassword || newPassword.length < 6) {
            setPasswordMsg({ type: 'error', text: 'Password must be at least 6 characters long.' });
            return;
        }

        if (newPassword !== confirmPassword) {
            setPasswordMsg({ type: 'error', text: 'New password and confirm password do not match.' });
            return;
        }

        setUpdatingPassword(true);

        try {
            const { error } = await supabase.auth.updateUser({
                password: newPassword
            });

            if (error) {
                throw error;
            }

            setPasswordMsg({ type: 'success', text: 'Your password has been changed successfully! Use your new password on your next login.' });
            setNewPassword('');
            setConfirmPassword('');
        } catch (err: any) {
            console.error('Error changing password:', err);
            setPasswordMsg({ type: 'error', text: err.message || 'Failed to update password.' });
        } finally {
            setUpdatingPassword(false);
        }
    };

    return (
        <div className={styles.container}>
            {/* Header Card */}
            <div className={styles.headerCard}>
                <div className={styles.avatarWrapper}>
                    <div className={styles.avatar}>
                        {name ? name[0].toUpperCase() : 'U'}
                    </div>
                </div>

                <div className={styles.headerDetails}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                        <h1 className={styles.userName}>{name || 'Staff Member'}</h1>
                        <span className={styles.roleBadge}>
                            <Shield size={13} />
                            {role || 'Staff'}
                        </span>
                    </div>

                    <div className={styles.metaRow}>
                        <span>✉️ {user?.email || 'N/A'}</span>
                        <span>•</span>
                        <span>📞 {phone || 'No phone set'}</span>
                        <span>•</span>
                        <span>🏬 Store: {storeId || 'Default Store'}</span>
                    </div>
                </div>
            </div>

            {/* Tab Navigation */}
            <div className={styles.tabsRow}>
                <button 
                    className={`${styles.tabBtn} ${activeTab === 'profile' ? styles.activeTab : ''}`}
                    onClick={() => setActiveTab('profile')}
                >
                    <User size={18} />
                    <span>Personal Info</span>
                </button>
                <button 
                    className={`${styles.tabBtn} ${activeTab === 'security' ? styles.activeTab : ''}`}
                    onClick={() => setActiveTab('security')}
                >
                    <Lock size={18} />
                    <span>Security & Password</span>
                </button>
            </div>

            {/* Tab Content 1: Personal Info */}
            {activeTab === 'profile' && (
                <div className={styles.contentCard}>
                    <div className={styles.cardHeader}>
                        <h2>Profile Details</h2>
                        <p>Update your personal account information and contact number.</p>
                    </div>

                    {profileMsg && (
                        <div className={`${styles.alert} ${profileMsg.type === 'success' ? styles.alertSuccess : styles.alertError}`}>
                            {profileMsg.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                            <span>{profileMsg.text}</span>
                        </div>
                    )}

                    <form onSubmit={handleSaveProfile} className={styles.form}>
                        <div className={styles.inputGrid}>
                            <div className={styles.inputGroup}>
                                <label>Full Name</label>
                                <div className={styles.inputWithIcon}>
                                    <User size={18} className={styles.fieldIcon} />
                                    <input 
                                        type="text" 
                                        value={name} 
                                        onChange={(e) => setName(e.target.value)} 
                                        placeholder="Enter your full name" 
                                        required 
                                    />
                                </div>
                            </div>

                            <div className={styles.inputGroup}>
                                <label>Phone Number</label>
                                <div className={styles.inputWithIcon}>
                                    <Phone size={18} className={styles.fieldIcon} />
                                    <input 
                                        type="text" 
                                        value={phone} 
                                        onChange={(e) => setPhone(e.target.value)} 
                                        placeholder="e.g. +8801700000000" 
                                    />
                                </div>
                            </div>

                            <div className={styles.inputGroup}>
                                <label>Email Address (Account Login)</label>
                                <div className={styles.inputWithIcon}>
                                    <span className={styles.fieldIcon} style={{ fontSize: '0.9rem' }}>✉️</span>
                                    <input 
                                        type="email" 
                                        value={user?.email || ''} 
                                        disabled 
                                        style={{ opacity: 0.75, cursor: 'not-allowed' }}
                                    />
                                </div>
                                <span className={styles.hint}>Email address is tied to your account login and cannot be changed here.</span>
                            </div>

                            <div className={styles.inputGroup}>
                                <label>Account Role</label>
                                <div className={styles.inputWithIcon}>
                                    <Shield size={18} className={styles.fieldIcon} />
                                    <input 
                                        type="text" 
                                        value={role ? role.toUpperCase() : 'USER'} 
                                        disabled 
                                        style={{ opacity: 0.75, cursor: 'not-allowed' }}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className={styles.formActions}>
                            <button type="submit" className={styles.saveBtn} disabled={savingProfile}>
                                <Save size={18} />
                                {savingProfile ? 'Saving Changes...' : 'Save Profile Changes'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Tab Content 2: Security & Password */}
            {activeTab === 'security' && (
                <div className={styles.contentCard}>
                    <div className={styles.cardHeader}>
                        <h2>Security & Password</h2>
                        <p>Keep your account secure by updating your account login password.</p>
                    </div>

                    {passwordMsg && (
                        <div className={`${styles.alert} ${passwordMsg.type === 'success' ? styles.alertSuccess : styles.alertError}`}>
                            {passwordMsg.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                            <span>{passwordMsg.text}</span>
                        </div>
                    )}

                    <form onSubmit={handleChangePassword} className={styles.form}>
                        <div className={styles.inputGrid}>
                            <div className={styles.inputGroup}>
                                <label>New Password</label>
                                <div className={styles.inputWithIcon}>
                                    <Lock size={18} className={styles.fieldIcon} />
                                    <input 
                                        type={showNewPass ? 'text' : 'password'} 
                                        value={newPassword} 
                                        onChange={(e) => setNewPassword(e.target.value)} 
                                        placeholder="Min. 6 characters" 
                                        required 
                                    />
                                    <button 
                                        type="button" 
                                        className={styles.eyeBtn}
                                        onClick={() => setShowNewPass(!showNewPass)}
                                    >
                                        {showNewPass ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                            </div>

                            <div className={styles.inputGroup}>
                                <label>Confirm New Password</label>
                                <div className={styles.inputWithIcon}>
                                    <Lock size={18} className={styles.fieldIcon} />
                                    <input 
                                        type={showConfirmPass ? 'text' : 'password'} 
                                        value={confirmPassword} 
                                        onChange={(e) => setConfirmPassword(e.target.value)} 
                                        placeholder="Re-enter new password" 
                                        required 
                                    />
                                    <button 
                                        type="button" 
                                        className={styles.eyeBtn}
                                        onClick={() => setShowConfirmPass(!showConfirmPass)}
                                    >
                                        {showConfirmPass ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className={styles.formActions}>
                            <button type="submit" className={styles.saveBtn} disabled={updatingPassword}>
                                <Lock size={18} />
                                {updatingPassword ? 'Updating Password...' : 'Update Password'}
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
}
