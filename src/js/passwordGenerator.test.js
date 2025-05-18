const PasswordGenerator = require('./passwordGenerator');

describe('PasswordGenerator', () => {
  let generator;

  beforeEach(() => {
    generator = new PasswordGenerator();
  });

  test('generates a password of correct length', () => {
    const password = generator.generatePassword({ length: 12 });
    expect(password).toHaveLength(12);
  });

  test('throws error if no character sets are selected', () => {
    expect(() => generator.generatePassword({
      length: 8,
      lowercase: false,
      uppercase: false,
      numbers: false,
      special: false
    })).toThrow('At least one character set must be selected');
  });

  test('throws error if length is less than 4', () => {
    expect(() => generator.generatePassword({ length: 3 })).toThrow('Password length must be between 4 and 64 characters');
  });

  test('throws error if length is more than 64', () => {
    expect(() => generator.generatePassword({ length: 65 })).toThrow('Password length must be between 4 and 64 characters');
  });

  test('template-based generation works as expected', () => {
    const password = generator.generatePassword({
      template: 'Ll#@',
      lowercase: true,
      uppercase: true,
      numbers: true,
      special: true
    });
    expect(password).toMatch(/^[A-Za-z\d\W]{4}$/);
  });

  test('excludes similar characters', () => {
    const password = generator.generatePassword({
      length: 32,
      lowercase: true,
      uppercase: true,
      numbers: true,
      special: false,
      excludeSimilar: true
    });
    expect(password).not.toMatch(/[iIlL1oO0]/);
  });

  test('excludes ambiguous characters', () => {
    const password = generator.generatePassword({
      length: 32,
      lowercase: true,
      uppercase: true,
      numbers: true,
      special: true,
      excludeAmbiguous: true
    });
    expect(password).not.toMatch(/[\{\}\[\]\(\)\/\'\"\~,;:\.<>]/);
  });

  test('calculates password strength', () => {
    const weak = generator.calculateStrength('password');
    const strong = generator.calculateStrength('A1b2C3d4!@');
    expect(weak.score).toBeLessThan(strong.score);
  });

  test('generates mnemonic password', () => {
    const mnemonic = generator.generateMnemonicPassword({ wordCount: 4 });
    expect(typeof mnemonic).toBe('string');
    expect(mnemonic.split('-').length).toBe(4);
  });
}); 