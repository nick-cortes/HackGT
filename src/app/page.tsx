import { redirect } from "next/navigation";
import { Inter } from "next/font/google";
import { ArrowRightIcon, ChartBarIcon, DocumentTextIcon, ClockIcon } from "@heroicons/react/24/outline";

// Configure the Inter font
const inter = Inter({ subsets: ["latin"] });

export default async function Home() {
  return (
    <div className="min-h-screen bg-gray-900">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.2)_1px,transparent_0)] bg-[length:25px_25px]"></div>
      </div>
      
      {/* Navigation */}
      <nav className="relative z-10 px-6 py-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
              <ChartBarIcon className="w-5 h-5 text-white" />
            </div>
            <span className={`text-xl font-bold text-white ${inter.className}`}>ChronologiCare</span>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-[80vh] px-6">
        <div className="text-center max-w-4xl mx-auto">
          {/* Main Headline */}
          <h1 className={`text-4xl md:text-6xl lg:text-7xl font-bold text-white mb-6 leading-tight ${inter.className}`}>
            Track every prescription,
            <br />
            <span className="bg-gradient-to-r from-indigo-300 via-purple-300 to-pink-300 bg-clip-text text-transparent">
              follow every breakthrough.
            </span>
          </h1>
          
          {/* Subtitle */}
          <p className={`text-lg md:text-xl text-gray-300 mb-12 max-w-2xl mx-auto leading-relaxed ${inter.className}`}>
            Connect patient treatments with the latest medical research. 
            See how scientific discoveries align with your patients&apos; journeys.
          </p>

          {/* CTA Button */}
          <form action={async () => {
            "use server";
            redirect("/dashboard");
          }}>
            <button 
              type="submit"
              className="group relative inline-flex items-center px-8 py-4 text-lg font-semibold text-white bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 rounded-xl hover:from-indigo-700 hover:via-purple-700 hover:to-pink-700 transition-all duration-300 transform hover:scale-105 hover:shadow-2xl shadow-lg"
            >
              <span>Get Started</span>
              <ArrowRightIcon className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" />
            </button>
          </form>
        </div>

        {/* Feature Cards */}
        <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          <div className="bg-gray-800/50 backdrop-blur-lg rounded-2xl p-6 border border-gray-700/50 hover:bg-gray-800/70 transition-all duration-300">
            <div className="w-12 h-12 bg-gradient-to-r from-indigo-500/20 to-purple-500/20 rounded-xl flex items-center justify-center mb-4">
              <DocumentTextIcon className="w-6 h-6 text-indigo-300" />
            </div>
            <h3 className={`text-xl font-semibold text-white mb-2 ${inter.className}`}>Research Integration</h3>
            <p className="text-gray-300">Automatically fetch the latest medical publications related to your patients&apos; treatments.</p>
          </div>

          <div className="bg-gray-800/50 backdrop-blur-lg rounded-2xl p-6 border border-gray-700/50 hover:bg-gray-800/70 transition-all duration-300">
            <div className="w-12 h-12 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-xl flex items-center justify-center mb-4">
              <ClockIcon className="w-6 h-6 text-purple-300" />
            </div>
            <h3 className={`text-xl font-semibold text-white mb-2 ${inter.className}`}>Timeline Visualization</h3>
            <p className="text-gray-300">See how research discoveries align with your patients&apos; treatment timelines.</p>
          </div>

          <div className="bg-gray-800/50 backdrop-blur-lg rounded-2xl p-6 border border-gray-700/50 hover:bg-gray-800/70 transition-all duration-300">
            <div className="w-12 h-12 bg-gradient-to-r from-pink-500/20 to-indigo-500/20 rounded-xl flex items-center justify-center mb-4">
              <ChartBarIcon className="w-6 h-6 text-pink-300" />
            </div>
            <h3 className={`text-xl font-semibold text-white mb-2 ${inter.className}`}>Patient Insights</h3>
            <p className="text-gray-300">Gain deeper understanding of how treatments connect to scientific progress.</p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="relative z-10 border-t border-gray-700/50 mt-20">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="text-center text-gray-400">
            <p className={`${inter.className}`}>© 2024 MedTrack. Connecting medicine with research.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}