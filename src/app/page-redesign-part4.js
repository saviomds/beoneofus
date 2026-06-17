/**
 * PART 4: TESTIMONIALS + PRICING + FAQ + CTA + FOOTER
 * ─────────────────────────────────────────────────────────────
 * Testimonials: Real success stories from users
 * Pricing: Three tiers for different users
 * FAQ: Common questions answered
 * CTA: Final call-to-action
 * Footer: Navigation, links, social, legal
 */

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import {
  ArrowRight, ChevronDown, Check, Star, Quote,
  Code2, Users, Building2, Mail, Send,
  Facebook, Twitter, LinkedIn, Github, Slack,
  Home, Users as UsersIcon, BookOpen, MessageSquare,
  Settings, HelpCircle, Shield, Lock, FileText,
  Globe, Phone, Calendar,
} from "lucide-react";

/**
 * ─────────────────────────────────────────────────────────────
 * TESTIMONIALS SECTION
 * ─────────────────────────────────────────────────────────────
 * 
 * Real success stories
 * Different user types: developers, companies, freelancers
 */
export function TestimonialsSection({ testimonials }) {
  const [currentIdx, setCurrentIdx] = useState(0);

  useEffect(() => {
    // Auto-rotate testimonials every 8 seconds
    const timer = setInterval(() => {
      setCurrentIdx((prev) => (prev + 1) % testimonials.length);
    }, 8000);
    return () => clearInterval(timer);
  }, [testimonials.length]);

  return (
    <section className="py-20 bg-slate-900 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Section header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-white mb-4">
            Success Stories from Our Community
          </h2>
          <p className="text-lg text-slate-300">
            Real developers and companies achieving their goals
          </p>
        </div>

        {/* Testimonials carousel */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Main testimonial - large featured */}
          <div className="relative p-8 rounded-xl border border-blue-500/30 bg-blue-500/5 min-h-96 flex flex-col justify-between">
            {/* Quote icon */}
            <div className="absolute top-6 right-6 w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400">
              <Quote size={24} />
            </div>

            {/* Testimonial content */}
            <div>
              <p className="text-lg text-white mb-6 line-clamp-6">
                "{testimonials[currentIdx]?.quote}"
              </p>

              {/* Author */}
              <div className="pt-6 border-t border-blue-400/20">
                <p className="font-semibold text-white">
                  {testimonials[currentIdx]?.author}
                </p>
                <p className="text-sm text-slate-400">
                  {testimonials[currentIdx]?.role}
                </p>
                <p className="text-xs text-blue-400 font-medium mt-2">
                  {testimonials[currentIdx]?.stat}
                </p>
              </div>
            </div>
          </div>

          {/* Side testimonials grid */}
          <div className="space-y-4">
            {testimonials.slice(0, 3).map((testimonial, idx) => {
              const isActive = currentIdx === idx;
              return (
                <div
                  key={idx}
                  onClick={() => setCurrentIdx(idx)}
                  className={`p-4 rounded-lg border cursor-pointer transition-all duration-300 ${
                    isActive
                      ? "border-blue-500 bg-blue-500/10"
                      : "border-slate-700/50 bg-slate-800/40 hover:border-slate-600"
                  }`}
                >
                  {/* Stars */}
                  <div className="flex gap-1 mb-2">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        size={14}
                        className="fill-amber-400 text-amber-400"
                      />
                    ))}
                  </div>

                  {/* Quote snippet */}
                  <p className="text-sm text-slate-300 line-clamp-2 mb-2">
                    "{testimonial.quote}"
                  </p>

                  {/* Author */}
                  <p className="text-xs font-semibold text-white">
                    {testimonial.author}
                  </p>
                </div>
              );
            })}

            {/* View all button */}
            <a
              href="/community/stories"
              className="w-full p-4 rounded-lg border border-slate-700/50 text-center text-slate-300 hover:text-white hover:border-slate-600 transition-colors font-medium"
            >
              View all success stories →
            </a>
          </div>
        </div>

        {/* Stats from testimonials */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            {
              stat: "1,200+",
              label: "Developers Hired",
            },
            {
              stat: "$52K",
              label: "Average Salary Increase",
            },
            {
              stat: "8 weeks",
              label: "Average Time to Hire",
            },
          ].map((item, idx) => (
            <div key={idx} className="text-center">
              <p className="text-4xl font-bold text-white mb-2">
                {item.stat}
              </p>
              <p className="text-slate-400">{item.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/**
 * ─────────────────────────────────────────────────────────────
 * PRICING SECTION
 * ─────────────────────────────────────────────────────────────
 * 
 * Three-tier pricing: Starter (Free) / Pro / Enterprise
 * Clear value proposition for each tier
 */
export function PricingSection({ plans }) {
  return (
    <section id="pricing" className="py-20 bg-gradient-to-b from-slate-800 to-slate-900 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Section header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-white mb-4">
            Simple, Transparent Pricing
          </h2>
          <p className="text-lg text-slate-300">
            Start free. Upgrade when you're ready. Cancel anytime.
          </p>
        </div>

        {/* Pricing cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          {plans.map((plan, idx) => (
            <div
              key={idx}
              className={`relative rounded-xl border transition-all duration-300 overflow-hidden ${
                plan.highlight
                  ? "border-blue-500 bg-gradient-to-br from-blue-500/10 to-purple-500/10 ring-2 ring-blue-500/20 scale-105"
                  : "border-slate-700/50 bg-slate-800/50 hover:border-slate-600"
              }`}
            >
              {/* Highlight badge */}
              {plan.highlight && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 px-4 py-1 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 text-white text-sm font-semibold">
                  Most Popular
                </div>
              )}

              <div className="p-8 flex flex-col h-full">
                {/* Plan name */}
                <h3 className="text-2xl font-bold text-white mb-2">
                  {plan.name}
                </h3>
                <p className="text-slate-400 text-sm mb-6">
                  {plan.description}
                </p>

                {/* Price */}
                <div className="mb-6">
                  <span className="text-5xl font-bold text-white">
                    {plan.price}
                  </span>
                  <span className="text-slate-400 ml-2">
                    {plan.period}
                  </span>
                </div>

                {/* CTA */}
                <button
                  className={`w-full py-3 rounded-lg font-semibold mb-8 transition-all duration-300 ${
                    plan.highlight
                      ? "bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white shadow-lg shadow-blue-500/30"
                      : "border border-slate-600 text-slate-200 hover:border-slate-500 hover:text-white"
                  }`}
                >
                  {plan.cta}
                </button>

                {/* Features */}
                <div className="space-y-3 flex-grow">
                  {plan.features.map((feature, fidx) => (
                    <div key={fidx} className="flex items-start gap-3">
                      <Check size={20} className="flex-shrink-0 text-emerald-400 mt-0.5" />
                      <span className="text-slate-300 text-sm">
                        {feature}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* FAQ CTA */}
        <div className="text-center">
          <p className="text-slate-400 mb-4">
            Questions about pricing? Check our FAQ or{" "}
            <a href="#faq" className="text-blue-400 hover:text-blue-300">
              contact us
            </a>
          </p>
        </div>
      </div>
    </section>
  );
}

/**
 * ─────────────────────────────────────────────────────────────
 * FAQ SECTION
 * ─────────────────────────────────────────────────────────────
 * 
 * Common questions and answers
 * Interactive accordion component
 */
export function FaqSection({ faqItems }) {
  const [openIdx, setOpenIdx] = useState(null);

  return (
    <section id="faq" className="py-20 bg-slate-900 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Section header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-white mb-4">
            Frequently Asked Questions
          </h2>
          <p className="text-lg text-slate-300">
            Everything you need to know about BeOneOfUs
          </p>
        </div>

        {/* FAQ items */}
        <div className="space-y-4">
          {faqItems.map((item, idx) => (
            <div
              key={idx}
              className="border border-slate-700/50 rounded-lg overflow-hidden hover:border-slate-600 transition-colors"
            >
              {/* Question */}
              <button
                onClick={() => setOpenIdx(openIdx === idx ? null : idx)}
                className="w-full p-6 bg-slate-800/50 hover:bg-slate-800 flex items-center justify-between transition-colors"
              >
                <h3 className="text-lg font-semibold text-white text-left">
                  {item.question}
                </h3>
                <ChevronDown
                  size={20}
                  className={`flex-shrink-0 text-slate-400 transition-transform ${
                    openIdx === idx ? "rotate-180" : ""
                  }`}
                />
              </button>

              {/* Answer */}
              {openIdx === idx && (
                <div className="p-6 bg-slate-900 border-t border-slate-700/50">
                  <p className="text-slate-300 leading-relaxed">
                    {item.answer}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Still have questions? */}
        <div className="mt-12 p-8 rounded-xl border border-blue-500/30 bg-blue-500/5 text-center">
          <h3 className="text-xl font-bold text-white mb-2">
            Still have questions?
          </h3>
          <p className="text-slate-300 mb-6">
            Our team is here to help. Get in touch with us anytime.
          </p>
          <a
            href="/support"
            className="inline-flex items-center justify-center gap-2 px-6 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-colors"
          >
            Contact Support
            <Mail size={18} />
          </a>
        </div>
      </div>
    </section>
  );
}

/**
 * ─────────────────────────────────────────────────────────────
 * FINAL CTA SECTION
 * ─────────────────────────────────────────────────────────────
 * 
 * Strong call-to-action before footer
 * Dual path: Developer signup vs Company trial
 */
export function FinalCtaSection() {
  return (
    <section className="py-20 bg-gradient-to-r from-slate-900 via-blue-900 to-slate-900 px-4">
      <div className="max-w-4xl mx-auto text-center">
        {/* Headline */}
        <h2 className="text-5xl font-bold text-white mb-6">
          Ready to Build Your Future?
        </h2>

        {/* Subheadline */}
        <p className="text-xl text-slate-300 mb-12 max-w-2xl mx-auto">
          Join thousands of developers building real projects and landing dream jobs.
          <br className="hidden sm:block" />
          Or help companies find their best talent.
        </p>

        {/* Dual CTA */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
          {/* Developer CTA */}
          <a
            href="/auth/register"
            className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-lg bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white font-semibold transition-all shadow-lg shadow-blue-500/30 hover:shadow-blue-500/40"
          >
            I'm a Developer
            <ArrowRight size={20} />
          </a>

          {/* Company CTA */}
          <a
            href="/company/signup"
            className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-lg border-2 border-blue-400 text-blue-300 hover:text-blue-200 hover:border-blue-300 font-semibold transition-all"
          >
            I'm Hiring
            <ArrowRight size={20} />
          </a>
        </div>

        {/* Trust indicators */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-8 text-sm text-slate-400 pt-8 border-t border-slate-700/50">
          <div className="flex items-center gap-2">
            <Shield size={16} className="text-blue-400" />
            <span>SOC 2 Type II Certified</span>
          </div>
          <div className="flex items-center gap-2">
            <Lock size={16} className="text-emerald-400" />
            <span>Enterprise-Grade Security</span>
          </div>
          <div className="flex items-center gap-2">
            <Globe size={16} className="text-purple-400" />
            <span>Available Worldwide</span>
          </div>
        </div>
      </div>
    </section>
  );
}

/**
 * ─────────────────────────────────────────────────────────────
 * FOOTER
 * ─────────────────────────────────────────────────────────────
 * 
 * Comprehensive footer with:
 * - Product links
 * - Company links
 * - Resources
 * - Legal
 * - Social
 * - Newsletter signup
 */
export function Footer() {
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = (e) => {
    e.preventDefault();
    // TODO: Implement newsletter signup
    setSubscribed(true);
    setTimeout(() => setSubscribed(false), 3000);
  };

  const footerSections = [
    {
      title: "Product",
      links: [
        { label: "For Developers", href: "#developers" },
        { label: "For Companies", href: "#companies" },
        { label: "Pricing", href: "#pricing" },
        { label: "Roadmap", href: "/roadmap" },
        { label: "Status", href: "/status" },
      ],
    },
    {
      title: "Community",
      links: [
        { label: "Projects", href: "/projects" },
        { label: "Challenges", href: "/challenges" },
        { label: "Mentorship", href: "/mentors" },
        { label: "Success Stories", href: "/stories" },
        { label: "Events", href: "/events" },
      ],
    },
    {
      title: "Resources",
      links: [
        { label: "Documentation", href: "/docs" },
        { label: "Blog", href: "/blog" },
        { label: "Guides", href: "/guides" },
        { label: "API Reference", href: "/api-docs" },
        { label: "Support", href: "/support" },
      ],
    },
    {
      title: "Company",
      links: [
        { label: "About Us", href: "/about" },
        { label: "Careers", href: "/careers" },
        { label: "Press", href: "/press" },
        { label: "Contact", href: "/contact" },
        { label: "Partners", href: "/partners" },
      ],
    },
  ];

  const legalLinks = [
    { label: "Privacy Policy", href: "/privacy" },
    { label: "Terms of Service", href: "/terms" },
    { label: "Cookie Policy", href: "/cookies" },
    { label: "Security", href: "/security" },
  ];

  const socialLinks = [
    { icon: Twitter, href: "https://twitter.com/beoneofus", label: "Twitter" },
    { icon: LinkedIn, href: "https://linkedin.com/company/beoneofus", label: "LinkedIn" },
    { icon: Github, href: "https://github.com/beoneofus", label: "GitHub" },
    { icon: Slack, href: "https://beoneofus.slack.com", label: "Slack" },
  ];

  return (
    <footer className="bg-slate-900 border-t border-slate-800">
      {/* Main footer content */}
      <div className="px-4 py-12">
        <div className="max-w-6xl mx-auto">
          {/* Top section: Newsletter + Quick links */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-12 pb-12 border-b border-slate-800">
            {/* Newsletter */}
            <div>
              <h3 className="text-lg font-bold text-white mb-4">
                Stay in the Loop
              </h3>
              <p className="text-slate-400 mb-4">
                Get updates on new projects, opportunities, and platform features.
              </p>
              <form onSubmit={handleSubscribe} className="flex gap-2">
                <input
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="flex-1 px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  required
                />
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-colors flex items-center gap-2"
                >
                  <Send size={18} />
                </button>
              </form>
              {subscribed && (
                <p className="mt-2 text-sm text-emerald-400">
                  ✓ Thanks for subscribing!
                </p>
              )}
            </div>

            {/* Quick links */}
            <div className="grid grid-cols-2 gap-4">
              {[
                { icon: Code2, label: "Browse Projects", href: "/projects" },
                { icon: Users, label: "Join Community", href: "/community" },
                { icon: BookOpen, label: "Learn", href: "/learn" },
                { icon: Building2, label: "For Companies", href: "/company" },
              ].map((item, idx) => {
                const IconComponent = item.icon;
                return (
                  <a
                    key={idx}
                    href={item.href}
                    className="p-3 rounded-lg bg-slate-800/50 hover:bg-slate-800 flex items-center gap-2 text-slate-300 hover:text-white transition-colors"
                  >
                    <IconComponent size={18} />
                    <span className="text-sm font-medium">{item.label}</span>
                  </a>
                );
              })}
            </div>
          </div>

          {/* Footer sections */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
            {footerSections.map((section, idx) => (
              <div key={idx}>
                <h4 className="font-semibold text-white mb-4">
                  {section.title}
                </h4>
                <ul className="space-y-2">
                  {section.links.map((link, lidx) => (
                    <li key={lidx}>
                      <a
                        href={link.href}
                        className="text-slate-400 hover:text-slate-200 transition-colors text-sm"
                      >
                        {link.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Bottom section: Legal + Social */}
          <div className="flex flex-col md:flex-row items-center justify-between pt-8 border-t border-slate-800">
            {/* Logo / Brand */}
            <div className="mb-6 md:mb-0">
              <h3 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                BeOneOfUs
              </h3>
              <p className="text-sm text-slate-500 mt-1">
                Build your career before companies hire you
              </p>
            </div>

            {/* Social links */}
            <div className="flex gap-4">
              {socialLinks.map((social, idx) => {
                const IconComponent = social.icon;
                return (
                  <a
                    key={idx}
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-10 h-10 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition-all"
                    aria-label={social.label}
                  >
                    <IconComponent size={18} />
                  </a>
                );
              })}
            </div>
          </div>

          {/* Very bottom: Legal + Copyright */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-8 pt-8 border-t border-slate-800 text-xs text-slate-500">
            <p>
              © {new Date().getFullYear()} BeOneOfUs. All rights reserved.
            </p>

            <div className="flex gap-4">
              {legalLinks.map((link, idx) => (
                <a
                  key={idx}
                  href={link.href}
                  className="hover:text-slate-400 transition-colors"
                >
                  {link.label}
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

/**
 * ─────────────────────────────────────────────────────────────
 * UTILITY COMPONENT: Simple Newsletter Signup
 * ─────────────────────────────────────────────────────────────
 */
export function NewsletterSignup() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // TODO: Implement newsletter API call
      // await fetch('/api/newsletter/subscribe', {
      //   method: 'POST',
      //   body: JSON.stringify({ email }),
      // });

      setStatus("success");
      setEmail("");
      setTimeout(() => setStatus(null), 3000);
    } catch (error) {
      setStatus("error");
      setTimeout(() => setStatus(null), 3000);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input
        type="email"
        placeholder="your@email.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="flex-1 px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
        required
        disabled={loading}
      />
      <button
        type="submit"
        disabled={loading}
        className="px-6 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-colors disabled:opacity-50"
      >
        {loading ? "..." : "Subscribe"}
      </button>
    </form>
  );
}
