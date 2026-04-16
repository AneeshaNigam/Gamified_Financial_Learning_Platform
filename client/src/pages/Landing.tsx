/** @format */

import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  ArrowRight,
  BookOpen,
  Brain,
  TrendingUp,
  Trophy,
  Swords,
  BarChart3,
} from "lucide-react";
import { API_BASE_URL } from "@/constants";

interface Testimonial {
  _id: string;
  name: string;
  age: number;
  text: string;
  avatar: string;
}

const TestimonialsSection = () => {
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE_URL}/testimonials`)
      .then((res) => res.json())
      .then((data) => {
        setTestimonials(data.data || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="text-center text-muted-foreground py-8">
        Loading testimonials...
      </div>
    );
  }

  if (testimonials.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-8">
        Join thousands of students learning financial literacy!
      </div>
    );
  }

  return (
    <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
      {testimonials.map((testimonial) => (
        <div key={testimonial._id} className="p-6 bg-card rounded-xl shadow-md">
          <div className="text-5xl mb-4">{testimonial.avatar}</div>
          <p className="text-muted-foreground mb-4 italic">
            "{testimonial.text}"
          </p>
          <p className="font-semibold">- {testimonial.name}, {testimonial.age}</p>
        </div>
      ))}
    </div>
  );
};

const Landing = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold" style={{
              background: 'linear-gradient(135deg, hsl(210 100% 56%), hsl(200 90% 55%))',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}>
              MoneyMaster
            </span>
          </div>
          <div className="hidden md:flex items-center gap-6">
            <a
              href="#features"
              className="text-sm font-medium hover:text-primary transition-colors"
            >
              Features
            </a>
            <a
              href="#how-it-works"
              className="text-sm font-medium hover:text-primary transition-colors"
            >
              How It Works
            </a>
            <ThemeToggle />
            <Link to="/login">
              <Button variant="ghost">Login</Button>
            </Link>
            <Link to="/signup">
              <Button className="bg-primary hover:bg-primary/90">
                Sign Up Free
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 text-center relative z-10 overflow-hidden">
        {/* Subtle floating finance icons */}
        <div className="absolute top-8 left-8 text-5xl opacity-[0.08] animate-float pointer-events-none select-none">💰</div>
        <div className="absolute top-16 right-12 text-4xl opacity-[0.08] animate-float pointer-events-none select-none" style={{ animationDelay: '1.1s' }}>📊</div>
        <div className="absolute bottom-8 left-1/4 text-4xl opacity-[0.08] animate-float pointer-events-none select-none" style={{ animationDelay: '0.6s' }}>💳</div>
        <div className="absolute bottom-12 right-1/4 text-5xl opacity-[0.08] animate-float pointer-events-none select-none" style={{ animationDelay: '1.7s' }}>🏦</div>
        <div className="absolute top-1/2 left-4 text-3xl opacity-[0.06] animate-float pointer-events-none select-none" style={{ animationDelay: '2.2s' }}>📈</div>

        <div className="max-w-4xl mx-auto space-y-8 animate-fade-in relative z-10">
          {/* Curiosity hook */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-semibold mb-4 animate-scale-in">
            <span className="animate-fire">🔥</span> Most people never learn this. Those who do build wealth.
          </div>

          <h1 className="text-5xl md:text-7xl font-bold leading-tight">
            You use money every day…
            <br />
            <span style={{
              background: 'linear-gradient(135deg, hsl(210 100% 56%), hsl(180 100% 50%))',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}>but do you actually understand it?</span>
          </h1>

          <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto">
            Master money management through interactive lessons, real-world scenarios, and a rewards system that keeps you coming back.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link to="/signup">
              <Button
                size="lg"
                className="bg-primary hover:bg-primary/90 text-lg px-10 py-6 shadow-lg hover:shadow-primary/40 hover:-translate-y-1 transition-all"
              >
                Prove You're Financially Smart → <ArrowRight className="ml-2" />
              </Button>
            </Link>
            <Button
              size="lg"
              variant="outline"
              className="text-lg px-8 py-6"
              onClick={() => {
                document
                  .getElementById("how-it-works")
                  ?.scrollIntoView({ behavior: "smooth" });
              }}
            >
              See How It Works
            </Button>
          </div>

          {/* Social proof strip */}
          <div className="flex items-center justify-center gap-6 pt-4 text-sm text-muted-foreground flex-wrap">
            <span>✅ Free to start</span>
            <span>✅ No credit card</span>
            <span>✅ 10K+ learners</span>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="container mx-auto px-4 py-20">
        <h2 className="text-4xl font-bold text-center mb-16">How It Works</h2>
        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {[
            {
              step: "1",
              icon: "📚",
              title: "Learn Finance",
              desc: "Fun, bite-sized lessons about money, saving, and investing",
            },
            {
              step: "2",
              icon: "💰",
              title: "Earn Rewards",
              desc: "Get virtual coins for every lesson, quiz, and achievement",
            },
            {
              step: "3",
              icon: "📈",
              title: "Trade & Compete",
              desc: "Practice with virtual stocks and challenge friends",
            },
          ].map((item, i) => (
            <div
              key={i}
              className="relative p-8 bg-card rounded-2xl shadow-md hover-lift animate-slide-up"
              style={{ animationDelay: `${i * 100}ms` }}
            >
              <div className="absolute -top-6 left-8 w-12 h-12 bg-primary rounded-full flex items-center justify-center text-white font-bold text-xl">
                {item.step}
              </div>
              <div className="text-6xl mb-4 mt-2">{item.icon}</div>
              <h3 className="text-xl font-bold mb-2">{item.title}</h3>
              <p className="text-muted-foreground">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features Showcase */}
      <section id="features" className="bg-muted py-20">
        <div className="container mx-auto px-4">
          <h2 className="text-4xl font-bold text-center mb-16">
            Everything You Need to Master Money
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {[
              {
                icon: BookOpen,
                title: "Interactive Lessons",
                desc: "Learn through stories, games, and real-world scenarios",
              },
              {
                icon: Brain,
                title: "AI-Powered Quizzes",
                desc: "Test your knowledge and earn rewards instantly",
              },
              {
                icon: TrendingUp,
                title: "Smart Budgeting Tools",
                desc: "Learn to manage money with interactive budget planners",
              },
              {
                icon: Trophy,
                title: "Badges & Achievements",
                desc: "Unlock rewards as you progress through your journey",
              },
              {
                icon: Swords,
                title: "Quiz Battles",
                desc: "Challenge friends and compete for prizes",
              },
              {
                icon: BarChart3,
                title: "Track Progress",
                desc: "See your growth with detailed analytics",
              },
            ].map((feature, i) => (
              <div
                key={i}
                className="p-6 bg-card rounded-xl shadow-md hover-lift"
              >
                <feature.icon className="w-12 h-12 text-primary mb-4" />
                <h3 className="text-lg font-bold mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="container mx-auto px-4 py-20">
        <h2 className="text-4xl font-bold text-center mb-16">
          What Students Say
        </h2>
        <TestimonialsSection />
      </section>

      {/* CTA Footer */}
      <section className="relative py-24 overflow-hidden">
        {/* Animated gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary/90 to-secondary animate-gradient-shift"></div>
        
        {/* Glassmorphism overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
        
        {/* Decorative floating elements */}
        <div className="absolute top-10 left-10 text-6xl opacity-20 animate-float">💰</div>
        <div className="absolute top-20 right-20 text-5xl opacity-20 animate-float" style={{ animationDelay: '1s' }}>🚀</div>
        <div className="absolute bottom-10 left-1/4 text-4xl opacity-20 animate-float" style={{ animationDelay: '2s' }}>📈</div>
        <div className="absolute bottom-20 right-1/3 text-5xl opacity-20 animate-float" style={{ animationDelay: '1.5s' }}>💎</div>
        
        <div className="container mx-auto px-4 text-center relative z-10">
          <div className="max-w-3xl mx-auto glass-medium p-12 rounded-3xl border border-white/20 animate-slide-up">
            <h2 className="text-4xl md:text-6xl font-bold mb-6 text-white drop-shadow-lg">
              Ready to Master Money? 💪
            </h2>
            <p className="text-xl md:text-2xl mb-10 text-white/90 drop-shadow">
              Join thousands of students learning financial literacy!
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link to="/signup">
                <Button 
                  size="lg" 
                  className="bg-white text-primary hover:bg-white/90 text-lg px-10 py-7 font-bold shadow-2xl hover-lift transform hover:scale-105 transition-all"
                >
                  Start Your Journey Free <ArrowRight className="ml-2" />
                </Button>
              </Link>
              <div className="flex items-center gap-2 text-white/80 text-sm">
                <span className="flex items-center gap-1">
                  ✨ No credit card required
                </span>
              </div>
            </div>
            
            {/* Stats badges */}
            <div className="grid grid-cols-3 gap-4 mt-12 pt-8 border-t border-white/20">
              <div className="text-center">
                <div className="text-3xl font-bold text-white mb-1">10K+</div>
                <div className="text-sm text-white/70">Students</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-white mb-1">50+</div>
                <div className="text-sm text-white/70">Lessons</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-white mb-1">4.9★</div>
                <div className="text-sm text-white/70">Rating</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative bg-background/10 backdrop-blur-3xl border-t border-border/20 py-8 overflow-hidden">
        {/* Subtle gradient overlay for depth */}
        <div className="absolute inset-0 bg-gradient-to-b from-primary/3 to-transparent"></div>
        
        <div className="container mx-auto px-4 relative z-10">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm">
            <div className="flex items-center gap-4 text-muted-foreground/70 order-2 sm:order-1">
              <a href="#" className="hover:text-primary transition-colors">Privacy</a>
              <a href="#" className="hover:text-primary transition-colors">Terms</a>
            </div>
            
            {/* Centered Watermark */}
            <div className="order-1 sm:order-2 flex flex-col items-center">
              <span className="text-xl font-bold" style={{
                background: 'linear-gradient(135deg, hsl(210 100% 56%), hsl(200 90% 55%))',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text'
              }}>
                MoneyMaster
              </span>
              <p className="text-xs text-muted-foreground/50 mt-1">© 2025 • Making financial literacy fun</p>
            </div>
            
            <div className="flex items-center gap-4 text-muted-foreground/70 order-3">
              <a href="#" className="hover:text-primary transition-colors">Help</a>
              <a href="#" className="hover:text-primary transition-colors">About</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
