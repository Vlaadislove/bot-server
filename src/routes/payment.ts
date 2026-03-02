import { freeSub, paymentCreate, promoActivate, promoGenerate } from '../controllers/payment';
import { paymentWebhook } from '../controllers/payment';
import { Router } from "express";


const router = Router()


// http://localhost:3000/payment/
router.post('/create-payment', paymentCreate)
router.post('/free-subscription', freeSub)
router.post('/promo', promoActivate)
router.post('/generate-promo', promoGenerate)
router.post('/webhook', paymentWebhook)


export default router