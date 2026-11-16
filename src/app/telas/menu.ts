import { Component, inject, OnInit, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../regras/auth.service';
import { BackupService } from '../regras/backup.service';
import { EstoqueService } from '../regras/estoque.service';

@Component({
  selector: 'app-menu',
  imports: [RouterLink],
  template: `
    <main class="tela">
      <header class="topo">Mercadinho D´Nogueira<small>Controle de estoque e fiado</small></header>
      <nav class="corpo" aria-label="Menu principal">
        <div class="sucesso">Acesso liberado</div>
        <a class="btn entre" routerLink="/fiado"><span>Fiado</span><span aria-hidden="true">›</span></a>
        <a class="btn sec entre" routerLink="/avisos">
          <span>Estoque e avisos</span>
          <span class="badge" [attr.aria-label]="qtdAvisos() + ' avisos'">{{ qtdAvisos() }}</span>
        </a>
        <a class="btn sec entre" routerLink="/estoque"><span>Cadastrar produto</span><span aria-hidden="true">›</span></a>
        <button class="btn sec" type="button" (click)="copiar()">Salvar cópia dos dados</button>
        <button class="btn sec" type="button" (click)="sair()">Sair</button>
        <div class="trava">🔒 O app bloqueia após 5 minutos parado.</div>
      </nav>
    </main>
  `,
})
export class MenuComponent implements OnInit {
  private auth = inject(AuthService);
  private estoque = inject(EstoqueService);
  private router = inject(Router);
  private backup = inject(BackupService);
  qtdAvisos = signal(0);

  async ngOnInit() {
    this.qtdAvisos.set((await this.estoque.avisos()).length);
  }

  async copiar() {
    await this.backup.baixar();
  }

  sair() {
    this.auth.sair();
    this.router.navigateByUrl('/entrar');
  }
}
