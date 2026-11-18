/* Ponto único de integração com o server.ts. */
import type { Db } from './db.ts';
import { migrar } from './migracoes.ts';
import { cabecalhosSeguranca, verificarOrigem, limparSessoesExpiradas } from './seguranca.ts';
import { registrarGuardas } from './guardas.ts';
import { registrarRotasAuth, bootstrapAdministradora, protegerSenhasLegadas, ativarCadastrosPendentes, reconciliarVinculosDeTurma } from './rotasAuth.ts';
import { registrarRotasOperacoes } from './rotasOperacoes.ts';
import { registrarRotasCompras } from './rotasCompras.ts';
import { registrarRotasDados } from './rotasDados.ts';
import { registrarRotasDocumentos } from './rotasDocumentos.ts';

export { criarDbMysql, criarDbSqlite } from './db.ts';
export type { Db } from './db.ts';
export { migrar } from './migracoes.ts';
export { cabecalhosSeguranca } from './seguranca.ts';

/** Registra segurança + rotas centrais. Chamar DEPOIS de express.json() e ANTES das rotas antigas. */
export function registrarRotasCentrais(app: any, db: Db, opc: { producao: boolean; origensPermitidas?: string[] }) {
  app.use('/api', verificarOrigem(opc.origensPermitidas || []));
  registrarGuardas(app, db);
  registrarRotasAuth(app, db, { producao: opc.producao });
  registrarRotasOperacoes(app, db);
  registrarRotasCompras(app, db);
  registrarRotasDocumentos(app, db);
  registrarRotasDados(app, db); // estoque, compras e solicitações no formato da tela
}

/** Roda depois que o MySQL conecta: migra tabelas, protege senhas antigas e cria a administradora (se configurada). */
export async function prepararBanco(db: Db, env: Record<string, string | undefined>): Promise<string[]> {
  const log: string[] = [];
  await migrar(db); log.push('migrações aplicadas');
  const realocados = await reconciliarVinculosDeTurma(db); if (realocados) log.push(`${realocados} aluno(s) vinculados às turmas existentes`);
  const n = await protegerSenhasLegadas(db); if (n) log.push(`${n} senha(s) antiga(s) protegida(s) com hash`);
  const ativados = await ativarCadastrosPendentes(db); if (ativados) log.push(`${ativados} cadastro(s) pendente(s) ativado(s) automaticamente`);
  // O banco começa vazio de propósito: nenhum fornecedor, documento ou registro de
  // demonstração é importado. Tudo deve ser criado pela interface do sistema.
  log.push(await bootstrapAdministradora(db, env));
  await limparSessoesExpiradas(db);
  return log;
}
