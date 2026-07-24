'use client';

import { CustomerRequirementTemplates } from '@/components/customer/CustomerRequirementTemplates';

export default function CustomerRequirementsPage() {
  return (
    <div className="customer-content">
      <header className="customer-project-detail-header">
        <h1>Dokumentkrav</h1>
        <p>Kravmal for dokumenter leverandører skal levere i dine prosjekt</p>
      </header>
      <CustomerRequirementTemplates />
    </div>
  );
}
