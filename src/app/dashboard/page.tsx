'use client';

import { useState, useEffect } from 'react';

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

export default function Dashboard() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPatients = async () => {
      try {
        const response = await fetch('/api/patients');
        if (!response.ok) {
          throw new Error('Failed to fetch patients');
        }
        const data = await response.json();
        setPatients(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchPatients();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading patients...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600">Error: {error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Patient Dashboard</h1>
        
        <div className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">
            All Patients ({patients.length})
          </h2>
          
          {patients.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-8 text-center">
              <p className="text-gray-500 text-lg">No patients found</p>
              <p className="text-gray-400 mt-2">Add some patients to get started</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {patients.map((patient) => (
                <div key={patient.id} className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow">
                  <h3 className="text-xl font-semibold text-gray-800 mb-2">
                    {patient.name}
                  </h3>
                  <p className="text-gray-600 mb-4">
                    Patient ID: {patient.id}
                  </p>
                  
                  <div className="border-t pt-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">
                      Prescriptions ({patient.prescriptions.length})
                    </h4>
                    {patient.prescriptions.length === 0 ? (
                      <p className="text-gray-400 text-sm">No prescriptions</p>
                    ) : (
                      <div className="space-y-2">
                        {patient.prescriptions.slice(0, 3).map((prescription) => (
                          <div key={prescription.id} className="text-sm">
                            <p className="font-medium text-gray-800">
                              {prescription.drug.name}
                            </p>
                            <p className="text-gray-500">
                              Started: {new Date(prescription.startDate).toLocaleDateString()}
                            </p>
                          </div>
                        ))}
                        {patient.prescriptions.length > 3 && (
                          <p className="text-gray-400 text-sm">
                            +{patient.prescriptions.length - 3} more prescriptions
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
