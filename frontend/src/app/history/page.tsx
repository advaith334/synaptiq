"use client";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useRouter } from 'next/navigation';
import { Spacer } from '@/components/ui/spacer';
import { useEffect, useState } from "react";

export default function HistoryPage() {
  const router = useRouter();
  const [historyItems, setHistoryItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await fetch('http://localhost:5001/history');
        const data = await res.json();
        setHistoryItems(data);
      } catch (error) {
        console.error('Error fetching history:', error);
      } finally {
        setLoading(false);
      }
    };

    // fetchHistory();
        // Mock data for testing frontend display without backend
//         const mockHistoryItems = [
//           {
//             timestamp: "20230625_143022",
//             mri_url: "https://via.placeholder.com/150",
//             context: {
//               tumor_detection: {
//                 present: true,
//                 type: "glioma",
//                 confidence_percentage: 87.5,
//                 size: "2.3 cm",
//                 location: "frontal lobe",
//                 characteristics: "irregular borders",
//                 key_features: ["Heterogeneous ring enhancement", "Necrotic core", "Crosses corpus callosum"],
//                 distinguishers: ["Vs. metastasis: Less vasogenic edema relative to size", "Vs. lymphoma: Shows restricted diffusion"],
//                 coordinates: { x: 200, y: 100, z: 150 }
//               },
//               gray_matter: {
//                 abnormalities: false,
//                 regions_affected: "N/A",
//                 severity: "N/A"
//               },
//               other_abnormalities: "none",
//               differential_diagnosis: [
//                 { 
//                   type: "glioblastoma", 
//                   confidence_percentage: 60.2,
//                   key_features: ["Rapid growth", "Infiltrative margins"],
//                   distinguishers: ["Vs. glioma: More aggressive progression"]
//                 },
//                 { 
//                   type: "astrocytoma", 
//                   confidence_percentage: 25.8,
//                   key_features: ["Diffuse infiltration", "Cystic components"],
//                   distinguishers: ["Vs. glioma: Slower growth rate"]
//                 }
//               ],
//               follow_up_actions: "Consult neurologist for further evaluation."
//             },
//             summary: "A glioma tumor of size 2.3 cm was detected in the frontal lobe. No gray matter abnormalities were observed. No other abnormalities were noted. Recommended follow-up: Consult neurologist for further evaluation.",
//             tags: {
//               tumor_type: "glioma",
//               tumor_size: "2.3 cm"
//             }
//           },
//           {
//             timestamp: "20230624_102015",
//             mri_url: "https://via.placeholder.com/150",
//             context: {
//               tumor_detection: {
//                 present: false,
//                 type: "none",
//                 confidence_percentage: 0,
//                 size: "N/A",
//                 location: "N/A",
//                 characteristics: "N/A",
//                 coordinates: { x: 0, y: 0, z: 0 }
//               },
//               gray_matter: {
//                 abnormalities: true,
//                 regions_affected: "temporal lobe",
//                 severity: "mild"
//               },
//               other_abnormalities: "none",
//               follow_up_actions: "Monitor with annual scans."
//             },
//             summary: "No tumor was detected in the MRI scan. Gray matter abnormalities were observed in temporal lobe with mild severity. No other abnormalities were noted. Recommended follow-up: Monitor with annual scans.",
//             tags: {
//               tumor_type: "none",
//               tumor_size: "N/A"
//             }
//           }
//         ];
//         setHistoryItems(mockHistoryItems);
//         setLoading(false);    
  }, []);

  const handleHistoryClick = (item: any) => {
    localStorage.setItem('selectedHistoryItem', JSON.stringify(item));
    localStorage.setItem('currentTimestamp', item.timestamp);           // ④
    router.push('/chat');
  };

  return (
    <div className="flex flex-col items-center justify min-h-screen bg-background text-foreground p-8">
      <Tabs defaultValue="history" className="max-w-xl">
        <TabsList className="flex justify-center">
          <TabsTrigger value="upload" onClick={() => router.push('/')} className="text-black data-[state=active]:bg-black data-[state=active]:text-white">
            Upload Images
          </TabsTrigger>
          <TabsTrigger value="chat" onClick={() => router.push('/chat')} className="text-black data-[state=active]:bg-black data-[state=active]:text-white">
            Query
          </TabsTrigger>
          <TabsTrigger value="history" className="text-black data-[state=active]:bg-black data-[state=active]:text-white">
            History
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <Spacer axis="vertical" size={50} />

      <h1 className="text-4xl font-bold mb-4">Prompt History</h1>
      <p className="text-lg mb-8">View your previous prompts and responses from the chatbot.</p>

      {loading ? (
        <p>Loading history...</p>
      ) : historyItems.length === 0 ? (
        <p className="text-right">No history available yet...</p>
      ) : (
        <div className="flex flex-col gap-8 w-full max-w-4xl">
          {historyItems.map((item, idx) => (
            <div 
              key={idx} 
              className="border border-gray-200 p-6 rounded-xl shadow-sm bg-background text-foreground hover:bg-gray-50 cursor-pointer transition duration-200 ease-in-out group"
              onClick={() => handleHistoryClick(item)}
            >
              <div className="flex flex-col md:flex-row gap-6">

                {/* Left: fixed-size image container */}
                <div className="w-52 h-52 flex-shrink-0">
                  <img 
                    src={item.mri_url} 
                    alt="MRI" 
                    className="w-full h-full object-cover rounded-md shadow-md"
                  />
                </div>

                {/* Right: flexible text */}
                <div className="flex flex-col justify-center flex-1">
                  <p className="text-base font-semibold mb-2 group-hover:text-gray-700">Timestamp: {item.timestamp}</p>
                  {item.tags && (
                    <div className="flex flex-wrap gap-2 text-xs mb-2">
                      <span className="bg-gray-300 text-gray-800 px-2 py-1 rounded-full">{item.tags.tumor_type}</span>
                      <span className="bg-gray-300 text-gray-800 px-2 py-1 rounded-full">{item.tags.tumor_size}</span>
                      {item.context && item.context.tumor_detection && item.context.tumor_detection.confidence_percentage > 0 && (
                        <span className="bg-gray-300 text-gray-800 px-2 py-1 rounded-full">{item.context.tumor_detection.confidence_percentage}% Confidence</span>
                      )}
                    </div>
                  )}
                  <p className="text-sm group-hover:text-gray-700">{item.summary}</p>
                  {item.context && item.context.tumor_detection && item.context.tumor_detection.present && (
                    <div className="mt-2">
                      {item.context.tumor_detection.key_features && item.context.tumor_detection.key_features.length > 0 && (
                        <div className="mb-1">
                      <p className="text-sm text-white font-medium group-hover:text-gray-700">Key Features:</p>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {item.context.tumor_detection.key_features.map((feature: string, index: number) => (
                              <span key={index} className="bg-gray-300 text-gray-800 px-2 py-1 rounded-full text-sm">
                                {feature}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      {item.context.tumor_detection.distinguishers && item.context.tumor_detection.distinguishers.length > 0 && (
                        <div>
                          <p className="text-sm text-white font-medium group-hover:text-gray-700">Distinguishers:</p>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {item.context.tumor_detection.distinguishers.map((dist: string, index: number) => (
                              <span key={index} className="bg-gray-300 text-gray-800 px-2 py-1 rounded-full text-sm">
                                {dist}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  {item.context && item.context.differential_diagnosis && item.context.differential_diagnosis.length > 0 && (
                    <div className="mt-2">
                      <hr className="my-2 border-gray-300" />
                      <p className="text-base font-bold text-white group-hover:text-gray-700">Differential Diagnosis</p>
                      {item.context.differential_diagnosis.map((diff: any, index: number) => (
                        <div key={index} className="mt-1">
                          <p className="text-sm text-white group-hover:text-gray-700">{index + 1}. {diff.type} ({diff.confidence_percentage}%)</p>
                          {diff.key_features && diff.key_features.length > 0 && (
                            <div className="ml-4 mt-1 flex flex-wrap gap-1">
                              {diff.key_features.map((feature: string, index: number) => (
                              <span key={index} className="bg-gray-300 text-gray-800 px-2 py-1 rounded-full text-sm">
                                {feature}
                              </span>
                              ))}
                            </div>
                          )}
                          {diff.distinguishers && diff.distinguishers.length > 0 && (
                            <div className="ml-4 mt-1">
                              {diff.distinguishers.map((dist: string, index: number) => (
                                <p key={index} className="text-sm text-white group-hover:text-gray-700">{dist}</p>
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
          ))}
        </div>
      )}

      <p className="text-xs fixed bottom-2 right-2">Powered by Synaptiq</p>
    </div>
  );
}
