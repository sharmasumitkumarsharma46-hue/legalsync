import { render, screen } from '@testing-library/react';
import Home from '../page';

const PLANS = [
  { key: 'solo', name: 'Solo' },
  { key: 'small_firm', name: 'Small Firm' },
  { key: 'mid_firm', name: 'Mid Firm' },
];

describe('Home page', () => {
  it('renders the LegalSync hero and purchasing section', () => {
    render(<Home />);

    expect(screen.getByText(/keep every deadline/i)).toBeInTheDocument();
    expect(screen.getAllByText(/try it live/i).length).toBeGreaterThan(0);
    expect(screen.queryByText(/how we build/i)).not.toBeInTheDocument();
    expect(screen.getByText(/start with a 14-day free trial/i)).toBeInTheDocument();
    expect(screen.getAllByText('Purchasing').length).toBeGreaterThan(0);

    // Each plan name appears on the selector and again on its card.
    for (const plan of PLANS) {
      expect(screen.getAllByText(plan.name).length).toBeGreaterThan(0);
    }
  });

  it('offers a plan selector with every plan, defaulting to the first', () => {
    render(<Home />);

    const tabs = screen.getAllByRole('tab');
    expect(tabs).toHaveLength(PLANS.length);
    expect(tabs[0]).toHaveAttribute('aria-selected', 'true');
    expect(tabs[1]).toHaveAttribute('aria-selected', 'false');
    expect(tabs[2]).toHaveAttribute('aria-selected', 'false');
  });

  it('gives every plan both a trial link and a purchase link', () => {
    render(<Home />);

    expect(screen.getAllByRole('link', { name: 'Start free trial' })).toHaveLength(PLANS.length);

    for (const plan of PLANS) {
      const buyLink = screen.getByRole('link', { name: `Buy ${plan.name}` });
      expect(buyLink).toHaveAttribute('href', `/signup?plan=${plan.key}&intent=buy`);
    }
  });
});
