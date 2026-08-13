# JESSY LEXI CROSS PUZZLE

> **Site moderno, inovador e responsivo de jogos de palavras.**

O **JESSY LEXI CROSS PUZZLE** foi desenvolvido com uma arquitetura modular moderna e escalável. O projeto inicia com o jogo de **Palavras Cruzadas**, preparado para receber novos modos no futuro, como **Caça-Palavras** e **Sudoku**.

---

## 🌟 Funcionalidades Principais

### 🧩 1. Gerador Automático de Palavras Cruzadas
- **Algoritmo Dinâmico Modular**: Seleciona palavras aleatórias do banco local (`words.json`) e constrói grades cruzadas com múltiplas interseções, verificações de colisões e bounding box ajustado.
- **Configuração de Partida**: Escolha o idioma (Português 🇧🇷, English 🇺🇸 ou Aleatório 🌎) e nível de dificuldade (Fácil, Médio, Difícil ou Aleatório).
- **Sem Repetição Excessiva (Cooldown)**: Sistema de histórico que prioriza palavras não utilizadas recentemente.

### 💡 2. Sistema de Dicas Limitado (4 Dicas por Partida)
- Revela a letra correta da célula selecionada.
- Desconta **-50 pontos** imediatamente por dica utilizada.
- Destaca visualmente as letras reveladas por dicas em tom dourado com ponto indicador.

### ⏱️ 3. Temporizador e Pontuação em Tempo Real
- O temporizador inicia na primeira interação do jogador com o jogo.
- Pontuação dinâmica com bônus por dificuldade de palavra (+100 fácil, +150 médio, +200 difícil) e bônus de velocidade ao concluir a cruzadinha.

### 💾 4. Salvamento Automático (localStorage)
- O estado completo da partida (grade, letras digitadas, letras reveladas, dicas, score, temporizador) é salvo automaticamente a cada digitação.
- Se o usuário fechar a aba ou recarregar a página, o modal de retomada é exibido ("Encontramos uma partida em andamento...").

### 🏆 5. Tela de Parabéns e Recordes Locais
- Modal de conclusão com resumo completo da partida (Pontuação final, Tempo, Palavras e Dicas utilizadas).
- Painel de estatísticas acumuladas: Maior pontuação, Melhor tempo, Partidas concluídas, Palavras resolvidas e Dicas utilizadas.

### 📱 6. Interface Moderna e Totalmente Responsiva
- **Design System Elegante**: Temas Escuro (padrão) e Claro com transições suaves, glassmorphism e cores vibrantes.
- **Navegação no Teclado**: Suporte a setas direcionais, Backspace, Enter e digitação contínua com auto-avanço de foco.
- **Teclado Virtual Onscreen para Dispositivos Móveis**: Teclado tátil integrado para telas de celulares e tablets.

---

## 📁 Arquitetura do Projeto

```text
JessyLexiCrossPuzzle/
│
├── index.html                  # Shell principal da aplicação e estrutura de modais
│
├── css/
│   ├── style.css               # Design System, variáveis CSS, temas e botões
│   ├── crossword.css           # Estilos da grade de palavras cruzadas e listas de pistas
│   └── responsive.css          # Regras responsivas para mobile/tablet e teclado virtual
│
├── js/
│   ├── app.js                  # Inicializador e roteador da interface
│   │
│   ├── crossword/
│   │   ├── CrosswordGenerator.js   # Orquestrador da geração da cruzadinha
│   │   ├── WordSelector.js         # Filtragem de palavras e sistema de cooldown
│   │   ├── GridBuilder.js          # Construção da matriz 2D e cálculo de interseções
│   │   ├── PlacementValidator.js   # Validação de limites e regras de colisão
│   │   ├── GridNumbering.js        # Numeração de células e divisão de pistas (Across/Down)
│   │   └── CrosswordGame.js        # Engine do jogo (temporizador, hints, pontuação, auto-save)
│   │
│   ├── data/
│   │   └── words.json              # Banco de palavras em JSON (PT/EN)
│   │
│   ├── storage/
│   │   └── LocalStorageManager.js  # Gerenciador de persistência local
│   │
│   ├── score/
│   │   └── ScoreManager.js         # Cálculo de pontuação e penalidades
│   │
│   └── utils/
│       └── helpers.js              # Normalização de texto, formatação de tempo e toasts
│
└── README.md
```

---

## 🚀 Como Executar o Projeto

O projeto é **100% estático**, composto por HTML, CSS e JavaScript ES6 Nativo. Não exige instalação de dependências no backend ou servidores Node.js.

### Opção 1: Servidor Local Simples
Como utiliza módulos ES6 (`import`/`export`) e arquivo JSON local, abra a pasta do projeto com qualquer servidor web estático local:

- **VS Code**: Use a extensão **Live Server**.
- **Python**:
  ```bash
  python -m http.server 8000
  ```
  Acesse `http://localhost:8000` no navegador.
- **Node.js (`npx http-server`)**:
  ```bash
  npx http-server .
  ```

### Opção 2: Publicação no GitHub Pages
1. Envie o repositório para o GitHub.
2. Vá em **Settings** > **Pages**.
3. Em **Source**, selecione a branch `main` e a pasta `/ (root)`.
4. Salve. O site estará online instantaneamente!

---

## ➕ Como Adicionar Novas Palavras em `words.json`

O banco de dados de palavras está localizado em `js/data/words.json`. Para adicionar novas palavras, inclua um objeto com a seguinte estrutura:

```json
{
  "id": 31,
  "word": "TECNOLOGIA",
  "language": "pt",
  "clue": "Conjunto de conhecimentos e técnicas aplicadas.",
  "description": "Aplicação prática da ciência para resolver problemas humanos.",
  "category": "tecnologia",
  "difficulty": "easy",
  "usage_count": 0,
  "tags": ["ciencia", "inovacao"],
  "source": "manual",
  "enabled": true,
  "date_added": "2026-08-12"
}
```

---

## 🔮 Expansões Futuras (Caça-Palavras e Sudoku)

A estrutura do projeto foi desenvolvida para expansão no Hub Principal:
- **Novos Jogos**: Basta adicionar os arquivos dentro de `js/wordsearch/` ou `js/sudoku/` utilizando o mesmo padrão do `LocalStorageManager` e `ScoreManager`.
- **Desafio Diário**: A arquitetura permite gerar sementes (seeds) diárias no `CrosswordGenerator` para que todos os jogadores recebam a mesma cruzadinha do dia.
