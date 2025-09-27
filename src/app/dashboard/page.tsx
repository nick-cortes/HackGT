'use client';

import { useState, useEffect } from 'react';
import { Inter } from "next/font/google";
import { ClockIcon } from "@heroicons/react/24/outline";
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
          title: `Start of ${prescription.drug.name}`,
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
    <div className="h-screen bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800 flex overflow-hidden relative">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl animate-pulse" style={{animationDelay: '1s'}}></div>
      </div>
      
      {/* Sidebar */}
      <div className="w-80 bg-gray-800/90 backdrop-blur-xl shadow-2xl border-r border-gray-700/50 relative z-10">
        <div className="p-6 border-b border-gray-700/50 bg-gradient-to-r from-gray-800/50 to-gray-700/30">
          <button 
            onClick={() => router.push('/')}
            className="text-2xl font-bold bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent hover:scale-105 transition-all duration-300 cursor-pointer"
            style={{ fontFamily: inter.style.fontFamily }}
          >
            ChronologiCare
          </button>
        </div>
        
        <div className="p-6">
          {/* Patient List */}
          <div>
            {patients.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-400">No patients found</p>
                <p className="text-gray-500 text-sm mt-1">Add some patients to get started</p>
              </div>
            ) : (
              <div className="space-y-1">
                {patients.map((patient) => (
                  <div key={patient.id}>
                    {/* Patient Button */}
                    <button
                      onClick={() => {
                        setSelectedPatientId(patient.id === selectedPatientId ? '' : patient.id);
                        setSelectedDrugId(''); // Reset drug selection when patient changes
                      }}
                      className={`group w-full text-left px-4 py-3 rounded-xl transition-all duration-300 transform hover:scale-[1.02] ${
                        selectedPatientId === patient.id
                          ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-lg shadow-indigo-500/25 border border-indigo-400/30'
                          : 'hover:bg-gray-700/70 text-gray-300 hover:shadow-lg hover:shadow-gray-900/20'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ${
                            selectedPatientId === patient.id 
                              ? 'bg-white/20 text-white' 
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
                        <div className="flex items-center space-x-2">
                          <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                            selectedPatientId === patient.id 
                              ? 'bg-white/20 text-white' 
                              : 'bg-gray-600 text-gray-300 group-hover:bg-gray-500'
                          }`}>
                            {patient.prescriptions.length}
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
                      </div>
                    </button>

                    {/* Drug Options - Show when patient is selected */}
                    {selectedPatientId === patient.id && patient.prescriptions.length > 0 && (
                      <div className="ml-4 mt-2 space-y-1">
                        {/* All Drugs Option */}
                        <button
                          onClick={() => setSelectedDrugId('')}
                          className={`group w-full text-left px-4 py-3 text-sm rounded-lg transition-all duration-300 transform hover:scale-[1.01] ${
                            selectedDrugId === ''
                              ? 'bg-gradient-to-r from-purple-600 to-purple-700 text-white shadow-lg shadow-purple-500/25'
                              : 'hover:bg-gray-700/70 text-gray-300 hover:shadow-md'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-300 ${
                              selectedDrugId === '' 
                                ? 'bg-white/20 text-white' 
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
                            className={`group w-full text-left px-4 py-3 text-sm rounded-lg transition-all duration-300 transform hover:scale-[1.01] ${
                              selectedDrugId === drug.id
                                ? 'bg-gradient-to-r from-purple-600 to-purple-700 text-white shadow-lg shadow-purple-500/25'
                                : 'hover:bg-gray-700/70 text-gray-300 hover:shadow-md'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-300 ${
                                selectedDrugId === drug.id 
                                  ? 'bg-white/20 text-white' 
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
      <div className="flex-1 p-8 min-w-0 overflow-y-auto bg-transparent relative z-10">
        {selectedPatient ? (
          <div className="flex flex-col h-full">
            <div className="mb-8 bg-gray-800/40 backdrop-blur-xl rounded-2xl p-6 border border-gray-700/30 shadow-2xl">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-lg hover:shadow-indigo-500/25 transition-all duration-300 hover:scale-110">
                  <ClockIcon className="w-6 h-6 text-white animate-pulse" />
                </div>
                <div>
                  <h2 className="text-3xl font-bold text-white">
                    {selectedPatient.name}&apos;s Timeline
                  </h2>
                  <div className="flex items-center gap-2 mt-2">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                    <span className="text-gray-400 text-sm">Real-time research tracking</span>
                  </div>
                </div>
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
                    Showing publications for all medications (<span className="text-indigo-300 font-semibold">{availableDrugs.length} total</span>)
                  </p>
                </div>
              )}
            </div>
            
            {/* Timeline */}
            {publicationsLoading ? (
              <div className="flex flex-1 items-center justify-center bg-gray-800/40 backdrop-blur-xl rounded-2xl border border-gray-700/30 shadow-2xl">
                <div className="text-center">
                  <div className="relative">
                    <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-500/30 mx-auto"></div>
                    <div className="animate-spin rounded-full h-12 w-12 border-4 border-t-purple-500 border-r-pink-500 absolute top-0 left-1/2 transform -translate-x-1/2" style={{animationDirection: 'reverse'}}></div>
                  </div>
                  <div className="mt-4 space-y-2">
                    <p className="text-gray-200 font-medium">Analyzing publications...</p>
                    <div className="flex justify-center space-x-1">
                      <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                      <div className="w-2 h-2 bg-pink-500 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                    </div>
                  </div>
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
            <div className="text-center bg-gray-800/40 backdrop-blur-xl rounded-2xl p-12 border border-gray-700/30 shadow-2xl max-w-md">
              <div className="w-24 h-24 bg-gradient-to-br from-indigo-500/20 to-purple-600/20 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
                <svg className="w-12 h-12 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-200 mb-2">Welcome to Patient Dashboard</h3>
              <p className="text-gray-400 mb-4">Select a patient from the sidebar to view their research timeline</p>
              <div className="flex items-center justify-center gap-2 text-gray-500 text-sm">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
                <span>Get started by choosing a patient</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}