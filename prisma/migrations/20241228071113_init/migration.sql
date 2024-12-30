/*
  Warnings:

  - You are about to drop the `Embedding` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
DROP TABLE "Embedding";

-- CreateTable
CREATE TABLE "embedding" (
    "id" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "rawContent" TEXT NOT NULL,
    "type" "EmbeddingType",
    "embedding" vector(768),
    "url" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "embedding_pkey" PRIMARY KEY ("id")
);
