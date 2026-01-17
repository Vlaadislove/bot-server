import { Response, Request } from "express";
import { checkPayment, createPayment, handlePaymentWebhook } from "../service/payment-service";
import { freeSubscription } from "../service/other-service";


export const paymentCreate = async (req: Request, res: Response) => {
    const { userId, price } = req.body
    
    const payment = await createPayment(userId, price)

    if (payment.url && payment.paymentId) {
        res.status(201).json({ url: payment.url })
    }
}


export const freeSub = async (req: Request, res: Response) =>{
    const {userId} = req.body
    const data = await freeSubscription(userId)
    if(data) res.json(data)
    else res.status(201).json({status:true, message:'Успешная выдача бесплатной подписки'})
}

export const paymentWebhook = async (req: Request, res: Response) => {
    try {
    
        const result = await handlePaymentWebhook(req.body)
        if (result?.error) {
            return res.status(400).json(result)
        }
        console.log('все удачно')
        return res.status(200).json({ status: 'ok' })
    } catch (error) {
        console.error('paymentWebhook error:', error)
        return res.status(500).json({ error: 'internal_error' })
    }
}