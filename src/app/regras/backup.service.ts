import { Injectable, inject } from '@angular/core';
import { Repositorio } from '../data/repositorio';

export interface Backup {
  versao: 1;
  gerado_em: string;
  produtos: unknown[];
  clientes: unknown[];
  lancamentos: unknown[];
  saidas: unknown[];
}

/**
 * Cópia de segurança dos dados. Nunca inclui o PIN, o salt nem o hash:
 * o arquivo pode ser enviado por WhatsApp sem expor a credencial.
 */
@Injectable({ providedIn: 'root' })
export class BackupService {
  private repo = inject(Repositorio);

  async gerar(agora: Date = new Date()): Promise<Backup> {
    const d = await this.repo.exportarDados();
    return { versao: 1, gerado_em: agora.toISOString(), ...d };
  }

  nomeDoArquivo(agora: Date = new Date()): string {
    return `copia-mercadinho-${agora.toISOString().slice(0, 10)}.json`;
  }

  async baixar(agora: Date = new Date()): Promise<void> {
    const blob = new Blob([JSON.stringify(await this.gerar(agora), null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = this.nomeDoArquivo(agora);
    a.click();
    URL.revokeObjectURL(url);
  }
}
