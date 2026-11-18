/* ============================================================================
   Política de permissões (RBAC) — três perfis:
     administrador  = professora Kátia (visão e autoridade globais)
     professor      = gestão dentro das suas turmas; sem privilégios administrativos
     aluno          = consulta e ações restritas ao próprio uso
   Esta é a ÚNICA fonte de verdade das permissões: o servidor consulta aqui.
   ============================================================================ */
import type { Db } from './db.ts';

export type Papel = 'administrador' | 'professor' | 'aluno';
export type Acao = 'ler' | 'criar' | 'editar' | 'excluir';
const ADM: Papel[] = ['administrador'];
const ADM_PROF: Papel[] = ['administrador', 'professor'];
const TODOS: Papel[] = ['administrador', 'professor', 'aluno'];

export const PERMISSOES: Record<string, Partial<Record<Acao, Papel[]>>> = {
  produtos:      { ler: TODOS, criar: ADM, editar: ADM, excluir: ADM }, // professor consulta e dá baixa, mas não altera o catálogo
  estoque:       { ler: TODOS, criar: ADM, editar: ADM, excluir: ADM }, // idem: baixa de consumo acontece em /api/operacoes
  fornecedores:  { ler: ADM, criar: ADM, editar: ADM, excluir: ADM }, // cadastros e dados comerciais: só a administradora
  solicitacoes:  { ler: ADM, criar: ADM, editar: ADM, excluir: ADM },
  compras:       { ler: ADM, criar: ADM, editar: ADM, excluir: ADM }, // valores e fornecedores: só a administradora
  consumos:      { ler: TODOS, criar: ADM_PROF, editar: ADM_PROF, excluir: ADM },
  ocorrencias:   { ler: TODOS, criar: TODOS, editar: ADM_PROF, excluir: ADM },
  alertas:       { ler: TODOS, criar: TODOS, editar: TODOS, excluir: ADM },
  usuarios:      { ler: TODOS, criar: ADM, editar: ADM, excluir: ADM },
  turmas:        { ler: TODOS, criar: ADM, editar: ADM, excluir: ADM },
  auditoria:     { ler: ADM },
  documentos:    { ler: ADM, criar: ADM, editar: ADM, excluir: ADM },
  sistema:       { ler: TODOS, criar: ADM, editar: ADM, excluir: ADM },
};

export function pode(papel: Papel | undefined, recurso: string, acao: Acao): boolean {
  if (!papel) return false;
  return (PERMISSOES[recurso]?.[acao] ?? []).includes(papel);
}

/** Traduz método + caminho de uma rota existente em (recurso, ação). */
export function classificarRota(metodo: string, caminho: string): { recurso: string; acao: Acao } | null {
  const m = caminho.match(/^\/api\/([a-z-]+)(?:\/|$)/);
  if (!m) return null;
  const mapa: Record<string, string> = {
    produtos: 'produtos', estoque: 'estoque', fornecedores: 'fornecedores', solicitacoes: 'solicitacoes', compras: 'compras',
    consumos: 'consumos', ocorrencias: 'ocorrencias', alertas: 'alertas', usuarios: 'usuarios', turmas: 'turmas',
    auditoria: 'auditoria', documentos: 'documentos', status: 'sistema', 'init-db': 'sistema',
  };
  const recurso = mapa[m[1]];
  if (!recurso) return null;
  const acao: Acao = metodo === 'GET' ? 'ler' : metodo === 'DELETE' ? 'excluir' : metodo === 'POST' || metodo === 'PUT' || metodo === 'PATCH' ? 'criar' : 'ler';
  return { recurso, acao };
}

/* ------------------------------ escopo por turma ------------------------------ */
export async function turmasDoProfessor(db: Db, professorId: string): Promise<{ ids: string[]; nomes: string[] }> {
  const rows = await db.all<{ id: string; nome: string }>(
    'SELECT t.id, t.nome FROM turmas t JOIN turma_professores tp ON tp.turma_id = t.id WHERE tp.professor_id = ?',
    [professorId],
  );
  return { ids: rows.map((r) => r.id), nomes: rows.map((r) => r.nome) };
}

/** O usuário `u` pode enxergar dados da turma (por nome)? */
export async function enxergaTurma(db: Db, u: { id: string; papel: Papel; turma: string | null }, nomeTurma: string | null | undefined): Promise<boolean> {
  if (u.papel === 'administrador') return true;
  if (!nomeTurma) return false;
  if (u.papel === 'aluno') return (u.turma ?? '').trim().toLowerCase() === nomeTurma.trim().toLowerCase();
  const { nomes } = await turmasDoProfessor(db, u.id);
  return nomes.some((n) => n.trim().toLowerCase() === nomeTurma.trim().toLowerCase());
}
