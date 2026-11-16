import { calcularAvisos, dataValida, diasAteVencer, validarProduto } from './estoque.service';
import { Produto } from '../data/models';

const hoje = new Date(2026, 10, 15); // 15/11/2026

const prod = (p: Partial<Produto>): Produto => ({ nome: 'Item', quantidade: 10, estoque_minimo: 2, ...p });

describe('Regras de estoque (unitários)', () => {
  it('calcula dias até vencer', () => {
    expect(diasAteVencer('2026-11-18', hoje)).toBe(3);
    expect(diasAteVencer('2026-11-15', hoje)).toBe(0);
    expect(diasAteVencer('2026-11-14', hoje)).toBe(-1);
  });

  it('valida datas', () => {
    expect(dataValida('2026-02-28')).toBe(true);
    expect(dataValida('2026-02-30')).toBe(false);
    expect(dataValida('15/11/2026')).toBe(false);
  });

  it('avisa estoque baixo quando quantidade <= mínimo', () => {
    const a = calcularAvisos([prod({ nome: 'Arroz', quantidade: 2, estoque_minimo: 5 })], hoje);
    expect(a.map((x) => x.tipo)).toEqual(['estoque_baixo']);
  });

  it('não avisa estoque se quantidade > mínimo', () => {
    expect(calcularAvisos([prod({ quantidade: 6, estoque_minimo: 5 })], hoje)).toEqual([]);
  });

  it('avisa vencimento em até 7 dias e marca urgente até 3 dias', () => {
    const a = calcularAvisos(
      [prod({ nome: 'Leite', data_validade: '2026-11-18' }), prod({ nome: 'Biscoito', data_validade: '2026-11-22' })],
      hoje,
    );
    expect(a[0].titulo).toBe('URGENTE: vence em 3 dias');
    expect(a[1].titulo).toBe('Atenção: vence em 7 dias');
  });

  it('não avisa validade com mais de 7 dias nem produto sem validade', () => {
    expect(calcularAvisos([prod({ data_validade: '2026-11-23' }), prod({ nome: 'Sal' })], hoje)).toEqual([]);
  });

  it('marca produto já vencido e o põe primeiro', () => {
    const a = calcularAvisos(
      [prod({ nome: 'Arroz', quantidade: 1, estoque_minimo: 5 }), prod({ nome: 'Iogurte', data_validade: '2026-11-10' })],
      hoje,
    );
    expect(a[0].tipo).toBe('vencido');
    expect(a[1].tipo).toBe('estoque_baixo');
  });

  it('valida produto: nome, quantidade e data', () => {
    expect(validarProduto(prod({ nome: '  ' })).ok).toBe(false);
    expect(validarProduto(prod({ quantidade: -1 })).ok).toBe(false);
    expect(validarProduto(prod({ quantidade: 1.5 })).ok).toBe(false);
    expect(validarProduto(prod({ data_validade: '2026-13-01' })).ok).toBe(false);
    expect(validarProduto(prod({ nome: '<script>alert(1)</script>' })).ok).toBe(false);
    expect(validarProduto(prod({})).ok).toBe(true);
  });
});
