const rollRaw = (die) => {
  return Math.min(die, Math.floor(Math.random() * die) + 1);
};

const roll = ({
  die = 20,
  num = 1,
  advantage = false,
  disadvantage = false,
}) => {
  let sum = 0;
  for (let i = 0; i < num; i += 1) {
    if (advantage && !disadvantage) {
      sum += Math.max(rollRaw(die), rollRaw(die));
    } else if (disadvantage) {
      sum += Math.min(rollRaw(die), rollRaw(die));
    } else {
      sum += rollRaw(die);
    }
  }
  return sum;
};

const TARGET_AC = 20;
const ATTACK_BONUS = 8;

const getDice = (attackRoll, onCrit = 2) => (attackRoll === 20 ? onCrit : 1);

const isHit = (attack, target) => {
  switch (attack) {
    case 1:
      return false;
    case 20:
      return true;
    default:
      return attack >= target;
  }
};

const testRogue = () => {
  let damage = 0;

  const attack1 = roll({ die: 20 });
  const attack2 = roll({ die: 20 });

  const ac = TARGET_AC - ATTACK_BONUS;
  let maxAttack = Math.max(attack1, attack2);

  if (isHit(attack1, ac)) {
    damage += roll({ die: 6, num: getDice(attack1) }) + 5;
  }

  if (isHit(attack2, ac)) {
    damage += roll({ die: 6, num: getDice(attack2) });
  }

  // Sneak attack
  if (isHit(maxAttack, ac)) {
    damage += roll({ die: 6, num: getDice(maxAttack) * 5 });
  }

  return damage;
};

const testMonk = () => {
  let damage = 0;
  const ac = TARGET_AC - ATTACK_BONUS;
  for (let i = 0; i < 4; i += 1) {
    const attack = roll({ die: 20 });
    if (isHit(attack, ac)) {
      damage += roll({ die: 6, num: getDice(attack) }) + 5;
    }
  }
  return damage;
};

const testRanger = () => {
  let damage = 0;
  const ac = TARGET_AC - ATTACK_BONUS;
  for (let i = 0; i < 3; i += 1) {
    const attack = roll({ die: 20 });
    if (isHit(attack, ac)) {
      damage += roll({ die: 6, num: 2 * getDice(attack) }) + 5;
    }
  }
  return damage;
};

const testBarbarian = () => {
  let damage = 0;
  const isReckless = true;
  const isGwm = false;

  const ac = TARGET_AC - ATTACK_BONUS + (isGwm ? 5 : 0);

  for (let i = 0; i < 2; i += 1) {
    const attack = roll({ die: 20, advantage: isReckless });
    if (isHit(attack, ac)) {
      damage +=
        roll({ die: 10, num: getDice(attack, 3) }) + 3 + 5 + (isGwm ? 10 : 0);
    }
  }

  // BA attack
  const baAttack = roll({ die: 20, advantage: isReckless });
  if (isHit(baAttack, ac)) {
    damage +=
      roll({ die: 4, num: getDice(baAttack, 3) }) + 3 + 5 + (isGwm ? 10 : 0);
  }

  return damage;
};

const testFighter = () => {
  let damage = 0;
  const ac = TARGET_AC - ATTACK_BONUS + 5;
};

const main = () => {
  const tests = 1_000_000;
  let rogue = 0;
  let monk = 0;
  let ranger = 0;
  let barbarian = 0;
  for (let i = 0; i < tests; i += 1) {
    rogue += testRogue();
    monk += testMonk();
    ranger += testRanger();
    barbarian += testBarbarian();
  }
  console.log(rogue / tests, monk / tests, ranger / tests, barbarian / tests);
};

main();
