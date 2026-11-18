# Matéria Reativa — Guia de execução e publicação

## Como o sistema funciona agora

```
Navegador (PC, celular)  ──►  Servidor Node (Express)  ──►  SQLite local ou MySQL
   só mostra a tela            login, permissões,            dados do sistema
   (sem dados guardados)       regras e auditoria            ficam aqui
```

- No computador, o modo local guarda os dados em SQLite. Na publicação, o banco configurado é MySQL. O navegador não guarda cópia de produtos, estoque ou usuários.
- O login é feito no servidor (senha com hash `scrypt`); a sessão é um cookie protegido (`HttpOnly`).
- Para qualquer aparelho ver os mesmos dados, **o servidor Node precisa estar rodando**.
  O modo antigo "só Apache/XAMPP servindo arquivos" **não faz mais login nem grava dados** (não existe servidor para isso).
  O MySQL do XAMPP continua servindo normalmente como banco.

## 1. Testar no seu computador

1. Instale Node.js 22.13 ou superior. No Windows, dê dois cliques em `iniciar.bat`; ele instala o necessário na primeira execução e abre o sistema.
2. O modo local funciona sem MySQL. Para usar um MySQL existente, configure `MYSQL_*` no arquivo `.env` antes de iniciar.
3. Abra `http://127.0.0.1:3000` e clique em **Administradora · Kátia**. No primeiro acesso, use **Configurar primeiro acesso da Kátia** para definir o e-mail e a senha dela.
4. Para testar com o celular na mesma rede Wi-Fi: `http://IP-DO-SEU-PC:3000` (descubra o IP com `ipconfig`).

No primeiro start, o servidor cria as tabelas novas, converte senhas antigas (se houver) e prepara os documentos e fornecedores de referência.
Veja no terminal as linhas `[Segurança] ...` confirmando.

## 2. Publicar sem usar o terminal (GitHub + Railway)

O GitHub guarda o código; para o site ficar aberto pela internet, ele também precisa de um servidor e de um banco. Este projeto já está preparado para Node.js e MySQL. O roteiro abaixo usa GitHub Desktop e Railway, que conectam pelas telas.

### A. Enviar o projeto ao GitHub

1. Instale o **GitHub Desktop** em [desktop.github.com](https://desktop.github.com/) e entre na sua conta.
2. Extraia o ZIP em uma pasta fácil de encontrar, por exemplo `Documentos\materia-reativa-sistema-gestao-laboratorial-tcc`.
3. No GitHub Desktop, escolha **File → Add Local Repository…** e selecione essa pasta. O pacote preparado já reconhece a pasta como repositório.
4. No campo **Summary**, escreva `Primeira versão do Matéria Reativa` e clique em **Commit to main**.
5. Clique em **Publish repository** e marque **Keep this code private**. O site poderá ser público pelo link, mesmo com o código privado.

> Não envie o repositório como público: o sistema é preparado para guardar dados pessoais de alunos. O arquivo `.env`, as senhas e o banco local estão protegidos pelo `.gitignore`.

### B. Criar o site e o banco na nuvem

1. Entre em [railway.com](https://railway.com/) usando a conta do GitHub e escolha **New Project → Deploy from GitHub Repo**. Selecione o repositório publicado.
2. No projeto Railway, clique em **+ New → Database → MySQL**. Aguarde o banco ficar disponível.
3. No serviço do site, abra **Settings** e informe:
   - **Build Command:** `npm install --include=dev && npm run build`
   - **Start Command:** `npm start`
4. Em **Variables** do serviço do site, adicione:
   - `NODE_ENV` = `production`
   - `DATABASE_URL` = `${{MySQL.MYSQL_URL}}` (se o serviço do banco tiver outro nome, troque `MySQL` pelo nome que aparece no projeto)
   - `ADMIN_EMAIL` = e-mail escolhido para a Kátia
   - `ADMIN_INITIAL_PASSWORD` = senha forte, com pelo menos 10 caracteres
   - `ADMIN_NOME` = `Kátia`
5. Abra **Deployments** e espere a implantação terminar. Em **Settings → Networking → Generate Domain**, crie o endereço público do site. O Railway fornece HTTPS automaticamente.
6. Abra esse endereço, clique em **Administradora · Kátia** e entre com o e-mail e a senha que configurou. Depois de confirmar que consegue entrar, apague `ADMIN_INITIAL_PASSWORD` das variáveis do serviço. Não compartilhe essa senha no GitHub nem no ZIP.

O endereço gerado no passo 5 é o link para a apresentação. Para criar o QR, use o endereço completo `https://...` em um gerador de QR confiável, ou me envie o endereço depois da publicação para eu preparar o arquivo do QR para impressão.

**Custo e disponibilidade:** Railway oferece um crédito de teste único de US$ 5 por até 30 dias e depois um plano gratuito com US$ 1 de crédito mensal; esse limite pode não manter o site disponível continuamente. O plano Hobby custa a partir de US$ 5 por mês e inclui US$ 5 de uso; consumo acima disso pode gerar cobrança extra. Confira o valor exibido antes de ativar um plano pago. [Detalhes atuais dos planos](https://railway.com/pricing).

**Dados:** deixe apenas uma instância do servidor. O banco MySQL da nuvem é separado do MySQL local do XAMPP. Ative backups no banco antes de usar dados reais de alunos.

## 3. Primeiros passos da administradora

Abra `/admin-ferramentas.html` (no endereço do sistema), logada como Kátia:

1. **Importar dados antigos:** se houver cadastros feitos antes desta atualização em algum navegador, abra essa página **nesse navegador**,
   clique em *Baixar cópia de segurança* e depois em *Importar*. Nada é apagado do navegador; repetir não duplica.
2. **Turmas e professores:** crie as salas e associe cada professor responsável em **Turmas**. Cada professor só acompanha alunos das suas turmas.
3. **Cadastros:** alunos e professores podem se cadastrar e acessar o sistema imediatamente, sem aprovação manual da administradora.

## 3.1 Como entrar e validar os três perfis (roteiro)

1. **Kátia:** tela inicial → **Administradora · Kátia** → e-mail e senha definidos no primeiro acesso local ou por `ADMIN_EMAIL` / `ADMIN_INITIAL_PASSWORD`.
2. **Organizar o Classroom:** menu **Turmas** → crie cada sala → associe os professores responsáveis. Depois cadastre os alunos e vincule-os às salas.
3. **Criar um professor e um aluno de teste:** menu **Usuários** → *Cadastrar Novo Usuário* → preencha nome, e-mail, turma (aluno) ou departamento (professor), clique em *Gerar Senha* e anote a senha → *Cadastrar Pessoa*.
   (As senhas ficam protegidas: depois de criadas não podem mais ser consultadas, só redefinidas.)
4. **Testar cada perfil em janelas separadas** (use uma janela anônima por perfil, para não misturar sessões):
   - **Professor(a):** vê suas turmas e acompanha alunos, atividades e ocorrências da própria sala; consulta documentos FDS liberados.
   - **Aluno:** entra pela opção **Aluno**; vê produtos, mas não tem sino de notificações nem acesso a Fornecedores/Compras/Usuários.
   - **Kátia:** vê todas as salas, aprova compras, gerencia fornecedores e documentos.
5. Teste também o cadastro público: *Cadastre-se* como aluno ou professor e verifique que o acesso é liberado imediatamente.

## 4. Permissões

| | Aluno | Professor | Administradora (Kátia) |
|---|---|---|---|
| Produtos | consultar | consultar, cadastrar, editar (sem ver o fornecedor) | tudo, inclusive excluir |
| Estoque | consultar; baixar só pelo registro de consumo | consultar e ajustar (sem ver o fornecedor) | tudo |
| Fornecedores, cotações, valores | — | **sem acesso** | exclusivo |
| Compras | — | — | cria, aprova, emite pedido, recebe, cancela, paga, vê histórico |
| Solicitações de material | — | abrir (sempre "Em análise", em seu nome) e consultar | aprovar, editar, excluir |
| Usuários | só o próprio perfil | alunos das suas turmas; cadastra alunos nas suas turmas | todos; cria, edita, ativa, exclui |
| Turmas | a própria (sem lista de colegas) | as suas | todas; cria, edita, vincula professores |
| Documentos | — | FDS liberadas | arquivos e versões; upload e relatórios em PDF |
| Alertas | — | os que lhe cabem | todos |
| Auditoria (quem fez o quê) | — | — | consulta completa |

Tudo isso é verificado **no servidor** (esconder botões não basta; uma requisição direta também é bloqueada).

## 5. Requisitos

O modo local usa `node:sqlite` e requer Node.js 22.13 ou superior. A publicação usa Node.js, MySQL e HTTPS; arquivos `.env` devem permanecer fora do repositório.
