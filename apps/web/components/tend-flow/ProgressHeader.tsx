import Link from 'next/link';
import { STEP_NUMBER, TOTAL_STEPS, type TendStep } from './flow-steps';

interface ProgressHeaderProps {
  step: TendStep;
}

export function ProgressHeader({ step }: ProgressHeaderProps) {
  const stepNumber = STEP_NUMBER[step];

  return (
    <div className="tend-flow__header">
      <div className="tend-flow__header-row">
        <Link href="/" className="tend-flow__wordmark" aria-label="Home">
          tend
        </Link>
        <span className="tend-flow__step-label">
          Step {stepNumber} of {TOTAL_STEPS}
        </span>
      </div>
      <div className="tend-flow__progress-track">
        <div className="tend-flow__progress-fill" data-progress={stepNumber} />
      </div>
    </div>
  );
}
