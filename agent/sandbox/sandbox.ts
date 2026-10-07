import { defineSandbox } from 'eve/sandbox';
import { VercelSandbox } from 'eve/sandbox/vercel';

export const environment = VercelSandbox.environment();

export default defineSandbox(() =>
  environment.open({ networkPolicy: 'deny-all' }),
);
