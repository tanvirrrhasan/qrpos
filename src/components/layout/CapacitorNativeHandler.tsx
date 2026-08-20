'use client'

import { useEffect, useRef, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { useToast } from '@/lib/contexts/ToastContext';
import { RefreshCw } from 'lucide-react';

export default function CapacitorNativeHandler() {
    const router = useRouter();
    const pathname = usePathname();
    const { showToast } = useToast();
    const lastBackPressRef = useRef<number>(0);
    const pathnameRef = useRef<string>(pathname);

    useEffect(() => {
        pathnameRef.current = pathname;
    }, [pathname]);

    // 1. Android Native Back Button Handling
    useEffect(() => {
        // If NOT running in native Capacitor (e.g. web browser), DO NOTHING (100% skipped)
        if (!Capacitor.isNativePlatform()) {
            return;
        }

        let backListener: any = null;

        const setupBackButton = async () => {
            backListener = await App.addListener('backButton', () => {
                // Priority A: Check if any modal / drawer / popup overlay is open
                const openModal = document.querySelector('.modal, [role="dialog"], .drawer-open, [data-state="open"]');
                if (openModal) {
                    const closeBtn = openModal.querySelector('button[aria-label="Close"], button.close, .modal-close') as HTMLElement;
                    if (closeBtn) {
                        closeBtn.click();
                        return;
                    }
                }

                // Priority B: If not on root page (e.g. /pos, /sales/details, /inventory, etc.), navigate 1 step back
                if (pathnameRef.current !== '/' && pathnameRef.current !== '') {
                    router.back();
                    return;
                }

                // Priority C: If on root page (/), check for double press to exit app
                const now = Date.now();
                if (now - lastBackPressRef.current < 2000) {
                    App.exitApp();
                } else {
                    lastBackPressRef.current = now;
                    showToast('আবার ব্যাক চাপুন অ্যাপ বন্ধ করার জন্য', 'info');
                }
            });
        };

        setupBackButton();

        return () => {
            if (backListener && typeof backListener.remove === 'function') {
                backListener.remove();
            }
        };
    }, [router, showToast]);

    // 2. Pull-To-Refresh Gesture Handling for APK
    const [pullDistance, setPullDistance] = useState<number>(0);
    const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
    const startYRef = useRef<number>(0);
    const isPullingRef = useRef<boolean>(false);

    useEffect(() => {
        // Only active inside native Capacitor APK
        if (!Capacitor.isNativePlatform()) {
            return;
        }

        const handleTouchStart = (e: TouchEvent) => {
            if (window.scrollY === 0) {
                startYRef.current = e.touches[0].clientY;
                isPullingRef.current = true;
            }
        };

        const handleTouchMove = (e: TouchEvent) => {
            if (!isPullingRef.current || isRefreshing) return;
            const currentY = e.touches[0].clientY;
            const deltaY = currentY - startYRef.current;

            if (deltaY > 0 && window.scrollY === 0) {
                const distance = Math.min(deltaY * 0.4, 90);
                setPullDistance(distance);
            } else {
                setPullDistance(0);
            }
        };

        const handleTouchEnd = () => {
            if (!isPullingRef.current) return;
            isPullingRef.current = false;

            if (pullDistance > 60 && !isRefreshing) {
                setIsRefreshing(true);
                setPullDistance(60);
                
                setTimeout(() => {
                    window.location.reload();
                }, 400);
            } else {
                setPullDistance(0);
            }
        };

        window.addEventListener('touchstart', handleTouchStart, { passive: true });
        window.addEventListener('touchmove', handleTouchMove, { passive: true });
        window.addEventListener('touchend', handleTouchEnd);

        return () => {
            window.removeEventListener('touchstart', handleTouchStart);
            window.removeEventListener('touchmove', handleTouchMove);
            window.removeEventListener('touchend', handleTouchEnd);
        };
    }, [pullDistance, isRefreshing]);

    // Return null if on web browser
    if (!Capacitor.isNativePlatform()) {
        return null;
    }

    return (
        <>
            {(pullDistance > 0 || isRefreshing) && (
                <div style={{
                    position: 'fixed',
                    top: `${Math.max(12, pullDistance - 35)}px`,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    zIndex: 99999,
                    background: '#ffffff',
                    width: '42px',
                    height: '42px',
                    borderRadius: '50%',
                    boxShadow: '0 4px 14px rgba(0,0,0,0.18)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: isPullingRef.current ? 'none' : 'all 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
                }}>
                    <RefreshCw 
                        size={22} 
                        color="#2563eb"
                        style={{
                            transform: `rotate(${pullDistance * 4}deg)`,
                            animation: isRefreshing ? 'spin 0.8s linear infinite' : 'none'
                        }}
                    />
                </div>
            )}
            <style jsx global>{`
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            `}</style>
        </>
    );
}
