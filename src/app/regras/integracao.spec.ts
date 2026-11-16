import { IDBKeyRange, indexedDB } from 'fake-indexeddb';
import { TestBed } from '@angular/core/testing';
import { MercadinhoDb } from '../data/db';
import { Repositorio } from '../data/repositorio';
import { AuthService } from './auth.service';
import { EstoqueService } from './estoque.service';
import { FiadoService } from './fiado.service';

let contador = 0;

async function preparar() {
  TestBed.configureTestingModule({});
  const repo = TestBed.inject(Repositorio);
  repo.usarBanco(new MercadinhoDb(`teste-${++contador}`, { indexedDB, IDBKeyRange }));
  return {
    repo,
    estoque: TestBed.inject(EstoqueService),
    fiado: TestBed.inject(FiadoService),
    auth: TestBed.inject(AuthService),
  };
}

describe('Estoque (integração com o banco)', () => {
  it('cadastra produto e recusa nome repetido', async () => {
    const { estoque } = await preparar();
    expect((await estoque.cadastrarProduto({ nome: 'Arroz 5 kg', quantidade: 10, estoque_minimo: 5 })).ok).toBe(true);
    const r = await estoque.cadastrarProduto({ nome: 'Arroz 5 kg', quantidade: 1, estoque_minimo: 1 });
    expect(r.ok).toBe(false);
    expect(r.erro).toContain('Já existe');
    expect((await estoque.listarProdutos()).length).toBe(1);
  });

  it('não grava produto inválido', async () => {
    const { estoque } = await preparar();
    const r = await estoque.cadastrarProduto({ nome: 'Leite', quantidade: -3, estoque_minimo: 1 });
    expect(r.ok).toBe(false);
    expect((await estoque.listarProdutos()).length).toBe(0);
  });

  it('saída baixa o estoque e recusa quantidade acima do disponível', async () => {
    const { estoque } = await preparar();
    const { id } = await estoque.cadastrarProduto({ nome: 'Óleo', quantidade: 5, estoque_minimo: 2 });
    expect((await estoque.registrarSaida(id as number, 2)).ok).toBe(true);
    expect((await estoque.listarProdutos())[0].quantidade).toBe(3);
    const r = await estoque.registrarSaida(id as number, 4);
    expect(r.ok).toBe(false);
    expect((await estoque.listarProdutos())[0].quantidade).toBe(3);
    expect((await estoque.registrarSaida(id as number, 0)).ok).toBe(false);
  });

  it('gera aviso de estoque baixo depois da saída', async () => {
    const { estoque } = await preparar();
    const { id } = await estoque.cadastrarProduto({ nome: 'Feijão', quantidade: 4, estoque_minimo: 3 });
    expect(await estoque.avisos()).toEqual([]);
    await estoque.registrarSaida(id as number, 2);
    expect((await estoque.avisos())[0].tipo).toBe('estoque_baixo');
  });

  it('lista os mais vendidos em ordem', async () => {
    const { estoque } = await preparar();
    const a = (await estoque.cadastrarProduto({ nome: 'A', quantidade: 50, estoque_minimo: 1 })).id as number;
    const b = (await estoque.cadastrarProduto({ nome: 'B', quantidade: 50, estoque_minimo: 1 })).id as number;
    await estoque.registrarSaida(a, 3);
    await estoque.registrarSaida(b, 7);
    await estoque.registrarSaida(a, 2);
    const lista = await estoque.maisVendidos(new Date(Date.now() - 86_400_000), new Date(Date.now() + 86_400_000));
    expect(lista.map((x) => [x.produto.nome, x.total])).toEqual([['B', 7], ['A', 5]]);
  });
});

describe('Fiado (integração com o banco)', () => {
  it('registra compra e pagamento e calcula o saldo', async () => {
    const { fiado } = await preparar();
    const { id } = await fiado.cadastrarCliente({ nome: 'Ana S.' });
    const r1 = await fiado.registrar(id as number, 'compra', 50);
    expect(r1.saldo).toBe(50);
    const r2 = await fiado.registrar(id as number, 'pagamento', 20);
    expect(r2.saldo).toBe(30);
    expect(await fiado.saldo(id as number)).toBe(30);
    expect((await fiado.historico(id as number)).length).toBe(2);
  });

  it('recusa valor zero, negativo e cliente inexistente, sem gravar', async () => {
    const { fiado, repo } = await preparar();
    const { id } = await fiado.cadastrarCliente({ nome: 'João P.' });
    expect((await fiado.registrar(id as number, 'compra', 0)).erro).toBe('Informe um valor maior que zero.');
    expect((await fiado.registrar(id as number, 'compra', -5)).ok).toBe(false);
    expect((await fiado.registrar(999, 'compra', 10)).ok).toBe(false);
    expect((await repo.listarLancamentos()).length).toBe(0);
  });

  it('cliente inativo some da lista mas o histórico continua', async () => {
    const { fiado } = await preparar();
    const { id } = await fiado.cadastrarCliente({ nome: 'Maria' });
    await fiado.registrar(id as number, 'compra', 10);
    await fiado.inativarCliente(id as number);
    expect(await fiado.listarClientesAtivos()).toEqual([]);
    expect(await fiado.saldo(id as number)).toBe(10);
    expect((await fiado.registrar(id as number, 'compra', 5)).ok).toBe(false);
  });

  it('guarda texto com símbolos de ataque só se for recusado', async () => {
    const { fiado } = await preparar();
    expect((await fiado.cadastrarCliente({ nome: '<script>alert(1)</script>' })).ok).toBe(false);
    const { id } = await fiado.cadastrarCliente({ nome: "'; DROP TABLE--" });
    expect(id).toBeDefined();
  });
});

describe('PIN (integração com o banco)', () => {
  it('guarda só salt e hash, nunca o PIN, e valida login certo e errado', async () => {
    const { auth, repo } = await preparar();
    auth.iteracoes = 1000;
    expect((await auth.criarPin('123456')).ok).toBe(true);
    const cred = await repo.buscarCredencial();
    expect(JSON.stringify(cred)).not.toContain('123456');
    expect(cred?.hash.length).toBeGreaterThan(20);
    auth.sair();
    expect(auth.autenticado()).toBe(false);
    expect((await auth.entrar('000000')).ok).toBe(false);
    expect(auth.autenticado()).toBe(false);
    expect((await auth.entrar('123456')).ok).toBe(true);
    expect(auth.autenticado()).toBe(true);
    auth.sair();
  });

  it('trava depois de 5 erros e usa a mesma mensagem para PIN fora do formato', async () => {
    const { auth } = await preparar();
    auth.iteracoes = 1000;
    await auth.criarPin('123456');
    auth.sair();
    const t = Date.now();
    const r0 = await auth.entrar('abc', t);
    expect(r0.erro).toBe('PIN incorreto.');
    for (let i = 0; i < 4; i++) await auth.entrar('000000', t);
    const bloqueado = await auth.entrar('123456', t + 1000);
    expect(bloqueado.ok).toBe(false);
    expect(bloqueado.esperaMs).toBeGreaterThan(0);
    const livre = await auth.entrar('123456', t + 31_000);
    expect(livre.ok).toBe(true);
    auth.sair();
  });

  it('o PIN só pode ser criado uma vez', async () => {
    const { auth } = await preparar();
    auth.iteracoes = 1000;
    await auth.criarPin('123456');
    auth.sair();
    expect((await auth.criarPin('654321')).ok).toBe(false);
  });
});
