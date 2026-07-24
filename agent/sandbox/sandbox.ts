import { defineSandbox } from 'eve/sandbox';
import { vercel } from 'eve/sandbox/vercel';

export default defineSandbox({
  backend: vercel({ networkPolicy: 'deny-all' }),
  async onSession({ use }) {
    await use({ networkPolicy: 'deny-all' });
  },
});
