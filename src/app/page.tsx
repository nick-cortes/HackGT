import { redirect } from "next/navigation";
import { Inter } from "next/font/google";
import { ArrowRightIcon, ClockIcon, DocumentTextIcon, ChartBarIcon } from "@heroicons/react/24/outline";

// Configure the Inter font
const inter = Inter({ subsets: ["latin"] });

export default async function Home() {
  return (
    <div className="bg-gray-900 relative">
      {/* Fixed Background Elements */}
      <div className="fixed inset-0 z-0">
        {/* Animated Gradient Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-purple-900/20 to-indigo-900/30"></div>
        
        {/* Floating Particles */}
        <div className="absolute inset-0">
          <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-indigo-400/60 rounded-full animate-pulse"></div>
          <div className="absolute top-1/3 right-1/3 w-1 h-1 bg-purple-400/80 rounded-full animate-bounce"></div>
          <div className="absolute bottom-1/4 left-1/3 w-3 h-3 bg-pink-400/40 rounded-full animate-pulse"></div>
          <div className="absolute top-1/2 right-1/4 w-1.5 h-1.5 bg-indigo-300/70 rounded-full animate-pulse"></div>
          <div className="absolute bottom-1/3 right-1/2 w-2 h-2 bg-purple-300/50 rounded-full animate-bounce"></div>
          <div className="absolute top-3/4 left-11/20 w-1 h-1 bg-pink-300/60 rounded-full animate-pulse"></div>
        </div>
        
        {/* Animated Geometric Shapes */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-20 left-10 w-32 h-32 border border-indigo-500/20 rotate-45 animate-spin-slow"></div>
          <div className="absolute bottom-20 right-10 w-24 h-24 border border-purple-500/20 rotate-12 animate-pulse"></div>
          <div className="absolute top-1/2 left-1/4 w-16 h-16 border border-pink-500/20 rotate-45 animate-bounce-slow"></div>
          <div className="absolute bottom-1/3 right-1/3 w-20 h-20 border border-indigo-400/20 rotate-90 animate-spin-slow"></div>
        </div>
        
        {/* Mesh Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-600/10 via-purple-600/10 to-pink-600/10 animate-gradient-x"></div>
      </div>
      
      {/* Fixed Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-gray-800/80 backdrop-blur-xl shadow-2xl border-b border-gray-700/50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-lg hover:shadow-indigo-500/25 transition-all duration-300 hover:scale-110">
                <ClockIcon className="w-6 h-6 text-white animate-pulse" />
              </div>
              <span className={`text-2xl font-bold bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent ${inter.className}`}>
                ChronologiCare
              </span>
            </div>
            
            {/* Scroll Progress Indicator */}
          <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse"></div>
              <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse animation-delay-200"></div>
              <div className="w-2 h-2 bg-pink-500 rounded-full animate-pulse animation-delay-400"></div>
            </div>
          </div>
        </div>
      </nav>

      {/* Section 1: Hero */}
      <section className="relative z-10 flex items-center justify-center min-h-screen px-6 scroll-section">
        <div className="text-center max-w-5xl mx-auto relative">
          {/* Main Headline */}
          <h1 className={`text-4xl md:text-6xl lg:text-7xl font-bold text-white mb-8 leading-tight ${inter.className}`}>
            <span className="block animate-fade-in-up">Track every prescription,</span>
            <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent animate-gradient-x animation-delay-400">
              follow every breakthrough.
            </span>
          </h1>
          
          {/* Subtitle */}
          <p className={`text-xl md:text-2xl text-gray-300 mb-16 max-w-3xl mx-auto leading-relaxed animate-fade-in-up animation-delay-600 ${inter.className}`}>
            Connect patient treatments with the latest medical research. 
            <br className="hidden md:block" />
            See how scientific discoveries align with your patients&apos; journeys.
          </p>
        </div>
      </section>

      {/* Section 2: Features */}
      <section className="relative z-10 flex items-center justify-center min-h-screen px-6 scroll-section">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className={`text-3xl md:text-5xl font-bold text-white mb-6 ${inter.className}`}>
              <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                Powerful Features
              </span>
            </h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              Everything you need to connect medical research with patient care
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            <div className="group relative bg-gray-800/40 backdrop-blur-2xl rounded-3xl p-8 border border-gray-700/50 hover:bg-gray-800/60 transition-all duration-500 transform hover:scale-105 hover:-translate-y-2 shadow-2xl hover:shadow-indigo-500/10">
              <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="relative z-10">
                <div className="w-16 h-16 bg-gradient-to-r from-indigo-500/30 to-purple-500/30 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                  <DocumentTextIcon className="w-8 h-8 text-indigo-300" />
                </div>
                <h3 className={`text-2xl font-bold text-white mb-4 ${inter.className}`}>Research Integration</h3>
                <p className="text-gray-300 text-lg leading-relaxed">Automatically fetch the latest medical publications related to your patients&apos; treatments.</p>
              </div>
            </div>

            <div className="group relative bg-gray-800/40 backdrop-blur-2xl rounded-3xl p-8 border border-gray-700/50 hover:bg-gray-800/60 transition-all duration-500 transform hover:scale-105 hover:-translate-y-2 shadow-2xl hover:shadow-purple-500/10">
              <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="relative z-10">
                <div className="w-16 h-16 bg-gradient-to-r from-purple-500/30 to-pink-500/30 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                  <ClockIcon className="w-8 h-8 text-purple-300" />
                </div>
                <h3 className={`text-2xl font-bold text-white mb-4 ${inter.className}`}>Timeline Visualization</h3>
                <p className="text-gray-300 text-lg leading-relaxed">See how research discoveries align with your patients&apos; treatment timelines.</p>
              </div>
            </div>

            <div className="group relative bg-gray-800/40 backdrop-blur-2xl rounded-3xl p-8 border border-gray-700/50 hover:bg-gray-800/60 transition-all duration-500 transform hover:scale-105 hover:-translate-y-2 shadow-2xl hover:shadow-pink-500/10">
              <div className="absolute inset-0 bg-gradient-to-r from-pink-500/10 to-indigo-500/10 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="relative z-10">
                <div className="w-16 h-16 bg-gradient-to-r from-pink-500/30 to-indigo-500/30 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                  <ChartBarIcon className="w-8 h-8 text-pink-300" />
                </div>
                <h3 className={`text-2xl font-bold text-white mb-4 ${inter.className}`}>Patient Insights</h3>
                <p className="text-gray-300 text-lg leading-relaxed">Gain deeper understanding of how treatments connect to scientific progress.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section 3: Final CTA */}
      <section className="relative z-10 flex items-center justify-center min-h-screen px-6 scroll-section">
        <div className="text-center max-w-4xl mx-auto">
          <h2 className={`text-4xl md:text-6xl font-black text-white mb-8 ${inter.className}`}>
            <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              Ready to Transform
            </span>
            <br />
            <span className="text-white">Patient Care?</span>
          </h2>
          
          <p className="text-xl md:text-2xl text-gray-300 mb-16 max-w-3xl mx-auto leading-relaxed">
            Join the future of medical research integration. 
            <br className="hidden md:block" />
            Start connecting treatments with breakthroughs today.
          </p>

          {/* CTA Button */}
          <form action={async () => {
            "use server";
            redirect("/dashboard");
          }}>
            <button 
              type="submit"
              className="group relative inline-flex items-center px-16 py-8 text-2xl font-bold text-white bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 rounded-3xl hover:from-indigo-700 hover:via-purple-700 hover:to-pink-700 transition-all duration-500 transform hover:scale-110 hover:shadow-2xl hover:shadow-purple-500/25 shadow-xl"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 rounded-3xl blur opacity-75 group-hover:opacity-100 transition-opacity duration-500"></div>
              <span className="relative z-10">Get Started</span>
              <ArrowRightIcon className="ml-4 w-8 h-8 group-hover:translate-x-2 transition-transform duration-300" />
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}