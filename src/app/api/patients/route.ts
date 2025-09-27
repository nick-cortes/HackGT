import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@/generated/prisma';

export async function GET(request: NextRequest) {
  try {
    console.log('Starting patients API call...');
    
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');

    console.log('Search params:', { search });

    // Build where clause for search functionality
    const whereClause = search
      ? {
          name: {
            contains: search,
            mode: 'insensitive' as const,
          },
        }
      : {};

    console.log('Where clause:', whereClause);

    // Build query options
    const queryOptions = {
      where: whereClause,
      include: {
        prescriptions: {
          include: {
            drug: true,
          },
          orderBy: {
            startDate: 'desc',
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    } satisfies Prisma.PatientFindManyArgs;

    console.log('Query options:', JSON.stringify(queryOptions, null, 2));

    const patients = await prisma.patient.findMany(queryOptions);
    console.log('Found patients:', patients.length);

    return NextResponse.json(patients);
  } catch (error) {
    console.error('Detailed error fetching patients:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      error: error
    });
    return NextResponse.json(
      { 
        error: 'Failed to fetch patients',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}