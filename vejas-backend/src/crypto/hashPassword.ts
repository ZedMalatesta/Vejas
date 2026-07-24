import * as bcrypt from 'bcrypt';

const saltRound = Number(process.env.CRYPT_SALT) || 5;

export async function hashPassword(pass: string): Promise<string> {
  try {
    const hashed = await bcrypt.hash(pass, saltRound);
    return hashed;
  } catch (error) {
    console.error('hashPassword error', error);
    throw error;
  }
}

export async function comparePassword(
  plainPassword: string,
  hashedPassword: string,
) {
  try {
    const isMatch = await bcrypt.compare(plainPassword, hashedPassword);
    return isMatch;
  } catch (error) {
    console.error('Comparison error:', error);
    throw error;
  }
}
