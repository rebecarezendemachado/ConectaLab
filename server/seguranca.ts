/* ============================================================================
   Segurança: senhas (scrypt), sessões no servidor, cookies, limite de tentativas,
   cabeçalhos HTTP e verificação de origem. Só usa módulos nativos do Node.
   ============================================================================ */
import { randomBytes, scrypt as scryptCb, timingSafeEqual, createHash } from 'node:crypto';
import type { Db } from './db.ts';

/* ------------------------------ tempo (UTC) ------------------------------ */
export const agoraUtc = (d: Date = new Date()): string => d.toISOString().slice(0, 19).replace('T', ' ');
export const somarMs = (base: Date, ms: number): Date => new Date(base.getTime() + ms);
const paraData = (s: string): Date => new Date(s.replace(' ', 'T') + 'Z');

/* ------------------------------- senhas ------------------------------- */
const N = 32768, R = 8, P = 1;
const scrypt = (senha: string, sal: Buffer, tam: number) =>
  new Promise<Buffer>((ok, erro) =>
    scryptCb(senha, sal, tam, { N, r: R, p: P, maxmem: 128 * 1024 * 1024 }, (e, k) => (e ? erro(e) : ok(k as Buffer))),
  );

export async function hashSenha(senha: string): Promise<string> {
  const sal = randomBytes(16);
  const chave = await scrypt(senha, sal, 64);
  return `scrypt$${N}$${R}$${P}$${sal.toString('base64')}$${chave.toString('base64')}`;
}

/** ok: senha confere. rehash: o valor guardado era texto puro (legado) e deve ser regravado com hash. */
export async function verificarSenha(senha: string, guardado: string): Promise<{ ok: boolean; rehash: boolean }> {
  if (!guardado) return { ok: false, rehash: false };
  if (guardado.startsWith('scrypt$')) {
    const [, n, r, p, salB64, hashB64] = guardado.split('$');
    const esperado = Buffer.from(hashB64, 'base64');
    const obtido = await new Promise<Buffer>((ok, erro) =>
      scryptCb(senha, Buffer.from(salB64, 'base64'), esperado.length, { N: +n, r: +r, p: +p, maxmem: 128 * 1024 * 1024 }, (e, k) => (e ? erro(e) : ok(k as Buffer))),
    );
    return { ok: obtido.length === esperado.length && timingSafeEqual(obtido, esperado), rehash: false };
  }
  // legado: senha gravada em texto puro por versões anteriores. Compara sem vazar tempo e pede rehash.
  const a = Buffer.from(senha), b = Buffer.from(guardado);
  const igual = a.length === b.length && timingSafeEqual(a, b);
  return { ok: igual, rehash: igual };
}

const SENHAS_FRACAS = new Set(['123456', '1234567', '12345678', '123456789', 'senha', 'senha123', 'password', 'qwerty', 'abc123', '111111', '000000']);
export function validarSenha(senha: unknown, minimo = 6): string | null {
  if (typeof senha !== 'string') return 'Senha inválida.';
  if (senha.length < minimo) return `A senha deve ter no mínimo ${minimo} caracteres.`;
  if (senha.length > 128) return 'A senha é longa demais (máximo 128 caracteres).';
  if (SENHAS_FRACAS.has(senha.toLowerCase())) return 'Essa senha é muito comum. Escolha outra.';
  if (/^(.)\1+$/.test(senha)) return 'A senha não pode ter um único caractere repetido.';
  return null;
}

/* ------------------------------- sessões ------------------------------- */
export const NOME_COOKIE = 'mr_sessao';
const OCIOSA_MS = 12 * 60 * 60 * 1000;          // expira após 12 h sem uso
const ABSOLUTA_MS = 7 * 24 * 60 * 60 * 1000;    // no máximo 7 dias
const LEMBRAR_MS = 30 * 24 * 60 * 60 * 1000;    // "lembrar acesso": 30 dias

const hashToken = (t: string) => createHash('sha256').update(t).digest('hex');

export async function criarSessao(db: Db, usuarioId: string, lembrar: boolean, ip: string, agente: string) {
  const token = randomBytes(32).toString('base64url');
  const agora = new Date();
  const ociosa = lembrar ? LEMBRAR_MS : OCIOSA_MS;
  const absoluta = lembrar ? LEMBRAR_MS : ABSOLUTA_MS;
  await db.run(
    'INSERT INTO sessoes (id, usuario_id, criado_em, expira_em, limite_absoluto, ultimo_uso, ip, agente) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [hashToken(token), usuarioId, agoraUtc(agora), agoraUtc(somarMs(agora, ociosa)), agoraUtc(somarMs(agora, absoluta)), agoraUtc(agora), String(ip).slice(0, 64), String(agente || '').slice(0, 255)],
  );
  return { token, maxAgeMs: absoluta };
}

export interface UsuarioSessao {
  id: string; nome: string; email: string; papel: 'administrador' | 'professor' | 'aluno';
  turma: string | null; turmaId: string | null; deveTrocarSenha: boolean; sessaoId: string; lembrar: boolean;
}

/** Valida o token, renova o prazo (janela deslizante) e devolve o usuário. Contas inativas/pendentes não entram. */
export async function obterSessao(db: Db, token: string | undefined): Promise<UsuarioSessao | null> {
  if (!token || token.length < 20 || token.length > 100) return null;
  const id = hashToken(token);
  const s = await db.get<any>(
    `SELECT s.id AS sessao_id, s.expira_em, s.limite_absoluto, s.criado_em, s.ultimo_uso,
            u.id, u.nome, u.email, u.tipo_perfil, u.turma, u.turma_id, u.status, u.ativo, u.deve_trocar_senha
       FROM sessoes s JOIN usuarios u ON u.id = s.usuario_id WHERE s.id = ?`,
    [id],
  );
  if (!s) return null;
  const agora = new Date();
  const expirada = paraData(s.expira_em) < agora || paraData(s.limite_absoluto) < agora;
  const conta = (s.status ?? 'ativo') === 'ativo' && Number(s.ativo ?? 1) !== 0;
  if (expirada || !conta) {
    await db.run('DELETE FROM sessoes WHERE id = ?', [id]);
    return null;
  }
  const ultimo = paraData(s.ultimo_uso).getTime();
  if (agora.getTime() - ultimo > 5 * 60 * 1000) {
    const lembrar = paraData(s.limite_absoluto).getTime() - paraData(s.criado_em).getTime() > ABSOLUTA_MS + 1000;
    const nova = Math.min(somarMs(agora, lembrar ? LEMBRAR_MS : OCIOSA_MS).getTime(), paraData(s.limite_absoluto).getTime());
    await db.run('UPDATE sessoes SET ultimo_uso = ?, expira_em = ? WHERE id = ?', [agoraUtc(agora), agoraUtc(new Date(nova)), id]);
  }
  const papel = s.tipo_perfil === 'administrador' ? 'administrador' : s.tipo_perfil === 'professor' ? 'professor' : 'aluno';
  return { id: s.id, nome: s.nome, email: s.email, papel, turma: s.turma ?? null, turmaId: s.turma_id ?? null, deveTrocarSenha: !!Number(s.deve_trocar_senha ?? 0), sessaoId: id, lembrar: false };
}

export async function encerrarSessao(db: Db, token: string | undefined) {
  if (token) await db.run('DELETE FROM sessoes WHERE id = ?', [hashToken(token)]);
}
export async function encerrarTodasSessoes(db: Db, usuarioId: string, exceto?: string) {
  if (exceto) await db.run('DELETE FROM sessoes WHERE usuario_id = ? AND id <> ?', [usuarioId, exceto]);
  else await db.run('DELETE FROM sessoes WHERE usuario_id = ?', [usuarioId]);
}
export async function limparSessoesExpiradas(db: Db) {
  await db.run('DELETE FROM sessoes WHERE expira_em < ? OR limite_absoluto < ?', [agoraUtc(), agoraUtc()]);
}

/* ------------------------------- cookies ------------------------------- */
export function lerCookies(cabecalho: string | undefined): Record<string, string> {
  const saida: Record<string, string> = {};
  (cabecalho || '').split(';').forEach((par) => {
    const i = par.indexOf('=');
    if (i > 0) { try { saida[par.slice(0, i).trim()] = decodeURIComponent(par.slice(i + 1).trim()); } catch { /* ignora */ } }
  });
  return saida;
}
export function cookieSessao(token: string, maxAgeMs: number, seguro: boolean): string {
  return `${NOME_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${Math.floor(maxAgeMs / 1000)}${seguro ? '; Secure' : ''}`;
}
export function cookieLimpo(seguro: boolean): string {
  return `${NOME_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${seguro ? '; Secure' : ''}`;
}

/* ------------------------- limite de tentativas de login ------------------------- */
const JANELA_MS = 15 * 60 * 1000;
const tentativas = new Map<string, { n: number; desde: number }>();
export function limiteLogin(chave: string, max: number): { bloqueado: boolean; esperaSeg: number } {
  const t = tentativas.get(chave);
  if (!t) return { bloqueado: false, esperaSeg: 0 };
  if (Date.now() - t.desde > JANELA_MS) { tentativas.delete(chave); return { bloqueado: false, esperaSeg: 0 }; }
  return { bloqueado: t.n >= max, esperaSeg: Math.ceil((JANELA_MS - (Date.now() - t.desde)) / 1000) };
}
export function registrarFalhaLogin(chave: string) {
  const t = tentativas.get(chave);
  if (!t || Date.now() - t.desde > JANELA_MS) tentativas.set(chave, { n: 1, desde: Date.now() });
  else t.n++;
}
export function zerarFalhasLogin(chave: string) { tentativas.delete(chave); }
export function _resetarLimitesParaTeste() { tentativas.clear(); }

/* ------------------------- cabeçalhos HTTP e origem ------------------------- */
export function cabecalhosSeguranca(producao: boolean) {
  return (_req: any, res: any, next: () => void) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    // a câmera é necessária para o leitor de QR Code; o restante fica bloqueado
    res.setHeader('Permissions-Policy', 'camera=(self), microphone=(), geolocation=(), payment=()');
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    if (producao) {
      res.setHeader('Strict-Transport-Security', 'max-age=15552000; includeSubDomains');
      res.setHeader('Content-Security-Policy',
        "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: blob:; media-src 'self' blob:; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'");
    }
    // respostas da API nunca ficam em cache (dados pessoais)
    if (String(_req.url || '').startsWith('/api')) { res.setHeader('Cache-Control', 'no-store'); }
    next();
  };
}

/** Bloqueia requisições de alteração vindas de outro site (CSRF), complementando o SameSite=Lax. */
export function verificarOrigem(permitidas: string[] = []) {
  const metodosSeguros = new Set(['GET', 'HEAD', 'OPTIONS']);
  return (req: any, res: any, next: () => void) => {
    if (metodosSeguros.has(req.method)) return next();
    const origem = req.headers?.origin as string | undefined;
    if (!origem) return next(); // clientes que não são navegadores não enviam Origin; sem cookie de sessão não têm acesso
    try {
      const host = req.headers?.host;
      const o = new URL(origem);
      if (o.host === host || permitidas.includes(o.origin)) return next();
    } catch { /* cai no bloqueio */ }
    res.status(403).json({ error: 'Origem da requisição não permitida.' });
  };
}

/* ------------------------------- validações ------------------------------- */
export const texto = (v: unknown, max: number): string | null => {
  if (typeof v !== 'string') return null;
  const t = v.trim();
  return t.length > 0 && t.length <= max ? t : null;
};
export const emailValido = (v: unknown): string | null => {
  const t = texto(v, 150)?.toLowerCase() ?? null;
  return t && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(t) ? t : null;
};
