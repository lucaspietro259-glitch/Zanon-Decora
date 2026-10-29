// Protege a Área do gestor (orçamentos) com usuário e senha, conferidos no servidor da Vercel.
// As senhas NÃO ficam no código: ficam na Vercel em Settings → Environment Variables.
// Cada variável USUARIO_<NOME> é um acesso: o usuário é o nome (minúsculo) e o valor é a senha.
//   USUARIO_LUCAS  → usuário "lucas"
//   USUARIO_SHEILA → usuário "sheila"
// Para criar outro acesso, cadastre a variável na Vercel e acrescente o nome na lista abaixo.

export const config = { matcher: ['/gestor', '/gestor.html', '/painel', '/painel.html'] };

export default function middleware(request) {
  const acessos = {
    lucas: process.env.USUARIO_LUCAS,
    sheila: process.env.USUARIO_SHEILA,
  };
  if (process.env.PAINEL_USUARIO && process.env.PAINEL_SENHA) acessos[process.env.PAINEL_USUARIO.toLowerCase()] = process.env.PAINEL_SENHA;

  // sem nenhuma senha cadastrada, a área fica fechada para todo mundo
  if (!Object.values(acessos).some(Boolean)) {
    return new Response('Área do gestor fechada: cadastre as senhas na Vercel.', { status: 503 });
  }

  const auth = request.headers.get('authorization') || '';
  if (auth.startsWith('Basic ')) {
    try {
      const [u, ...resto] = atob(auth.slice(6)).split(':');
      const senha = acessos[u.trim().toLowerCase()];
      if (senha && resto.join(':') === senha) return; // usuário e senha certos: segue para a área
    } catch {}
  }

  return new Response('Acesso restrito à Área do gestor da Zanon Decora.', {
    status: 401,
    headers: { 'WWW-Authenticate': 'Basic realm="Area do gestor Zanon Decora", charset="UTF-8"' },
  });
}
