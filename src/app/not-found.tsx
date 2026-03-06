import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { FileQuestion, ArrowLeft } from 'lucide-react';

export default function NotFound() {
    return (
        <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex flex-col items-center justify-center min-h-[500px] text-center">
                <FileQuestion className="h-16 w-16 text-zinc-500 mb-6" />
                <h1 className="text-4xl font-bold text-white mb-2">404</h1>
                <h2 className="text-xl text-zinc-300 mb-2">Page Not Found</h2>
                <p className="text-zinc-400 mb-8 max-w-md">
                    The page you&apos;re looking for doesn&apos;t exist or has been moved.
                </p>
                <Button asChild>
                    <Link href="/">
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back to Dashboard
                    </Link>
                </Button>
            </div>
        </main>
    );
}
