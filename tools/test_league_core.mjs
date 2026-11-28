// Unit tests for the weekly leaderboard core (src/islands/LeagueCore.js).
import assert from 'node:assert/strict';
import {
  leagueWeekNo,
  leagueWeekStartMs,
  leagueWeekOfYear,
  leagueWeekRange,
  leagueTimeUntilReset,
  cleanNickname,
  parseProfile,
  rememberWeek,
  parseLedger,
  emptyLedger,
  addXp,
  nextUploadXp,
  markUploaded,
  cardsForXp,
  standing,
} from '../src/islands/LeagueCore.js';
import { LEAGUE_MAX_XP_PER_WRITE, LEAGUE_WEEKLY_XP_CAP, LEAGUE_DEFAULT_AVATAR } from '../src/islands/LeagueConstants.js';

const vn = (iso) => Date.parse(iso + '+07:00');

// Weeks change at Monday 00:00 Vietnam time, not UTC.
{
  const sunday = leagueWeekNo(vn('2026-11-29T23:59:59'));
  const monday = leagueWeekNo(vn('2026-11-30T00:00:00'));
  assert.equal(monday, sunday + 1);
  assert.equal(leagueWeekNo(vn('2026-11-24T00:00:00')), sunday);
  assert.equal(leagueWeekStartMs(monday), vn('2026-11-30T00:00:00'));
  assert.equal(leagueWeekRange(sunday), '23/11 – 29/11');
  assert.equal(leagueWeekOfYear(sunday), 48);
  // The formula the rules use: floor((ms + 7h + 3d) / 7d).
  const t = vn('2026-11-28T10:00:00');
  assert.equal(leagueWeekNo(t), Math.floor((t + 25200000 + 259200000) / 604800000));
  assert.deepEqual(leagueTimeUntilReset(vn('2026-11-28T10:00:00')), { days: 1, hours: 14 });
}

// Nicknames: trimmed, 2–20 letters/digits/space/_.- in any script; never emails or markup.
{
  assert.equal(cleanNickname('  Hậu   học Hán '), 'Hậu học Hán');
  assert.equal(cleanNickname('明 Minh_2'), '明 Minh_2');
  assert.equal(cleanNickname('a'), null);
  assert.equal(cleanNickname('x'.repeat(21)), null);
  assert.equal(cleanNickname('me@gmail.com'), null);
  assert.equal(cleanNickname('<b>hi</b>'), null);
}

// Profiles from sync are validated; opted-in requires a valid nickname.
{
  assert.equal(parseProfile('not json').optedIn, false);
  const p = parseProfile(JSON.stringify({ optedIn: true, nickname: 'Lan', avatar: 'evil', weeks: [1, 'x', 2] }));
  assert.equal(p.avatar, LEAGUE_DEFAULT_AVATAR);
  assert.deepEqual(p.weeks, [1, 2]);
  assert.equal(parseProfile(JSON.stringify({ optedIn: true, nickname: '' })).optedIn, false);
  assert.deepEqual(rememberWeek(p, 2).weeks, [1, 2]);
  assert.deepEqual(rememberWeek(p, 3).weeks, [1, 2, 3]);
}

// Ledger: one-time awards, weekly rollover, per-write and weekly caps.
{
  let ledger = emptyLedger(100);
  ({ ledger } = addXp(ledger, 2));
  let result = addXp(ledger, 20, 'daily:2026-11-28');
  assert.equal(result.added, 20);
  ledger = result.ledger;
  assert.equal(addXp(ledger, 20, 'daily:2026-11-28').added, 0);
  assert.equal(ledger.pendingXp, 22);

  const sameWeek = parseLedger(JSON.stringify(ledger), 100);
  assert.equal(sameWeek.pendingXp, 22);
  assert.equal(addXp(sameWeek, 20, 'daily:2026-11-28').added, 0);
  const nextWeek = parseLedger(JSON.stringify(ledger), 101);
  assert.equal(nextWeek.pendingXp, 0, 'pending XP of a finished week is dropped');
  assert.deepEqual(nextWeek.awarded, {});

  ({ ledger } = addXp(emptyLedger(1), 1000));
  assert.equal(nextUploadXp(ledger), LEAGUE_MAX_XP_PER_WRITE);
  const after = markUploaded(ledger, LEAGUE_MAX_XP_PER_WRITE, 5);
  assert.equal(after.pendingXp, 1000 - LEAGUE_MAX_XP_PER_WRITE);
  assert.equal(after.lastWriteAt, 5);
  assert.equal(addXp(emptyLedger(1), LEAGUE_WEEKLY_XP_CAP + 5).added, LEAGUE_WEEKLY_XP_CAP);
  assert.equal(addXp(emptyLedger(1), 0).added, 0);
  assert.equal(addXp(emptyLedger(1), 1.5).added, 0);
}

// Standing: XP needed to strictly overtake the person directly above.
{
  const board = [
    { uid: 'a', nickname: 'Minh', avatar: 'dragon', xp: 1425 },
    { uid: 'm', nickname: 'Mai Anh', avatar: 'plum', xp: 366 },
    { uid: 'me', nickname: 'Hậu', avatar: 'crane', xp: 340 },
    { uid: 'p', nickname: 'Phong', avatar: 'pine', xp: 100 },
  ];
  const s = standing(board, 'me', 340, 3);
  assert.equal(s.above.nickname, 'Mai Anh');
  assert.equal(s.needToOvertake, 27);
  assert.equal(cardsForXp(s.needToOvertake), 14);
  assert.equal(s.below.nickname, 'Phong');

  const leader = standing(board, 'a', 1425, 1);
  assert.equal(leader.above, null);
  assert.equal(leader.needToOvertake, 0);
  assert.equal(leader.leadBy, 1425 - 366);

  const tie = standing([{ uid: 'x', nickname: 'X', avatar: 'bear', xp: 50 }], 'me', 50, 2);
  assert.equal(tie.needToOvertake, 1);
}

console.log('league core tests passed');
