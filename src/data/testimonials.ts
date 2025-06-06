export interface Testimonial {
  id: number
  name: string
  company: string
  position: string
  content: string
  rating: number
  avatar?: string
  featured?: boolean
}

export const testimonials: Testimonial[] = [
  {
    id: 1,
    name: "Sarah Johnson",
    company: "TechStart Pro",
    position: "CEO & Founder",
    content: "DesignWorks transformed our startup's visual identity completely. Their brand design helped us secure $2M in funding and establish credibility in the market. The team understood our vision perfectly.",
    rating: 5,
    avatar: "/testimonials/sarah-johnson.jpg",
    featured: true
  },
  {
    id: 2,
    name: "Michael Chen",
    company: "GreenLeaf Organics",
    position: "Marketing Director",
    content: "The e-commerce website and packaging design exceeded our expectations. Our online sales increased by 300% within 6 months of launch. DesignWorks delivered quality work on time and within budget.",
    rating: 5,
    avatar: "/testimonials/michael-chen.jpg",
    featured: true
  },
  {
    id: 3,
    name: "Emily Rodriguez",
    company: "Urban Fitness Studio",
    position: "Studio Owner",
    content: "Professional, creative, and results-driven. The new brand identity and mobile app design helped us triple our membership base. I highly recommend DesignWorks for any business looking to stand out.",
    rating: 5,
    avatar: "/testimonials/emily-rodriguez.jpg",
    featured: true
  },
  {
    id: 4,
    name: "David Thompson",
    company: "Artisan Coffee Co.",
    position: "Brand Manager",
    content: "The packaging design work was exceptional. Our products now stand out on retail shelves and our brand recognition has improved significantly. Great attention to detail and market understanding.",
    rating: 5,
    avatar: "/testimonials/david-thompson.jpg"
  },
  {
    id: 5,
    name: "Lisa Park",
    company: "MindfulMed",
    position: "Product Manager",
    content: "The UI/UX design for our healthcare app was thoughtful and user-centered. Patient engagement increased by 40% after the redesign. DesignWorks truly understands user experience.",
    rating: 5,
    avatar: "/testimonials/lisa-park.jpg"
  },
  {
    id: 6,
    name: "Robert Martinez",
    company: "Coastal Real Estate",
    position: "Sales Director",
    content: "The luxury website design perfectly captures our brand essence. Lead generation improved by 150% and clients consistently compliment our professional online presence.",
    rating: 5,
    avatar: "/testimonials/robert-martinez.jpg"
  }
]