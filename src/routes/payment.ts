import { paymentCreate } from '../controllers/payment';
import { Router } from "express";


const router = Router()


// http://localhost:3000/payment/
router.post('/create', paymentCreate)


export default router