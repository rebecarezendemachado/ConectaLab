# Matéria Reativa — resumo da entrega

Este arquivo descreve o que foi preparado no projeto para a validação do TCC. O visual das telas originais foi mantido como referência para as áreas novas.

## Acesso e perfis

- A página inicial tem entrada própria **Administradora · Kátia**.
- No primeiro uso local, o formulário guiado cria a conta administrativa uma única vez, no computador onde o servidor está instalado. A Kátia define seu próprio e-mail e senha; não foi incluída senha padrão.
- Cadastros comuns de professores permanecem pendentes até aprovação. Em hospedagem pública, a conta inicial é configurada com variáveis privadas do servidor.
- Senhas são armazenadas com hash; a sessão é mantida por cookie `HttpOnly`.
- As permissões são verificadas no servidor. Perfis de professor e aluno recebem dados limitados às suas atribuições.

## Turmas no formato de sala de aula

- A administradora cria e edita turmas, escolhe os docentes responsáveis e vincula alunos sem turma.
- Alunos novos escolhem uma turma ativa que já tenha professor responsável.
- O professor acompanha apenas as salas atribuídas a ele; a Kátia tem visão geral.
- As salas concentram alunos, registros de atividade e ocorrências, evitando alunos sem acompanhamento no sistema.

## Compras e estoque

- A área administrativa reúne aprovação, cotação, comparação de propostas, emissão do pedido, recebimento parcial ou total, pagamento e histórico.
- O servidor registra as mudanças de etapa e os eventos de recebimento. A entrada em estoque usa apenas a quantidade recebida em boas condições.
- Professores não acessam fornecedores, preços nem valores de compras; alunos também não recebem informações financeiras.
- Fornecedores extraídos do documento recebido foram cadastrados como **A validar**, aguardando conferência da Kátia.

## Documentos, FDS e PDFs

- A central armazena documentos anexados, associa arquivos a produtos ou compras e mantém versões.
- FDS são identificadas com a sigla atual. O upload de uma FDS oficial aceita PDF e exige produto associado.
- A FDS de acetona enviada é apenas demonstrativa e incompleta; fica identificada como referência, não como documento oficial vigente.
- Notas fiscais, DANFE e comprovantes podem ser associados a produtos ou compras conforme a tela de documentos.
- Relatórios e formulários imprimíveis usam os dados do sistema e podem ser salvos em PDF pelo navegador.
- Requisição, solicitação de compra, DFD, ETP, termo de referência, mapa de riscos e mapa comparativo são rascunhos de trabalho. Os modelos institucionais atuais do SENAI não foram fornecidos e não são simulados como oficiais.

## Navegação, notificações e QR Code

- O menu administrativo não oferece a tela de Banco de Dados; a opção **QR Code & Scanner** leva à página de leitura e etiquetas.
- Avisos comuns resolvidos são marcados por usuário no servidor e não retornam à lista de pendentes ao sair e voltar. Alertas automáticos de estoque baixo permanecem até que o saldo seja normalizado.
- O leitor/gerador não escolhe automaticamente o primeiro reagente do catálogo e limpa a seleção anterior ao sair da página.
- A navegação não exibe contagem de usuários como se fosse uma notificação.

## Iniciar e validar

No Windows, extraia o projeto, instale Node.js 22.13 ou superior e dê dois cliques em `iniciar.bat`. O modo local usa SQLite persistente e não exige configuração de MySQL. Mantenha aberta a janela do servidor e use o endereço `http://127.0.0.1:3000`.

As instruções completas estão em [PRIMEIRO_ACESSO.md](PRIMEIRO_ACESSO.md) e [GUIA_PUBLICACAO.md](GUIA_PUBLICACAO.md). Nesta revisão, a compilação do Vite e a checagem TypeScript foram concluídas sem erros; testes automatizados não foram executados. O banco de produção MySQL, a implantação pública e a validade regulatória de documentos devem ser conferidos no ambiente institucional antes de uso real.
