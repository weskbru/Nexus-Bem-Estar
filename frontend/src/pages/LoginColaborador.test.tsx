// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import LoginColaborador from './LoginColaborador';

describe('Login do colaborador', () => {
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('valida os campos e conclui o fluxo simulado', async () => {
    const { container } = render(<LoginColaborador />);

    fireEvent.submit(container.querySelector('form') as HTMLFormElement);
    expect(screen.getByText(/^Preencha e-mail/)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/e-mail corporativo/i), {
      target: { value: 'colaborador@aeb.gov.br' },
    });
    fireEvent.change(document.querySelector('#palavraChave') as HTMLInputElement, {
      target: { value: 'convite' },
    });
    fireEvent.submit(container.querySelector('form') as HTMLFormElement);

    expect(screen.getByText(/autenticando/i)).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /entrar no sistema/i })).toBeEnabled();
    }, { timeout: 2500 });
  });
});
