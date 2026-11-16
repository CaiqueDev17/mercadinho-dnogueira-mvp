import { calcularSaldo, validarCliente } from './fiado.service';

describe('Regras de fiado (unitários)', () => {
  it('saldo = compras menos pagamentos', () => {
    expect(
      calcularSaldo([
        { tipo: 'compra', valor: 50 },
        { tipo: 'pagamento', valor: 20 },
      ]),
    ).toBe(30);
  });

  it('não acumula erro de arredondamento', () => {
    expect(
      calcularSaldo([
        { tipo: 'compra', valor: 0.1 },
        { tipo: 'compra', valor: 0.2 },
      ]),
    ).toBe(0.3);
  });

  it('saldo vazio é zero', () => {
    expect(calcularSaldo([])).toBe(0);
  });

  it('valida cliente: nome obrigatório e sem sinais < >', () => {
    expect(validarCliente({ nome: '' }).ok).toBe(false);
    expect(validarCliente({ nome: 'Ana <b>' }).ok).toBe(false);
    expect(validarCliente({ nome: 'Ana', apelido: 'x'.repeat(31) }).ok).toBe(false);
    expect(validarCliente({ nome: 'Ana', apelido: 'Aninha' }).ok).toBe(true);
  });
});
