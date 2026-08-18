import { Response, NextFunction } from 'express';
import { Interest } from '../models/Interest';
import { AuthRequest } from '../middleware/authMiddleware';

export async function createInterest(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { receiverId } = req.body;
    if (!receiverId) {
      return res.status(400).json({ success: false, message: 'Receiver is required' });
    }
    const existing = await Interest.findOne({ sender: req.user?.userId, receiver: receiverId });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Interest already sent' });
    }

    const interest = await Interest.create({ sender: req.user?.userId, receiver: receiverId });
    res.status(201).json({ success: true, data: interest });
  } catch (error) {
    next(error);
  }
}

export async function updateInterest(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { status } = req.body;
    const interest = await Interest.findById(req.params.id);
    if (!interest) {
      return res.status(404).json({ success: false, message: 'Interest not found' });
    }
    if (interest.receiver.toString() !== req.user?.userId && interest.sender.toString() !== req.user?.userId) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }
    if (status) interest.status = status;
    await interest.save();
    res.json({ success: true, data: interest });
  } catch (error) {
    next(error);
  }
}

export async function getSentInterests(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const interests = await Interest.find({ sender: req.user?.userId }).populate('receiver', 'fullName');
    res.json({ success: true, data: interests });
  } catch (error) {
    next(error);
  }
}

export async function getReceivedInterests(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const interests = await Interest.find({ receiver: req.user?.userId }).populate('sender', 'fullName');
    res.json({ success: true, data: interests });
  } catch (error) {
    next(error);
  }
}
