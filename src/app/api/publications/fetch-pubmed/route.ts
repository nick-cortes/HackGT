import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

type DrugWithRelations = {
  id: string;
  name: string;
  prescriptions: Array<{
    startDate: Date;
  }>;
  publications: Array<{
    publishedDate: Date;
  }>;
};

// Simple PubMed API integration
async function fetchPubMedArticles(drugName: string, publishedAfter: Date, limit: number = 5) {
  try {
    // Format date for PubMed search (YYYY/MM/DD)
    const dateStr = publishedAfter.toISOString().split('T')[0].replace(/-/g, '/');
    
    // Search query for PubMed
    const searchQuery = `(${drugName}[Title] OR ${drugName}[MeSH Terms]) AND ("${dateStr}"[Publication Date] : "3000"[Publication Date]) AND "free full text"[Filter]`;
    const encodedQuery = encodeURIComponent(searchQuery);
    
    console.log('PubMed search query:', searchQuery);
    
    // Step 1: Search for article IDs
    const searchUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=${encodedQuery}&retmax=${limit}&retmode=json&sort=pub+date`;
    
    const searchResponse = await fetch(searchUrl);
    if (!searchResponse.ok) {
      throw new Error(`PubMed search failed: ${searchResponse.status}`);
    }
    
    const searchData = await searchResponse.json();
    const articleIds = searchData.esearchresult?.idlist || [];
    
    if (articleIds.length === 0) {
      return [];
    }
    
    console.log(`Found ${articleIds.length} PubMed articles`);
    
    // Step 2: Fetch article details (summary for basic info)
    const detailsUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&id=${articleIds.join(',')}&retmode=json`;
    
    const detailsResponse = await fetch(detailsUrl);
    if (!detailsResponse.ok) {
      throw new Error(`PubMed details fetch failed: ${detailsResponse.status}`);
    }
    
    const detailsData = await detailsResponse.json();
    
    // Step 3: Fetch full abstracts using efetch
    const fetchUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pubmed&id=${articleIds.join(',')}&retmode=xml`;
    
    const fetchResponse = await fetch(fetchUrl);
    if (!fetchResponse.ok) {
      throw new Error(`PubMed efetch failed: ${fetchResponse.status}`);
    }
    
    const xmlText = await fetchResponse.text();
    const articles = [];
    
    for (const id of articleIds) {
      const article = detailsData.result?.[id];
      if (article) {
        // Extract abstract from XML
        let abstract = '';
        const abstractMatch = xmlText.match(new RegExp(`<PMID.*?>${id}</PMID>.*?<Abstract>(.*?)</Abstract>`, 's'));
        if (abstractMatch) {
          // Clean up XML tags from abstract
          abstract = abstractMatch[1]
            .replace(/<AbstractText.*?>/g, '')
            .replace(/<\/AbstractText>/g, ' ')
            .replace(/<.*?>/g, '')
            .replace(/\s+/g, ' ')
            .trim();
        }
        
        articles.push({
          title: (article.title as string) || 'Unknown Title',
          url: `https://pubmed.ncbi.nlm.nih.gov/${id}/`,
          publishedDate: article.pubdate ? new Date(article.pubdate as string) : new Date(),
          pmid: id,
          abstract: abstract || 'Abstract not available'
        });
      }
    }
    
    return articles;
  } catch (error) {
    console.error('PubMed API error:', error);
    return [];
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { patientId, drugId } = body;
    
    if (!patientId && !drugId) {
      return NextResponse.json(
        { error: 'Either patientId or drugId is required' },
        { status: 400 }
      );
    }
    
    let drugsToCheck: DrugWithRelations[] = [];
    
    if (drugId) {
      // Single drug
      const drug = await prisma.drug.findUnique({
        where: { id: drugId },
        include: {
          prescriptions: {
            orderBy: { startDate: 'asc' },
            take: 1,
          },
          publications: {
            orderBy: { publishedDate: 'desc' },
            take: 1,
          },
        },
      });
      
      if (drug) {
        drugsToCheck.push(drug);
      }
    } else {
      // All drugs for patient
      const patient = await prisma.patient.findUnique({
        where: { id: patientId },
        include: {
          prescriptions: {
            include: {
              drug: {
                include: {
                  prescriptions: {
                    orderBy: { startDate: 'asc' },
                    take: 1,
                  },
                  publications: {
                    orderBy: { publishedDate: 'desc' },
                    take: 1,
                  },
                },
              },
            },
          },
        },
      });
      
      if (patient) {
        drugsToCheck = patient.prescriptions.map(p => p.drug);
      }
    }
    
    let totalNewPublications = 0;
    const results = [];
    
    for (const drug of drugsToCheck) {
      try {
        // Get the search start date (latest of prescription start or last publication)
        const prescriptionStartDate = drug.prescriptions[0]?.startDate;
        const lastPublicationDate = drug.publications[0]?.publishedDate;
        
        if (!prescriptionStartDate) {
          console.log(`Skipping ${drug.name} - no prescriptions found`);
          continue;
        }
        
        // Search from the later of: prescription start date or last publication date
        const searchFromDate = lastPublicationDate && lastPublicationDate > prescriptionStartDate
          ? lastPublicationDate
          : prescriptionStartDate;
        
        console.log(`Searching for ${drug.name} publications after ${searchFromDate}`);
        
        // Fetch from PubMed
        const articles = await fetchPubMedArticles(drug.name, searchFromDate, 7);
        
        // Save new publications to database
        let savedCount = 0;
        for (const article of articles) {
          try {
            // Check if publication already exists
            const existingPub = await prisma.publication.findFirst({
              where: {
                OR: [
                  { url: article.url },
                  { title: article.title, drugID: drug.id },
                ],
              },
            });
            
            if (!existingPub) {
              await prisma.publication.create({
                data: {
                  title: article.title,
                  url: article.url,
                  publishedDate: article.publishedDate,
                  summary: '', // Empty summary for now
                  drugID: drug.id,
                  abstract: article.abstract
                },
              });
              savedCount++;
            }
          } catch (error) {
            console.error('Error saving publication:', error);
          }
        }
        
        totalNewPublications += savedCount;
        results.push({
          drugId: drug.id,
          drugName: drug.name,
          newPublications: savedCount,
        });
        
        console.log(`Added ${savedCount} new publications for ${drug.name}`);
        
      } catch (error) {
        console.error(`Error processing drug ${drug.name}:`, error);
      }
    }
    
    return NextResponse.json({
      success: true,
      totalNewPublications,
      results,
      message: `Found ${totalNewPublications} new publications`,
    });
    
  } catch (error) {
    console.error('Error in PubMed fetch:', error);
    return NextResponse.json(
      { error: 'Failed to fetch publications' },
      { status: 500 }
    );
  }
}