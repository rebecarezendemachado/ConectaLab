# Primeiro acesso ao Matéria Reativa

## Iniciar no Windows

1. Extraia o ZIP para uma pasta do computador.
2. Dê dois cliques em `iniciar.bat` e aguarde a instalação inicial.
3. Mantenha a janela aberta enquanto usa o sistema. O navegador abre em `http://127.0.0.1:3000`.

O servidor pode usar o MySQL do XAMPP ou o banco local configurado. Se o seu projeto já tem um banco, mantenha a configuração dele: as atualizações acrescentam tabelas e campos sem apagar os registros existentes.

## Entrada simples da Kátia

Na tela inicial, clique em **Administradora · Kátia**.

- Se a conta já existe, informe o e-mail e a senha da Kátia.
- Se esta for a primeira configuração, clique em **Configurar primeiro acesso da Kátia** no computador onde o servidor está instalado. Informe o nome e o e-mail dela e crie uma senha com pelo menos 10 caracteres. A conta administrativa é criada uma única vez e o sistema entra no painel.
- Se o primeiro acesso informar que a conta ou o e-mail já existe, mas você não consegue entrar, use **Recuperar acesso da Kátia neste computador**, exibido após o erro. Informe o nome, o e-mail e uma nova senha (mínimo de 10 caracteres). A recuperação só funciona no computador do servidor. Se o e-mail já estiver cadastrado como professor e ainda não houver administradora, o sistema reaproveita essa mesma conta e a converte em administradora, sem duplicar o usuário nem apagar seus dados. Se já houver outra administradora ou o e-mail pertencer a outra conta, será necessário informar o e-mail correto ou um e-mail livre.
- Depois, para os próximos acessos, basta clicar em **Administradora · Kátia** e entrar com esses mesmos dados.
- Se já existir uma conta administrativa e a senha tiver sido esquecida, o responsável pelo servidor pode redefini-la no arquivo `.env`: informe o e-mail exato da conta em `ADMIN_EMAIL` e uma nova senha forte (mínimo 10 caracteres) em `ADMIN_INITIAL_PASSWORD`, reinicie o sistema uma vez e remova o valor de `ADMIN_INITIAL_PASSWORD` depois que Kátia conseguir entrar.

Não existe senha padrão embutida no sistema. Cadastros comuns de professor nunca recebem acesso administrativo. Se `ADMIN_EMAIL` e `ADMIN_INITIAL_PASSWORD` forem preenchidos no arquivo `.env`, use esses dados no botão administrativo. Em hospedagem pública, configure as credenciais no servidor antes de publicar; o formulário inicial só funciona no computador onde o servidor está instalado.

## Organizar turmas e alunos

1. Entre como administradora e abra **Turmas**.
2. Crie cada sala/turma e associe os professores responsáveis.
3. Cadastros antigos sem vínculo aparecem em **Alunos aguardando vínculo**; associe cada pessoa à sala correta.
4. Novos alunos escolhem uma turma ativa com professor responsável. Alunos e professores podem se cadastrar e acessar imediatamente. Professores acompanham somente suas salas; a Kátia tem visão geral.

## Documentos e compras

- **Documentos** guarda FDS, notas fiscais, DANFE, comprovantes e versões com acesso controlado. Relatórios e formulários podem ser preparados para impressão e salvos em PDF.
- Os documentos gerados pelo sistema são rascunhos de trabalho até que os modelos institucionais vigentes sejam fornecidos.
- A FDS de acetona recebida foi identificada como modelo demonstrativo incompleto e aparece com esse aviso. Ela não substitui uma FDS completa e atual do fabricante.
- Os fornecedores extraídos do documento enviado aparecem como **A validar**. Confira os dados e só então altere o status para **Ativo**.
- Em **Compras**, a Kátia pode registrar aprovação, cotações, emissão do pedido, recebimento parcial ou total, pagamentos e histórico.

## Perfis

- **Administradora (Kátia):** gestão geral, salas, documentos, fornecedores e compras.
- **Professores:** suas turmas, alunos e atividades, além de produtos e acompanhamento permitido pelo sistema.
- **Alunos:** acesso acadêmico, produtos e registros de consumo/ocorrência.
