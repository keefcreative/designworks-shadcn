export interface CompanyInfo {
  name: string
  tagline: string
  description: string
  email: string
  phone: string
  address: {
    street: string
    city: string
    state: string
    zip: string
    country: string
  }
  social: {
    facebook?: string
    twitter?: string
    instagram?: string
    linkedin?: string
    behance?: string
    dribbble?: string
  }
  stats: {
    label: string
    value: string
  }[]
  features: string[]
}

export const company: CompanyInfo = {
  name: "DesignWorks",
  tagline: "Creative Design Solutions That Captivate",
  description: "We're a creative design agency that transforms brands through powerful visual storytelling. Our team of passionate designers and strategists work collaboratively to deliver exceptional results that drive business growth.",
  email: "hello@designworks.com",
  phone: "+1 (555) 123-4567",
  address: {
    street: "123 Creative Street",
    city: "San Francisco",
    state: "CA",
    zip: "94102",
    country: "USA"
  },
  social: {
    facebook: "https://facebook.com/designworks",
    twitter: "https://twitter.com/designworks",
    instagram: "https://instagram.com/designworks",
    linkedin: "https://linkedin.com/company/designworks",
    behance: "https://behance.net/designworks",
    dribbble: "https://dribbble.com/designworks"
  },
  stats: [
    {
      label: "Projects Completed",
      value: "500+"
    },
    {
      label: "Happy Clients",
      value: "200+"
    },
    {
      label: "Years Experience",
      value: "8+"
    },
    {
      label: "Team Members",
      value: "15+"
    }
  ],
  features: [
    "Strategic Brand Development",
    "Custom Design Solutions",
    "Responsive Web Design", 
    "Print & Digital Marketing",
    "UI/UX Design Excellence",
    "Brand Identity Systems",
    "E-commerce Platforms",
    "Marketing Campaign Design"
  ]
}