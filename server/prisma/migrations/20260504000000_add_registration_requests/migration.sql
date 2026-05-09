-- CreateEnum
CREATE TYPE "RegStatus" AS ENUM ('pending', 'approved', 'rejected');

-- CreateTable
CREATE TABLE "registration_requests" (
    "id" TEXT NOT NULL,
    "orgName" TEXT NOT NULL,
    "orgType" "OrgType" NOT NULL,
    "submittedCategory" TEXT NOT NULL,
    "foundingMembers" JSONB NOT NULL,
    "meetingDates" JSONB NOT NULL,
    "fileUrls" JSONB NOT NULL,
    "status" "RegStatus" NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "registration_requests_pkey" PRIMARY KEY ("id")
);
