'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { UserPlus, ArrowRight, Shield } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { useToast } from '@/components/ui/Toast';

export default function SignupPage() {
  const router = useRouter();
  const { toast } = useToast();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'ADMIN' | 'FACULTY' | 'STAFF'>('ADMIN');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('Password must contain at least 8 characters');
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, role }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create account');
      }

      toast.success('Account registered successfully! Welcome aboard.');
      router.push('/dashboard');
      router.refresh();
    } catch (err: any) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-stone-950 via-zinc-950 to-red-950 p-4 text-zinc-100 relative overflow-hidden">
      <div className="absolute top-1/4 -left-40 w-96 h-96 bg-red-900/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-40 w-96 h-96 bg-rose-950/20 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 mb-3">
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
            Staff & Faculty Registration
          </p>
        </div>

        <Card className="border-zinc-800 bg-zinc-900/90 backdrop-blur-xl shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-red-700 via-rose-600 to-red-800" />

          <CardHeader className="pt-7">
            <div className="flex items-center justify-between">
              <CardTitle className="text-white text-xl font-bold">Register Account</CardTitle>
              <Badge variant="crimson" size="sm">Staff Access</Badge>
            </div>
            <CardDescription className="text-zinc-400">
              Create an administrative or faculty credentials profile
            </CardDescription>
          </CardHeader>

          <CardContent>
            {error && (
              <div className="mb-4 p-3 rounded-xl bg-red-950/70 border border-red-800 text-red-300 text-xs font-semibold">
                {error}
              </div>
            )}

            <form onSubmit={handleSignup} className="space-y-4">
              <div>
                <Input
                  label="Full Name"
                  type="text"
                  placeholder="e.g. Dr. Priya Verma"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="bg-zinc-950 border-zinc-700 text-white placeholder:text-zinc-500 focus:border-red-600 focus:ring-red-600/30"
                />
              </div>

              <div>
                <Input
                  label="Academic Email Address"
                  type="email"
                  placeholder="name@nitp.ac.in"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="bg-zinc-950 border-zinc-700 text-white placeholder:text-zinc-500 focus:border-red-600 focus:ring-red-600/30"
                />
              </div>

              <div>
                <Input
                  label="Password (min. 8 characters)"
                  type="password"
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  className="bg-zinc-950 border-zinc-700 text-white placeholder:text-zinc-500 focus:border-red-600 focus:ring-red-600/30"
                />
              </div>

              <div>
                <Select
                  label="Designated Role"
                  value={role}
                  onChange={(e) => setRole(e.target.value as any)}
                  className="bg-zinc-950 border-zinc-700 text-white focus:border-red-600"
                >
                  <option value="ADMIN">ADMIN (Full Scheduling & Seating Privileges)</option>
                  <option value="FACULTY">FACULTY (Timetable View & Room Availability)</option>
                  <option value="STAFF">STAFF (Seating & Roster Access)</option>
                </Select>
              </div>

              <Button
                type="submit"
                variant="primary"
                size="lg"
                isLoading={isLoading}
                className="w-full mt-3 font-bold py-3 text-sm shadow-md shadow-red-950/40"
              >
                Create Account Profile
                <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>
            </form>
          </CardContent>

          <CardFooter className="justify-center border-zinc-800/80 pt-3">
            <p className="text-xs text-zinc-400">
              Already have an account?{' '}
              <Link href="/login" className="text-red-400 font-bold hover:underline">
                Sign In
              </Link>
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
