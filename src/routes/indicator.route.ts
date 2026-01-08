import { Router } from 'express';
import { container } from '../container.js';

const router = Router();

// GET /indicators - List all indicators (id, name, labels)
router.get('/', (req, res) => container.indicatorController.getAllIndicators(req, res));

// GET /indicators/:id - Get indicator details
router.get('/:id', (req, res) => container.indicatorController.getIndicatorDetails(req, res));

export default router;
