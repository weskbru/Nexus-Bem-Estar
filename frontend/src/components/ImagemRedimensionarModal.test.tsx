// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ImagemRedimensionarModal from './ImagemRedimensionarModal';

class ImageMock {
  naturalWidth = 1200;
  naturalHeight = 800;
  onload: (() => void) | null = null;

  set src(_value: string) {
    this.onload?.();
  }
}

describe('ImagemRedimensionarModal', () => {
  beforeEach(() => {
    vi.stubGlobal('Image', ImageMock);
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:imagem');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);

    const originalCreateElement = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation(((
      tagName: string,
      options?: ElementCreationOptions,
    ) => {
      const element = originalCreateElement(tagName, options);
      if (tagName.toLowerCase() === 'canvas') {
        Object.defineProperty(element, 'getContext', {
          configurable: true,
          value: () => ({ drawImage: vi.fn() }),
        });
        Object.defineProperty(element, 'toDataURL', {
          configurable: true,
          value: () => 'data:image/jpeg;base64,preview',
        });
      }
      return element;
    }) as typeof document.createElement);
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('recalcula as dimensoes e confirma a imagem em base64', async () => {
    const onConfirmar = vi.fn();
    const onCancelar = vi.fn();
    const file = new File(['conteudo'], 'foto.png', { type: 'image/png' });
    Object.defineProperty(file, 'size', {
      configurable: true,
      value: 2 * 1024 * 1024,
    });

    render(
      <ImagemRedimensionarModal
        file={file}
        onConfirmar={onConfirmar}
        onCancelar={onCancelar}
      />,
    );

    expect(await screen.findByAltText('preview')).toHaveAttribute(
      'src',
      'data:image/jpeg;base64,preview',
    );
    expect(screen.getByText(
      (_content, node) => node?.textContent === '1200 × 800px',
    )).toBeInTheDocument();
    expect(screen.getByText('2.0 MB')).toBeInTheDocument();

    fireEvent.change(screen.getByRole('slider'), { target: { value: '50' } });
    expect(await screen.findByText(
      (_content, node) => node?.textContent === '600 × 400px',
    )).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /inserir imagem/i }));
    expect(onConfirmar).toHaveBeenCalledWith('data:image/jpeg;base64,preview');
    fireEvent.click(screen.getByRole('button', { name: /cancelar/i }));
    expect(onCancelar).toHaveBeenCalled();
  });
});
