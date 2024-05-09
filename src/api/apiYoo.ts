import { IConfirmationType, YooCheckout} from '@a2seven/yoo-checkout';
import * as settings from "../settings"

const checkout = new YooCheckout({
    shopId: settings.YM_SHOP_IP,
    secretKey: settings.YM_SECRET_KEY
});
// const checkout = new YooCheckout({
//     shopId: '361023',
//     secretKey: 'live__tSTCEF8qA-1KGR8kp5WtRsvm3PwbfhwgueiOEPpNsw'
// });

interface ICreatePayload {
    amount: {
        value: string; 
        currency: string; 
    };
    confirmation: {
        type: IConfirmationType;
        return_url: string; 
    };
    capture: boolean; 
}


export const createPaymentApi = async (price:number, idempotenceKey:string) => {

    const createPayload:ICreatePayload = {
        amount: {
            value: `${price}.00`,
            currency: 'RUB'
        },
        confirmation: {
            type: 'redirect',
            return_url: 'https://t.me/vpn_test_vlad_bot'
        },
        capture: true
    };

    try {
        const payment = await checkout.createPayment(createPayload, idempotenceKey);
        return payment
    } catch (error) {
        console.error(error);
    }
}

export const getPaymentApi = async (paymentId:string) => {
    
    try {
        const payment = await checkout.getPayment(paymentId);
        return payment
    } catch (error) {
        console.error(error);
    }

}



// export const capturePayment = async () => {

//     const idempotenceKey = '26469hc4-a1f0-49db-807e-f0d67c2ed5a6'
//     const paymentId = '2da78c08-000f-5000-a000-1ff1288a48e9'

//     const capturePayload= {
//         amount: {
//             value: '2.00',
//             currency: 'RUB'
//         }
//     };
//     try {
//         const payment = await checkout.capturePayment(paymentId, capturePayload, idempotenceKey);
//         console.log(payment)
//     } catch (error) {
//         console.error(error);
//     }
// }