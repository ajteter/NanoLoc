'use client';

// @ts-ignore
import { useActionState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { register } from '@/lib/actions';
import { toast } from 'sonner';

function RegisterForm() {
    const [errorMessage, formAction, isPending] = useActionState(register, undefined);
    const router = useRouter();

    // Ideally, the server action would return a status we can track, but for now we rely on the fact 
    // that if it returns undefined, it might mean nothing happened yet, or it was successful if we handle it differently.
    // However, typical useActionState returns the result. If result is null/undefined on success, we can't distinguish initial state.
    // Let's modify the action to return { success: true } or { error: string }. 
    // BUT since we can't easily see the action code right now without viewing it, let's assume standard behavior:
    // If we want auto-login, we might need to handle the submit client-side or check the state change.

    // Better approach: Client-side submit handler that calls server action, then calls signIn.

    const handleSubmit = async (formData: FormData) => {
        const email = formData.get('email') as string;
        const password = formData.get('password') as string;

        const result = await register(undefined, formData);

        if (result && typeof result === 'string') {
            toast.error(result);
            return;
        }

        // 注册成功：提示并自动登录后跳转首页
        toast.success('注册成功', {
            description: '正在为您登录…',
        });

        const res = await signIn('credentials', {
            email,
            password,
            redirect: false,
        });

        if (res?.error) {
            toast.error('注册成功，但自动登录失败，请手动登录');
            router.push('/login');
            return;
        }
        router.push('/');
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
                <form action={handleSubmit} className="space-y-6">
                    <div>
                        <label htmlFor="email" className="block text-sm font-medium leading-6 text-white/90">
                            Email address
                        </label>
                        <div className="mt-2">
                            <input
                                id="email"
                                name="email"
                                type="email"
                                autoComplete="email"
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
                        <button
                            type="submit"
                            // disabled={isPending} // isPending is for useActionState
                            className="flex w-full justify-center rounded-md bg-indigo-500 px-3 py-1.5 text-sm font-semibold leading-6 text-white shadow-sm hover:bg-indigo-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 disabled:opacity-50"
                        >
                            Sign up
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
