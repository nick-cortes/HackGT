import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@/generated/prisma';

export async function GET(request: NextRequest) {
  try {
    console.log('Starting publications API call...');
    
    const { searchParams } = new URL(request.url);
    const drugId = searchParams.get('drugId');

    // Build where clause for drug filtering
    const whereClause = drugId
      ? {
          drugID: drugId,
        }
      : {};

    console.log('Where clause:', whereClause);

    // Build query options
    const queryOptions = {
      where: whereClause,
      include: {
        drug: true,
      },
      orderBy: {
        publishedDate: 'desc',
      },
    } satisfies Prisma.PublicationFindManyArgs;

    console.log('Query options:', JSON.stringify(queryOptions, null, 2));

    const publications = await prisma.publication.findMany(queryOptions);
    console.log('Found publications:', publications.length);

    return NextResponse.json(publications);
  } catch (error) {
    console.error('Detailed error fetching publications:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      error: error
    });
    return NextResponse.json(
      { 
        error: 'Failed to fetch publications',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
