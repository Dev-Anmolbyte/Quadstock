import { Router } from "express";
import { addProduct, getProducts, updateProduct, deleteProduct } from "./product.controller.js";
import { authMiddleware, authorizeRoles } from "../../middleware/auth.middleware.js";
import { upload } from "../../middleware/multer.middleware.js";

const productRouter = Router();

// Products are usually accessible by both owner and staff, but modifications might be restricted
productRouter.use(authMiddleware);

productRouter.route("/")
    .post(authorizeRoles("owner"), upload.single("image"), addProduct)
    .get(getProducts);

productRouter.route("/:id")
    .put(authorizeRoles("owner"), upload.single("image"), updateProduct)
    .delete(authorizeRoles("owner"), deleteProduct);

export default productRouter;
