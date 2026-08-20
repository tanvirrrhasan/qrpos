'use client'

import React, { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import Sidebar from './Sidebar';
import Header from './Header';
import BottomNav from './BottomNav';
import CapacitorNativeHandler from './CapacitorNativeHandler';
import { syncInitialData } from '@/lib/db/sync';
import { supabase } from '@/lib/supabase/client';
import styles from './layout.module.css';

import { useAuth } from '@/lib/contexts/AuthContext';

interface AppShellProps {
    children: React.ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
    const pathname = usePathname();
    const isPosPage = pathname === '/pos';
    const { user, loading } = useAuth();
    const [debugInfo, setDebugInfo] = useState<any>({});

    useEffect(() => {
        async function runSync() {
            try {
                const sessionInfo = await supabase.auth.getSession();
                const user = sessionInfo.data.session?.user;
                if (!user) return; // Don't run sync if not logged in
                
                const { error: linkErr } = await supabase.rpc('link_auth_user');
                
                // Test RLS by trying to fetch one category
                const { data: testCat, error: testErr } = await supabase.from('categories').select('*').limit(1);

                setDebugInfo({
                    email: user?.email,
                    uid: user?.id,
                    rpcError: linkErr ? linkErr.message : 'None',
                    rlsTest: testErr ? testErr.message : (testCat?.length ? 'Success' : 'No Data but RLS passed')
                });

                await syncInitialData();
            } catch (err) {
                console.error(err);
            }
        }
        runSync();
    }, []);

    const publicRoutes = ['/login', '/inv', '/p', '/qr-menu'];
    const isPublicRoute = publicRoutes.some(route => pathname === route || pathname?.startsWith(route + '/'));

    if (loading && !isPublicRoute) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--background)' }}>
                <div style={{ width: 36, height: 36, border: '3px solid var(--border)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                <style jsx>{`
                    @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }
                `}</style>
            </div>
        );
    }

    if (!user && !isPublicRoute) {
        return null;
    }

    return (
        <div className={styles.appShell}>
            <CapacitorNativeHandler />
            <Sidebar />
            <div className={styles.mainContent}>
                <Header />
                <main className={`${styles.pageContent} ${isPosPage ? styles.posPageContent : ''}`}>
                    {children}
                </main>
                <BottomNav />
            </div>
        </div>
    );
}
