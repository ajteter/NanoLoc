import { Header } from '@/components/Header';

export default function ProjectsLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen bg-gray-900">
            <Header />
            {children}
        </div>
    );
}
