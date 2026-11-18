/* Utilitários compartilhados pelas rotas. */
import { randomBytes } from 'node:crypto';
import type { Db } from './db.ts';
import { agoraUtc } from './seguranca.ts';

export const ipDe = (req: any): string => String(req.ip || req.socket?.remoteAddress || '').slice(0, 64);
export const novoId = (prefixo: string) => `${prefixo}-${randomBytes(6).toString('hex')}`;

/** Executa o handler e devolve erro genérico (sem expor detalhes internos) em caso de falha. */
export const tratar = (fn: (req: any, res: any) => Promise<any>) => async (req: any, res: any) => {
  try {
    await fn(req, res);
  } catch (e: any) {
    if (res.headersSent) return;
    if (String(e?.message || '').includes('MySQL desconectado')) return res.status(503).json({ error: 'Banco de dados indisponível no momento.' });
    console.error('[API] erro interno:', e?.message || e);
    res.status(500).json({ error: 'Erro interno. Tente novamente em instantes.' });
  }
};

export async function auditar(db: Db, req: any, acao: string, entidade: string, entidadeId?: string | null, detalhes?: unknown) {
  try {
    const u = req.usuario;
    let det: string | null = null;
    if (detalhes !== undefined) {
      det = JSON.stringify(detalhes, (k, v) => (/senha|cpf|token/i.test(k) ? undefined : v)).slice(0, 2000);
    }
    await db.run(
      'INSERT INTO auditoria (id, data_hora, usuario_id, usuario_nome, papel, acao, entidade, entidade_id, detalhes, ip) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [novoId('AUD').slice(0, 36), agoraUtc(), u?.id ?? null, u?.nome ?? null, u?.papel ?? null, acao, entidade, entidadeId ?? null, det, ipDe(req)],
    );
  } catch (e: any) {
    console.error('[AUDITORIA] falha ao registrar:', e?.message || e);
  }
}

export const numeroPositivo = (v: unknown, max = 1_000_000): number | null => {
  const n = typeof v === 'string' ? Number(v.replace(',', '.')) : Number(v);
  return Number.isFinite(n) && n > 0 && n <= max ? n : null;
};

export function paraCamelUsuario(r: any, visor?: { id: string; papel: string }) {
  let extra: any = {};
  try { extra = r.perfil_extra ? JSON.parse(r.perfil_extra) : {}; } catch { /* ignora */ }
  const proprio = visor && (visor.id === r.id || visor.papel === 'administrador');
  const dto: any = {
    id: r.id, nome: r.nome, email: r.email, tipoPerfil: r.tipo_perfil, matricula: r.matricula ?? undefined,
    turma: r.turma ?? undefined, departamento: r.departamento ?? undefined, bancadaPadrao: r.bancada_padrao ?? undefined,
    ativo: !!Number(r.ativo ?? 1), status: r.status ?? 'ativo', criadoEm: String(r.criado_em ?? ''),
    criadoPorNome: r.criado_por_nome ?? undefined, cargo: extra.cargo,
  };
  if (proprio) { dto.telefone = extra.telefone; dto.cpf = extra.cpf; } // dados pessoais só para o próprio usuário e a administradora
  return dto;
}
