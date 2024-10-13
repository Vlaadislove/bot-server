import { Response, Request } from "express";
import { checkPayment, createPayment } from "../service/payment-service";
import { freeSubscription } from "../service/other-service";


export const paymentCreate = async (req: Request, res: Response) => {
    const { userId, price } = req.body
    
    const payment = await createPayment(userId, price)

    if (payment.url && payment.paymentId) {
        res.status(201).json({ url: payment.url })
        await checkPayment(payment.paymentId, userId, price)
    }
}


export const freeSub = async (req: Request, res: Response) =>{
    const {userId} = req.body
    const data = await freeSubscription(userId)
    if(data) res.json(data)
    else res.status(201).json({status:true, message:'Успешная выдача бесплатной подписки'})
}