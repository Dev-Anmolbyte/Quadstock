import { Router } from "express";
import { addProduct, getProducts, updateProduct, deleteProduct, applyDiscount, getSmartExpiry } from "./product.controller.js";
import { authMiddleware, authorizeRoles } from "../../middleware/auth.middleware.js";
import { upload } from "../../middleware/multer.middleware.js";

const productRouter = Router();

// Products are usually accessible by both owner and staff, but modifications might be restricted
productRouter.use(authMiddleware);

productRouter.route("/")
    .post(authorizeRoles("owner"), upload.single("image"), addProduct)
    .get(getProducts);

productRouter.route("/smart-expiry")
    .get(getSmartExpiry);

productRouter.route("/bulk/discount")
    .put(authorizeRoles("owner", "staff"), applyDiscount); // Changed from owner-only so staff might use it, but can restrict.

productRouter.route("/:id")
    .put(authorizeRoles("owner"), upload.single("image"), updateProduct)
    .delete(authorizeRoles("owner"), deleteProduct);

productRouter.route("/:id/discount")
    .put(authorizeRoles("owner", "staff"), applyDiscount);

export default productRouter;
