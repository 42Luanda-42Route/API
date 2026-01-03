/*
  Warnings:

  - A unique constraint covering the columns `[type,route_id]` on the table `Chat` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Chat_type_route_id_key" ON "public"."Chat"("type", "route_id");
