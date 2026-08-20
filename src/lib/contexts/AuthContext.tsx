'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { User } from '@supabase/supabase-js'

export type UserRole = 'owner' | 'admin' | 'manager' | 'cashier'

export interface StaffProfile {
    id: string
    store_id: string
    auth_user_id: string
    name: string
    role: UserRole
    phone: string
    is_active: boolean
    permissions?: Record<string, boolean>
}

interface AuthContextType {
    user: User | null
    profile: StaffProfile | null
    role: UserRole | null
    storeId: string | null
    loading: boolean
    hasPermission: (key: import('@/lib/permissions').PermissionKey) => boolean
    signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    profile: null,
    role: null,
    storeId: null,
    loading: true,
    hasPermission: () => false,
    signOut: async () => { },
})

import { DEFAULT_PERMISSIONS, PermissionKey } from '@/lib/permissions'

import { localDB } from '@/lib/db/local'
import { v4 as uuidv4 } from 'uuid'

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<User | null>(null)
    const [profile, setProfile] = useState<StaffProfile | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        let mounted = true

        async function getSession() {
            setLoading(true)
            const { data: { session } } = await supabase.auth.getSession()

            if (session?.user) {
                if (mounted) setUser(session.user)
                await fetchProfile(session.user.id, mounted, false)
            } else {
                if (mounted) {
                    setUser(null)
                    setProfile(null)
                }
            }
            if (mounted) setLoading(false)
        }

        getSession()

        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                if (session?.user) {
                    if (mounted) setUser(session.user)
                    const isSignIn = event === 'SIGNED_IN';
                    await fetchProfile(session.user.id, mounted, isSignIn)
                } else {
                    if (mounted) {
                        setUser(null)
                        setProfile(null)
                    }
                }
                if (mounted) setLoading(false)
            }
        )

        return () => {
            mounted = false
            subscription.unsubscribe()
        }
    }, [])

    async function fetchProfile(userId: string, mounted: boolean, isExplicitLogin: boolean = false) {
        try {
            const { data, error } = await supabase
                .from('staff')
                .select('*')
                .eq('auth_user_id', userId)
                .single()

            let staffData = data as StaffProfile;

            if (error || !staffData) {
                // Check localDB staff
                const localStaff = await localDB.staff.where('auth_user_id').equals(userId).first();
                if (localStaff) {
                    staffData = localStaff as any;
                }
            }

            if (staffData && mounted) {
                setProfile(staffData);
                if (isExplicitLogin) {
                    // Log login activity into Dexie activityLog ONLY on explicit login
                    const now = new Date().toISOString();
                    const actData = {
                        id: uuidv4(),
                        store_id: staffData.store_id || 'default',
                        staff_id: staffData.id,
                        action: 'user_login',
                        entity_type: 'staff',
                        entity_id: staffData.id,
                        details: { name: staffData.name, role: staffData.role },
                        created_at: now
                    };
                    await localDB.activityLog.put(actData);
                    await localDB.staff.update(staffData.id, { last_login_at: now });
                }
            }
        } catch (error) {
            console.error('Unexpected error fetching profile:', error)
        }
    }

    const signOut = async () => {
        try {
            if (profile) {
                const now = new Date().toISOString();
                const actData = {
                    id: uuidv4(),
                    store_id: profile.store_id || 'default',
                    staff_id: profile.id,
                    action: 'user_logout',
                    entity_type: 'staff',
                    entity_id: profile.id,
                    details: { name: profile.name, role: profile.role },
                    created_at: now
                };
                await localDB.activityLog.put(actData);
                try {
                    await supabase.from('activity_logs').insert([actData]);
                } catch (e) {}
            }
        } catch (e) {
            console.error('Logout log error', e);
        }
        await supabase.auth.signOut()
    }

    const hasPermission = (key: PermissionKey): boolean => {
        if (!profile || !profile.role) return false;

        // 1. Check if the specific permission exists in the user's custom permissions JSONB
        if (profile.permissions && typeof profile.permissions[key] === 'boolean') {
            return profile.permissions[key];
        }

        // 2. Fall back to the default permission for their role
        return DEFAULT_PERMISSIONS[profile.role]?.[key] ?? false;
    }

    return (
        <AuthContext.Provider
            value={{
                user,
                profile,
                role: profile?.role || null,
                storeId: profile?.store_id || null,
                loading,
                hasPermission,
                signOut
            }}
        >
            {children}
        </AuthContext.Provider>
    )
}

export const useAuth = () => {
    return useContext(AuthContext)
}
