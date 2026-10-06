/** Решение A·x = b методом Гаусса с выбором главного элемента. */
export function solve(A: number[][], b: number[]): number[] {
  const n = b.length;
  const M = A.map((r, i) => [...r, b[i]]);
  for (let c = 0; c < n; c++) {
    let p = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
    [M[c], M[p]] = [M[p], M[c]];
    const d = M[c][c] || 1e-12;
    for (let r = c + 1; r < n; r++) {
      const f = M[r][c] / d;
      if (f === 0) continue;
      for (let k = c; k <= n; k++) M[r][k] -= f * M[c][k];
    }
  }
  const x = new Array<number>(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    let s = M[i][n];
    for (let j = i + 1; j < n; j++) s -= M[i][j] * x[j];
    x[i] = s / (M[i][i] || 1e-12);
  }
  return x;
}

/** Ridge-регрессия. Первый столбец X — константа (не штрафуется). */
export function ridge(X: number[][], y: number[], lambda = 0): number[] {
  const p = X[0].length;
  const A = Array.from({ length: p }, () => new Array<number>(p).fill(0));
  const b = new Array<number>(p).fill(0);
  for (let i = 0; i < X.length; i++) {
    const row = X[i];
    for (let a = 0; a < p; a++) {
      b[a] += row[a] * y[i];
      for (let c = a; c < p; c++) A[a][c] += row[a] * row[c];
    }
  }
  for (let a = 0; a < p; a++) {
    for (let c = 0; c < a; c++) A[a][c] = A[c][a];
    if (a > 0) A[a][a] += lambda;
  }
  return solve(A, b);
}