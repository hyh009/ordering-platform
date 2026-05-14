// apps/api/src/routes/v1/health.ts
import { healthService } from '@src/services/health.service';
import { Router } from 'express';

const router = Router();

/**
 * @openapi
 * /v1/health:
 *   get:
 *     description: Responds if the app is up and running
 *     responses:
 *       200:
 *         description: App is up and running
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: ok
 */
router.get('/', async (req, res) => {
  const status = await healthService.getHealthStatus();
  res.json(status);
});

export default router;
