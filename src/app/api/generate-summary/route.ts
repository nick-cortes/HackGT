import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@/generated/prisma';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const { publicationId, patientId } = await request.json();

    if (!publicationId || !patientId) {
      return NextResponse.json({ error: 'Missing publicationId or patientId' }, { status: 400 });
    }

    // Check if summary already exists
    const existingSummary = await prisma.generatedSummaries.findFirst({
      where: {
        publicationID: publicationId,
        patientID: patientId,
      },
    });

    if (existingSummary) {
      return NextResponse.json(existingSummary);
    }

    // Fetch publication and patient data
    const publication = await prisma.publication.findUnique({
      where: { id: publicationId },
      include: { drug: true },
    });

    const patient = await prisma.patient.findUnique({
      where: { id: patientId },
    });

    if (!publication || !patient) {
      return NextResponse.json({ error: 'Publication or patient not found' }, { status: 404 });
    }

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

    // Call Gemini API
    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (!geminiApiKey) {
      return NextResponse.json({ error: 'Gemini API key not configured' }, { status: 500 });
    }

    const prompt = `Analyze this medical research publication for a specific patient.

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

    Provide your analysis in this exact JSON format:
    {
    "impactScore": 3,
    "summary": "Brief summary here",
    "relevanceSummary": "Patient relevance analysis here"
    }

    Respond with ONLY the JSON object.`;

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

    const data = await response.json();
    console.log('Gemini API response:', JSON.stringify(data, null, 2));
    
    const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!generatedText) {
      console.error('No generated text in response:', data);
      throw new Error('No response from Gemini API');
    }

    // Parse the JSON response
    let parsedResponse;
    try {
      console.log('Generated text from Gemini:', generatedText);
      
      // Extract JSON from the response (in case there's extra text)
      const jsonMatch = generatedText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        console.log('Extracted JSON:', jsonMatch[0]);
        parsedResponse = JSON.parse(jsonMatch[0]);
      } else {
        console.error('No JSON found in response:', generatedText);
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      console.error('Failed to parse Gemini response:', generatedText);
      console.error('Parse error:', parseError);
      throw new Error('Failed to parse AI response');
    }

    // Validate the response structure
    if (!parsedResponse.impactScore || !parsedResponse.summary || !parsedResponse.relevanceSummary) {
      console.error('Invalid response structure:', parsedResponse);
      throw new Error('Invalid response structure from AI');
    }

    // Ensure impactScore is within valid range
    if (parsedResponse.impactScore < 1 || parsedResponse.impactScore > 5) {
      parsedResponse.impactScore = Math.max(1, Math.min(5, parsedResponse.impactScore));
    }

    // Store the generated summary in the database
    const generatedSummary = await prisma.generatedSummaries.create({
      data: {
        impactScore: parsedResponse.impactScore,
        summary: parsedResponse.summary,
        relevanceSummary: parsedResponse.relevanceSummary,
        publicationID: publicationId,
        patientID: patientId,
      },
    });

    return NextResponse.json(generatedSummary);

  } catch (error) {
    console.error('Error generating summary:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
    return NextResponse.json(
      { 
        error: 'Failed to generate summary',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
