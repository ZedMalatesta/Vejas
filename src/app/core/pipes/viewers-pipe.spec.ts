import { ViewersPipe } from './viewers-pipe';

describe('ViewersPipe', () => {
  const pipe = new ViewersPipe();

  it('formats small counts as-is', () => {
    expect(pipe.transform('42')).toBe('42 viewers');
  });

  it('uses singular for exactly one viewer', () => {
    expect(pipe.transform('1')).toBe('1 viewer');
  });

  it('abbreviates thousands', () => {
    expect(pipe.transform('1500')).toBe('1.5K viewers');
  });

  it('abbreviates millions', () => {
    expect(pipe.transform('2500000')).toBe('2.5M viewers');
  });

  it('accepts numbers as well as strings', () => {
    expect(pipe.transform(42)).toBe('42 viewers');
    expect(pipe.transform(1500)).toBe('1.5K viewers');
    expect(pipe.transform(0)).toBe('0 viewers');
  });
});
