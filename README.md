# Matéria Reativa - Sistema Integrado de Gestão Laboratorial

Sistema moderno e responsivo para gestão de reagentes químicos, controle de estoque e lotes físicos, solicitações de aulas práticas, ordens de compra, homologação de fornecedores, geração e impressão de etiquetas com QR Code, gestão de usuários e contas com senhas, e painéis analíticos dinâmicos.

---

## 🚀 Como Executar o Projeto Localmente (Após Baixar o ZIP)

### ⚡ Execução Rápida em 1 Clique (Windows):
1. Extraia o arquivo `.zip` baixado.
2. Dê **dois cliques no arquivo `iniciar.bat`**.
3. Ele detecta o ambiente, instala as dependências caso necessário e abre automaticamente o sistema atualizado no seu navegador em:
   **`http://localhost:3000`**

### 💻 Execução pelo Terminal (Windows / Mac / Linux):
```bash
# 1. Instalar dependências
npm install

# 2. Iniciar o servidor de desenvolvimento
npm run dev
```
Abra o navegador em `http://localhost:3000`.

---

## ✨ Módulos e Funcionalidades Incluídas no Sistema:

1. **Dashboard com Gráficos 100% Dinâmicos e Funcionais:**
   - Gráfico temporal interativo com alternador entre *Compras (R$)* e *Baixas/Consumo de Reagentes*.
   - Gráfico de pizza reativo da distribuição de reagentes por *Nível de Estoque* (normal, baixo, esgotado), *Classes de Perigo* (inflamáveis, corrosivos, tóxicos) e *Regulamentação* (Polícia Federal / Exército).
   - Métricas em tempo real de inventário, solicitações pedagógicas, compras acumuladas e alertas críticos.
   - Painel acadêmico exclusivo para estudantes com gráficos de frequência prática e segurança química (sem exposição de finanças).

2. **Módulo Completo de QR Code & Scanner (`QR Code & Scanner`):**
   - Gerador de etiquetas físicas para frascos com QR Code individual, fórmula química, CAS, lote, validade e classe de perigo.
   - Pré-visualização de impressão com linhas de corte e exportação direta.
   - Scanner de QR Code em tempo real pela webcam/câmera e leitor por upload de imagem (`jsQR`).
   - Modal de detalhes instantâneos do reagente ao escanear com botões para dar baixa no estoque, editar ou excluir.

3. **Módulo Exclusivo de Gestão de Usuários & Senhas (`Usuários`):**
   - Acesso restrito a professores e coordenadores.
   - Redirecionamento direto ao clicar nos cards de Alunos/Professores na aba Banco de Dados.
   - Visualização de todas as contas registradas no sistema (nome, e-mail, turma/departamento, matrícula e data).
   - Alternador para visualizar senhas (com ícone de olho), gerador de nova senha aleatória em 1 clique e botão para copiar credenciais.
   - Formulário para cadastrar novos alunos ou docentes e botão para excluir contas.

4. **Página Dedicada de Perfil do Usuário (`Meu Perfil`):**
   - Consulta e atualização de dados pessoais (nome, e-mail, matrícula, turma/departamento).
   - Histórico pessoal com todas as atividades no sistema (reagentes consumidos na bancada e relatos de incidentes).
   - Ferramenta segura para alteração de senha com validação de senha atual e nova senha.

5. **Isolamento Completo entre Aluno e Professor:**
   - O aluno acessa apenas funções pedagógicas e de bancada (consultar fórmulas/FISPQ, registrar consumo de aula, comunicar acidentes/SOS e consultar normas).
   - O aluno não visualiza valores financeiros, dinheiro gasto, gráficos de compras ou fornecedores.
   - O aluno não pode criar, editar ou excluir produtos do acervo.

6. **Banco de Dados Híbrido (MySQL Real + LocalStorage Resiliente):**
   - Suporte a conexão nativa com MySQL local ou em nuvem com script DDL completo (`src/db/schema.sql`).
   - Sincronização automática com fallback persistente no navegador.
   - Exportação de backup em JSON, restauração e gerador de Dump SQL.

## 🗄️ Estrutura do Banco de Dados (MySQL)

O script completo DDL para criação das tabelas está disponível em:
- `src/db/schema.sql`

Você pode criar o banco de duas formas:
1. **Pela Interface**: Acesse o sistema, clique no botão **"MySQL"** no topo e clique em **"Inicializar Tabelas no MySQL"**.
2. **Pelo Terminal / Workbench**:
```bash
mysql -u root -p < src/db/schema.sql
```

Tabelas incluídas:
- `usuarios`: Contas de alunos, professores e administradores
- `produtos_quimicos`: Catálogo de reagentes, CAS, pureza, FISPQ e controle legal
- `fornecedores`: Empresas homologadas e distribuidores
- `estoque_lotes`: Lotes físicos, validades, armários de segurança e saldos
- `movimentacoes_estoque`: Histórico de entradas e saídas
- `solicitacoes_laboratorio`: Pedidos de reagentes para práticas docentes
- `compras`: Ordens de compra e cotações com fornecedores
- `consumos_aluno`: Registros de uso em bancada feitos pelos estudantes
- `ocorrencias_aluno`: Comunicação de incidentes, quebra de vidraria e primeiros socorros

---

## 📱 Responsividade Multidispositivo
- Compatível com celulares, tablets, notebooks e monitores ultrawide.
- Em telas menores que 768px, as tabelas são automaticamente transformadas em cards adaptados para toque com menu inferior (*bottom bar*).

---

## 📄 Licença
Projeto acadêmico e institucional para gestão laboratorial.
