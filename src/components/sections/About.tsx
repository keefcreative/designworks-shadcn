import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { company } from "@/data/company"
import { CheckCircle } from "lucide-react"

export default function About() {
  return (
    <section className="py-16 lg:py-24 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          
          {/* Content Column */}
          <div className="space-y-8">
            <div className="space-y-6">
              <h2 className="scroll-m-20 text-3xl font-bold tracking-tight lg:text-4xl">
                Why Choose DesignWorks?
              </h2>
              <p className="text-lg text-muted-foreground">
                {company.description}
              </p>
            </div>

            {/* Features List */}
            <div className="space-y-4">
              {company.features.slice(0, 6).map((feature, index) => (
                <div key={index} className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-primary flex-shrink-0" />
                  <span className="text-foreground">{feature}</span>
                </div>
              ))}
            </div>

            <div className="pt-4">
              <Button size="lg">
                Learn More About Us
              </Button>
            </div>
          </div>

          {/* Stats Column */}
          <div className="space-y-8">
            <div className="grid grid-cols-2 gap-6">
              {company.stats.map((stat, index) => (
                <Card key={index} className="text-center">
                  <CardContent className="p-6">
                    <div className="text-3xl lg:text-4xl font-bold mb-3">
                      {stat.value}
                    </div>
                    <div className="text-muted-foreground">
                      {stat.label}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            
            {/* Additional content box */}
            <Card className="bg-primary text-primary-foreground">
              <CardContent className="p-6">
                <h3 className="text-xl font-bold mb-4">Ready to Transform Your Brand?</h3>
                <p className="mb-6">
                  Let&apos;s discuss your project and create something amazing together. Get in touch for a free consultation.
                </p>
                <Button variant="secondary" size="lg">
                  Get Free Consultation
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </section>
  )
}