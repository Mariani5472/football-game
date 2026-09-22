# football-game

Competition Engine TypeScript para competições configuradas por dados.

## Desenvolvimento

```powershell
npm install
npm run build
npm test
```

`game.mysql` é o seed MySQL autocontido e editável do primeiro cenário: Série A 2026, com 20 participantes, 38 rodadas e 380 partidas. `brasileirao.mysql` foi preservado sem alterações.

O ponto de entrada público é `src/index.ts`. Monte `CompetitionEngine` com implementações dos contratos de repositório; os repositórios em memória atendem testes e os adaptadores em `src/infrastructure/mysql` atendem MySQL por meio de um executor SQL fornecido pela aplicação.
