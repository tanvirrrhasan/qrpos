'use client'

import React, { useEffect, useState } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import BottomNav from './BottomNav';
import { syncInitialData } from '@/lib/db/sync';
import { supabase } from '@/lib/supabase/client';
import styles from './layout.module.css';

interface AppShellProps {
    children: React.ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
    const [debugInfo, setDebugInfo] = useState<any>({});

    useEffect(() => {
        async function runSync() {
            try {
                const sessionInfo = await supabase.auth.getSession();
                const user = sessionInfo.data.session?.user;
                
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

    return (
        <div className={styles.appShell}>
            <Sidebar />
            <div className={styles.mainContent}>
                <Header />
                <main className={styles.pageContent}>
                    {children}
                </main>
                <BottomNav />
            </div>
        </div>
    );
}
