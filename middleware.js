import { NextResponse } from 'next/server';

export function middleware() {
  return new NextResponse(
    `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
        <meta charset="UTF-8">
        <title>Página em Manutenção</title>
        <style>
            body { font-family: sans-serif; text-align: center; padding: 150px; background: #f4f4f4; }
            h1 { font-size: 50px; color: #333; }
            p { font-size: 20px; color: #666; }
        </style>
    </head>
    <body>
        <h1>Estamos em manutenção</h1>
        <p>Voltaremos em breve! Desculpe pelo transtorno.</p>
    </body>
    </html>
    `,
    {
      status: 503,
      headers: { 'content-type': 'text/html; charset=utf-8' },
    }
  );
}

// Garante que o bloqueio se aplica a todas as páginas do site
export const config = {
  matcher: '/:path*',
};
