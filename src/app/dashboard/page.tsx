'use client';

import { useState, useEffect } from 'react';
import { Inter } from "next/font/google";
import { useRouter } from 'next/navigation';
// Make sure to import the Timeline and its types/data
import Timeline, { Publication } from '@/components/Timeline';

// Configure the Inter font
const inter = Inter({ subsets: ["latin"] });

interface Patient {
  id: string;
  name: string;
  prescriptions: Array<{
    id: string;
    startDate: string;
    drug: {
      id: string;
      name: string;
    };
  }>;
}

interface ApiPublication {
  id: string;
  title: string;
  url: string;
  publishedDate: string;
  drugID: string;
  drug: {
    id:string;
    name: string;
  };
}

export default function Dashboard() {
  const router = useRouter();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPatientId, setSelectedPatientId] = useState<string>('');
  const [selectedDrugId, setSelectedDrugId] = useState<string>('');
  const [timelinePublications, setTimelinePublications] = useState<Publication[]>([]);
  const [publicationsLoading, setPublicationsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Fetch real patients from API
  useEffect(() => {
    const fetchPatients = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/patients');
        if (!response.ok) {
          throw new Error('Failed to fetch patients');
        }
        const data = await response.json();
        setPatients(data);
        if (data.length > 0) {
          setSelectedPatientId(data[0].id);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch patients');
        console.error('Error fetching patients:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchPatients();
  }, []);

  // Fetch publications when patient or drug selection changes
  useEffect(() => {
    const fetchPublications = async () => {
      if (!selectedPatientId) {
        setTimelinePublications([]);
        return;
      }

      try {
        setPublicationsLoading(true);
        const selectedPatient = patients.find(p => p.id === selectedPatientId);
        if (!selectedPatient) return;

        // STEP 1: Update database with publications from intern
        console.log('Step 1: Updating database with publications from intern...');
        try {
          const updateResponse = await fetch('/api/publications/fetch-pubmed', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ patientId: selectedPatientId, drugId: selectedDrugId }),
          });
          
          if (updateResponse.ok) {
            const updateResult = await updateResponse.json();
            console.log('Database updated with publications:', updateResult);
          } else {
            console.warn('Failed to update database with publications:', await updateResponse.text());
          }
        } catch (error) {
          console.error('Error updating database with publications:', error);
          // Continue with existing data even if update fails
        }

        // STEP 2: Search database for publications by drug
        console.log('Step 2: Searching database for publications by drug...');
        const drugIds = [...new Set(selectedPatient.prescriptions.map(p => p.drug.id))];
        
        // Fetch publications for each drug
        const allPublications: ApiPublication[] = [];
        for (const drugId of drugIds) {
          const response = await fetch(`/api/publications?drugId=${drugId}`);
          if (response.ok) {
            const publications = await response.json();
            allPublications.push(...publications);
          }
        }

        // STEP 3: Filter publications by date
        console.log('Step 3: Filtering publications by prescription start date...');
        const timelineData: Publication[] = allPublications
          .filter(pub => {
            // Find the prescription for this drug
            const prescription = selectedPatient.prescriptions.find(p => p.drug.id === pub.drugID);
            if (!prescription) return false;
            
            // Only include publications published after prescription start date
            const publicationDate = new Date(pub.publishedDate);
            const prescriptionStartDate = new Date(prescription.startDate);
            return publicationDate >= prescriptionStartDate;
          })
          .map(pub => ({
            id: pub.id,
            title: pub.drug.name,
            date: pub.publishedDate.split('T')[0], // Convert ISO date to YYYY-MM-DD
            pdfUrl: pub.url,
            summary: `Publication about ${pub.drug.name}`
          }));

        // Add prescription start markers
        const prescriptionMarkers: Publication[] = selectedPatient.prescriptions.map(prescription => ({
          id: `prescription-${prescription.id}`,
          title: `Started ${prescription.drug.name}`,
          date: prescription.startDate,
          pdfUrl: '#',
          summary: `Patient started taking ${prescription.drug.name} on ${prescription.startDate.split('T')[0]}`,
          isPrescriptionMarker: true
        }));

        // Combine publications and prescription markers
        const allTimelineData = [...timelineData, ...prescriptionMarkers];
        setTimelinePublications(allTimelineData);
      } catch (err) {
        console.error('Error fetching publications:', err);
        setTimelinePublications([]);
      } finally {
        setPublicationsLoading(false);
      }
    };

    fetchPublications();
  }, [selectedPatientId, selectedDrugId, patients]);

  const selectedPatient = patients.find(p => p.id === selectedPatientId);
  const availableDrugs = selectedPatient?.prescriptions.map(p => p.drug) || [];

  // Filter publications by selected drug if one is selected
  const filteredPublications = selectedDrugId 
    ? timelinePublications.filter(pub => {
        const selectedPatient = patients.find(p => p.id === selectedPatientId);
        const selectedDrug = selectedPatient?.prescriptions.find(p => p.drug.id === selectedDrugId)?.drug;
        return pub.summary.includes(selectedDrug?.name || '');
      })
    : timelinePublications;

  if (loading) {
    return (
      <div className="h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500 mx-auto"></div>
          <p className="mt-4 text-gray-300">Loading patients...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 mb-4">Error: {error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="px-4 py-2 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white rounded hover:from-indigo-600 hover:via-purple-600 hover:to-pink-600 transition-all duration-300"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-900 flex overflow-hidden">
      {/* Sidebar */}
      <div className="w-80 bg-gray-800 shadow-lg border-r border-gray-700">
        <div className="p-6 border-b border-gray-700 flex justify-center">
          <button 
            onClick={() => router.push('/')}
            className="text-2xl font-bold text-white hover:text-gray-300 transition-colors duration-200 cursor-pointer"
            style={{ fontFamily: inter.style.fontFamily }}
          >
            ChronologiCare
          </button>
        </div>
        
        <div className="p-6">
          {/* Search Bar */}
          <div className="mb-6">
            <div className="relative">
              <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search patients..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-gray-700/70 border border-gray-600/50 rounded-lg text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-300"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 hover:text-gray-200 transition-colors"
                >
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>
          
          {/* Patient List */}
          <div>
            {patients.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-400">No patients found</p>
                <p className="text-gray-500 text-sm mt-1">Add some patients to get started</p>
              </div>
            ) : patients.filter(patient => 
              patient.name.toLowerCase().includes(searchTerm.toLowerCase())
            ).length === 0 && searchTerm ? (
              <div className="text-center py-8">
                <p className="text-gray-400">No patients match your search</p>
                <p className="text-gray-500 text-sm mt-1">Try adjusting your search terms</p>
              </div>
            ) : (
              <div className="space-y-1">
                {patients.filter(patient => 
                  patient.name.toLowerCase().includes(searchTerm.toLowerCase())
                ).map((patient) => (
                  <div key={patient.id}>
                    {/* Patient Button */}
                    <button
                      onClick={() => {
                        setSelectedPatientId(patient.id === selectedPatientId ? '' : patient.id);
                        setSelectedDrugId(''); // Reset drug selection when patient changes
                      }}
                      className={`group w-full text-left px-4 py-3 rounded-lg transition-colors duration-200 border-2 ${
                        selectedPatientId === patient.id
                          ? 'bg-indigo-900/80 text-white border-indigo-600/80 shadow-lg shadow-indigo-900/20'
                          : 'hover:bg-gray-700 text-gray-300 border-transparent'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ${
                            selectedPatientId === patient.id 
                              ? 'bg-indigo-800/60 text-white' 
                              : 'bg-gray-600 text-gray-300 group-hover:bg-gray-500'
                          }`}>
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                          </div>
                          <div>
                            <span className="font-semibold text-lg">{patient.name}</span>
                            <div className={`text-xs mt-1 ${
                              selectedPatientId === patient.id ? 'text-indigo-200' : 'text-gray-400'
                            }`}>
                              {patient.prescriptions.length} Active Prescriptions
                            </div>
                          </div>
                        </div>
                        <svg
                          className={`h-5 w-5 transition-all duration-300 ${
                            selectedPatientId === patient.id ? 'rotate-90 text-white' : 'text-gray-400 group-hover:text-gray-300'
                          }`}
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </button>

                    {/* Drug Options - Show when patient is selected */}
                    {selectedPatientId === patient.id && patient.prescriptions.length > 0 && (
                      <div className="ml-4 mt-2 space-y-1">
                        {/* All Drugs Option */}
                        <button
                          onClick={() => setSelectedDrugId('')}
                          className={`group w-full text-left px-4 py-3 text-sm rounded-lg transition-colors duration-200 border-2 ${
                            selectedDrugId === ''
                              ? 'bg-purple-900/80 text-white border-purple-600/80 shadow-lg shadow-purple-900/20'
                              : 'hover:bg-gray-700 text-gray-300 border-transparent'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-300 ${
                              selectedDrugId === '' 
                                ? 'bg-purple-800/60 text-white' 
                                : 'bg-gray-600 text-gray-300 group-hover:bg-gray-500'
                            }`}>
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                              </svg>
                            </div>
                            <div>
                              <span className="font-medium">All Medications</span>
                              <div className={`text-xs mt-1 ${
                                selectedDrugId === '' ? 'text-purple-200' : 'text-gray-400'
                              }`}>
                                {patient.prescriptions.length} total
                              </div>
                            </div>
                          </div>
                        </button>
                        
                        {/* Individual Drug Options */}
                        {availableDrugs.map((drug) => (
                          <button
                            key={drug.id}
                            onClick={() => setSelectedDrugId(drug.id)}
                            className={`group w-full text-left px-4 py-3 text-sm rounded-lg transition-colors duration-200 border-2 ${
                              selectedDrugId === drug.id
                                ? 'bg-purple-900/80 text-white border-purple-600/80 shadow-lg shadow-purple-900/20'
                                : 'hover:bg-gray-700 text-gray-300 border-transparent'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-300 ${
                                selectedDrugId === drug.id 
                                  ? 'bg-purple-800/60 text-white' 
                                  : 'bg-gray-600 text-gray-300 group-hover:bg-gray-500'
                              }`}>
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                              </div>
                              <span className="font-medium">{drug.name}</span>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-8 min-w-0 overflow-y-auto bg-gray-900">
        {selectedPatient ? (
          <div className="flex flex-col h-full">
            <div className="mb-8 bg-gray-800 rounded-lg p-6 border border-gray-700">
              <div className="mb-4">
                <h2 className="text-3xl font-bold text-white">
                  {selectedPatient.name}&apos;s Timeline
                </h2>
              </div>
              {selectedDrugId && (
                <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-4">
                  <p className="text-gray-200 flex items-center gap-2">
                    <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                    Showing publications for: <span className="text-purple-300 font-semibold">{availableDrugs.find(d => d.id === selectedDrugId)?.name}</span>
                  </p>
                </div>
              )}
              {!selectedDrugId && (
                <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-lg p-4">
                  <p className="text-gray-200 flex items-center gap-2">
                    <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                    <span>Showing publications for all medications <span className="text-indigo-300 font-semibold">({availableDrugs.length} total)</span></span>
                  </p>
                </div>
              )}
            </div>
            
            {/* Timeline */}
            {publicationsLoading ? (
              <div className="flex flex-1 items-center justify-center bg-gray-800 rounded-lg border border-gray-700">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-indigo-500 border-t-transparent mx-auto"></div>
                  <p className="mt-4 text-gray-300">Loading publications...</p>
                </div>
              </div>
            ) : (
              <div className="flex-1">
                <Timeline publications={filteredPublications} />
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <h3 className="text-xl font-semibold text-gray-200 mb-2">Welcome to Patient Dashboard</h3>
              <p className="text-gray-400">Select a patient from the sidebar to view their research timeline</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}