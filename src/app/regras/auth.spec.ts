import { comparacaoConstante, esperaAposErros, gerarHash, pinValido } from './auth.service';

describe('Regras de PIN (unitários)', () => {
  it('aceita só 6 números', () => {
    expect(pinValido('123456')).toBe(true);
    expect(pinValido('12345')).toBe(false);
    expect(pinValido('12345a')).toBe(false);
    expect(pinValido('1234567')).toBe(false);
  });

  it('PBKDF2 é determinístico com o mesmo salt e muda com outro salt', async () => {
    const s1 = new Uint8Array(16).fill(1);
    const s2 = new Uint8Array(16).fill(2);
    const a = await gerarHash('123456', s1, 1000);
    expect(await gerarHash('123456', s1, 1000)).toBe(a);
    expect(await gerarHash('123456', s2, 1000)).not.toBe(a);
    expect(a).not.toContain('123456');
  });

  it('comparação em tempo constante', () => {
    expect(comparacaoConstante('abc', 'abc')).toBe(true);
    expect(comparacaoConstante('abc', 'abd')).toBe(false);
    expect(comparacaoConstante('abc', 'ab')).toBe(false);
  });

  it('espera só depois de 5 erros e cresce a cada falha', () => {
    expect(esperaAposErros(4)).toBe(0);
    expect(esperaAposErros(5)).toBe(30_000);
    expect(esperaAposErros(6)).toBe(60_000);
  });
});
