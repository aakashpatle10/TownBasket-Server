import express from "express";
import { AuthRoutes } from "../modules/auth/auth.route.js";
import { PermissionRoutes } from "../modules/permission/permission.route.js";
import { RoleRoutes } from "../modules/role/role.route.js";
import { UserRoutes } from "../modules/user/user.route.js";
import { ShopRoutes } from '../modules/shop/shop.route.js';
import { ProductRoutes } from '../modules/products/product.route.js';
import { CartRoutes } from '../modules/cart/cart.route.js';
import { AddressRoutes } from '../modules/address/address.route.js';
import { OrderRoutes } from '../modules/order/order.route.js';
import { ReviewRoutes } from '../modules/review/review.route.js';
import { NotificationRoutes } from '../modules/notification/notification.route.js';
import { DeliveryAvailabilityRoutes } from '../modules/delivery/deliveryAvailability.route.js';
import { SocialRoutes } from '../modules/social/social.route.js';
import { StorefrontRoutes } from '../modules/storefront/storefront.route.js';
import { SellerDashboardRoutes } from '../modules/sellerDashboard/sellerDashboard.route.js';
import { AdminDashboardRoutes } from '../modules/adminDashboard/adminDashboard.route.js';
import { RecommendationRoutes } from '../modules/recommendation/recommendation.route.js';
import { ModerationRoutes } from '../modules/moderation/moderation.route.js';

const router = express.Router();

const moduleRoutes = [
  {
    path: "/auth",
    route: AuthRoutes,
  },
  {
    path: "/users",
    route: UserRoutes,
  },
  {
    path: "/roles",
    route: RoleRoutes,
  },
  {
    path: "/permissions",
    route: PermissionRoutes,
  },
  {
    path: "/shops",
    route: ShopRoutes,
  },
  {
    path: "/products",
    route: ProductRoutes,
  },
  {
    path: "/cart",
    route: CartRoutes,
  },
  {
    path: "/addresses",
    route: AddressRoutes,
  },
  {
    path: "/orders",
    route: OrderRoutes,
  },
  {
    path: "/reviews",
    route: ReviewRoutes,
  },
  {
    path: "/notifications",
    route: NotificationRoutes,
  },
  {
    path: "/delivery",
    route: DeliveryAvailabilityRoutes,
  },
  {
    path: "/social",
    route: SocialRoutes,
  },
  {
    path: "/storefront",
    route: StorefrontRoutes,
  },
  {
    path: "/seller-dashboard",
    route: SellerDashboardRoutes,
  },
  {
    path: "/admin-dashboard",
    route: AdminDashboardRoutes,
  },
  {
    path: "/recommendations",
    route: RecommendationRoutes,
  },
  {
    path: "/moderation",
    route: ModerationRoutes,
  }
];

moduleRoutes.forEach((route) => {
  router.use(route.path, route.route);
});

export default router;
