'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { GraduationCap, ArrowRight, Sparkles, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { useToast } from '@/components/ui/Toast';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get('from') || '/dashboard';
  const { toast } = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to log in');
      }

      toast.success('Welcome back! Logging in...');
      router.push(from);
      router.refresh();
    } catch (err: any) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const fillDemoAdmin = () => {
    setEmail('admin@nitp.ac.in');
    setPassword('AdminPassword123!');
  };

  return (
    <Card className="border-zinc-800 bg-zinc-900/90 backdrop-blur-xl shadow-2xl relative overflow-hidden">
      {/* Top Red Gradient Accent */}
      <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-red-700 via-rose-600 to-red-800" />

      <CardHeader className="pt-7">
        <div className="flex items-center justify-between">
          <CardTitle className="text-white text-xl font-bold">Staff Sign In</CardTitle>
          <Badge variant="crimson" size="sm">NIT Patna Core</Badge>
        </div>
        <CardDescription className="text-zinc-400">
          Enter credentials to access academic scheduler & seating controls
        </CardDescription>
      </CardHeader>

      <CardContent>
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-950/70 border border-red-800 text-red-300 text-xs font-semibold">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <Input
              label="Academic Email Address"
              type="email"
              placeholder="admin@nitp.ac.in"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="bg-zinc-950 border-zinc-700 text-white placeholder:text-zinc-500 focus:border-red-600 focus:ring-red-600/30"
            />
          </div>

          <div>
            <Input
              label="Secure Password"
              type="password"
              placeholder="••••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="bg-zinc-950 border-zinc-700 text-white placeholder:text-zinc-500 focus:border-red-600 focus:ring-red-600/30"
            />
          </div>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            isLoading={isLoading}
            className="w-full mt-2 font-bold py-3 text-sm shadow-md shadow-red-950/40"
          >
            Authenticate & Enter
            <ArrowRight className="w-4 h-4 ml-1.5" />
          </Button>
        </form>

        {/* Quick Demo Pre-fill */}
        <div className="mt-6 pt-4 border-t border-zinc-800/80 text-center">
          <button
            type="button"
            onClick={fillDemoAdmin}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-400 hover:text-red-300 transition-colors p-1.5 rounded-lg hover:bg-red-950/30"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Auto-fill Default Administrator Credentials
          </button>
        </div>
      </CardContent>

      <CardFooter className="justify-center border-zinc-800/80 pt-3">
        <p className="text-xs text-zinc-400">
          Need academic credentials?{' '}
          <Link href="/signup" className="text-red-400 font-bold hover:underline">
            Register New Staff
          </Link>
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
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-red-700 to-rose-950 border border-red-600/40 text-red-100 shadow-xl mb-3.5">
            <GraduationCap className="w-7 h-7" />
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
