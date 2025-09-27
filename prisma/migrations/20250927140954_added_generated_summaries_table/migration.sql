-- CreateTable
CREATE TABLE "public"."GeneratedSummaries" (
    "id" TEXT NOT NULL,
    "impactScore" INTEGER NOT NULL,
    "summary" TEXT NOT NULL,
    "relevanceSummary" TEXT NOT NULL,
    "publicationID" TEXT NOT NULL,
    "patientID" TEXT NOT NULL,

    CONSTRAINT "GeneratedSummaries_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "public"."GeneratedSummaries" ADD CONSTRAINT "GeneratedSummaries_publicationID_fkey" FOREIGN KEY ("publicationID") REFERENCES "public"."Publication"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."GeneratedSummaries" ADD CONSTRAINT "GeneratedSummaries_patientID_fkey" FOREIGN KEY ("patientID") REFERENCES "public"."Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
