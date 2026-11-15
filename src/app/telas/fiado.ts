import { Component, inject, OnInit, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Cliente, TipoLancamento } from '../data/models';
import { FiadoService } from '../regras/fiado.service';

@Component({
  selector: 'app-fiado',
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <main class="tela">
      <header class="topo"><a class="voltar" routerLink="/menu" aria-label="Voltar ao menu">‹ Voltar</a>Registrar fiado</header>
      <div class="corpo">
        <section aria-labelledby="t-novo">
          <span class="rotulo" id="t-novo">Novo cliente</span>
          <div class="linha">
            <div><label for="nome-cli">Nome</label><input id="nome-cli" type="text" maxlength="60" [formControl]="novoNome" /></div>
            <div><label for="ap-cli">Apelido (opcional)</label><input id="ap-cli" type="text" maxlength="30" [formControl]="novoApelido" /></div>
          </div>
          <button class="btn sec" type="button" style="margin-top:8px" (click)="adicionarCliente()">Adicionar cliente</button>
          @if (erroCliente()) { <div class="erro" role="alert">{{ erroCliente() }}</div> }
        </section>

        <form [formGroup]="form" (ngSubmit)="salvar()" aria-label="Registrar fiado">
          <div>
            <label for="cliente">Cliente</label>
            <select id="cliente" formControlName="cliente">
              <option [ngValue]="null">Escolha o cliente</option>
              @for (c of clientes(); track c.id_cliente) {
                <option [ngValue]="c.id_cliente">{{ c.nome }}{{ c.apelido ? ' (' + c.apelido + ')' : '' }}</option>
              }
            </select>
          </div>
          <div style="margin-top:12px">
            <span class="rotulo">Tipo</span>
            <label class="opcao"><input type="radio" formControlName="tipo" value="compra" /> Compra a prazo</label>
            <label class="opcao"><input type="radio" formControlName="tipo" value="pagamento" /> Pagamento</label>
          </div>
          <div>
            <label for="valor">Valor (R$)</label>
            <input id="valor" type="number" inputmode="decimal" step="0.01" formControlName="valor" aria-describedby="msg" />
            <div id="msg" aria-live="polite">
              @if (erro()) { <div class="erro" role="alert">{{ erro() }}</div> }
              @if (ok()) { <div class="sucesso">{{ ok() }}</div> }
            </div>
          </div>
          <button class="btn" type="submit" style="margin-top:12px">Salvar</button>
        </form>

        @if (saldoTexto()) {
          <div class="saldo" aria-live="polite">Saldo de {{ nomeSelecionado() }}<b>{{ saldoTexto() }}</b></div>
        }
      </div>
    </main>
  `,
})
export class FiadoComponent implements OnInit {
  private fiado = inject(FiadoService);
  clientes = signal<Cliente[]>([]);
  novoNome = new FormControl('', { nonNullable: true });
  novoApelido = new FormControl('', { nonNullable: true });
  form = new FormGroup({
    cliente: new FormControl<number | null>(null),
    tipo: new FormControl<TipoLancamento>('compra', { nonNullable: true }),
    valor: new FormControl<number | null>(null),
  });
  erro = signal('');
  ok = signal('');
  erroCliente = signal('');
  saldoTexto = signal('');
  nomeSelecionado = signal('');

  async ngOnInit() {
    await this.carregar();
    this.form.controls.cliente.valueChanges.subscribe(() => this.mostrarSaldo());
  }

  private async carregar() {
    this.clientes.set(await this.fiado.listarClientesAtivos());
  }

  async adicionarCliente() {
    this.erroCliente.set('');
    const r = await this.fiado.cadastrarCliente({ nome: this.novoNome.value, apelido: this.novoApelido.value });
    if (!r.ok) {
      this.erroCliente.set(r.erro ?? 'Erro.');
      return;
    }
    this.novoNome.reset('');
    this.novoApelido.reset('');
    await this.carregar();
    this.form.controls.cliente.setValue(r.id ?? null);
  }

  async mostrarSaldo() {
    const id = this.form.controls.cliente.value;
    if (id == null) {
      this.saldoTexto.set('');
      return;
    }
    const cli = this.clientes().find((c) => c.id_cliente === id);
    this.nomeSelecionado.set(cli?.nome ?? '');
    this.saldoTexto.set(this.formatar(await this.fiado.saldo(id)));
  }

  async salvar() {
    this.erro.set('');
    this.ok.set('');
    const { cliente, tipo, valor } = this.form.getRawValue();
    if (cliente == null) {
      this.erro.set('Escolha um cliente da lista.');
      return;
    }
    const r = await this.fiado.registrar(cliente, tipo, Number(valor));
    if (!r.ok) {
      this.erro.set(r.erro ?? 'Erro.');
      return;
    }
    this.ok.set('Fiado salvo.');
    this.form.controls.valor.reset(null);
    this.saldoTexto.set(this.formatar(r.saldo ?? 0));
  }

  private formatar(v: number): string {
    return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }
}
