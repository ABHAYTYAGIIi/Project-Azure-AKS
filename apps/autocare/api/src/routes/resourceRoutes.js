import { Router } from "express";

export function createResourceRoutes(controller) {
  const router = Router();
  router.route("/").get(controller.list).post(controller.create);
  router.route("/:id").get(controller.get).put(controller.update).delete(controller.remove);
  return router;
}
