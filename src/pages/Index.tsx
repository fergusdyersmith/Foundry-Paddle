import HeroSection from "@/components/HeroSection";
import AboutSection from "@/components/AboutSection";
import RegisterSection from "@/components/RegisterSection";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <main className="bg-background min-h-screen">
      <HeroSection />
      <AboutSection />
      <RegisterSection />
      <Footer />
    </main>
  );
};

export default Index;
