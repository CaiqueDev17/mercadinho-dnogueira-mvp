# Mercadinho D´Nogueira — MVP

MVP de controle de **estoque, validade e fiado** para o Mercadinho D´Nogueira (Camaçari-BA).
Projeto da disciplina de Projeto de Software, ligado ao **ODS 8 — Trabalho Decente e Crescimento Econômico**.

## O que o app faz

- Cadastra produtos com quantidade, estoque mínimo e validade.
- Avisa estoque baixo e vencimento próximo (até 7 dias) ou já vencido, com texto, símbolo e cor.
- Registra fiado por cliente (compra a prazo e pagamento) e mostra o saldo devedor.
- Funciona sem internet (PWA) e guarda os dados no próprio celular (IndexedDB, com Dexie).
- Protege o acesso com PIN de 6 números, guardado com hash PBKDF2-SHA-256 (nunca em texto limpo).

## Tecnologias

Angular · TypeScript · @angular/service-worker (PWA) · Dexie.js (IndexedDB) · Web Crypto API · Vitest.

## Arquitetura (monolítica em camadas)

| Camada | Pasta | Função |
|---|---|---|
| Apresentação | `src/app/telas` | Telas e botões |
| Regras de negócio | `src/app/regras` | Validações, avisos, saldo, PIN |
| Dados | `src/app/data` | Banco local e repositório |

## Como rodar

```bash
npm ci
npm start          # abre em http://localhost:4200
npm test           # testes unitários e de integração
npm run build      # build de produção, com service worker
```

Requisitos: Node.js 22 ou mais novo.

## Testes e CI

- **Unitários:** regras de estoque, vencimento, saldo do fiado e PIN.
- **Integração:** serviços com o banco IndexedDB (usa `fake-indexeddb` nos testes).
- **CI:** o GitHub Actions (`.github/workflows/ci.yml`) roda auditoria de dependências, testes com cobertura e build a cada push e Pull Request.

## Limitações conhecidas

- Os dados ficam só no celular e não sincronizam entre aparelhos.
- Um PIN de 6 números é fraco contra quem copiar os dados do aparelho. Use também o bloqueio de tela do celular.
- Cópia de segurança: exportar os dados (fora do escopo desta versão do protótipo de tela).

## Segurança

PIN com PBKDF2-SHA-256 e salt aleatório, espera crescente após 5 erros, bloqueio após 5 minutos parado, validação de todas as entradas na camada de regras, sem `innerHTML` e sem SQL.
