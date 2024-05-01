import { freeSub, paymentCreate } from '../controllers/payment';
import { Router } from "express";


const router = Router()


// http://localhost:3000/payment/
router.post('/create', paymentCreate)
router.post('/free-subscription', freeSub)


export default router