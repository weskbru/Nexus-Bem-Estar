declare module 'xlsx' {
  interface WorkSheet {
    [cell: string]: unknown;
    '!cols'?: Array<{ wch?: number }>;
    '!rows'?: Array<{ hpt?: number }>;
    '!merges'?: unknown[];
  }

  interface WorkBook {
    SheetNames: string[];
    Sheets: Record<string, WorkSheet>;
  }

  namespace utils {
    function aoa_to_sheet(data: unknown[][]): WorkSheet;
    function book_new(): WorkBook;
    function book_append_sheet(wb: WorkBook, ws: WorkSheet, name?: string): void;
    function sheet_to_json<T = unknown>(ws: WorkSheet, opts?: unknown): T[];
  }

  function writeFile(wb: WorkBook, filename: string, opts?: unknown): void;
  function read(data: unknown, opts?: unknown): WorkBook;
}
