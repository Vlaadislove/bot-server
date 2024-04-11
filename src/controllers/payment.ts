import { Response, Request } from "express";
import { checkPayment, createPayment } from "../service/payment-service";


export const paymentCreate = async (req: Request, res: Response) => {
    const { userId, price } = req.body
    const payment = await createPayment(userId, price)

    if (payment.url && payment.paymentId) {
        res.status(201).json({ url: payment.url })
        await checkPayment(payment.paymentId, userId, price)
    }

}