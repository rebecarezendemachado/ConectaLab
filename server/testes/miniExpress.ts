/* Mini-Express SÓ PARA TESTES: reproduz o subconjunto usado pelas rotas (use/get/post/delete, params, res.json, 'finish'). */
type Camada = { metodo: string | null; padrao: string; uso: boolean; handlers: Function[] };
export function criarApp() {
  const camadas: Camada[] = [];
  const add = (metodo: string | null, uso: boolean) => (padrao: any, ...handlers: Function[]) => {
    if (typeof padrao === 'function') { handlers = [padrao, ...handlers]; padrao = '/'; }
    camadas.push({ metodo, padrao, uso, handlers });
  };
  const casar = (padrao: string, caminho: string, uso: boolean): Record<string, string> | null => {
    if (uso) return padrao === '/' || caminho === padrao || caminho.startsWith(padrao + '/') ? {} : null;
    const p = padrao.split('/'), c = caminho.split('/');
    if (p.length !== c.length) return null;
    const params: Record<string, string> = {};
    for (let i = 0; i < p.length; i++) {
      if (p[i].startsWith(':')) params[p[i].slice(1)] = decodeURIComponent(c[i]);
      else if (p[i] !== c[i]) return null;
    }
    return params;
  };
  const app = {
    use: add(null, true), get: add('GET', false), post: add('POST', false), put: add('PUT', false), delete: add('DELETE', false),
    async requisitar(m: { metodo: string; url: string; headers?: Record<string, string>; corpo?: any; ip?: string }) {
      return new Promise<{ status: number; corpo: any; headers: Record<string, any> }>((resolver) => {
        const [caminho, qs] = m.url.split('?');
        const headers: Record<string, string> = {};
        for (const [k, v] of Object.entries(m.headers || {})) headers[k.toLowerCase()] = v;
        const query = Object.fromEntries(new URLSearchParams(qs || ''));
        const req: any = { method: m.metodo, originalUrl: m.url, url: m.url, headers, body: m.corpo === undefined ? {} : JSON.parse(JSON.stringify(m.corpo)), query, params: {}, ip: m.ip || '10.0.0.1', socket: { remoteAddress: m.ip || '10.0.0.1' } };
        const ouvintes: Function[] = [];
        const saidaHeaders: Record<string, any> = {};
        let enviado = false;
        const res: any = {
          statusCode: 200, headersSent: false,
          status(n: number) { this.statusCode = n; return this; },
          setHeader(k: string, v: any) { saidaHeaders[k.toLowerCase()] = v; },
          getHeader(k: string) { return saidaHeaders[k.toLowerCase()]; },
          on(ev: string, fn: Function) { if (ev === 'finish') ouvintes.push(fn); },
          json(corpo: any) {
            if (enviado) return this; enviado = true; this.headersSent = true;
            resolver({ status: this.statusCode, corpo: corpo === undefined ? undefined : JSON.parse(JSON.stringify(corpo)), headers: saidaHeaders });
            setImmediate(() => ouvintes.forEach((f) => f()));
            return this;
          },
          end() { return this.json(undefined); },
        };
        let i = 0;
        const rodar = async (err?: any): Promise<void> => {
          if (err) return void res.status(500).json({ error: String(err?.message || err) });
          while (i < camadas.length) {
            const c = camadas[i++];
            if (c.metodo && c.metodo !== m.metodo) continue;
            const params = casar(c.padrao, caminho, c.uso);
            if (!params) continue;
            req.params = params;
            let k = 0;
            const passo = async (e?: any): Promise<void> => {
              if (e) return rodar(e);
              const h = c.handlers[k++];
              if (!h) return rodar();
              try { await h(req, res, passo); } catch (ex) { return rodar(ex); }
              if (c.handlers.length === 1 && !c.uso && h === c.handlers[0]) return; // rota final: encerra aqui
            };
            return passo();
          }
          res.status(404).json({ error: 'Não encontrado' });
        };
        rodar();
      });
    },
  };
  return app;
}

/** Um "aparelho" com a sua própria jarra de cookies (como um navegador). */
export function criarCliente(app: ReturnType<typeof criarApp>, ip = '10.0.0.1') {
  let cookie = '';
  const chamar = async (metodo: string, url: string, corpo?: any, extra: Record<string, string> = {}) => {
    const r = await app.requisitar({ metodo, url, corpo, ip, headers: { cookie, host: 'app.local', ...extra } });
    const set = r.headers['set-cookie'];
    if (set) { const par = String(set).split(';')[0]; cookie = par.endsWith('=') ? '' : par; }
    return { ...r, setCookie: set as string | undefined };
  };
  return {
    get: (u: string) => chamar('GET', u), post: (u: string, c?: any, h?: Record<string, string>) => chamar('POST', u, c, h), del: (u: string) => chamar('DELETE', u),
    get cookie() { return cookie; }, set cookie(v: string) { cookie = v; },
  };
}
