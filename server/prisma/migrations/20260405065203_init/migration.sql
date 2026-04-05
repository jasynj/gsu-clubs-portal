/*
  Warnings:

  - You are about to drop the `org_admins` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `passwordHash` to the `organizations` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "org_admins" DROP CONSTRAINT "org_admins_orgId_fkey";

-- AlterTable
ALTER TABLE "organizations" ADD COLUMN     "passwordHash" TEXT NOT NULL;

-- DropTable
DROP TABLE "org_admins";
