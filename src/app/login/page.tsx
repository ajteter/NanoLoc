'use client';

// @ts-ignore
import { useActionState } from 'react';
import { authenticate } from '@/lib/actions';

function LoginForm() {
    const [errorMessage, formAction, isPending] = useActionState(authenticate, undefined);

    return (
        <div className="flex min-h-full flex-col justify-center px-6 py-12 lg:px-8">
            <div className="sm:mx-auto sm:w-full sm:max-w-sm">
                <div className="flex justify-center mb-4">
                    <span className="text-3xl font-bold bg-gradient-to-r from-indigo-500 to-purple-500 bg-clip-text text-transparent">NanoLoc</span>
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
                                className="block w-full rounded-md border-0 bg-white/5 py-1.5 text-white shadow-sm ring-1 ring-inset ring-white/10 focus:ring-2 focus:ring-inset focus:ring-indigo-500 sm:text-sm sm:leading-6"
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
                                className="block w-full rounded-md border-0 bg-white/5 py-1.5 text-white shadow-sm ring-1 ring-inset ring-white/10 focus:ring-2 focus:ring-inset focus:ring-indigo-500 sm:text-sm sm:leading-6"
                            />
                        </div>
                    </div>

                    <div>
                        <button
                            type="submit"
                            disabled={isPending}
                            className="flex w-full justify-center rounded-md bg-indigo-500 px-3 py-1.5 text-sm font-semibold leading-6 text-white shadow-sm hover:bg-indigo-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 disabled:opacity-50"
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

                <p className="mt-10 text-center text-sm text-gray-400">
                    Don&apos;t have an account?{' '}
                    <a href="/register" className="font-semibold leading-6 text-indigo-400 hover:text-indigo-300">
                        Sign up
                    </a>
                </p>
            </div>
        </div>
    );
}

export default function LoginPage() {
    return (
        <main className="flex min-h-screen flex-col items-center justify-center bg-gray-900">
            <LoginForm />
        </main>
    );
}
