import { IConfirmationType, YooCheckout } from '@a2seven/yoo-checkout';
import * as settings from "../settings"

const checkout = new YooCheckout({
    shopId: settings.YM_SHOP_IP,
    secretKey: settings.YM_SECRET_KEY
});


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

export const createPaymentApi = async (price: number, idempotenceKey: string) => {

    const createPayload: ICreatePayload = {
        amount: {
            value: `${price}.00`,
            currency: 'RUB'
        },
        confirmation: {
            type: 'redirect',
            return_url: `https://t.me/${settings.NAME_TG_BOT}`
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

export const getPaymentApi = async (paymentId: string) => {

    try {
        const payment = await checkout.getPayment(paymentId);
        return payment
    } catch (error) {
        console.error(error);
    }

}