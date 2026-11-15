import { Component, inject, OnInit, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../regras/auth.service';

@Component({
  selector: 'app-entrada',
  imports: [ReactiveFormsModule],
  template: `
    <main class="tela">
      <header class="topo">Mercadinho D´Nogueira<small>Controle de estoque e fiado</small></header>
      <form class="corpo" (submit)="$event.preventDefault(); enviar()">
        @if (carregando()) {
          <p class="dica">Abrindo…</p>
        } @else {
          <div>
            <label for="pin">{{ primeiroAcesso() ? 'Crie um PIN de 6 números' : 'PIN de 6 números' }}</label>
            <input id="pin" type="password" inputmode="numeric" autocomplete="off" maxlength="6"
                   [formControl]="pin" aria-describedby="pin-dica pin-erro" />
            <div class="dica" id="pin-dica">
              {{ primeiroAcesso() ? 'Guarde este PIN. Ele protege o fiado dos clientes.' : 'Digite o PIN para abrir o app.' }}
            </div>
            @if (erro()) { <div class="erro" id="pin-erro" role="alert">{{ erro() }}</div> }
          </div>
          <button class="btn" type="submit" [disabled]="espera()">{{ primeiroAcesso() ? 'Criar PIN' : 'Entrar' }}</button>
        }
      </form>
    </main>
  `,
})
export class EntradaComponent implements OnInit {
  private auth = inject(AuthService);
  private router = inject(Router);
  pin = new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.pattern(/^\d{6}$/)] });
  carregando = signal(true);
  primeiroAcesso = signal(false);
  erro = signal('');
  espera = signal(false);

  async ngOnInit() {
    this.primeiroAcesso.set(!(await this.auth.existePin()));
    this.carregando.set(false);
  }

  async enviar() {
    this.erro.set('');
    if (this.pin.invalid) {
      this.erro.set('O PIN deve ter 6 números.');
      return;
    }
    const r = this.primeiroAcesso() ? await this.auth.criarPin(this.pin.value) : await this.auth.entrar(this.pin.value);
    if (r.ok) {
      this.pin.reset('');
      await this.router.navigateByUrl('/menu');
      return;
    }
    this.erro.set(r.esperaMs ? `${r.erro} Tente de novo em ${Math.ceil(r.esperaMs / 1000)} segundos.` : (r.erro ?? 'Erro.'));
    this.pin.reset('');
    if (r.esperaMs) {
      this.espera.set(true);
      setTimeout(() => this.espera.set(false), r.esperaMs);
    }
  }
}
