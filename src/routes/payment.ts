import { freeSub, paymentCreate } from '../controllers/payment';
import { paymentWebhook } from '../controllers/payment';
import { Router } from "express";


const router = Router()


// http://localhost:3000/payment/
router.post('/create-payment', paymentCreate)
router.post('/free-subscription', freeSub)
router.post('/webhook', paymentWebhook)


export default router