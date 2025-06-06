export interface Service {
  id: number
  title: string
  description: string
  icon: string
  features?: string[]
}

export const services: Service[] = [
  {
    id: 1,
    title: "Brand Identity Design",
    description: "Complete brand identity packages that establish your unique market presence with memorable logos, color palettes, and brand guidelines.",
    icon: "🎨",
    features: ["Logo Design", "Brand Guidelines", "Color Palette", "Typography Selection"]
  },
  {
    id: 2,
    title: "Web Design & Development",
    description: "Custom websites that convert visitors into customers with modern design, optimal performance, and seamless user experiences.",
    icon: "💻",
    features: ["Responsive Design", "SEO Optimization", "Custom Development", "CMS Integration"]
  },
  {
    id: 3,
    title: "Digital Marketing Design",
    description: "Eye-catching marketing materials for digital campaigns that drive engagement and deliver measurable results.",
    icon: "📱",
    features: ["Social Media Graphics", "Ad Campaigns", "Email Templates", "Banner Design"]
  },
  {
    id: 4,
    title: "Print Design Services",
    description: "Professional print materials that make a lasting impression, from business cards to large-format displays.",
    icon: "🖨️",
    features: ["Business Cards", "Brochures", "Posters", "Packaging Design"]
  },
  {
    id: 5,
    title: "UI/UX Design",
    description: "User-centered design solutions that create intuitive and engaging digital experiences for your customers.",
    icon: "🎯",
    features: ["User Research", "Wireframing", "Prototyping", "Usability Testing"]
  },
  {
    id: 6,
    title: "Consultation & Strategy",
    description: "Strategic design guidance to align your visual identity with business goals and market positioning.",
    icon: "💡",
    features: ["Design Audit", "Brand Strategy", "Market Analysis", "Creative Direction"]
  }
]