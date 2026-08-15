import { notFound } from 'next/navigation';
import { CATEGORIES } from '@/lib/types';
import { loadRegistry } from '@/lib/registry';
import { CategoryView } from '@/components/CategoryView';

export function generateStaticParams() {
  return CATEGORIES.map((c) => ({ id: c.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const cat = CATEGORIES.find((c) => c.id === id);
  return { title: cat ? cat.name : 'Category' };
}

export default async function CategoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const cat = CATEGORIES.find((c) => c.id === id);
  if (!cat) notFound();
  const registry = loadRegistry();
  const plugins = registry.plugins.filter((p) => (p.category || 'other') === cat.id);

  return <CategoryView catId={cat.id} plugins={plugins} />;
}
