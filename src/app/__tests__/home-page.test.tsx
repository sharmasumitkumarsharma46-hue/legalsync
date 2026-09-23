import { render, screen } from '@testing-library/react';
import Home from '../page';

describe('Home page', () => {
  it('renders the LegalSync hero and purchasing section', () => {
    render(<Home />);

    expect(screen.getByText(/keep every deadline/i)).toBeInTheDocument();
    expect(screen.getAllByText(/try it live/i).length).toBeGreaterThan(0);
    expect(screen.queryByText(/how we build/i)).not.toBeInTheDocument();
    expect(screen.getByText(/start with a 14-day free trial/i)).toBeInTheDocument();
    expect(screen.getAllByText('Purchasing').length).toBeGreaterThan(0);
    expect(screen.getByText('Solo')).toBeInTheDocument();
    expect(screen.getByText('Small Firm')).toBeInTheDocument();
    expect(screen.getByText('Mid Firm')).toBeInTheDocument();
  });
});
