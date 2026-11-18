/* ============================================================================
   MATÉRIA REATIVA - ACESSIBILIDADE DIGITAL
   ----------------------------------------------------------------------------
   Módulo independente (TypeScript puro, sem React). Ele NÃO altera a lógica do
   sistema: só adiciona o painel de acessibilidade e melhora atributos ARIA.

   O que faz:
   1. Painel flutuante: tamanho do texto, alto contraste, destaque de elementos
      interativos, texto mais legível, redução de animações. As escolhas ficam
      salvas no navegador e valem em todas as telas.
   2. Link "Pular para o conteúdo" (WCAG 2.4.1) e indicador de foco visível
      em todo o sistema (WCAG 2.4.7).
   3. Completa nomes acessíveis que faltam (botões só com ícone, campos sem
      rótulo associado, cabeçalhos de tabela) e marca janelas como diálogos
      (role="dialog"), com foco gerenciado e tecla Esc.
   ============================================================================ */

type Prefs = {
  fonte: number; // 0 a 3
  contraste: boolean;
  destaque: boolean;
  legivel: boolean;
  semAnimacao: boolean;
};

const CHAVE = 'materia_reativa_acessibilidade';
const ESCALAS = [100, 115, 130, 150];
const PADRAO: Prefs = { fonte: 0, contraste: false, destaque: false, legivel: false, semAnimacao: false };

function lerPrefs(): Prefs {
  try {
    const bruto = localStorage.getItem(CHAVE);
    if (bruto) {
      const p = JSON.parse(bruto);
      return {
        fonte: Math.min(ESCALAS.length - 1, Math.max(0, Number(p.fonte) || 0)),
        contraste: !!p.contraste,
        destaque: !!p.destaque,
        legivel: !!p.legivel,
        semAnimacao: !!p.semAnimacao,
      };
    }
  } catch {
    /* navegador sem storage: segue com o padrão */
  }
  const reduz = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  return { ...PADRAO, semAnimacao: reduz };
}

function salvarPrefs(p: Prefs): void {
  try {
    localStorage.setItem(CHAVE, JSON.stringify(p));
  } catch {
    /* ignora */
  }
}

/* ------------------------------ CSS injetado ------------------------------ */
// tamanhos fixos em px usados pelo sistema (não acompanham o "rem" do navegador)
const TAMANHOS_PX: Array<[string, number]> = [
  ['8px', 8], ['9px', 10], ['10px', 10.5], ['10\\.5px', 10.5], ['11px', 11], ['13px', 13],
];


/* ---- alto contraste: gerado com correspondência EXATA de classes (~=), para não
   atingir variações como "hover:bg-emerald-500" ---- */
const GRUPOS: Array<{ fam: string[]; escuro: string }> = [
  { fam: ['blue', 'indigo', 'purple', 'violet', 'sky', 'cyan', 'fuchsia', 'pink'], escuro: '#0A2E75' },
  { fam: ['emerald', 'green', 'teal', 'lime'], escuro: '#064E2B' },
  { fam: ['amber', 'orange', 'yellow'], escuro: '#7A3300' },
  { fam: ['rose', 'red'], escuro: '#8A0F1F' },
];
const HC = 'html.a11y-contraste';
const tok = (prefixo: string, fams: string[], tons: number[]) =>
  fams.flatMap((f) => tons.map((n) => `${HC} [class~="${prefixo}-${f}-${n}"]`)).join(',');
const SUPERF_ESCURAS = '.bg-black,.bg-zinc-900,.bg-zinc-950,.bg-slate-900,.bg-slate-950,.bg-gray-900,.bg-gray-950';

function contrasteAlto(): string {
  const todas = GRUPOS.flatMap((g) => g.fam);
  const linhas: string[] = [];
  linhas.push(`${HC}{color-scheme:light}`);
  linhas.push(`${HC} body,${HC} .bg-\\[\\#F0F3F9\\],${HC} .tela-acesso-main{background:#fff !important;background-image:none !important;color:#000 !important}`);
  linhas.push(`${HC} .bg-white,${HC} .bg-zinc-50,${HC} .bg-zinc-100,${HC} .bg-slate-50,${HC} .bg-gray-50{background:#fff !important}`);
  linhas.push(`${HC} main > header{background:#fff !important;border-bottom:2px solid #000 !important;box-shadow:none !important;backdrop-filter:none !important}`);
  linhas.push(`${HC} .bg-white.rounded-2xl,${HC} .bg-white.rounded-3xl{border:2px solid #000 !important;box-shadow:none !important}`);
  // textos cinza (tons 400 a 900, só o token exato)
  const cinzas = ['zinc', 'slate', 'gray', 'neutral'].flatMap((f) => [400, 500, 600, 700, 800, 900].map((n) => `${HC} [class~="text-${f}-${n}"]`)).join(',');
  linhas.push(`${cinzas}{color:#111 !important}`);
  linhas.push(`${HC} [class*="border-zinc-"],${HC} [class*="border-slate-"],${HC} [class*="border-gray-"]{border-color:#444 !important}`);
  // fundos claros coloridos (selos/etiquetas): branco com borda preta
  linhas.push(`${tok('bg', todas, [50, 100])}{background:#fff !important;border-color:#000 !important}`);
  // fundos coloridos fortes (botões/etiquetas): cor escura da família + texto branco
  GRUPOS.forEach((g) => {
    const t = tok('bg', g.fam, [500, 600, 700, 800]);
    linhas.push(`${t}{background:${g.escuro} !important;background-image:none !important;color:#fff !important;border-color:#000 !important}`);
    linhas.push(`${t.split(',').map((x) => x + ' *').join(',')}{color:#fff !important}`);
    // textos coloridos escuros (tons 500 a 900)
    linhas.push(`${tok('text', g.fam, [500, 600, 700, 800, 900])}{color:${g.escuro} !important}`);
  });
  // azul da marca escrito de forma livre
  linhas.push(`${HC} [class~="text-[#2F80ED]"],${HC} [class~="text-[#2B7FFF]"],${HC} [class~="text-[#1E6BDB]"]{color:#0A2E75 !important}`);
  linhas.push(`${HC} [class~="bg-[#2F80ED]"],${HC} [class~="bg-[#2B7FFF]"],${HC} [class~="bg-[#1E6BDB]"],${HC} [class*="from-[#2B7FFF]"]{background:#0A2E75 !important;background-image:none !important;color:#fff !important;border:2px solid #000 !important;box-shadow:none !important}`);
  linhas.push(`${HC} [class~="bg-[#2F80ED]"] *,${HC} [class~="bg-[#2B7FFF]"] *,${HC} [class*="from-[#2B7FFF]"] *{color:#fff !important}`);
  // menu lateral
  linhas.push(`${HC} aside.bg-black,${HC} aside .bg-black{background:#000 !important;border-right:2px solid #fff !important}`);
  linhas.push(`${HC} aside nav button{color:#fff !important}`);
  linhas.push(`${HC} aside nav button.bg-zinc-800{background:#fff !important;color:#000 !important;box-shadow:none !important}`);
  linhas.push(`${HC} aside nav button.bg-zinc-800 *{color:#000 !important}`);
  // superfícies escuras (câmera, cabeçalhos de janela): texto claro. Vem DEPOIS das regras de texto.
  linhas.push(`${HC} :is(${SUPERF_ESCURAS}) *{color:#fff !important}`);
  linhas.push(`${HC} aside nav button.bg-zinc-800 *{color:#000 !important}`);
  // links, campos, tabelas, foco
  linhas.push(`${HC} a{text-decoration:underline}`);
  linhas.push(`${HC} input,${HC} select,${HC} textarea{border:2px solid #000 !important;background:#fff !important;color:#000 !important}`);
  linhas.push(`${HC} ::placeholder{color:#333 !important;opacity:1 !important}`);
  linhas.push(`${HC} table th{color:#000 !important}`);
  linhas.push(`${HC} table td,${HC} table th{border-color:#000 !important}`);
  linhas.push(`${HC} :focus-visible{outline:4px solid #FF8A00 !important;outline-offset:2px}`);
  linhas.push(`${HC} aside :focus-visible{outline-color:#FFD400 !important}`);
  linhas.push(`${HC} #mra11y-painel{border:2px solid #000}`);
  return linhas.join('\n');
}

function montarCss(): string {
  const escalaPx = TAMANHOS_PX.map(
    ([classe, px]) => `html[data-a11y-fonte="1"] .text-\\[${classe}\\],html[data-a11y-fonte="2"] .text-\\[${classe}\\],html[data-a11y-fonte="3"] .text-\\[${classe}\\]{font-size:calc(${px}px * var(--a11y-escala,1))}`,
  ).join('\n');

  return `
/* ---------- foco visível em todo o sistema (WCAG 2.4.7 / 2.4.13) ---------- */
:focus-visible{outline:3px solid #1E6BDB;outline-offset:2px;border-radius:4px}
aside :focus-visible,.a11y-fundo-escuro :focus-visible{outline-color:#fff}

/* ---------- link "pular para o conteúdo" ---------- */
.mra11y-skip{position:fixed;left:8px;top:-60px;z-index:2147483000;background:#0B3D91;color:#fff;padding:10px 16px;border-radius:10px;font:600 14px/1.2 system-ui,sans-serif;text-decoration:none;transition:top .15s}
.mra11y-skip:focus{top:8px;outline:3px solid #fff;outline-offset:2px}
.mra11y-sr{position:absolute;width:1px;height:1px;margin:-1px;padding:0;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}

/* ---------- avisos de erro/permissão (vindos do servidor) ---------- */
#mra11y-aviso{position:fixed;left:14px;bottom:14px;z-index:2147482000;max-width:min(380px,calc(100vw - 28px));background:#0F1A33;color:#fff;border-left:5px solid #E11D48;border-radius:12px;padding:12px 16px;font:600 13.5px/1.4 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;box-shadow:0 18px 40px -16px rgba(6,18,58,.6);animation:mra11y-in .22s cubic-bezier(.22,.8,.24,1)}
@media (max-width:1023px){#mra11y-aviso{bottom:calc(70px + env(safe-area-inset-bottom,0px))}}
/* ---------- botão flutuante ---------- */
#mra11y-btn{position:fixed;right:14px;bottom:14px;z-index:45;width:44px;height:44px;border-radius:50%;border:2px solid #fff;background:#1E6BDB;color:#fff;display:flex;align-items:center;justify-content:center;cursor:pointer;box-shadow:0 6px 20px -6px rgba(10,40,110,.6);transition:transform .2s,box-shadow .2s,background .2s;padding:0}
#mra11y-btn:hover{transform:scale(1.06);background:#1558B8}
#mra11y-btn:active{transform:scale(.96)}
#mra11y-btn svg{width:26px;height:26px;pointer-events:none}
@media (max-width:1023px){#mra11y-btn{bottom:calc(70px + env(safe-area-inset-bottom,0px));right:12px;width:42px;height:42px}}

/* ---------- painel ---------- */
#mra11y-painel{position:fixed;right:14px;bottom:70px;z-index:46;width:min(340px,calc(100vw - 24px));max-height:min(620px,calc(100dvh - 90px));overflow-y:auto;background:#fff;color:#0F1A33;border:1px solid #C7D2E6;border-radius:18px;box-shadow:0 24px 60px -18px rgba(6,18,58,.5);font:14px/1.45 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;animation:mra11y-in .22s cubic-bezier(.22,.8,.24,1)}
@keyframes mra11y-in{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
@media (max-width:1023px){#mra11y-painel{right:12px;bottom:calc(122px + env(safe-area-inset-bottom,0px));max-height:calc(100dvh - 190px)}}
#mra11y-painel[hidden]{display:none}
#mra11y-painel header{display:flex;align-items:center;justify-content:space-between;padding:14px 16px;border-bottom:1px solid #DDE5F2;position:sticky;top:0;background:#fff;border-radius:18px 18px 0 0}
#mra11y-painel h2{margin:0;font-size:15px;font-weight:700}
#mra11y-painel .mra11y-x{width:34px;height:34px;border-radius:10px;border:1px solid #C7D2E6;background:#F6F9FE;color:#0F1A33;cursor:pointer;font-size:18px;line-height:1;padding:0}
#mra11y-painel .mra11y-corpo{padding:12px 16px 16px;display:grid;gap:14px}
#mra11y-painel .mra11y-grupo-t{font-weight:700;font-size:13px;margin:0 0 6px}
#mra11y-painel .mra11y-linha{display:flex;gap:8px;align-items:center}
#mra11y-painel button.mra11y-b{flex:1;min-height:40px;border-radius:10px;border:1px solid #C7D2E6;background:#F6F9FE;color:#0F1A33;font:600 14px system-ui,sans-serif;cursor:pointer;padding:6px 10px}
#mra11y-painel button.mra11y-b:hover{background:#EDF2FA}
#mra11y-painel .mra11y-nivel{min-width:64px;text-align:center;font-weight:700;color:#1E6BDB}
#mra11y-painel label.mra11y-sw{display:flex;align-items:flex-start;gap:12px;padding:10px 12px;border:1px solid #DDE5F2;border-radius:12px;cursor:pointer;background:#fff}
#mra11y-painel label.mra11y-sw:hover{background:#F6F9FE}
#mra11y-painel label.mra11y-sw input{width:20px;height:20px;margin-top:2px;accent-color:#1E6BDB;flex:none}
#mra11y-painel .mra11y-sw b{display:block;font-size:14px}
#mra11y-painel .mra11y-sw small{display:block;color:#48566F;font-size:12.5px;line-height:1.35}
#mra11y-painel .mra11y-reset{background:#fff;border:1px solid #C7D2E6;color:#B42318}
#mra11y-painel .mra11y-rodape{font-size:12px;color:#48566F;margin:0}

/* ---------- 1. tamanho do texto ---------- */
html[data-a11y-fonte]{--a11y-escala:1}
${ESCALAS.map((e, i) => (i === 0 ? '' : `html[data-a11y-fonte="${i}"]{font-size:${e}%;--a11y-escala:${e / 100}}`)).join('\n')}
${escalaPx}
/* com texto ampliado (130% ou mais) os cartões azuis reorganizam as colunas sozinhos, sem cortar números */
html[data-a11y-fonte="2"] .grid:has(> div[class*="from-[#2B7FFF]"]),html[data-a11y-fonte="3"] .grid:has(> div[class*="from-[#2B7FFF]"]){grid-template-columns:repeat(auto-fit,minmax(min(100%,13rem),1fr))}
html[data-a11y-fonte="2"] .grid > div[class*="from-[#2B7FFF]"] .font-mono,html[data-a11y-fonte="3"] .grid > div[class*="from-[#2B7FFF]"] .font-mono{max-width:none}
/* o menu lateral nunca passa da largura da tela quando o texto é ampliado */
html[data-a11y-fonte] aside{max-width:92vw}

/* ---------- 3. destaque de elementos interativos ---------- */
html.a11y-destaque a,html.a11y-destaque button,html.a11y-destaque [role="button"],html.a11y-destaque input:not([type="hidden"]),html.a11y-destaque select,html.a11y-destaque textarea,html.a11y-destaque [tabindex]:not([tabindex="-1"]){outline:2px dashed #7C3AED;outline-offset:2px}
html.a11y-destaque a:hover,html.a11y-destaque button:hover,html.a11y-destaque input:hover,html.a11y-destaque select:hover{outline-style:solid;outline-width:3px}
html.a11y-destaque a{text-decoration:underline}

/* ---------- 4. texto mais legível (espaçamento WCAG 1.4.12) ---------- */
html.a11y-legivel body,html.a11y-legivel button,html.a11y-legivel input,html.a11y-legivel select,html.a11y-legivel textarea{font-family:Verdana,"Segoe UI",Arial,sans-serif !important;letter-spacing:.02em !important;word-spacing:.1em !important}
html.a11y-legivel p,html.a11y-legivel li,html.a11y-legivel td,html.a11y-legivel label{line-height:1.6 !important}

/* ---------- 5. sem animações ---------- */
html.a11y-sem-animacao *,html.a11y-sem-animacao *::before,html.a11y-sem-animacao *::after{animation:none !important;transition:none !important;scroll-behavior:auto !important}
html.a11y-sem-animacao .imagem-fundo{transform:none !important}

/* ---------- 2. ALTO CONTRASTE ---------- */
${contrasteAlto()}
`;
}

/* ------------------------------ aplicação ------------------------------ */
let prefs: Prefs = lerPrefs();
let regiaoViva: HTMLElement | null = null;

function anunciar(texto: string): void {
  if (!regiaoViva) return;
  regiaoViva.textContent = '';
  window.setTimeout(() => {
    if (regiaoViva) regiaoViva.textContent = texto;
  }, 40);
}

function aplicar(): void {
  const h = document.documentElement;
  h.setAttribute('data-a11y-fonte', String(prefs.fonte));
  h.classList.toggle('a11y-contraste', prefs.contraste);
  h.classList.toggle('a11y-destaque', prefs.destaque);
  h.classList.toggle('a11y-legivel', prefs.legivel);
  h.classList.toggle('a11y-sem-animacao', prefs.semAnimacao);
  if (prefs.fonte === 0) h.removeAttribute('data-a11y-fonte');
  salvarPrefs(prefs);
  atualizarPainel();
}

/* ------------------------------ painel (DOM) ------------------------------ */
let painel: HTMLElement | null = null;
let botao: HTMLButtonElement | null = null;

const ICONE = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><circle cx="12" cy="4.5" r="1.8"/><path d="M5 8.5l7 1.2 7-1.2"/><path d="M12 9.7V14"/><path d="M12 14l-3 6.5"/><path d="M12 14l3 6.5"/></svg>`;

function interruptor(id: string, titulo: string, descricao: string): string {
  return `<label class="mra11y-sw" for="${id}"><input type="checkbox" id="${id}"><span><b>${titulo}</b><small>${descricao}</small></span></label>`;
}

function construirPainel(): void {
  botao = document.createElement('button');
  botao.id = 'mra11y-btn';
  botao.type = 'button';
  botao.setAttribute('aria-label', 'Abrir opções de acessibilidade');
  botao.setAttribute('aria-expanded', 'false');
  botao.setAttribute('aria-controls', 'mra11y-painel');
  botao.title = 'Acessibilidade';
  botao.innerHTML = ICONE;

  painel = document.createElement('div');
  painel.id = 'mra11y-painel';
  painel.setAttribute('role', 'dialog');
  painel.setAttribute('aria-labelledby', 'mra11y-titulo');
  painel.hidden = true;
  painel.innerHTML = `
    <header>
      <h2 id="mra11y-titulo">Acessibilidade</h2>
      <button type="button" class="mra11y-x" aria-label="Fechar opções de acessibilidade">&times;</button>
    </header>
    <div class="mra11y-corpo">
      <div role="group" aria-labelledby="mra11y-g-fonte">
        <p class="mra11y-grupo-t" id="mra11y-g-fonte">Tamanho do texto</p>
        <div class="mra11y-linha">
          <button type="button" class="mra11y-b" data-a="fonte-menos" aria-label="Diminuir o tamanho do texto">A&minus;</button>
          <span class="mra11y-nivel" id="mra11y-nivel" aria-live="off">100%</span>
          <button type="button" class="mra11y-b" data-a="fonte-mais" aria-label="Aumentar o tamanho do texto">A+</button>
        </div>
      </div>
      ${interruptor('mra11y-contraste', 'Alto contraste', 'Cores fortes, bordas marcadas e texto escuro sobre fundo claro.')}
      ${interruptor('mra11y-destaque', 'Destacar botões e links', 'Contorno visível em tudo o que pode ser clicado ou preenchido.')}
      ${interruptor('mra11y-legivel', 'Texto mais legível', 'Fonte simples e maior espaçamento entre letras, palavras e linhas.')}
      ${interruptor('mra11y-anim', 'Reduzir animações', 'Para o movimento de fundos, transições e efeitos.')}
      <button type="button" class="mra11y-b mra11y-reset" data-a="restaurar">Restaurar padrões</button>
      <p class="mra11y-rodape">Dica: use a tecla Tab para navegar, Enter para ativar e Esc para fechar janelas. Suas escolhas ficam salvas neste navegador.</p>
    </div>`;

  document.body.appendChild(botao);
  document.body.appendChild(painel);

  botao.addEventListener('click', () => alternarPainel());
  painel.addEventListener('click', (ev) => {
    const alvo = (ev.target as HTMLElement).closest('button') as HTMLButtonElement | null;
    if (!alvo) return;
    if (alvo.classList.contains('mra11y-x')) return fecharPainel(true);
    const a = alvo.getAttribute('data-a');
    if (a === 'fonte-mais' && prefs.fonte < ESCALAS.length - 1) { prefs.fonte++; aplicar(); anunciar(`Texto em ${ESCALAS[prefs.fonte]} por cento`); }
    else if (a === 'fonte-menos' && prefs.fonte > 0) { prefs.fonte--; aplicar(); anunciar(`Texto em ${ESCALAS[prefs.fonte]} por cento`); }
    else if (a === 'restaurar') { prefs = { ...PADRAO }; aplicar(); anunciar('Opções de acessibilidade restauradas ao padrão'); }
  });
  const ligar = (id: string, campo: 'contraste' | 'destaque' | 'legivel' | 'semAnimacao', nome: string) => {
    const el = painel!.querySelector<HTMLInputElement>('#' + id)!;
    el.addEventListener('change', () => { prefs[campo] = el.checked; aplicar(); anunciar(`${nome} ${el.checked ? 'ativado' : 'desativado'}`); });
  };
  ligar('mra11y-contraste', 'contraste', 'Alto contraste');
  ligar('mra11y-destaque', 'destaque', 'Destaque de botões e links');
  ligar('mra11y-legivel', 'legivel', 'Texto mais legível');
  ligar('mra11y-anim', 'semAnimacao', 'Redução de animações');

  // teclado dentro do painel: Esc fecha, Tab circula
  painel.addEventListener('keydown', (ev) => {
    if (ev.key === 'Escape') { ev.stopPropagation(); fecharPainel(true); return; }
    if (ev.key !== 'Tab') return;
    const f = focaveis(painel!);
    if (!f.length) return;
    const primeiro = f[0], ultimo = f[f.length - 1];
    if (ev.shiftKey && document.activeElement === primeiro) { ev.preventDefault(); ultimo.focus(); }
    else if (!ev.shiftKey && document.activeElement === ultimo) { ev.preventDefault(); primeiro.focus(); }
  });

  // clique fora fecha
  document.addEventListener('mousedown', (ev) => {
    if (painel && !painel.hidden && !painel.contains(ev.target as Node) && ev.target !== botao && !botao!.contains(ev.target as Node)) fecharPainel(false);
  });

  atualizarPainel();
}

function atualizarPainel(): void {
  if (!painel) return;
  const set = (id: string, v: boolean) => { const el = painel!.querySelector<HTMLInputElement>('#' + id); if (el) el.checked = v; };
  set('mra11y-contraste', prefs.contraste);
  set('mra11y-destaque', prefs.destaque);
  set('mra11y-legivel', prefs.legivel);
  set('mra11y-anim', prefs.semAnimacao);
  const nivel = painel.querySelector('#mra11y-nivel');
  if (nivel) nivel.textContent = ESCALAS[prefs.fonte] + '%';
  const menos = painel.querySelector<HTMLButtonElement>('[data-a="fonte-menos"]');
  const mais = painel.querySelector<HTMLButtonElement>('[data-a="fonte-mais"]');
  if (menos) menos.disabled = prefs.fonte === 0;
  if (mais) mais.disabled = prefs.fonte === ESCALAS.length - 1;
}

function focaveis(raiz: HTMLElement): HTMLElement[] {
  return Array.from(
    raiz.querySelectorAll<HTMLElement>('a[href],button:not([disabled]),input:not([disabled]):not([type="hidden"]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'),
  ).filter((e) => e.offsetParent !== null || e === document.activeElement);
}

function alternarPainel(): void {
  if (!painel) return;
  if (painel.hidden) {
    painel.hidden = false;
    botao!.setAttribute('aria-expanded', 'true');
    botao!.setAttribute('aria-label', 'Fechar opções de acessibilidade');
    (painel.querySelector('.mra11y-x') as HTMLElement).focus();
  } else {
    fecharPainel(true);
  }
}

function fecharPainel(devolverFoco: boolean): void {
  if (!painel || painel.hidden) return;
  painel.hidden = true;
  botao!.setAttribute('aria-expanded', 'false');
  botao!.setAttribute('aria-label', 'Abrir opções de acessibilidade');
  if (devolverFoco) botao!.focus();
}

/* ------------------------- melhorias de ARIA no sistema ------------------------- */
const NOMES_ICONES: Record<string, string> = {
  'lucide-menu': 'Abrir menu de navegação',
  'lucide-x': 'Fechar',
  'lucide-search': 'Buscar',
  'lucide-bell': 'Notificações',
  'lucide-chevron-left': 'Página anterior',
  'lucide-chevron-right': 'Próxima página',
  'lucide-chevrons-left': 'Primeira página',
  'lucide-chevrons-right': 'Última página',
  'lucide-trash-2': 'Excluir',
  'lucide-trash': 'Excluir',
  'lucide-pencil': 'Editar',
  'lucide-square-pen': 'Editar',
  'lucide-pen': 'Editar',
  'lucide-eye': 'Visualizar',
  'lucide-eye-off': 'Ocultar',
  'lucide-qr-code': 'QR Code',
  'lucide-printer': 'Imprimir',
  'lucide-plus': 'Adicionar',
  'lucide-download': 'Baixar',
  'lucide-more-vertical': 'Mais opções',
  'lucide-ellipsis-vertical': 'Mais opções',
};

function nomeAcessivelVazio(el: HTMLElement): boolean {
  return !(el.getAttribute('aria-label') || el.getAttribute('aria-labelledby') || el.getAttribute('title') || (el.textContent || '').trim());
}

function melhorarBotoes(raiz: ParentNode): void {
  raiz.querySelectorAll<HTMLElement>('button, a[href], [role="button"]').forEach((b) => {
    if (!nomeAcessivelVazio(b)) return;
    const svg = b.querySelector('svg');
    const cls = svg ? Array.from(svg.classList).find((c) => c.startsWith('lucide-')) : undefined;
    let nome = cls ? NOMES_ICONES[cls] : undefined;
    // olho ao lado de um campo de senha = mostrar/ocultar senha
    if (cls === 'lucide-eye' || cls === 'lucide-eye-off') {
      const pai = b.parentElement;
      if (pai && pai.querySelector('input')) nome = 'Mostrar ou ocultar senha';
    }
    if (nome) b.setAttribute('aria-label', nome);
  });
}

function textoDoRotuloProximo(campo: HTMLElement): string {
  // procura um <label> visível irmão ou no mesmo bloco, imediatamente antes do campo
  let atual: HTMLElement | null = campo;
  for (let nivel = 0; nivel < 3 && atual; nivel++) {
    let irmao = atual.previousElementSibling as HTMLElement | null;
    while (irmao) {
      if (irmao.tagName === 'LABEL') return (irmao.textContent || '').trim();
      const dentro = irmao.querySelector('label');
      if (dentro) return (dentro.textContent || '').trim();
      irmao = irmao.previousElementSibling as HTMLElement | null;
    }
    atual = atual.parentElement;
    const lb = atual && atual.querySelector(':scope > label');
    if (lb) return (lb.textContent || '').trim();
  }
  return '';
}

function melhorarCampos(raiz: ParentNode): void {
  raiz.querySelectorAll<HTMLInputElement>('input:not([type="hidden"]), select, textarea').forEach((c) => {
    if ((c.labels && c.labels.length) || c.getAttribute('aria-label') || c.getAttribute('aria-labelledby')) return;
    const tipo = (c.getAttribute('type') || '').toLowerCase();
    if (tipo === 'checkbox' || tipo === 'radio') {
      const t = (c.closest('label')?.textContent || '').trim();
      if (t) c.setAttribute('aria-label', t);
      return;
    }
    const nome = textoDoRotuloProximo(c) || c.getAttribute('placeholder') || c.getAttribute('title') || (tipo === 'search' ? 'Buscar' : '');
    if (nome) c.setAttribute('aria-label', nome.replace(/\s+/g, ' ').replace(/\*$/, '').trim());
  });
}

function melhorarTabelas(raiz: ParentNode): void {
  raiz.querySelectorAll<HTMLElement>('th:not([scope])').forEach((th) => {
    th.setAttribute('scope', th.closest('thead') || !th.closest('tbody') ? 'col' : 'row');
  });
}

/** Elementos clicáveis que são <div> (ex.: perfil no rodapé do menu) passam a ser acessíveis por teclado e leitor de tela. */
function tornarDivsClicaveisAcessiveis(raiz: ParentNode): void {
  raiz.querySelectorAll<HTMLElement>('aside > div:last-child > div.cursor-pointer').forEach((el) => {
    if (el.dataset.mra11yBotao) return;
    el.dataset.mra11yBotao = '1';
    el.setAttribute('role', 'button');
    el.setAttribute('tabindex', '0');
    el.setAttribute('aria-haspopup', 'menu');
    if (!el.getAttribute('aria-label')) el.setAttribute('aria-label', 'Menu do usuário: ' + (el.textContent || '').replace(/\s+/g, ' ').trim());
    el.addEventListener('keydown', (ev) => {
      if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); el.click(); }
    });
  });
}

function esconderDecorativos(raiz: ParentNode): void {
  // separadores visuais ("·", "•", "|") não devem ser lidos por leitores de tela
  raiz.querySelectorAll<HTMLElement>('span:not([aria-hidden])').forEach((el) => {
    if (el.children.length === 0 && /^[·•|\u2022\u00b7\/\-–—]$/.test((el.textContent || '').trim())) el.setAttribute('aria-hidden', 'true');
  });
}

function melhorarMensagens(no: Element): void {
  // mensagens de erro/aviso que surgem na tela são lidas por leitores de tela
  const candidatos: Element[] = [no, ...Array.from(no.querySelectorAll('div,p'))];
  candidatos.forEach((el) => {
    const c = el.getAttribute && el.getAttribute('class');
    if (!c || el.getAttribute('role') || el.tagName === 'BUTTON') return;
    if (/(^|\s)(bg|border)-(rose|red)-(50|100|200)(\s|\/|$)/.test(c) && (el.textContent || '').trim().length > 6 && el.querySelector('button, input') === null) {
      el.setAttribute('role', 'alert');
    }
  });
}

/* diálogos: role, nome, foco ao abrir, retorno do foco ao fechar, Tab preso, Esc */
const dialogosVistos = new WeakMap<Element, HTMLElement | null>();

function seletorOverlay(): string {
  return '.fixed.inset-0.z-50.flex';
}

function tratarDialogo(overlay: HTMLElement): void {
  const caixa = overlay.firstElementChild as HTMLElement | null;
  if (!caixa || dialogosVistos.has(overlay)) return;
  dialogosVistos.set(overlay, document.activeElement as HTMLElement | null);
  caixa.setAttribute('role', 'dialog');
  caixa.setAttribute('aria-modal', 'true');
  const titulo = caixa.querySelector('h1,h2,h3,h4');
  if (titulo) {
    if (!titulo.id) titulo.id = 'mra11y-dlg-' + Math.random().toString(36).slice(2, 8);
    caixa.setAttribute('aria-labelledby', titulo.id);
  } else {
    caixa.setAttribute('aria-label', 'Janela');
  }
  caixa.setAttribute('tabindex', '-1');
  window.setTimeout(() => {
    if (!document.contains(caixa)) return;
    if (caixa.contains(document.activeElement) && document.activeElement !== caixa) return; // o sistema já colocou o foco
    const alvo = focaveis(caixa).find((e) => e.tagName === 'INPUT' || e.tagName === 'SELECT' || e.tagName === 'TEXTAREA') || focaveis(caixa)[0] || caixa;
    alvo.focus({ preventScroll: true });
  }, 60);
}

function dialogoRemovido(overlay: Element): void {
  const anterior = dialogosVistos.get(overlay);
  dialogosVistos.delete(overlay);
  if (anterior && document.contains(anterior)) {
    window.setTimeout(() => { if (!document.querySelector(seletorOverlay())) anterior.focus({ preventScroll: true }); }, 30);
  }
}

function botaoFechar(caixa: HTMLElement): HTMLElement | null {
  const bs = Array.from(caixa.querySelectorAll<HTMLElement>('button'));
  return (
    bs.find((b) => /fechar|close/i.test(b.getAttribute('aria-label') || b.title || '')) ||
    bs.find((b) => !!b.querySelector('svg.lucide-x')) ||
    bs.find((b) => /^(cancelar|fechar)$/i.test((b.textContent || '').trim())) ||
    null
  );
}

function teclado(ev: KeyboardEvent): void {
  const overlays = document.querySelectorAll<HTMLElement>(seletorOverlay());
  const topo = overlays[overlays.length - 1];
  if (!topo) return;
  const caixa = topo.firstElementChild as HTMLElement | null;
  if (!caixa) return;
  if (ev.key === 'Escape') {
    const fechar = botaoFechar(caixa);
    // espera o próprio sistema agir; só fecha se a janela continuar aberta
    window.setTimeout(() => { if (document.contains(topo) && fechar && document.contains(fechar)) fechar.click(); }, 90);
    return;
  }
  if (ev.key === 'Tab') {
    const f = focaveis(caixa);
    if (!f.length) { ev.preventDefault(); caixa.focus(); return; }
    const primeiro = f[0], ultimo = f[f.length - 1];
    if (!caixa.contains(document.activeElement)) { ev.preventDefault(); primeiro.focus(); }
    else if (ev.shiftKey && document.activeElement === primeiro) { ev.preventDefault(); ultimo.focus(); }
    else if (!ev.shiftKey && document.activeElement === ultimo) { ev.preventDefault(); primeiro.focus(); }
  }
}

/* link "pular para o conteúdo" */
function criarPularConteudo(): void {
  const a = document.createElement('a');
  a.className = 'mra11y-skip';
  a.href = '#conteudo-principal';
  a.textContent = 'Pular para o conteúdo principal';
  a.addEventListener('click', (ev) => {
    ev.preventDefault(); // não muda a "#" da URL (o sistema usa a URL para navegar)
    const alvo = document.querySelector<HTMLElement>('main') || document.querySelector<HTMLElement>('[role="main"]') || document.querySelector<HTMLElement>('h1');
    if (alvo) {
      if (!alvo.id) alvo.id = 'conteudo-principal';
      if (!alvo.hasAttribute('tabindex')) alvo.setAttribute('tabindex', '-1');
      alvo.focus();
    }
  });
  document.body.insertBefore(a, document.body.firstChild);
}

let agendado = false;
function processarMudancas(): void {
  agendado = false;
  melhorarBotoes(document);
  melhorarCampos(document);
  melhorarTabelas(document);
  esconderDecorativos(document);
  tornarDivsClicaveisAcessiveis(document);
  document.querySelectorAll<HTMLElement>(seletorOverlay()).forEach(tratarDialogo);
}

let ultimoAviso = { texto: '', quando: 0 };
function mostrarAviso(texto: string): void {
  const agora = Date.now();
  if (texto === ultimoAviso.texto && agora - ultimoAviso.quando < 30000) return; // não repete a mesma mensagem
  ultimoAviso = { texto, quando: agora };
  document.getElementById('mra11y-aviso')?.remove();
  const el = document.createElement('div');
  el.id = 'mra11y-aviso';
  el.setAttribute('role', 'alert'); // leitores de tela leem na hora
  el.textContent = texto;
  document.body.appendChild(el);
  window.setTimeout(() => el.remove(), 7000);
}

function iniciar(): void {
  if ((window as any).__mrA11yIniciado) return;
  (window as any).__mrA11yIniciado = true;

  const estilo = document.createElement('style');
  estilo.id = 'mra11y-estilos';
  estilo.textContent = montarCss();
  document.head.appendChild(estilo);

  regiaoViva = document.createElement('div');
  regiaoViva.className = 'mra11y-sr';
  regiaoViva.setAttribute('role', 'status');
  regiaoViva.setAttribute('aria-live', 'polite');
  document.body.appendChild(regiaoViva);

  criarPularConteudo();
  construirPainel();
  aplicar();
  processarMudancas();

  document.addEventListener('keydown', teclado, true);
  window.addEventListener('mr:erro-api', (ev) => mostrarAviso(String((ev as CustomEvent).detail || 'Não foi possível concluir a operação.')));

  // acompanha as telas do React: aplica as melhorias em tudo que for criado depois
  const obs = new MutationObserver((mutacoes) => {
    for (const m of mutacoes) {
      m.removedNodes.forEach((n) => {
        if (n instanceof HTMLElement && n.matches && n.matches(seletorOverlay())) dialogoRemovido(n);
      });
      m.addedNodes.forEach((n) => {
        if (n instanceof HTMLElement) melhorarMensagens(n);
      });
    }
    if (!agendado) {
      agendado = true;
      window.setTimeout(processarMudancas, 120);
    }
  });
  obs.observe(document.body, { childList: true, subtree: true });
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar);
  else iniciar();
}

export {};
