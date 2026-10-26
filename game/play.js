// Community tic-tac-toe for the profile README.
// Run by .github/workflows/tic-tac-toe.yml with ISSUE_TITLE / ISSUE_USER set.
// Run with no env to just re-render the board into README.md.

const fs = require('fs');
const path = require('path');

const STATE_FILE = path.join(__dirname, 'state.json');
const README = path.join(__dirname, '..', 'README.md');
const REPO = process.env.GITHUB_REPOSITORY || 'Osama-Alghoul/Osama-Alghoul';
const PROFILE = `https://github.com/${REPO.split('/')[0]}`;
const START = '<!-- TTT:START -->';
const END = '<!-- TTT:END -->';

const LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
];
const ICON = { X: '❌', O: '⭕' };

function freshBoard(stats) {
  return {
    board: Array(9).fill(''),
    turn: 'X',
    winner: null,
    moves: [],
    stats: stats || { X: 0, O: 0, draw: 0 },
  };
}

function loadState() {
  try {
    return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
  } catch {
    return freshBoard();
  }
}

function findWinner(board) {
  for (const [a, b, c] of LINES) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) return board[a];
  }
  return board.every(Boolean) ? 'draw' : null;
}

function issueLink(title, label) {
  const body = encodeURIComponent("Just click **Submit new issue**, no need to edit anything. A bot will play your move within a minute.");
  return `<a href="https://github.com/${REPO}/issues/new?title=${encodeURIComponent(title)}&body=${body}">${label}</a>`;
}

function render(state) {
  const rows = [0, 1, 2].map((r) => {
    const cells = [0, 1, 2].map((c) => {
      const i = r * 3 + c;
      const mark = state.board[i];
      const content = mark
        ? ICON[mark]
        : state.winner ? '⬛' : issueLink(`ttt|move|${i}`, '⬜');
      return `<td align="center" width="64" height="64"><h2>${content}</h2></td>`;
    });
    return `  <tr>${cells.join('')}</tr>`;
  });

  let status;
  if (state.winner === 'draw') status = `🤝 <b>It's a draw!</b> ${issueLink('ttt|new', '🔄 Start a new game')}`;
  else if (state.winner) status = `🏆 <b>${ICON[state.winner]} wins!</b> ${issueLink('ttt|new', '🔄 Start a new game')}`;
  else status = `It's <b>${ICON[state.turn]}</b>'s turn. Click an empty square to play!`;

  const recent = state.moves.slice(-5).reverse()
    .map((m) => `| ${ICON[m.mark]} | square ${m.cell + 1} | [@${m.user}](https://github.com/${m.user}) |`);
  const movesTable = recent.length
    ? ['', '| | Move | Player |', '|:-:|:-:|:-:|', ...recent].join('\n')
    : '';

  return [
    START,
    '<div align="center">',
    '',
    `<table>\n${rows.join('\n')}\n</table>`,
    '',
    `<p>${status}</p>`,
    `<sub>❌ wins: ${state.stats.X} · ⭕ wins: ${state.stats.O} · draws: ${state.stats.draw}</sub>`,
    movesTable,
    '',
    '</div>',
    END,
  ].join('\n');
}

function writeReadme(state) {
  const readme = fs.readFileSync(README, 'utf8');
  const s = readme.indexOf(START);
  const e = readme.indexOf(END);
  if (s === -1 || e === -1) throw new Error('README is missing the tic-tac-toe markers');
  fs.writeFileSync(README, readme.slice(0, s) + render(state) + readme.slice(e + END.length));
}

function play(state, title, user) {
  const match = /^ttt\|(?:move\|([0-8])|new)$/.exec(title.trim());
  if (!match) return { state, message: `🤔 I couldn't read that move. Head back to ${PROFILE} and click a square.` };

  if (match[1] === undefined) {
    if (!state.winner) return { state, message: `⏳ There's a game in progress, so jump in at ${PROFILE}!` };
    return { state: freshBoard(state.stats), changed: true, message: `🔄 New game started by @${user}! Make the first move at ${PROFILE}` };
  }

  const cell = Number(match[1]);
  if (state.winner) return { state, message: `🏁 That game is over. Start a new one at ${PROFILE}` };
  if (state.board[cell]) return { state, message: `🚫 Square ${cell + 1} is already taken. Pick another at ${PROFILE}` };

  const mark = state.turn;
  state.board[cell] = mark;
  state.moves.push({ mark, cell, user });
  state.winner = findWinner(state.board);
  state.turn = mark === 'X' ? 'O' : 'X';

  let message = `✅ Nice one @${user}! You played ${ICON[mark]} on square ${cell + 1}.`;
  if (state.winner === 'draw') { state.stats.draw++; message += ' The game ended in a **draw** 🤝'; }
  else if (state.winner) { state.stats[mark]++; message += ` **${ICON[mark]} wins!** 🏆`; }
  return { state, changed: true, message: `${message}\n\nSee the board: ${PROFILE}` };
}

const { ISSUE_TITLE, ISSUE_USER } = process.env;
let state = loadState();

if (ISSUE_TITLE) {
  const result = play(state, ISSUE_TITLE, ISSUE_USER || 'someone');
  state = result.state;
  if (result.changed) fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2) + '\n');
  process.stdout.write(result.message);
} else {
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2) + '\n');
}
writeReadme(state);
