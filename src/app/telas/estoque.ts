import { Component, inject, OnInit, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Produto } from '../data/models';
import { EstoqueService } from '../regras/estoque.service';

@Component({
  selector: 'app-estoque',
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <main class="tela">
      <header class="topo"><a class="voltar" routerLink="/menu" aria-label="Voltar ao menu">‹ Voltar</a>Cadastrar produto</header>
      <div class="corpo">
        <form [formGroup]="form" (ngSubmit)="salvar()" aria-label="Cadastrar produto">
          <div><label for="nome">Nome do produto</label><input id="nome" type="text" maxlength="80" formControlName="nome" /></div>
          <div class="linha" style="margin-top:12px">
            <div><label for="qtd">Quantidade</label><input id="qtd" type="number" inputmode="numeric" formControlName="quantidade" /></div>
            <div><label for="min">Estoque mínimo</label><input id="min" type="number" inputmode="numeric" formControlName="minimo" /></div>
          </div>
          <div style="margin-top:12px"><label for="val">Validade (opcional)</label><input id="val" type="date" formControlName="validade" /></div>
          <div aria-live="polite">
            @if (erro()) { <div class="erro" role="alert">{{ erro() }}</div> }
            @if (ok()) { <div class="sucesso">{{ ok() }}</div> }
          </div>
          <button class="btn" type="submit" style="margin-top:12px">Salvar produto</button>
        </form>

        <section aria-labelledby="t-lista">
          <span class="rotulo" id="t-lista">Produtos cadastrados ({{ produtos().length }})</span>
          <ul class="lista">
            @for (p of produtos(); track p.id_produto) {
              <li>{{ p.nome }}<small>{{ p.quantidade }} un · mínimo {{ p.estoque_minimo }}{{ p.data_validade ? ' · validade ' + p.data_validade : '' }}</small></li>
            }
          </ul>
        </section>
      </div>
    </main>
  `,
})
export class EstoqueComponent implements OnInit {
  private estoque = inject(EstoqueService);
  produtos = signal<Produto[]>([]);
  erro = signal('');
  ok = signal('');
  form = new FormGroup({
    nome: new FormControl('', { nonNullable: true }),
    quantidade: new FormControl<number | null>(null),
    minimo: new FormControl<number | null>(null),
    validade: new FormControl('', { nonNullable: true }),
  });

  async ngOnInit() {
    await this.carregar();
  }

  private async carregar() {
    this.produtos.set(await this.estoque.listarProdutos());
  }

  async salvar() {
    this.erro.set('');
    this.ok.set('');
    const v = this.form.getRawValue();
    const r = await this.estoque.cadastrarProduto({
      nome: v.nome,
      quantidade: Number(v.quantidade),
      estoque_minimo: Number(v.minimo),
      data_validade: v.validade || undefined,
    });
    if (!r.ok) {
      this.erro.set(r.erro ?? 'Erro.');
      return;
    }
    this.ok.set('Produto salvo.');
    this.form.reset({ nome: '', quantidade: null, minimo: null, validade: '' });
    await this.carregar();
  }
}
