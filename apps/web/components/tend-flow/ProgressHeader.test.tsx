import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ProgressHeader } from './ProgressHeader';

describe('ProgressHeader', () => {
  it('links the wordmark to the landing page', () => {
    render(<ProgressHeader step="focuses" />);

    expect(screen.getByRole('link', { name: 'Home' })).toHaveAttribute('href', '/');
  });
});
