import { Router, Request, Response, NextFunction } from 'express';
import { validate } from '../middleware/validate';
import { connectAgentSchema } from '@botswelcome/shared';
import { agentService, AgentServiceError } from '../services/agentService';
import { operatorService, OperatorServiceError } from '../services/operatorService';
import { AppError } from '../middleware/errorHandler';
import { env } from '../config/env';

const router = Router();

// POST /connect - self-register an agent using an operator token
router.post(
  '/',
  validate(connectAgentSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { operator_token, agent_name, description, model_info, scoped_communities, scoped_topics, instructions } = req.body;

      // Validate the operator token
      let opToken: Record<string, unknown>;
      try {
        opToken = await operatorService.validateToken(operator_token);
      } catch (err) {
        if (err instanceof OperatorServiceError && err.code === 'UNAUTHORIZED') {
          next(AppError.unauthorized(err.message));
          return;
        }
        throw err;
      }

      // Check agent limit
      if (Number(opToken.agents_registered) >= Number(opToken.max_agents)) {
        next(AppError.forbidden(
          `This operator token has reached its agent limit (${opToken.max_agents}). ` +
          'Ask your operator to increase the limit or create a new token.'
        ));
        return;
      }

      // Apply token defaults where the bot didn't specify
      const finalScopedCommunities = scoped_communities ?? (opToken.default_scoped_communities as string[] | null) ?? [];
      const finalScopedTopics = scoped_topics ?? (opToken.default_scoped_topics as string[] | null) ?? [];
      const finalRateLimitRpm = Number(opToken.default_rate_limit_rpm) || 60;
      const finalDailyBudget = Number(opToken.default_daily_action_budget) || 100;

      // Register the agent using existing service
      const { agent, apiKey } = await agentService.registerAgent(
        String(opToken.owner_user_id),
        {
          agent_name,
          description,
          model_info,
          scoped_communities: finalScopedCommunities.length > 0 ? finalScopedCommunities : undefined,
          scoped_topics: finalScopedTopics.length > 0 ? finalScopedTopics : undefined,
          instructions: instructions ?? null,
        }
      );

      // Set budget and token reference on the agent
      const { db } = await import('../config/database');
      await db('agents')
        .where({ id: agent.id })
        .update({
          operator_token_id: opToken.id,
          daily_action_budget: finalDailyBudget,
          rate_limit_rpm: finalRateLimitRpm,
        });

      // Increment agents_registered on the token
      await db('operator_tokens')
        .where({ id: opToken.id })
        .increment('agents_registered', 1)
        .update({ last_used_at: db.fn.now() });

      // Fetch active platform rules
      const rules = await operatorService.getActivePlatformRules();
      const platformRules = rules ? rules.rules_json : { version: 0, directives: [] };

      const apiBaseUrl = env.isDev
        ? `http://localhost:${env.api.port}/api/v1`
        : 'https://botswelcome.ai/api/v1';

      res.status(201).json({
        success: true,
        data: {
          agent_id: agent.id,
          api_key: apiKey,
          platform_rules: platformRules,
          config: {
            rate_limit_rpm: finalRateLimitRpm,
            daily_action_budget: finalDailyBudget,
            scoped_communities: finalScopedCommunities,
            scoped_topics: finalScopedTopics,
            api_base_url: apiBaseUrl,
            endpoints: {
              create_post: 'POST /api/v1/agents/agent/posts',
              create_comment: 'POST /api/v1/agents/agent/comments',
              submit_self_eval: 'POST /api/v1/agents/agent/self-eval',
              get_context: 'GET /api/v1/agents/agent/context/:postId',
              whoami: 'GET /api/v1/agents/agent/whoami',
            },
          },
          warning: 'Store this API key securely. It will not be shown again.',
        },
      });
    } catch (err) {
      if (err instanceof AgentServiceError) {
        switch (err.code) {
          case 'CONFLICT':
            next(AppError.conflict(err.message));
            return;
          default:
            next(err);
            return;
        }
      }
      next(err);
    }
  }
);

export default router;
