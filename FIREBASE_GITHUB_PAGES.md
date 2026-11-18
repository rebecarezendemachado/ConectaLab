# Publicar com Firebase + GitHub Pages (sem servidor próprio)

Este projeto foi adaptado para usar **Firebase Authentication** e **Cloud Firestore** no front-end, permitindo publicar o site no **GitHub Pages** e compartilhar os mesmos dados entre dispositivos (cada acesso usa o mesmo banco na nuvem).

## 1) Configuração no Firebase (Console)

1. **Authentication**: em *Criação/Build > Authentication > Método de login*, ative **E-mail/senha**.
2. **Firestore Database**: crie o banco (se ainda não criou).
3. **Regras do Firestore**: em *Firestore Database > Regras*, substitua pelo conteúdo do arquivo `firestore.rules` deste projeto e clique em **Publicar**.
   - Sem regras corretas, leituras/gravações podem falhar (especialmente se o banco estiver em modo produção).
4. **Domínios autorizados** (para login funcionar no GitHub Pages): em *Authentication > Configurações > Domínios autorizados*, adicione:
   - `localhost` (para testes locais)
   - `<seu-usuario>.github.io` (ex.: `rebecarezendemachado.github.io`)

## 2) Configuração do app (firebaseConfig)

O arquivo `src/services/firebase.ts` já contém o `firebaseConfig` do seu projeto Firebase. Se precisar trocar de projeto, atualize esse arquivo com a configuração do app Web (Configurações do projeto > Geral > Seus apps).

## 3) Como funciona o "banco" agora

- **Dados compartilhados:** ficam no **Firestore** (nuvem). Qualquer dispositivo que acessar o site e fizer login verá os mesmos dados, desde que esteja usando o mesmo projeto Firebase.
- **Não é o arquivo `dados-locais/materia-reativa.json`** nem o MySQL: no modo GitHub Pages/Firebase, o armazenamento central é o Firestore.
- **Gratuito com limites:** o Firebase tem plano gratuito com cotas; verifique os limites e regras atuais no site oficial do Firebase.

## 4) Publicar no GitHub Pages

1. Suba este projeto para um repositório no GitHub.
2. Gere o build:
   - `npm install`
   - `npm run build`
3. Publique a pasta de saída (`dist/`) no GitHub Pages (por exemplo, via branch `gh-pages`, ação do GitHub Actions, ou configurando Pages para usar `dist` conforme sua estratégia).
   - Este projeto usa `base: './'` no Vite e rotas por hash (`#...`), o que facilita a publicação em GitHub Pages.
4. Acesse a URL do GitHub Pages (ex.: `https://<usuario>.github.io/<repositorio>/`) pelo celular e pelo notebook: com login no mesmo sistema, os dados do Firestore serão os mesmos.

## 5) Primeiro acesso (administradora)

- Se ainda não existir administradora no Firestore, use o fluxo de **primeiro acesso/cadastro** previsto no app para criar a conta administrativa (conforme a tela do sistema). 
- A conta é criada no **Firebase Authentication** e o perfil é salvo na coleção `usuarios` do Firestore.

## Observações importantes

- **Regras de segurança:** as regras em `firestore.rules` são um ponto de partida. Para uso real, ajuste as permissões por perfil (administradora/professor/aluno) conforme necessário.
- **Dados existentes:** dados que estavam no JSON/MySQL local **não são migrados automaticamente** para o Firestore. Será preciso cadastrar novamente ou importar/migrar conforme necessidade.
- **Recursos avançados:** algumas operações que antes dependiam de lógica do servidor podem se comportar de forma simplificada nesta versão front-end/Firebase. Teste os fluxos principais (login, cadastro, produtos, estoque, turmas, etc.).
- **API keys do Firebase:** em apps web elas ficam no front-end; a proteção deve ser feita por Authentication + Regras do Firestore.
