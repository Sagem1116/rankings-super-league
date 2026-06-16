## Contexto

A app "Remix of Import Guardian" tem uma arquitetura **muito diferente** desta:

| | Esta app (FMDataLab) | Guardian |
|---|---|---|
| Storage | Zustand em memória | Supabase (cloud DB) |
| Formato Excel | 5 folhas: Ranking, Equipas_Pais, Treinadores, Jogadores, Pesos_Fixos | 7+ folhas: Ligas Nacionais, Marcadores, Assistentes, Melhor Jogador, **Compts Continentais**, **Compts Seleções**, Treinadores |
| Modelo de dados | Ranking por divisão + treinador por clube por época | competitions / competition_results / honours / manager_history |
| Conceito "competição" | Implícito (divisão da liga) | Explícito (competition_id com tipo: league / continental / international) |

Não dá para fazer "merge" puro. O que faz sentido é **trazer o modelo de honras/competições da Guardian para esta app**, mantendo a base atual (Zustand, sem Supabase).

## Plano

### 1. Novo conceito: "Super League" (e outras competições extra)

Adicionar uma **folha opcional** ao parser de Excel atual chamada `Super_League` (e, no futuro, `Taca`, `Continental`, etc.) com este formato:

```
Epoca | Equipa | Treinador | Pos | Inf
2024  | Benfica | J. Mourinho | 1 | C
2024  | Porto   | Conceição   | 2 |
```

- Validador (`validate-import.ts`) deteta a folha se existir, valida colunas; ausência ≠ erro (folha opcional).
- Engine guarda em `NormSeason.superLeague: Array<{Equipa, Treinador, Pos, Inf}>`.

Em alternativa, o utilizador pode fazer **upload de um ficheiro dedicado** (`SuperLeague_2024.xlsx`) com 1 só folha `Posicoes`; o `upload-panel` deteta-o por nome/cabeçalhos.

### 2. Perfil do treinador — secção "Conquistas Nacionais e Super League"

Em `perfil.treinador.$nome.tsx` adicionar:

- **Banner extra** com 3 contadores:
  - Vencedor Super League (Inf=C na superLeague)
  - Finalista Super League (Pos=2)
  - Pódio Super League (Pos≤3)
- **Tabela "Conquistas Nacionais"** (já existe via `passagens` — apenas formatá-la como lista de troféus filtrando Inf=C agrupado por época)
- **Tabela "Passagens na Super League"** com época, clube, posição, Inf
- O `buildCoachProfile` em `profiles.ts` passa a aceitar e devolver `superLeague: Array<{epoca, clube, pos, inf}>` e marcadores `campeaoSL[]`, `finalistaSL[]`, `podioSL[]`.

### 3. Trazer páginas da Guardian (versão adaptada)

Criar versões adaptadas, **a ler do Zustand store** (não Supabase):

- `/competicoes` — lista competições (Liga 1, Liga 2, …, Super League) com nº de edições e campeão atual.
- `/competicoes/$id` — histórico de campeões + tabela atual.
- `/hall-of-fame` — top treinadores por troféus totais (Ligas + Super League), top clubes por títulos.
- `/timeline` — feed cronológico por época (campeões de cada competição + promovidos + despromovidos).

Não vou trazer `/rivalries` (a app já tem `/h2h` que faz isso) nem `/seasons` (já há a página inicial e dashboards por época).

### 4. Sidebar e registo de páginas

- Adicionar nova categoria `"Competições"` ao `PageCategory` em `types.ts`.
- Registar as novas páginas em `page-registry.ts`.
- Atualizar `sidebar.tsx` para mostrar a categoria.

### 5. Testes

Acrescentar testes em `engine.test.ts`:
- `buildCoachProfile` agrega corretamente troféus de Super League quando a folha está presente.
- Ausência da folha não quebra perfis existentes.

## Detalhes técnicos

**Ficheiros a editar:**
- `src/lib/types.ts` — adicionar `superLeague?` em `RawSheets`/`SeasonData`, nova `PageCategory "Competições"`.
- `src/lib/parse-excel.ts` — parser opcional da folha `Super_League`.
- `src/lib/validate-import.ts` — validação opcional.
- `src/lib/calc/engine.ts` — `NormSeason.superLeague`, agregação para `computeAll` (tabela `Super_League_Campeoes`, `Super_League_Treinadores`).
- `src/lib/profiles.ts` — `buildCoachProfile` devolve marcadores SL; novo `buildCompetitionProfile`.
- `src/routes/perfil.treinador.$nome.tsx` — secções novas.
- `src/lib/page-registry.ts` — registar páginas.
- `src/components/sidebar.tsx` — nova categoria.
- `src/routes/competicoes.index.tsx`, `competicoes.$id.tsx`, `hall-of-fame.tsx`, `timeline.tsx` — novas rotas (a ler do store).
- `src/components/upload-panel.tsx` — aceitar ficheiro dedicado Super League e mostrar no relatório.
- `src/lib/calc/engine.test.ts` — testes novos.

**Não toco em:** Supabase (esta app continua sem backend), `comparador.clubes.tsx`, `dominio.tsx`, `mapa-mundo.tsx`, `scouting.tsx`.

## Perguntas para confirmares antes de avançar

1. **Formato do ficheiro Super League** — folha extra no Excel principal, ou ficheiro dedicado? Podes colar a estrutura/cabeçalhos do teu ficheiro real para garantir que o parser bate certo.
2. **Quais páginas da Guardian queres mesmo trazer?** Lista: Competições, Hall of Fame, Timeline. Queres também `/players` enriquecido (Marcadores/Assistentes/MVP por competição)? A Guardian tinha isso.
3. **Continental / Seleções** — a Guardian importa também competições continentais e de seleções. Queres já incluir, ou ficar só pela "Super League" para já?