import { render } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

export function jsonResponse(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json' },
    ...init,
  });
}

export function renderRoute(
  element: React.ReactNode,
  path: string,
  route: string,
) {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <Routes>
        <Route path={path} element={element} />
        <Route path="*" element={<span>Destino</span>} />
      </Routes>
    </MemoryRouter>,
  );
}
