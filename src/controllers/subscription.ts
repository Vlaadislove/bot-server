import { Request, Response } from "express";
import UserSchema from "../models/user-model";
import SubscriptionSchema from "../models/subscription-model";

export const getSubscription = async (req: Request, res: Response) => {
  try {
    const { subToken } = req.params;

    if (!subToken) return res.status(400).send('');

    const user = await UserSchema.findOne({ subToken });
    if (!user) return res.status(404).send('');

    const subscriptions = await SubscriptionSchema.find({ userId: user.userId, statusSub: true });
    const configs = subscriptions.flatMap(s => s.servers.map(e => e.config));
    if (!configs.length) return res.status(404).send('');

    const base64 = Buffer.from(configs.join('\n')).toString('base64');

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader("Profile-Title", "VPNinja");
    res.setHeader('Profile-Update-Interval', '1');
    res.setHeader('Content-Disposition', 'attachment; filename="MyVPN"');
    // res.setHeader("announce", "base64:8J+agCBPdXIgc2VydmVycyBnb3QgYSAjMjdlOGQ1cGVyZm9ybWFuY2UgYm9vc3QgdG8gI2U4Y2IyN2xpZ2h0aW5nIHNwZWVkIQ==");
    
    // res.setHeader("announce-url", "https://t.me/v2raytun");
    // const upload = 0;
    // const download = 0;
    // const total = 25 * 1024 * 1024 * 1024; // 25GB

    // // expired demo
    // const expire = Math.floor(Date.now() / 1000) - 60;

    // res.setHeader(
    //   'Subscription-Userinfo',
    //   `upload=${upload}; download=${download}; total=${total}; expire=${expire}`
    // );
    // res.setHeader('Subscription-Userinfo', 'upload=0; download=0; total=0; ');
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Pragma', 'no-cache');
    res.send(base64);
  } catch (error) {
    console.error('getSubscription error:', error);
    res.status(500).send('');
  }
};
