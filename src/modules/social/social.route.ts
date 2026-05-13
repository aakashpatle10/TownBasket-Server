import express from 'express';
import { SYSTEM_ROLES } from '../../constants/permissions.js';
import { authMiddleware, requireRoles } from '../../middlewares/auth.middleware.js';
import { upload } from '../../middlewares/upload.middleware.js';
import { SocialController } from './social.controller.js';

const router = express.Router();

router.get('/feed', authMiddleware, SocialController.getCombinedFeed);

router.post(
  '/posts',
  authMiddleware,
  requireRoles(SYSTEM_ROLES.SELLER),
  upload.fields([{ name: 'images', maxCount: 10 }]),
  SocialController.createPost
);
router.get('/posts', authMiddleware, SocialController.getPostsFeed);
router.get('/posts/:id', SocialController.getSinglePost);
router.patch(
  '/posts/:id',
  authMiddleware,
  requireRoles(SYSTEM_ROLES.SELLER),
  upload.fields([{ name: 'images', maxCount: 10 }]),
  SocialController.updatePost
);
router.delete('/posts/:id', authMiddleware, requireRoles(SYSTEM_ROLES.SELLER), SocialController.deletePost);
router.post('/posts/:id/like', authMiddleware, requireRoles(SYSTEM_ROLES.BUYER), SocialController.togglePostLike);
router.post('/posts/:id/comments', authMiddleware, requireRoles(SYSTEM_ROLES.BUYER), SocialController.commentOnPost);

router.post(
  '/reels',
  authMiddleware,
  requireRoles(SYSTEM_ROLES.SELLER),
  upload.fields([
    { name: 'video', maxCount: 1 },
    { name: 'thumbnail', maxCount: 1 },
  ]),
  SocialController.createReel
);
router.get('/reels', authMiddleware, SocialController.getReelsFeed);
router.get('/reels/seller/:sellerId', SocialController.getSellerReels);
router.post('/reels/:id/like', authMiddleware, requireRoles(SYSTEM_ROLES.BUYER), SocialController.toggleReelLike);
router.post('/reels/:id/comments', authMiddleware, requireRoles(SYSTEM_ROLES.BUYER), SocialController.commentOnReel);
router.post('/reels/:id/share', authMiddleware, SocialController.shareReel);
router.post('/reels/:id/view', SocialController.registerReelView);

router.post('/sellers/:sellerId/follow', authMiddleware, requireRoles(SYSTEM_ROLES.BUYER), SocialController.followSeller);
router.delete('/sellers/:sellerId/follow', authMiddleware, requireRoles(SYSTEM_ROLES.BUYER), SocialController.unfollowSeller);
router.get('/sellers/:sellerId/followers', SocialController.getFollowers);
router.get('/following', authMiddleware, requireRoles(SYSTEM_ROLES.BUYER), SocialController.getFollowing);

export const SocialRoutes = router;

