import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useNavigate } from "react-router";
import { X, MessageSquare, ArrowRight, Zap } from "lucide-react";
import { MobileContainer } from "../components/MobileContainer";

const slides = [
  {
    icon: MessageSquare,
    title: "Talk naturally to your wallet",
    description: "Just type what you want to do. No complex forms or confusing buttons.",
    example: '"Send 10 STX to Manu"',
    gradient: "from-blue-500 to-cyan-500",
  },
  {
    icon: Zap,
    title: "Instant swaps and transfers",
    description: "Swap assets or send money with a simple command. Your AI assistant handles the rest.",
    example: '"Swap 1 sBTC to STX"',
    gradient: "from-purple-500 to-pink-500",
  },
  {
    icon: ArrowRight,
    title: "Safe and simple",
    description: "Every action is confirmed before it happens. You're always in control.",
    example: "Tap to confirm",
    gradient: "from-orange-500 to-yellow-500",
  },
];

export const Onboarding = () => {
  const navigate = useNavigate();
  const [currentSlide, setCurrentSlide] = useState(0);

  const handleSkip = () => {
    navigate("/dashboard");
  };

  const handleNext = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(currentSlide + 1);
    } else {
      navigate("/dashboard");
    }
  };

  const slide = slides[currentSlide];
  const Icon = slide.icon;

  return (
    <MobileContainer>
      <div className="flex-1 flex flex-col bg-white">
        {/* Header with skip button */}
        <div className="p-6 flex justify-end">
          <button
            onClick={handleSkip}
            className="p-2 hover:bg-slate-100 rounded-full transition-colors"
          >
            <X className="w-6 h-6 text-slate-700" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 px-8 flex flex-col items-center justify-center">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentSlide}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="w-full flex flex-col items-center"
            >
              {/* Icon */}
              <div className={`w-24 h-24 bg-gradient-to-br ${slide.gradient} rounded-3xl flex items-center justify-center mb-8 shadow-xl`}>
                <Icon className="w-12 h-12 text-white" />
              </div>

              {/* Title */}
              <h2 className="text-3xl font-bold text-slate-900 text-center mb-4 max-w-sm">
                {slide.title}
              </h2>

              {/* Description */}
              <p className="text-slate-600 text-center mb-8 max-w-sm leading-relaxed">
                {slide.description}
              </p>

              {/* Example */}
              <div className="w-full max-w-sm bg-slate-50 rounded-2xl p-6 mb-12">
                <p className="text-sm text-slate-500 mb-2">Example:</p>
                <p className="text-lg font-medium text-slate-900">{slide.example}</p>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Progress indicators and CTA */}
        <div className="px-8 pb-12">
          {/* Progress dots */}
          <div className="flex justify-center gap-2 mb-6">
            {slides.map((_, index) => (
              <div
                key={index}
                className={`h-2 rounded-full transition-all ${
                  index === currentSlide
                    ? "w-8 bg-purple-600"
                    : "w-2 bg-slate-300"
                }`}
              />
            ))}
          </div>

          {/* Next/Get Started button */}
          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            onClick={handleNext}
            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-4 rounded-2xl font-semibold shadow-lg hover:shadow-xl transition-all"
          >
            {currentSlide < slides.length - 1 ? "Next" : "Get started"}
          </motion.button>
        </div>
      </div>
    </MobileContainer>
  );
};
