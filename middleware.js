// Protege a Área do gestor com uma tela de login (usuário e senha), conferida no servidor da Vercel.
// As senhas NÃO ficam no código: ficam na Vercel em Settings → Environment Variables.
// Cada variável USUARIO_<NOME> é um acesso: o usuário é o nome (minúsculo) e o valor é a senha.
//   USUARIO_LUCAS  → usuário "lucas"
//   USUARIO_SHEILA → usuário "sheila"
// Para criar outro acesso, cadastre a variável na Vercel e acrescente o nome na lista abaixo.

export const config = { matcher: ['/gestor', '/gestor.html', '/painel', '/painel.html'] };

const SESSAO_DIAS = 30;

async function sha256(texto) {
  const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(texto));
  return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join('');
}

function acessos() {
  const a = { lucas: process.env.USUARIO_LUCAS, sheila: process.env.USUARIO_SHEILA };
  if (process.env.PAINEL_USUARIO && process.env.PAINEL_SENHA) a[process.env.PAINEL_USUARIO.toLowerCase()] = process.env.PAINEL_SENHA;
  return a;
}

const sal = () => process.env.SESSAO_SEGREDO || 'zanon-decora-gestor';
const token = async (usuario, senha) => usuario + '.' + await sha256(`${usuario}:${senha}:${sal()}`);

function lerCookie(request, nome) {
  const m = (request.headers.get('cookie') || '').match(new RegExp('(?:^|;\\s*)' + nome + '=([^;]+)'));
  return m ? decodeURIComponent(m[1]) : '';
}

function pagina(erro) {
  const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow"><title>Área do gestor · Zanon Decora</title>
<link href="https://fonts.googleapis.com/css2?family=Manrope:wght@500;700;800&display=swap" rel="stylesheet">
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{min-height:100vh;display:grid;place-items:center;padding:20px;font-family:Manrope,system-ui,sans-serif;color:#2A2140;background:radial-gradient(120% 100% at 50% 0%,#fff,#F6F1FB 60%,#EDE4F7)}
.card{width:100%;max-width:380px;background:#fff;border:1px solid #E3DBEE;border-radius:26px;padding:30px 26px;box-shadow:0 30px 60px -40px rgba(42,33,64,.5);text-align:center}
img{height:96px;margin-bottom:6px}
h1{font-size:22px;margin-bottom:4px}
p.s{color:#6B6480;font-size:14px;margin-bottom:20px}
label{display:grid;gap:6px;text-align:left;font-size:13px;font-weight:700;color:#6B6480;margin-bottom:14px}
input{font:inherit;font-size:16px;padding:13px 14px;border:1.5px solid #E3DBEE;border-radius:14px;width:100%;color:#2A2140}
input:focus{outline:none;border-color:#6F409C}
button{font:inherit;font-weight:800;font-size:16px;width:100%;padding:14px;border:0;border-radius:999px;color:#fff;cursor:pointer;background:linear-gradient(100deg,#6F409C,#5A6FC0 50%,#3D9ED1);margin-top:4px}
.erro{background:#FBE9F0;color:#B23A6B;font-weight:700;font-size:14px;border-radius:12px;padding:10px 12px;margin-bottom:16px}
a{display:inline-block;margin-top:18px;color:#6B6480;font-size:13px;text-decoration:none}
</style></head><body><form class="card" method="post" action="/gestor.html">
<img src="/img/logo.png" alt="Zanon Decora"><h1>Área do gestor</h1><p class="s">Entre com o seu usuário e senha.</p>
${erro ? '<div class="erro">' + erro + '</div>' : ''}
<label>Usuário<input name="u" autocomplete="username" autocapitalize="none" autocorrect="off" spellcheck="false" required autofocus></label>
<label>Senha<input name="p" type="password" autocomplete="current-password" autocapitalize="none" autocorrect="off" required></label>
<button type="submit">Entrar</button><a href="/">← Voltar ao site</a></form></body></html>`;
  return new Response(html, { status: erro ? 401 : 200, headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' } });
}

export default async function middleware(request) {
  const lista = acessos();
  if (!Object.values(lista).some(Boolean)) {
    return new Response('Área do gestor fechada: cadastre as senhas na Vercel.', { status: 503 });
  }
  const url = new URL(request.url);

  // sair
  if (url.searchParams.has('sair')) {
    return new Response(null, { status: 303, headers: { location: '/gestor.html', 'set-cookie': 'zd_sessao=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax' } });
  }

  // envio do formulário de login
  if (request.method === 'POST') {
    let u = '', p = '';
    try { const f = await request.formData(); u = String(f.get('u') || '').trim().toLowerCase(); p = String(f.get('p') || '').trim(); } catch {}
    const senha = lista[u];
    if (senha && p === String(senha).trim()) {
      return new Response(null, { status: 303, headers: {
        location: '/gestor.html',
        'set-cookie': `zd_sessao=${encodeURIComponent(await token(u, String(senha).trim()))}; Path=/; Max-Age=${SESSAO_DIAS * 86400}; HttpOnly; Secure; SameSite=Lax`,
      } });
    }
    return pagina('Usuário ou senha incorretos.');
  }

  // já logado?
  const [usuario] = lerCookie(request, 'zd_sessao').split('.');
  const senha = lista[usuario];
  if (senha && lerCookie(request, 'zd_sessao') === await token(usuario, String(senha).trim())) return; // segue para a área

  return pagina('');
}
