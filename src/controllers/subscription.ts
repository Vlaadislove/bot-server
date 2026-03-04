import { Request, Response } from "express";
import UserSchema from "../models/user-model";
import SubscriptionSchema, { ISubscription } from "../models/subscription-model";

const SUBSCRIPTION_TYPE_LABELS: Record<string, string> = {
    paid:   'Платная',
    free:   'Пробный период',
    friend: 'Для друзей',
};

const DATE_FORMAT: Intl.DateTimeFormatOptions = {
    timeZone: 'Europe/Moscow',
    day: 'numeric', month: 'long',
    hour: '2-digit', minute: '2-digit',
};

function buildAnnounceInfo(sub: ISubscription | null, userId: number) {
    if (!sub) {
        return {
            announceText:   `❌ Ваша подписка закончилась\n⚠️ Нажмите 🔄 для обновления\n👤 ID: ${userId}`,
            updateInterval: '720',
            expireUnix:     null,
        };
    }

    const subMs    = sub.subExpire.getTime();
    const daysLeft = Math.ceil((subMs - Date.now()) / 86_400_000);
    const typeName = SUBSCRIPTION_TYPE_LABELS[sub.type] ?? sub.type;
    const dateStr  = new Date(subMs).toLocaleString('ru-RU', DATE_FORMAT);

    return {
        announceText:   `⏳ До конца подписки: ${daysLeft} дн. (${dateStr} МСК) • ${typeName}\n⚠️ При проблемах нажмите 🔄\n👤 ID: ${sub.userId}`,
        updateInterval: '1',
        expireUnix:     Math.floor(subMs / 1000),
    };
}

export const getSubscription = async (req: Request, res: Response) => {
    try {
        const { subToken } = req.params;
        if (!subToken) return res.status(400).send('');

        const user = await UserSchema.findOne({ subToken });
        if (!user) return res.status(404).send('');

        const sub = await SubscriptionSchema.findOne({ userId: user.userId, statusSub: true });

        const configs = sub ? sub.servers.map(s => s.config) : [];

        const body = Buffer.from(configs.join('\n')).toString('base64');
        const { announceText, updateInterval, expireUnix } = buildAnnounceInfo(sub, user.userId);

        res.setHeader('Content-Type',            'text/plain; charset=utf-8');
        res.setHeader('Profile-Title',           'VPNinja');
        res.setHeader('Profile-Update-Interval', updateInterval);
        res.setHeader('Content-Disposition',     'attachment; filename="MyVPN"');
        res.setHeader('announce',                'base64:' + Buffer.from(announceText).toString('base64'));
        if (expireUnix) {
            res.setHeader('Subscription-Userinfo', `upload=0; download=0; total=0; expire=${expireUnix}`);
        }
        res.setHeader('Cache-Control', 'no-store');
        res.setHeader('Pragma',        'no-cache');
        res.send(body);
    } catch (error) {
        console.error('getSubscription error:', error);
        res.status(500).send('');
    }
};
