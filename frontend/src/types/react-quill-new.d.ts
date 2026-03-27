declare module 'react-quill-new' {
  import { Component, Ref } from 'react';

  interface ReactQuillProps {
    value?: string;
    defaultValue?: string;
    onChange?: (value: string, delta: unknown, source: unknown, editor: unknown) => void;
    onBlur?: (range: unknown, source: unknown, editor: unknown) => void;
    onFocus?: (range: unknown, source: unknown, editor: unknown) => void;
    placeholder?: string;
    readOnly?: boolean;
    theme?: string;
    modules?: Record<string, unknown>;
    formats?: string[];
    className?: string;
    style?: React.CSSProperties;
    ref?: Ref<unknown>;
  }

  interface QuillEditor {
    getSelection(focus?: boolean): { index: number; length: number } | null;
    setSelection(index: number, length?: number, source?: string): void;
    getLength(): number;
    insertEmbed(index: number, type: string, value: unknown, source?: string): void;
    [key: string]: unknown;
  }

  class ReactQuill extends Component<ReactQuillProps> {
    getEditor(): QuillEditor;
  }
  export default ReactQuill;
}
