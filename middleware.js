// Protege a Área do gestor (orçamentos) com usuário e senha (conferidos no servidor da Vercel).
// O usuário e a senha NÃO ficam no código: são cadastrados na Vercel em
// Settings → Environment Variables, com os nomes PAINEL_USUARIO e PAINEL_SENHA.

export const config = { matcher: ['/gestor', '/gestor.html', '/painel', '/painel.html'] };

export default function middleware(request) {
  const usuario = process.env.PAINEL_USUARIO;
  const senha = process.env.PAINEL_SENHA;

  // sem usuário/senha cadastrados, o painel fica fechado para todo mundo
  if (!usuario || !senha) {
    return new Response('Painel fechado: cadastre PAINEL_USUARIO e PAINEL_SENHA na Vercel.', { status: 503 });
  }

  const auth = request.headers.get('authorization') || '';
  if (auth.startsWith('Basic ')) {
    try {
      const [u, ...resto] = atob(auth.slice(6)).split(':');
      if (u === usuario && resto.join(':') === senha) return; // senha certa: segue para o painel
    } catch {}
  }

  return new Response('Acesso restrito ao painel da Zanon Decora.', {
    status: 401,
    headers: { 'WWW-Authenticate': 'Basic realm="Painel Zanon Decora", charset="UTF-8"' },
  });
}
