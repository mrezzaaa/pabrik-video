let failures = 0;
let passes = 0;

export function check(name: string, condition: boolean, detail?: unknown) {
  if (condition) {
    passes += 1;
    console.log(`  ok   ${name}`);
  } else {
    failures += 1;
    console.log(`  FAIL ${name}${detail === undefined ? "" : `  -> ${JSON.stringify(detail)}`}`);
  }
}

export function eq<T>(name: string, actual: T, expected: T) {
  check(name, JSON.stringify(actual) === JSON.stringify(expected), { actual, expected });
}

export function section(title: string) {
  console.log(`\n# ${title}`);
}

export function finish() {
  console.log(`\n${passes} lulus, ${failures} gagal`);
  if (failures > 0) process.exit(1);
}
