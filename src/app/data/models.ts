/** Entidades do MVP (ver modelagem da Experiência Prática II). */

export interface Produto {
  id_produto?: number;
  nome: string;
  quantidade: number;
  estoque_minimo: number;
  /** Data no formato AAAA-MM-DD (opcional). */
  data_validade?: string;
}

export interface Cliente {
  id_cliente?: number;
  nome: string;
  apelido?: string;
  ativo: boolean;
}

export type TipoLancamento = 'compra' | 'pagamento';

export interface LancamentoFiado {
  id_lancamento?: number;
  id_cliente: number;
  tipo: TipoLancamento;
  valor: number;
  /** Data e hora em formato ISO. */
  data: string;
  observacao?: string;
}

export interface SaidaProduto {
  id_saida?: number;
  id_produto: number;
  quantidade: number;
  /** Data e hora em formato ISO. */
  data: string;
}

/** Credencial de acesso: nunca guarda o PIN, só salt e hash. */
export interface CredencialPin {
  chave: 'pin';
  salt: string;
  hash: string;
  iteracoes: number;
}
