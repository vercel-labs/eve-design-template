import { verifyKnowledge } from './knowledge.mjs';

const manifest = await verifyKnowledge();
console.log(
  `Knowledge verified: ${manifest.status}, ${manifest.sources.length} source${manifest.sources.length === 1 ? '' : 's'}.`,
);
