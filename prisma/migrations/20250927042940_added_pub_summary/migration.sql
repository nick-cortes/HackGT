/*
  Warnings:

  - Added the required column `summary` to the `Publication` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."Publication" ADD COLUMN     "summary" TEXT NOT NULL;
