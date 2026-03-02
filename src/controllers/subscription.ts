import { Request, Response } from "express";
import UserSchema from "../models/user-model";
import SubscriptionSchema from "../models/subscription-model";

export const getSubscription = async (req: Request, res: Response) => {
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
  // res.setHeader('Profile-Web-Page-Url', 'https://myvpn.com');https://assuring-strangely-flamingo.ngrok-free.app/subscription/23d5b93fcf664b28
  // res.setHeader('Profile-Icon-Url','https://myvpn.com/icon.png');
  res.setHeader('Subscription-Userinfo', 'upload=0; download=0; total=0');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Pragma', 'no-cache');
  res.send(base64);
};
