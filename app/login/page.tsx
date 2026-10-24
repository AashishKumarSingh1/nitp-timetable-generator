'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { ShieldCheck, AlertCircle, ArrowRight, Sparkles, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { useToast } from '@/components/ui/Toast';

function GoogleIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
        fill="#EA4335"
      />
    </svg>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get('from') || '/dashboard';
  const urlError = searchParams.get('error');
  const { toast } = useToast();

  const [isLoading, setIsLoading] = useState(false);
  const [isConfigured, setIsConfigured] = useState<boolean | null>(null);
  const [errorMessage, setErrorMessage] = useState(urlError || '');

  useEffect(() => {
    // Check if Google OAuth client credentials are configured in .env
    fetch('/api/auth/google?check=1')
      .then((res) => res.json())
      .then((data) => setIsConfigured(Boolean(data.configured)))
      .catch(() => setIsConfigured(false));
  }, []);

  const handleGoogleSignIn = () => {
    setIsLoading(true);
    setErrorMessage('');
    // Full browser navigation required for OAuth handshake
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.href = '/api/auth/google';
  };

  const handleDevGoogleSignIn = async (email: string) => {
    setIsLoading(true);
    setErrorMessage('');
    try {
      const res = await fetch('/api/auth/google/dev-signin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name: email.includes('admin') ? 'NIT Patna Admin' : 'Dr. Department Faculty' }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to authenticate');
      }
      toast.success(`Authenticated via Google Workspace SSO (${email})`);
      router.push(from);
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Login failed';
      setErrorMessage(msg);
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="border-zinc-800 bg-zinc-900/90 backdrop-blur-xl shadow-2xl relative overflow-hidden">
      {/* Top Prestigious Crimson Accent */}
      <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-red-700 via-rose-600 to-red-800" />

      <CardHeader className="pt-7 text-center">
        <div className="inline-flex items-center justify-center mx-auto mb-2">
          <Badge variant="crimson" size="sm" className="gap-1.5 px-3 py-1">
            <ShieldCheck className="w-3.5 h-3.5" />
            Institutional Google SSO
          </Badge>
        </div>
        <CardTitle className="text-white text-xl font-bold tracking-tight">
          Single Sign-On Portal
        </CardTitle>
        <CardDescription className="text-zinc-400 text-xs mt-1">
          Sign in using your authorized NIT Patna Google Workspace account
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {errorMessage && (
          <div className="p-3.5 rounded-xl bg-red-950/70 border border-red-800/80 text-red-200 text-xs font-semibold flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              {errorMessage === 'google_not_configured'
                ? 'Google OAuth credentials (GOOGLE_CLIENT_ID & GOOGLE_CLIENT_SECRET) are not set in .env yet.'
                : errorMessage}
            </div>
          </div>
        )}

        {/* Primary Google Sign In Button */}
        <div className="pt-2">
          <button
            onClick={handleGoogleSignIn}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-3.5 px-5 py-3.5 rounded-xl font-bold text-sm bg-white text-zinc-900 hover:bg-zinc-100 active:bg-zinc-200 shadow-xl shadow-black/40 transition-all border border-zinc-200 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed group"
          >
            <GoogleIcon className="w-5 h-5 group-hover:scale-105 transition-transform shrink-0" />
            <span>Continue with Google Workspace</span>
            <ArrowRight className="w-4 h-4 text-zinc-400 group-hover:text-zinc-900 group-hover:translate-x-0.5 transition-all ml-auto" />
          </button>
        </div>

        {/* Domain Notice */}
        <div className="p-3 rounded-xl bg-zinc-950/70 border border-zinc-800 text-[11px] text-zinc-400 space-y-1">
          <div className="flex items-center gap-1.5 text-zinc-300 font-semibold">
            <Building2 className="w-3.5 h-3.5 text-red-400" />
            Authorized Institute Domain
          </div>
          <p className="leading-relaxed">
            Please select your official institutional email (e.g.{' '}
            <span className="text-red-300 font-mono">@nitp.ac.in</span>) at the Google prompt to automatically unlock your faculty or administrator role.
          </p>
        </div>

        {/* Developer Sandbox Mode: Instant Google Sign-In helper when OAuth credentials are pending */}
        {isConfigured === false && (
          <div className="pt-2 border-t border-zinc-800/80 space-y-2">
            <div className="flex items-center justify-between text-[11px] text-amber-300 font-semibold">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                Dev Mode: Instant Google SSO
              </span>
              <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-mono">No GCP Setup Needed</span>
            </div>
            <p className="text-[11px] text-zinc-400 leading-snug">
              Google Client ID is not configured in <code className="text-zinc-300">.env</code> yet. You can sign in immediately with a simulated institutional Google account:
            </p>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleDevGoogleSignIn('admin@nitp.ac.in')}
                disabled={isLoading}
                className="text-xs border-zinc-700 bg-zinc-950 text-zinc-200 hover:bg-zinc-800 hover:border-red-600 justify-center"
              >
                Sign in as Admin
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleDevGoogleSignIn('faculty.cse@nitp.ac.in')}
                disabled={isLoading}
                className="text-xs border-zinc-700 bg-zinc-950 text-zinc-200 hover:bg-zinc-800 hover:border-red-600 justify-center"
              >
                Sign in as Faculty
              </Button>
            </div>
          </div>
        )}
      </CardContent>

      <CardFooter className="justify-center border-zinc-800/80 pt-3 pb-5">
        <p className="text-[11px] text-zinc-400 text-center">
          First-time login? Your account is provisioned automatically upon your first Google authentication.
        </p>
      </CardFooter>
    </Card>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-stone-950 via-zinc-950 to-red-950 p-4 text-zinc-100 relative overflow-hidden">
      <div className="absolute top-1/4 -right-40 w-96 h-96 bg-red-900/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -left-40 w-96 h-96 bg-rose-950/20 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-7">
          <div className="inline-flex items-center justify-center w-16 h-16 mb-3.5">
            <Image
              src="/logo.png"
              alt="NIT Patna Official Logo"
              width={64}
              height={64}
              className="w-16 h-16 object-contain drop-shadow-lg"
              priority
            />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white sm:text-3xl uppercase">
            NIT Patna
          </h1>
          <p className="text-xs text-zinc-400 mt-1 font-medium tracking-wide">
            Academic Registry & Timetable Operations
          </p>
        </div>

        <Suspense fallback={<div className="p-8 text-center text-zinc-400">Loading sign in...</div>}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
