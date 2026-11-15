import { Injectable, inject } from '@angular/core';
import { Repositorio } from '../data/repositorio';
import { Cliente, LancamentoFiado, TipoLancamento } from '../data/models';
import { ResultadoValidacao } from './estoque.service';

const TEM_MARCA_HTML = /[<>]/;

/** Saldo devedor = compras menos pagamentos, em centavos para evitar erro de arredondamento. */
export function calcularSaldo(lancamentos: Pick<LancamentoFiado, 'tipo' | 'valor'>[]): number {
  const centavos = lancamentos.reduce((soma, l) => {
    const c = Math.round(l.valor * 100);
    return l.tipo === 'compra' ? soma + c : soma - c;
  }, 0);
  return centavos / 100;
}

export function validarCliente(c: Partial<Cliente>): ResultadoValidacao {
  const nome = (c.nome ?? '').trim();
  if (!nome) return { ok: false, erro: 'Informe o nome do cliente.' };
  if (nome.length > 60) return { ok: false, erro: 'O nome pode ter no máximo 60 letras.' };
  if (TEM_MARCA_HTML.test(nome) || TEM_MARCA_HTML.test(c.apelido ?? '')) {
    return { ok: false, erro: 'Não use os sinais < ou > nos nomes.' };
  }
  if ((c.apelido ?? '').length > 30) return { ok: false, erro: 'O apelido pode ter no máximo 30 letras.' };
  return { ok: true };
}

@Injectable({ providedIn: 'root' })
export class FiadoService {
  private repo = inject(Repositorio);

  async cadastrarCliente(c: { nome: string; apelido?: string }): Promise<ResultadoValidacao & { id?: number }> {
    const v = validarCliente(c);
    if (!v.ok) return v;
    const id = await this.repo.adicionarCliente({
      nome: c.nome.trim(),
      apelido: c.apelido?.trim() || undefined,
      ativo: true,
    });
    return { ok: true, id };
  }

  /** Cliente não é apagado, só marcado como inativo, para manter o histórico. */
  async inativarCliente(id: number): Promise<void> {
    await this.repo.atualizarCliente(id, { ativo: false });
  }

  async listarClientesAtivos(): Promise<Cliente[]> {
    return (await this.repo.listarClientes()).filter((c) => c.ativo);
  }

  async registrar(
    idCliente: number,
    tipo: TipoLancamento,
    valor: number,
    observacao?: string,
    agora: Date = new Date(),
  ): Promise<ResultadoValidacao & { saldo?: number }> {
    if (tipo !== 'compra' && tipo !== 'pagamento') return { ok: false, erro: 'Escolha compra ou pagamento.' };
    if (typeof valor !== 'number' || !Number.isFinite(valor) || valor <= 0) {
      return { ok: false, erro: 'Informe um valor maior que zero.' };
    }
    if (valor > 100_000) return { ok: false, erro: 'O valor é alto demais. Confira e digite de novo.' };
    if (observacao && (TEM_MARCA_HTML.test(observacao) || observacao.length > 100)) {
      return { ok: false, erro: 'A observação tem sinais não permitidos ou passa de 100 letras.' };
    }
    const cliente = await this.repo.buscarCliente(idCliente);
    if (!cliente || !cliente.ativo) return { ok: false, erro: 'Escolha um cliente da lista.' };
    await this.repo.adicionarLancamento({
      id_cliente: idCliente,
      tipo,
      valor: Math.round(valor * 100) / 100,
      data: agora.toISOString(),
      observacao: observacao?.trim() || undefined,
    });
    return { ok: true, saldo: await this.saldo(idCliente) };
  }

  async saldo(idCliente: number): Promise<number> {
    return calcularSaldo(await this.repo.listarLancamentos(idCliente));
  }

  async historico(idCliente: number): Promise<LancamentoFiado[]> {
    return (await this.repo.listarLancamentos(idCliente)).sort((a, b) => b.data.localeCompare(a.data));
  }
}
