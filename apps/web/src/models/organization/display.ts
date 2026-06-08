import type { AppTranslator } from '@/app/i18n';
import type { OrganizationReviewStatus, OrganizationStatus } from './types';

export function getOrganizationStatusLabel(
  status: OrganizationStatus,
  tDefault: AppTranslator,
) {
  switch (status) {
    case 'active':
      return tDefault('admin.organizations.statusFilter.active', 'Active');
    case 'disabled':
      return tDefault('admin.organizations.statusFilter.disabled', 'Disabled');
  }
}

export function getOrganizationReviewStatusLabel(
  status: OrganizationReviewStatus,
  tDefault: AppTranslator,
) {
  switch (status) {
    case 'pending':
      return tDefault('admin.organizations.reviewStatus.pending', 'Pending');
    case 'approved':
      return tDefault('admin.organizations.reviewStatus.approved', 'Approved');
    case 'rejected':
      return tDefault('admin.organizations.reviewStatus.rejected', 'Rejected');
  }
}
