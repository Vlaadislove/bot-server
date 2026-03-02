import { Router } from "express";
import { getSubscription } from "../controllers/subscription";

const router = Router();

// GET /subscription/:subToken
router.get('/:subToken', getSubscription);

export default router;
