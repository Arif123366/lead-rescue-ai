import { LeadDetailClient } from '@/components/LeadDetailClient';

export function generateStaticParams() {
  return [{ id: 'default' }];
}

export default function LeadDetailPage() {
  return <LeadDetailClient />;
}
