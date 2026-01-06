/**
 * Binary Model Test Suite
 * Tests all core functionality of the BinaryModel class
 */

import { BinaryModel } from '../lib/binaryModel';

export function runBinaryModelTests(): { passed: number; failed: number; results: string[] } {
  const results: string[] = [];
  let passed = 0;
  let failed = 0;

  function test(name: string, fn: () => boolean): void {
    try {
      const result = fn();
      if (result) {
        results.push(`✓ ${name}`);
        passed++;
      } else {
        results.push(`✗ ${name} - Assertion failed`);
        failed++;
      }
    } catch (error) {
      results.push(`✗ ${name} - ${error}`);
      failed++;
    }
  }

  // Test: Initialization
  test('BinaryModel initializes correctly', () => {
    const model = new BinaryModel('101010');
    return model.getBits() === '101010' && model.getLength() === 6;
  });

  // Test: Insert bits
  test('BinaryModel inserts bits correctly', () => {
    const model = new BinaryModel('1010');
    model.insertBits(2, '11');
    return model.getBits() === '101110';
  });

  // Test: Delete bits
  test('BinaryModel deletes bits correctly', () => {
    const model = new BinaryModel('101010');
    model.deleteBits(2, 4);
    return model.getBits() === '1010';
  });

  // Test: Set bit
  test('BinaryModel sets individual bit', () => {
    const model = new BinaryModel('0000');
    model.setBit(1, '1');
    return model.getBits() === '0100';
  });

  // Test: Append bits
  test('BinaryModel appends bits', () => {
    const model = new BinaryModel('101');
    model.appendBits('010');
    return model.getBits() === '101010';
  });

  // Test: Undo operation
  test('BinaryModel undo works', () => {
    const model = new BinaryModel('1010');
    model.appendBits('11');
    model.undo();
    return model.getBits() === '1010';
  });

  // Test: Redo operation
  test('BinaryModel redo works', () => {
    const model = new BinaryModel('1010');
    model.appendBits('11');
    model.undo();
    model.redo();
    return model.getBits() === '101011';
  });

  // Test: Move bits
  test('BinaryModel moves bits correctly', () => {
    const model = new BinaryModel('11110000');
    model.moveBits(0, 4, 8);
    return model.getBits() === '00001111';
  });

  // Test: Peek bits (non-destructive)
  test('BinaryModel peek returns bits without modification', () => {
    const model = new BinaryModel('101010');
    const peeked = model.peekBits(1, 3);
    return peeked === '010' && model.getBits() === '101010';
  });

  // Test: Truncate
  test('BinaryModel truncates correctly', () => {
    const model = new BinaryModel('10101010');
    model.truncateTo(4);
    return model.getBits() === '1010';
  });

  // Test: Apply AND mask
  test('BinaryModel applies AND mask', () => {
    const model = new BinaryModel('1111');
    model.applyMask('1010', 'AND');
    return model.getBits() === '1010';
  });

  // Test: Apply OR mask
  test('BinaryModel applies OR mask', () => {
    const model = new BinaryModel('1010');
    model.applyMask('0101', 'OR');
    return model.getBits() === '1111';
  });

  // Test: Apply XOR mask
  test('BinaryModel applies XOR mask', () => {
    const model = new BinaryModel('1010');
    model.applyMask('1100', 'XOR');
    return model.getBits() === '0110';
  });

  // Test: Reset to original
  test('BinaryModel resets to original', () => {
    const model = new BinaryModel('1010');
    model.appendBits('11');
    model.reset();
    return model.getBits() === '1010';
  });

  // Test: Commit changes
  test('BinaryModel commits changes', () => {
    const model = new BinaryModel('1010');
    model.appendBits('11');
    model.commit();
    return model.getOriginalBits() === '101011';
  });

  // Test: Generate random bits
  test('BinaryModel generates random bits of correct length', () => {
    const bits = BinaryModel.generateRandom(100);
    return bits.length === 100 && /^[01]+$/.test(bits);
  });

  // Test: From text file
  test('BinaryModel loads from text file', () => {
    const content = '1010\n0101\r\n1100';
    const bits = BinaryModel.fromTextFile(content);
    return bits === '101001011100';
  });

  // Test: To binary file
  test('BinaryModel exports to binary file', () => {
    const bits = '1010101011110000';
    const bytes = BinaryModel.toBinaryFile(bits);
    return bytes.length === 2 && bytes[0] === 0b10101010 && bytes[1] === 0b11110000;
  });

  // Test: From binary file
  test('BinaryModel loads from binary file', () => {
    const buffer = new Uint8Array([0b10101010, 0b11110000]).buffer;
    const bits = BinaryModel.fromBinaryFile(buffer);
    return bits === '1010101011110000';
  });

  return { passed, failed, results };
}
