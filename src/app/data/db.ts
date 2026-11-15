import Dexie, { DexieOptions, EntityTable } from 'dexie';
import { Cliente, CredencialPin, LancamentoFiado, Produto, SaidaProduto } from './models';

/** Banco local (IndexedDB) acessado pelo Dexie. Não monta consultas em texto. */
export class MercadinhoDb extends Dexie {
  produtos!: EntityTable<Produto, 'id_produto'>;
  clientes!: EntityTable<Cliente, 'id_cliente'>;
  lancamentos!: EntityTable<LancamentoFiado, 'id_lancamento'>;
  saidas!: EntityTable<SaidaProduto, 'id_saida'>;
  config!: EntityTable<CredencialPin, 'chave'>;

  constructor(nome = 'mercadinho-dnogueira', opcoes?: DexieOptions) {
    super(nome, opcoes);
    this.version(1).stores({
      produtos: '++id_produto, &nome',
      clientes: '++id_cliente, nome',
      lancamentos: '++id_lancamento, id_cliente',
      saidas: '++id_saida, id_produto',
      config: 'chave',
    });
  }
}
