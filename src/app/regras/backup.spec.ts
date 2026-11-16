import { IDBKeyRange, indexedDB } from 'fake-indexeddb';
import { TestBed } from '@angular/core/testing';
import { MercadinhoDb } from '../data/db';
import { Repositorio } from '../data/repositorio';
import { AuthService } from './auth.service';
import { BackupService } from './backup.service';
import { EstoqueService } from './estoque.service';
import { FiadoService } from './fiado.service';

describe('Cópia de segurança (integração)', () => {
  it('inclui produtos e fiado, mas nunca o PIN, o salt ou o hash', async () => {
    TestBed.configureTestingModule({});
    TestBed.inject(Repositorio).usarBanco(new MercadinhoDb('teste-backup', { indexedDB, IDBKeyRange }));
    const auth = TestBed.inject(AuthService);
    auth.iteracoes = 1000;
    await auth.criarPin('123456');
    auth.sair();
    await TestBed.inject(EstoqueService).cadastrarProduto({ nome: 'Arroz', quantidade: 5, estoque_minimo: 2 });
    const fiado = TestBed.inject(FiadoService);
    const { id } = await fiado.cadastrarCliente({ nome: 'Ana S.' });
    await fiado.registrar(id as number, 'compra', 40);

    const backup = TestBed.inject(BackupService);
    const dados = await backup.gerar(new Date('2026-11-15T12:00:00Z'));
    const texto = JSON.stringify(dados);

    expect(dados.produtos.length).toBe(1);
    expect(dados.lancamentos.length).toBe(1);
    expect(texto).not.toContain('123456');
    expect(texto).not.toContain('"salt"');
    expect(texto).not.toContain('"hash"');
    expect(backup.nomeDoArquivo(new Date('2026-11-15T12:00:00Z'))).toBe('copia-mercadinho-2026-11-15.json');
  });
});
