import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@/generated/prisma';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const { publicationIds, patientId } = await request.json();
    
    console.log('Batch summaries request:', { publicationIds, patientId });

    if (!publicationIds || !Array.isArray(publicationIds) || !patientId) {
      console.error('Invalid request parameters:', { publicationIds, patientId });
      return NextResponse.json({ error: 'Missing publicationIds array or patientId' }, { status: 400 });
    }

    // Fetch patient data once
    const patient = await prisma.patient.findUnique({
      where: { id: patientId },
    });

    if (!patient) {
      console.error('Patient not found:', patientId);
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
    }
    
    console.log('Patient found:', patient.name);

    // Calculate age from date of birth
    const age = patient.dateOfBirth 
      ? Math.floor((Date.now() - patient.dateOfBirth.getTime()) / (365.25 * 24 * 60 * 60 * 1000))
      : null;

    // Prepare patient context
    const patientContext = {
      name: patient.name,
      age: age,
      sex: patient.sex,
      height: patient.height,
      weight: patient.weight,
    };

    // Format patient conditions (simplified for now)
    const conditionsList = 'None specified';

    // Fetch all publications
    const publications = await prisma.publication.findMany({
      where: { id: { in: publicationIds } },
      include: { drug: true },
    });

    console.log('Found publications:', publications.length);

    if (publications.length === 0) {
      console.error('No publications found for IDs:', publicationIds);
      return NextResponse.json({ error: 'No publications found' }, { status: 404 });
    }

    // Check which summaries already exist
    const existingSummaries = await prisma.generatedSummaries.findMany({
      where: {
        publicationID: { in: publicationIds },
        patientID: patientId,
      },
    });

    const existingSummaryIds = new Set(existingSummaries.map(s => s.publicationID));
    const publicationsToProcess = publications.filter(pub => !existingSummaryIds.has(pub.id));

    console.log('Existing summaries:', existingSummaries.length);
    console.log('Publications to process:', publicationsToProcess.length);

    if (publicationsToProcess.length === 0) {
      // All summaries already exist, return them
      console.log('All summaries already exist, returning existing ones');
      return NextResponse.json(existingSummaries);
    }

    // Process publications in batches to avoid overwhelming the API
    const batchSize = 3; // Process 3 publications at a time
    const results = [];

    console.log('Starting batch processing of', publicationsToProcess.length, 'publications');

    for (let i = 0; i < publicationsToProcess.length; i += batchSize) {
      const batch = publicationsToProcess.slice(i, i + batchSize);
      console.log(`Processing batch ${Math.floor(i/batchSize) + 1}:`, batch.map(p => p.id));
      
      // Process batch concurrently
      const batchPromises = batch.map(async (publication) => {
        try {
          console.log(`Processing publication ${publication.id}: ${publication.title}`);
          return await generateSummaryForPublication(publication, patientContext, conditionsList, patientId);
        } catch (error) {
          console.error(`Error processing publication ${publication.id}:`, error);
          return null; // Return null for failed publications
        }
      });

      const batchResults = await Promise.all(batchPromises);
      const successfulResults = batchResults.filter(result => result !== null);
      results.push(...successfulResults);
      console.log(`Batch ${Math.floor(i/batchSize) + 1} completed: ${successfulResults.length} successful, ${batchResults.length - successfulResults.length} failed`);

      // Add a small delay between batches to be respectful to the API
      if (i + batchSize < publicationsToProcess.length) {
        console.log('Waiting 1 second before next batch...');
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    // Combine with existing summaries
    const allSummaries = [...existingSummaries, ...results];

    return NextResponse.json(allSummaries);

  } catch (error) {
    console.error('Error generating batch summaries:', error);
    return NextResponse.json(
      { 
        error: 'Failed to generate batch summaries',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

async function generateSummaryForPublication(publication: any, patientContext: any, conditionsList: string, patientId: string) {
  console.log(`Starting Gemini processing for publication ${publication.id}`);
  
  const geminiApiKey = process.env.GEMINI_API_KEY;
  if (!geminiApiKey) {
    throw new Error('Gemini API key not configured');
  }

  const prompt = `Analyze this medical research publication for a specific patient with their medical conditions.

  PUBLICATION:
  Title: ${publication.title}
  Abstract: ${publication.abstract}
  Drug: ${publication.drug.name}
  Published: ${publication.publishedDate.toISOString().split('T')[0]}

  PATIENT:
  Name: ${patientContext.name}
  Age: ${patientContext.age || 'Not specified'}
  Sex: ${patientContext.sex || 'Not specified'}
  Height: ${patientContext.height ? `${patientContext.height} cm` : 'Not specified'}
  Weight: ${patientContext.weight ? `${patientContext.weight} kg` : 'Not specified'}
  Medical Conditions: ${conditionsList}

  Consider how this publication's findings relate to the patient's specific medical conditions, demographics, and the drug being studied. Analyze contraindications, drug interactions, efficacy considerations, and safety concerns specific to this patient's profile.
  A publication is almost guaranteed to discuss a drug that treats one of the patient's conditions, because of the way our tool works, so that alone is not enough to make it a relevant publication. Rather, a relevant publication might discuss a new side effect of the drug recently observed, for example.
  Try to limit the length of your relevance response to somewhere near the length of the summary you create.
  Use plaintext formatting, nothing like markdown, don't try to do any special formatting to text and don't do any HTML encoding.

  Provide your analysis in this exact JSON format:
  {
  "impactScore": 1-5 inclusive,
  "summary": "Brief summary here",
  "relevanceSummary": "Patient relevance analysis here"
  }

  Respond with ONLY the JSON object.`;

  console.log(`Calling Gemini API for publication ${publication.id}`);
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [{
        parts: [{
          text: prompt
        }]
      }]
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Gemini API error:', response.status, response.statusText, errorText);
    throw new Error(`Gemini API error: ${response.status} ${response.statusText}`);
  }
  
  console.log(`Gemini API response received for publication ${publication.id}`);

  const data = await response.json();
  const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text;
  
  if (!generatedText) {
    throw new Error('No response from Gemini API');
  }

  // Parse the JSON response
  let parsedResponse;
  try {
    const jsonMatch = generatedText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      parsedResponse = JSON.parse(jsonMatch[0]);
    } else {
      throw new Error('No JSON found in response');
    }
  } catch (parseError) {
    console.error('Failed to parse Gemini response:', generatedText);
    throw new Error('Failed to parse AI response');
  }

  // Validate the response structure
  if (!parsedResponse.impactScore || !parsedResponse.summary || !parsedResponse.relevanceSummary) {
    throw new Error('Invalid response structure from AI');
  }

  // Ensure impactScore is within valid range
  if (parsedResponse.impactScore < 1 || parsedResponse.impactScore > 5) {
    parsedResponse.impactScore = Math.max(1, Math.min(5, parsedResponse.impactScore));
  }

  // Store the generated summary in the database
  console.log(`Storing summary in database for publication ${publication.id}`);
  const generatedSummary = await prisma.generatedSummaries.create({
    data: {
      impactScore: parsedResponse.impactScore,
      summary: parsedResponse.summary,
      relevanceSummary: parsedResponse.relevanceSummary,
      publicationID: publication.id,
      patientID: patientId,
    },
  });

  console.log(`Successfully processed publication ${publication.id} with impact score ${parsedResponse.impactScore}`);
  return generatedSummary;
}
