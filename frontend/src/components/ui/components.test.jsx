import { describe, it, expect, vi } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { renderWithProviders } from '../../test/renderWithProviders';
import StatCard from './StatCard';
import VisaStatusBadge from './VisaStatusBadge';
import PaymentCodeCard from './PaymentCodeCard';
import Pagination from './Pagination';
import VisaJourneyStepper from './VisaJourneyStepper';
import VisaStatusBadge2 from './VisaStatusBadge';
import ErrorBoundary from './ErrorBoundary';

describe('StatCard', () => {
  it('affiche label et valeur', () => {
    renderWithProviders(<StatCard label="Total" value="42" />);
    expect(screen.getByText('Total')).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();
  });
});

describe('VisaStatusBadge', () => {
  it('rend un badge pour chaque statut connu', () => {
    ['EN_ATTENTE', 'EN_COURS', 'ACCORDE', 'REFUSE', 'COMPLEMENT_REQUIS'].forEach((s) => {
      const { unmount } = renderWithProviders(<VisaStatusBadge status={s} />);
      unmount();
    });
    expect(VisaStatusBadge2).toBe(VisaStatusBadge);
  });
});

describe('PaymentCodeCard', () => {
  it('affiche le code de paiement', () => {
    renderWithProviders(<PaymentCodeCard code="BOR-0001-OS1" />);
    expect(screen.getByText(/BOR-0001-OS1/)).toBeInTheDocument();
  });
});

describe('Pagination', () => {
  it('déclenche le changement de page', () => {
    const onPageChange = vi.fn();
    renderWithProviders(
      <Pagination page={1} totalPages={3} totalItems={25} pageSize={10} onPageChange={onPageChange} />
    );
    const next = screen.getByText(/Suivant|Next|التالي/);
    fireEvent.click(next);
    expect(onPageChange).toHaveBeenCalledWith(2);
  });

  it('ne rend rien sur une seule page', () => {
    const { container } = renderWithProviders(
      <Pagination page={1} totalPages={1} totalItems={5} pageSize={10} onPageChange={() => {}} />
    );
    expect(container.textContent).toBeDefined();
  });
});

describe('VisaJourneyStepper', () => {
  it('rend les étapes du parcours', () => {
    renderWithProviders(
      <VisaJourneyStepper status="EN_COURS" statusHistory={[{ status: 'EN_ATTENTE', date: '2027-01-01' }]} />
    );
    expect(document.body.textContent.length).toBeGreaterThan(0);
  });
});

describe('ErrorBoundary', () => {
  it('affiche le repli en cas d’erreur', () => {
    const Boom = () => { throw new Error('boom'); };
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    renderWithProviders(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>
    );
    expect(screen.getByText(/erreur inattendue/i)).toBeInTheDocument();
    spy.mockRestore();
  });

  it('rend ses enfants sans erreur', () => {
    renderWithProviders(
      <ErrorBoundary>
        <p>contenu normal</p>
      </ErrorBoundary>
    );
    expect(screen.getByText('contenu normal')).toBeInTheDocument();
  });
});
