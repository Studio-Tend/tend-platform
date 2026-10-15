import type { Metadata } from 'next';
import { PlanFlow } from './PlanFlow';

export const metadata: Metadata = {
  title: 'Plan your week',
  description:
    'Pick a few focuses, choose the actions that actually move them, and make room for the rest of your life. A free weekly planner from Tend.',
  openGraph: {
    url: '/plan/week',
    title: 'Plan your week — Tend',
    description:
      'Pick a few focuses, choose the actions that actually move them, and make room for the rest of your life.',
  },
};

export default function PlanPage() {
  return <PlanFlow />;
}
