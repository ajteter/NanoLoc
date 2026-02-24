'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { toast } from 'sonner';

function RegisterForm() {
    const router = useRouter();
    const [isPending, setIsPending] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setErrorMessage(null);

        const formData = new FormData(e.currentTarget);
        const username = formData.get('username') as string;
        const password = formData.get('password') as string;
        const confirmPassword = formData.get('confirmPassword') as string;

        // Client-side password confirmation
        if (password !== confirmPassword) {
            setErrorMessage('Passwords do not match.');
            return;
        }

        if (password.length < 6) {
            setErrorMessage('Password must be at least 6 characters.');
            return;
        }

        setIsPending(true);

        try {
            // Call register API
            const res = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password }),
            });

            const data = await res.json();

            if (!res.ok) {
                setErrorMessage(
                    typeof data.error === 'string'
                        ? data.error
                        : 'Registration failed.'
                );
                setIsPending(false);
                return;
            }

            toast.message('Account created', {
                description: 'Logging you in...',
            });

            // Auto sign-in after registration
            const signInRes = await signIn('credentials', {
                username,
                password,
                redirect: false,
            });

            if (signInRes?.error) {
                toast.error('Login failed after registration. Please sign in manually.');
                router.push('/login');
            } else {
                router.push('/projects');
            }
        } catch {
            setErrorMessage('An unexpected error occurred.');
        } finally {
            setIsPending(false);
        }
    };

    return (
        <div className="flex min-h-full flex-col justify-center px-6 py-12 lg:px-8">
            <div className="sm:mx-auto sm:w-full sm:max-w-sm">
                <div className="flex justify-center mb-4">
                    <span className="text-3xl font-bold bg-gradient-to-r from-indigo-500 to-purple-500 bg-clip-text text-transparent">NanoLoc</span>
                </div>
                <h2 className="mt-4 text-center text-2xl font-bold leading-9 tracking-tight text-white/90">
                    Create your account
                </h2>
            </div>

            <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-sm">
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label htmlFor="username" className="block text-sm font-medium leading-6 text-white/90">
                            Username
                        </label>
                        <div className="mt-2">
                            <input
                                id="username"
                                name="username"
                                type="text"
                                autoComplete="username"
                                required
                                className="block w-full rounded-md border-0 bg-white/5 py-1.5 text-white shadow-sm ring-1 ring-inset ring-white/10 focus:ring-2 focus:ring-inset focus:ring-indigo-500 sm:text-sm sm:leading-6"
                            />
                        </div>
                    </div>

                    <div>
                        <label htmlFor="password" className="block text-sm font-medium leading-6 text-white/90">
                            Password
                        </label>
                        <div className="mt-2">
                            <input
                                id="password"
                                name="password"
                                type="password"
                                autoComplete="new-password"
                                required
                                minLength={6}
                                className="block w-full rounded-md border-0 bg-white/5 py-1.5 text-white shadow-sm ring-1 ring-inset ring-white/10 focus:ring-2 focus:ring-inset focus:ring-indigo-500 sm:text-sm sm:leading-6"
                            />
                        </div>
                    </div>

                    <div>
                        <label htmlFor="confirmPassword" className="block text-sm font-medium leading-6 text-white/90">
                            Confirm Password
                        </label>
                        <div className="mt-2">
                            <input
                                id="confirmPassword"
                                name="confirmPassword"
                                type="password"
                                autoComplete="new-password"
                                required
                                minLength={6}
                                className="block w-full rounded-md border-0 bg-white/5 py-1.5 text-white shadow-sm ring-1 ring-inset ring-white/10 focus:ring-2 focus:ring-inset focus:ring-indigo-500 sm:text-sm sm:leading-6"
                            />
                        </div>
                    </div>

                    {errorMessage && (
                        <div aria-live="polite" aria-atomic="true">
                            <p className="text-sm text-red-500">{errorMessage}</p>
                        </div>
                    )}

                    <div>
                        <button
                            type="submit"
                            disabled={isPending}
                            className="flex w-full justify-center rounded-md bg-indigo-500 px-3 py-1.5 text-sm font-semibold leading-6 text-white shadow-sm hover:bg-indigo-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 disabled:opacity-50"
                        >
                            {isPending ? 'Creating account...' : 'Sign up'}
                        </button>
                    </div>
                </form>

                <p className="mt-10 text-center text-sm text-gray-400">
                    Already have an account?{' '}
                    <Link href="/login" className="font-semibold leading-6 text-indigo-400 hover:text-indigo-300">
                        Sign in
                    </Link>
                </p>
            </div>
        </div>
    );
}

export default function RegisterPage() {
    return (
        <main className="flex min-h-screen flex-col items-center justify-center bg-gray-900">
            <RegisterForm />
        </main>
    );
}
