import type { Metadata } from 'next';
import { EditGoalRoute } from '@/components/tend-flow/EditGoalRoute';

export const metadata: Metadata = {
  title: 'Edit goal',
  description: 'Rename a goal and update its actions.',
};

export default function EditGoalPage() {
  return <EditGoalRoute />;
}
