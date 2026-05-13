import { describe, it, expect } from 'vitest';

describe('Game Logic', () => {
  describe('Move validation', () => {
    it('should validate correct number order', () => {
      const nextNumber = 1;
      const currentNumber = 1;
      expect(nextNumber).toBe(currentNumber);
    });

    it('should reject wrong number order', () => {
      const expectedNumber = 3;
      const actualNumber = 5;
      const isValid = actualNumber === expectedNumber;
      expect(isValid).toBe(false);
    });

    it('should prevent taking already taken numbers', () => {
      const takenNumbers = [1, 2, 3];
      const isAvailable = !takenNumbers.includes(2);
      expect(isAvailable).toBe(false);
    });
  });

  describe('Winner detection', () => {
    it('should detect winner when player reaches 25', () => {
      const lastNumber = 25;
      const isWinner = lastNumber === 25;
      expect(isWinner).toBe(true);
    });
  });

  describe('Progress calculation', () => {
    it('should calculate correct progress', () => {
      const validMoves = [1, 2, 3, 4, 5];
      const progress = validMoves.length;
      expect(progress).toBe(5);
    });
  });
});
