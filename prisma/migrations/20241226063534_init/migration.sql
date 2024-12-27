-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "vector";

-- CreateEnum
CREATE TYPE "EmbeddingType" AS ENUM ('SUMMARY', 'FULL');

-- CreateTable
CREATE TABLE "Embedding" (
    "id" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "rawContent" TEXT NOT NULL,
    "type" "EmbeddingType",
    "embedding" vector(768),
    "url" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Embedding_pkey" PRIMARY KEY ("id")
);
