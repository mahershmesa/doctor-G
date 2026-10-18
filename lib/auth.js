// Password hashing (scrypt) and signed login tokens (HMAC). No native modules needed.

const crypto = require('crypto');

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.scryptSync(String(password), salt, 64).toString('hex');
  return { salt, hash };
}

function verifyPassword(password, salt, hash) {
  const test = crypto.scryptSync(String(password), salt, 64);
  const real = Buffer.from(hash, 'hex');
  return real.length === test.length && crypto.timingSafeEqual(real, test);
}

function createTokenService(secret, ttlMs = 1000 * 60 * 60 * 24 * 7) {
  const sign = (payload) => crypto.createHmac('sha256', secret).update(payload).digest('base64url');
  return {
    issue(user) {
      // Including the hash prefix means changing the password logs out old sessions.
      const payload = `${user.id}.${Date.now() + ttlMs}.${user.hash.slice(0, 8)}`;
      return `${Buffer.from(payload).toString('base64url')}.${sign(payload)}`;
    },
    verify(token, findUser) {
      if (typeof token !== 'string' || !token.includes('.')) return null;
      const [b64, sig] = token.split('.');
      let payload;
      try {
        payload = Buffer.from(b64, 'base64url').toString();
      } catch {
        return null;
      }
      const expected = sign(payload);
      if (!sig || sig.length !== expected.length) return null;
      if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
      const [userId, exp, hashPrefix] = payload.split('.');
      if (Date.now() > Number(exp)) return null;
      const user = findUser(userId);
      if (!user || user.hash.slice(0, 8) !== hashPrefix) return null;
      return user;
    },
  };
}

module.exports = { hashPassword, verifyPassword, createTokenService };
