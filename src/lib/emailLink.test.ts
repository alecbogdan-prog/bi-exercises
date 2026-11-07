import { describe, expect, it } from 'vitest';
import { parseEmailLink, safeNextPath } from './emailLink';

const O = 'https://powerbiexercise.com';

describe('email sign-in links', () => {
  it('reads the token, type and a full redirect URL as next', () => {
    expect(parseEmailLink(`?token_hash=abc123&type=email&next=${O}/pricing?offer=pro-year&x=1`, O)).toEqual({
      tokenHash: 'abc123',
      type: 'email',
      next: '/pricing?offer=pro-year&x=1',
    });
  });

  it('accepts an encoded next and a missing next', () => {
    expect(parseEmailLink(`?token_hash=t&type=invite&next=${encodeURIComponent(`${O}/team`)}`, O)?.next).toBe('/team');
    expect(parseEmailLink('?token_hash=t&type=email_change', O)?.next).toBe('/account');
  });

  it('never redirects to another site', () => {
    expect(safeNextPath('https://evil.example/steal', O)).toBe('/account');
    expect(safeNextPath('//evil.example', O)).toBe('/account');
    expect(safeNextPath(`${O}`, O)).toBe('/');
  });

  it('rejects links without a token or with an unknown type', () => {
    expect(parseEmailLink('?type=email', O)).toBeNull();
    expect(parseEmailLink('?token_hash=t&type=hack', O)).toBeNull();
  });
});
