import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Aviso, EstoqueService } from '../regras/estoque.service';

@Component({
  selector: 'app-avisos',
  imports: [RouterLink],
  template: `
    <main class="tela">
      <header class="topo"><a class="voltar" routerLink="/menu" aria-label="Voltar ao menu">‹ Voltar</a>Avisos ({{ avisos().length }})</header>
      <div class="corpo">
        @if (carregado() && avisos().length === 0) {
          <p class="sucesso">Nenhum aviso. Estoque e validades em dia.</p>
        }
        @for (a of avisos(); track $index) {
          <div class="aviso" [class.vermelho]="a.tipo !== 'vence_breve' || (a.dias ?? 9) <= 3" [class.amarelo]="a.tipo === 'vence_breve' && (a.dias ?? 0) > 3" role="group">
            <span class="ic" aria-hidden="true">{{ icone(a) }}</span>
            <div><b>{{ a.titulo }}</b><small>{{ a.detalhe }}</small></div>
          </div>
        }
        <a class="btn sec" routerLink="/estoque" style="margin-top:auto">Cadastrar produto</a>
      </div>
    </main>
  `,
})
export class AvisosComponent implements OnInit {
  private estoque = inject(EstoqueService);
  avisos = signal<Aviso[]>([]);
  carregado = signal(false);

  async ngOnInit() {
    this.avisos.set(await this.estoque.avisos());
    this.carregado.set(true);
  }

  icone(a: Aviso): string {
    if (a.tipo === 'vencido') return '⛔';
    if (a.tipo === 'estoque_baixo') return '⚠';
    return (a.dias ?? 9) <= 3 ? '⛔' : '🕒';
  }
}
