import { Button } from "@/components/ui/button"

export default function Hero() {
  return (
    <section className="py-24 lg:py-32">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl">
            Creative Design Solutions That Captivate
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Transform your brand with professional design that drives results. We create memorable visual experiences that connect with your audience.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg">Start Your Project</Button>
            <Button variant="outline" size="lg">View Our Work</Button>
          </div>
          
          {/* Stats section */}
          <div className="pt-16">
            <p className="text-sm font-medium text-muted-foreground mb-8">
              Trusted by 200+ Companies
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="text-3xl font-bold mb-2">500+</div>
                <div className="text-muted-foreground">Projects Completed</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold mb-2">200+</div>
                <div className="text-muted-foreground">Happy Clients</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold mb-2">8+</div>
                <div className="text-muted-foreground">Years Experience</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}