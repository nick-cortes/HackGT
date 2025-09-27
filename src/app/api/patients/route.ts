import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    console.log('Starting patients API call...');
    
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const limit = searchParams.get('limit');

    console.log('Search params:', { search, limit });

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
    const queryOptions: any = {
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
    };

    // Add limit if specified
    if (limit) {
      queryOptions.take = parseInt(limit);
    }

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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }

    const patient = await prisma.patient.create({
      data: {
        name,
      },
      include: {
        prescriptions: {
          include: {
            drug: true,
          },
        },
      },
    });

    return NextResponse.json(patient, { status: 201 });
  } catch (error) {
    console.error('Error creating patient:', error);
    return NextResponse.json(
      { error: 'Failed to create patient' },
      { status: 500 }
    );
  }
}