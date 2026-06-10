import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { FileQuestion, ArrowLeft } from 'lucide-react';
import { getServerTranslator } from '@/lib/i18n/server';

export default async function NotFound() {
    const { t } = await getServerTranslator();

    return (
        <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex flex-col items-center justify-center min-h-[500px] text-center">
                <FileQuestion className="h-16 w-16 text-zinc-500 mb-6" />
                <h1 className="text-4xl font-bold text-white mb-2">404</h1>
                <h2 className="text-xl text-zinc-300 mb-2">{t('notFound.title')}</h2>
                <p className="text-zinc-400 mb-8 max-w-md">
                    {t('notFound.description')}
                </p>
                <Button asChild>
                    <Link href="/">
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        {t('common.backToDashboard')}
                    </Link>
                </Button>
            </div>
        </main>
    );
}
