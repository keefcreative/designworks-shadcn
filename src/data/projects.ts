export interface Project {
  id: number
  title: string
  category: string
  description: string
  image: string
  tags: string[]
  featured?: boolean
}

export const projects: Project[] = [
  {
    id: 1,
    title: "TechStart Pro",
    category: "Brand Identity",
    description: "Complete rebrand for emerging tech startup including logo, website, and marketing materials",
    image: "/projects/techstart-pro.jpg",
    tags: ["Branding", "Logo Design", "Web Design"],
    featured: true
  },
  {
    id: 2,
    title: "GreenLeaf Organics",
    category: "E-commerce Design",
    description: "Sustainable organic food brand with e-commerce platform and packaging design",
    image: "/projects/greenleaf-organics.jpg",
    tags: ["E-commerce", "Packaging", "Sustainability"],
    featured: true
  },
  {
    id: 3,
    title: "Urban Fitness Studio",
    category: "Brand Identity",
    description: "Modern fitness brand identity with mobile app design and marketing campaign",
    image: "/projects/urban-fitness.jpg",
    tags: ["Fitness", "Mobile App", "Marketing"],
    featured: true
  },
  {
    id: 4,
    title: "Artisan Coffee Co.",
    category: "Packaging Design",
    description: "Premium coffee packaging design with brand storytelling and retail presence",
    image: "/projects/artisan-coffee.jpg",
    tags: ["Packaging", "Retail", "Brand Story"]
  },
  {
    id: 5,
    title: "MindfulMed App",
    category: "UI/UX Design",
    description: "Healthcare mobile application focusing on user experience and accessibility",
    image: "/projects/mindfulmed-app.jpg",
    tags: ["Healthcare", "Mobile", "UX Research"]
  },
  {
    id: 6,
    title: "Coastal Real Estate",
    category: "Web Design",
    description: "Luxury real estate website with virtual tour integration and lead generation",
    image: "/projects/coastal-realestate.jpg",
    tags: ["Real Estate", "Luxury", "Lead Generation"]
  }
]

export const projectCategories = [
  "All",
  "Brand Identity",
  "Web Design",
  "UI/UX Design",
  "Packaging Design",
  "E-commerce Design"
]