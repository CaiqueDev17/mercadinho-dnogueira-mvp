import { Injectable } from '@angular/core';
import { MercadinhoDb } from './db';
import { Cliente, CredencialPin, LancamentoFiado, Produto, SaidaProduto } from './models';

/**
 * Camada de dados: só grava e lê. Não tem regra de negócio.
 * As regras ficam em src/app/regras.
 */
@Injectable({ providedIn: 'root' })
export class Repositorio {
  private db = new MercadinhoDb();

  /** Troca o banco (usado nos testes, com um nome de banco só para o teste). */
  usarBanco(db: MercadinhoDb): void {
    this.db = db;
  }

  // Produtos
  listarProdutos(): Promise<Produto[]> {
    return this.db.produtos.toArray();
  }
  buscarProduto(id: number): Promise<Produto | undefined> {
    return this.db.produtos.get(id);
  }
  buscarProdutoPorNome(nome: string): Promise<Produto | undefined> {
    return this.db.produtos.where('nome').equals(nome).first();
  }
  async adicionarProduto(p: Produto): Promise<number> {
    return (await this.db.produtos.add(p)) as number;
  }
  atualizarProduto(id: number, mudancas: Partial<Produto>): Promise<number> {
    return this.db.produtos.update(id, mudancas);
  }

  // Saídas
  listarSaidas(): Promise<SaidaProduto[]> {
    return this.db.saidas.toArray();
  }
  async adicionarSaida(s: SaidaProduto): Promise<number> {
    return (await this.db.saidas.add(s)) as number;
  }

  // Clientes
  listarClientes(): Promise<Cliente[]> {
    return this.db.clientes.toArray();
  }
  buscarCliente(id: number): Promise<Cliente | undefined> {
    return this.db.clientes.get(id);
  }
  async adicionarCliente(c: Cliente): Promise<number> {
    return (await this.db.clientes.add(c)) as number;
  }
  atualizarCliente(id: number, mudancas: Partial<Cliente>): Promise<number> {
    return this.db.clientes.update(id, mudancas);
  }

  // Fiado
  listarLancamentos(idCliente?: number): Promise<LancamentoFiado[]> {
    return idCliente === undefined
      ? this.db.lancamentos.toArray()
      : this.db.lancamentos.where('id_cliente').equals(idCliente).toArray();
  }
  async adicionarLancamento(l: LancamentoFiado): Promise<number> {
    return (await this.db.lancamentos.add(l)) as number;
  }

  // Credencial (PIN)
  buscarCredencial(): Promise<CredencialPin | undefined> {
    return this.db.config.get('pin');
  }
  salvarCredencial(c: CredencialPin): Promise<string> {
    return this.db.config.put(c);
  }

  // Cópia de segurança (sem PIN nem hash)
  async exportarDados(): Promise<{
    produtos: Produto[];
    clientes: Cliente[];
    lancamentos: LancamentoFiado[];
    saidas: SaidaProduto[];
  }> {
    return {
      produtos: await this.db.produtos.toArray(),
      clientes: await this.db.clientes.toArray(),
      lancamentos: await this.db.lancamentos.toArray(),
      saidas: await this.db.saidas.toArray(),
    };
  }
}
