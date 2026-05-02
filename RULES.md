# PAR

## Official Rules Manual

PAR is golf played with dice. Roll the hole, build the match, and bank the
lowest score you can. The player with the lowest round total wins.

## 1. Quick Start

Every hole follows the same idea:

1. Roll dice equal to the hole's par.
2. Build the required match for that hole.
3. The matched dice count as `0`.
4. The leftover dice are your score.
5. Low total wins the round.

If you are learning fast, remember this:

- Par 3 = make a pair
- Par 4 = make 3 of a kind
- Par 5 = make at least 3 of a kind
- Straights give 1 bonus roll
- You can always bank the score showing

## 2. Round Setup

A round can be played over:

- 9 holes
- 18 holes

Each 9-hole block uses this hole mix:

- 4 Par 3 holes
- 3 Par 4 holes
- 2 Par 5 holes

Those holes are shuffled into a random order each round. An 18-hole round is
made from two separately shuffled 9-hole blocks.

## 3. Dice By Hole Type

The par of the hole determines how many dice you roll:

- Par 3: roll 3 dice
- Par 4: roll 4 dice
- Par 5: roll 5 dice

## 4. Scoring By Hole

### Par 3

- Goal: make a pair
- If made: the 1 unmatched die is your score
- If missed: score `3 + your lowest die`

Examples:

- `3, 3, 4` scores `4`
- `1, 1, 6` scores `6`
- `2, 4, 6` misses and scores `5`

### Par 4

- Goal: make 3 of a kind
- If made: the 1 unmatched die is your score
- If missed: score `4 + your lowest die`

Examples:

- `5, 5, 5, 2` scores `2`
- `2, 2, 2, 1` scores `1`
- `2, 4, 5, 6` misses and scores `6`

### Par 5

- Goal: make at least 3 of a kind
- If made: the 2 unmatched dice are added for your score
- If missed: all 5 dice are added together

Examples:

- `2, 2, 2, 1, 1` scores `2`
- `6, 6, 6, 6, 1` scores `1`
- `1, 2, 4, 5, 6` misses and scores `18`

## 5. Special Scores

PAR celebrates the rare best starts:

- Any first-roll score of `1` = `Hole in One`
- On Par 4, that first-roll `1` is shown as `Hole in One - Albatross`
- On Par 5, that first-roll `1` is shown as `Hole in One - Condor`
- All dice matching after roll 1 = `2` and counts as a `Birdie`

Examples:

- Par 3: `4, 4, 1` on roll 1 = `Hole in One`
- Par 4: `2, 2, 2, 1` on roll 1 = `Hole in One - Albatross`
- Par 5: `3, 3, 3, 3, 1` on roll 1 = `Hole in One - Condor`
- Par 4: `5, 5, 5, 5` on roll 2 = `Birdie` and scores `2`
- Par 5: `6, 6, 6, 6, 6` on roll 3 = `Birdie` and scores `2`

## 6. Turn Structure

Each player takes one turn on each hole.

Base rolls by hole:

- Par 3: up to 3 rolls
- Par 4: up to 3 rolls
- Par 5: up to 4 rolls

On your turn:

1. Roll the dice for the hole.
2. After each roll, choose which dice to hold.
3. You may bank the current score after any roll.
4. If you roll a straight, earn 1 bonus roll.
5. After your last available roll, press `Take Score` to post the hole.

## 7. Holding Dice

After the first roll, you may hold any number of dice before the next roll.

- Held dice keep their current value
- Only unheld dice are rerolled
- You may change which dice are held between rolls

If every die is being held, release at least one die before rolling again.

## 8. Straights And Bonus Rolls

A straight gives you 1 extra roll on the current hole.

Straight sizes:

- Par 3: 3 consecutive dice
- Par 4: 4 consecutive dice
- Par 5: 5 consecutive dice

Examples:

- Par 3: `2, 3, 4`
- Par 4: `1, 2, 3, 4`
- Par 5: `2, 3, 4, 5, 6`

When you roll a straight:

- you immediately earn 1 bonus roll
- your turn can go past the normal base roll count
- you may still bank the current score instead of using the bonus roll

## 9. Banking A Score

PAR always gives you a score you can take.

If you already have the required match:

- the matched dice count as `0`
- only the leftover dice still matter

If you do not have the required match yet:

- Par 3 uses `3 + your lowest die`
- Par 4 uses `4 + your lowest die`
- Par 5 uses the total of all 5 dice

That means you can bank a safe number early instead of chasing a riskier reroll.

## 10. End Of Turn And Round

A turn ends when the player presses `Take Score`.

After that:

- play moves to the next player on the same hole
- once all players finish the hole, the round advances to the next hole

The round ends after the final hole is completed. Add every player's scores
together. Lowest total wins.

## 11. Multiplayer

PAR supports:

- solo play on one device
- live room play using a 5-character room code

For room play:

- one player hosts the room
- other players join with the room code or link
- everyone waits in the lobby before the round starts
- the host starts the round when the room is ready
- player names must be unique

## 12. Tee Sheet

The tee sheet shows:

- hole number
- hole par
- each player's posted score
- running totals
- score versus par

During an active turn, the tee sheet may also show a live preview before the
score is officially taken.

## 13. One-Page Cheat Sheet

- Par 3: pair + 1 scoring die
- Par 4: 3 of a kind + 1 scoring die
- Par 5: 3 of a kind + 2 scoring dice
- Par 3 miss: `3 + lowest die`
- Par 4 miss: `4 + lowest die`
- Par 5 miss: add all 5 dice
- Straights: 1 bonus roll
- Par 3 / Par 4: 3 base rolls
- Par 5: 4 base rolls
- Any first-roll score of `1`: `Hole in One`
- All dice matching after roll 1: `Birdie` for `2`
- Lowest total wins
