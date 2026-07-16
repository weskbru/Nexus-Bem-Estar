// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { forwardRef, useImperativeHandle } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import EditorComunicado from './EditorComunicado';
import EditorEmailConvite from './EditorEmailConvite';

vi.mock('react-quill-new', () => ({
  default: forwardRef((props: any, ref) => {
    useImperativeHandle(ref, () => ({
      getEditor: () => ({
        root: { innerHTML: '<p>conteudo atualizado</p>' },
        getSelection: () => ({ index: 2 }),
        getLength: () => 8,
        insertEmbed: () => undefined,
        setSelection: () => undefined,
      }),
    }));

    return (
      <div
        data-testid="react-quill"
        data-readonly={String(Boolean(props.readOnly))}
        className={props.className}
      >
        <span>{props.placeholder}</span>
        <button type="button" onClick={() => props.onChange?.('<p>alterado</p>')}>
          Alterar editor
        </button>
        <button
          type="button"
          onClick={() => props.modules?.toolbar?.handlers?.image?.()}
        >
          Inserir imagem
        </button>
        <img alt="imagem no editor" src="data:image/png;base64,abc" />
      </div>
    );
  }),
}));

class FileReaderMock {
  onload: ((event: { target: { result: string } }) => void) | null = null;

  readAsDataURL() {
    this.onload?.({ target: { result: 'data:image/png;base64,arquivo' } });
  }
}

function rect(values: Partial<DOMRect> = {}) {
  return {
    x: 0,
    y: 0,
    top: 0,
    left: 0,
    right: 400,
    bottom: 300,
    width: 400,
    height: 300,
    toJSON: () => ({}),
    ...values,
  } as DOMRect;
}

function mockCreatedInputWithFile(file: File) {
  let createdInput: HTMLInputElement | null = null;
  const originalCreateElement = document.createElement.bind(document);

  vi.spyOn(document, 'createElement').mockImplementation(((
    tagName: string,
    options?: ElementCreationOptions,
  ) => {
    const element = originalCreateElement(tagName, options);
    if (tagName.toLowerCase() === 'input') {
      createdInput = element as HTMLInputElement;
      vi.spyOn(createdInput, 'click').mockImplementation(() => undefined);
      Object.defineProperty(createdInput, 'files', {
        configurable: true,
        value: [file],
      });
    }
    return element;
  }) as typeof document.createElement);

  return () => createdInput;
}

async function selecionarImagemERedimensionar(
  container: HTMLElement,
  onChange: ReturnType<typeof vi.fn>,
) {
  const img = screen.getByAltText('imagem no editor') as HTMLImageElement;
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue(rect());
  Object.defineProperty(img, 'getBoundingClientRect', {
    configurable: true,
    value: () => rect({
      top: 20,
      left: 30,
      right: 230,
      bottom: 120,
      width: 200,
      height: 100,
    }),
  });

  fireEvent.mouseDown(img);
  await waitFor(() => {
    const handles = Array.from(container.querySelectorAll('div')).filter((node) => (
      (node as HTMLElement).style.cursor.endsWith('resize')
    ));
    expect(handles).toHaveLength(8);
  });

  const handleSudeste = Array.from(container.querySelectorAll('div')).find((node) => (
    (node as HTMLElement).style.cursor === 'se-resize'
  )) as HTMLElement;
  fireEvent.mouseDown(handleSudeste, { clientX: 200, clientY: 100 });
  fireEvent.mouseMove(window, { clientX: 260, clientY: 130 });
  fireEvent.mouseUp(window);

  await waitFor(() => {
    expect(onChange).toHaveBeenCalledWith('<p>conteudo atualizado</p>');
  });
}

describe('Editores de texto rico', () => {
  beforeEach(() => {
    vi.stubGlobal('FileReader', FileReaderMock);
    vi.stubGlobal('alert', vi.fn());
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('edita o convite, insere arquivo e redimensiona a imagem', async () => {
    const onChange = vi.fn();
    const getInput = mockCreatedInputWithFile(
      new File(['imagem'], 'convite.png', { type: 'image/png' }),
    );
    const { container } = render(
      <EditorEmailConvite
        value="<p>Convite</p>"
        onChange={onChange}
        disabled
        placeholder="Mensagem personalizada"
      />,
    );

    expect(screen.getByTestId('react-quill')).toHaveAttribute('data-readonly', 'true');
    expect(screen.getByText('Mensagem personalizada')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /alterar editor/i }));
    expect(onChange).toHaveBeenCalledWith('<p>alterado</p>');
    fireEvent.click(screen.getByRole('button', { name: /inserir imagem/i }));
    getInput()?.onchange?.({} as Event);

    await selecionarImagemERedimensionar(container, onChange);
  });

  it('edita o comunicado e executa o fluxo de imagem', async () => {
    const onChange = vi.fn();
    const getInput = mockCreatedInputWithFile(
      new File(['imagem'], 'comunicado.webp', { type: 'image/webp' }),
    );
    const { container } = render(
      <EditorComunicado value="<p>Comunicado</p>" onChange={onChange} />,
    );

    expect(screen.getByText(/escreva o comunicado aqui/i)).toBeInTheDocument();
    expect(screen.getByText(/para inserir imagem/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /alterar editor/i }));
    expect(onChange).toHaveBeenCalledWith('<p>alterado</p>');
    fireEvent.click(screen.getByRole('button', { name: /inserir imagem/i }));
    getInput()?.onchange?.({} as Event);

    await selecionarImagemERedimensionar(container, onChange);
  });
});
