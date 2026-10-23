import { open, sleep } from './e2e-lib.mjs';
const out = process.argv[2];
const { b, p, errors } = await open('http://localhost:8080/index.html');
await sleep(3500);
await p.screenshot({ path: out + '/title.png' });
console.log(errors.join('\n') || 'no errors');
await b.close();
