export function generateSchulteTable(size: number = 5): number[][] {
  const numbers = Array.from({ length: size * size }, (_, i) => i + 1);
  for (let i = numbers.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [numbers[i], numbers[j]] = [numbers[j], numbers[i]];
  }
  
  const table: number[][] = [];
  for (let i = 0; i < size; i++) {
    table.push(numbers.slice(i * size, (i + 1) * size));
  }
  return table;
}

export function findNumberPosition(table: number[][], target: number): [number, number] | null {
  for (let i = 0; i < table.length; i++) {
    for (let j = 0; j < table[i].length; j++) {
      if (table[i][j] === target) return [i, j];
    }
  }
  return null;
}
