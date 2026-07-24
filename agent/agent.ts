import { defineAgent } from 'eve';

export default defineAgent({
  model:
    process.env.DESIGN_AGENT_MODEL ?? 'anthropic/claude-sonnet-4.6',
});
