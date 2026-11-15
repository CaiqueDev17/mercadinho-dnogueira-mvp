import { Injectable, inject, signal } from '@angular/core';
import { Repositorio } from '../data/repositorio';

/** Iterações do PBKDF2-SHA-256. Confirmar o valor na recomendação atual do OWASP. */
export const ITERACOES_PBKDF2 = 600_000;
export const TEMPO_INATIVIDADE_MS = 5 * 60 * 1000;
export const ERROS_ANTES_DE_ESPERAR = 5;
export const ESPERA_BASE_MS = 30_000;

export function pinValido(pin: string): boolean {
  return /^\d{6}$/.test(pin);
}

function paraBase64(bytes: Uint8Array): string {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}

function deBase64(texto: string): Uint8Array<ArrayBuffer> {
  const s = atob(texto);
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
}

/** PBKDF2 com SHA-256 pela Web Crypto API. Hash é de ida: não dá para recuperar o PIN. */
export async function gerarHash(pin: string, salt: Uint8Array<ArrayBuffer>, iteracoes: number): Promise<string> {
  const chave = await crypto.subtle.importKey('raw', new TextEncoder().encode(pin), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: iteracoes }, chave, 256);
  return paraBase64(new Uint8Array(bits));
}

export function comparacaoConstante(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

/** Quanto tempo esperar depois de N erros seguidos. Dobra a cada nova falha após o limite. */
export function esperaAposErros(erros: number): number {
  if (erros < ERROS_ANTES_DE_ESPERAR) return 0;
  return ESPERA_BASE_MS * 2 ** (erros - ERROS_ANTES_DE_ESPERAR);
}

export interface ResultadoLogin {
  ok: boolean;
  erro?: string;
  esperaMs?: number;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private repo = inject(Repositorio);
  /** Sessão só na memória do app, nunca no armazenamento do navegador. */
  readonly autenticado = signal(false);
  private erros = 0;
  private bloqueadoAte = 0;
  private temporizador?: ReturnType<typeof setTimeout>;
  /** Iterações usadas ao criar um PIN novo. Os testes podem baixar este valor. */
  iteracoes = ITERACOES_PBKDF2;

  async existePin(): Promise<boolean> {
    return !!(await this.repo.buscarCredencial());
  }

  async criarPin(pin: string): Promise<ResultadoLogin> {
    if (!pinValido(pin)) return { ok: false, erro: 'O PIN deve ter 6 números.' };
    if (await this.existePin()) return { ok: false, erro: 'O PIN já foi criado.' };
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const hash = await gerarHash(pin, salt, this.iteracoes);
    await this.repo.salvarCredencial({ chave: 'pin', salt: paraBase64(salt), hash, iteracoes: this.iteracoes });
    this.autenticado.set(true);
    this.reiniciarInatividade();
    return { ok: true };
  }

  async entrar(pin: string, agora: number = Date.now()): Promise<ResultadoLogin> {
    if (agora < this.bloqueadoAte) {
      return { ok: false, erro: 'Muitas tentativas. Aguarde um pouco.', esperaMs: this.bloqueadoAte - agora };
    }
    const cred = await this.repo.buscarCredencial();
    if (!cred) return { ok: false, erro: 'Crie um PIN primeiro.' };
    // Mensagem igual para PIN fora do formato e para PIN errado: não revela qual é o problema.
    const hash = pinValido(pin) ? await gerarHash(pin, deBase64(cred.salt), cred.iteracoes) : '';
    if (pinValido(pin) && comparacaoConstante(hash, cred.hash)) {
      this.erros = 0;
      this.bloqueadoAte = 0;
      this.autenticado.set(true);
      this.reiniciarInatividade();
      return { ok: true };
    }
    this.erros++;
    const espera = esperaAposErros(this.erros);
    if (espera > 0) this.bloqueadoAte = agora + espera;
    return { ok: false, erro: 'PIN incorreto.', esperaMs: espera || undefined };
  }

  sair(): void {
    this.autenticado.set(false);
    if (this.temporizador) clearTimeout(this.temporizador);
  }

  /** Chamado a cada toque na tela: reinicia o relógio de bloqueio por inatividade. */
  reiniciarInatividade(): void {
    if (this.temporizador) clearTimeout(this.temporizador);
    if (!this.autenticado()) return;
    this.temporizador = setTimeout(() => this.sair(), TEMPO_INATIVIDADE_MS);
  }
}
