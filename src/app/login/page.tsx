'use client';

import { useActionState } from 'react';
import { authenticate } from '@/lib/actions';
import { LogoIcon } from '@/components/LogoIcon';

function LoginForm() {
    const [errorMessage, formAction, isPending] = useActionState(authenticate, undefined);

    return (
        <div className="flex min-h-full flex-col justify-center px-6 py-12 lg:px-8">
            <div className="sm:mx-auto sm:w-full sm:max-w-sm">
                <div className="flex justify-center items-center gap-3 mb-4">
                    <LogoIcon className="w-10 h-10" />
                    <span className="text-3xl font-bold text-zinc-50 tracking-tight">NanoLoc</span>
                </div>
                <h2 className="mt-4 text-center text-2xl font-bold leading-9 tracking-tight text-white/90">
                    Sign in to your account
                </h2>
            </div>

            <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-sm">
                <form action={formAction} className="space-y-6">
                    <div>
                        <label
                            htmlFor="username"
                            className="block text-sm font-medium leading-6 text-white/90"
                        >
                            Username
                        </label>
                        <div className="mt-2">
                            <input
                                id="username"
                                name="username"
                                type="text"
                                autoComplete="username"
                                required
                                className="block w-full rounded-md border-0 bg-white/5 py-1.5 text-white shadow-sm ring-1 ring-inset ring-white/10 focus:ring-2 focus:ring-inset focus:ring-zinc-400 sm:text-sm sm:leading-6"
                            />
                        </div>
                    </div>

                    <div>
                        <div className="flex items-center justify-between">
                            <label
                                htmlFor="password"
                                className="block text-sm font-medium leading-6 text-white/90"
                            >
                                Password
                            </label>
                        </div>
                        <div className="mt-2">
                            <input
                                id="password"
                                name="password"
                                type="password"
                                autoComplete="current-password"
                                required
                                minLength={6}
                                className="block w-full rounded-md border-0 bg-white/5 py-1.5 text-white shadow-sm ring-1 ring-inset ring-white/10 focus:ring-2 focus:ring-inset focus:ring-zinc-400 sm:text-sm sm:leading-6"
                            />
                        </div>
                    </div>

                    <div>
                        <button
                            type="submit"
                            disabled={isPending}
                            className="flex w-full justify-center rounded-md bg-zinc-100 px-3 py-1.5 text-sm font-semibold leading-6 text-zinc-900 shadow-sm hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-400 disabled:opacity-50"
                        >
                            {isPending ? 'Signing in...' : 'Sign in'}
                        </button>
                    </div>
                    {errorMessage && (
                        <div
                            className="flex h-8 items-end space-x-1"
                            aria-live="polite"
                            aria-atomic="true"
                        >
                            <p className="text-sm text-red-500">{errorMessage}</p>
                        </div>
                    )}
                </form>

                <p className="mt-10 text-center text-sm text-zinc-400">
                    Don&apos;t have an account?{' '}
                    <a href="/register" className="font-semibold leading-6 text-zinc-300 hover:text-zinc-200">
                        Sign up
                    </a>
                </p>
            </div>
        </div>
    );
}

export default function LoginPage() {
    return (
        <main className="flex min-h-screen flex-col items-center justify-center bg-zinc-900">
            <LoginForm />
        </main>
    );
}
