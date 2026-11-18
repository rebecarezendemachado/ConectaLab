# Matéria Reativa

Sistema acadêmico de gestão de laboratório químico. Organiza alunos em turmas com professores responsáveis, acompanha consumo e ocorrências, controla reagentes e estoque, administra compras e guarda documentos.

## Iniciar no Windows

1. Extraia o ZIP para uma pasta.
2. Instale o Node.js 22.13 ou superior, caso ainda não esteja instalado.
3. Dê dois cliques em `iniciar.bat` e mantenha a janela aberta. Na primeira vez, ele instala os componentes e prepara o sistema.
4. O navegador abre em `http://127.0.0.1:3000`.

O modo local usa um banco SQLite persistente dentro de `dados-locais`. Não precisa de MySQL para a validação local. Para execução manual, use `npm install --include=dev` e depois `npm run dev`.

## Acesso em qualquer dispositivo (servidor)

Para que as publicações e cadastros da administradora apareçam em todos os dispositivos, todos precisam acessar **o mesmo servidor** (o mesmo endereço) — os dados ficam centralizados no banco do servidor, não no navegador de cada aparelho.

- **Mesma rede (Wi-Fi/LAN):** com o servidor rodando no computador principal, acesse pelo IP dele, por exemplo `http://IP-DO-SEU-PC:3000` (veja o IP com `ipconfig`). O servidor já aceita conexões externas na rede.
- **Internet / qualquer lugar:** publique o sistema em uma hospedagem com Node.js e um banco compartilhado (ex.: MySQL). O guia completo está em [GUIA_PUBLICACAO.md](GUIA_PUBLICACAO.md).
- Mantenha apenas uma instância do servidor apontando para o mesmo banco para evitar dados divergentes. Em produção, configure `NODE_ENV="production"` e `APP_URL` com o endereço público.

## Primeiro acesso da Kátia

Na página inicial, escolha **Administradora · Kátia** e clique em **Configurar primeiro acesso da Kátia**. No computador onde o servidor está instalado, informe nome, e-mail e uma senha com pelo menos 10 caracteres. O cadastro normal de professor não concede permissão administrativa. Não há senha padrão no projeto.

Em hospedagem pública, o responsável configura `ADMIN_EMAIL` e `ADMIN_INITIAL_PASSWORD` nas variáveis privadas do servidor antes de publicar. O botão administrativo é o mesmo para entrar; a senha inicial deve ser removida da configuração depois que a conta tiver sido criada.

Veja [PRIMEIRO_ACESSO.md](PRIMEIRO_ACESSO.md) para o roteiro passo a passo e [GUIA_PUBLICACAO.md](GUIA_PUBLICACAO.md) para publicação.

## Organização das turmas

A Kátia cria cada turma em **Turmas**, associa os professores responsáveis e vincula os alunos à sala correta. Professores acompanham apenas as turmas atribuídas; a administradora tem visão geral. Alunos novos só conseguem escolher uma turma ativa com professor responsável.

## Compras e documentos

- Compras administrativas têm aprovação, cotação, emissão de pedido, recebimento total ou parcial, pagamento e histórico.
- O estoque só recebe a quantidade conferida como boa no recebimento.
- A central guarda FDS, documentos fiscais e versões anexadas. Professores consultam apenas as FDS liberadas; dados comerciais ficam restritos à administradora.
- Relatórios e formulários podem ser preparados para impressão e salvos em PDF. Os formulários são rascunhos até que os modelos institucionais vigentes sejam fornecidos.
- A FDS de acetona enviada é um arquivo demonstrativo incompleto. Ela está identificada como referência e não como FDS oficial vigente.
- Os fornecedores importados do documento recebido aparecem como **A validar**; a Kátia deve conferir os dados antes de ativá-los.

## Perfis

| Perfil | Acesso principal |
|---|---|
| Administradora (Kátia) | Turmas, usuários, fornecedores, compras, documentos, relatórios e visão geral |
| Professor | Turmas atribuídas, acompanhamento de alunos, atividades, ocorrências e consulta permitida de produtos/documentos |
| Aluno | Sua turma, consulta de produtos e registros próprios de consumo e ocorrência |

As permissões e o escopo por turma são aplicados no servidor. As senhas são guardadas com hash e a sessão usa cookie protegido.

O banco de dados continua funcionando internamente, mas não aparece no menu da administradora; no lugar, o menu abre **QR Code & Scanner**. Avisos comuns dispensados ficam gravados por usuário no servidor e não reaparecem. Alertas automáticos de estoque baixo continuam pendentes até a reposição normalizar o saldo; avisos concluídos saem da contagem e ficam no filtro **Resolvidos**.

## Dados e documentos de referência

O modo local usa SQLite; a publicação pode usar MySQL por configuração no arquivo `.env` ou nas variáveis do serviço. O `.env` e o banco `dados-locais` são dados privados e não devem ser compartilhados. Os arquivos recebidos como referência ficam em `server/modelos-referencia`; o arquivo `.winmd` não é necessário para o sistema.
