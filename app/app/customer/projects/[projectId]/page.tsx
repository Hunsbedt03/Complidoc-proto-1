import { CustomerProjectView } from '@/components/customer/CustomerProjectView';

type Props = {
  params: Promise<{ projectId: string }>;
};

export default async function CustomerProjectPage({ params }: Props) {
  const { projectId } = await params;
  return (
    <div className="app-content customer-content">
      <CustomerProjectView projectId={projectId} />
    </div>
  );
}
