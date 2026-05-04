import { describe, it, expect } from 'vitest';
import { generateSchulteTable, findNumberPosition } from '../schulte';

describe('Schulte Table Logic', () => {
  describe('generateSchulteTable', () => {
    it('should generate 5x5 table by default', () => {
      const table = generateSchulteTable();
      expect(table.length).toBe(5);
      expect(table[0].length).toBe(5);
    });

    it('should generate custom size table', () => {
      const table = generateSchulteTable(3);
      expect(table.length).toBe(3);
      expect(table[0].length).toBe(3);
    });

    it('should contain all numbers from 1 to N', () => {
      const size = 4;
      const table = generateSchulteTable(size);
      const flat = table.flat();
      const total = size * size;
      
      for (let i = 1; i <= total; i++) {
        expect(flat).toContain(i);
      }
      expect(flat.length).toBe(total);
    });

    it('should randomly shuffle numbers', () => {
      const table1 = generateSchulteTable(3);
      const table2 = generateSchulteTable(3);
      
      // Маловероятно что таблицы совпадут полностью
      const isDifferent = JSON.stringify(table1) !== JSON.stringify(table2);
      expect(isDifferent).toBe(true);
    });
  });

  describe('findNumberPosition', () => {
    const testTable = [
      [1, 2, 3],
      [4, 5, 6],
      [7, 8, 9]
    ];

    it('should find correct position of number', () => {
      expect(findNumberPosition(testTable, 1)).toEqual([0, 0]);
      expect(findNumberPosition(testTable, 5)).toEqual([1, 1]);
      expect(findNumberPosition(testTable, 9)).toEqual([2, 2]);
    });

    it('should return null for number not in table', () => {
      expect(findNumberPosition(testTable, 10)).toBeNull();
      expect(findNumberPosition(testTable, 0)).toBeNull();
    });
  });
});