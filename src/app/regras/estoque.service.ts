import { Injectable, inject } from '@angular/core';
import { Repositorio } from '../data/repositorio';
import { Produto } from '../data/models';

export const DIAS_AVISO_VENCIMENTO = 7;

export type TipoAviso = 'vencido' | 'vence_breve' | 'estoque_baixo';

export interface Aviso {
  tipo: TipoAviso;
  produto: Produto;
  /** Dias até vencer (negativo se já venceu). Só para avisos de validade. */
  dias?: number;
  titulo: string;
  detalhe: string;
}

export interface ResultadoValidacao {
  ok: boolean;
  erro?: string;
}

const TEM_MARCA_HTML = /[<>]/;

/** Dias entre hoje e a data de validade (AAAA-MM-DD), contando por dia inteiro. */
export function diasAteVencer(validade: string, hoje: Date): number {
  const [a, m, d] = validade.split('-').map(Number);
  const alvo = Date.UTC(a, m - 1, d);
  const base = Date.UTC(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
  return Math.round((alvo - base) / 86_400_000);
}

export function dataValida(texto: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(texto)) return false;
  const [a, m, d] = texto.split('-').map(Number);
  const dt = new Date(Date.UTC(a, m - 1, d));
  return dt.getUTCFullYear() === a && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

function formatarData(iso: string): string {
  const [a, m, d] = iso.split('-');
  return `${d}/${m}/${a}`;
}

/** Calcula os avisos de uma lista de produtos. Regra pura, sem acesso ao banco. */
export function calcularAvisos(produtos: Produto[], hoje: Date = new Date()): Aviso[] {
  const avisos: Aviso[] = [];
  for (const p of produtos) {
    if (p.data_validade) {
      const dias = diasAteVencer(p.data_validade, hoje);
      if (dias < 0) {
        avisos.push({
          tipo: 'vencido',
          produto: p,
          dias,
          titulo: 'VENCIDO',
          detalhe: `${p.nome} — ${p.quantidade} un — venceu em ${formatarData(p.data_validade)}`,
        });
      } else if (dias <= DIAS_AVISO_VENCIMENTO) {
        const quando = dias === 0 ? 'vence hoje' : `vence em ${dias} ${dias === 1 ? 'dia' : 'dias'}`;
        avisos.push({
          tipo: 'vence_breve',
          produto: p,
          dias,
          titulo: dias <= 3 ? `URGENTE: ${quando}` : `Atenção: ${quando}`,
          detalhe: `${p.nome} — ${p.quantidade} un — validade ${formatarData(p.data_validade)}`,
        });
      }
    }
    if (p.quantidade <= p.estoque_minimo) {
      avisos.push({
        tipo: 'estoque_baixo',
        produto: p,
        titulo: 'Estoque baixo',
        detalhe: `${p.nome} — ${p.quantidade} un (mínimo ${p.estoque_minimo})`,
      });
    }
  }
  const peso: Record<TipoAviso, number> = { vencido: 0, vence_breve: 1, estoque_baixo: 2 };
  return avisos.sort(
    (a, b) => peso[a.tipo] - peso[b.tipo] || (a.dias ?? 0) - (b.dias ?? 0) || a.produto.nome.localeCompare(b.produto.nome),
  );
}

export function validarProduto(p: Partial<Produto>): ResultadoValidacao {
  const nome = (p.nome ?? '').trim();
  if (!nome) return { ok: false, erro: 'Informe o nome do produto.' };
  if (nome.length > 80) return { ok: false, erro: 'O nome pode ter no máximo 80 letras.' };
  if (TEM_MARCA_HTML.test(nome)) return { ok: false, erro: 'Não use os sinais < ou > no nome.' };
  if (!Number.isInteger(p.quantidade) || (p.quantidade as number) < 0) {
    return { ok: false, erro: 'Informe uma quantidade inteira, de 0 para cima.' };
  }
  if (!Number.isInteger(p.estoque_minimo) || (p.estoque_minimo as number) < 0) {
    return { ok: false, erro: 'Informe um estoque mínimo inteiro, de 0 para cima.' };
  }
  if (p.data_validade && !dataValida(p.data_validade)) {
    return { ok: false, erro: 'A data de validade é inválida.' };
  }
  return { ok: true };
}

@Injectable({ providedIn: 'root' })
export class EstoqueService {
  private repo = inject(Repositorio);

  async cadastrarProduto(p: Produto): Promise<ResultadoValidacao & { id?: number }> {
    const v = validarProduto(p);
    if (!v.ok) return v;
    const nome = p.nome.trim();
    if (await this.repo.buscarProdutoPorNome(nome)) {
      return { ok: false, erro: 'Já existe um produto com esse nome.' };
    }
    const id = await this.repo.adicionarProduto({
      nome,
      quantidade: p.quantidade,
      estoque_minimo: p.estoque_minimo,
      data_validade: p.data_validade || undefined,
    });
    return { ok: true, id };
  }

  listarProdutos(): Promise<Produto[]> {
    return this.repo.listarProdutos();
  }

  async registrarSaida(idProduto: number, quantidade: number, agora: Date = new Date()): Promise<ResultadoValidacao> {
    if (!Number.isInteger(quantidade) || quantidade <= 0) {
      return { ok: false, erro: 'Informe uma quantidade maior que zero.' };
    }
    const produto = await this.repo.buscarProduto(idProduto);
    if (!produto) return { ok: false, erro: 'Produto não encontrado.' };
    if (quantidade > produto.quantidade) {
      return { ok: false, erro: `Só há ${produto.quantidade} un em estoque.` };
    }
    await this.repo.adicionarSaida({ id_produto: idProduto, quantidade, data: agora.toISOString() });
    await this.repo.atualizarProduto(idProduto, { quantidade: produto.quantidade - quantidade });
    return { ok: true };
  }

  async avisos(hoje: Date = new Date()): Promise<Aviso[]> {
    return calcularAvisos(await this.repo.listarProdutos(), hoje);
  }

  /** Lista dos mais vendidos no período (RF desejável). */
  async maisVendidos(de: Date, ate: Date, limite = 10): Promise<{ produto: Produto; total: number }[]> {
    const [saidas, produtos] = await Promise.all([this.repo.listarSaidas(), this.repo.listarProdutos()]);
    const somas = new Map<number, number>();
    for (const s of saidas) {
      const t = new Date(s.data).getTime();
      if (t >= de.getTime() && t <= ate.getTime()) {
        somas.set(s.id_produto, (somas.get(s.id_produto) ?? 0) + s.quantidade);
      }
    }
    return produtos
      .filter((p) => somas.has(p.id_produto as number))
      .map((p) => ({ produto: p, total: somas.get(p.id_produto as number) as number }))
      .sort((a, b) => b.total - a.total || a.produto.nome.localeCompare(b.produto.nome))
      .slice(0, limite);
  }
}
